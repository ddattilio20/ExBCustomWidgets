import { AbstractDataAction, type DataRecordSet, MutableStoreManager, utils } from 'jimu-core'

export default class SetLocationDataAction extends AbstractDataAction {
  async isSupported (dataSet: DataRecordSet): Promise<boolean> {
    return dataSet.records.length > 0
  }

  getDataActionRuntimeUuid = (widgetId) => {
    const runtimeUuid = utils.getLocalStorageAppKey()
    return `${runtimeUuid}-${widgetId}-DaTableArray`
  }

  //on selection of the features in other widgets get the data record set by execute method
  //data record set consists of the features which will be used for getting the incident geometry
  async onExecute (dataSet: DataRecordSet): Promise<boolean> {
    const { records } = dataSet
    if (records?.length > 0) {
      const getRecords: any = records[0]
      const incidentLocationGeometry = getRecords.feature.geometry
      //get the selected features from other widgets and set the incident location
      MutableStoreManager.getInstance().updateStateValue(this.widgetId, 'selectedIncidentLocation', incidentLocationGeometry)
      return true
    }
  }
}
