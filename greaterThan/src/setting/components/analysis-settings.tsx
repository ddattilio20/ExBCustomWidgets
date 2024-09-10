/** @jsx jsx */ // <-- make sure to include the jsx pragma
import { React, jsx, type IntlShape, type IMThemeVariables, urlUtils, defaultMessages as jimuCoreDefaultMessages, type DataSource, type UseDataSource } from 'jimu-core'
import { Button, Label, Switch, Tooltip } from 'jimu-ui'
import { SettingRow, SidePopper } from 'jimu-ui/advanced/setting-components'
import { MapViewManager } from 'jimu-arcgis'
import { getAnalysisSettingStyle, getSidePanelStyle } from '../lib/style'
import defaultMessages from '../translations/default'
import { type AnalysisSettings, type CurrentLayer, type LayersInfo, type DataSourceOptions, AnalysisTypeName } from '../../config'
import { analysisType, defaultAnalysis, defaultClosestAnalysis } from '../constants'
import LayersInfos from '../components/layers-info'
import EditAnalysisPopper from '../components/edit-analysis-popper'
import { getDisplayField, getSelectedLayerInstance } from '../../common/utils'
import { InfoOutlined } from 'jimu-icons/outlined/suggested/info'
import SidepopperBackArrow from './sidepopper-back-arrow'

interface Props {
  widgetId: string
  intl: IntlShape
  theme: IMThemeVariables
  activeDsLayersConfig: AnalysisSettings
  allFeatureLayers: DataSourceOptions[]
  selectedDs: string
  useDataSourceConfig: UseDataSource[]
  onAnalysisSettingsUpdated: (prop: string, value: string | boolean | LayersInfo[]) => void
  getAddedLayersInfoUseDs: (eachLayersUseDs: UseDataSource[]) => void
}

interface State {
  showLayersResultOption: boolean
  showEditAnalysisPopper: boolean
  newAddedLayerAnalysis: LayersInfo[]
  displayFeatureCount: boolean
  displayAnalysisIcon: boolean
  layersAnalysisType: string
  analysisIndex: number
  editCurrentLayer: CurrentLayer
  selectedLayerGeometryType: string
  popperFocusNode: HTMLElement

}

let collectionLayersInfos = []

export default class AnalysisSetting extends React.PureComponent<Props, State> {
  analysisLayersPopperTrigger = React.createRef<HTMLDivElement>()
  backRef = React.createRef<SidepopperBackArrow>()
  readonly mvManager: MapViewManager = MapViewManager.getInstance()
  public allDsLayers: DataSource[] = []
  useDataSources: UseDataSource[]
  constructor (props) {
    super(props)
    if (this.props.activeDsLayersConfig) {
      this.state = {
        showLayersResultOption: this.props.activeDsLayersConfig?.onlyShowLayersResult,
        showEditAnalysisPopper: false,
        newAddedLayerAnalysis: this.props.activeDsLayersConfig?.layersInfo?.length > 0 ? this.props.activeDsLayersConfig?.layersInfo : [],
        displayFeatureCount: this.props.activeDsLayersConfig.displayFeatureCount,
        displayAnalysisIcon: this.props.activeDsLayersConfig.displayAnalysisIcon,
        layersAnalysisType: '',
        analysisIndex: null,
        editCurrentLayer: { layerDsId: '', analysisType: '' },
        selectedLayerGeometryType: '',
        popperFocusNode: null
      }
    }
    this.useDataSources = this.props.useDataSourceConfig
  }

  nls = (id: string) => {
    const messages = Object.assign({}, defaultMessages, jimuCoreDefaultMessages)
    //for unit testing no need to mock intl we can directly use default en msg
    if (this.props.intl && this.props.intl.formatMessage) {
      return this.props.intl.formatMessage({ id: id, defaultMessage: messages[id] })
    } else {
      return messages[id]
    }
  }

  /**
   * Add all the added layers on mount of the component
   */
  componentDidMount = () => {
    collectionLayersInfos = this.collectionOfLayerInfos()
    const layerInfos = []// initial analysis layer delete
    if (this.props.activeDsLayersConfig?.layersInfo.length > 0) {
      this.props.activeDsLayersConfig?.layersInfo.map((result) => {
        layerInfos.push(result)
        return true
      })
      this.setState({
        newAddedLayerAnalysis: layerInfos
      })
    }
  }

  //update only show layer result property
  onlyShowResultsOptionChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      showLayersResultOption: evt.target.checked
    }, () => {
      this.props.onAnalysisSettingsUpdated('onlyShowLayersResult', this.state.showLayersResultOption)
    })
  }

  //Update the display feature count property
  displayFeatureCountStateChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      displayFeatureCount: evt.target.checked
    }, () => {
      this.props.onAnalysisSettingsUpdated('displayFeatureCount', this.state.displayFeatureCount)
    })
  }

  //Update the display analysis icon property
  displayAnalysisIconStateChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      displayAnalysisIcon: evt.target.checked
    }, () => {
      this.props.onAnalysisSettingsUpdated('displayAnalysisIcon', this.state.displayAnalysisIcon)
    })
  }

  /**
   * Create the collection of combinations of different layers with closest, proximity and summary analysis types
   * @returns combination of analysis type and configured feature layer
   */
  collectionOfLayerInfos = () => {
    const combinations = []
    //create combinations of different layers with 3 analysis types
    this.props.allFeatureLayers.forEach((layersConfig, index) => {
      if (layersConfig.value === this.props.selectedDs) {
        const allLayersIds = layersConfig.availableLayers
        allLayersIds.forEach((layer) => {
          const individualLayer: any = layer
          const getLayersInstance = getSelectedLayerInstance(individualLayer.layerDsId)
          this.allDsLayers.push(getLayersInstance)
        })
      }
    })
    for (let i = 0; i < this.allDsLayers.length; i++) {
      for (let j = 0; j < analysisType.length; j++) {
        combinations.push({
          analysisType: analysisType[j],
          featureLayer: this.allDsLayers[i]
        })
      }
    }
    return combinations
  }

  /**
   * On add analysis click the analysis layers gets added with the respective types
   * eg. Closest, Proximity, Summary
  */
  onAddAnalysisClick = () => {
    if (this.props.activeDsLayersConfig?.layersInfo.length > 0) {
      const indexes = []
      //checks whether the layers and analysis type combinations matches with the configured analysis
      for (let i = 0; i < collectionLayersInfos.length; i++) {
        for (let j = 0; j < this.state.newAddedLayerAnalysis.length; j++) {
          if (collectionLayersInfos[i].analysisType === this.state.newAddedLayerAnalysis[j].analysisInfo.analysisType &&
            collectionLayersInfos[i].featureLayer.id === this.state.newAddedLayerAnalysis[j].useDataSource.dataSourceId) {
            indexes.push(i)
          }
        }
      }
      const unmatchedIndex = []
      collectionLayersInfos.forEach((result, index) => {
        if (!indexes.includes(index)) {
          unmatchedIndex.push(index)
        }
      })
      const createUseDs: UseDataSource = {
        dataSourceId: collectionLayersInfos[unmatchedIndex?.[0]]?.featureLayer?.id,
        mainDataSourceId: collectionLayersInfos[unmatchedIndex?.[0]]?.featureLayer?.id,
        rootDataSourceId: this.props.selectedDs
      }
      let tempUseDataSources = []
      tempUseDataSources = Object.assign(tempUseDataSources, this.useDataSources)
      tempUseDataSources.push(createUseDs)
      this.useDataSources = tempUseDataSources
      // Adds the analysis layer-wise and each layer with 3 different analysis types
      if (unmatchedIndex.length > 0) {
        const analysis = defaultAnalysis.find(result => result.analysisType === collectionLayersInfos[unmatchedIndex[0]].analysisType)
        const layerObj = getSelectedLayerInstance(collectionLayersInfos[unmatchedIndex[0]].featureLayer.id) as any
        const newAnalysis: LayersInfo = {
          useDataSource: createUseDs,
          label: layerObj.getLabel(),
          analysisInfo: analysis
        }
        if (collectionLayersInfos[unmatchedIndex[0]].analysisType === AnalysisTypeName.Proximity) {
          const analysisInfo: any = newAnalysis.analysisInfo
          analysisInfo.displayField = getDisplayField(layerObj.layerDefinition)
          newAnalysis.analysisInfo = analysisInfo
        }
        this.setState({
          newAddedLayerAnalysis: [...this.state.newAddedLayerAnalysis, newAnalysis],
          analysisIndex: this.state.newAddedLayerAnalysis.length,
          editCurrentLayer: { layerDsId: collectionLayersInfos[unmatchedIndex[0]].featureLayer.id, analysisType: collectionLayersInfos[unmatchedIndex[0]].analysisType },
          selectedLayerGeometryType: layerObj.layerDefinition?.geometryType
        }, () => {
          this.props.onAnalysisSettingsUpdated('layersInfo', this.state.newAddedLayerAnalysis)
        })
        this.setState({
          showEditAnalysisPopper: true
        })
      } else { //if all the layers with analysis types are added then add the closest default analysis type again
        this.displayDefaultClosestAnalysis(collectionLayersInfos, true)
      }
    } else { //if any analysis not configured then load the layer with closest analysis type
      this.displayDefaultClosestAnalysis(collectionLayersInfos, false)
    }
    setTimeout(() => {
      this.props.getAddedLayersInfoUseDs(this.useDataSources)
    }, 100)
  }

  /**
   * Display the closest analysis type layer info
   * @param collectionLayersInfos Feature layer instance
   * @param isAdded Check if the layer is added
   */
  displayDefaultClosestAnalysis = (collectionLayersInfos, isAdded: boolean) => {
    const defaultUseDs: UseDataSource = {
      dataSourceId: collectionLayersInfos[0].featureLayer.id,
      mainDataSourceId: collectionLayersInfos[0].featureLayer.id,
      rootDataSourceId: this.props.selectedDs
    }
    let tempUseDataSources = []
    tempUseDataSources = Object.assign(tempUseDataSources, this.useDataSources)
    tempUseDataSources.push(defaultUseDs)
    this.useDataSources = tempUseDataSources

    const layerObj = getSelectedLayerInstance(collectionLayersInfos[0].featureLayer.id)
    const newAnalysis: LayersInfo = {
      useDataSource: defaultUseDs,
      label: layerObj.getLabel(),
      analysisInfo: defaultClosestAnalysis
    }
    this.setState({
      newAddedLayerAnalysis: isAdded ? [...this.state.newAddedLayerAnalysis, newAnalysis] : [newAnalysis],
      analysisIndex: this.state.newAddedLayerAnalysis.length,
      editCurrentLayer: { layerDsId: collectionLayersInfos[0].featureLayer.id, analysisType: collectionLayersInfos[0].analysisType }
    }, () => {
      this.props.onAnalysisSettingsUpdated('layersInfo', this.state.newAddedLayerAnalysis)
    })
    this.setState({
      showEditAnalysisPopper: true
    })
  }

  closeEditAnalysisPopper = () => {
    this.setSidePopperAnchor(this.state.analysisIndex)
    this.setState({
      showEditAnalysisPopper: false,
      analysisIndex: null,
      editCurrentLayer: { layerDsId: '', analysisType: '' }
    })
  }

  /**
  * On click opens the Edit side popper of the respective analysis layers settings
  * @param isOpen Check if analysis layer is in editing mode
  * @param layerDsId Specifies layer Ds id
  * @param analysisType Analysis type of respective layer
  * @param analysisIndex Edit analysis layer index
  */
  onEditButtonClick = (isOpen: boolean, layerDsId: string, analysisType: string, analysisIndex: number) => {
    this.setSidePopperAnchor(analysisIndex)
    this.setState({
      showEditAnalysisPopper: isOpen,
      analysisIndex: analysisIndex,
      editCurrentLayer: { layerDsId: layerDsId, analysisType: analysisType }
    })
  }

  //set side popper anchor
  setSidePopperAnchor = (index?: number) => {
    const node: any = this.analysisLayersPopperTrigger.current.getElementsByClassName('jimu-tree-item__body')[index]
    this.setState({
      popperFocusNode: node
    })
  }

  /**
   * On click deletes the respective layers shell and layers settings
   * @param addedLayerAnalysis Layer info that to be deleted
   * @param layerDsId Specifies layer Ds id
   * @param analysisType Analysis type of respective layer
   * @param index Delete analysis layer index
   */
  onDeleteButtonClick = (addedLayerAnalysis, layerDsId: string, analysisType: string, index: number) => {
    this.setState({
      newAddedLayerAnalysis: addedLayerAnalysis,
      analysisIndex: index
    }, () => {
      this.props.onAnalysisSettingsUpdated('layersInfo', addedLayerAnalysis)
      setTimeout(() => {
        this.props.getAddedLayersInfoUseDs(this.useDataSources)
      }, 100)
      if (this.state.analysisIndex === -1 && this.state.editCurrentLayer.layerDsId === layerDsId && this.state.editCurrentLayer.analysisType === analysisType) {
        this.closeEditAnalysisPopper()
      }
    })
  }

  /**
   * On layer info settings update, update the config
   * @param updatedAnalysis Update layers info
   * @param analysisIndex Index of updated layer
   * @param layerDsId Specifies layer Ds id
   * @param analysisType Analysis type of respective layer
   */

  updateLayersInfoSettings = (updatedAnalysis, analysisIndex: number, layerDsId: string, analysisType: string) => {
    this.setState({
      newAddedLayerAnalysis: updatedAnalysis,
      analysisIndex: analysisIndex,
      editCurrentLayer: { layerDsId: layerDsId, analysisType: analysisType }

    }, () => {
      this.props.onAnalysisSettingsUpdated('layersInfo', updatedAnalysis)
    })
  }

  /**
   * On parameter update of analysis info
   * @param analysisListSettings Layer analysis list
   * @param layerDsId Specifies layer Ds id
   * @param analysisType Analysis type of respective layer
   * @param idx Index of updated layer
   */

  onAnalysisInfoUpdate = (analysisListSettings, layerDsId, analysisType, idx) => {
    this.setState({
      newAddedLayerAnalysis: analysisListSettings,
      analysisIndex: idx,
      editCurrentLayer: { layerDsId: layerDsId, analysisType: analysisType }
    }, () => {
      this.props.onAnalysisSettingsUpdated('layersInfo', analysisListSettings)
      let tempUseDataSources = []
      analysisListSettings.forEach((layer) => {
        tempUseDataSources = Object.assign(tempUseDataSources, this.useDataSources)
        tempUseDataSources.push(layer.useDataSource)
      })
      this.useDataSources = tempUseDataSources
      setTimeout(() => {
        this.props.getAddedLayersInfoUseDs(this.useDataSources)
      }, 100)
    })
  }

  render () {
    return (
      <div css={getAnalysisSettingStyle(this.props.theme)} style={{ height: '100%', width: '100%', marginTop: 10 }}>
        <SettingRow label={this.nls('configureLayerAnalysis')}>
          <Tooltip role={'tooltip'} tabIndex={0} aria-label={this.nls('configureAnalysisTooltip')}
            title={this.nls('configureAnalysisTooltip')} showArrow placement='top'>
            <div className='setting-text-level-2 ml-2 d-inline'>
              <InfoOutlined />
            </div>
          </Tooltip>
        </SettingRow>

        <SettingRow>
          <Button role={'button'} className={'w-100 text-dark'} type={'primary'} onClick={this.onAddAnalysisClick.bind(this)} >
            {this.nls('addAnalysisLabel')}
          </Button>
        </SettingRow>

        <SettingRow>
          <Label tabIndex={0} aria-label={this.nls('layerAnalysisHint')} className='font-italic w-100 d-flex'>
            <div className='flex-grow-1 text-break setting-text-level-3'>
              {this.nls('layerAnalysisHint')}
            </div>
          </Label>
        </SettingRow>

        {this.state.newAddedLayerAnalysis && this.state.newAddedLayerAnalysis.length > 0 &&
          <div ref={this.analysisLayersPopperTrigger} tabIndex={-1} className='w-100 mb-3 mt-2'>
            <LayersInfos
              intl={this.props.intl}
              theme={this.props.theme}
              addedLayerAnalysis={this.state.newAddedLayerAnalysis}
              showEditAnalysisPopper={this.state.showEditAnalysisPopper}
              analysisIndex={this.state.analysisIndex}
              editCurrentLayer={this.state.editCurrentLayer}
              onEditAction={this.onEditButtonClick}
              onDeleteAction={this.onDeleteButtonClick.bind(this)}
              onLayersInfoSettingsUpdated={this.updateLayersInfoSettings} />
          </div>
        }

        <SettingRow label={this.nls('displayFeatureCountLabel')}>
          <Switch role={'switch'} aria-label={this.nls('displayFeatureCountLabel')} title={this.nls('displayFeatureCountLabel')}
            checked={this.state.displayFeatureCount} onChange={this.displayFeatureCountStateChange} />
        </SettingRow>

        <SettingRow label={this.nls('displayAnalysisIconLabel')}>
          <Switch role={'switch'} aria-label={this.nls('displayAnalysisIconLabel')} title={this.nls('displayAnalysisIconLabel')}
            checked={this.state.displayAnalysisIcon} onChange={this.displayAnalysisIconStateChange} />
        </SettingRow>

        <SettingRow className='hiddenElements'>
          <Label className='w-100 d-flex'>
            <div className='flex-grow-1 text-break setting-text-level-3'>
              {this.nls('onlyShowResults')}
            </div>
          </Label>
          <Tooltip role={'tooltip'} tabIndex={0} aria-label={this.nls('onlyShowResults') + ' ' + this.nls('onlyShowResultsTooltip')}
            title={this.nls('onlyShowResultsTooltip')} showArrow placement='top'>
            <div className='setting-text-level-2 mr-3 d-inline'>
              <InfoOutlined />
            </div>
          </Tooltip>
          <Switch role={'switch'} aria-label={this.nls('onlyShowResults')} title={this.nls('onlyShowResults')}
            checked={this.state.showLayersResultOption} onChange={this.onlyShowResultsOptionChange} />
        </SettingRow>

        {
          <SidePopper isOpen={this.state.showEditAnalysisPopper && !urlUtils.getAppIdPageIdFromUrl().pageId}
            position={'right'}
            toggle={this.closeEditAnalysisPopper.bind(this)}
            trigger={this.analysisLayersPopperTrigger?.current}
            backToFocusNode={this.state.popperFocusNode}>
            <div className='bg-light-300 border-color-gray-400' css={getSidePanelStyle(this.props.theme)}>
              <SidepopperBackArrow
                theme={this.props.theme}
                intl={this.props.intl}
                title={this.nls('editAnalysis')}
                ref={this.backRef}
                onBack={this.closeEditAnalysisPopper}>
                <EditAnalysisPopper
                  widgetId={this.props.widgetId}
                  intl={this.props.intl}
                  theme={this.props.theme}
                  activeDs={this.props.selectedDs}
                  analysisIndex={this.state.analysisIndex}
                  availableFeatureLayer={this.allDsLayers}
                  editCurrentLayer={this.state.editCurrentLayer}
                  analysisList={this.state.newAddedLayerAnalysis}
                  selectedLayerGeometry={this.state.selectedLayerGeometryType}
                  onAnalysisUpdate={this.onAnalysisInfoUpdate}
                />
              </SidepopperBackArrow>
            </div>
          </SidePopper>
        }

      </div>
    )
  }
}
