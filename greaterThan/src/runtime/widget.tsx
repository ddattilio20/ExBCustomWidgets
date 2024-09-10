/** @jsx jsx */
import { type JimuMapView, JimuMapViewComponent, geometryUtils } from 'jimu-arcgis'
import {
  React, type AllWidgetProps, jsx, BaseWidget, type ImmutableObject, getAppStore, OrderRule, lodash,
  type DataRecord, DataSourceManager, type DataSource, WidgetState, type IMState, type UseDataSource,
  DataActionManager, Immutable, DataSourceTypes, ReactResizeDetector
} from 'jimu-core'
import { type IconComponentProps, Loading, LoadingType, WidgetPlaceholder, Alert, Label, utils } from 'jimu-ui'
import { type SearchSettings, type AnalysisSettings, type GeneralSettings, type IMConfig, type LayersInfo, type SumOfAreaLengthParam, AnalysisTypeName, type SummaryFieldsInfo } from '../config'
import defaultMessages from './translations/default'
import { getStyle } from './lib/style'
import LayerAccordion from './components/layer-accordion'
import AoiTool, { type AoiGeometries } from './components/aoi-tool'
import { getAllAvailableLayers, getDisplayField, getPortalUnit, getSelectedLayerInstance } from '../common/utils'
import { getALLFeatures } from '../common/query-feature-utils'
import FeatureSet from './components/features-set'
import { distanceUnitWithAbbr } from './constant'
import { getDistance, perUnitMeter } from '../common/closest-distance-utils'
import geometryEngine from 'esri/geometry/geometryEngine'
import SummaryFieldCard from './components/summary-field-card'
import GraphicsLayer from 'esri/layers/GraphicsLayer'
import type Geometry from 'esri/geometry/Geometry'
import { getHighLightSymbol } from '../common/highlight-symbol-utils'
import { type FormatNumberOptions } from 'react-intl'
import { CommonSummaryFieldValue, NumberFormatting } from '../setting/constants'

const widgetIcon = require('./assets/icons/nearme-icon.svg')
const closestIconComponent = require('jimu-icons/svg/outlined/gis/service-find-closest.svg')
const proximityIconComponent = require('jimu-icons/svg/outlined/gis/service-proximity.svg')
const summaryComponent = require('jimu-icons/svg/outlined/gis/service-summarize-within.svg')

interface ExtraProps {
  selectedIncidentLocation: DataRecord[]
}

interface State {
  jimuMapView: JimuMapView
  searchSettings: SearchSettings
  analysisSettings: ImmutableObject<AnalysisSettings>
  activeDataSource: string
  generalSettings: GeneralSettings
  aoiGeometries: AoiGeometries
  displayLayerAccordion: JSX.Element[]
  isClosestAddressShowing: boolean
  isMapAreaWarningMsgShowing: boolean
  listMaxHeight: string
  noResultsFoundMsg: string
  showNoResultsFoundMsg: boolean
  msgActionGeometry: __esri.Geometry
  showExportButton: boolean
  isLayerAvailable: boolean
  isAnalysisLayerConfigured: boolean
  widgetWidth: number
}

export default class Widget extends BaseWidget<AllWidgetProps<IMConfig> & ExtraProps, State> {
  //all required graphics layers for the widget
  public drawingLayer: __esri.GraphicsLayer
  public bufferLayer: __esri.GraphicsLayer
  public flashLayer: __esri.GraphicsLayer
  public highlightGraphicsLayers: __esri.GraphicsLayer []
  public featuresByDsId: any
  public closestFeaturesByIndexAndDsId: any
  public mapView: __esri.MapView | __esri.SceneView
  public portalUnit: string
  public activeCurrentDs: string
  public availableLayersIds: string[]
  public readonly divRef: React.RefObject<HTMLDivElement>

  static mapExtraStateProps = (state: IMState,
    props: AllWidgetProps<IMConfig>): ExtraProps => {
    return {
      selectedIncidentLocation: props?.mutableStateProps?.selectedIncidentLocation
    }
  }

  constructor (props) {
    super(props)
    this.divRef = React.createRef()
    this.featuresByDsId = {}
    this.closestFeaturesByIndexAndDsId = {}
    this.highlightGraphicsLayers = []
    this.state = {
      jimuMapView: null,
      searchSettings: null,
      activeDataSource: null,
      analysisSettings: null,
      generalSettings: this.props.config.generalSettings,
      aoiGeometries: null,
      displayLayerAccordion: [],
      isClosestAddressShowing: false,
      isMapAreaWarningMsgShowing: false,
      listMaxHeight: '',
      noResultsFoundMsg: this.props.config.generalSettings.noResultsFoundText !== '' ? this.props.config.generalSettings.noResultsFoundText : this.nls('noDataMessageDefaultText'),
      showNoResultsFoundMsg: false,
      msgActionGeometry: null,
      showExportButton: this.props.enableDataAction !== undefined ? this.props.enableDataAction : true,
      isLayerAvailable: true,
      isAnalysisLayerConfigured: true,
      widgetWidth: null
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

  /**
   * Check the current config property or runtime property changed in live view
   * @param prevProps previous property
   * @param prevState previous state
   */
  componentDidUpdate = (prevProps, prevState) => {
    const currentWidgetState = getAppStore()?.getState()?.widgetsRuntimeInfo[this.props.id]?.state
    if (currentWidgetState === WidgetState.Opened || !currentWidgetState) {
      //check for feature selected using message action
      // if featureRecord found and prev selected record is not matching with the current then only load the analysis info for selected feature location
      const featureRecordGeometry: any = this.props?.selectedIncidentLocation
      if (featureRecordGeometry && (!prevProps || !prevProps.mutableStatePropsVersion || !prevProps.mutableStatePropsVersion.selectedIncidentLocation ||
        prevProps?.mutableStatePropsVersion?.selectedIncidentLocation !== this.props.mutableStatePropsVersion?.selectedIncidentLocation)) {
        this.recordSelectedFromAction(featureRecordGeometry)
      }
    }

    //check if active datasource is changed
    if (prevState.state?.activeDataSource !== this.state.activeDataSource) {
      this.setState({
        activeDataSource: this.state.activeDataSource
      })
    }

    //check if the search settings are changed
    if (this.state.activeDataSource) {
      const currentActiveDsConfig = this.props.config.configInfo?.[this.state.activeDataSource]
      const prevActiveDsConfig = prevProps.config.configInfo?.[this.state.activeDataSource]
      if (!lodash.isDeepEqual(prevActiveDsConfig?.searchSettings, currentActiveDsConfig?.searchSettings)) {
        if (this.didSearchSettingsChanged(prevActiveDsConfig?.searchSettings, currentActiveDsConfig?.searchSettings)) {
          //clear incident/buffer geometries if any search settings changed except heading label
          this.setState({
            aoiGeometries: null,
            searchSettings: currentActiveDsConfig?.searchSettings
          }, () => {
            this.isValidLayerConfigured()
            if (!this.state.searchSettings?.defineSearchArea && this.state.jimuMapView) {
              this.onClear()
              this.queryLayers()
              this.resizeLayerListHeight()
            } else {
              this.setState({
                showNoResultsFoundMsg: false,
                displayLayerAccordion: []
              })
            }
          })
        } else {
          //only heading label is changed
          this.setState({
            searchSettings: currentActiveDsConfig?.searchSettings
          }, () => {
            this.resizeLayerListHeight()
          })
        }
      }

      //check if analysis settings is changed
      if (this.didAnalysisSettingsChanged(prevActiveDsConfig?.analysisSettings?.layersInfo,
        currentActiveDsConfig?.analysisSettings?.layersInfo) ||
        prevActiveDsConfig?.analysisSettings?.displayAnalysisIcon !== currentActiveDsConfig?.analysisSettings?.displayAnalysisIcon ||
        prevActiveDsConfig?.analysisSettings?.displayFeatureCount !== currentActiveDsConfig?.analysisSettings?.displayFeatureCount) {
        this.setState({
          analysisSettings: currentActiveDsConfig?.analysisSettings
        }, () => {
          this.isValidLayerConfigured()
          if (this.isLayerQueryNeeded(prevActiveDsConfig?.analysisSettings?.layersInfo,
            currentActiveDsConfig?.analysisSettings?.layersInfo)) {
            this.queryLayers()
          } else {
            this.displayAnalysisLayerInfo()
          }
        })
      }
    }

    //check if general settings is changed
    if (!lodash.isDeepEqual(prevProps.config.generalSettings, this.props.config.generalSettings)) {
      this.setState({
        generalSettings: this.props.config.generalSettings
      })
    }

    //check if enable data section props is changed
    if (prevProps.enableDataAction !== this.props.enableDataAction) {
      this.setState({
        showExportButton: this.props.enableDataAction
      }, () => {
        this.displayAnalysisLayerInfo()
      })
    }
  }

  /**
   * On widget delete clear all the graphics from the map
   */
  componentWillUnmount = () => {
    this.onClear()
  }

  /**
   * Once received the features from RecordSelectionChange or after searching in the search tool of the map
   * set it in the state and the analysis will be performed using it
   * @param featureRecordGeometry
   */
  recordSelectedFromAction = (featureRecordGeometry: any) => {
    //whenever record selection is occurred perform action only in defineSearchArea with location case
    //in case of show all features and show features in current map area skip the selection
    if (this.state.searchSettings.defineSearchArea && !this.state.searchSettings.searchByCurrentMapExtent) {
      this.setState({
        msgActionGeometry: featureRecordGeometry
      })
    }
  }

  /**
   * check valid analysis layers are configured or not based on search settings
   */
  isValidLayerConfigured = () => {
    let validLayers: Immutable.ImmutableArray<LayersInfo>
    if (((!this.state.searchSettings?.defineSearchArea || (this.state.searchSettings?.defineSearchArea && this.state.searchSettings.searchByCurrentMapExtent)) &&
      this.state.analysisSettings?.layersInfo?.length > 0)) {
      validLayers = this.state.analysisSettings?.layersInfo.filter((layerInfo: any) => {
        const analysisType = layerInfo.analysisInfo.analysisType
        return analysisType === AnalysisTypeName.Proximity || analysisType === AnalysisTypeName.Summary
      })
    }
    if (validLayers) {
      ///define search is off or search by map area is on and proximity and summary layers also configured
      this.setState({
        isAnalysisLayerConfigured: validLayers?.length > 0
      })
    } else {
      this.setState({
        isAnalysisLayerConfigured: this.state.analysisSettings?.layersInfo?.length > 0
      }, () => {
        //clear all highlights, geometries.... no analysis layer is configured
        if (!this.state.isAnalysisLayerConfigured) {
          this.onClear()
        }
      })
    }
  }

  /**
   * check analysis Settings Changed or not
   * @param prevSettings old props
   * @param newSettings new props
   * @returns  boolean analysis Settings Change true or false
   */
  didAnalysisSettingsChanged = (prevSettings, newSettings): boolean => {
    let analysisSettingsChange = false
    //eslint-disable-next-line
    newSettings?.some((newSettings, index: number) => {
      if (!prevSettings || newSettings.useDataSource.dataSourceId !== prevSettings[index]?.useDataSource.dataSourceId ||
        newSettings.label !== prevSettings[index]?.label ||
        !lodash.isDeepEqual(newSettings.analysisInfo, prevSettings[index]?.analysisInfo)) {
        analysisSettingsChange = true
        return true
      }
    })
    return newSettings?.length !== prevSettings?.length ? true : analysisSettingsChange
  }

  /**
   * check search Settings Changed or not
   * @param prevSearchSettings old search settings
   * @param newSearchSettings new searchSettings props
   * @returns  boolean search Settings Change true or false
  */
  didSearchSettingsChanged = (prevSearchSettings: SearchSettings, newSearchSettings: SearchSettings): boolean => {
    let searchSettingsChange = false
    if (!prevSearchSettings || !newSearchSettings || newSearchSettings.defineSearchArea !== prevSearchSettings.defineSearchArea ||
      newSearchSettings.bufferDistance !== prevSearchSettings.bufferDistance ||
      newSearchSettings.distanceUnits !== prevSearchSettings.distanceUnits ||
      newSearchSettings.searchByCurrentMapExtent !== prevSearchSettings.searchByCurrentMapExtent) {
      searchSettingsChange = true
      return true
    }
    return searchSettingsChange
  }

  /**
  * check layer query is needed or not based on analysis settings parameter change(dataSourceId,type,analysis settings length)
  * @param prevSettings old props
  * @param newSettings new props
  * @returns  boolean analysis Settings (dataSourceId,type,analysis settings length) Change true or false
  */
  isLayerQueryNeeded = (prevSettings, newSettings): boolean => {
    let analysisSettingsChange = false
    //eslint-disable-next-line
    newSettings?.some((newSettings, index: number) => {
      if (!prevSettings || newSettings.useDataSource.dataSourceId !== prevSettings[index]?.useDataSource.dataSourceId) {
        analysisSettingsChange = true
        return true
      }
    })
    return newSettings?.length !== prevSettings?.length ? true : analysisSettingsChange
  }

  /**
   * Wait for all the jimu layers and dataSource loaded
   * @param jmv JimuMapView
   * @returns data source
   */
  waitForChildDataSourcesReady = async (jmv: JimuMapView): Promise<DataSource> => {
    await jmv?.whenAllJimuLayerViewLoaded()
    const ds = DataSourceManager.getInstance().getDataSource(jmv?.dataSourceId)
    if (ds?.isDataSourceSet && !ds.areChildDataSourcesCreated()) {
      return ds.childDataSourcesReady().then(() => ds).catch(err => ds)
    }
    return Promise.resolve(ds)
  }

  /**
   * handles map view change event
   * @param jimuMapView active map view
   */
  onActiveViewChange = async (jimuMapView: JimuMapView) => {
    this.availableLayersIds = []
    if (!(jimuMapView && jimuMapView.view)) {
      this.setState({
        isLayerAvailable: false
      })
      return
    }
    this.waitForChildDataSourcesReady(jimuMapView).finally(() => {
      getAllAvailableLayers(jimuMapView.id).then((allDsLayers) => {
        if (allDsLayers.length > 0) {
          allDsLayers.forEach((layer) => {
            this.availableLayersIds.push(layer.id)
          })
          this.setState({
            isLayerAvailable: true
          })
        } else {
          this.setState({
            isLayerAvailable: false
          })
        }
        this.mapView = jimuMapView.view
        if (this.state.jimuMapView) {
          this.onClear()
          this.setState({
            analysisSettings: null
          })
        }
        if (jimuMapView) {
          //Check for the search tool from the map, and handle the select-result event
          //so that if anything is searched in the tool we can use that location as incident geometry
          jimuMapView.jimuMapTools?.forEach((tools) => {
            if (tools?.instance && tools.name === 'Search') {
              tools.instance.on('select-result', (selection) => {
                if (selection?.result?.feature?.geometry) {
                  this.recordSelectedFromAction(selection.result.feature.geometry)
                }
              })
            }
          })
          this.setState({
            jimuMapView: jimuMapView
          }, () => {
            this.createGraphicsLayers()
            if (jimuMapView.dataSourceId === null) {
              this.setState({
                activeDataSource: null
              })
            } else if (this.state.jimuMapView.dataSourceId || this.props.config.configInfo[this.state.jimuMapView.dataSourceId]) {
              this.setState({
                activeDataSource: this.state.jimuMapView.dataSourceId
              }, () => {
                this.setConfigForDataSources()
              })
            } else if (this.state.jimuMapView.dataSourceId &&
              this.props.config.configInfo[this.state.jimuMapView.dataSourceId]) {
              let configDs = this.state.jimuMapView.dataSourceId
              if (this.state.jimuMapView && this.state.jimuMapView.dataSourceId) {
                // eslint-disable-next-line no-prototype-builtins
                if (this.props.config.configInfo.hasOwnProperty(this.state.jimuMapView.dataSourceId)) {
                  configDs = this.state.jimuMapView.dataSourceId
                } else {
                  configDs = null
                }
                this.setState({
                  activeDataSource: configDs
                }, () => {
                  this.setConfigForDataSources()
                })
              }
            }
          })
        }
      })
    })
  }

  /**
   * Set the configured settings for the respective datasource
   */
  setConfigForDataSources = () => {
    if (this.state.jimuMapView.dataSourceId !== '') {
      const activeDsConfig = this.props.config.configInfo[this.state.jimuMapView.dataSourceId]
      this.setState({
        searchSettings: activeDsConfig?.searchSettings,
        analysisSettings: activeDsConfig?.analysisSettings
      }, () => {
        if (this.state.searchSettings?.distanceUnits === '') {
          this.portalUnit = getPortalUnit()
        }
        this.isValidLayerConfigured()
        if (!this.state.searchSettings?.defineSearchArea && this.state.jimuMapView && this.state.analysisSettings) {
          this.queryLayers()
          this.resizeLayerListHeight()
        }
      })
    }
  }

  /**
   * handles aoiComplete event of aoi-tool component
   * @param aoiGeometries current aoi(buffer/incident) geometries
   */
  onAoiComplete = (aoiGeometries: AoiGeometries) => {
    this.featuresByDsId = {}
    this.closestFeaturesByIndexAndDsId = {}
    this.setState({
      aoiGeometries: aoiGeometries
    }, () => {
      this.queryLayers()
    })
  }

  /**
   * handles clear event of aoi-tool component, clears aoiGeometries state
   */
  onClear = () => {
    this.destroyHighlightGraphicsLayer()
    this.flashLayer?.removeAll()
    this.featuresByDsId = {}
    this.closestFeaturesByIndexAndDsId = {}
    this.setState({
      aoiGeometries: null,
      displayLayerAccordion: [],
      isClosestAddressShowing: false
    })
  }

  /**
   * get analysis type icon for layer
   * @param analysisType analysis type
   * @returns analysis type icon
   */
  getAnalysisTypeIcon = (analysisType: string): IconComponentProps => {
    let analysisTypeIcon: IconComponentProps
    if (analysisType === AnalysisTypeName.Closest) {
      analysisTypeIcon = closestIconComponent
    }
    if (analysisType === AnalysisTypeName.Proximity) {
      analysisTypeIcon = proximityIconComponent
    }
    if (analysisType === AnalysisTypeName.Summary) {
      analysisTypeIcon = summaryComponent
    }
    return analysisTypeIcon
  }

  /**
   * get the features distance using distance units
   * @param selectedFeatures selected features on the map
   * @returns selected features
   */
  getFeaturesDistance = (selectedFeatures: DataRecord[]) => {
    //Use portal unit in case of defineSearchArea is off or searchByCurrentMapExtent is on
    const distanceUnit = (this.state.searchSettings.defineSearchArea && this.state.searchSettings.searchByCurrentMapExtent) || !this.state.searchSettings.defineSearchArea
      ? this.portalUnit
      : this.state.aoiGeometries.distanceUnit || this.state.searchSettings.distanceUnits
    const incidentGeometry = this.state.aoiGeometries.incidentGeometry4326 || this.state.aoiGeometries.incidentGeometry
    const featureRecordsWithDistance = selectedFeatures
    for (let i = 0; i < featureRecordsWithDistance.length; i++) {
      const featureRecord = featureRecordsWithDistance as any
      if (incidentGeometry && featureRecord[i].feature.geometry) {
        featureRecord[i].feature.distance = getDistance(incidentGeometry,
          featureRecord[i].feature.geometry, distanceUnit as __esri.LinearUnits)
      } else {
        featureRecord[i].feature.distance = 0
      }
    }
    return featureRecordsWithDistance
  }

  /**
   * Get the sorted features
   * @param selectedFeatures selected features on the map
   * @param layerInfo analysis layers info
   * @param isShowAllFeatures show all features parameter
   * @param objectIdField field of the layer
   * @returns selected features and group features
   */
  getSortedFeatures = (selectedFeatures: DataRecord[], layerInfo: LayersInfo, isSortByObjId: boolean, objectIdField?: string) => {
    let sortingField = 'distance'
    let groupEnabled = false
    let sortByFieldEnabled = false
    let groupField = ''
    let groupsArr = []
    const layerAnalysisInfo = layerInfo.analysisInfo as any
    if (layerAnalysisInfo.analysisType === AnalysisTypeName.Proximity) {
      if (!layerAnalysisInfo.sortFeaturesByDistance && layerAnalysisInfo.sortFeatures?.sortFeaturesByField) {
        sortingField = layerAnalysisInfo.sortFeatures.sortFeaturesByField
        sortByFieldEnabled = true
      }
      if (layerAnalysisInfo.groupFeaturesEnabled && layerAnalysisInfo.groupFeatures.groupFeaturesByField !== '') {
        groupEnabled = true
        groupField = layerAnalysisInfo.groupFeatures.groupFeaturesByField
      }
    }
    //For show all features and search by map area if sort by distance is enabled then sort proximity features by objectId
    if (layerAnalysisInfo.analysisType === AnalysisTypeName.Proximity && isSortByObjId && !sortByFieldEnabled) {
      sortingField = objectIdField
    }
    if (groupEnabled) {
      for (let i = 0; i < selectedFeatures.length; i++) {
        const featureRecord = selectedFeatures[i] as any
        const featureValue = featureRecord.feature.attributes[groupField]
        const groupLabel = featureRecord.getFormattedFieldValue(groupField, this.props.intl)
        const gId = 'group_' + layerInfo.useDataSource.dataSourceId + '_' + groupField + '_' + featureValue
        let addGroup = true
        let group
        if (groupsArr.length > 0) {
          for (let j = 0; j < groupsArr.length; j++) {
            const groupInfo = groupsArr[j]
            if (gId === groupInfo.id) {
              if (featureValue === groupInfo.value) {
                addGroup = false
                group = groupInfo
                break
              }
            }
          }
        }
        if (addGroup) {
          groupsArr.push({
            id: gId,
            value: featureValue,
            count: 1,
            label: groupLabel
          })
        } else {
          groupsArr.forEach(g => {
            if (g.id === (gId)) {
              group = g
            }
          })
          group.count += 1
        }
      }
    }

    if (groupEnabled && groupsArr.length > 0) {
      let groupSortingField = ''
      if (layerAnalysisInfo.sortGroupsByCount) {
        groupSortingField = 'count'
      } else {
        groupSortingField = 'value'
      }
      const groups = this.divideGroupsByEmptyValue(groupsArr, groupSortingField)
      groupsArr = groups.groupsWithNonEmptyValue.sort(this.sortGroups(groupSortingField, layerAnalysisInfo.groupFeatures.groupFeaturesOrder))
      const sortedEmptyValueGroups = groups.groupsWithEmptyValue.sort(this.sortGroups(groupSortingField, layerAnalysisInfo.groupFeatures.groupFeaturesOrder))
      //show group with no value always at bottom
      if (groupSortingField && layerAnalysisInfo.groupFeatures.groupFeaturesOrder === OrderRule.Desc) {
        groupsArr = sortedEmptyValueGroups.concat(groupsArr)
      } else {
        groupsArr = groupsArr.concat(sortedEmptyValueGroups)
      }
    }

    if (layerAnalysisInfo.analysisType === AnalysisTypeName.Proximity) {
      const records = this.sortRecords(selectedFeatures, sortingField)
      selectedFeatures = records.notEmptyRecordsArr.sort(this.sortFeatureList(sortingField, layerAnalysisInfo.analysisType, objectIdField))
      const featuresWithNullValue = records.emptyRecordArr.sort(this.sortFeatureList(sortingField, layerAnalysisInfo.analysisType, objectIdField))
      if (sortByFieldEnabled && layerAnalysisInfo?.sortFeatures?.sortFeaturesOrder === OrderRule.Desc) {
        selectedFeatures = featuresWithNullValue.concat(selectedFeatures)
      } else {
        selectedFeatures = selectedFeatures.concat(featuresWithNullValue)
      }
    } else {
      //for closet type
      selectedFeatures = selectedFeatures.sort(this.sortFeatureList(sortingField, layerAnalysisInfo.analysisType))
    }

    if (groupEnabled && groupsArr.length > 0) {
      groupsArr.forEach(group => {
        selectedFeatures.forEach(record => {
          const selectedRecord = record as any
          if (group.value === selectedRecord.feature.attributes[groupField]) {
            if (!group.features) {
              group.features = []
            }
            group.features.push(record)
          }
        })
      })
    }
    return {
      features: selectedFeatures,
      featuresGroup: groupsArr
    }
  }

  /**
   * Sort records according to sorting field
   * @param features features
   * @param sortingField configure field for sorting
   * @returns records array
   */
  sortRecords = (features: DataRecord[], sortingField: string) => {
    const emptyRecordArr: DataRecord[] = []
    const notEmptyRecordsArr: DataRecord[] = []
    features.forEach((record: DataRecord, i) => {
      const featureRecord = record as any
      const sortFieldValue = sortingField === 'distance' ? featureRecord.feature[sortingField] : featureRecord.feature.attributes[sortingField]
      if (typeof (sortFieldValue) === 'undefined' || sortFieldValue === null || sortFieldValue === '') {
        emptyRecordArr.push(record)
      } else {
        notEmptyRecordsArr.push(record)
      }
    })
    return {
      emptyRecordArr: emptyRecordArr,
      notEmptyRecordsArr: notEmptyRecordsArr
    }
  }

  /**
   * Divide Groups By EmptyValue and NonEmptyValue to show EmptyValue always at bottom
   * @param groups groups
   * @param groupSortingField configure field for group sorting
   * @returns records array
   */
  divideGroupsByEmptyValue = (groups: any[], groupSortingField: string) => {
    const groupsWithEmptyValue = []
    const groupsWithNonEmptyValue = []
    groups.forEach((group) => {
      const sortFieldValue = group[groupSortingField]
      if (typeof (sortFieldValue) === 'undefined' || sortFieldValue === null || sortFieldValue === '') {
        groupsWithEmptyValue.push(group)
      } else {
        groupsWithNonEmptyValue.push(group)
      }
    })
    return {
      groupsWithEmptyValue: groupsWithEmptyValue,
      groupsWithNonEmptyValue: groupsWithNonEmptyValue
    }
  }

  /**
   * Sort groups according to the group sorting field
   * @param groupSortingField configured group sorting field
   * @returns sorting field object
   */
  sortGroups = (groupSortingField: string, groupSortFieldOrder: OrderRule) => {
    return (a: any, b: any) => {
      //proximity grouping enabled and groups are sort by count
      //sort same feature count group with group value and group field sort order
      if (a[groupSortingField] === b[groupSortingField] || (a[groupSortingField] === null && b[groupSortingField] === null)) {
        if (a.value < b.value) {
          return groupSortFieldOrder === OrderRule.Desc ? -1 : 1
        }
        if (a.value > b.value) {
          return groupSortFieldOrder === OrderRule.Desc ? 1 : -1
        }
      }
      if (a[groupSortingField] < b[groupSortingField]) {
        return -1
      }
      if (a[groupSortingField] > b[groupSortingField]) {
        return 1
      }
      return 0
    }
  }

  /**
   * Sorted features list
   * @param sortingField configured sorting field
   * @param analysisType configured analysis type
   * @param objectIdField field of the layer
   * @returns Object of data records
   */
  sortFeatureList = (sortingField: string, analysisType: string, objectIdField?: string) => {
    return (aRecord: DataRecord, bRecord: DataRecord) => {
      const aFeatureRecord = aRecord as any
      let a = aFeatureRecord.feature
      const bFeatureRecord = bRecord as any
      let b = bFeatureRecord.feature
      const _a = a
      const _b = b
      if (sortingField !== 'distance') {
        a = a.attributes
        b = b.attributes
      }

      if (analysisType === AnalysisTypeName.Proximity) {
        if (a[sortingField] === b[sortingField] || (a[sortingField] === null && b[sortingField] === null)) {
          if (sortingField !== 'distance') {
            if (_a.distance !== _b.distance) {
              if (_a.distance < _b.distance) {
                return -1
              }
              if (_a.distance > _b.distance) {
                return 1
              }
            } else {
              if (a[objectIdField] < b[objectIdField]) {
                return -1
              }
              if (a[objectIdField] > b[objectIdField]) {
                return 1
              }
            }
          } else {
            if (a.attributes[objectIdField] < b.attributes[objectIdField]) {
              return -1
            }
            if (a.attributes[objectIdField] > b.attributes[objectIdField]) {
              return 1
            }
          }
        }
      }

      if (a[sortingField] < b[sortingField]) {
        return -1
      }
      if (a[sortingField] > b[sortingField]) {
        return 1
      }
    }
  }

  /**
   * Get the selected units abbreviation
   * @param selectedUnit selected unit
   * @returns selected unit with abbreviation
   */
  getSelectedUnitsAbbr = (selectedUnit: __esri.LinearUnits): string => {
    const distanceUnit = distanceUnitWithAbbr.find(unit => unit.value === selectedUnit)
    const selectedUnitAbbreviation = this.nls(distanceUnit.abbreviation)
    return selectedUnitAbbreviation
  }

  /**
   * Get the closest max distance buffer geometry
   * @param closestMaxDistance configured closest buffer max distance
   * @param unit unit of the distance
   * @returns buffer geometry
   */
  getClosestMaxDistanceBuffer = async (closestMaxDistance: number, unit: string): Promise<Geometry> => {
    const incidentGeometry = this.state.aoiGeometries.incidentGeometry4326 || this.state.aoiGeometries.incidentGeometry
    const bufferGeometry = await geometryUtils.createBuffer(incidentGeometry, [closestMaxDistance], unit)
    //as we will always deal with only one geometry get first geometry only
    const firstGeom = Array.isArray(bufferGeometry) ? bufferGeometry[0] : bufferGeometry
    return firstGeom
  }

  /**
   * Check if to display approximate distance UI
   * @param layerInfo analysis layers info
   * @returns whether to approximate distance UI
   */
  displayApproximateDistanceUI = (layerInfo: LayersInfo): boolean => {
    let showApproximateDistanceUI: boolean = false
    const layerAnalysisInfo: any = layerInfo.analysisInfo
    const analysisType = layerInfo.analysisInfo.analysisType
    //search by distance settings is enabled show approximate distance for closet and for proximity if expand list and expand feature details are on
    //for search by map area and show all features don't show approximate distance
    if (this.state.searchSettings.defineSearchArea && !this.state.searchSettings.searchByCurrentMapExtent) {
      if ((analysisType === AnalysisTypeName.Closest) || (analysisType === AnalysisTypeName.Proximity && layerAnalysisInfo.expandOnOpen &&
        layerAnalysisInfo.expandFeatureDetails)) {
        showApproximateDistanceUI = true
      }
    }
    return showApproximateDistanceUI
  }

  /**
   * Create each graphics layers to show on the map
   */
  createGraphicsLayers = () => {
    if (this.bufferLayer) {
      this.bufferLayer.destroy()
    }
    if (this.drawingLayer) {
      this.drawingLayer.destroy()
    }
    if (this.flashLayer) {
      this.flashLayer.destroy()
    }
    this.bufferLayer = new GraphicsLayer({ listMode: 'hide' })
    this.drawingLayer = new GraphicsLayer({ listMode: 'hide' })
    this.flashLayer = new GraphicsLayer({ listMode: 'hide', effect: 'bloom(0.8, 1px, 0)' })
    this.state.jimuMapView?.view?.map?.addMany([this.bufferLayer, this.drawingLayer, this.flashLayer])
  }

  /**
   * Create the feature set list
   * @param featureList features list
   * @param layerInfo Analysis Layers info
   * @param objIdField ObjectId field
   * @param distanceUnit distance unit
   * @returns Object of feature set, features count, layers info and records
   */
  createFeatureSet = (featureList: DataRecord[], layerInfo: LayersInfo, objIdField: string, distanceUnit: __esri.LinearUnits) => {
    const jsxElements: JSX.Element[] = []
    let features: DataRecord[] = []
    const layerAnalysisInfo = layerInfo.analysisInfo as any
    let featuresAndGroup
    let popupTitleField: string = ''
    if (layerAnalysisInfo.analysisType === AnalysisTypeName.Proximity && layerAnalysisInfo.displayField !== '') {
      popupTitleField = layerAnalysisInfo.displayField
    } else {
      const dsId: string = layerInfo.useDataSource.dataSourceId
      const ds = getSelectedLayerInstance(dsId) as any
      const layerDefinition = ds?.layerDefinition
      //Get the default selected display field for proximity
      popupTitleField = getDisplayField(layerDefinition)
    }
    //check config parameters to decide feature details/groups should be expanded or collapse
    const expandFeaturesOrGroups = layerInfo.analysisInfo.analysisType === AnalysisTypeName.Proximity
      ? (layerAnalysisInfo.expandOnOpen && layerAnalysisInfo.expandFeatureDetails)
      : true
    features = featureList
    //show feature distance only in case of define search area with distance
    if (this.state.searchSettings.defineSearchArea && !this.state.searchSettings.searchByCurrentMapExtent) {
      features = this.getFeaturesDistance(features)
    }
    if (this.state.searchSettings.defineSearchArea && !this.state.searchSettings.searchByCurrentMapExtent) {
      //search by distance - 1.sort feature by distance is selected then sort features by distance
      //2.sort feature by field is selected then sort features by field value
      featuresAndGroup = this.getSortedFeatures(features, layerInfo, false, objIdField)
      features = featuresAndGroup.features
    } else {
      //show all features and search by map area - 1.sort feature by distance is selected then sort features by objectId
      //2.sort feature by field is selected then sort features by field value
      featuresAndGroup = this.getSortedFeatures(features, layerInfo, true, objIdField)
      features = featuresAndGroup.features
    }
    if (layerAnalysisInfo.analysisType === AnalysisTypeName.Closest) {
      let closestFeatureMaxDistance = layerAnalysisInfo.closestFeatureMaxDistance
      const currentBufferDistance = this.state.aoiGeometries?.bufferDistance || this.state.searchSettings.bufferDistance
      const closestBufferDistanceUnit: any = layerAnalysisInfo.distanceUnit || 'miles'
      //if closest and actual buffer unit is diff, then convert closet distance in actual buffer unit
      if (distanceUnit !== closestBufferDistanceUnit) {
        closestFeatureMaxDistance = (closestFeatureMaxDistance / perUnitMeter(closestBufferDistanceUnit)) * perUnitMeter(distanceUnit)
      }
      //filter out features which are outside the the closest max buffer
      if (currentBufferDistance > closestFeatureMaxDistance) {
        features = features.filter((eachFeature: any) => {
          return eachFeature.feature.distance <= closestFeatureMaxDistance
        })
      }
      //use only one record for closest analysis
      if (features.length > 1) {
        features = features.splice(0, 1)
      }
    }
    if (layerAnalysisInfo.analysisType === AnalysisTypeName.Proximity) {
      if (!layerAnalysisInfo.sortFeaturesByDistance && layerAnalysisInfo.sortFeatures?.sortFeaturesByField &&
        layerAnalysisInfo.sortFeatures.sortFeaturesOrder === OrderRule.Desc) {
        features = features.reverse()
      }
      if (layerAnalysisInfo.groupFeaturesEnabled && (layerAnalysisInfo.groupFeatures.groupFeaturesOrder === OrderRule.Desc ||
        layerAnalysisInfo.sortGroupsByCount)) {
        featuresAndGroup.featuresGroup = featuresAndGroup.featuresGroup.reverse()
      }
    }
    if (layerAnalysisInfo.analysisType === AnalysisTypeName.Proximity && featuresAndGroup?.featuresGroup?.length > 0) {
      featuresAndGroup.featuresGroup.forEach((group, groupIndex: number) => {
        //sort features inside group based on sort field order
        if (!layerAnalysisInfo.sortFeaturesByDistance && layerAnalysisInfo.sortFeatures?.sortFeaturesByField &&
          layerAnalysisInfo.sortFeatures.sortFeaturesOrder === OrderRule.Desc) {
          group.features = group.features.reverse()
        }
        const featureItems: JSX.Element[] = []
        group.features.forEach((feature, featureIndex: number) => {
          featureItems.push(
            <FeatureSet
              key={featureIndex}
              intl={this.props.intl}
              theme={this.props.theme}
              config={this.props.config}
              jimuMapView={this.state.jimuMapView}
              popupTitleField = {popupTitleField}
              selectedRecord={feature}
              distanceUnit={this.state.searchSettings.defineSearchArea ? this.getSelectedUnitsAbbr(distanceUnit) : null}
              selectedFeatureLength={features.length}
              isExpanded={expandFeaturesOrGroups}
              approximateDistanceUI={this.displayApproximateDistanceUI(layerInfo)}
              isGroup={true}
              flashOnOpen= {true}
              graphicLayer={this.flashLayer}></FeatureSet>)
        })
        jsxElements.push(<LayerAccordion
          theme={this.props.theme}
          key={groupIndex}
          index={groupIndex}
          intl={this.props.intl}
          label={group.label}
          analysisIcon={null}
          featureCount={this.state.analysisSettings?.displayFeatureCount ? group.count : null}
          isExpanded={expandFeaturesOrGroups}
          dsId={layerInfo.useDataSource.dataSourceId}
          analysisType={layerAnalysisInfo.analysisType}
          onDownload={this.downloadIndividualCsv}
          isListView={false}>
          {featureItems}
        </LayerAccordion>)
      })
    } else {
      features.forEach((feature, featureIndex: number) => {
        jsxElements.push(
          <FeatureSet
            intl={this.props.intl}
            key={featureIndex}
            theme={this.props.theme}
            config={this.props.config}
            popupTitleField = {popupTitleField}
            jimuMapView={this.state.jimuMapView}
            selectedRecord={feature}
            distanceUnit={this.state.searchSettings.defineSearchArea ? this.getSelectedUnitsAbbr(distanceUnit) : null}
            selectedFeatureLength={features.length}
            isExpanded={expandFeaturesOrGroups}
            approximateDistanceUI={this.displayApproximateDistanceUI(layerInfo)}
            isGroup={false}
            flashOnOpen={true}
            graphicLayer={this.flashLayer}></FeatureSet>)
      })
    }
    return ({
      items: jsxElements,
      count: features.length,
      layerInfo: layerInfo,
      records: features
    })
  }

  /**
   * Get the feature record list
   * @param useDataSource configured use datasource
   * @returns records promise
   */
  getRecords = async (useDataSource: ImmutableObject<UseDataSource>) => {
    const dsId = useDataSource.dataSourceId
    const ds = getSelectedLayerInstance(useDataSource.dataSourceId) as any
    if (!ds) {
      return Promise.resolve()
    }
    const promise = new Promise((resolve) => {
      let bufferGeometry = null
      //in case of show all features return geometry will be false, we will get geometry only when search area is defined
      let returnGeometry: boolean = false
      if (this.state.searchSettings.defineSearchArea) {
        //set return geometry to true only in case of search by distance
        //as we need geometry to show closest distance when search area is defined
        if (!this.state.searchSettings.searchByCurrentMapExtent) {
          returnGeometry = true
        }
        //set buffer geometry
        if (this.state.aoiGeometries?.bufferGeometry) {
          bufferGeometry = this.state.aoiGeometries.bufferGeometry
        } else {
          bufferGeometry = this.state.aoiGeometries.incidentGeometry
        }
      }
      getALLFeatures(ds, bufferGeometry, returnGeometry, this.state.jimuMapView.view.spatialReference).then((recordsList: DataRecord[]) => {
        this.featuresByDsId[dsId] = recordsList
        resolve(recordsList)
      })
    })
    return promise
  }

  /**
   * perform the analysis on the features
   * @param layerInfo configured layers info
   * @returns promise of the feature set
   */
  performAnalysis = async (layerInfo) => {
    const promise = new Promise((resolve, reject) => {
      const dsId: string = layerInfo.useDataSource.dataSourceId
      const ds = getSelectedLayerInstance(dsId) as any
      const objIdField = ds?.layerDefinition.objectIdField
      let bufferGeometry = null
      if (this.state.searchSettings.defineSearchArea) {
        //set buffer geometry
        if (this.state.aoiGeometries?.bufferGeometry) {
          bufferGeometry = this.state.aoiGeometries.bufferGeometry
        } else {
          bufferGeometry = this.state.aoiGeometries.incidentGeometry
        }
      }
      //in case of closest max buffer return geometry will be true
      const returnGeometry = true
      // eslint-disable-next-line no-prototype-builtins
      if (this.featuresByDsId.hasOwnProperty(dsId)) {
        //clone the featuresByDsId array
        const featureList = [...this.featuresByDsId[dsId]]
        let currentBufferDistance: number
        let featureSet = {
          items: [],
          count: featureList.length,
          layerInfo: layerInfo,
          records: featureList
        }

        //Use portal unit in case of defineSearchArea is off or searchByCurrentMapExtent is on
        const distanceUnit = (this.state.searchSettings.defineSearchArea && this.state.searchSettings.searchByCurrentMapExtent) || !this.state.searchSettings.defineSearchArea
          ? this.portalUnit
          : this.state.aoiGeometries.distanceUnit || this.state.searchSettings.distanceUnits || this.portalUnit

        if (this.state.searchSettings.defineSearchArea && !this.state.searchSettings.searchByCurrentMapExtent) {
          currentBufferDistance = this.state.aoiGeometries?.bufferDistance || this.state.searchSettings.bufferDistance
        }

        //Closest analysis to be performed only when search area is defined and using location
        //For Show all features and show by current map extent skip closets analysis
        //For closest, if no feature found with actual buffer, check closet max buffer
        if (this.state.searchSettings.defineSearchArea && !this.state.searchSettings.searchByCurrentMapExtent && layerInfo.analysisInfo.analysisType === AnalysisTypeName.Closest &&
          featureList.length === 0) {
          let closestFeatureMaxDistance = layerInfo.analysisInfo.closestFeatureMaxDistance
          const closestBufferDistanceUnit: any = layerInfo.analysisInfo.distanceUnit || 'miles'
          if (this.state.searchSettings.defineSearchArea) {
            //in search by distance, if closest and actual buffer unit is diff, then convert closet distance in actual buffer unit
            if (!this.state.searchSettings.searchByCurrentMapExtent && distanceUnit !== closestBufferDistanceUnit &&
              currentBufferDistance !== 0) {
              closestFeatureMaxDistance = (closestFeatureMaxDistance / perUnitMeter(closestBufferDistanceUnit)) * perUnitMeter(distanceUnit as __esri.LinearUnits)
            }

            //in search by distance, create n use closet max buffer if actual buffer is small than closest buffer
            //in search by map area, directly create n use closet max buffer
            if ((!this.state.searchSettings.searchByCurrentMapExtent && currentBufferDistance < closestFeatureMaxDistance) ||
              this.state.searchSettings.searchByCurrentMapExtent) {
              this.getClosestMaxDistanceBuffer(closestFeatureMaxDistance, closestBufferDistanceUnit).then((closetBufferGeometry) => {
                if (closetBufferGeometry !== null) {
                  getALLFeatures(ds, closetBufferGeometry, returnGeometry, this.state.jimuMapView.view.spatialReference).then((featureList: DataRecord[]) => {
                    if (featureList.length > 0) {
                      featureSet = this.createFeatureSet(featureList, layerInfo, objIdField, distanceUnit as __esri.LinearUnits)
                      resolve(featureSet)
                    } else {
                      resolve(featureSet)
                    }
                  })
                } else {
                  resolve(featureSet)
                }
              })
            } else {
              resolve(featureSet)
            }
          }
        } else {
          if (featureList.length > 0) {
            if (layerInfo.analysisInfo.analysisType === AnalysisTypeName.Summary) {
              featureSet = this.summaryAnalysis(featureList, layerInfo, distanceUnit, bufferGeometry)
              resolve(featureSet)
            } else {
              featureSet = this.createFeatureSet(featureList, layerInfo, objIdField, distanceUnit as __esri.LinearUnits)
              resolve(featureSet)
            }
          } else {
            resolve(featureSet)
          }
        }
      }
    })
    return promise
  }

  /**
   * Render the summary fields cards according to its config
   * @param featureList Summary features list
   * @param layerInfo config layers info
   * @param distanceUnit config distance units
   * @param geometry calculated geometry
   * @returns result for summary analysis
   */
  summaryAnalysis = (featureList: DataRecord[], layerInfo: LayersInfo, distanceUnit: string, geometry: Geometry) => {
    const jsxElements: JSX.Element[] = []
    let value
    value = null
    const analysisInfo: any = layerInfo.analysisInfo
    const skipAreaOrLengthField = (!this.state.searchSettings.defineSearchArea) || (this.state.searchSettings.defineSearchArea && this.state.searchSettings.searchByCurrentMapExtent)
    if (analysisInfo.summaryFields.length > 0) {
      analysisInfo.summaryFields.forEach((summaryField: SummaryFieldsInfo, index: number) => {
        //if define search is off or search by map are is on then skip sum of intersected area/length fields of summary
        // eslint-disable-next-line no-prototype-builtins
        if (!(skipAreaOrLengthField && summaryField.summaryFieldInfo.hasOwnProperty('summaryBy'))) {
          if (summaryField.summaryFieldInfo?.summaryBy === CommonSummaryFieldValue.SumOfIntersectedArea) {
            value = this.getArea(featureList, geometry, distanceUnit)
            value = this.getSummaryDisplayValue(value, summaryField.summaryFieldInfo, distanceUnit, true)
          }
          if (summaryField.summaryFieldInfo?.summaryBy === CommonSummaryFieldValue.SumOfIntersectedLength) {
            value = this.getLength(featureList, geometry, distanceUnit)
            value = this.getSummaryDisplayValue(value, summaryField.summaryFieldInfo, distanceUnit, false)
          }
          const summaryColor = utils.getColorValue(analysisInfo.isSingleColorMode ? analysisInfo.singleFieldColor : summaryField.fieldColor)
          jsxElements.push(<SummaryFieldCard
            widgetId={this.props.widgetId}
            records={featureList}
            theme={this.props.theme}
            useDataSource={layerInfo.useDataSource}
            fieldLabel={summaryField.fieldLabel}
            fieldColor={summaryColor}
            summaryFieldInfo={summaryField.summaryFieldInfo}
            summaryDisplayValue={value}
            key={index}
          ></SummaryFieldCard>)
        }
      })
      //if no summary card is created then show msg
      if (jsxElements?.length === 0) {
        jsxElements.push(
          <div className='border-top px-2 py-2 text-center'>{this.nls('noSummariesDefinedMsg')}</div>
        )
      }
    } else {
      jsxElements.push(
        <div className='border-top px-2 py-2 text-center'>{this.nls('noSummariesDefinedMsg')}</div>
      )
    }
    return ({
      items: jsxElements,
      count: featureList.length,
      layerInfo: layerInfo,
      records: featureList
    })
  }

  /**
   * Get summary field display value
   * @param summaryValue sum of intersected Lenght/Area
   * @param summaryFieldInfo Sum Of Area/Length Params
   * @param distanceUnit  selected unit
   * @returns formatted value or area
   */
  getSummaryDisplayValue = (summaryValue: number, summaryFieldInfo: SumOfAreaLengthParam, distanceUnit: string, isIntersectingArea?: boolean): string => {
    const defaultNumberFormat: FormatNumberOptions = {
      useGrouping: summaryFieldInfo.showSeparator,
      notation: 'standard'
    }
    let formattedValue: string | number
    if (summaryFieldInfo.numberFormattingOption === NumberFormatting.Round) {
      defaultNumberFormat.maximumFractionDigits = summaryFieldInfo.significantDigits
      formattedValue = this.props.intl.formatNumber(summaryValue, defaultNumberFormat)
    } else if (summaryFieldInfo.numberFormattingOption === NumberFormatting.Truncate) {
      if (!isNaN(summaryValue) && summaryValue !== null) {
        const truncatePlaces = summaryFieldInfo.significantDigits
        const truncateExp = new RegExp(truncatePlaces > 0 ? '^\\d*[.]?\\d{0,' + truncatePlaces + '}' : '^\\d*')
        formattedValue = truncateExp.exec(summaryValue.toString())[0]
      }
      formattedValue = this.props.intl.formatNumber(summaryValue, defaultNumberFormat)
    } else {
      formattedValue = this.props.intl.formatNumber(summaryValue, defaultNumberFormat)
    }
    let unitAbbr = this.getSelectedUnitsAbbr(distanceUnit as __esri.LinearUnits)
    //show square unit for area
    if (isIntersectingArea) {
      unitAbbr = unitAbbr + '\u00b2'
    }
    return this.summaryIntersectValueAndUnitLabel(formattedValue, unitAbbr)
  }

  /**
   * Get label for sum of intersected area/length value and unit
   * @param formattedSummaryValue formatted sum of intersected area/length value
   * @param unit unit
   * @returns formatted sum of intersected area/length value unit label
   */
  summaryIntersectValueAndUnitLabel = (formattedSummaryValue: string, unit: string): string => {
    let summaryIntersectValueAndUnitLabel = ''
    summaryIntersectValueAndUnitLabel = this.props.intl.formatMessage({
      id: 'summaryIntersectValueAndUnit', defaultMessage: defaultMessages.summaryIntersectValueAndUnit
    }, { summaryIntersectValue: formattedSummaryValue, unitLabel: unit })
    return summaryIntersectValueAndUnitLabel
  }

  /**
   * Get the intersected area for polygon feature
   * @param featureRecords selected features records
   * @param geoms geometry of the features
   * @param distanceUnits config distance units
   * @returns formatted value or area
   */
  getArea = (featureRecords: DataRecord[], geoms: Geometry, distanceUnits: string): number => {
    let value: number = 0
    const units = ('square' + '-' + distanceUnits) as __esri.AreaUnits
    featureRecords.forEach(featureRecord => {
      const selectedFeatureRecord = featureRecord as any
      let intersectGeom
      if (geoms) {
        intersectGeom = geometryEngine.intersect(selectedFeatureRecord.feature.geometry, geoms)
      } else {
        intersectGeom = selectedFeatureRecord.feature.geometry
      }
      if (intersectGeom !== null) {
        const sr = intersectGeom.spatialReference
        if (sr.wkid === 4326 || sr.isWebMercator || (sr.isGeographic)) {
          value += geometryEngine.geodesicArea(intersectGeom, units)
        } else {
          value += geometryEngine.planarArea(intersectGeom, units)
        }
      }
    })
    return value
  }

  /**
   * Get the intersected length for polyline feature
   * @param featureRecords selected features records
   * @param geoms geometry of the features
   * @param distanceUnits config distance units
   * @returns formatted value or length
   */
  getLength = (featureRecords: DataRecord[], geoms: Geometry, distanceUnits: string): number => {
    let value: number = 0
    const units = distanceUnits as __esri.LinearUnits
    featureRecords.forEach(featureRecord => {
      const selectedFeatureRecord = featureRecord as any
      let intersectGeom
      if (geoms) {
        intersectGeom = geometryEngine.intersect(selectedFeatureRecord.feature.geometry, geoms)
      } else {
        intersectGeom = selectedFeatureRecord.feature.geometry
      }
      if (intersectGeom !== null) {
        const sr = intersectGeom.spatialReference
        if (sr.wkid === 4326 || sr.isWebMercator || (sr.isGeographic)) {
          value += geometryEngine.geodesicLength(intersectGeom, units)
        } else {
          value += geometryEngine.planarLength(intersectGeom, units)
        }
      }
    })
    return value
  }

  /**
   * Resize the layers list height depending whether the closest address is showing
   * @param isClosestAddressShowing whether the closest address is showing
   */
  resizeLayerListHeight = () => {
    const divHeight = this.divRef?.current?.offsetHeight
    this.setState({
      listMaxHeight: 'calc(100% -' + ' ' + divHeight + 'px)'
    })
  }

  /**
   * Create highlighting graphics for the selected feature
   * @param records feature records
   * @param isVisible whether highlight layer is visible
   * @param highlightResults whether layer results highlighted on map
   */
  createHighlightGraphicsForLayer = (records: DataRecord[], isVisible: boolean, highlightResults: boolean) => {
    if (highlightResults) {
      const highlightLayer = new GraphicsLayer({ listMode: 'hide', visible: isVisible })
      this.highlightGraphicsLayers.push(highlightLayer)
      this.state.jimuMapView?.view.map.addMany([highlightLayer])
      //reorder the flash layer to be on top so that the flashed graphics is visible on map
      this.state.jimuMapView?.view.map.reorder(this.flashLayer, this.state.jimuMapView?.view.map.layers.length - 1)
      records.forEach((record) => {
        const featureRecord = record as any
        const feature = featureRecord.getFeature()
        const graphic = getHighLightSymbol(feature)
        if (highlightLayer && graphic) {
          highlightLayer.add(graphic)
        }
      })
    } else {
      //pushed null for the layers(proximity/summary) whose highlight features setting is off
      this.highlightGraphicsLayers.push(null)
    }
  }

  /**
   * Destroy/remove the highlight graphics layers
   */
  destroyHighlightGraphicsLayer = () => {
    this.highlightGraphicsLayers.forEach((layer) => {
      if (layer) {
        layer.removeAll()
        layer.destroy()
      }
    })
    this.highlightGraphicsLayers = []
  }

  /**
   * On layer toggle make the layer visible
   * @param index Index of each layer toggle
   * @param isExpanded check whether the layer section is expanded
   */
  onLayerToggle = (index: number, isExpanded: boolean) => {
    if (this.highlightGraphicsLayers?.length > 0 && this.highlightGraphicsLayers[index]) {
      const layer = this.highlightGraphicsLayers[index]
      if (layer) {
        if (isExpanded) {
          layer.visible = true
        } else {
          layer.visible = false
        }
      }
    }
  }

  /**
   * Queries only unique layers from the configured analysis starts display layer analysis
   */
  queryLayers = () => {
    this.setState({
      showNoResultsFoundMsg: false,
      displayLayerAccordion: []
    })
    this.destroyHighlightGraphicsLayer()
    const defArray: Array<Promise<any>> = []
    const queriedLayers: string[] = []
    if (((!this.state.searchSettings?.defineSearchArea || (this.state.searchSettings?.defineSearchArea && this.state.aoiGeometries)) && this.state.jimuMapView &&
      this.state.analysisSettings?.layersInfo?.length > 0)) {
      this.state.analysisSettings.layersInfo.forEach((layerInfo) => {
        //Loop through all analysis layers settings configuration
        //Any layer which does not falls in the layer arrays
        //are not present in the webmap/webscene
        //skip analysis for those layers
        if (this.availableLayersIds.includes(layerInfo.useDataSource.dataSourceId)) {
          const dsId: string = layerInfo?.useDataSource?.dataSourceId
          if (dsId && !queriedLayers.includes(dsId)) {
            queriedLayers.push(dsId)
            //Live mode: if analysis setting is changed then query only for newly added layers
            if (!this.featuresByDsId[dsId]) {
              defArray.push(this.getRecords(layerInfo.useDataSource))
            }
          }
        }
      })
    }
    Promise.all(defArray).then(() => {
      this.displayAnalysisLayerInfo()
    })
  }

  /**
   * Download the individual analysis csv
   * @param index each layer analysis index
   * @param dsId layer dataSource id
   * @param analysisType layer analysis type
   */
  downloadIndividualCsv = async (index: number, dsId: string, analysisType: string) => {
    let records = this.featuresByDsId[dsId]
    if (dsId) {
      if (analysisType === AnalysisTypeName.Closest) {
        records = this.closestFeaturesByIndexAndDsId[index + '_' + dsId]
      }
      const dsManager = DataSourceManager.getInstance()
      const dataSource = dsManager?.getDataSource(dsId)
      dsManager.createDataSource(Immutable({
        id: 'downloadCsv_' + new Date().getTime(),
        type: DataSourceTypes.FeatureLayer,
        isDataInDataSourceInstance: true,
        schema: dataSource.getSchema()
      })).then(ds => {
        ds.setSourceRecords(records)
        const fieldNamesArr = []
        const fieldsArray = records[0].feature.layer.fields
        fieldsArray.forEach((element) => {
          fieldNamesArr.push(element.name)
        })
        const dataSets = {
          records: records,
          dataSource: ds,
          name: dataSource.getLabel(),
          fields: fieldNamesArr
        }
        const actionsPromise = DataActionManager.getInstance().getSupportedActions(this.props.widgetId, dataSets)
        actionsPromise.then(async actions => {
          const action = actions.exportAll
          if (action?.length > 0) {
            if (action?.length === 2) {
              action.splice(0, 1)
            }
            const firstAction = action[0]
            await DataActionManager.getInstance().executeDataAction(firstAction, dataSets)
          }
        }).catch(err => {
          console.error(err)
        })
      })
    }
  }

  /**
   * loop through analysis setting layer infos and display layers accordion
   */
  displayAnalysisLayerInfo = () => {
    const items: JSX.Element[] = []
    if (this.state.displayLayerAccordion.length > 0) {
      this.setState({
        showNoResultsFoundMsg: false,
        displayLayerAccordion: []
      })
      this.destroyHighlightGraphicsLayer()
    }
    const defArray = []
    if (((!this.state.searchSettings?.defineSearchArea || (this.state.searchSettings?.defineSearchArea && this.state.aoiGeometries)) && this.state.jimuMapView &&
      this.state.analysisSettings?.layersInfo?.length > 0)) {
      this.state.analysisSettings?.layersInfo.forEach((layerInfo, index) => {
        //if show all features or map area is on then don't show closest analysis type layers
        if (!(((!this.state.searchSettings?.defineSearchArea) || (this.state.searchSettings?.defineSearchArea && this.state.searchSettings.searchByCurrentMapExtent)) && layerInfo.analysisInfo.analysisType === AnalysisTypeName.Closest)) {
          //Loop through all analysis layers settings configuration
          //Any layer which does not falls in the layer arrays
          //are not present in the webmap/webscene
          //skip analysis for those layers
          if (this.availableLayersIds.includes(layerInfo.useDataSource.dataSourceId)) {
            defArray.push(this.performAnalysis(layerInfo))
          }
        }
      })
      Promise.all(defArray).then((results: any) => {
        results.forEach((result, index: number) => {
          if (result?.count > 0) {
            const dsId = result.layerInfo.useDataSource.dataSourceId
            const canExportData: boolean = this.state.showExportButton && !result.records[0]._dataSource.getDataSourceJson().disableExport
            const expandLayer: boolean = result.layerInfo.analysisInfo.expandOnOpen
            this.closestFeaturesByIndexAndDsId[items.length + '_' + dsId] = result.records

            //create highlight graphics
            //in case of show all features and show features in Current Map Area
            //we will not fetch the geometries and hence no need to highlight them
            //only highlight the graphics in case when search area is defined for distance
            if (this.state.searchSettings?.defineSearchArea && !this.state.searchSettings.searchByCurrentMapExtent) {
              let highlightResults = true
              //check proximity and summary results should be highlighted or not
              if (result.layerInfo.analysisInfo.analysisType === AnalysisTypeName.Proximity ||
                result.layerInfo.analysisInfo.analysisType === AnalysisTypeName.Summary) {
                highlightResults = result.layerInfo.analysisInfo.highlightResultsOnMap
              }
              this.createHighlightGraphicsForLayer(result.records, expandLayer, highlightResults)
            }
            items.push(<LayerAccordion
              theme={this.props.theme}
              key={index}
              intl={this.props.intl}
              label={result.layerInfo.label}
              analysisIcon={this.state.analysisSettings?.displayAnalysisIcon ? this.getAnalysisTypeIcon(result.layerInfo.analysisInfo.analysisType) : null}
              featureCount={this.state.analysisSettings?.displayFeatureCount ? result?.count : null}
              isExpanded={expandLayer}
              isListView={true}
              index={items.length}
              dsId={dsId}
              analysisType={result.layerInfo.analysisInfo.analysisType}
              showExportButton={canExportData}
              onDownload={this.downloadIndividualCsv}
              onToggle={this.onLayerToggle}>
              {result.items}
            </LayerAccordion>)
          }
        })
        if (items.length === 0) {
          this.setState({
            showNoResultsFoundMsg: true
          })
        }
        this.setState({
          displayLayerAccordion: items
        })
      })
    }
  }

  /**
   * Set current widget width
   */
  onResize = (widgetWidth: number) => {
    //if widget size is below 306 then show value in next row
    //else show label and value in one row
    this.setState({
      widgetWidth: widgetWidth
    })
    this.resizeLayerListHeight()
  }

  /**
   * Update state to know closest Address is Showing or not
   */
  updateClosestAddressState = (isClosestAddressShowing: boolean) => {
    this.setState({
      isClosestAddressShowing: isClosestAddressShowing
    }, () => {
      this.resizeLayerListHeight()
    })
  }

  render () {
    if (!this.props.useMapWidgetIds?.[0]) {
      return (
        <WidgetPlaceholder
          icon={widgetIcon} widgetId={this.props.id}
          message={this.props.intl.formatMessage({ id: '_widgetLabel', defaultMessage: this.nls('_widgetLabel') })}
        />
      )
    }

    return (
      <div css={getStyle(this.props.theme, this.state.listMaxHeight, this.state.generalSettings.noResultMsgStyleSettings)} className={'jimu-widget'}>
        <JimuMapViewComponent useMapWidgetId={this.props.useMapWidgetIds?.[0]} onActiveViewChange={this.onActiveViewChange}></JimuMapViewComponent>
        <div className='widget-near-me'>
          <div className='main-row w-100 h-100'>
            <div ref={this.divRef}>
              {this.state.searchSettings?.defineSearchArea && this.state.jimuMapView && this.state.isLayerAvailable && this.state.isAnalysisLayerConfigured &&
                <AoiTool
                  theme={this.props.theme}
                  intl={this.props.intl}
                  headingLabel={this.state.searchSettings?.headingLabel}
                  config={this.state.searchSettings}
                  highlightColor={utils.getColorValue(this.state.generalSettings.highlightColor)}
                  jimuMapView={this.state.jimuMapView}
                  aoiComplete={this.onAoiComplete}
                  clear={this.onClear}
                  bufferLayer={this.bufferLayer}
                  drawingLayer={this.drawingLayer}
                  updateClosestAddressState={this.updateClosestAddressState}
                  msgActionGeometry={this.state.msgActionGeometry}
                  widgetWidth={this.state.widgetWidth}
                />}

              {/*Heading Label for show all features */}
              {!this.state.searchSettings?.defineSearchArea && this.state.jimuMapView && this.state.isLayerAvailable && this.state.isAnalysisLayerConfigured &&
                <Label className={'headingLabel px-2 pt-2'}>{this.state.searchSettings?.headingLabel}</Label>
              }
            </div>

            <div className={'layerContainer'}>

              {/*TODO - keep only on loading indicator */}
              {!this.state?.jimuMapView &&
                < React.Fragment >
                  <Loading type={LoadingType.Secondary} />
                </React.Fragment>}

              {/* Loading indicator */}
              {this.state.displayLayerAccordion.length === 0 && !this.state.showNoResultsFoundMsg && (!this.state.searchSettings?.defineSearchArea || (this.state.searchSettings?.defineSearchArea && this.state.aoiGeometries)) &&
                this.state.analysisSettings?.layersInfo.length > 0 && this.state.jimuMapView &&
                < React.Fragment >
                  <Loading type={LoadingType.Secondary} />
                </React.Fragment>}

              {/* Layers accordions */}
              {this.state.displayLayerAccordion.length > 0 && this.state.jimuMapView &&
                <React.Fragment>
                  {this.state.displayLayerAccordion}
                </React.Fragment>}

              {/* No result found message*/}
              {this.state.displayLayerAccordion.length === 0 && this.state.showNoResultsFoundMsg && (!this.state.searchSettings?.defineSearchArea || (this.state.searchSettings?.defineSearchArea && this.state.aoiGeometries)) &&
                this.state.analysisSettings?.layersInfo.length > 0 && this.state.jimuMapView && this.state.isAnalysisLayerConfigured &&
                <div className='applyTextStyle'>
                  {this.state.generalSettings.noResultsFoundText}
                </div>}

              {/* No analysis layer is configured*/}
              {!this.state.isAnalysisLayerConfigured && this.state.isLayerAvailable &&
                <Alert tabIndex={0} withIcon={true} size='small' type='warning' className='w-100 shadow mb-1 m-0'>
                  <div className='flex-grow-1 text-break settings-text-level'>
                    {this.nls('noAnalysisLayerMsg')}
                  </div>
                </Alert>}

              {/* Map/Scene has no layers*/}
              {!this.state.isLayerAvailable &&
                <Alert tabIndex={0} withIcon={true} size='small' type='warning' className='w-100 shadow mb-1 m-0'>
                  <div className='flex-grow-1 text-break settings-text-level'>
                    {this.nls('warningMsgIfNoLayersOnMap')}
                  </div>
                </Alert>}
            </div>
          </div>
        </div>
        <ReactResizeDetector handleWidth handleHeight onResize={this.onResize} />
      </div>
    )
  }
}
