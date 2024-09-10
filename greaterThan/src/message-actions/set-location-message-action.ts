import { AbstractMessageAction, type DataRecordsSelectionChangeMessage, type Message, type MessageDescription, MessageType, MutableStoreManager } from 'jimu-core'

export default class SetLocationMessageAction extends AbstractMessageAction {
  filterMessageDescription (messageDescription: MessageDescription): boolean {
    return messageDescription.messageType === MessageType.DataRecordsSelectionChange
  }

  filterMessageType (messageType: MessageType): boolean {
    return messageType === MessageType.DataRecordsSelectionChange
  }

  filterMessage (message: Message): boolean {
    return true
  }

  //on selection of the features in other widgets get the data record set by execute method
  //data record set consists of the features which will be used for getting the incident geometry
  onExecute (message: DataRecordsSelectionChangeMessage, actionConfig?: any): boolean {
    const dataRecordsSelectionChangeMessage = message
    if (dataRecordsSelectionChangeMessage?.records.length > 0) {
      const getRecords: any = dataRecordsSelectionChangeMessage?.records[0]
      const incidentLocationGeometry = getRecords.feature.geometry
      //get the selected features from other widgets
      MutableStoreManager.getInstance().updateStateValue(this.widgetId, 'selectedIncidentLocation', incidentLocationGeometry)
      return true
    }
  }

  getSettingComponentUri (messageType: MessageType, messageWidgetId?: string): string {
    return null
  }
}
