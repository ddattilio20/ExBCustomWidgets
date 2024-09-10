/** @jsx jsx */ // <-- make sure to include the jsx pragma
import { React, jsx, type IntlShape, type IMThemeVariables, urlUtils, type IMFieldSchema, Immutable, OrderRule, type DataSource, type Expression, classNames, getAppStore, DataSourceManager, DataSourceTypes, ArcGISDataSourceTypes, type UseDataSource } from 'jimu-core'
import { Button, defaultMessages as jimuUIDefaultMessages, Icon, NumericInput, Select, Option, Switch, TextInput, Radio, Label, Tooltip, Checkbox } from 'jimu-ui'
import { SettingRow, SettingSection, SidePopper } from 'jimu-ui/advanced/setting-components'
import { type ColorMatches, type CurrentLayer, type LayerDsId, type LayersInfo, type SelectedExpressionInfo, type SelectedLayers, type SummaryExpressionFieldInfo, type SummaryFieldsInfo, AnalysisTypeName } from '../../config'
import defaultMessages from '../translations/default'
import {
  analysisType, unitOptions, defaultClosestAnalysis, transparentColor, NumberFormatting, CommonSummaryFieldValue, colorsStrip1, ColorMode
} from '../constants'
import { getAnalysisSettingStyle, getSidePanelStyle } from '../lib/style'
import { List, TreeItemActionType, type TreeItemsType, type TreeItemType } from 'jimu-ui/basic/list-tree'
import { CloseOutlined } from 'jimu-icons/outlined/editor/close'
import { EditOutlined } from 'jimu-icons/outlined/editor/edit'
import { SettingOutlined } from 'jimu-icons/outlined/application/setting'
import SidepopperBackArrow from './sidepopper-back-arrow'
import ColorSettingPopper from './color-setting-selector-popper'
import { InfoOutlined } from 'jimu-icons/outlined/suggested/info'
import { AllDataSourceTypes, DataSourceSelector, FieldSelector } from 'jimu-ui/advanced/data-source-selector'
import { SortAscendingOutlined } from 'jimu-icons/outlined/directional/sort-ascending'
import { SortDescendingOutlined } from 'jimu-icons/outlined/directional/sort-descending'
import { getMaxBufferLimit, validateMaxBufferDistance, getSelectedLayerInstance, getDisplayField, getPortalUnit } from '../../common/utils'
import SummaryFieldPopper from './summary-field-popper'
import EditSummaryIntersectedFieldsPopper from './edit-summary-intersected-field-popper'
import { ThemeColorPicker } from 'jimu-ui/basic/color-picker'
import { getTheme2 } from 'jimu-theme'

const IconAdd = require('../assets/add.svg')
let summaryFieldsArr = []

interface Props {
  widgetId: string
  intl: IntlShape
  theme: IMThemeVariables
  activeDs: string
  analysisIndex: number
  availableFeatureLayer: DataSource[]
  editCurrentLayer: CurrentLayer
  analysisList: LayersInfo[]
  selectedLayerGeometry: string
  onAnalysisUpdate: (prop: LayersInfo[], layerDsId: string, analysisType: string, index: number) => void
}

interface State {
  closestAnalysisType: boolean
  proximityAnalysisType: boolean
  summaryAnalysisType: boolean
  analysisListSettings: LayersInfo[]
  selectedLayers: SelectedLayers[]
  useDataSource: UseDataSource
  layerLabel: string
  analysisType: string
  closestFeatureMaxDistance: number
  distanceUnit: string
  displayField: string[]
  sortFeaturesByDistance: boolean
  sortFeaturesField: string[]
  sortFeaturesFieldOrder: string
  selectedFieldsDataSource: LayerDsId[]
  isGroupFeatures: boolean
  groupFeaturesField: string[]
  groupFeaturesFieldOrder: string
  isSortGroupsByCount: boolean
  expandOnOpen: boolean
  editSummaryAreaLengthFieldPopupOpen: boolean
  sumOfArea: boolean
  sumOfAreaLabel: string
  sumOfLengthLabel: string
  sumOfLength: boolean
  selectedLayerGeometry: string
  summaryFieldsList: SummaryExpressionFieldInfo[]
  intersectedSummaryFieldList: SummaryFieldsInfo[]
  summaryEditIndex: number
  summaryEditField: SummaryExpressionFieldInfo & SummaryFieldsInfo
  expressionInfo: Expression
  sumOfIntersectedFieldPopupTitle: string
  isAddNewSummaryField: boolean
  isNewFieldAdded: boolean
  showSummaryColorSettings: boolean
  singleColorFields: string
  byCategoryColorFields: ColorMatches
  singleColorMode: boolean
  popperFocusNode: HTMLElement
  expandFeatureDetails: boolean
  highlightResultsOnMap: boolean
}

export default class EditAnalysisPopper extends React.PureComponent<Props, State> {
  supportedDsTypes = Immutable([AllDataSourceTypes.FeatureLayer])
  items = []
  backRef = React.createRef<SidepopperBackArrow>()
  colorSidePopperTrigger = React.createRef<HTMLDivElement>()
  colorButtonRef = React.createRef<HTMLButtonElement>()
  addSummaryFieldsRef = React.createRef<HTMLDivElement>()
  summaryFieldsSidePopperTrigger = React.createRef<HTMLDivElement>()
  public setEditIndex: number
  updateSummaryFieldListSettings: SummaryFieldsInfo[]
  allSelectedLayers = []
  private readonly defaultSelectedItem = {
    name: ''
  }

  constructor (props) {
    super(props)
    this.state = {
      closestAnalysisType: false,
      proximityAnalysisType: false,
      summaryAnalysisType: false,
      analysisListSettings: this.props.analysisList || [],
      selectedLayers: [],
      useDataSource: null,
      layerLabel: '',
      analysisType: '',
      closestFeatureMaxDistance: defaultClosestAnalysis.closestFeatureMaxDistance,
      displayField: [],
      distanceUnit: '',
      sortFeaturesByDistance: true,
      sortFeaturesField: [],
      sortFeaturesFieldOrder: OrderRule.Asc,
      selectedFieldsDataSource: [],
      isGroupFeatures: false,
      groupFeaturesField: [],
      groupFeaturesFieldOrder: OrderRule.Asc,
      isSortGroupsByCount: false,
      expandOnOpen: false,
      editSummaryAreaLengthFieldPopupOpen: false,
      sumOfArea: false,
      sumOfLength: false,
      sumOfAreaLabel: this.nls('sumOfIntersectedArea'),
      sumOfLengthLabel: this.nls('sumOfIntersectedLength'),
      selectedLayerGeometry: this.props.selectedLayerGeometry,
      summaryFieldsList: [],
      intersectedSummaryFieldList: [],
      summaryEditIndex: null,
      summaryEditField: null,
      expressionInfo: null,
      sumOfIntersectedFieldPopupTitle: '',
      isAddNewSummaryField: false,
      isNewFieldAdded: false,
      showSummaryColorSettings: false,
      singleColorFields: transparentColor,
      byCategoryColorFields: null,
      singleColorMode: true,
      popperFocusNode: null,
      expandFeatureDetails: false,
      highlightResultsOnMap: true
    }
    this.setEditIndex = 0
    this.defaultSelectedItem.name = this.nls('noSelectionItemLabel')
    this.updateSummaryFieldListSettings = []
  }

  nls = (id: string) => {
    const messages = Object.assign({}, defaultMessages, jimuUIDefaultMessages)
    //for unit testing no need to mock intl we can directly use default en msg
    if (this.props.intl?.formatMessage) {
      return this.props.intl.formatMessage({ id: id, defaultMessage: messages[id] })
    } else {
      return messages[id]
    }
  }

  componentDidMount = () => {
    this.props.availableFeatureLayer.forEach((layer, index) => {
      this.getLayerListProperty(layer.id)
    })
    //display updated layers list in config
    this.setState({
      selectedLayers: this.allSelectedLayers
    })
    this.editValueUpdate()
  }

  //Get the available layers list
  getLayerListProperty = (layerDsId: string) => {
    const dsObj: DataSource = getSelectedLayerInstance(layerDsId)
    if (dsObj) {
      const label = dsObj.getLabel()
      const layerObj = {
        label: label,
        layer: { layerDsId: dsObj.id }
      }
      this.allSelectedLayers.push(layerObj)
    }
  }

  componentDidUpdate = (prevProps) => {
    //update values on change of config
    if (this.props.editCurrentLayer.layerDsId !== prevProps.editCurrentLayer.layerDsId ||
      this.props.analysisIndex !== prevProps.analysisIndex ||
      this.props.analysisList !== prevProps.analysisList) {
      this.editValueUpdate()
    }
  }

  /**
   * Set the intersected area or length field infos
   * @param commonSummaryFieldArr Intersected area or length summary fields
   * @param fieldInfo Field info of each layer
   * @returns Updated field inod
   */
  intersectedAreaLengthField = (commonSummaryFieldArr, fieldInfo) => {
    commonSummaryFieldArr.push({
      fieldLabel: fieldInfo.fieldLabel,
      fieldColor: fieldInfo.fieldColor,
      summaryFieldInfo: {
        summaryBy: fieldInfo.summaryFieldInfo.summaryBy,
        showSeparator: fieldInfo.summaryFieldInfo.showSeparator,
        numberFormattingOption: fieldInfo.summaryFieldInfo.numberFormattingOption,
        significantDigits: fieldInfo.summaryFieldInfo.significantDigits
      }
    })
    return commonSummaryFieldArr
  }

  // Set the layer info values to the respective summary analysis
  setSummaryValues = (layerAnalysisInfo) => {
    let commonSummaryFieldArr = []
    layerAnalysisInfo.summaryFields.forEach((fieldInfo) => {
      this.setState({
        singleColorFields: fieldInfo.fieldColor
      })
      if (fieldInfo.summaryFieldInfo?.summaryBy === CommonSummaryFieldValue.SumOfIntersectedArea) {
        commonSummaryFieldArr = this.intersectedAreaLengthField(commonSummaryFieldArr, fieldInfo)
        this.setState({
          sumOfAreaLabel: fieldInfo.fieldLabel,
          sumOfArea: true,
          intersectedSummaryFieldList: commonSummaryFieldArr
        })
      } else if (fieldInfo.summaryFieldInfo?.summaryBy === CommonSummaryFieldValue.SumOfIntersectedLength) {
        commonSummaryFieldArr = this.intersectedAreaLengthField(commonSummaryFieldArr, fieldInfo)
        this.setState({
          sumOfLengthLabel: fieldInfo.fieldLabel,
          sumOfLength: true,
          intersectedSummaryFieldList: commonSummaryFieldArr
        })
      } else {
        summaryFieldsArr.push({
          fieldLabel: fieldInfo.fieldLabel,
          fieldColor: fieldInfo.fieldColor,
          summaryFieldInfo: fieldInfo.summaryFieldInfo
        })
      }
    })
  }

  //On change of each analysis values update its values in config
  editValueUpdate = () => {
    summaryFieldsArr = []
    this.getFieldsDs(this.props.editCurrentLayer.layerDsId)
    // Set all the default values in the dit side popper according to its layer and analysis type
    this.props.analysisList.forEach((layer, index) => {
      const layerAnalysisInfo: any = layer.analysisInfo
      const layerObj: any = getSelectedLayerInstance(layer.useDataSource.dataSourceId)
      if (layer.useDataSource.dataSourceId === this.props.editCurrentLayer.layerDsId && layer.analysisInfo.analysisType === AnalysisTypeName.Closest && this.props.analysisIndex === index) {
        const configuredBufferDistanceUnit = layerAnalysisInfo.distanceUnit !== '' ? layerAnalysisInfo.distanceUnit : getPortalUnit()
        this.setState({
          closestAnalysisType: true,
          proximityAnalysisType: false,
          summaryAnalysisType: false,
          useDataSource: layer.useDataSource,
          layerLabel: layer.label,
          analysisType: layer.analysisInfo.analysisType,
          closestFeatureMaxDistance: layerAnalysisInfo.closestFeatureMaxDistance,
          distanceUnit: configuredBufferDistanceUnit,
          expandOnOpen: layerAnalysisInfo.expandOnOpen
        })
        return true
      } else if (layer.useDataSource.dataSourceId === this.props.editCurrentLayer.layerDsId && layer.analysisInfo.analysisType === AnalysisTypeName.Proximity && this.props.analysisIndex === index) {
        this.setState({
          closestAnalysisType: false,
          proximityAnalysisType: true,
          summaryAnalysisType: false,
          useDataSource: layer.useDataSource,
          layerLabel: layer.label,
          analysisType: layer.analysisInfo.analysisType,
          displayField: layerAnalysisInfo.displayField ? [layerAnalysisInfo.displayField] : [getDisplayField(layerObj.layerDefinition)],
          sortFeaturesByDistance: layerAnalysisInfo.sortFeaturesByDistance,
          sortFeaturesField: layerAnalysisInfo.sortFeatures.sortFeaturesByField ? [layerAnalysisInfo.sortFeatures.sortFeaturesByField] : [],
          sortFeaturesFieldOrder: layerAnalysisInfo.sortFeatures.sortFeaturesOrder,
          isGroupFeatures: layerAnalysisInfo.groupFeaturesEnabled,
          groupFeaturesField: layerAnalysisInfo.groupFeatures.groupFeaturesByField ? [layerAnalysisInfo.groupFeatures.groupFeaturesByField] : [],
          groupFeaturesFieldOrder: layerAnalysisInfo.groupFeatures.groupFeaturesOrder,
          isSortGroupsByCount: layerAnalysisInfo.sortGroupsByCount,
          expandOnOpen: layerAnalysisInfo.expandOnOpen,
          expandFeatureDetails: layerAnalysisInfo.expandFeatureDetails,
          highlightResultsOnMap: layerAnalysisInfo.highlightResultsOnMap
        })
        return true
      } else if (layer.useDataSource.dataSourceId === this.props.editCurrentLayer.layerDsId && layer.analysisInfo.analysisType === AnalysisTypeName.Summary && this.props.analysisIndex === index) {
        this.setEditIndex = index
        const createLayerObj: any = getSelectedLayerInstance(this.props.editCurrentLayer.layerDsId)
        this.updateSummaryFieldListSettings = layerAnalysisInfo.summaryFields
        //if any summary fields are configured then display the same
        if (layerAnalysisInfo.summaryFields.length > 0) {
          this.setSummaryValues(layerAnalysisInfo)
        }
        this.setState({
          closestAnalysisType: false,
          proximityAnalysisType: false,
          summaryAnalysisType: true,
          useDataSource: layer.useDataSource,
          layerLabel: layer.label,
          analysisType: layer.analysisInfo.analysisType,
          singleColorMode: layerAnalysisInfo.isSingleColorMode,
          singleColorFields: layerAnalysisInfo.summaryFields.length > 0 ? layerAnalysisInfo.singleFieldColor : transparentColor,
          summaryFieldsList: summaryFieldsArr,
          selectedLayerGeometry: createLayerObj?.layerDefinition?.geometryType,
          expandOnOpen: layerAnalysisInfo.expandOnOpen,
          highlightResultsOnMap: layerAnalysisInfo.highlightResultsOnMap
        })
        return true
      }
    })
  }

  /**
   * Update the settings on change of any analysis settings
   * @param layerLabel Specifies layer label
   * @param useDataSource
   */
  updateItemValue = (layerLabel?: string, useDataSource?: UseDataSource) => {
    const analysisSettings = this.props.analysisList
    let updatedSettings
    // eslint-disable-next-line
    analysisSettings.some((analysisInfos, index) => {
      const layerObj: any = getSelectedLayerInstance(useDataSource?.dataSourceId ? useDataSource.dataSourceId : this.props.editCurrentLayer.layerDsId)
      if ((analysisInfos.useDataSource.dataSourceId === useDataSource?.dataSourceId || this.props.editCurrentLayer.layerDsId) && (this.state.analysisType === AnalysisTypeName.Closest) && (this.props.analysisIndex === index)) {
        this.setEditIndex = index
        updatedSettings = {
          useDataSource: useDataSource || analysisInfos.useDataSource,
          label: layerLabel || analysisInfos.label,
          analysisInfo: {
            analysisType: this.state.analysisType,
            closestFeatureMaxDistance: this.state.closestFeatureMaxDistance,
            distanceUnit: this.state.distanceUnit ? this.state.distanceUnit : defaultClosestAnalysis.distanceUnit,
            expandOnOpen: this.state.expandOnOpen
          }
        }
        return true
      } else if ((analysisInfos.useDataSource.dataSourceId === useDataSource?.dataSourceId || this.props.editCurrentLayer.layerDsId) && (this.state.analysisType === AnalysisTypeName.Proximity) && (this.props.analysisIndex === index)) {
        this.setEditIndex = index
        updatedSettings = {
          useDataSource: useDataSource || analysisInfos.useDataSource,
          label: layerLabel || analysisInfos.label,
          analysisInfo: {
            analysisType: this.state.analysisType,
            displayField: this.state.displayField.length > 0 ? this.state.displayField[0] : getDisplayField(layerObj.layerDefinition),
            sortFeaturesByDistance: this.state.sortFeaturesByDistance,
            sortFeatures: {
              sortFeaturesByField: this.state.sortFeaturesField.length > 0 ? this.state.sortFeaturesField[0] : '',
              sortFeaturesOrder: this.state.sortFeaturesFieldOrder
            },
            groupFeaturesEnabled: this.state.isGroupFeatures,
            groupFeatures: {
              groupFeaturesByField: this.state.groupFeaturesField.length > 0 ? this.state.groupFeaturesField[0] : '',
              groupFeaturesOrder: this.state.groupFeaturesFieldOrder
            },
            sortGroupsByCount: this.state.isSortGroupsByCount,
            expandOnOpen: this.state.expandOnOpen,
            expandFeatureDetails: this.state.expandFeatureDetails,
            highlightResultsOnMap: this.state.highlightResultsOnMap
          }
        }
        return true
      } else if ((analysisInfos.useDataSource.dataSourceId === useDataSource?.dataSourceId || this.props.editCurrentLayer.layerDsId) && (this.state.analysisType === AnalysisTypeName.Summary) && (this.props.analysisIndex === index)) {
        this.setEditIndex = index
        this.updateSummaryFieldListSettings = this.state.summaryFieldsList.concat(this.state.intersectedSummaryFieldList) as SummaryFieldsInfo[]
        updatedSettings = {
          useDataSource: useDataSource || analysisInfos.useDataSource,
          label: layerLabel || analysisInfos.label,
          analysisInfo: {
            analysisType: this.state.analysisType,
            isSingleColorMode: this.state.singleColorMode,
            singleFieldColor: this.state.singleColorFields,
            summaryFields: this.updateSummaryFieldListSettings,
            expandOnOpen: this.state.expandOnOpen,
            highlightResultsOnMap: this.state.highlightResultsOnMap
          }
        }
        return true
      }
    })
    this.updateItem(this.setEditIndex, updatedSettings, useDataSource?.dataSourceId || this.props.editCurrentLayer.layerDsId, this.state.analysisType)
  }

  /**
   * Update each item of analysis info
   * @param formatIndex Edit analysis index
   * @param itemAttributes Updated info for the layer
   * @param layerDsId Layer Ds id
   * @param analysisType Layer analysis type
   */
  updateItem = (formatIndex: number, itemAttributes, layerDsId, analysisType) => {
    const index = formatIndex
    if (index > -1) {
      this.setState({
        analysisListSettings: [
          ...this.props.analysisList.slice(0, index),
          Object.assign({}, this.props.analysisList[index], itemAttributes),
          ...this.props.analysisList.slice(index + 1)
        ]
      }, () => {
        // update the whole analysis settings
        this.props.onAnalysisUpdate(this.state.analysisListSettings, layerDsId, analysisType, index)
      })
    }
  }

  //Update the analysis type parameter
  onAnalysisTypeChange = (evt) => {
    if (evt.target.value === AnalysisTypeName.Closest) {
      this.setState({
        closestAnalysisType: true,
        proximityAnalysisType: false,
        summaryAnalysisType: false,
        expandOnOpen: true
      })
    } else if (evt.target.value === AnalysisTypeName.Proximity) {
      this.setState({
        closestAnalysisType: false,
        proximityAnalysisType: true,
        summaryAnalysisType: false,
        expandOnOpen: false,
        expandFeatureDetails: false
      })
    } else {
      this.setState({
        closestAnalysisType: false,
        proximityAnalysisType: false,
        summaryAnalysisType: true,
        expandOnOpen: false
      })
    }
    // On change of analysis type reset to the default values
    this.resetAnalysisValues(this.state.useDataSource)
    this.setState({
      analysisType: evt.target.value
    }, () => {
      this.updateItemValue()
    })
  }

  //Update the layer label parameter
  onLayerLabelChange = (event) => {
    if (event?.target) {
      const value = event.target.value
      this.setState({
        layerLabel: value
      })
    }
  }

  onLayerLabelAcceptValue = (value: string) => {
    this.updateItemValue(value)
  }

  //Update the map buffer distance parameter
  onMaxDistanceChange = (value: number | undefined) => {
    this.setState({
      closestFeatureMaxDistance: value ?? 0
    }, () => {
      this.updateItemValue()
    })
  }

  //Update the buffer unit parameter
  onUnitChange = (evt) => {
    const bufferDistanceMaxLimit = validateMaxBufferDistance(this.state.closestFeatureMaxDistance, evt.target.value)
    this.setState({
      distanceUnit: evt.target.value,
      closestFeatureMaxDistance: bufferDistanceMaxLimit
    }, () => {
      this.updateItemValue()
    })
  }

  //Update sort features parameter
  handleSortFeaturesOptionsChange = (value: boolean) => {
    this.setState({
      sortFeaturesByDistance: value
    }, () => {
      this.updateItemValue()
    })
  }

  /**
   * Update display field parameter
   * @param allSelectedFields Selected fields array
   */
  onDisplayField = (allSelectedFields: IMFieldSchema[]) => {
    if (allSelectedFields.length === 0) {
      this.setState({
        displayField: []
      }, () => {
        this.updateItemValue()
      })
    } else {
      this.setState({
        displayField: [allSelectedFields[0].jimuName]
      }, () => {
        this.updateItemValue()
      })
    }
  }

  /**
   * Update sort features field parameter
   * @param allSelectedFields Selected fields array
   */
  onSortFieldSelectChange = (allSelectedFields: IMFieldSchema[]) => {
    if (allSelectedFields.length === 0) {
      this.setState({
        sortFeaturesField: []
      }, () => {
        this.updateItemValue()
      })
    } else {
      this.setState({
        sortFeaturesField: [allSelectedFields[0].jimuName]
      }, () => {
        this.updateItemValue()
      })
    }
  }

  /**
   * Update group features field parameter
   * @param allSelectedFields Selected fields array
   */
  onGroupFieldSelectChange = (allSelectedFields: IMFieldSchema[]) => {
    if (allSelectedFields.length === 0) {
      this.setState({
        groupFeaturesField: []
      }, () => {
        this.updateItemValue()
      })
    } else {
      this.setState({
        groupFeaturesField: [allSelectedFields[0].jimuName]
      }, () => {
        this.updateItemValue()
      })
    }
  }

  expandListOnChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    //for proximity analysis type if expand list is off then make expand feature details off
    if (!evt.target.checked && this.state.proximityAnalysisType) {
      this.setState({
        expandFeatureDetails: false
      })
    }
    this.setState({
      expandOnOpen: evt.target.checked
    }, () => {
      this.updateItemValue()
    })
  }

  /**
   * Reset the layer info when the layer or analysis type changes
   */
  resetAnalysisValues = (useDataSource: UseDataSource) => {
    const layerObj: any = getSelectedLayerInstance(useDataSource.dataSourceId)
    this.setState({
      closestFeatureMaxDistance: defaultClosestAnalysis.closestFeatureMaxDistance,
      distanceUnit: null,
      displayField: [],
      sortFeaturesByDistance: true,
      sortFeaturesField: [],
      sortFeaturesFieldOrder: OrderRule.Asc,
      isGroupFeatures: false,
      groupFeaturesField: [],
      groupFeaturesFieldOrder: OrderRule.Asc,
      isSortGroupsByCount: false,
      selectedLayerGeometry: layerObj.layerDefinition?.geometryType,
      sumOfLength: false,
      sumOfArea: false,
      summaryFieldsList: [],
      intersectedSummaryFieldList: [],
      sumOfAreaLabel: this.nls('sumOfIntersectedArea'),
      sumOfLengthLabel: this.nls('sumOfIntersectedLength')
    }, () => {
      this.updateItemValue()
    })
  }

  //Add the new summary fields
  onAddSummaryFieldsClick = (e) => {
    e.stopPropagation()
    this.setState({
      isAddNewSummaryField: true,
      isNewFieldAdded: true,
      summaryEditIndex: null
    }, () => {
      this.backRef.current?.backRefFocus()
    })
  }

  /**
   * edit individual summary fields list
   * @param e Event of editing summary fields info
   * @param field Summary field
   * @param summaryFieldsEditIndex Summary field index
   */
  editSummaryFields = (e, field, summaryFieldsEditIndex: number) => {
    e.stopPropagation()
    this.setSidePopperAnchor(summaryFieldsEditIndex)
    this.setState({
      isAddNewSummaryField: true,
      isNewFieldAdded: false,
      summaryEditField: field,
      summaryEditIndex: summaryFieldsEditIndex
    }, () => {
      this.backRef.current?.backRefFocus()
    })
  }

  //set side popper anchor
  setSidePopperAnchor = (index?: number) => {
    const node: any = this.summaryFieldsSidePopperTrigger.current.getElementsByClassName('jimu-tree-item__body')[index]
    this.setState({
      popperFocusNode: node
    })
  }

  //delete individual summary fields list
  deleteSummaryFields = (e, index) => {
    e.stopPropagation()
    let updatedSettings
    const summaryList = this.state.summaryFieldsList.concat(this.state.intersectedSummaryFieldList)
    summaryList.splice(index, 1)
    //if fields list is empty set the focus on add summary fields button
    summaryList.length === 0 ? this.addSummaryFieldsRef.current?.focus() : this.summaryFieldsSidePopperTrigger.current?.focus()
    this.props.analysisList.forEach((layer) => {
      const layerAnalysisInfo: any = layer.analysisInfo
      if (layer.useDataSource.dataSourceId === this.props.editCurrentLayer.layerDsId &&
        layer.analysisInfo.analysisType === AnalysisTypeName.Summary) {
        updatedSettings = { // on delete of summary fields update the summary fields list
          useDataSource: layer.useDataSource,
          label: layer.label,
          analysisInfo: {
            analysisType: layer.analysisInfo.analysisType,
            isSingleColorMode: layerAnalysisInfo.isSingleColorMode,
            singleFieldColor: layerAnalysisInfo.singleFieldColor,
            summaryFields: summaryList
          }
        }
      }
    })
    this.setState({
      analysisListSettings: this.props.analysisList
    }, () => {
      this.updateItem(this.setEditIndex, updatedSettings, this.props.editCurrentLayer.layerDsId, this.state.analysisType)
    })
  }

  /**
   * Edit intersected area or length summary field infos
   * @param summaryFieldLabel Summary field label
   * @param showThousandSeparator Show thousand separator parameter
   * @param formattingOptions Formatting options parameter
   * @param significantDigit Significant digits parameter
   */
  editExistingIntersectedSummaryField = (summaryFieldLabel: string, showThousandSeparator: boolean,
    formattingOptions: string, significantDigit: number) => {
    let updatedSummaryFieldInfos
    this.state.intersectedSummaryFieldList.forEach((summaryList, index) => {
      updatedSummaryFieldInfos = this.updateSummaryIntersectedFields(summaryFieldLabel, showThousandSeparator,
        formattingOptions, significantDigit, summaryList)
    })
    if (this.state.summaryEditField.summaryFieldInfo.summaryBy === CommonSummaryFieldValue.SumOfIntersectedArea) {
      this.setState({
        sumOfAreaLabel: summaryFieldLabel
      })
    } else if (this.state.summaryEditField.summaryFieldInfo.summaryBy === CommonSummaryFieldValue.SumOfIntersectedLength) {
      this.setState({
        sumOfLengthLabel: summaryFieldLabel
      })
    }
    //on edit update the intersected summary fields
    this.setState({
      intersectedSummaryFieldList: [
        ...this.state.intersectedSummaryFieldList.slice(0, 0),
        Object.assign({}, this.state.intersectedSummaryFieldList[0], updatedSummaryFieldInfos),
        ...this.state.intersectedSummaryFieldList.slice(0 + 1)
      ]
    }, () => {
      this.updateItemValue()
    })
  }

  /**
   * Update the exiting intersected summary fields
   * @param summaryFieldLabel Summary field label
   * @param showThousandSeparator Show thousand separator parameter
   * @param formattingOptions Formatting options parameter
   * @param significantDigit Significant digits parameter
   * @param summaryList Updated summary fields list
   * @returns Summary fields info
   */
  updateSummaryIntersectedFields = (summaryFieldLabel: string, showThousandSeparator: boolean,
    formattingOptions: string, significantDigit: number, summaryList?) => {
    //get default intersected summary field depending upon the layer geometry type
    let updatedSummaryFieldInfos = {}
    let commonIntersectedFieldValue
    if (this.state.selectedLayerGeometry === 'esriGeometryPolyline') {
      commonIntersectedFieldValue = CommonSummaryFieldValue.SumOfIntersectedLength
    } else if (this.state.selectedLayerGeometry === 'esriGeometryPolygon') {
      commonIntersectedFieldValue = CommonSummaryFieldValue.SumOfIntersectedArea
    }
    updatedSummaryFieldInfos = {
      fieldLabel: summaryFieldLabel,
      fieldColor: summaryList.fieldColor,
      summaryFieldInfo: {
        summaryBy: commonIntersectedFieldValue,
        showSeparator: showThousandSeparator,
        numberFormattingOption: formattingOptions,
        significantDigits: significantDigit
      }
    }
    return updatedSummaryFieldInfos
  }

  /**
   * Update the existing summary fields
   * @param summaryFieldLabel Summary field label
   * @param showThousandSeparator Show thousand separator parameter
   * @param formattingOptions Formatting options parameter
   * @param significantDigit Significant digits parameter
   */
  onOkButtonClick = (summaryFieldLabel: string, showThousandSeparator: boolean,
    formattingOptions: string, significantDigit: number) => {
    this.editExistingIntersectedSummaryField(summaryFieldLabel, showThousandSeparator, formattingOptions, significantDigit)
  }

  /**
   * Create label and delete button elements in the individual summary field list items
  */
  createFieldsOptionElement = (field, index: number) => {
    const _options = (
      <React.Fragment>
        <div tabIndex={0} aria-label={field.fieldLabel} className={'text-truncate labelAlign'}
          title={field.fieldLabel}>{field.fieldLabel}</div>
        <Button role={'button'} aria-label={field.fieldLabel + this.nls('editExpression')} className={'ml-1'}
          title={this.nls('editExpression')} icon type={'tertiary'} size={'sm'} onClick={(e) => { this.editSummaryFields(e, field, index) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              this.editSummaryFields(e, field, index)
            }
          }}>
          <EditOutlined size={'s'} />
        </Button>
        <Button role={'button'} aria-label={this.nls('deleteOption')} title={this.nls('deleteOption')}
          icon type={'tertiary'} size={'sm'} onClick={(e) => { this.deleteSummaryFields(e, index) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              this.deleteSummaryFields(e, index)
            }
          }}>
          <CloseOutlined size='s' />
        </Button>
      </React.Fragment>
    )
    return _options
  }

  onEditPopperClose = () => {
    this.setState({
      editSummaryAreaLengthFieldPopupOpen: false
    })
  }

  updateSortedSummaryFields = (sortedFields: SummaryFieldsInfo[]) => {
    this.setState({
      summaryFieldsList: sortedFields
    }, () => {
      this.updateItemValue()
    })
  }

  onColorSettingClick = () => {
    this.openColorSetting(true)
  }

  /**
*On click of back and arrow button close the color settings panel and come back to the edit analysis settings panel
*/
  closeColorSettingsPanel = () => {
    this.openColorSetting(false)
    this.focusColorSetting()
  }

  focusColorSetting = () => {
    setTimeout(() => {
      this.colorButtonRef.current?.focus()
    }, 50)
  }

  openColorSetting = (isOpen: boolean) => {
    this.setState({
      showSummaryColorSettings: isOpen
    }, () => {
      this.backRef.current?.backRefFocus()
      setTimeout(() => {
        this.colorSidePopperTrigger.current?.focus()
      }, 50)
    })
  }

  /**
   * On change of individual colors, update field colors and summary fields list in the configuration
   */
  onUpdateFieldColorByCategory = (byCategoryColorFields: ColorMatches) => {
    const updatedSummaryFieldsList = this.state.summaryFieldsList?.map((fieldsInfo, index) => {
      return {
        ...fieldsInfo,
        fieldColor: byCategoryColorFields?.[fieldsInfo.fieldLabel + '_' + index]?._fillColor
          ? byCategoryColorFields?.[fieldsInfo.fieldLabel + '_' + index]?._fillColor
          : colorsStrip1[index % colorsStrip1.length]
      }
    })
    const updateSummaryIntersectedFieldsList = this.state.intersectedSummaryFieldList?.map((fieldsInfo, index) => {
      return {
        ...fieldsInfo,
        fieldColor: byCategoryColorFields?.[fieldsInfo.fieldLabel + '_' + this.state.summaryFieldsList.length]?._fillColor
          ? byCategoryColorFields?.[fieldsInfo.fieldLabel + '_' + this.state.summaryFieldsList.length]?._fillColor
          : colorsStrip1[index % colorsStrip1.length]
      }
    })
    this.setState({
      summaryFieldsList: updatedSummaryFieldsList,
      intersectedSummaryFieldList: updateSummaryIntersectedFieldsList,
      byCategoryColorFields: byCategoryColorFields
    }, () => {
      this.updateItemValue()
    })
  }

  handleColorTypeChange = (updateColorType: string) => {
    if (updateColorType === ColorMode.SingleColor) {
      this.updateFieldColorBySingleColor(this.state.singleColorFields)
    } else if (updateColorType === ColorMode.ByCategory) {
      this.onUpdateFieldColorByCategory(this.state.byCategoryColorFields)
    }
    this.setState({
      singleColorMode: updateColorType === ColorMode.SingleColor
    }, () => {
      this.updateItemValue()
    })
  }

  handleSingleColorChange = (singleColor: string) => {
    this.setState({
      singleColorFields: singleColor
    }, () => {
      this.updateFieldColorBySingleColor(this.state.singleColorFields)
    })
  }

  updateFieldColorBySingleColor = (singleColor: string) => {
    const updatedSummaryFieldList = this.state.summaryFieldsList?.map((fieldsInfo, index) => {
      return { ...fieldsInfo, fieldColor: singleColor }
    })
    const updatedSummaryIntersectedFieldList = this.state.intersectedSummaryFieldList?.map((fieldsInfo, index) => {
      return { ...fieldsInfo, fieldColor: singleColor }
    })
    this.setState({
      summaryFieldsList: updatedSummaryFieldList,
      intersectedSummaryFieldList: updatedSummaryIntersectedFieldList
    }, () => {
      this.updateItemValue()
    })
  }

  handleByCategorySettingColorChange = () => {
    this.openColorSetting(true)
  }

  handleSortOrderKeyUp = (evt) => {
    if (evt.key === 'Enter' || evt.key === ' ') {
      this.setState({
        sortFeaturesFieldOrder: this.state.sortFeaturesFieldOrder === OrderRule.Asc ? OrderRule.Desc : OrderRule.Asc
      }, () => {
        this.updateItemValue()
      })
    }
  }

  handleGroupOrderKeyUp = (evt) => {
    if (evt.key === 'Enter' || evt.key === ' ') {
      this.setState({
        groupFeaturesFieldOrder: this.state.groupFeaturesFieldOrder === OrderRule.Asc ? OrderRule.Desc : OrderRule.Asc
      }, () => {
        this.updateItemValue()
      })
    }
  }

  //get fields from layers
  getFieldsDs = (currentLayerDsId: string) => {
    const selectedDs = []
    const createLayerObj: any = getSelectedLayerInstance(currentLayerDsId)
    selectedDs.push({
      layerDsId: currentLayerDsId
    })
    this.setState({
      selectedFieldsDataSource: selectedDs,
      selectedLayerGeometry: createLayerObj.layerDefinition?.geometryType
    })
  }

  //create field selector for display field
  createDisplayFieldOption = (selectedLayerDataSource: any): any => {
    const dsObj: DataSource = getSelectedLayerInstance(selectedLayerDataSource.layerDsId)
    const _options = (
      <FieldSelector
        dataSources={dsObj ? [dsObj] : []}
        isSearchInputHidden={true}
        onChange={this.onDisplayField.bind(this)}
        isDataSourceDropDownHidden={true}
        useDropdown={true}
        selectedFields={Immutable(this.state.displayField)}
        isMultiple={false}
      />
    )
    return _options
  }

  // Create field selector includes sorting fields capability
  createSortFieldSelectorOption = (selectedLayerDataSource: any, index: number): any => {
    const dsObj: DataSource = getSelectedLayerInstance(selectedLayerDataSource.layerDsId)
    const _options = (
      <div className='sort-field-section p-1'>
        {
          <div className='sort-field-selector'>
            <FieldSelector
              dataSources={dsObj ? [dsObj] : []}
              isSearchInputHidden
              onChange={this.onSortFieldSelectChange.bind(this)}
              isDataSourceDropDownHidden
              useDropdown
              selectedFields={Immutable(this.state.sortFeaturesField)}
              isMultiple={false}
              noSelectionItem={this.defaultSelectedItem}
              dropdownProps={{ useKeyUpEvent: true }}
            />
          </div>
        }
        <div className='sort-icon'>
          <Button
            size='sm'
            icon
            type='tertiary'
            className='order-button padding-0'
            title={this.state.sortFeaturesFieldOrder === OrderRule.Asc ? this.nls('ascending') : this.nls('decending')}
            onKeyUp={(e) => { this.handleSortOrderKeyUp(e) }}
            onClick={() => {
              this.setState({
                sortFeaturesFieldOrder: this.state.sortFeaturesFieldOrder === OrderRule.Asc ? OrderRule.Desc : OrderRule.Asc
              }, () => {
                this.updateItemValue()
              })
            }}>
            {this.state.sortFeaturesFieldOrder === OrderRule.Desc && <SortDescendingOutlined size='s' className='sort-arrow-down-icon ml-0' />}
            {this.state.sortFeaturesFieldOrder === OrderRule.Asc && <SortAscendingOutlined size='s' className='sort-arrow-down-icon ml-0' />}
          </Button>
        </div>
      </div>
    )
    return _options
  }

  // Create field selector includes group and sorting fields capability
  createGroupFieldSelectorOption = (selectedLayerDataSource: any, index: number): any => {
    const dsObj: DataSource = getSelectedLayerInstance(selectedLayerDataSource.layerDsId)
    const _options = (
      <div className='sort-field-section p-1'>
        {
          <div className='sort-field-selector'>
            <FieldSelector
              dataSources={dsObj ? [dsObj] : []}
              isSearchInputHidden
              onChange={this.onGroupFieldSelectChange.bind(this)}
              isDataSourceDropDownHidden
              useDropdown
              selectedFields={Immutable(this.state.groupFeaturesField)}
              isMultiple={false}
              noSelectionItem={this.defaultSelectedItem}
              dropdownProps={{ useKeyUpEvent: true }}
            />
          </div>
        }
        <div className='sort-icon'>
          <Button
            size='sm'
            icon
            type='tertiary'
            className='order-button padding-0'
            title={this.state.groupFeaturesFieldOrder === OrderRule.Asc ? this.nls('ascending') : this.nls('decending')}
            onKeyUp={(e) => { this.handleGroupOrderKeyUp(e) }}
            onClick={() => {
              this.setState({
                groupFeaturesFieldOrder: this.state.groupFeaturesFieldOrder === OrderRule.Asc ? OrderRule.Desc : OrderRule.Asc
              }, () => {
                this.updateItemValue()
              })
            }}>
            {this.state.groupFeaturesFieldOrder === OrderRule.Desc && <SortDescendingOutlined size='s' className='sort-arrow-down-icon ml-0' />}
            {this.state.groupFeaturesFieldOrder === OrderRule.Asc && <SortAscendingOutlined size='s' className='sort-arrow-down-icon ml-0' />}
          </Button>
        </div>
      </div>
    )
    return _options
  }

  groupFeaturesOnChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      isGroupFeatures: evt.target.checked
    }, () => {
      this.updateItemValue()
    })
  }

  sortGroupsByCountOnChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      isSortGroupsByCount: evt.target.checked
    }, () => {
      this.updateItemValue()
    })
  }

  onSumOfAreaChange = (evt, sumOfArea: string) => {
    this.updateIntersectedFields(evt.target.checked, sumOfArea)
    this.setState({
      sumOfArea: evt.target.checked
    })
  }

  onSumOfLengthChange = (evt, sumOfLength: string) => {
    this.updateIntersectedFields(evt.target.checked, sumOfLength)
    this.setState({
      sumOfLength: evt.target.checked
    })
  }

  /**
   * Update intersected fields info
   * @param isIntersectedField Intersected field
   * @param intersectedFieldValue Intersected field parameter value
   */
  updateIntersectedFields = (isIntersectedField: boolean, intersectedFieldValue: string) => {
    if (isIntersectedField) {
      const updateSettings = {
        fieldLabel: intersectedFieldValue === CommonSummaryFieldValue.SumOfIntersectedLength ? this.state.sumOfLengthLabel : this.state.sumOfAreaLabel,
        fieldColor: this.state.singleColorMode ? this.state.singleColorFields : transparentColor,
        summaryFieldInfo: {
          summaryBy: intersectedFieldValue,
          showSeparator: true,
          numberFormattingOption: NumberFormatting.NoFormatting,
          significantDigits: 0
        }
      }
      this.setState({
        intersectedSummaryFieldList: [
          ...this.state.intersectedSummaryFieldList.slice(0, 0),
          Object.assign({}, this.state.intersectedSummaryFieldList[0], updateSettings),
          ...this.state.intersectedSummaryFieldList.slice(0 + 1)
        ]
      }, () => {
        if (!this.state.singleColorMode) {
          this.onUpdateFieldColorByCategory(this.state.byCategoryColorFields)
        } else {
          this.updateItemValue()
        }
      })
    } else {
      this.state.intersectedSummaryFieldList.splice(0, 1)
      this.updateItemValue()
    }
  }

  onSumOfAreaEditClick = (sumOfArea: string) => {
    this.onIntersectedFieldEdit(sumOfArea)
  }

  onSumOfLengthEditClick = (sumOfLength: string) => {
    this.onIntersectedFieldEdit(sumOfLength)
  }

  onIntersectedFieldEdit = (intersectedField: string) => {
    this.setState({
      editSummaryAreaLengthFieldPopupOpen: true,
      sumOfIntersectedFieldPopupTitle: intersectedField === CommonSummaryFieldValue.SumOfIntersectedArea ? this.nls('editSumOfIntersectedArea') : this.nls('editSumOfIntersectedLength')
    })
    this.state.intersectedSummaryFieldList.forEach((field) => {
      if (field.summaryFieldInfo.summaryBy === intersectedField) {
        this.setState({
          summaryEditField: field
        })
      }
    })
  }

  /**
*On click of back and close button close the add summary field panel and come back to the edit analysis settings panel
*/
  closeAddSummaryFieldPanel = () => {
    this.setState({
      isAddNewSummaryField: false
    }, () => {
      this.addSummaryFieldsRef.current.focus()
    })
  }

  //Update the selected expression of existing or newly added summary fields
  onExpressionInfoUpdate = (expressionInfo: SelectedExpressionInfo) => {
    this.setState({
      isAddNewSummaryField: false
    })
    const updatedSummaryFieldInfos = {
      fieldLabel: expressionInfo.fieldLabel,
      fieldColor: this.state.singleColorMode ? this.state.singleColorFields : transparentColor,
      summaryFieldInfo: expressionInfo.selectedExpression
    }
    if (this.state.isNewFieldAdded) {
      this.setState({
        summaryFieldsList: [...this.state.summaryFieldsList, updatedSummaryFieldInfos],
        expressionInfo: expressionInfo.selectedExpression
      }, () => {
        this.setSidePopperAnchor(this.state.summaryFieldsList.length - 1)
        if (!this.state.singleColorMode) {
          this.onUpdateFieldColorByCategory(this.state.byCategoryColorFields)
        } else {
          this.updateItemValue()
        }
      })
    } else {
      this.setState({
        expressionInfo: expressionInfo.selectedExpression
      }, () => {
        this.updateExistingField(updatedSummaryFieldInfos)
      })
    }
  }

  updateExistingField = (updatedSummaryFieldInfos) => {
    const index = this.state.summaryEditIndex
    if (index > -1) {
      //on edit update the summary fields list
      this.setState({
        summaryFieldsList: [
          ...this.state.summaryFieldsList.slice(0, index),
          Object.assign({}, this.state.summaryFieldsList[index], updatedSummaryFieldInfos),
          ...this.state.summaryFieldsList.slice(index + 1)
        ]
      }, () => {
        if (!this.state.singleColorMode) {
          this.onUpdateFieldColorByCategory(this.state.byCategoryColorFields)
        } else {
          this.updateItemValue()
        }
      })
    }
  }

  /**
   * Get the data source root ids from the appconfig datasources
   * @returns array of root data source ids
   */
  getDsRootIdsByWidgetId = () => {
    const appConfig = getAppStore().getState()?.appStateInBuilder?.appConfig
    const widgetJson = appConfig
    const rootIds = []
    const ds = widgetJson.dataSources[this.props.activeDs]
    if (ds?.type === ArcGISDataSourceTypes.WebMap || ds?.type === ArcGISDataSourceTypes.WebScene) { // is root ds
      rootIds.push(this.props.activeDs)
    }

    return rootIds.length > 0 ? Immutable(rootIds) : undefined
  }

  // save currentSelectedDs to array
  dataSourceChangeSave = (useDataSources: UseDataSource[]) => {
    if (!useDataSources) {
      return
    }
    const availableFeatureLayer = this.props?.availableFeatureLayer.find(result => result.id === useDataSources[0].dataSourceId) as any
    // On change of layer reset to the default values
    this.resetAnalysisValues(useDataSources[0])
    this.setState({
      layerLabel: availableFeatureLayer?.getLabel() ? availableFeatureLayer.getLabel() : '',
      useDataSource: useDataSources[0]
    }, () => {
      this.updateItemValue(this.state.layerLabel, this.state.useDataSource)
    })
  }

  /**
   * Handles change event of expand feature details checkbox
   * @param evt check box current state
   */
  expandFeatureOnChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      expandFeatureDetails: evt.target.checked
    }, () => {
      this.updateItemValue()
    })
  }

  /**
   * Handles change event of highlight results switch
   * @param evt switch current state
   */
  highlightResultsOnMapOnChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      highlightResultsOnMap: evt.target.checked
    }, () => {
      this.updateItemValue()
    })
  }

  render () {
    const ds = DataSourceManager.getInstance().getDataSource(this.props.activeDs)
    const childDs = ds.getChildDataSources()
    let dsAdded = false
    const dsRootIdsArr = []
    if (childDs) {
      childDs.forEach((layer) => {
        const getLayer: any = layer
        if (getLayer?.layerDefinition?.type !== 'Table') {
          if (layer?.type === DataSourceTypes.MapService || layer?.type === DataSourceTypes.GroupLayer) {
            const subLayers = layer.getChildDataSources()
            subLayers.forEach((subLayer) => {
              dsRootIdsArr.push(subLayer.id)
            })
          } else { //for feature layer
            if (dsRootIdsArr.length > 0) { //check for if map service child data source is same as feature layer ds id
              const matchedLayerWithMapService = dsRootIdsArr.find(item => item.id === layer.id)
              if (!matchedLayerWithMapService) {
                dsAdded = true
              }
              if (dsAdded) dsRootIdsArr.push(layer.id)
            } else {
              dsRootIdsArr.push(layer.id)
            }
          }
        }
      })
    }

    const dsRootIds = this.getDsRootIdsByWidgetId()

    //dsObject parameters used to pass to the ds selector
    const dsSelectorSource = {
      fromRootDsIds: dsRootIds,
      fromDsIds: Immutable(dsRootIdsArr)
    }

    return <div css={getAnalysisSettingStyle(this.props.theme)} style={{ height: 'calc(100% - 56px)', width: '100%', overflow: 'auto' }}>
      <SettingSection>
        <SettingRow label={this.nls('selectLayer')} flow={'wrap'}>
          <DataSourceSelector
            types={this.supportedDsTypes}
            useDataSources={this.state.useDataSource ? Immutable([this.state.useDataSource]) : Immutable([])}
            fromRootDsIds={dsSelectorSource.fromRootDsIds}
            fromDsIds={dsSelectorSource.fromDsIds}
            mustUseDataSource={true}
            onChange={this.dataSourceChangeSave}
            enableToSelectOutputDsFromSelf={false}
            closeDataSourceListOnChange
            hideAddDataButton={true}
            disableRemove={() => true}
            hideDataView={true}
            useDataSourcesEnabled
          />
        </SettingRow>

        <SettingRow label={this.nls('label')} flow={'wrap'}>
          <TextInput className='w-100' role={'textbox'} aria-label={this.nls('label') + this.state.layerLabel} title={this.state.layerLabel}
            size={'sm'} value={this.state.layerLabel} onAcceptValue={this.onLayerLabelAcceptValue} onChange={this.onLayerLabelChange} />
        </SettingRow>
      </SettingSection>

      <SettingSection>
        <SettingRow>
          <Label className='w-100 d-flex'>
            <div className='flex-grow-1 text-break setting-text-level-1'>
              {this.nls('analysisTypeLabel')}
            </div>
          </Label>
          <Tooltip role={'tooltip'} tabIndex={0} aria-label={this.nls('analysisTypeInfoTooltip')}
            title={this.nls('analysisTypeInfoTooltip')} showArrow placement='top'>
            <div className='setting-text-level-2 d-inline'>
              <InfoOutlined />
            </div>
          </Tooltip>
        </SettingRow>

        <SettingRow className='mt-2'>
          <Select menuRole={'menu'} aria-label={this.nls('analysisTypeLabel') + this.state.analysisType} name={'analysisType'} size={'sm'} value={this.state.analysisType}
            onChange={this.onAnalysisTypeChange}>
            {analysisType.map((option, index) => {
              return <Option role={'option'} tabIndex={0} aria-label={this.nls(option)} key={index} value={option}>{this.nls(option)}</Option>
            })}
          </Select>
        </SettingRow>

        {/* Closest Analysis section */}
        {this.state.closestAnalysisType &&
          <React.Fragment>
            <SettingRow label={this.nls('closestFeatureMaxDistLabel')} flow={'wrap'}>
              <NumericInput className='w-100' aria-label={this.nls('closestFeatureMaxDistLabel')} size={'sm'} min={0} max={getMaxBufferLimit(this.state.distanceUnit)}
                defaultValue={this.state.closestFeatureMaxDistance} value={this.state.closestFeatureMaxDistance} onChange={this.onMaxDistanceChange} />
            </SettingRow>

            <SettingRow label={this.nls('distanceUnits')} flow={'wrap'}>
              <Select menuRole={'menu'} aria-label={this.state.distanceUnit} name={'analysisType'} size={'sm'} value={this.state.distanceUnit}
                onChange={this.onUnitChange}>
                {unitOptions.map((option, index) => {
                  return <Option role={'option'} tabIndex={0} aria-label={option.value} key={index} value={option.value}>{option.label}</Option>
                })}
              </Select>
            </SettingRow>
          </React.Fragment>
        }

        {/* Proximity Analysis section */}
        {this.state.proximityAnalysisType &&
          <React.Fragment>
            <SettingRow label={this.nls('displayFieldLabel')} flow={'wrap'}>
              {this.createDisplayFieldOption(this.state.selectedFieldsDataSource[0])}
            </SettingRow>

            <SettingRow flow={'wrap'}>
              <Label tabIndex={0} aria-label={this.nls('sortFeaturesLabel')} title={this.nls('sortFeaturesLabel')}
                className='w-100 d-flex'>
                <div className='text-truncate flex-grow-1 setting-text-level-3'>
                  {this.nls('sortFeaturesLabel')}
                </div>
              </Label>
            </SettingRow>

            <SettingRow className={'mt-1 ml-3'} flow={'wrap'}>
              <Label className='m-0' centric>
                <Radio role={'radio'} aria-label={this.nls('distanceLabel')}
                  className={'cursor-pointer'}
                  value={'distanceLabel'}
                  onChange={() => { this.handleSortFeaturesOptionsChange(true) }}
                  checked={this.state.sortFeaturesByDistance} />
                <div tabIndex={0} className='ml-1 text-break cursor-pointer' onClick={() => { this.handleSortFeaturesOptionsChange(true) }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      this.handleSortFeaturesOptionsChange(true)
                    }
                  }}>
                  {this.nls('distanceLabel')}
                </div>
              </Label>
            </SettingRow>

            <SettingRow className={'mt-2 ml-3'} flow={'wrap'}>
                <Label className='m-0' centric>
                  <Radio role={'radio'} aria-label={this.nls('field')}
                    className={'cursor-pointer'}
                    value={'field'}
                    onChange={() => { this.handleSortFeaturesOptionsChange(false) }}
                    checked={!this.state.sortFeaturesByDistance} />
                  <div tabIndex={0} className='ml-1 text-break cursor-pointer' onClick={() => { this.handleSortFeaturesOptionsChange(false) }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      this.handleSortFeaturesOptionsChange(false)
                    }
                  }}>
                    {this.nls('field')}
                  </div>
                </Label>
            </SettingRow>

            {/* Sort Features */}
            {!this.state.sortFeaturesByDistance &&
              <List className='pt-3 pb-3'
                size='sm'
                itemsJson={Array.from(this.state.selectedFieldsDataSource)?.map((layer, index) => ({
                  itemStateDetailContent: layer,
                  itemKey: `${index}`
                }))}
                dndEnabled={false}
                overrideItemBlockInfo={({ itemBlockInfo }) => {
                  return {
                    name: TreeItemActionType.RenderOverrideItem,
                    children: [{
                      name: TreeItemActionType.RenderOverrideItemBody,
                      children: [{
                        name: TreeItemActionType.RenderOverrideItemMainLine
                      }]
                    }]
                  }
                }}
                renderOverrideItemMainLine={(actionData, refComponent) => {
                  const { itemJsons } = refComponent.props
                  const currentItemJson = itemJsons[0]
                  const listItemJsons = itemJsons[1] as any
                  return this.createSortFieldSelectorOption(currentItemJson.itemStateDetailContent, listItemJsons.indexOf(currentItemJson))
                }}
              />
            }

            <SettingRow label={this.nls('groupFeaturesLabel')}>
              <Switch role={'switch'} aria-label={this.nls('groupFeaturesLabel')} title={this.nls('groupFeaturesLabel')}
               checked={this.state.isGroupFeatures} onChange={this.groupFeaturesOnChange} />
            </SettingRow>

            {/* Group features */}
            {this.state.isGroupFeatures &&
              <React.Fragment>
                <List className='pt-3 pb-3'
                  size='sm'
                  itemsJson={Array.from(this.state.selectedFieldsDataSource)?.map((layer, index) => ({
                    itemStateDetailContent: layer,
                    itemKey: `${index}`
                  }))}
                  dndEnabled={false}
                  overrideItemBlockInfo={({ itemBlockInfo }) => {
                    return {
                      name: TreeItemActionType.RenderOverrideItem,
                      children: [{
                        name: TreeItemActionType.RenderOverrideItemBody,
                        children: [{
                          name: TreeItemActionType.RenderOverrideItemMainLine
                        }]
                      }]
                    }
                  }}
                  renderOverrideItemMainLine={(actionData, refComponent) => {
                    const { itemJsons } = refComponent.props
                    const currentItemJson = itemJsons[0]
                    const listItemJsons = itemJsons[1] as any
                    return this.createGroupFieldSelectorOption(currentItemJson.itemStateDetailContent, listItemJsons.indexOf(currentItemJson))
                  }}
                />

                <SettingRow label={this.nls('sortGroupsByCount')}>
                  <Switch role={'switch'} aria-label={this.nls('sortGroupsByCount')} title={this.nls('sortGroupsByCount')}
                    checked={this.state.isSortGroupsByCount} onChange={this.sortGroupsByCountOnChange} />
                </SettingRow>
              </React.Fragment>
            }
          </React.Fragment>
        }

        {/* Summary Analysis section */}
        {this.state.summaryAnalysisType &&
          <React.Fragment>
            <div tabIndex={-1} className='pt-2 pb-1'>
              <div ref={this.addSummaryFieldsRef} tabIndex={0} aria-label={this.nls('addSummaryFields')} title={this.nls('addSummaryFields')} className='d-flex align-items-center add-summary-field'
                onClick={(e) => { this.onAddSummaryFieldsClick(e) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    this.onAddSummaryFieldsClick(e)
                  }
                }}>
                <div tabIndex={-1} className='add-summary-field-icon-container d-flex align-items-center justify-content-center mr-2'>
                  <Icon tabIndex={-1} icon={IconAdd} size={12} />
                </div>
                <div tabIndex={-1} className='text-truncate flex-grow-1'>{this.nls('addSummaryFields')}</div></div>
            </div>

            {/* Summary fields list */}
            {this.state.summaryFieldsList.length > 0 &&
              <div ref={this.summaryFieldsSidePopperTrigger} className={classNames('nearme-summary-fields-list-items', this.state.selectedLayerGeometry === 'esriGeometryPoint' ? 'pb-2' : '')}>
                <List
                  itemsJson={Array.from(this.state.summaryFieldsList || null)?.map((field, index) => ({
                    itemStateDetailContent: field,
                    itemKey: `${index}`
                  }))}
                  dndEnabled
                  onUpdateItem={(actionData, refComponent) => {
                    const { itemJsons } = refComponent.props
                    const [, parentItemJson] = itemJsons as [TreeItemType, TreeItemsType]
                    const newSortedSummaryFields = parentItemJson.map(item => {
                      return item.itemStateDetailContent
                    })
                    this.updateSortedSummaryFields(newSortedSummaryFields)
                  }}
                  overrideItemBlockInfo={({ itemBlockInfo }) => {
                    return {
                      name: TreeItemActionType.RenderOverrideItem,
                      children: [{
                        name: TreeItemActionType.RenderOverrideItemDroppableContainer,
                        children: [{
                          name: TreeItemActionType.RenderOverrideItemDraggableContainer,
                          children: [{
                            name: TreeItemActionType.RenderOverrideItemBody,
                            children: [{
                              name: TreeItemActionType.RenderOverrideItemDragHandle
                            }, {
                              name: TreeItemActionType.RenderOverrideItemMainLine
                            }]
                          }]
                        }]
                      }]
                    }
                  }}
                  renderOverrideItemMainLine={(actionData, refComponent) => {
                    const { itemJsons } = refComponent.props
                    const currentItemJson = itemJsons[0]
                    const listItemJsons = itemJsons[1] as any
                    return this.createFieldsOptionElement(currentItemJson.itemStateDetailContent, listItemJsons.indexOf(currentItemJson))
                  }}
                />
              </div>
            }

            {(this.state.selectedLayerGeometry === 'esriGeometryPolyline' || this.state.selectedLayerGeometry === 'esriGeometryPolygon') &&
              <SettingRow label={this.state.selectedLayerGeometry === 'esriGeometryPolyline'
                ? this.nls('sumOfIntersectedLength')
                : (this.state.selectedLayerGeometry === 'esriGeometryPolygon'
                    ? this.nls('sumOfIntersectedArea')
                    : '')}>

                <Tooltip role={'tooltip'} tabIndex={0}
                  aria-label={this.state.selectedLayerGeometry === 'esriGeometryPolyline'
                    ? this.nls('sumOfLengthTooltip')
                    : (this.state.selectedLayerGeometry === 'esriGeometryPolygon'
                        ? this.nls('sumOfAreaTooltip')
                        : '')}
                  title={this.state.selectedLayerGeometry === 'esriGeometryPolyline'
                    ? this.nls('sumOfLengthTooltip')
                    : (this.state.selectedLayerGeometry === 'esriGeometryPolygon'
                        ? this.nls('sumOfAreaTooltip')
                        : '')} showArrow placement='top'>

                  <div className='setting-text-level-2 ml-2 d-inline'>
                    <InfoOutlined />
                  </div>
                </Tooltip>
              </SettingRow>
            }

            {this.state.selectedLayerGeometry === 'esriGeometryPolyline' &&
              <div className={classNames('pb-2 d-flex align-items-center justify-content-between')}>
                <Label title={this.state.sumOfLengthLabel} className='pt-2 pl-1 text-truncate cursor-pointer'>
                  <Checkbox className={'mr-2 font-13'} checked={this.state.sumOfLength}
                    role={'checkbox'} aria-label={this.nls('sumOfIntersectedLength')}
                    onChange={(e) => { this.onSumOfLengthChange(e, CommonSummaryFieldValue.SumOfIntersectedLength) }}
                  />
                  {this.state.sumOfLengthLabel}
                </Label>
                {this.state.sumOfLength && (
                  <Button role={'button'} aria-label={this.nls('edit')} title={this.nls('edit')} icon type={'tertiary'} aria-haspopup={'dialog'}
                    size={'sm'} onClick={() => { this.onSumOfLengthEditClick(CommonSummaryFieldValue.SumOfIntersectedLength) }}>
                    <EditOutlined size={'s'} />
                  </Button>
                )}
              </div>
            }

            {this.state.selectedLayerGeometry === 'esriGeometryPolygon' &&
              <div className={classNames('pb-2 d-flex align-items-center justify-content-between')}>
                <Label title={this.state.sumOfAreaLabel} className='pt-2 pl-1 text-truncate cursor-pointer'>
                  <Checkbox className={'mr-2 font-13'} checked={this.state.sumOfArea}
                    role={'checkbox'} aria-label={this.nls('sumOfIntersectedArea')}
                    onChange={(e) => { this.onSumOfAreaChange(e, CommonSummaryFieldValue.SumOfIntersectedArea) }}
                  />
                  {this.state.sumOfAreaLabel}
                </Label>
                {this.state.sumOfArea && (
                  <Button role={'button'} aria-label={this.nls('edit')} title={this.nls('edit')} icon type={'tertiary'} aria-haspopup={'dialog'}
                    size={'sm'} onClick={() => { this.onSumOfAreaEditClick(CommonSummaryFieldValue.SumOfIntersectedArea) }}>
                    <EditOutlined size={'s'} />
                  </Button>
                )}
              </div>
            }

            {this.updateSummaryFieldListSettings?.length > 0 &&
              <React.Fragment>
                <SettingRow className={classNames('pt-3', this.state.summaryFieldsList.length > 0 || (this.state.sumOfArea || this.state.sumOfLength) ? 'pt-2 nearme-divider' : '')}
                 label={this.nls('themeSettingColorMode')} flow='wrap'>
                </SettingRow>
                <SettingRow className={'mt-0'} flow='wrap'>
                  <Label className='mt-1 colorModesWidth' centric>
                    <Radio role={'radio'} aria-label={this.nls('singleColor')}
                      className={'cursor-pointer'}
                      value={'singleColor'}
                      onChange={() => { this.handleColorTypeChange(ColorMode.SingleColor) }}
                      checked={this.state.singleColorMode} />
                    <div tabIndex={0} className='ml-1 text-break cursor-pointer' onClick={() => { this.handleColorTypeChange(ColorMode.SingleColor) }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          this.handleColorTypeChange(ColorMode.SingleColor)
                        }
                      }}>
                      {this.nls('singleColor')}
                    </div>
                  </Label>
                  {this.state.singleColorMode && (
                    <ThemeColorPicker specificTheme={getTheme2()} value={this.state.singleColorFields} onChange={(color) => { this.handleSingleColorChange(color) }} />
                  )}
                </SettingRow>
                <SettingRow className={'mt-0'} flow='wrap'>
                  <Label className='mt-1 mb-1 colorModesWidth' centric>
                    <Radio role={'radio'} aria-label={this.nls('byCategory')}
                      className={'cursor-pointer'}
                      value={'byCategory'}
                      onChange={() => { this.handleColorTypeChange(ColorMode.ByCategory) }}
                      checked={!this.state.singleColorMode} />
                    <div tabIndex={0} className='ml-1 text-break cursor-pointer' onClick={() => { this.handleColorTypeChange(ColorMode.ByCategory) }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          this.handleColorTypeChange(ColorMode.ByCategory)
                        }
                      }}>
                      {this.nls('byCategory')}
                    </div>
                  </Label>
                  {!this.state.singleColorMode && (
                    <Button ref={this.colorButtonRef} role={'button'} aria-label={this.nls('byCategory')} title={this.nls('byCategory')} icon type={'tertiary'}
                      size={'sm'} onClick={this.handleByCategorySettingColorChange.bind(this)}>
                      <SettingOutlined />
                    </Button>
                  )}
                </SettingRow>
              </React.Fragment>
            }

            {/* Sidepopper for adding and editing summary fields */}
            <SidePopper isOpen={this.state.isAddNewSummaryField && !urlUtils.getAppIdPageIdFromUrl().pageId}
              position='right'
              toggle={this.closeAddSummaryFieldPanel}
              trigger={this.summaryFieldsSidePopperTrigger?.current}
              backToFocusNode={this.state.popperFocusNode}>
              <div className='bg-light-300 border-color-gray-400' css={getSidePanelStyle(this.props.theme)}>
                <SidepopperBackArrow
                  theme={this.props.theme}
                  intl={this.props.intl}
                  title={this.state.summaryEditIndex !== null ? this.nls('editSummaryField') : this.nls('addSummaryFields')}
                  ref={this.backRef}
                  onBack={this.closeAddSummaryFieldPanel}>
                      <SummaryFieldPopper
                        intl={this.props.intl}
                        theme={this.props.theme}
                        widgetId={this.props.widgetId}
                        currentLayerDsId={this.props.editCurrentLayer}
                        fieldsEditIndex={this.state.summaryEditIndex}
                        editingField={this.state.summaryEditField}
                        expressionInfoUpdate={this.onExpressionInfoUpdate.bind(this)}
                      />
                </SidepopperBackArrow>
              </div>
            </SidePopper>

            {/* Sidepopper for editing summary fields color */}
            <SidePopper isOpen={this.state.showSummaryColorSettings && !urlUtils.getAppIdPageIdFromUrl().pageId} position='right' toggle={this.closeColorSettingsPanel} trigger={this.colorSidePopperTrigger?.current}>
              <div className='bg-light-300 border-color-gray-400' css={getSidePanelStyle(this.props.theme)}>
                <SidepopperBackArrow
                  theme={this.props.theme}
                  intl={this.props.intl}
                  title={this.nls('summaryFieldColor')}
                  ref={this.backRef}
                  onBack={this.closeColorSettingsPanel}>
                  <div className={'setting-container'}>
                    <ColorSettingPopper
                      intl={this.props.intl}
                      theme={this.props.theme}
                      summaryFieldsInfo={this.updateSummaryFieldListSettings}
                      updateFieldColorsValues={this.onUpdateFieldColorByCategory}
                    />
                  </div>
                </SidepopperBackArrow>
              </div>
            </SidePopper>

            {/* Dialog for editing default summary fields */}
            {this.state.editSummaryAreaLengthFieldPopupOpen &&
              <EditSummaryIntersectedFieldsPopper
                theme={this.props.theme}
                intl={this.props.intl}
                isOpen={this.state.editSummaryAreaLengthFieldPopupOpen}
                editSummaryFields={this.state.summaryEditField}
                sumOfIntersectedFieldPopupTitle={this.state.sumOfIntersectedFieldPopupTitle}
                onClose={this.onEditPopperClose}
                onOkClick={this.onOkButtonClick}>
              </EditSummaryIntersectedFieldsPopper>
            }
          </React.Fragment>
        }

        {/* highlight results on map settings */}
        {(this.state.proximityAnalysisType || this.state.summaryAnalysisType) &&
          <SettingRow label={this.nls('highlightResultsOnMapLabel')}>
            <Switch role={'switch'} aria-label={this.nls('highlightResultsOnMapLabel')} title={this.nls('highlightResultsOnMapLabel')}
              checked={this.state.highlightResultsOnMap} onChange={this.highlightResultsOnMapOnChange} />
          </SettingRow>
        }

        {/* expand on open settings */}
          <SettingRow label={this.nls('expandOnOpen')}>
            <Switch role={'switch'} aria-label={this.nls('expandOnOpen')} title={this.nls('expandOnOpen')}
              checked={this.state.expandOnOpen} onChange={this.expandListOnChange} />
          </SettingRow>

        {/*expand feature details settings */}
        {(this.state.proximityAnalysisType && this.state.expandOnOpen) &&
          <SettingRow flow='wrap'>
            <Label title={this.nls('expandFeatureDetails')} className='m-0 w-100' centric>
              <Checkbox className={'mr-2 font-13'} checked={this.state.expandFeatureDetails}
                role={'checkbox'} aria-label={this.nls('expandFeatureDetails')}
                onChange={(e) => { this.expandFeatureOnChange(e) }}
              />
              <div className='ml-1 w-100 text-break' onClick={(e: any) => {
                //if div is clicked then don't propagate its click event
                //in order to not change the state of checkbox on blank area click
                if (e.target.tagName.toLowerCase() !== 'span') {
                  e.preventDefault()
                }
              }}>
                <span className={'cursor-pointer'}>
                  {this.nls('expandFeatureDetails')}
                </span>
              </div>
              <Tooltip role={'tooltip'} tabIndex={0} aria-label={this.nls('expandListTooltip')}
                title={this.nls('expandListTooltip')} showArrow placement='top'>
                <div className='setting-text-level-2 d-inline' onClick={(e) => { e.preventDefault() }}>
                  <InfoOutlined />
                </div>
              </Tooltip>
            </Label>
          </SettingRow>
        }
      </SettingSection>
    </div>
  }
}
