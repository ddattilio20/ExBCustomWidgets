/** @jsx jsx */
import { React, jsx, type IntlShape, type IMThemeVariables } from 'jimu-core'
import { getLayerAccordionStyle, getCardStyle } from '../lib/style'
import defaultMessages from '../translations/default'
import { Button, Icon, Collapse, Label, type IconComponentProps, Row } from 'jimu-ui'
import { DownOutlined } from 'jimu-icons/outlined/directional/down'
import { RightOutlined } from 'jimu-icons/outlined/directional/right'
import { ExportOutlined } from 'jimu-icons/outlined/editor/export'
import { getDisplayLabel } from '../../common/utils'

interface Props {
  theme: IMThemeVariables
  key: number
  intl: IntlShape
  analysisIcon?: IconComponentProps
  label: string
  featureCount?: number
  isExpanded: boolean
  isListView?: boolean
  children?: React.ReactNode
  onToggle?: (index: number, isExpanded: boolean) => void
  index?: number
  onDownload?: (index: number, dsId: string, analysisType?: string) => void
  dsId?: string
  analysisType?: string
  showExportButton?: boolean
}

interface State {
  isFeatureLayerOpen: boolean
  isIconDown: boolean
  label: string
  layerLabelWidth: string
  displayAnalysisIcon: boolean
  displayFeatureCount: boolean
  showExportButton: boolean
}

export default class LayerAccordion extends React.PureComponent<Props, State> {
  public layerData = []
  constructor (props) {
    super(props)

    this.state = {
      isFeatureLayerOpen: this.props.isExpanded,
      isIconDown: !this.props.isExpanded,
      label: this.props?.label,
      layerLabelWidth: '',
      displayAnalysisIcon: !!this.props.analysisIcon,
      displayFeatureCount: !!this.props.featureCount,
      showExportButton: this.props.showExportButton
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
    this.updateLayerLabelWidth()
  }

  /**
   * Check the current config property or runtime property changed in live view
   * @param prevProps previous property
   */
  componentDidUpdate = (prevProps) => {
    //check if analysis icon config or feature count config is changed
    //accrodingly update the UI at runtime
    if (prevProps.analysisIcon !== this.props.analysisIcon ||
      prevProps.featureCount !== this.props.featureCount) {
      this.setState({
        displayAnalysisIcon: !!this.props.analysisIcon,
        displayFeatureCount: !!this.props.featureCount
      }, () => {
        this.updateLayerLabelWidth()
      })
    }
  }

  /**
   * calculate and update width for layer label
   */
  updateLayerLabelWidth = () => {
    let layerLabelWidth: number
    if (this.props.isListView) {
      if (this.state.displayAnalysisIcon && this.state.displayFeatureCount) {
        layerLabelWidth = 130
      } else if (!this.state.displayAnalysisIcon && !this.state.displayFeatureCount) {
        layerLabelWidth = 50
      } else if (this.state.displayAnalysisIcon && !this.state.displayFeatureCount) {
        layerLabelWidth = 80
      } else if (!this.state.displayAnalysisIcon && this.state.displayFeatureCount) {
        layerLabelWidth = 100
      }
      if (!this.state.showExportButton) {
        layerLabelWidth = layerLabelWidth - 24
      }
      this.setState({
        layerLabelWidth: 'calc(100% -' + ' ' + layerLabelWidth + 'px)'
      })
    } else {
      if (this.state.displayFeatureCount) {
        this.setState({
          layerLabelWidth: 'calc(100% - 64px) !important'
        })
      } else {
        this.setState({
          layerLabelWidth: 'calc(100% - 24px) !important'
        })
      }
    }
  }

  /**
   * toggles right/down icon click
   */
  onToggleSelectedLayer = () => {
    this.setState({
      isFeatureLayerOpen: !this.state.isFeatureLayerOpen,
      isIconDown: !this.state.isIconDown
    }, () => {
      if (this.props.onToggle) {
        this.props.onToggle(this.props.index, this.state.isFeatureLayerOpen)
      }
    })
  }

  /**
   * Download the csv
   * @param e click event
   */
  onDownloadClick = (e) => {
    e.stopPropagation()
    if (this.props.onDownload) {
      this.props.onDownload(this.props.index, this.props.dsId, this.props.analysisType)
    }
  }

  render () {
    let styles = getLayerAccordionStyle(this.props.theme, this.state.layerLabelWidth)
    if (!this.props.isListView) {
      styles = getCardStyle(this.props.theme, this.state.layerLabelWidth)
    }
    const title = getDisplayLabel(this.props.label, this.nls('noValueForDisplayField'))
    const formattedFeatureCount = this.props.intl.formatNumber(this.props.featureCount, { maximumFractionDigits: 0 })
    return (
        <div css={styles} className={this.props.isListView ? 'layer-Container shadow py-1 w-100' : 'layer-Container border py-0 w-100 card rounded-sm'}>
          <Row flow='wrap'>
            <div tabIndex={0} className='layer-title-Container' onClick={this.onToggleSelectedLayer.bind(this)}
              aria-label={this.props.label} role={'button'} aria-expanded={this.state.isFeatureLayerOpen} onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  this.onToggleSelectedLayer()
                }
              }}>

              {this.state.displayAnalysisIcon &&
                <div className='icon'>
                  <Icon size={'m'} icon={this.props.analysisIcon} />
                </div>
              }

              <div className='layer-title'>
                <Label className='label-title text-break' title={title}>
                  {title}
                </Label>
              </div>

              {this.props.isListView && this.props.showExportButton &&
                <Button tabIndex={0} type='tertiary' className='p-0' title={this.nls('exportBtnTitle')} icon aria-label={this.nls('exportBtnTitle')} onClick={this.onDownloadClick.bind(this)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      this.onDownloadClick(e)
                    }
                  }}>
                  <ExportOutlined size={'m'} title={this.nls('exportBtnTitle')}/>
                </Button>
              }

              {this.state.displayFeatureCount && <Label className='count mx-0' title= {formattedFeatureCount}>{formattedFeatureCount}</Label>}
              <Button tabIndex={-1} type='tertiary' className='p-0' icon aria-label={this.props.label}>
                { this.state.isIconDown && <RightOutlined size={'m'} autoFlip /> }
                { !this.state.isIconDown && <DownOutlined size={'m'} /> }
              </Button>
            </div>
          </Row>
        {
          <Collapse isOpen={this.state.isFeatureLayerOpen} className='w-100'>
              {this.props.children}
          </Collapse>
        }

        </div>
    )
  }
}
