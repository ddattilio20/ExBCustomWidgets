/** @jsx jsx */
import { React, jsx, getAppStore, classNames, Immutable, urlUtils, JimuMapViewStatus, type UseDataSource, type DataSource, DataSourceManager } from 'jimu-core'
import { MapWidgetSelector, SettingRow, SettingSection, SidePopper } from 'jimu-ui/advanced/setting-components'
import { BaseWidgetSetting, type AllWidgetSettingProps } from 'jimu-for-builder'
import { Alert, Label, Tooltip, CollapsablePanel } from 'jimu-ui'
import { type JimuMapView, MapViewManager } from 'jimu-arcgis'
import defaultMessages from './translations/default'
import { getStyle, getMainSidePopperStyle } from './lib/style'
import { type DataSourceOptions, type IMConfig, type LayersInfo, type LayerDsId } from '../config'
import { ClickOutlined } from 'jimu-icons/outlined/application/click'
import { getSelectedLayerInstance, getAllAvailableLayers } from '../common/utils'
import GeneralSetting from './components/general-settings'
import SearchSetting from './components/search-settings'
import { defaultConfigInfo } from './constants'
import { InfoOutlined } from 'jimu-icons/outlined/suggested/info'
import { WarningOutlined } from 'jimu-icons/outlined/suggested/warning'
import { List, TreeItemActionType } from 'jimu-ui/basic/list-tree'
import AnalysisSetting from './components/analysis-settings'

interface State {
  dataSources: DataSourceOptions[]
  showDataItemPanel: boolean
  dataSourceName: string
  isNoMapSelected: boolean
  mapWidgetExists: boolean
  isAnalysisSettingsOpen: boolean
  isGeneralSettingsOpen: boolean
  isSearchSettingsOpen: boolean
  isOutputSettingsOpen: boolean
  isLayerAvailable: boolean
  activeDataSource: string
  popperFocusNode: HTMLElement
  showWarningMessage: boolean
  jimuMapViewId: string
}

export default class Setting extends BaseWidgetSetting<AllWidgetSettingProps<IMConfig>, State> {
  readonly mvManager: MapViewManager = MapViewManager.getInstance()
  private _mapLoadedTimer = null
  analysisSettingPopperTrigger = React.createRef<HTMLDivElement>()
  index: number
  constructor (props) {
    super(props)
    this.index = 0
    this.state = {
      dataSources: [],
      showDataItemPanel: false,
      dataSourceName: '',
      isNoMapSelected: true,
      mapWidgetExists: true,
      isAnalysisSettingsOpen: false,
      isGeneralSettingsOpen: true,
      isSearchSettingsOpen: true,
      isOutputSettingsOpen: true,
      isLayerAvailable: false,
      activeDataSource: null,
      popperFocusNode: null,
      showWarningMessage: false,
      jimuMapViewId: ''
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
   * Perform the required functionality when the config is mounted
  */
  componentDidMount = () => {
    //Compare the saved data with current map view data sources
    //and filter out the data sources which are not available in the map view
    //this will make sure to remove the data sources which are not available in the map view
    //populate configured data sources for map
    let isNoneMapSelected: boolean
    if (this.props.useMapWidgetIds && this.props.useMapWidgetIds.length > 0) {
      const useMapWidget = this.props.useMapWidgetIds?.[0]
      const appConfig = getAppStore().getState().appStateInBuilder.appConfig
      const mapWidgetAvailable = appConfig.widgets?.[useMapWidget]
      if (!mapWidgetAvailable) {
        this.resetAnalysisLayersConfig()
        isNoneMapSelected = true
      } else {
        isNoneMapSelected = false
        this.checkLayersAvailability(this.props.useMapWidgetIds)
      }
    } else { //display the warning message to select the web map or web scene
      isNoneMapSelected = true
    }

    this.updateConfigForMapWidget(isNoneMapSelected)

    setTimeout(() => {
      //On config load save the noResultsFoundText default message config of general setting
      this.props.onSettingChange({
        id: this.props.id,
        config: this.props.config.setIn(['generalSettings', 'noResultsFoundText'],
          this.props.config.generalSettings.noResultsFoundText ? this.props.config.generalSettings.noResultsFoundText : this.nls('noDataMessageDefaultText'))
      })
    }, 50)

    setTimeout(() => {
      //On config load save the selection color config of general setting
      this.props.onSettingChange({
        id: this.props.id,
        config: this.props.config.setIn(['generalSettings', 'highlightColor'],
          this.props.config.generalSettings.highlightColor ? this.props.config.generalSettings.highlightColor : this.props.theme2.colors.palette.primary[700])
      })
    }, 50)
  }

  /**
   * Check all the layers availability on the web map/web scene
   * @param useMapWidgetIds Array of map widget id
   */
  onMapWidgetSelected = (useMapWidgetIds: string[]) => {
    this.resetAnalysisLayersConfig()
    setTimeout(() => {
      this.props.onSettingChange({
        id: this.props.id,
        useMapWidgetIds: useMapWidgetIds
      })
    }, 100)

    let isNoneMapSelected: boolean
    if (useMapWidgetIds.length > 0) {
      isNoneMapSelected = false
      this.checkLayersAvailability(useMapWidgetIds)
    } else { //display the warning message to select the web map or web scene
      isNoneMapSelected = true
      //load the config for useDataSource
      setTimeout(() => {
        this.props.onSettingChange({
          id: this.props.id,
          useDataSources: Immutable([])
        } as any)
      }, 100)
    }
    this.updateConfigForMapWidget(isNoneMapSelected)
  }

  /**
   * Reset the analysis layers config when map gets reset
  */
  resetAnalysisLayersConfig = () => {
    //Reset analysis layers config parameters
    this.props.onSettingChange({
      id: this.props.id,
      config: this.props.config.set('configInfo', {})
    })
  }

  /**
   * Update the config as per the map selection
   * @param isMapWidgetAvailable Parameter to check map widget availability
   */
  updateConfigForMapWidget = (isMapWidgetAvailable: boolean) => {
    setTimeout(() => {
      this.props.onSettingChange({
        id: this.props.id,
        config: this.props.config.set('useMapWidget', !isMapWidgetAvailable)
      })
    }, 50)
    this.setState({
      mapWidgetExists: !isMapWidgetAvailable,
      isNoMapSelected: isMapWidgetAvailable
    })
  }

  /**
   * Set the default config info for the selected data source
   * @param dataSourceId dataSource id for setting the config
   */
  setDefaultConfigForDataSource = (dataSourceId: string) => {
    // eslint-disable-next-line no-prototype-builtins
    if (!this.props.config.configInfo.hasOwnProperty(dataSourceId)) {
      const config = defaultConfigInfo
      //default heading label config of search setting
      config.searchSettings.headingLabel = this.nls('locationLabel')
      this.props.onSettingChange({
        id: this.props.id,
        config: this.props.config.setIn(['configInfo', dataSourceId], config)
      })

      //load the config for useDataSource
      let tempUseDataSources = []
      tempUseDataSources = Object.assign(tempUseDataSources, this.props.useDataSources)
      setTimeout(() => {
        this.props.onSettingChange({
          id: this.props.id,
          useDataSources: Immutable(tempUseDataSources)
        } as any)
      }, 100)
    }
  }

  //wait for all the jimu layers and dataSource loaded
  waitForChildDataSourcesReady = async (mapView: JimuMapView): Promise<DataSource> => {
    await mapView?.whenAllJimuLayerViewLoaded()
    const ds = DataSourceManager.getInstance().getDataSource(mapView?.dataSourceId)
    if (ds?.isDataSourceSet && !ds.areChildDataSourcesCreated()) {
      return ds.childDataSourcesReady().then(() => ds).catch(err => ds)
    }
    return Promise.resolve(ds)
  }

  /**
  *Check feature layers availability in web map/web scene.
   If it is available then only widget will proceed to further settings
  * @param useMapWidgetIds map widget id
  */
  checkLayersAvailability = async (useMapWidgetIds) => {
    const updatedMapViewGroups = this.mvManager.getJimuMapViewGroup(useMapWidgetIds)

    if (updatedMapViewGroups?.jimuMapViews) {
      if (this._mapLoadedTimer) {
        clearTimeout(this._mapLoadedTimer)
      }

      const dataSourceOption = []
      for (const idx in updatedMapViewGroups.jimuMapViews) {
        if (updatedMapViewGroups.jimuMapViews[idx].dataSourceId) {
          if (updatedMapViewGroups.jimuMapViews[idx].status === JimuMapViewStatus.Loaded) {
            const allLayerDsId: LayerDsId[] = []
            const dataSourceId: string = updatedMapViewGroups.jimuMapViews[idx].dataSourceId
            //load the analysis config for selected datasource
            this.setDefaultConfigForDataSource(dataSourceId)
            const jimuMapView = MapViewManager.getInstance().getJimuMapViewById(updatedMapViewGroups.jimuMapViews[idx].id)
            await this.waitForChildDataSourcesReady(jimuMapView).finally(async () => {
              await getAllAvailableLayers(updatedMapViewGroups.jimuMapViews[idx].id).then((allDsLayers) => {
                this.setState({
                  isLayerAvailable: true,
                  jimuMapViewId: updatedMapViewGroups.jimuMapViews[idx].id
                })
                if (updatedMapViewGroups.jimuMapViews[idx].isActive || updatedMapViewGroups.jimuMapViews[idx].isActive === undefined) {
                  this.setState({
                    activeDataSource: allDsLayers.length > 0 ? updatedMapViewGroups.jimuMapViews[idx].dataSourceId : ''
                  })
                }
                allDsLayers.forEach((layer) => {
                  allLayerDsId.push({
                    layerDsId: layer.id
                  })
                })
                const addedDsOption = this.canAddDataSource(updatedMapViewGroups.jimuMapViews[idx].dataSourceId, dataSourceOption)
                if (addedDsOption) {
                  dataSourceOption.push({
                    label: this.getDataSourceLabel(updatedMapViewGroups.jimuMapViews[idx].dataSourceId),
                    value: updatedMapViewGroups.jimuMapViews[idx].dataSourceId,
                    isValid: allDsLayers.length > 0,
                    availableLayers: allLayerDsId
                  })
                }
              })
            })
          } else {
            this._mapLoadedTimer = setTimeout(() => {
              this.checkLayersAvailability(useMapWidgetIds)
            }, 50)
          }
        } else {
          this.setState({
            isLayerAvailable: false
          })
        }
      }
      this.setState({
        dataSources: dataSourceOption
      }, () => {
        this.updateConfigAsPerNewWebMap()
      })
    } else {
      this._mapLoadedTimer = setTimeout(() => {
        this.checkLayersAvailability(useMapWidgetIds)
      }, 50)
    }
  }

  /**
   * Avoid duplicate addition of datasources in map settings
   * @param dataSourceId data source id
   * @param dataSourceOptions datasources to be added
   * @returns returns whether to add datsource
   */
  canAddDataSource = (dataSourceId: string, dataSourceOptions): boolean => {
    let isAddDs: boolean = true

    // eslint-disable-next-line
    dataSourceOptions.some((dsOption) => {
      if (dsOption.value === dataSourceId) {
        isAddDs = false
      }
    })
    return isAddDs
  }

  /**
   * Get data source label
   * @param dataSourceId Specifies data source id
   * @returns data source label
   */
  getDataSourceLabel = (dataSourceId: string): string => {
    if (!dataSourceId) {
      return ''
    }
    const dsObj = getSelectedLayerInstance(dataSourceId)
    const label = dsObj.getLabel()
    return label || dataSourceId
  }

  /**
   * Update the config when new web map is used
   */
  updateConfigAsPerNewWebMap = async () => {
    let dataSourcesToMatch = []
    if (this.props.useMapWidgetIds?.length > 0) {
      const mapViewGroup = this.mvManager.getJimuMapViewGroup(this.props.useMapWidgetIds[0])
      const config = this.props.config.configInfo.asMutable({ deep: true })
      if (mapViewGroup?.jimuMapViews) {
        for (const id in mapViewGroup.jimuMapViews) {
          if (mapViewGroup.jimuMapViews[id].dataSourceId) {
            dataSourcesToMatch.push(mapViewGroup.jimuMapViews[id].dataSourceId)
          } else {
            dataSourcesToMatch = []
          }
        }

        //Remove unwanted data from config
        for (const dsId in config) {
          if (!dataSourcesToMatch.includes(dsId)) {
            delete config[dsId]
          }
        }

        //remove the layers which are not available in the webmap/scene
        for (const id in mapViewGroup.jimuMapViews) {
          const dsId = mapViewGroup.jimuMapViews[id].dataSourceId
          if (config[dsId] && mapViewGroup.jimuMapViews[id].status === JimuMapViewStatus.Loaded) {
            await getAllAvailableLayers(mapViewGroup.jimuMapViews[id].id).then((allDsLayers) => {
              const allLayersIds = []
              allDsLayers.forEach((layer) => {
                allLayersIds.push(layer.id)
              })
              //Loop through all analysis layers settings configuration
              //Any layer which does not falls in the layer arrays
              //are not present in the webmap/webscene
              //delete those layers from the configuration
              this.props.config.configInfo[dsId].analysisSettings?.layersInfo?.forEach((layerDetails) => {
                if (!allLayersIds.includes(layerDetails.useDataSource.dataSourceId)) {
                  const analysisLayersInfos: LayersInfo[] = config[dsId].analysisSettings.layersInfo
                  const deleteIndex = analysisLayersInfos.findIndex(layerDt => layerDt.useDataSource.dataSourceId === layerDetails.useDataSource.dataSourceId)
                  if (deleteIndex > -1) {
                    analysisLayersInfos.splice(deleteIndex, 1)
                  }
                }
              })
            })
          }
        }

        setTimeout(() => {
          this.props.onSettingChange({
            id: this.props.id,
            config: this.props.config.set('configInfo', Immutable(config))
          })
        }, 100)
        setTimeout(() => {
          this.saveUseDataSourcesProps(this.props.useDataSources as any)
        }, 200)
      }
    }
  }

  /**
  Show data source settings in side popper
  */
  toggleTimeout: NodeJS.Timer
  showDsPanel = (item: any, index?: number) => {
    this.setSidePopperAnchor(index)
    if (index === this.index) {
      this.setState({
        showDataItemPanel: !this.state.showDataItemPanel,
        showWarningMessage: !item.isValid
      })
      this.maintainStatesOnDsClick(item)
    } else {
      this.setState({
        showDataItemPanel: true,
        showWarningMessage: !item.isValid
      })
      this.maintainStatesOnDsClick(item)
      this.index = index
    }
    this.setDefaultConfigForDataSource(item.value)
  }

  maintainStatesOnDsClick = (item) => {
    this.setState({
      dataSourceName: item.label,
      activeDataSource: item.value,
      isSearchSettingsOpen: false,
      isAnalysisSettingsOpen: false
    }, () => {
      this.setState({
        isSearchSettingsOpen: true,
        isAnalysisSettingsOpen: true
      })
    })
  }

  setSidePopperAnchor = (index?: number) => {
    const node: any = this.analysisSettingPopperTrigger.current.getElementsByClassName('jimu-tree-item__body')[index]
    this.setState({
      popperFocusNode: node
    })
  }

  /**
  * Create label elements in the individual data source list items
  */
  createDsElement = (item: any, index: number) => {
    const _dataSourceOptions = (
      <div key={index}
        className={'data-item align-items-center'}>
        <div className={'data-item-name w-100'} title={item.label}>{item.label}</div>
        {!item.isValid &&
          (<div style={{ paddingLeft: 5, paddingRight: 5 }}>
            <WarningOutlined size='m' color='#ff0000' />
          </div>)
        }
      </div>
    )
    return _dataSourceOptions
  }

  /**
  *Close Data source side popper
  */
  onCloseDataItemPanel = () => {
    this.setState({
      showDataItemPanel: false
    })
    this.index = 0
  }

  onToggleGeneralSettings = () => {
    this.setState({
      isGeneralSettingsOpen: !this.state.isGeneralSettingsOpen
    })
  }

  onToggleSearchSettings = () => {
    this.setState({
      isSearchSettingsOpen: !this.state.isSearchSettingsOpen
    })
  }

  onToggleAnalysisSettings = () => {
    this.setState({
      isAnalysisSettingsOpen: !this.state.isAnalysisSettingsOpen
    })
  }

  /**
   * On change of config update the value
   * @param property General setting config property
   * @param value General setting config value
   */
  updateGeneralSettings = (property: string, value: string | boolean) => {
    this.props.onSettingChange({
      id: this.props.id,
      config: this.props.config.setIn(['generalSettings', property], value)
    })
  }

  /**
   * On change of config update the value
   * @param property Search setting config property
   * @param value Search setting config value
   */
  updateSearchSettings = (property: string, value: string | boolean | number) => {
    this.props.onSettingChange({
      id: this.props.id,
      config: this.props.config.setIn(['configInfo', this.state.activeDataSource, 'searchSettings', property], value)
    })
  }

  /**
   * @param property Analysis setting config property
   * @param value Analysis setting config value
   * @param isLayerConfigured Check whether there is changes in the added analysis layers
   */
  updateAnalysisSettings = (property: string, value: string | boolean | LayersInfo[]) => {
    this.props.onSettingChange({
      id: this.props.id,
      config: this.props.config.setIn(['configInfo', this.state.activeDataSource, 'analysisSettings', property], value)
    })
  }

  /**
   * Save the props for useDataSources for the added layers
   * @param layersInfos Selected layers in analysis settings
   */
  saveUseDataSourcesProps = (useDataSources: UseDataSource[]) => {
    const selectedUseDs = []
    let getUniqueDs = []

    const uniqueUseDataSources: UseDataSource[] = useDataSources?.length > 0 ? useDataSources?.filter((useDs, index) => useDataSources.findIndex(obj => obj.dataSourceId === useDs.dataSourceId) === index) : []
    if (uniqueUseDataSources.length > 0) {
      uniqueUseDataSources.forEach((useDs, index) => {
        //only add the use datas sources which is available in config
        // eslint-disable-next-line no-prototype-builtins
        if (this.props.config.configInfo.hasOwnProperty(useDs.rootDataSourceId)) {
          const layersInfo: LayersInfo[] = this.props.config.configInfo[useDs.rootDataSourceId].analysisSettings.layersInfo
          if (layersInfo.length > 0) {
            layersInfo.forEach((analysis) => {
              if (analysis.useDataSource.dataSourceId === useDs.dataSourceId) {
                selectedUseDs.length > 0
                  ? selectedUseDs?.forEach((ds) => {
                    if (!(ds.dataSourceId === useDs.dataSourceId)) {
                      selectedUseDs.push(useDs)
                    }
                  })
                  : selectedUseDs.push(useDs)
              }
            })
          }
        }
      })
    }

    //get unique use datasources
    getUniqueDs = selectedUseDs.length > 0
      ? selectedUseDs?.filter((useDs, index) => selectedUseDs.findIndex(obj => obj.dataSourceId === useDs.dataSourceId) === index)
      : []
    setTimeout(() => {
      this.props.onSettingChange({
        id: this.props.id,
        useDataSources: getUniqueDs
      })
    }, 100)
  }

  render () {
    return (
      <div css={getStyle(this.props.theme)} className='h-100'>
        <div className={'widget-setting-near-me'}>
          {/* Map Selector*/}
          <SettingSection className={classNames('map-selector-section', { 'border-0': this.state.isNoMapSelected })}>
            <SettingRow>
              <div className={'text-truncate setting-text-level-0'} title={this.nls('selectMapWidgetLabel')}>
                {this.nls('selectMapWidgetLabel')}
              </div>
            </SettingRow>
            <SettingRow>
              <MapWidgetSelector onSelect={this.onMapWidgetSelected.bind(this)} useMapWidgetIds={this.props.useMapWidgetIds} />
            </SettingRow>

            {this.props.useMapWidgetIds && this.props.useMapWidgetIds.length > 0 && this.state.mapWidgetExists && !this.state.isLayerAvailable &&
              <SettingRow>
                <Alert tabIndex={0}
                  onClose={function noRefCheck () { }}
                  open={!this.state.isLayerAvailable}
                  text={this.nls('warningMsgIfNoLayersOnMap')}
                  type={'warning'}
                />
              </SettingRow>
            }
          </SettingSection>

          {/* no map tips */}
          {this.state.isNoMapSelected &&
            <div className='d-flex placeholder-container justify-content-center align-items-center'>
              <div className='d-flex text-center placeholder justify-content-center align-items-center '>
                <ClickOutlined size={48} className='d-flex icon mb-2' />
                <p className='hint'>{this.nls('selectMapHint')}</p>
              </div>
            </div>}

          {/* if map is selected then show the further settings */}
          {this.props.useMapWidgetIds && this.props.useMapWidgetIds.length > 0 && this.state.mapWidgetExists && this.state.isLayerAvailable &&
            <React.Fragment>
              <SettingSection>
                <SettingRow>
                  <Label tabIndex={0} aria-label={this.nls('dataConfigLabel')} title={this.nls('dataConfigLabel')}
                    className='w-100 d-flex' style={{ maxWidth: '88%' }}>
                    <div className='text-truncate flex-grow-1 color-label setting-text-level-0'>
                      {this.nls('dataConfigLabel')}
                    </div>
                  </Label>
                  <Tooltip role={'tooltip'} tabIndex={0} aria-label={this.nls('dataConfigTooltip')}
                    title={this.nls('dataConfigTooltip')} showArrow placement='top'>
                    <div className='ml-2 d-inline'>
                      <InfoOutlined />
                    </div>
                  </Tooltip>
                </SettingRow>
                <SettingRow>
                  <Label tabIndex={0} aria-label={this.nls('mapSettingsHintMsg')} className='font-italic w-100 d-flex'>
                    <div className='flex-grow-1 text-break setting-text-level-3'>
                      {this.nls('mapSettingsHintMsg')}
                    </div>
                  </Label>
                </SettingRow>
                <SettingRow>
                  <div ref={this.analysisSettingPopperTrigger} className='w-100'>
                    <List
                      itemsJson={Array.from(this.state.dataSources).map((options: any, index) => ({
                        itemStateDetailContent: options,
                        itemStateChecked: this.state.showDataItemPanel && this.index === index,
                        itemKey: `${index}`
                      }))}
                      dndEnabled={false}
                      onClickItemBody={(actionData, refComponent) => {
                        const { itemJsons } = refComponent.props
                        const currentItemJson = itemJsons[0]
                        const listItemJsons = itemJsons[1] as any
                        this.showDsPanel(currentItemJson.itemStateDetailContent, listItemJsons.indexOf(currentItemJson))
                      }}
                      overrideItemBlockInfo={() => {
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
                        return this.createDsElement(currentItemJson.itemStateDetailContent, listItemJsons.indexOf(currentItemJson))
                      }}
                    />
                  </div>
                </SettingRow>
              </SettingSection>

              {/* General Settings */}
              <SettingSection>
                <CollapsablePanel
                  label={this.nls('generalSettingsLabel')}
                  aria-label={this.nls('generalSettingsLabel')}
                  isOpen={this.state.isGeneralSettingsOpen}
                  onRequestOpen={() => { this.onToggleGeneralSettings() }}
                  onRequestClose={() => { this.onToggleGeneralSettings() }}>
                  <SettingRow flow='wrap'>
                    <GeneralSetting
                      intl={this.props.intl}
                      theme={this.props.theme2}
                      config={this.props.config.generalSettings}
                      onGeneralSettingsUpdated={this.updateGeneralSettings} />
                  </SettingRow>
                </CollapsablePanel>
              </SettingSection>
            </React.Fragment>
          }
          {this.props.useMapWidgetIds && this.props.useMapWidgetIds.length > 0 && this.state.mapWidgetExists && this.state.isLayerAvailable &&
            <SidePopper css={getMainSidePopperStyle(this.props.theme)} isOpen={this.state.showDataItemPanel && !urlUtils.getAppIdPageIdFromUrl().pageId}
              position={'right'}
              trigger={this.analysisSettingPopperTrigger?.current}
              toggle={this.onCloseDataItemPanel.bind(this)}
              backToFocusNode={this.state.popperFocusNode}
              title={this.state.dataSourceName}>
              {/* Warning message for invalid data source */}
              {this.state.showWarningMessage &&
                <SettingRow>
                  <Alert tabIndex={0} className={'warningMsg'}
                    onClose={function noRefCheck () { }}
                    open={this.state.showWarningMessage}
                    text={this.nls('warningMsgIfNoLayersOnMap')}
                    type={'warning'}
                  />
                </SettingRow>
              }
              {!this.state.showWarningMessage &&
                <React.Fragment>
                  {/* Search Settings */}
                  <SettingSection>
                    <CollapsablePanel
                      label={this.nls('searchSettingsLabel')}
                      aria-label={this.nls('searchSettingsLabel')}
                      isOpen={this.state.isSearchSettingsOpen}
                      onRequestOpen={() => { this.onToggleSearchSettings() }}
                      onRequestClose={() => { this.onToggleSearchSettings() }}>
                      <SettingRow flow='wrap'>
                        <SearchSetting
                          intl={this.props.intl}
                          theme={this.props.theme2}
                          config={this.props.config.configInfo?.[this.state.activeDataSource]?.searchSettings}
                          onSearchSettingsUpdated={this.updateSearchSettings} />
                      </SettingRow>
                    </CollapsablePanel>
                  </SettingSection>

                  {/* Analysis Settings */}
                  <SettingSection>
                    <CollapsablePanel
                      label={this.nls('analysisSettingsLabel')}
                      aria-label={this.nls('analysisSettingsLabel')}
                      isOpen={this.state.isAnalysisSettingsOpen}
                      onRequestOpen={() => { this.onToggleAnalysisSettings() }}
                      onRequestClose={() => { this.onToggleAnalysisSettings() }}>
                      <SettingRow flow='wrap'>
                        <AnalysisSetting
                          widgetId={this.props.id}
                          intl={this.props.intl}
                          theme={this.props.theme}
                          selectedDs={this.state.activeDataSource}
                          activeDsLayersConfig={this.props.config.configInfo?.[this.state.activeDataSource]?.analysisSettings}
                          allFeatureLayers={this.state.dataSources}
                          useDataSourceConfig={this.props.useDataSources as any}
                          onAnalysisSettingsUpdated={this.updateAnalysisSettings}
                          getAddedLayersInfoUseDs={this.saveUseDataSourcesProps} />
                      </SettingRow>
                    </CollapsablePanel>
                  </SettingSection>
                </React.Fragment>
              }
            </SidePopper>
          }
        </div>
      </div>
    )
  }
}
