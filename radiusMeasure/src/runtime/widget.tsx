const { useEffect, useState } = React;
import { React, type AllWidgetProps, IMAppConfig } from 'jimu-core'
import { JimuMapView, JimuMapViewComponent } from "jimu-arcgis";
//import { Select, Option } from 'jimu-ui'
import Measurement from "esri/widgets/Measurement"
import MeasurementVM from 'esri/widgets/Measurement/MeasurementViewModel';
import reactiveUtils from 'esri/core/reactiveUtils';
import GraphicsLayer from 'esri/layers/GraphicsLayer';
import Circle from 'esri/geometry/Circle';
import Graphic from 'esri/Graphic';
import Point from 'esri/geometry/Point';
import SimpleFillSymbol from "esri/symbols/SimpleFillSymbol";
import { useRef } from 'react';
import { Button } from 'jimu-ui';
//import { useEffect, useState } from 'react';



const Widget = (props: AllWidgetProps<IMAppConfig>) => {
  // create state
  const [mapView, setMapView] = useState<JimuMapView>(null);
  const onActiveViewChange = (activeView: JimuMapView): void => {
    setMapView(activeView);
  };

  const [activateMeasure, setActivateMeasure] = useState(false)




 



  const radiusMeasure = (mapView) => {
    //setActivateMeasure(prev => !prev)
    let measurement
    measurement = new Measurement({
      activeTool: 'distance',
      //viewModel: viewModel,
      //container : measureRef.current
      view: mapView?.view
    });

    let graphicsLayer = new GraphicsLayer({})
    mapView?.view?.map.add(graphicsLayer)
    graphicsLayer.opacity = 0.3

    reactiveUtils.watch(
      () => measurement?.viewModel?.activeViewModel?.measurement?.length,
      (state) => {
        //clear graphics layer
        graphicsLayer.removeAll()
        // console.log(measurement?.viewModel?.activeViewModel?.measurement)
        //create point from x,y values of measurement to use as circle center
        const point = new Point({
          x: measurement?.viewModel?.activeViewModel?.measurement?.geometry?.paths[0][0][0],
          y: measurement?.viewModel?.activeViewModel?.measurement?.geometry?.paths[0][0][1],
          spatialReference: { wkid: 3857 }
        })

        let symbol = {
          type: "simple-fill",  // autocasts as new SimpleFillSymbol()
          color: 'red',
          style: "solid",
          outline: {  // autocasts as new SimpleLineSymbol()
            color: "black",
            width: 1
          }
        };
        //create new graphic with circle 
        let graphicA = new Graphic({  // graphic with line geometry
          geometry: new Circle({
            center: point,
            geodesic: true,
            radius: (measurement?.viewModel?.activeViewModel?.measurement?.length),
            radiusUnit: "meters",
          }),
          symbol: symbol



        })
        //add circle to graphics layer
        //console.log(graphicA)
        graphicsLayer.add(graphicA)

      } //clear graphics layer -> new cirlce -> add circle to gL
    );




    mapView?.view.ui.add(measurement, "bottom-left");
    setMW(measurement)
  }


  const [mW, setMW] = useState(null)


  const addMeasureWidget = (mapView) => {
    console.log(props.state)
    if (!mapView || !mapView.view) return
    mapView?.view.when(() => {
      radiusMeasure(mapView)
      
    })
  }

  const removeMeasureWidget = () => {
    //console.log(mW)

    mW?.destroy()
    setMW(null)
  }


  useEffect(() =>{
    if(props.state != "CLOSED") return
    removeMeasureWidget()
    
  },[props.state])
  {

  }


  return (


    <div >
      <Button title="Circle Radius Measure Tool" onClick={mW? () => removeMeasureWidget() : () => {addMeasureWidget(mapView)}}>Measure by Radius</Button>
      <br>
      </br>
      <br>
      </br>
      Double Click to End Measurement

      {/* Retrieve map view, if configured */}
      {props.useMapWidgetIds?.length === 1 && !mapView && (
        <JimuMapViewComponent
          useMapWidgetId={props.useMapWidgetIds[0]}
          onActiveViewChange={onActiveViewChange}
        />)}
    </div>
  )
}

export default Widget