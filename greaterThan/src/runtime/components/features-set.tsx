/** @jsx jsx */ // <-- make sure to include the jsx pragma
import { React, jsx, type IntlShape, type IMThemeVariables, type DataRecord } from 'jimu-core'
import { Row, Button, Label } from 'jimu-ui'
import defaultMessages from '../translations/default'
import { type JimuMapView } from 'jimu-arcgis'
import { type IMConfig } from '../../config'
import { Collapse } from 'reactstrap/lib'
import { RightOutlined } from 'jimu-icons/outlined/directional/right'
import { getFeaturesSetStyles } from '../lib/style'
import { DownOutlined } from 'jimu-icons/outlined/directional/down'
import { getHighLightSymbol } from '../../common/highlight-symbol-utils'
import type GraphicsLayer from 'esri/layers/GraphicsLayer'
import Feature from 'esri/widgets/Feature'
import { getDisplayLabel } from '../../common/utils'

interface Props {
  intl: IntlShape
  key: number
  theme: IMThemeVariables
  config: IMConfig
  popupTitleField: string
  jimuMapView: JimuMapView
  selectedRecord: DataRecord
  selectedFeatureLength: number
  distanceUnit: string
  isExpanded: boolean
  approximateDistanceUI?: boolean
  isGroup: boolean
  graphicLayer?: GraphicsLayer
  flashOnOpen: boolean
  children?: React.ReactNode
}
interface State {
  isFeatureLayerOpen: boolean
  isIconRight: boolean
  title: string
  isTitleLoaded: boolean
  featureItem: JSX.Element
}

export default class FeaturesSet extends React.PureComponent<Props, State> {
  public popUpContent: React.RefObject<HTMLDivElement>
  constructor (props) {
    super(props)
    this.popUpContent = React.createRef()

    if (this.props.config) {
      this.state = {
        isFeatureLayerOpen: this.props.isExpanded,
        isIconRight: !this.props.isExpanded,
        title: '',
        isTitleLoaded: false,
        featureItem: null
      }
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

  componentDidMount = () => {
    //for closest and proximity with expanded list
    if (!this.props.popupTitleField || (this.props.popupTitleField && this.props.isExpanded)) {
      this.createFeatureItem()
    }
  }

  /**
   * Create the feature module using feature record
   */
  createFeature = () => {
    const featureRecord = this.props.selectedRecord as any
    if (featureRecord?.feature) {
      const container = document && document.createElement('div')
      container.className = 'jimu-widget bg-transparent pointer'
      this.popUpContent.current.appendChild(container)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const featureWidget = new Feature({
        container: container,
        graphic: featureRecord.feature,
        map: this.props.jimuMapView.view.map,
        spatialReference: this.props.jimuMapView.view.spatialReference,
        defaultPopupTemplateEnabled: !featureRecord.feature.layer.popupTemplate
      })
    }
  }

  /**
   * Get the popup title for aria-label
   * @returns string popup title for aria-label
   */
  displayPopupTitle = (): string => {
    let popupTitle = ''
    if (this.props.selectedRecord) {
      popupTitle = this.props.selectedRecord.getFormattedFieldValue(this.props.popupTitleField, this.props.intl)
    }
    return getDisplayLabel(popupTitle, this.nls('noValueForDisplayField'))
  }

  /**
   * On toggle the layer the feature details section will show or collapse
   */
  onToggleSelectedLayer = () => {
    if (!this.props.isExpanded) {
      this.setState({
        isFeatureLayerOpen: !this.state.isFeatureLayerOpen,
        isIconRight: !this.state.isIconRight
      }, () => {
        if (this.state.isFeatureLayerOpen) {
          if (this.props.flashOnOpen) {
            this.onFeatureDetailsClick()
          }
          if (!this.state.featureItem) {
            this.createFeatureItem()
          }
        }
      })
    }
  }

  /**
   * On feature details click highlight the feature or flash it on the map
   */
  onFeatureDetailsClick = () => {
    const featureRecord = this.props.selectedRecord as any
    if (featureRecord) {
      if (featureRecord.getFeature().geometry) {
        this.flashOnMap(this.props.selectedRecord)
      } else {
        featureRecord._dataSource.queryById(this.props.selectedRecord.getId()).then((record) => {
          this.flashOnMap(record)
        })
      }
    }
  }

  /**
   * Flashes the features graphic and zooms map to the graphic location
   * @param record - Data record which has a geometry to be flashed on map
   */
  flashOnMap = (record: DataRecord) => {
    const featureRecord = record as any
    const graphics = getHighLightSymbol(featureRecord?.getFeature(), '#FFFF00')
    if (this.props.graphicLayer && graphics) {
      this.props.graphicLayer.removeAll()
      this.props.graphicLayer.add(graphics)
      //zoom to the incident/buffer geometry
      this.props.jimuMapView?.view.goTo({
        center: graphics.geometry.type === 'point' ? graphics.geometry : graphics.geometry.extent.expand(5)
      })
      setTimeout(() => {
        this.props.graphicLayer.removeAll()
      }, 800)
    }
  }

  /**
   * On expand list create each feature item with its approximate distance and feature details
   */
  createFeatureItem = () => {
    const featureRecord = this.props.selectedRecord as any
    let individualFeatureItem: JSX.Element = null
    const formattedDistance = this.props.intl.formatNumber(featureRecord.feature.distance, { maximumFractionDigits: 2 })
    individualFeatureItem = (
      <div>
        {/* show approximateDistanceUI - closet, proximity with expanded list */}
        {this.props.approximateDistanceUI &&
          <div className='approximateDist-container border-bottom'>
            <div className='approximateDist-label'>
              <Label className='mb-0'>
                {this.nls('approximateDistance')}
              </Label>
            </div>
            <Label tabIndex={-1} className='approximateDist mb-0 font-weight-bold'>
              <div tabIndex={0} aria-label={this.getAriaLabelString(this.nls('approximateDistance'), formattedDistance, this.props.distanceUnit)}>
                {this.getLabelForDistUnit(formattedDistance, this.props.distanceUnit)}
              </div>
            </Label>
          </div>
        }
        <div tabIndex={0} className='mt-2 pb-2 pointer' ref={this.popUpContent} onClick={this.onFeatureDetailsClick.bind(this)} />
      </div>
    )
    this.setState({
      featureItem: individualFeatureItem
    }, () => {
      this.createFeature()
    })
  }

  /**
   * Get the feature title width according to the group and distance feature
   * @returns string feature title width
   */
  getTitleWidth = (): string => {
    const featureRecord = this.props.selectedRecord as any
    const featureDistance = featureRecord.feature.distance
    let featureTitleWidth: string
    if (this.props.isGroup && featureDistance !== undefined) {
      featureTitleWidth = 'calc(100% - 128px)'
    } else if (this.props.isGroup && featureDistance === undefined) {
      featureTitleWidth = 'calc(100% - 29px)'
    } else if (!this.props.isGroup && featureDistance !== undefined) {
      featureTitleWidth = 'calc(100% - 126px)'
    } else if (!this.props.isGroup && featureDistance === undefined) {
      featureTitleWidth = 'calc(100% - 26px)'
    }
    return featureTitleWidth
  }

  /**
   * Get the string for aria label
   * @param approximateDistanceLabel approximateDistance Label
   * @param formattedDistance  formatted Distance
   * @param distanceUnit  distance Unit
   * @returns aria label string
   */
  getAriaLabelString = (approximateDistanceLabel: string, formattedDistance: string, distanceUnit: string): string => {
    let getAriaLabel = ''
    getAriaLabel = this.props.intl.formatMessage({
      id: 'ariaLabelString', defaultMessage: defaultMessages.ariaLabelString
    }, { label: approximateDistanceLabel, formattedDist: formattedDistance, distUnit: distanceUnit })
    return getAriaLabel
  }

  /**
   * Get label for distance and unit
   * @param formattedDistance formatted Distance
   * @param distanceUnit distance Unit
   * @returns distance unit label
   */
  getLabelForDistUnit = (formattedDistance: string, distanceUnit: string): string => {
    let getLabelForDistanceUnit = ''
    getLabelForDistanceUnit = this.props.intl.formatMessage({
      id: 'distanceUnitLabel', defaultMessage: defaultMessages.distanceUnitLabel
    }, { distanceLabel: formattedDistance, unitLabel: distanceUnit })
    return getLabelForDistanceUnit
  }

  render () {
    const featureRecord = this.props.selectedRecord as any
    const featureTitleWidth = this.getTitleWidth()
    const displayPopupTitle = this.displayPopupTitle()
    let featureTitleAriaLabel = displayPopupTitle
    let formattedDistance: string
    if (featureRecord.feature.distance !== undefined) {
      formattedDistance = this.props.intl.formatNumber(featureRecord.feature.distance, { maximumFractionDigits: 2 })
      featureTitleAriaLabel = this.getAriaLabelString(featureTitleAriaLabel, formattedDistance, this.props.distanceUnit)
    }
    const featuresSetStyles = getFeaturesSetStyles(this.props.theme, featureTitleWidth)
    return (
      <div className='feature-container border-top w-100' css={featuresSetStyles}>
        {/* proximity without expanded list */}
        {this.props.selectedFeatureLength > 0 && this.props.popupTitleField && !this.props.isExpanded &&
          <React.Fragment>
            <Row flow='wrap'>
              <div className={!this.props.approximateDistanceUI && this.state.isFeatureLayerOpen ? 'feature-title-container border-bottom' : 'feature-title-container'} onClick={this.onToggleSelectedLayer.bind(this)}
                tabIndex={0} role={'button'} aria-label={featureTitleAriaLabel} onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    if (!this.props.isExpanded) {
                      this.onToggleSelectedLayer()
                    }
                  }
                }}>
                <div className='feature-title'>
                  <Label className={this.props.isExpanded ? 'label-title expand-list-label-title' : 'label-title'}>
                    {displayPopupTitle}
                  </Label>
                </div>
                <div className='d-inline-flex'>
                  {featureRecord.feature.distance !== undefined &&
                    <Label className='approximateDist pt-1 pr-1'>
                      {this.getLabelForDistUnit(formattedDistance, this.props.distanceUnit)}
                    </Label>
                  }
                  <Button tabIndex={-1} type='tertiary' icon role={'button'} aria-expanded={this.state.isFeatureLayerOpen} className={'actionButton p-0'}>
                    { this.state.isIconRight && <RightOutlined size={'m'} autoFlip /> }
                    { !this.state.isIconRight && <DownOutlined size={'m'} /> }
                  </Button>
                </div>
              </div>
            </Row>

            <Collapse isOpen={this.state.isFeatureLayerOpen} className='w-100'>
              {this.state.featureItem}
            </Collapse>
          </React.Fragment>
        }

        {/* proximity with expanded list */}
        {this.props.popupTitleField && this.props.isExpanded &&
          this.state.featureItem
        }

        {/* Closest */}
        {this.props.selectedFeatureLength === 1 && !this.props.popupTitleField &&
          this.state.featureItem
        }
      </div>
    )
  }
}
