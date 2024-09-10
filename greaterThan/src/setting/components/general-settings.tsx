/** @jsx jsx */ // <-- make sure to include the jsx pragma
import { React, jsx, type IntlShape, type IMThemeVariables } from 'jimu-core'
import { SettingRow } from 'jimu-ui/advanced/setting-components'
import defaultMessages from '../translations/default'
import { Label, TextArea, Tooltip, type FontFamilyValue } from 'jimu-ui'
import { type FontSize, type NoResultsFontStyleSettings, type GeneralSettings } from '../../config'
import { ThemeColorPicker } from 'jimu-ui/basic/color-picker'
import { InfoOutlined } from 'jimu-icons/outlined/suggested/info'
import { getTheme2 } from 'jimu-theme'
import { FontFamily } from 'jimu-ui/advanced/rich-text-editor'
import { FontStyle, type FontStyles, InputUnit } from 'jimu-ui/advanced/style-setting-components'

interface Props {
  intl: IntlShape
  theme: IMThemeVariables
  config: GeneralSettings
  onGeneralSettingsUpdated: (prop: string, value: string | boolean | NoResultsFontStyleSettings) => void
}

interface State {
  noResultsFoundMessage: string
  highlightColor: string
  fontFamily: FontFamilyValue
  fontBold: boolean
  fontItalic: boolean
  fontUnderline: boolean
  fontStrike: boolean
  fontColor: string
  fontSize: string
}

export default class GeneralSetting extends React.PureComponent<Props, State> {
  constructor (props) {
    super(props)
    if (this.props.config) {
      this.state = {
        noResultsFoundMessage: this.props.config.noResultsFoundText,
        highlightColor: this.props.config.highlightColor ? this.props.config.highlightColor : '#00FFFF',
        fontFamily: this.props.config.noResultMsgStyleSettings?.fontFamily,
        fontBold: this.props.config.noResultMsgStyleSettings?.fontBold,
        fontItalic: this.props.config.noResultMsgStyleSettings?.fontItalic,
        fontUnderline: this.props.config.noResultMsgStyleSettings?.fontUnderline,
        fontStrike: this.props.config.noResultMsgStyleSettings?.fontStrike,
        fontColor: this.props.config.noResultMsgStyleSettings?.fontColor,
        fontSize: this.props.config.noResultMsgStyleSettings?.fontSize
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

  componentDidUpdate = (prevProps: Props, prevState: State) => {
    if (prevProps.theme.colors.palette.primary[700] !== this.props.theme.colors.palette.primary[700]) {
      this.setState({
        highlightColor: this.props.theme.colors.palette.primary[700]
      }, () => {
        this.props.onGeneralSettingsUpdated('highlightColor', this.state.highlightColor)
      })
    }
  }

  /**
   * on change of color update the highlight color parameter
   * @param Highlight color
   */
  onHighlightColorChange = (color: string) => {
    this.setState({
      highlightColor: color
    }, () => {
      this.props.onGeneralSettingsUpdated('highlightColor', this.state.highlightColor)
    })
  }

  //Update the text message
  onTextChange = (textValue: string) => {
    this.setState({
      noResultsFoundMessage: textValue
    })
    this.props.onGeneralSettingsUpdated('noResultsFoundText', textValue)
  }

  /**
   * Updates the text style config if any parameter is updated
   * @param fontFamily Updated font family
   * @param fontBold Updated font style
   * @param fontItalic Updated font style
   * @param fontUnderline Updated font style
   * @param fontStrike Updated font style
   * @param fontColor Updated font color
   * @param fontSize Updated font size
   */
  textStyleObj = (fontFamily: FontFamilyValue, fontBold: boolean, fontItalic: boolean, fontUnderline: boolean, fontStrike: boolean,
    fontColor: string, fontSize: string) => {
    const textStyle: NoResultsFontStyleSettings = {
      fontFamily: fontFamily,
      fontBold: fontBold,
      fontItalic: fontItalic,
      fontUnderline: fontUnderline,
      fontStrike: fontStrike,
      fontColor: fontColor,
      fontSize: fontSize
    }
    this.props.onGeneralSettingsUpdated('noResultMsgStyleSettings', textStyle)
  }

  /**
   * Gets updated font family on change of config
   * @param font Updated font family
   */
  handleFontChange = (fontFamily: FontFamilyValue) => {
    this.setState({
      fontFamily: fontFamily
    }, () => {
      this.textStyleObj(fontFamily, this.state.fontBold, this.state.fontItalic,
        this.state.fontUnderline, this.state.fontStrike, this.state.fontColor, this.state.fontSize)
    })
  }

  setFontStyleValues = () => {
    this.textStyleObj(this.state.fontFamily, this.state.fontBold, this.state.fontItalic,
      this.state.fontUnderline, this.state.fontStrike, this.state.fontColor, this.state.fontSize)
  }

  /**
   * Gets updated font style on change of config
   * @param fontStyle Updated font styles
   */
  handleFontStyleChange = (fontStyle: FontStyles, selected: boolean) => {
    switch (fontStyle) {
      case 'bold':
        this.setState({
          fontBold: selected
        }, () => {
          this.setFontStyleValues()
        })
        break
      case 'italic':
        this.setState({
          fontItalic: selected
        }, () => {
          this.setFontStyleValues()
        })
        break
      case 'underline'://as underline and strike having the same style 'text-decoration'
        this.setState({
          fontUnderline: selected,
          fontStrike: false
        }, () => {
          this.setFontStyleValues()
        })
        break
      case 'strike'://as underline and strike having the same style 'text-decoration'
        this.setState({
          fontUnderline: false,
          fontStrike: selected
        }, () => {
          this.setFontStyleValues()
        })
        break
    }
  }

  /**
   * Gets updated font color on change of config
   * @param color Updated font color
   */
  handleColorChange = (color: string) => {
    const defaultColor: string = 'var(--black)'
    this.setState({
      fontColor: color || defaultColor
    }, () => {
      this.textStyleObj(this.state.fontFamily, this.state.fontBold, this.state.fontItalic,
        this.state.fontUnderline, this.state.fontStrike, this.state.fontColor, this.state.fontSize)
    })
  }

  /**
   * Gets updated font size on change of config
   * @param size Updated font size
   */
  handleFontSizeChange = (size: FontSize) => {
    if (!size) return
    this.setState({
      fontSize: size.distance + size.unit
    }, () => {
      this.textStyleObj(this.state.fontFamily, this.state.fontBold, this.state.fontItalic,
        this.state.fontUnderline, this.state.fontStrike, this.state.fontColor, this.state.fontSize)
    })
  }

  render () {
    return (
      <div style={{ height: '100%', width: '100%', marginTop: 10 }}>
        <SettingRow>
          <Label className='w-100 d-flex'>
            <div className='flex-grow-1 text-break setting-text-level-3'>
              {this.nls('highlightColor')}
            </div>
          </Label>
          <Tooltip role={'tooltip'} tabIndex={0} aria-label={this.nls('highlightColorTooltip')}
            title={this.nls('highlightColorTooltip')} showArrow placement='top'>
             <div className='setting-text-level-2 mr-3 d-inline'>
              <InfoOutlined />
            </div>
          </Tooltip>
          <ThemeColorPicker aria-label={this.nls('highlightColor')} specificTheme={getTheme2()}
            value={(this.state.highlightColor ? this.state.highlightColor : '#00FFFF')}
            onChange={(color) => { this.onHighlightColorChange(color) }} />
        </SettingRow>

        <SettingRow flow={'wrap'}>
          <Label aria-label={this.nls('noResultsFoundLabel')} title={this.nls('noResultsFoundLabel')}
            className='w-100 d-flex'>
            <div className='text-truncate flex-grow-1 setting-text-level-3'>
              {this.nls('noResultsFoundLabel')}
            </div>
          </Label>
          <TextArea tabIndex={0} className='w-100' name='text' aria-label={this.nls('noResultsFoundLabel') + this.state.noResultsFoundMessage}
              defaultValue={this.props.config.noResultsFoundText || this.nls('noDataMessageDefaultText')}
              onBlur={evt => { this.onTextChange(evt.target.value) }}
            />
        </SettingRow>

        <div className={'w-100 pt-2 pb-2'}>
          <FontFamily className='w-100' font={this.state.fontFamily} onChange={this.handleFontChange} />
          <div className='d-flex justify-content-between mt-2'>
            <FontStyle
              style={{ width: '103px' }}
              onChange={this.handleFontStyleChange}
              bold={this.state.fontBold}
              italic={this.state.fontItalic}
              underline={this.state.fontUnderline}
              strike={this.state.fontStrike}
            />
            <ThemeColorPicker
              style={{ width: '25px' }}
              specificTheme={getTheme2()}
              value={this.state.fontColor}
              onChange={this.handleColorChange}
            />
            <InputUnit
              style={{ width: '76px' }}
              value={this.state.fontSize}
              onChange={this.handleFontSizeChange}
            />
          </div>
        </div>
      </div>
    )
  }
}
