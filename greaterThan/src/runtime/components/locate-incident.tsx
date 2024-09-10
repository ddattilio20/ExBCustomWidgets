/** @jsx jsx */
import { React, jsx, type IntlShape, type IMThemeVariables } from 'jimu-core'
import { Button, Label, Tooltip, defaultMessages as jimuUIDefaultMessages } from 'jimu-ui'
import { getLocateIncidentStyle } from '../lib/style'
import { PinEsriOutlined } from 'jimu-icons/outlined/gis/pin-esri'
import { PolylineOutlined } from 'jimu-icons/outlined/gis/polyline'
import { PolygonOutlined } from 'jimu-icons/outlined/gis/polygon'
import { ResetOutlined } from 'jimu-icons/outlined/editor/reset'
import { type SearchSettings } from '../../config'
import defaultMessages from '../translations/default'
import type Graphic from 'esri/Graphic'
import { type JimuMapView } from 'jimu-arcgis'
import GraphicsLayer from 'esri/layers/GraphicsLayer'
import { MapOutlined } from 'jimu-icons/outlined/gis/map'
import SketchViewModel from 'esri/widgets/Sketch/SketchViewModel'
import { getSketchSymbol } from '../../common/highlight-symbol-utils'
import reactiveUtils from 'esri/core/reactiveUtils'
import { InfoOutlined } from 'jimu-icons/outlined/suggested/info'

interface Props {
  theme: IMThemeVariables
  intl: IntlShape
  config: SearchSettings
  headingLabel: string
  jimuMapView: JimuMapView
  highlightColor: string
  sketchComplete: (sketchedGraphic: Graphic) => void
  refreshClicked: () => void
  searchByMapAreaClicked: () => void
  drawToolSelectionChange: () => void
}

interface State {
  isPolygonActive: boolean
  isPointActive: boolean
  isPolyLineActive: boolean
  searchSettings: SearchSettings
  currentSketchVM: SketchViewModel
  showInfoIcon: boolean
}

export default class LocateIncident extends React.PureComponent<Props, State> {
  constructor (props) {
    super(props)

    this.state = {
      isPolygonActive: false,
      isPointActive: false,
      isPolyLineActive: false,
      searchSettings: this.props.config,
      currentSketchVM: null,
      showInfoIcon: false
    }
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
    if (this.props.jimuMapView?.view) {
      //create the skecth view model instance
      this.createSketchVmInstance()
      if (this.props.config.searchByCurrentMapExtent) {
        this.onSearchClicked()
      }

      reactiveUtils.when(() => this.props.jimuMapView?.view?.stationary, () => {
        if (this.props.config.searchByCurrentMapExtent) {
          this.setState({
            showInfoIcon: true
          })
        }
      })
    }
  }

  /**
   * Create a new instance of sketchViewModel include point, polyline and polygon symbol
   */
  createSketchVmInstance = () => {
    const sketchVM = new SketchViewModel({
      view: this.props.jimuMapView?.view ? this.props.jimuMapView.view : null,
      layer: new GraphicsLayer(),
      pointSymbol: getSketchSymbol('point', this.props.highlightColor),
      polylineSymbol: getSketchSymbol('polyline', this.props.highlightColor),
      polygonSymbol: getSketchSymbol('polygon', this.props.highlightColor)
    })

    sketchVM.on('create', this.onCreateComplete)

    this.setState({
      currentSketchVM: sketchVM
    })
  }

  /**
   * Check the current config property or runtime property changed in live view
   * @param prevProps previous property
   */
  componentDidUpdate = (prevProps) => {
    //check if mapview changed at runtime then destroy the existing sketch view model instance
    if (prevProps.jimuMapView.id !== this.props.jimuMapView.id) {
      if (this.state.currentSketchVM && !this.state.currentSketchVM.destroyed) {
        this.state.currentSketchVM.destroy()
        this.createSketchVmInstance()
      }
    }

    //check if searchByCurrentMapExtent config is changed
    if (this.props.config.searchByCurrentMapExtent !== prevProps.config.searchByCurrentMapExtent) {
      if (this.props.config.searchByCurrentMapExtent) {
        this.onSearchClicked()
      }
    }

    //updates the highlight color in live mode when the color is changes and tool is active
    if (this.props.highlightColor !== prevProps.highlightColor && this.state.currentSketchVM) {
      if (this.state.isPolygonActive) {
        this.state.currentSketchVM.set('polygonSymbol', getSketchSymbol('polygon', this.props.highlightColor))
      } else if (this.state.isPolyLineActive) {
        this.state.currentSketchVM.set('polylineSymbol', getSketchSymbol('polyline', this.props.highlightColor))
      } else if (this.state.isPointActive) {
        this.state.currentSketchVM.set('pointSymbol', getSketchSymbol('point', this.props.highlightColor))
      }
    }
  }

  /**
   * On widget delete cancel the sketch view model
   */
  componentWillUnmount = () => {
    if (this.state.currentSketchVM) {
      this.state.currentSketchVM?.cancel()
    }
  }

  /**
   * emit event on search by map area icon is clicked
   */
  onSearchClicked = () => {
    if (this.state.showInfoIcon) {
      this.setState({
        showInfoIcon: false
      })
    }
    this.props.searchByMapAreaClicked()
    this.clearAll()
  }

  /**
   * emit event on search by rest button is clicked
   */
  onResetButtonClick = () => {
    this.props.refreshClicked()
  }

  /**
   * clear all graphics layer and states
   */
  clearAll = () => {
    if (this.state.currentSketchVM) {
      this.state.currentSketchVM.cancel()
    }
    this.props.jimuMapView.clearSelectedFeatures()
    this.setState({
      isPolygonActive: false,
      isPointActive: false,
      isPolyLineActive: false
    })
  }

  /**
   * handles draw tool selection change event
   * @param toolBtn selected tool
   */
  onDrawToolBtnChanges = (toolBtn: 'polygon' | 'point' | 'polyline') => {
    this.props.drawToolSelectionChange()
    this.clearAll()
    switch (toolBtn) {
      case 'polygon':
        if (this.state.isPolygonActive) {
          this.state.currentSketchVM.cancel()
        } else {
          this.state.currentSketchVM.set('polygonSymbol', getSketchSymbol('polygon', this.props.highlightColor))
          this.state.currentSketchVM.create('polygon')
          this.setState({
            isPolygonActive: true,
            isPointActive: false,
            isPolyLineActive: false
          })
        }
        break
      case 'point':
        if (this.state.isPointActive) {
          this.state.currentSketchVM.cancel()
        } else {
          this.state.currentSketchVM.set('pointSymbol', getSketchSymbol('point', this.props.highlightColor))
          this.state.currentSketchVM.create('point')
          this.state.currentSketchVM.pointSymbol.size = 14
          this.setState({
            isPolygonActive: false,
            isPointActive: true,
            isPolyLineActive: false
          })
        }
        break
      case 'polyline':
        if (this.state.isPolyLineActive) {
          this.state.currentSketchVM.cancel()
        } else {
          this.state.currentSketchVM.set('polylineSymbol', getSketchSymbol('polyline', this.props.highlightColor))
          this.state.currentSketchVM.create('polyline')
          this.setState({
            isPolygonActive: false,
            isPointActive: false,
            isPolyLineActive: true
          })
        }
        break
      default:
        this.state.currentSketchVM.cancel()
    }
  }

  /**
   * handle sketch view complete event
   * @param event sketch view complete event
   */
  onCreateComplete = (event) => {
    if (event.state === 'complete') {
      //emit event sketch complete
      this.props.sketchComplete(event)
      this.setState({
        isPointActive: false,
        isPolyLineActive: false,
        isPolygonActive: false
      })
    }
  }

  render () {
    return (
      <div css={getLocateIncidentStyle(this.props.theme)} className="jimu-widget">
        <div>
          <div className={this.props.config.searchByCurrentMapExtent ? 'mb-2' : ''}>
            <Label className={'headingLabel mb-0'}>
              <span className={this.props.config.searchByCurrentMapExtent ? 'align-middle' : ''}>{this.props.headingLabel}</span>
              {this.props.config.searchByCurrentMapExtent && this.state.showInfoIcon &&
                <Tooltip role={'tooltip'} tabIndex={0} aria-label={this.nls('mapExtentChangeInfoMsg')}
                  title={this.nls('mapExtentChangeInfoMsg')} showArrow placement='top'>
                  <span className='ml-3 d-inline pointer'>
                    <InfoOutlined />
                  </span>
                </Tooltip>
              }
            </Label>
          </div>

          {!this.props.config.searchByCurrentMapExtent &&
            <div className='w-100 d-flex locate-incident-section'>
              <div className='column-section icon-verticalLine pr-1'>
                <Button type='tertiary' className='action-button' icon aria-label={this.nls('point')} title={this.nls('point')} active={this.state.isPointActive} onClick={() => { this.onDrawToolBtnChanges('point') }} ><PinEsriOutlined size={'m'} /></Button>
                <Button type='tertiary' className='action-button' icon aria-label={this.nls('polyline')} title={this.nls('polyline')} active={this.state.isPolyLineActive} onClick={() => { this.onDrawToolBtnChanges('polyline') }} ><PolylineOutlined size={'m'} /></Button>
                <Button type='tertiary' className='action-button' icon aria-label={this.nls('polygon')} title={this.nls('polygon')} active={this.state.isPolygonActive} onClick={() => { this.onDrawToolBtnChanges('polygon') }} ><PolygonOutlined size={'m'} /></Button>
              </div>
              <div className='column-section'>
                <Button type='tertiary' className='action-button' aria-label={this.nls('reset')} icon title={this.nls('reset')} onClick={this.onResetButtonClick}><ResetOutlined size={'m'} /></Button>
              </div>
            </div>
          }

          {this.props.config.searchByCurrentMapExtent &&
            <div className={'column-section shadow-sm w-100'} onClick={this.onSearchClicked}>
              <Button className='w-100' onClick={this.onSearchClicked} size="default" aria-label={this.nls('searchByCurrentMapExtent')} title={this.nls('searchByCurrentMapExtent')}>
                <MapOutlined size={'m'} />
                <label className={'mb-0 align-middle'}>{this.nls('updateResultsLabel')}</label>
              </Button>
            </div>
          }
        </div>
      </div>
    )
  }
}
