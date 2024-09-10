/** @jsx jsx */
import { type Expression, Immutable, jsx, utils, type IMThemeVariables, type UseDataSource, type DataRecord, ReactResizeDetector } from 'jimu-core'
import { RichTextDisplayer, Row } from 'jimu-ui'
import React from 'react'
import { getSummaryCardStyle } from '../lib/style'
import { type SumOfAreaLengthParam } from '../../config'

interface Props {
  widgetId: string
  theme: IMThemeVariables
  useDataSource: UseDataSource
  fieldLabel: string
  fieldColor: string
  summaryFieldInfo: SumOfAreaLengthParam & Expression
  records: DataRecord[]
  summaryDisplayValue: string
}

interface State {
  formattedExpression: string
  textColor: string
  fieldLabelWidth: string
}

export default class SummaryFieldCard extends React.PureComponent<Props, State> {
  private readonly summaryValue: React.RefObject<HTMLDivElement>
  private readonly summaryField: React.RefObject<HTMLDivElement>
  private readonly summaryCardParent: React.RefObject<HTMLDivElement>
  constructor (props) {
    super(props)
    this.summaryValue = React.createRef()
    this.summaryField = React.createRef()
    this.summaryCardParent = React.createRef()
    this.state = {
      formattedExpression: null,
      textColor: '',
      fieldLabelWidth: ''
    }
  }

  /**
   * On component mount update the summary value and summary text value
   */
  componentDidMount = () => {
    this.updateSummaryValue()
    this.updateTextColor()
  }

  /**
   * Check the current config property or runtime property changed in live view
   * @param prevProps previous property
   */
  componentDidUpdate = (prevProps) => {
    //check if summaryDisplayValue is changed
    if (prevProps.summaryDisplayValue !== this.props.summaryDisplayValue) {
      this.updateSummaryValue()
    }
    //check if field color is changed
    if (prevProps.fieldColor !== this.props.fieldColor) {
      this.updateTextColor()
    }
  }

  /**
   * Update summary value and get the formatted expression value depending on the config values
   */
  updateSummaryValue = () => {
    let formattedExpression: string
    if (this.props.useDataSource && this.props.summaryFieldInfo) {
      const expression: SumOfAreaLengthParam & Expression = this.props.summaryFieldInfo
      if (Object.prototype.hasOwnProperty.call(this.props.summaryFieldInfo, 'summaryBy')) {
        formattedExpression = this.props.summaryDisplayValue.toString()
      } else {
        formattedExpression = this.getExpressionString(expression)
      }
      this.setState({
        formattedExpression: formattedExpression
      })
    }
  }

  /**
   * Update text color according to the configured field color
   */
  updateTextColor = () => {
    const textColor = this.getTextColor(this.props.fieldColor)
    this.setState({
      textColor: textColor
    })
  }

  /**
   * Adjust the field label width on resize of the widget
   */
  onResize = (widgetWidth: number) => {
    if (widgetWidth > 0) {
      setTimeout(() => {
        // if widget size is below 280 then show value in next row
        // else show label and value in one row
        if (widgetWidth < 280) {
          this.setState({
            fieldLabelWidth: '100%'
          })
        } else {
          const summaryValueWidth = this.summaryValue.current.offsetWidth + 9
          const summaryFieldWidth = this.summaryField.current.offsetWidth
          const summaryCardWidth = this.summaryCardParent.current.offsetWidth - 16
          const totalFieldValueWidth = summaryFieldWidth + summaryValueWidth
          //change card width is less than its content or label width is 100%
          if (totalFieldValueWidth <= summaryCardWidth || summaryCardWidth === summaryFieldWidth + 8) {
            if (summaryValueWidth > 0) {
              this.setState({
                fieldLabelWidth: 'calc(100% -' + ' ' + summaryValueWidth + 'px)'
              })
            }
          }
        }
      }, 50)
    }
  }

  /**
   * get the text color depending on the field color
   * @param hexcolor configured field color
   * @returns text color
   */
  getTextColor = (hexcolor) => {
    const r = parseInt(hexcolor.substr(1, 2), 16)
    const g = parseInt(hexcolor.substr(3, 2), 16)
    const b = parseInt(hexcolor.substr(4, 2), 16)
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000
    // Return white color if to dark, else black
    return (yiq < 60) ? '#FFFFFF' : '#000000'
  }

  /**
   * get the formatted expression string value
   * @param expression configured expression
   * @returns formatted expression
   */
  getExpressionString = (expression: Expression): string => {
    try {
      let string = JSON.stringify(expression)
      string = encodeURIComponent(string)

      const { parts } = expression
      let functionDsid = ''
      let multiExpDom = ''

      parts.forEach(part => {
        const { dataSourceId: dsid } = part
        if (dsid) functionDsid = dsid
        if (functionDsid !== '') return false
      })

      const uniqueid = utils.getUUID()
      const expDom = document && document.createElement('exp')
      expDom.setAttribute('data-uniqueid', uniqueid)
      expDom.setAttribute('data-dsid', functionDsid)
      expDom.setAttribute('data-expression', string)
      expDom.innerHTML = expression.name
      multiExpDom += expDom.outerHTML
      return multiExpDom
      // return string
    } catch (error) {
      console.error(error)
      return ''
    }
  }

  render () {
    const recordInfo = {}
    recordInfo[this.props.useDataSource.dataSourceId] = this.props.records
    const classes = 'summaryCard pl-2 pr-2 pt-4 pb-4 mb-2 rounded-lg summaryBgColor shadow-sm'
    return (
      <div css={getSummaryCardStyle(this.props.theme, this.props.fieldColor, this.state.textColor, this.state.fieldLabelWidth)}>
        <Row flow='wrap'>
          <div className={classes} ref={this.summaryCardParent}>
            <div ref={this.summaryField} className='field textColor text-break mr-2'>
              <label className='w-100 mb-0'>{this.props.fieldLabel}</label>
            </div>
            {this.props.useDataSource && this.state.formattedExpression &&
              <div ref={this.summaryValue}>
                <RichTextDisplayer
                  className={'font-weight-bold summary-value textColor'}
                  widgetId={this.props.widgetId}
                  records={recordInfo}
                  useDataSources={Immutable([this.props.useDataSource]) as any}
                  value={this.state.formattedExpression}
                />
              </div>
            }
          </div>
        </Row>
        <ReactResizeDetector handleWidth handleHeight onResize={this.onResize} />
      </div>
    )
  }
}
