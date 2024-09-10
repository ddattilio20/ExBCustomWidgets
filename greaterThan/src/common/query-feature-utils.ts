
import { SpatialRelationship } from '@esri/arcgis-rest-types'
import type Geometry from 'esri/geometry/Geometry'
import  Polygon from 'esri/geometry/Polygon'
import type SpatialReference from 'esri/geometry/SpatialReference'
import { type FeatureLayerQueryParams, type DataRecord, type QueriableDataSource, utils } from 'jimu-core'
import  FeatureLayer from 'esri/layers/FeatureLayer'
import Query from "esri/rest/support/Query"


/**
 * Queries the dataSource and fetch the records satisfying the query
 * @param ds - DataSource on which the query needs to be executed
 * @param query - FeatureLayerQueryParams
 * @returns Promise which resolves the records
 */
const getFeatures = async (ds: QueriableDataSource, query: FeatureLayerQueryParams): Promise<DataRecord[]> => {
  debugger
  const promise = new Promise<DataRecord[]>((resolve) => {
    //make new layer with ds url 
    //swap ds.query for layer.query
    
    //create url fromd datasource layer url
    const url = ds.url

    //create feature layer to run disjoint query on
    const layer = new FeatureLayer({url:url});
    
    //create disjoint query and set properties
    let disjointQuery = layer.createQuery();
    disjointQuery.spatialRelationship= "disjoint"
    const newCircle = new Polygon(query.geometry)
    disjointQuery.geometry = newCircle

    //OLD CODE NO WORK ALL THE WAY
    // layer.queryFeatures(disjointQuery).then((result) =>  {
    //   console.log(result)
    //   if(result?.features){
    //    const disjointResults =  result.features

    //     query.geometry = null
    //    ds.query(query).then((result) => {
    //     console.log(result)
    //    if (result?.records) {

    //       //filter result.records by disjoinResults
    //     const filteredResults = result.records.filter(record=>{
    //         //get this record object id
    //         const OID = record.feature.attributes.OBJECTID
    //         const newBool = disjointResults.filter(disjointRecord=>{
    //           const disjointOID = disjointRecord.attributes.OBJECTID
    //           return disjointOID == OID
    //         })

    //         return newBool.length


    //       })

    //       resolve(filteredResults)
    //     } else {
    //       resolve([])
    //     }
    //   }, (err) => {
    //     console.log(err)
    //     resolve([])
    //   })


    //     // resolve(records)
    //    } else {
    //      resolve([])
    //    }
    //  }, (err) => {
    //  console.log(err)
    //    resolve([])
    //    debugger
    //  })

    //^^working


    //set jimu query geometry to null
    query.geometry = null

    //run jimu query
    ds.query(query).then((result) => {
    //console.log(result)

      if (result?.records) {
      //set disjoint query where clause to jimu query where clause
          disjointQuery.where =  result.queryParams.where

          //run disjoint query
          layer.queryFeatures(disjointQuery).then((tester) =>  {
              //console.log(tester)
              if(tester?.features){
                const disjointResults =  tester.features

                //compare jimu results vs disjoint results
                const filteredResults = result.records.filter(record=>{
              //get this jimu record object id
                const OID = record.feature.attributes.OBJECTID
                //compare jimu object id vs disjoint object id
                const newBool = disjointResults.filter(disjointRecord=>{
                const disjointOID = disjointRecord.attributes.OBJECTID
                return disjointOID == OID
              })
              //return length
              return newBool.length
  
  
            })
            //resolve promise with correct results
            resolve(filteredResults)
            }else {
                    resolve([])
                  }
                }, (err) => {
                  console.log(err)
                  resolve([])
        })
    }
  
    })
    /*layer.queryFeatures(disjointQuery).then((result) => {
      console.log(result)
      debugger
    })*/
  


    // ds.query(query).then((result) => {
    //   console.log(result)
    //  if (result?.records) {
    //     resolve(result.records)
    //   } else {
    //     resolve([])
    //   }
    // }, (err) => {
    //   console.log(err)
    //   resolve([])
    // })
  })
  return promise
}

/**
 * Returns all the records satisfying the query
 * If the number of records are more than the maxRecord count then all the records are fetched by batch query and finally all records are return
 * @param ds Layers DataSource from which records needs to be fetched
 * @param queryGeometry Geometry of the buffer/ the incident location
 * @param returnGeometry Specify if geometry should returned while fetching the records
 * @param outSR Out Spatial Reference in which the returned geometries should be
 * @returns promise of datarecords
 */
export const getALLFeatures = async (ds, queryGeometry: Geometry, returnGeometry: boolean, outSR: SpatialReference): Promise<DataRecord[]> => {
  debugger
  const promise = new Promise<DataRecord[]>((resolve) => {
    if (!ds) {
      resolve([])
      return
    }
    const query: FeatureLayerQueryParams = {}
    if (queryGeometry) {
      //when passing query as FeatureLayerQueryParams use toJson else invalid geometry is passed in the query request
      query.geometry = queryGeometry.toJSON()
      query.geometryType = queryGeometry ? utils.getGeometryType(queryGeometry) : undefined
      query.spatialRel =  null
      query.distance = 10000
    }
    //get all the fields as we need to show the feature info
    query.outFields = ['*']
    //get the return geometry only if asked
    query.returnGeometry = returnGeometry
    //get total number of features satisfying the query using queryCount method
    ds.queryCount(query).then((result) => {
      if (result?.count > 0) {
        const totalNumberOfRecords = result.count
        const maxRecordCount = ds.layerDefinition?.maxRecordCount ? ds.layerDefinition.maxRecordCount : 1000
        const totalNumberOfPages = Math.floor(totalNumberOfRecords / maxRecordCount) + 1
        const queries: Array<Promise<DataRecord[]>> = []
        //query records pageWise, based on number of pages required for the total number of records
        for (let pageNo = 1; pageNo <= totalNumberOfPages; pageNo++) {
          queries.push(getFeatures(
            ds,
            {
              ...query,
              outSpatialReference: outSR.toJSON(),
              page: pageNo,
              pageSize: maxRecordCount
            } as FeatureLayerQueryParams
          ))
        }
        Promise.all(queries).then((queryResults) => {
          if (queryResults) {
            let allRecord: DataRecord[] = []
            for (let i = 0; i < queryResults.length; i++) {
              allRecord = allRecord.concat(queryResults[i])
            }
            resolve(allRecord)
          } else {
            resolve([])
          }
        }, (err) => {
          console.log(err)
          resolve([])
        })
      } else {
        resolve([])
      }
    }, (err) => {
      console.log(err)
      resolve([])
    })
  })
  return promise
}
