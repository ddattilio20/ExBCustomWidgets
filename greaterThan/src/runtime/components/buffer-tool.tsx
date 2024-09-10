/** @jsx jsx */
import { React, jsx, type IMThemeVariables, geometryUtils } from 'jimu-core'
import { Label, NumericInput, Select, Option } from 'jimu-ui'
import { getBufferStyle } from '../lib/style'
import type Geometry from 'esri/geometry/Geometry'
import { unitOptions } from '../constant'
import { getMaxBufferLimit, validateMaxBufferDistance } from '../../common/utils'
import { defaultBufferDistance } from '../../setting/constants'

interface Props {
  theme?: IMThemeVariables
  geometry: __esri.Geometry
  distanceUnit: string
  bufferDistance: number
  bufferHeaderLabel: string
  refreshButtonClicked: boolean
  bufferComplete: (bufferGeometry: Geometry) => void
  distanceChanged: (distanceValue: number) => void
  unitChanged: (unit: string) => void
}

interface State {
  distanceUnit: string
  bufferDistance: number
}

export default class BufferTool extends React.PureComponent<Props, State> {
  constructor (props) {
    super(props)
    this.state = {
      distanceUnit: this.props?.distanceUnit,
      bufferDistance: this.props?.bufferDistance
    }
  }

  /**
   * On buffer tool mount update the units and get the buffer geometry
   */
  componentDidMount = () => {
    this.props.unitChanged(this.state.distanceUnit)
    this.getBufferGeometry()
  }

  /**
   * Check the current config property or runtime property changed in live view
   * @param prevProps previous property
   */
  componentDidUpdate = (prevProps) => {
    //check if inicdent buffer geometry is changed
    if (this.props?.geometry !== prevProps?.geometry) {
      this.getBufferGeometry()
    }

    //check if distance units value is changed
    if (this.props?.distanceUnit !== prevProps.distanceUnit) {
      this.setState({
        distanceUnit: this.props?.distanceUnit
      }, () => {
        //valid current distance as per unit
        this.onUnitChange(this.props.distanceUnit)
      })
    }

    //check if buffer distance value is changed
    if (this.props?.bufferDistance !== prevProps.bufferDistance) {
      this.setState({
        bufferDistance: this.props?.bufferDistance
      }, () => {
        this.props.distanceChanged(this.props?.bufferDistance)
        this.getBufferGeometry()
      })
    }

    //check if refresh button clicked props changed
    if (prevProps?.refreshButtonClicked !== this.props?.refreshButtonClicked) {
      if (this.props.refreshButtonClicked) {
        this.setState({
          bufferDistance: this.props.bufferDistance,
          distanceUnit: this.props.distanceUnit
        })
      }
    }
  }

  /**
   * get planar/geodesic buffer polygons at a specified distance around the input geometry
   */
  getBufferGeometry = async () => {
    if (this.props.geometry) {
      if (this.state.bufferDistance && this.state.distanceUnit && this.state.bufferDistance > 0) {
        const bufferGeometry = await geometryUtils.createBuffer(this.props.geometry, [this.state.bufferDistance], this.state.distanceUnit)
        //as we will always deal with only one geometry get first geometry only
        const firstGeom = Array.isArray(bufferGeometry) ? bufferGeometry[0] : bufferGeometry
        this.props.bufferComplete(firstGeom)
      } else {
        this.props.bufferComplete(null)
      }
    }
  }

  /**
   * handle change event for distance box
   * @param value updated distance value
   */
  onDistanceChange = (value: number | undefined) => {
    this.setState({
      bufferDistance: value ?? defaultBufferDistance
    })
  }

  /**
 * handle accept value event for distance box
 * @param value updated distance value
 */
  onDistanceAcceptValue = (value: number | undefined) => {
    this.setState({
      bufferDistance: value ?? defaultBufferDistance
    }, () => {
      this.updateDistance()
    })
  }

  /**
   * Update the distanceChanged props and get the buffer geometry
   */
  updateDistance = () => {
    this.props.distanceChanged(this.state.bufferDistance)
    this.getBufferGeometry()
  }

  /**
   * handle change event for unit select
   * @param value updated unit value
   */
  onUnitChange = (value: string) => {
    const bufferDistanceMaxLimit = validateMaxBufferDistance(this.state.bufferDistance, value)
    this.props.distanceChanged(bufferDistanceMaxLimit)
    this.props.unitChanged(value)
    this.setState({
      distanceUnit: value,
      bufferDistance: bufferDistanceMaxLimit
    }, () => {
      this.getBufferGeometry()
    })
  }

  render () {
    return (
      <div css={getBufferStyle(this.props?.theme)}>
        <Label className='mb-0 headingLabel'>{this.props.bufferHeaderLabel}</Label>
        <div className={'d-inline w-100 pt-1'} >
          <div className='column-section'>
            <NumericInput aria-label={this.props.bufferHeaderLabel} className='w-50' value={this.state.bufferDistance} onAcceptValue={this.onDistanceAcceptValue} onChange={this.onDistanceChange} size='sm' min={0} max={getMaxBufferLimit(this.state.distanceUnit)}/>
            <Select aria-label={this.props.bufferHeaderLabel} className='w-50 pl-2' size={'sm'} value={this.state.distanceUnit} onChange={(evt) => { this.onUnitChange(evt.target.value) }}>
              {unitOptions.map((option, index) => {
                return <Option key={index} value={option.value}>{option.label}</Option>
              })}
            </Select>
          </div>
        </div>
      </div>
    )
  }
}
