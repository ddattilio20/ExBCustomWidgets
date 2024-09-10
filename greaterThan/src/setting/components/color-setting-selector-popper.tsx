/**@jsx jsx */
import { React, jsx, css, type IntlShape, type IMThemeVariables, type ImmutableObject } from 'jimu-core'
import { type ColorMatches, type ColorMatchUpdate, type ColorUpdate, type SummaryFieldsInfo } from '../../config'
import { applyColorMatchColors } from '../../common/utils'
import { Dropdown, DropdownButton, DropdownItem, DropdownMenu, Label } from 'jimu-ui'
import defaultMessages from '../translations/default'
import { colorSet, colorsStrip1, transparentColor } from '../constants'
import { ThemeColorPicker } from 'jimu-ui/basic/color-picker'
import { getColorSelectorStyle } from '../lib/style'
import { getTheme2 } from 'jimu-theme'

const dropdownStyle = css`
  padding: 12px 0px;
  .jimu-dropdown-item {
    padding: 4px 16px !important;
    &:hover {
      background-color: var(--light-500) !important;
    }
  }
`
const colorStripStyle = css`
  display: flex;
  width: 100%;
  > .color-item {
    width: 30px;
    height: 16px;
  }
`

interface Props {
  intl: IntlShape
  theme: IMThemeVariables
  summaryFieldsInfo: SummaryFieldsInfo[]
  updateFieldColorsValues: (updatedColor: ColorMatches) => void
}

interface State {
  colorUpdate: ColorMatchUpdate | ImmutableObject<ColorMatches>
}

export default class ColorSettingPopper extends React.PureComponent<Props, State> {
  constructor (props) {
    super(props)
    this.state = {
      colorUpdate: this.getFieldsColor()
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

  componentDidUpdate = (prevProps) => {
    if (prevProps.summaryFieldsInfo !== this.props.summaryFieldsInfo) {
      const updateIndividualColor = { ...this.state.colorUpdate }
      this.props.summaryFieldsInfo.forEach((list, index) => {
        updateIndividualColor[list.fieldLabel + '_' + index] = { _fieldLabel: list.fieldLabel, _fillColor: list.fieldColor }
      })
      this.setState({
        colorUpdate: updateIndividualColor
      })
    }
  }

  getFieldsColor = () => {
    const fieldColorJson = {}
    //display the config saved fields color
    this.props.summaryFieldsInfo.forEach((list, index) => {
      fieldColorJson[list.fieldLabel + '_' + index] =
        { _fieldLabel: list.fieldLabel, _fillColor: list.fieldColor === transparentColor ? colorsStrip1[index % colorsStrip1.length] : list.fieldColor }
    })
    return fieldColorJson
  }

  /**
   * Apply the combinations of colors to each summary fields
  */

  onStripColorChange = (e, colors: string[]) => {
    e.stopPropagation()
    //get the combinations of color from selected color strip
    const colorMatches = applyColorMatchColors(this.state.colorUpdate, colors)
    this.setState({
      colorUpdate: colorMatches
    }, () => {
      this.props.updateFieldColorsValues(colorMatches)
    })
  }

  /**
   * Update the individual color fields color settings
  **/
  onIndividualFieldColorChange = (value: string, color: string) => {
    const updateIndividualColor = { ...this.state.colorUpdate }
    updateIndividualColor[value] = { _fillColor: color } as any
    this.setState({
      colorUpdate: updateIndividualColor
    }, () => {
      this.props.updateFieldColorsValues(updateIndividualColor)
    })
  }

  render () {
    return (
      <div style={{ width: '100%', overflow: 'auto' }} css={getColorSelectorStyle}>
        <div className='color-list pt-1 px-3'>
          {Object.entries(this.state.colorUpdate).map(([value, match], index) => {
            const newColor = match as ColorUpdate
            return (
              <div className={'mb-2 colorItemStyle'} key={index}>
                <Label check>
                  <span className='label text-truncate' title={newColor._fieldLabel}>{newColor._fieldLabel}</span>
                   <ThemeColorPicker aria-label={newColor._fieldLabel} specificTheme={getTheme2()} value={(newColor._fillColor)} onChange={(color) => { this.onIndividualFieldColorChange(value, color) }} />
                </Label>
              </div>
            )
          })}
        </div>
        <div className='footer'>
          <div className='px-3' style={{ marginTop: '14px' }}>
            <Dropdown className={'w-100'}>
              <DropdownButton size='sm' title={this.nls('applyColors')}>
                {this.nls('applyColors')}</DropdownButton>
              <DropdownMenu showArrow={true} css={dropdownStyle}>
                <div tabIndex={0}>
                  {
                    colorSet.map((colors, index) => {
                      return <DropdownItem tabIndex={0} className='my-1' key={index} onClick={(e) => { this.onStripColorChange?.(e, colors) }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            this.onStripColorChange?.(e, colors)
                          }
                        }}>
                        <div tabIndex={0} aria-label={this.nls('colorStrip') + index} css={colorStripStyle}>
                          {
                            colors.map((color, index) => {
                              return <div className='color-item' key={index} style={{ backgroundColor: color }}></div>
                            })
                          }
                        </div>
                      </DropdownItem>
                    })
                  }
                </div>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
      </div>
    )
  }
}
