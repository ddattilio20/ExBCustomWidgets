const { useEffect, useState } = React;
import { React, type AllWidgetProps, IMAppConfig } from 'jimu-core'
import { JimuMapView, JimuMapViewComponent } from "jimu-arcgis";
//import { Select, Option } from 'jimu-ui'
import {CalciteSelect, CalciteOption, CalciteOptionGroup} from 'calcite-components'


const Widget = (props: AllWidgetProps<IMAppConfig>) => {
  // create state
  const [mapView, setMapView] = useState<JimuMapView>(null);
  const onActiveViewChange = (activeView: JimuMapView): void => {
    setMapView(activeView);
  };

  
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  const urlChange = (event) => {
    //const url = 'https://kdem.kansasgis.org/EOPMapperEvolved/'
    const url = 'https://localhost:3001/experience/0/?draft=true'
    let mapVal = event.target.value
    setSelectedOption(event.target.value)
    //window.location.href = url + '?webmap=' + mapVal;
    window.location.href = url + '&webmap=' + mapVal;
  }
  
  const getParam = () => {
    const params = new URLSearchParams(window.location.search)
    
    if(!params.has('webmap'))
      {
        return 'Select an ESF Map'
      }
    
    else 
    {
      let val = params.get('webmap')
      return val
      //console.log(document?.getElementById('hi'))
    //   console.log('hi')
    //  console.log(document?.getElementById('mapSelector'))
    //  console.log((document.getElementById('hi') as HTMLInputElement))
    //   return ((document?.getElementById('hi') as HTMLInputElement)?.value)

    }

  }


  useEffect(()=>{
    const param = getParam()
    setSelectedOption(param)

  },[])

  // const lookupTable = { 'Home'   : {'5e788f6e178f421795b2e6b16469e333' : 'Home Map'},
  //                         'ESF 1': {'db24f8711c87466387449fc888f4ea1f' : 'ESF 1: Population Density (State)',
  //                                   'd5bff5a5b5394fc98ac233625d8fc5bc' : 'ESF 1: Railroads (State)',
  //                                   'e3eb3e67710f431da8ac5c9ec2f971cb' : 'ESF 1: Transportation Routes (State)',
  //                                   'ab0c4f36a6e24f66a010c52e210d9d2b' : 'ESF 1: Airports'},
  //                         'ESF 2': {'264e075e48034fb5a8def72597f07b61' : 'ESF 2: Communications Overview'},
  //                         'ESF 3': {'5825119e67804e88abe8861357d21352' : 'ESF 3: Bridges',
  //                                   'e1da8a1befd84e7885e9d88aa31b2d2b' : 'ESF 3: Debris Management',
  //                                   'f24565640bb64da3846970130bf0b8f0' : 'ESF 3: Facilities in Floodplain',
  //                                   'c6872428e70d4eb7ac277422a28fad5d' : 'ESF 3: Local Government Facilities',
  //                                   'e33cf98120f744fca7a2c51d2bffa6c9' : 'ESF 3: Other Community Facilities and Locations',
  //                                   '29e8ce9c7ff24154a5fbe28b2f916a0e' : 'ESF 3: Reservoirs, Levees and Dams (State)',
  //                                   'fa9c346cb1414315a97cfb735d054fa8' : 'ESF 3: Route Clearence Prioritization',
  //                                   '74f6d1dd851846d7bdb89a74bc62ac23' : 'ESF 3: Rural Water Districts (State) and Wastewater/Water Treatment Facilities',
  //                                   'b6bb4fc4f8474c04b1d334b47d74fab1' : 'ESF 3: Waste Management Facilities'},
  //                         'ESF 4': {'fafebf01d5c24b87b89c58d9d9181dba' : 'ESF 4: Fire Districts & Stations',
  //                                   'e0e97e99317f4c37b49f275eb6f6ae36' : 'ESF 4: Pull Sites & Service Areas'},
  //                         'ESF 5': {'cf13c6ae70214789aefbf2ae9f6602e2' : 'ESF 5: Community Infrastructure',
  //                                   'e50364eb3dd64f4791e00081075bdab1' : 'ESF 5: Local Emergency Management',
  //                                   '09de1f398338479cac5c6a06062ef155' : 'ESF 5: Schools and School Districts',
  //                                   '07d559a5c84d4183a39bca0cfe2c3439' : 'ESF 5: Special Event Facilities',
  //                                   '498f92592d0d47a58c6cab952bde2235' : 'ESF 5: Tornado Paths (State)',
  //                                   '0ebcf97c0e0f48409a545575cefc25c8' : 'ESF 5: Warning Sirens '},
  //                        'ESF 6' : {'b3c522a8448e431aa46635c5524d0ead' : 'ESF 6: Access & Functional Needs Facilities, Shelters, and Animal Shelters'},
  //                        'ESF 7' : {'b821f626bc15418ebed69b6f937cf229' : 'ESF 7: Bulk Water Collection Sites',
  //                                   '7022ee74910b4289bbc44759a7f73a66' : 'ESF 7: Community Infrastructure (Generator Requirements)',
  //                                   '7cd0c4903dd94f7eb75763d28891110b' : 'ESF 7: Government Refueling Sites',
  //                                   '14fa203d4c6442848d66a3c6880c3b31' : 'ESF 7: Points of Distribution & Logistical Staging Areas'},
  //                        'ESF 8' : {'7e5062216e5f4c898a9e54c8135ff3af' : 'ESF 8: EMS Districts & Stations',
  //                                   '1659c3c3cfd54f62a22ff050ca505196' : 'ESF 8: Health Departments, Hospitals, and Long Term Care Facilities'},
  //                       'ESF 10' : {'8763ce5951024040bbd1c1c2d78a1563' : 'ESF 10: Gas Pipelines',
  //                                   '99a4d654bdc44418b6b8bf7bc512d055' : 'ESF 10: Tier II Facilities (State)',
  //                                   '1d860b9c9b114ce096843729197a812e' : 'ESF 10: Tier II Facilities (User)',
  //                                   'dcd3feb87e5c45b1bcb82437c57fd42f' : 'ESF 10: Bulk Fuel Storage Tanks'},
  //                       'ESF 11' : {'e075c9a2f6a441c598d9281525dbb56b' : 'ESF 11: Landcover',
  //                                   'a63ea1712ad04dadb3714a63c276a764' : 'ESF 11: National Register of Historical Places',
  //                                   'ac7a23b276c84286b5ead646bc10060e' : 'ESF 11: Watersheds',
  //                                   '103079c7fc6540cfa49da0afdde39a87' : 'ESF 11: Waterways'},
  //                       'ESF 12' : {'8d7089150ed347ed8fd2c764795c69ad' : 'ESF 12: Electric Boundaries, Generation Facilities, and Transmission Lines',
  //                                   '52d25189422244eda8f7661a57dda737' : 'ESF 12: Gas Districts',
  //                                   'b1d574d33de5428e8dcd6f0e8816ba50' : 'ESF 12: Wind (Farms and Turbines)'},
  //                       'ESF 13' : {'1b8dd7dc1c544150be14ed077475aae3' : 'ESF 13: Law Enforcement Offices/Districts, and Correctional Facilities'}

  //                     }
  const lookupTable = JSON.parse(props.config.url)
  const keys = Object.keys(lookupTable)

  
  return(
    <div>
      { <CalciteSelect id="mapSelector" onCalciteSelectChange={(e) => urlChange(e)} label={selectedOption} value={selectedOption}>
        {
          keys.map((key) => {
          const object = lookupTable[key]
          return (
          <CalciteOptionGroup label={key}>
          {Object.keys(object).map((subkey) => {
            return(
              <CalciteOption selected = {selectedOption == subkey? true: undefined} value={subkey}>{object[subkey]}</CalciteOption>
            )
          })}
          </CalciteOptionGroup>
        )})
        }

      </CalciteSelect> }
    </div>
  )

  // return (
  //   <div >
  //     <Select id="mapSelector" onChange={(e) => urlChange(e)} placeholder={selectedOption}>
  //       <Option header>ESF 1</Option>
  //         <Option id="hi" value ='db24f8711c87466387449fc888f4ea1f'>
  //         ESF 1- Population Density (State)
  //         </Option>
  //         <Option value = "d5bff5a5b5394fc98ac233625d8fc5bc">
  //         ESF 1- Railroads
  //         </Option>
  //         <Option value = "e3eb3e67710f431da8ac5c9ec2f971cb">
  //         ESF 1- Transportation Routes (State) and Airports
  //         </Option>
  //         <Option header>ESF 2</Option>
  //         <Option value = "264e075e48034fb5a8def72597f07b61">
  //         ESF 2: Communications Overview
  //         </Option>
  //         <Option header>ESF 3</Option>
  //         <Option value = "5825119e67804e88abe8861357d21352">
  //         ESF 3- Bridges
  //         </Option>
  //         <Option value = "e1da8a1befd84e7885e9d88aa31b2d2b">
  //         ESF 3- Debris Management
  //         </Option>
  //         <Option value = "f24565640bb64da3846970130bf0b8f0">
  //         ESF 3- Facilities in Floodplain
  //         </Option>
  //         <Option value = "c6872428e70d4eb7ac277422a28fad5d">
  //         ESF 3- Local Government Facilities
  //         </Option>
  //         <Option value = "e33cf98120f744fca7a2c51d2bffa6c9">
  //         ESF 3- Other Community Facilities and Locations
  //         </Option>
  //         <Option value = "29e8ce9c7ff24154a5fbe28b2f916a0e">
  //         ESF 3- Reservoirs, Levees and Dams (State)
  //         </Option>
  //         <Option value = "fa9c346cb1414315a97cfb735d054fa8">
  //         ESF 3- Route Clearence Prioritization
  //         </Option>
  //         <Option value = "74f6d1dd851846d7bdb89a74bc62ac23">
  //         ESF 3- Rural Water Districts (State) and Wastewater/Water Treatment Facilities
  //         </Option>
  //         <Option value = "b6bb4fc4f8474c04b1d334b47d74fab1">
  //         ESF 3- Waste Management Facilities 
  //         </Option>
  //         <Option header>ESF 4</Option>
  //         <Option value = "fafebf01d5c24b87b89c58d9d9181dba">
  //         ESF 4- Fire Districts & Stations 
  //         </Option>
  //         <Option value = "e0e97e99317f4c37b49f275eb6f6ae36">
  //         ESF 4- Pull Sites & Service Areas 
  //         </Option>
  //         <Option header>ESF 5</Option>
  //         <Option value = "cf13c6ae70214789aefbf2ae9f6602e2">
  //         ESF 5- Community Infrastructure 
  //         </Option>
  //         <Option value = "e50364eb3dd64f4791e00081075bdab1">
  //         ESF 5- Local Emergency Management 
  //         </Option>
  //         <Option value = "09de1f398338479cac5c6a06062ef155">
  //         ESF 5- Schools and School Districts 
  //         </Option>
  //         <Option value = "07d559a5c84d4183a39bca0cfe2c3439">
  //         ESF 5- Special Event Facilities 
  //         </Option>
  //         <Option value = "498f92592d0d47a58c6cab952bde2235">
  //         ESF 5- Tornado Paths (State) 
  //         </Option>
  //         <Option value = "0ebcf97c0e0f48409a545575cefc25c8">
  //         ESF 5- Warning Sirens 
  //         </Option>
  //         <Option value = "1de622079dd04b91aa73f8de9991b7dd">
  //         ESF 5- Hazard Mitigation Assistance (State)
  //         </Option>
  //         <Option header>ESF 6</Option>
  //         <Option value = "b3c522a8448e431aa46635c5524d0ead">
  //         ESF 6- Access & Functional Needs Facilities, Shelters, and Animal Shelters 
  //         </Option>
  //         <Option header>ESF 7</Option>
  //         <Option value = "b821f626bc15418ebed69b6f937cf229">
  //         ESF 7- Bulk Water Collection Sites 
  //         </Option>
  //         <Option value = "7022ee74910b4289bbc44759a7f73a66">
  //         ESF 7- Community Infrastructure (Generator Requirements) 
  //         </Option>
  //         <Option value = "7cd0c4903dd94f7eb75763d28891110b">
  //         ESF 7- Government Refueling Sites 
  //         </Option>
  //         <Option value = "14fa203d4c6442848d66a3c6880c3b31">
  //         ESF 7- Points of Distribution & Logistical Staging Areas 
  //         </Option>
  //         <Option header>ESF 8</Option>
  //         <Option value = "7e5062216e5f4c898a9e54c8135ff3af">
  //         ESF 8- EMS Districts & Stations 
  //         </Option>
  //         <Option value = "1659c3c3cfd54f62a22ff050ca505196">
  //         ESF 8- Health Departments, Hospitals, and Long Term Care Facilities 
  //         </Option>
  //         <Option header>ESF 10</Option>
  //         <Option value = "8763ce5951024040bbd1c1c2d78a1563">
  //         ESF 10- Gas Pipelines 
  //         </Option>
  //         <Option value = "99a4d654bdc44418b6b8bf7bc512d055">
  //         ESF 10- Tier II Facilities (State) 
  //         </Option>
  //         <Option value = "1d860b9c9b114ce096843729197a812e">
  //         ESF 10- Tier II Facilities (User) 
  //         </Option>
  //         <Option value = "dcd3feb87e5c45b1bcb82437c57fd42f">
  //         ESF 10-Bulk Fuel Storage Tanks
  //         </Option>
  //         <Option header>ESF 11</Option>
  //         <Option value = "e075c9a2f6a441c598d9281525dbb56b">
  //         ESF 11- Landcover 
  //         </Option>
  //         <Option value = "a63ea1712ad04dadb3714a63c276a764">
  //         ESF 11- National Register of Historical Places 
  //         </Option>
  //         <Option value = "ac7a23b276c84286b5ead646bc10060e">
  //         ESF 11- Watersheds 
  //         </Option>
  //         <Option value = "103079c7fc6540cfa49da0afdde39a87">
  //         ESF 11- Waterways 
  //         </Option>
  //         <Option header>ESF 12</Option>
  //         <Option value = "8d7089150ed347ed8fd2c764795c69ad">
  //         ESF 12- Electric Boundaries, Generation Facilities, and Transmission Lines 
  //         </Option>
  //         <Option value = "52d25189422244eda8f7661a57dda737">
  //         ESF 12- Gas Districts 
  //         </Option>
  //         <Option value = "b1d574d33de5428e8dcd6f0e8816ba50">
  //         ESF 12- Wind (Farms and Turbines) 
  //         </Option>
  //         <Option header>ESF 13</Option>
  //         <Option value = "1b8dd7dc1c544150be14ed077475aae3">
  //         ESF 13- Law Enforcement Offices/Districts, and Correctional Facilities 
  //         </Option>
         
  //     </Select>
  //     {/* Retrieve map view, if configured */}
  //     {props.useMapWidgetIds?.length === 1 && !mapView && (
  //       <JimuMapViewComponent
  //         useMapWidgetId={props.useMapWidgetIds[0]}
  //         onActiveViewChange={onActiveViewChange}
  //       />)}
  //   </div>
  // )
}

export default Widget