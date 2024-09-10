// jimu / react
import { React } from "jimu-core";
import { AllWidgetSettingProps } from "jimu-for-builder";
import {
  MapWidgetSelector,
  SettingSection,
  SettingRow,
} from "jimu-ui/advanced/setting-components";

// resources
import { IMConfig } from "../config";
import { useState, useEffect } from "react";
import { keys } from "lodash-es";
import { TextArea } from "jimu-ui";

// exported settings
const Settings = (props: AllWidgetSettingProps<IMConfig>): JSX.Element => {
    
  const [dummyURL, setDummyURL] = useState(null)
  const [keyState, setKeyState] = useState(null)
  const [valueState, setValueState] = useState(null)
  // supporting functions
  const onSettingChange = (settings) =>
    props.onSettingChange({ ...settings, id: props.id });

  const urlArr = []
  // event handlers
  const onMapWidgetSelected = (useMapWidgetIds: string[]) =>
    onSettingChange({ useMapWidgetIds });
  const existingValue = props.config['url']
 
  // const handleValueChange = (event) => {


  //   console.log(event.target.value)
  //   console.log(existingValue)
    
  // //if existing url value in config, get it. otherwise make empty array
    
  // }


  //text box, paste json object, url will be set as event.target.value


  const handleSubmit = (event) => {
    event.preventDefault()
    console.log(props)
   
  //   console.log(event.target.value)
  //   console.log(existingValue)

     const key = keyState
     const value = valueState
    
  // //if existing url value in config, get it. otherwise make empty array
     let prevConfig = existingValue || {}
    

     prevConfig[key] = value
     const newConfig = props.config.set('url', event.target[0].value);

     const config = { id: props.id, config: newConfig };
    onSettingChange(config);
  }

  // render
  return (
    <div className="widget-swipe-setting p-2">
      <button onClick={() => console.log(props.config)}>Click me</button>
      <SettingSection
        title={props.intl.formatMessage({
          id: "mapSelectorTitle",
        })}
      >
        <SettingRow>
          <MapWidgetSelector
            onSelect={onMapWidgetSelected}
            useMapWidgetIds={props.useMapWidgetIds}
          />
        </SettingRow>

        <form onSubmit={(e) => {handleSubmit(e) }}>
        {/* <input onChange={(e) => {setKeyState(e.target.value)}} value={keyState} type="text">
        </input> */}
        <textarea onChange={(e) => {setKeyState(e.target.value)}} value={keyState}></textarea>
        {/* <input onChange={(e) => {setValueState(e.target.value)}} value={valueState}>
        </input> */}
        <button type="submit">Click me</button>
        </form>
        
      </SettingSection>
    </div>
  );
};
export default Settings;