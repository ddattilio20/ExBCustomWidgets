import { type DataSource, DataSourceManager, Immutable, DataSourceTypes, type ImmutableObject, getAppStore } from 'jimu-core'
import { MapViewManager } from 'jimu-arcgis'
import { type ColorMatches, type ColorMatchUpdate } from '../config'

/**
 * Get the combination of colors
 * @param _colorMatches Update the color depending on the color match
 * @param colors Array of colors
 * @returns colors for each fields
 */

export const applyColorMatchColors = (_colorMatches: ColorMatchUpdate | ImmutableObject<ColorMatches>, colors: string[]): ImmutableObject<ColorMatches> => {
  if (!colors) return
  let colorMatches = Immutable({}) as ImmutableObject<ColorMatches>
  Object.entries(_colorMatches).forEach(([name, _match], index) => {
    const color = getColorMatchColor(colors, index)
    const newItem = { ..._match }
    newItem._fillColor = color
    colorMatches = colorMatches.set(name, newItem)
  })
  return colorMatches
}

/**
 * Get color for each element
 * @param colors Array of colors
 * @param index From 0 to number
 * @returns Specific colors
 */

const getColorMatchColor = (colors: string[], index: number = 0): string => {
  if (!colors?.length) return
  const idx = index % colors.length
  const color = colors[idx]
  return color
}

/**
 * Get the instance of current layer datasource
 * @param currentLayerDsId Current layer datasource used
 * @returns layer datasource instance
 */
export const getSelectedLayerInstance = (currentLayerDsId: string): DataSource => {
  return DataSourceManager.getInstance().getDataSource(currentLayerDsId)
}

//Specifies unit wise buffer limits
const enum UnitWiseMaxDistance {
  Feet = 5280000,
  Miles = 1000,
  Kilometers = 1609.344,
  Meters = 1609344,
  Yards = 1760000
}

/**
 * Limits a buffer distance.
 * @param unit Measurement units, e.g., feet, miles, meters
 * @returns The max value for the selected unit,
 */

export const getMaxBufferLimit = (unit: string) => {
  switch (unit) {
    case 'feet':
      return UnitWiseMaxDistance.Feet
    case 'miles':
      return UnitWiseMaxDistance.Miles
    case 'kilometers':
      return UnitWiseMaxDistance.Kilometers
    case 'meters':
      return UnitWiseMaxDistance.Meters
    case 'yards':
      return UnitWiseMaxDistance.Yards
    default:
      return 1000
  }
}

/**
 * Limits the distance to max of the selected unit
 * @param distance Distance subject to limit
 * @param unit Measurement units, e.g., feet, miles, meters
 * @return `distance` capped at the maximum for the `unit` type
 */

export const validateMaxBufferDistance = (distance: number, unit: string) => {
  const maxDistanceForUnit = getMaxBufferLimit(unit)
  if (distance > maxDistanceForUnit) {
    return maxDistanceForUnit
  }
  return distance
}

/**
 * Get all the available layers from the webmap/webscene
 * @param mapViewGroup specifies the map view group of the selected webmap/webscene
 * @returns all available layers
 */
export const getAllAvailableLayers = async (mapViewId: string): Promise<DataSource[]> => {
  let layerInstance = null
  const allDsLayers = []
  let dsAdded = false
  //get the layer views which includes different types layers e.g. map-image, feature layer
  const jimuMapView = MapViewManager.getInstance().getJimuMapViewById(mapViewId)
  const jimuLayerViews = await jimuMapView?.whenAllJimuLayerViewLoaded()

  for (const jimuLayerViewId in jimuLayerViews) {
    const currentJimuLayerView = await jimuMapView.whenJimuLayerViewLoaded(jimuLayerViewId)
    layerInstance = getSelectedLayerInstance(currentJimuLayerView.layerDataSourceId)
    if (layerInstance) {
      if (layerInstance?.type === DataSourceTypes.MapService || layerInstance?.type === DataSourceTypes.GroupLayer) {
        const childDs = layerInstance.getChildDataSources()
        childDs.forEach((layerInstance) => {
          allDsLayers.push(layerInstance)
        })
      } else { //for feature layer
        if (allDsLayers.length > 0) { //check for if map service child data source is same as feature layer ds id
          const matchedLayerWithMapService = allDsLayers.find(item => item.id === layerInstance.id)
          if (!matchedLayerWithMapService) {
            dsAdded = true
          }
          if (dsAdded) allDsLayers.push(layerInstance)
        } else {
          allDsLayers.push(layerInstance)
        }
      }
    }
  }
  return allDsLayers
}

/**
 * Get the default selected display field for proximity
 * @param layerDefinition selected layers definition
 * @returns displayfield
 */
export const getDisplayField = (layerDefinition): string => {
  let displayField: string = ''
  if (layerDefinition.objectIdField) {
    displayField = layerDefinition.objectIdField
  } else if (layerDefinition.displayField) {
    displayField = layerDefinition.displayField
  } else {
    displayField = layerDefinition.fields[0].name
  }
  return displayField
}

/**
 * Get the display label for groups and feature list
 * @param label group field value or display field value
 * @param noValueNlsString string to be displayed in case of no value
 * @returns display label for groups and feature list
 */
export const getDisplayLabel = (label: any, noValueNlsString: string): string => {
  let title = label
  if (typeof (title) === 'string') {
    title = title.trim()
  }
  return [null, undefined, ''].includes(title) ? noValueNlsString : title
}

/**
 * Get the portal default unit
 * @returns portal default unit
 */
export const getPortalUnit = (): string => {
  const portalSelf = getAppStore().getState().portalSelf
  return portalSelf?.units === 'english' ? 'miles' : 'kilometers'
}
