const { useEffect, useState } = React;
import { React, type AllWidgetProps, IMAppConfig } from 'jimu-core'
import { JimuMapView, JimuMapViewComponent } from "jimu-arcgis";
import Editor from "esri/widgets/Editor"
import Sketch from "esri/widgets/Sketch"
import { useRef } from 'react';




const Widget = (props: AllWidgetProps<IMAppConfig>) => {
  // create state
  const [mapView, setMapView] = useState<JimuMapView>(null);
  const onActiveViewChange = (activeView: JimuMapView): void => {
    setMapView(activeView);
  };

  const editRef = useRef(null)

  console.log(props.state)

  const [eW, setEW] = useState(null)


  const addEditor = () => {
    const editor = new Editor({
      view: mapView?.view,
      container: editRef?.current
    })

    setEW(editor)
  }


  const removeEditor = () => {
    //console.log(mW)

    eW?.destroy()
    setEW(null)
  }


  useEffect(() =>{
     if(!mapView?.view) return

    if(props.state == 'OPENED') mapView?.view?.ui.add(eW, 'bottom-left')

     if(props.state == 'CLOSED') removeEditor()
     

    // const editor = new Editor({
    //   view: mapView?.view,
    //   container: editRef?.current
    // })

    // console.log(props.state)
  
    // //mapView?.view?.ui.add(editor, 'bottom-left')

    

    // return () => editor.destroy()


    //if props.state = closed and active workflow, cancel it


  },[mapView?.view,props.state])
  {

  }



  return (
    <div id ="testDiv "style={{height: 'inherit'}} >
      {/* <Button title="Circle Radius Measure Tool" onClick={eW? () => removeEditWidget() : () => {addEditWidget(mapView)}}>Edit Features</Button> */}
      {/* Retrieve map view, if configured */}
      <div ref={editRef} style={{overflow : 'scroll'}}>
      </div>
      {props.useMapWidgetIds?.length === 1 && !mapView && (
        <JimuMapViewComponent
          useMapWidgetId={props.useMapWidgetIds[0]}
          onActiveViewChange={onActiveViewChange}
        />)}
    </div>
  )
}

export default Widget