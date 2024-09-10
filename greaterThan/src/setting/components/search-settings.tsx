/** @jsx jsx */ // <-- make sure to include the jsx pragma
import { React, jsx, type IntlShape, type IMThemeVariables } from 'jimu-core'
import { SettingRow } from 'jimu-ui/advanced/setting-components'
import { getSearchSettingStyle } from '../lib/style'
import defaultMessages from '../translations/default'
import { Select, Option, Label, NumericInput, Radio, Switch, Tooltip, TextArea, defaultMessages as jimuUIDefaultMessages } from 'jimu-ui'
import { type SearchSettings } from '../../config'
import { defaultBufferDistance, unitOptions } from '../constants'
import { InfoOutlined } from 'jimu-icons/outlined/suggested/info'
import { validateMaxBufferDistance, getMaxBufferLimit, getPortalUnit } from '../../common/utils'

interface Props {
  intl: IntlShape
  theme: IMThemeVariables
  config: SearchSettings
  onSearchSettingsUpdated: (prop: string, value: string | boolean | number) => void
}

interface State {
  headingLabelText: string
  defineSearchAreaOption: boolean
  bufferDistance: number
  distanceUnits: string
}

export default class SearchSetting extends React.PureComponent<Props, State> {
  constructor (props) {
    super(props)
    if (this.props.config) {
      const configuredBufferDistanceUnit = this.props.config.distanceUnits !== '' ? this.props.config.distanceUnits : getPortalUnit()
      this.state = {
        headingLabelText: this.props.config.headingLabel ? this.props.config.headingLabel : this.nls('locationLabel'),
        defineSearchAreaOption: this.props.config.defineSearchArea,
        bufferDistance: this.props.config.bufferDistance,
        distanceUnits: configuredBufferDistanceUnit
      }
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

  /**
   * update the heading label value
   * @param value value of the heading
   */
  onHeadingLabelChange = (value: string) => {
    this.setState({
      headingLabelText: value
    })
  }

  /**
   * update the config of the heading label
   */
  onHeadingLabelAcceptValue = () => {
    this.props.onSearchSettingsUpdated('headingLabel', this.state.headingLabelText)
  }

  /**
   * Update the config show all features parameter
   * @param evt get the event on toggle the define search area
   */
  onDefineSearchAreaChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      defineSearchAreaOption: evt.target.checked
    }, () => {
      this.props.onSearchSettingsUpdated('defineSearchArea', this.state.defineSearchAreaOption)
      //set the heading label according to the define search area enabled or disabled
      this.setState({
        headingLabelText: !evt.target.checked
          ? this.nls('disabledDefineSearchAreaLabel')
          : this.props.config.searchByCurrentMapExtent
            ? this.nls('currentMapAreaLabel')
            : this.nls('locationLabel')
      }, () => {
        setTimeout(() => {
          this.props.onSearchSettingsUpdated('headingLabel', this.state.headingLabelText)
        }, 100)
      })
    })
  }

  /**
   * Update the buffer unit and buffer distance parameter
   * @param evt get the event after distance unit change
   */
  onDistanceUnitChange = (evt: any) => {
    const bufferDistanceMaxLimit = validateMaxBufferDistance(this.state.bufferDistance, evt.target.value)
    this.props.onSearchSettingsUpdated('bufferDistance', bufferDistanceMaxLimit)
    this.setState({
      distanceUnits: evt.target.value,
      bufferDistance: bufferDistanceMaxLimit
    }, () => {
      setTimeout(() => {
        this.props.onSearchSettingsUpdated('distanceUnits', this.state.distanceUnits)
      }, 50)
    })
  }

  /**
   * Update buffer distance parameter
   * @param value get the value on buffer distance change
   */
  onBufferDistanceChange = (value: number | undefined) => {
    this.setState({
      bufferDistance: value ?? defaultBufferDistance
    }, () => {
      this.props.onSearchSettingsUpdated('bufferDistance', this.state.bufferDistance)
    })
  }

  /**
   * @param isSearchByCurrentMapExtent Check if the map current extent radio button is checked or not
   */
  handleSearchByChange = (isSearchByCurrentMapExtent: boolean) => {
    //set the heading label according to the ccurrent map area and location enabled or disabled
    this.setState({
      headingLabelText: isSearchByCurrentMapExtent ? this.nls('currentMapAreaLabel') : this.nls('locationLabel')
    }, () => {
      setTimeout(() => {
        this.props.onSearchSettingsUpdated('headingLabel', this.state.headingLabelText)
      }, 100)
    })
    this.props.onSearchSettingsUpdated('searchByCurrentMapExtent', isSearchByCurrentMapExtent)
  }

  render () {
    return (
      <div css={getSearchSettingStyle(this.props.theme)} style={{ height: '100%', width: '100%', marginTop: 10 }}>
        <SettingRow>
          <Label className='pr-2 w-100 d-flex'>
            <div className='flex-grow-1 text-break setting-text-level-3'>
              {this.nls('defineSearchAreaLabel')}
            </div>
          </Label>
          <Tooltip role={'tooltip'} tabIndex={0} aria-label={this.nls('defineSearchAreaLabel') + ' ' + this.nls('defineSearchAreaTooltip')}
            title={this.nls('defineSearchAreaTooltip')} showArrow placement='top'>
            <div className='setting-text-level-2 mr-3 d-inline'>
              <InfoOutlined />
            </div>
          </Tooltip>
          <Switch role={'switch'} aria-label={this.nls('defineSearchAreaLabel')} title={this.nls('defineSearchAreaLabel')}
            checked={this.state.defineSearchAreaOption} onChange={this.onDefineSearchAreaChange} />
        </SettingRow>

        {!this.state.defineSearchAreaOption &&
          <SettingRow>
            <Label tabIndex={0} aria-label={this.nls('searchAreaHint')} className='font-italic w-100 d-flex'>
              <div className='flex-grow-1 text-break setting-text-level-3'>
                {this.nls('searchAreaHint')}
              </div>
            </Label>
          </SettingRow>
        }

        {this.state.defineSearchAreaOption &&
          <React.Fragment>
            <SettingRow flow={'wrap'} >
              <Label tabIndex={0} aria-label={this.nls('searchByLabel')} title={this.nls('searchByLabel')}
                className='w-100 d-flex'>
                <div className='text-truncate flex-grow-1 setting-text-level-3'>
                  {this.nls('searchByLabel')}
                </div>
              </Label>
            </SettingRow>

            <SettingRow className={'mt-1'} flow='wrap'>
              <Label className='m-0 w-100' centric>
                <Radio role={'radio'} aria-label={this.nls('currentMapExtent')}
                  className={'cursor-pointer'}
                  value={'currentMapExtent'}
                  onChange={() => { this.handleSearchByChange(true) }}
                  checked={this.props.config.searchByCurrentMapExtent} />
                <div tabIndex={0} className='w-100 text-break' onClick={(e) => { e.preventDefault() }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      this.handleSearchByChange(true)
                    }
                  }}>
                  <span className='ml-1 cursor-pointer' onClick={() => { this.handleSearchByChange(true) }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        this.handleSearchByChange(true)
                      }
                    }}>
                    {this.nls('currentMapExtent')}
                  </span>
                </div>
                <Tooltip role={'tooltip'} tabIndex={0} aria-label={this.nls('currentMapAreaTooltip')}
                  title={this.nls('currentMapAreaTooltip')} showArrow placement='top'>
                  <div className='setting-text-level-2 d-inline' onClick={(e) => { e.preventDefault() }}>
                    <InfoOutlined />
                  </div>
                </Tooltip>
              </Label>
            </SettingRow>

            <SettingRow className={'mt-2'} flow='wrap'>
              <Label className='m-0' centric>
                <Radio role={'radio'} aria-label={this.nls('location')}
                  className={'cursor-pointer'}
                  value={'location'}
                  onChange={() => { this.handleSearchByChange(false) }}
                  checked={!this.props.config.searchByCurrentMapExtent} />
                <div tabIndex={0} className='ml-1 text-break cursor-pointer' onClick={() => { this.handleSearchByChange(false) }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      this.handleSearchByChange(false)
                    }
                  }}>
                  {this.nls('location')}
                </div>
              </Label>
            </SettingRow>

            {!this.props.config.searchByCurrentMapExtent &&
              <React.Fragment>
                <SettingRow className={'mt-3 ml-3'} flow={'wrap'}>
                  <Label title={this.nls('bufferDistance')}
                    className='w-100 d-flex'>
                    <div className='text-truncate flex-grow-1 setting-text-level-3'>
                      {this.nls('bufferDistance')}
                    </div>
                  </Label>
                  <NumericInput aria-label={this.nls('bufferDistance')} style={{ width: '240px' }}
                    size={'sm'} min={0} max={getMaxBufferLimit(this.state.distanceUnits)}
                    defaultValue={this.state.bufferDistance} value={this.state.bufferDistance}
                    onChange={this.onBufferDistanceChange} />
                </SettingRow>

                <SettingRow className={'ml-3'} flow={'wrap'}>
                  <Label title={this.nls('distanceUnits')}
                    className='w-100 d-flex'>
                    <div className='text-truncate flex-grow-1 setting-text-level-3'>
                      {this.nls('distanceUnits')}
                    </div>
                  </Label>
                  <Select style={{ marginBottom: '8px' }} aria-label={this.nls('distanceUnits') + ' ' + this.state.distanceUnits} size={'sm'}
                    value={this.state.distanceUnits} onChange={(evt) => { this.onDistanceUnitChange(evt) }}>
                    {unitOptions.map((option, index) => {
                      return <Option role={'option'} tabIndex={0} aria-label={option.label} value={option.value} key={index}>{option.label}</Option>
                    })}
                  </Select>
                </SettingRow>
              </React.Fragment>
            }
          </React.Fragment>
        }

        <SettingRow label={this.nls('headingLabel')} flow={'wrap'}>
          <TextArea tabIndex={0} className='w-100' spellCheck={false} value={this.state.headingLabelText}
            onChange={evt => { this.onHeadingLabelChange(evt.target.value) }}
            onAcceptValue={this.onHeadingLabelAcceptValue}
            />
        </SettingRow>
      </div>
    )
  }
}
