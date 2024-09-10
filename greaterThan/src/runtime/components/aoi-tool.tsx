/** @jsx jsx */
import { React, jsx, type IntlShape, type IMThemeVariables, getAppStore } from 'jimu-core'
import { Label } from 'jimu-ui'
import { getAoiToolStyle } from '../lib/style'
import Graphic from 'esri/Graphic'
import { geometryUtils, type JimuMapView } from 'jimu-arcgis'
import { type SearchSettings } from '../../config'
import LocateIncident from './locate-incident'
import BufferTool from './buffer-tool'
import type Geometry from 'esri/geometry/Geometry'
import SpatialReference from 'esri/geometry/SpatialReference'
import locator from 'esri/rest/locator'
import Polygon from 'esri/geometry/Polygon'
import defaultMessages from '../translations/default'
import { type Extent } from 'esri/geometry'
import { getBufferSymbol, getSketchSymbol } from '../../common/highlight-symbol-utils'
import { defaultBufferDistance } from '../../setting/constants'
import { getPortalUnit } from '../../common/utils'

const portalSelf = getAppStore().getState().portalSelf

interface Props {
  theme: IMThemeVariables
  intl: IntlShape
  headingLabel: string
  config: SearchSettings
  jimuMapView: JimuMapView
  highlightColor: string
  msgActionGeometry: Geometry
  widgetWidth?: number
  aoiComplete: (aoiGeometries: AoiGeometries) => void
  clear: () => void
  updateClosestAddressState: (isClosestAddressShowing: boolean) => void
  bufferLayer: __esri.GraphicsLayer
  drawingLayer: __esri.GraphicsLayer
}

interface State {
  defaultDistanceUnits: string
  defaultBufferDistance: number
  bufferGeometry: Geometry
  incidentGeometry: Geometry
  incidentGeometry4326: Geometry
  geodesicBuffer: Geometry
  searchSettings: SearchSettings
  refreshButtonClicked: boolean
  closestAddress: string
}

export interface AoiGeometries {
  incidentGeometry: Geometry
  incidentGeometry4326: Geometry
  bufferGeometry: Geometry
  geodesicBuffer: Geometry
  distanceUnit: string
  bufferDistance: number
}

export default class AoiTool extends React.PureComponent<Props, State> {
  public graphic: __esri.Graphic
  public currentBufferDistance: number
  public currentDistanceUnit: string

  constructor (props) {
    super(props)
    //distance Unit is blank then use portal unit as default distance unit
    const defaultDistanceUnit = this.props.config?.distanceUnits !== '' ? this.props.config?.distanceUnits : getPortalUnit()
    this.currentBufferDistance = this.props.config?.bufferDistance ?? defaultBufferDistance
    this.currentDistanceUnit = defaultDistanceUnit
    this.state = {
      defaultDistanceUnits: defaultDistanceUnit,
      defaultBufferDistance: this.props.config?.bufferDistance ?? defaultBufferDistance,
      bufferGeometry: null,
      incidentGeometry: null,
      incidentGeometry4326: null,
      geodesicBuffer: null,
      searchSettings: this.props.config,
      refreshButtonClicked: false,
      closestAddress: null
    }
  }

  nls = (id: string) => {
    const messages = Object.assign({}, defaultMessages)
    //for unit testing no need to mock intl we can directly use default en msg
    if (this.props.intl?.formatMessage) {
      return this.props.intl.formatMessage({ id: id, defaultMessage: messages[id] })
    } else {
      return messages[id]
    }
  }

  componentDidMount = () => {
    if (this.props.jimuMapView?.view) {
      //when view is loaded and searchByCurrentMapExtent is enabled then clear all the graphics from map
      this.props.jimuMapView.view.when(() => {
        if (this.props.config.searchByCurrentMapExtent) {
          this.clearAll()
        }
      })
    }
  }

  /**
   * Check the current config property or runtime property changed in live view
   * @param prevProps previous property
   */
  componentDidUpdate = (prevProps) => {
    //check whether map view is changed
    if (prevProps.jimuMapView?.id !== this.props.jimuMapView?.id) {
      this.clearAll()
    }

    //check if searchByCurrentMapExtent is changed
    if (this.props.config.searchByCurrentMapExtent !== prevProps.config.searchByCurrentMapExtent) {
      this.clearAll()
    }

    //check if configured distance units is changed
    if (prevProps.config.distanceUnits !== this.props.config.distanceUnits) {
      this.setState({
        defaultDistanceUnits: this.props.config.distanceUnits
      })
    }

    //check if configured buffer distance is changed
    if (prevProps.config.bufferDistance !== this.props.config.bufferDistance) {
      this.setState({
        defaultBufferDistance: this.props.config.bufferDistance
      })
    }

    //check if configured highlight color is changed and create the sketch symbol depending on the highlight color
    if (prevProps.highlightColor !== this.props?.highlightColor) {
      if (this.graphic?.geometry?.type) {
        const sketchSymbol = getSketchSymbol(this.graphic.geometry.type, this.props.highlightColor)
        if (sketchSymbol) {
          this.graphic.set('symbol', sketchSymbol)
        }
      }

      if (this.props.bufferLayer?.graphics?.length > 0) {
        const bufferSymbol = getBufferSymbol(this.props.highlightColor)
        if (bufferSymbol) {
          this.props.bufferLayer.graphics.forEach((graphic) => {
            graphic.set('symbol', bufferSymbol)
          })
        }
      }
    }

    //check msg action geometry and use msg action geometry as incident geometry
    if (prevProps.msgActionGeometry !== this.props.msgActionGeometry) {
      this.onDrawIncidentComplete(this.props.msgActionGeometry)
    }
  }

  /**
   * On widget delete clear all the graphics from the map
   */
  componentWillUnmount = () => {
    this.clearAll()
  }

  /**
   * handle event emitted by locate incident on sketch complete
   * @param event sketch view model complete event
   */
  onSketchComplete = (event) => {
    this.onDrawIncidentComplete(event.graphic.geometry)
  }

  /**
   * Draw the incident geometry and add the graphics on the map
   * @param geometry Incident geometry
   */
  onDrawIncidentComplete = (geometry) => {
    this.clearAll()
    this.showClosestAddress(geometry)
    geometryUtils.projectToSpatialReference([geometry],
      new SpatialReference({ wkid: 4326 })).then((projectedGeometries) => {
      if (projectedGeometries?.length > 0) {
        this.graphic = new Graphic({
          geometry: geometry,
          symbol: getSketchSymbol(geometry.type, this.props.highlightColor)
        })
        this.props.drawingLayer.add(this.graphic)
        this.setState({
          incidentGeometry: geometry,
          incidentGeometry4326: projectedGeometries[0],
          bufferGeometry: null,
          geodesicBuffer: null
        })
      }
    }, (err) => {
      console.log(err)
    })
  }

  /**
   * handle event emitted by locate incident on map area icon is clicked
   */
  onSearchByMapAreaClicked = () => {
    this.getMapExtentGeometry()
  }

  /**
   * get map extent and center geometry
   * Update states: incidentGeometry, bufferGeometry, incidentGeometry4326
   * Get map center to find closest address
   */
  getMapExtentGeometry = () => {
    this.clearAll()
    if (this.props?.jimuMapView) {
      const mapExtent: Extent = this.props.jimuMapView.view.extent
      const ringLayoutPerim = [[mapExtent.xmin, mapExtent.ymin], [mapExtent.xmin, mapExtent.ymax], [mapExtent.xmax, mapExtent.ymax], [mapExtent.xmax, mapExtent.ymin], [mapExtent.xmin, mapExtent.ymin]]

      const geomLayout = new Polygon({
        spatialReference: this.props.jimuMapView.view.spatialReference
      })
      geomLayout.addRing(ringLayoutPerim)
      this.graphic = new Graphic({
        geometry: geomLayout
      })
      setTimeout(() => {
        this.setState({
          incidentGeometry: this.props.jimuMapView.view.get('center'),
          bufferGeometry: this.props.jimuMapView?.view.extent,
          incidentGeometry4326: null,
          geodesicBuffer: null
        })
        this.props.aoiComplete({
          incidentGeometry: this.props.jimuMapView.view.get('center'),
          bufferGeometry: this.props.jimuMapView?.view.extent,
          incidentGeometry4326: null,
          geodesicBuffer: null,
          distanceUnit: this.currentDistanceUnit,
          bufferDistance: this.currentBufferDistance
        })
      }, 50)
      this.updateLayerListMaxHeight()
    }
  }

  /**
   * handle event emitted by locate incident on refresh button is clicked
   */
  refreshButtonClicked = () => {
    this.currentBufferDistance = this.state.defaultBufferDistance
    this.currentDistanceUnit = this.state.defaultDistanceUnits
    //set to default distance and unit
    this.clearAll()
    this.setState({
      refreshButtonClicked: true
    }, () => {
      setTimeout(() => {
        this.setState({
          refreshButtonClicked: false
        })
      }, 50)
    })
  }

  /**
   * clear graphics layer and update states to null
   */
  clearAll = () => {
    this.props.bufferLayer?.removeAll()
    this.props.drawingLayer?.removeAll()
    this.graphic = null
    this.setState({
      bufferGeometry: null,
      incidentGeometry: null,
      incidentGeometry4326: null,
      geodesicBuffer: null,
      closestAddress: null
    }, () => {
      this.updateLayerListMaxHeight()
      this.props.clear()
    })
  }

  /**
   * draw the buffer graphics and pass the respective parameters to aoiComplete
   * @param bufferGeometry buffer geometry
   */
  onBufferComplete = (bufferGeometry: Geometry) => {
    if (bufferGeometry) {
      geometryUtils.projectToSpatialReference([bufferGeometry],
        this.props.jimuMapView.view.spatialReference).then((bufferGeometryInMapSr) => {
        if (bufferGeometryInMapSr?.length > 0) {
          const bufferGraphic = new Graphic({
            geometry: bufferGeometryInMapSr[0],
            symbol: getBufferSymbol(this.props.highlightColor)
          })
          if (bufferGraphic) {
            this.props.bufferLayer.removeAll()
            this.props.bufferLayer?.add(bufferGraphic)
            //zoom to the incident/buffer geometry
            this.props.jimuMapView?.view.goTo({
              center: bufferGraphic.geometry.type === 'point' ? bufferGraphic.geometry : bufferGraphic.geometry.extent.expand(5)
            })
          }
          this.setState({
            bufferGeometry: bufferGeometryInMapSr[0]
          }, () => {
            this.props.aoiComplete({
              incidentGeometry: this.state.incidentGeometry,
              bufferGeometry: bufferGeometryInMapSr[0],
              incidentGeometry4326: this.state.incidentGeometry4326,
              geodesicBuffer: bufferGeometry,
              distanceUnit: this.currentDistanceUnit,
              bufferDistance: this.currentBufferDistance
            })
          })
        }
      })
    } else {
      this.props.aoiComplete({
        incidentGeometry: this.state.incidentGeometry,
        incidentGeometry4326: this.state.incidentGeometry4326,
        bufferGeometry: null,
        geodesicBuffer: null,
        distanceUnit: this.currentDistanceUnit,
        bufferDistance: this.currentBufferDistance
      })
    }
  }

  /**
   * handle event emitted by buffer tool on distance changes
   * @param distance updated distance
   */
  onBufferDistanceChange = (distance: number) => {
    this.currentBufferDistance = distance
    this.props.bufferLayer?.removeAll()
  }

  /**
   * handle event emitted by buffer tool on unit changes
   * @param unit updated unit
   */
  onBufferUnitChange = (unit: string) => {
    this.currentDistanceUnit = unit
    this.props.bufferLayer?.removeAll()
  }

  /**
   * get org/default geocoder Service URL
   * @returns geocoder Service URL
   */
  getGeocodeServiceURL = (): string => {
    //by default use esri world geocoding service
    let geocodeServiceURL: string = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer'
    //Use org's first geocode service
    if (portalSelf?.helperServices?.geocode?.length > 0 && portalSelf?.helperServices?.geocode?.[0]?.url) { // Use org's first geocode service if available
      geocodeServiceURL = portalSelf.helperServices.geocode[0].url
    }
    return geocodeServiceURL
  }

  /**
   * get closest address for incident geometry
   * @param point incident geometry
   * @returns promise reverse geocoding address for incident location
   */
  getClosestAddress = (point: __esri.Point) => {
    const geocodeURL: string = this.getGeocodeServiceURL()
    return locator.locationToAddress(geocodeURL, {
      location: point
    }, {
      query: {}
    }).then(response => {
      return Promise.resolve(response.address)
    }, err => {
      console.error(err.message)
      return []
    })
  }

  /**
   * show closet address of incident location
   * @param geometry incident geometry
   */
  showClosestAddress = (geometry) => {
    if (geometry?.type === 'point') {
      this.getClosestAddress(geometry).then((address: string) => {
        this.setState({ closestAddress: address }, () => {
          this.updateLayerListMaxHeight()
        })
      })
    } else {
      this.setState({ closestAddress: null }, () => {
        this.updateLayerListMaxHeight()
      })
    }
  }

  /**
   * Update the analysis layers list height when there is closest address
   */
  updateLayerListMaxHeight = () => {
    setTimeout(() => {
      this.props.updateClosestAddressState(this.state.closestAddress !== null)
    }, 50)
  }

  render () {
    const bufferToolStyles = this.props.widgetWidth < 306 ? 'pb-1 buffer-distance w-100' : 'pb-1 buffer-distance'
    const locateIncidentStyles = this.props.widgetWidth < 306 || this.props.config.searchByCurrentMapExtent ? 'locate-incident pb-1 w-100' : 'locate-incident pb-1'
    return (
      <div className='p-2' css={getAoiToolStyle(this.props?.theme)}>
        <div className='main-row w-100'>
          <div className={locateIncidentStyles}>
            <LocateIncident
              theme={this.props.theme}
              intl={this.props.intl}
              config={this.props.config}
              headingLabel={this.props.headingLabel}
              jimuMapView={this.props.jimuMapView}
              sketchComplete={this.onSketchComplete}
              refreshClicked={this.refreshButtonClicked}
              searchByMapAreaClicked={this.onSearchByMapAreaClicked}
              drawToolSelectionChange={this.clearAll}
              highlightColor={this.props.highlightColor}
            />
          </div>
          <div className={this.props.config.searchByCurrentMapExtent ? 'hidden pb-1 buffer-distance' : bufferToolStyles}>
            {!this.props.config.searchByCurrentMapExtent &&
              <BufferTool
                theme={this.props.theme}
                geometry={this.state.incidentGeometry4326}
                distanceUnit={this.state.defaultDistanceUnits}
                bufferDistance={this.state.defaultBufferDistance}
                bufferHeaderLabel={this.nls('bufferDistance')}
                bufferComplete={this.onBufferComplete}
                distanceChanged={this.onBufferDistanceChange}
                unitChanged={this.onBufferUnitChange}
                refreshButtonClicked={this.state.refreshButtonClicked} />}
          </div>
        </div>
        {this.state.closestAddress &&
          <div tabIndex={0} aria-label={this.nls('closestAddress') + ' ' + this.state.closestAddress} className='closest-address w-100 pt-1 mb-1'>
            <Label className='headingLabel mb-0'>{this.nls('closestAddress')}</Label>
            <br />
            <Label className='mb-0 pt-1'>{this.state.closestAddress}</Label>
          </div>
        }
      </div>
    )
  }
}
