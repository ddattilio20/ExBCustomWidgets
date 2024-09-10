import { type UseDataSource, type Expression, type ImmutableObject } from 'jimu-core'
import { type FontFamilyValue } from 'jimu-ui'

export interface Config {
  generalSettings: GeneralSettings
  configInfo: any
}

export interface GeneralSettings {
  highlightColor: string
  noResultsFoundText: string
  noResultMsgStyleSettings: NoResultsFontStyleSettings
}

export interface NoResultsFontStyleSettings {
  fontFamily: FontFamilyValue
  fontBold: boolean
  fontItalic: boolean
  fontUnderline: boolean
  fontStrike: boolean
  fontColor: string
  fontSize: string
}

export interface SearchSettings {
  headingLabel: string
  defineSearchArea: boolean
  bufferDistance: number
  distanceUnits: string
  searchByCurrentMapExtent: boolean
}

export interface AnalysisSettings {
  onlyShowLayersResult: boolean
  layersInfo: LayersInfo[]
  displayFeatureCount: boolean
  displayAnalysisIcon: boolean
}

export interface LayersInfo {
  useDataSource: UseDataSource
  label: string
  analysisInfo: ClosestAnalysis | ProximityAnalysis | SummaryAnalysis
}

export interface ClosestAnalysis {
  analysisType: string
  closestFeatureMaxDistance: number
  distanceUnit: string
  expandOnOpen: boolean
}

export interface ProximityAnalysis {
  analysisType: string
  displayField: string
  sortFeaturesByDistance: boolean
  sortFeatures: SortFeatures
  groupFeaturesEnabled: boolean
  groupFeatures: GroupFeatures
  sortGroupsByCount: boolean
  highlightResultsOnMap: boolean
  expandOnOpen: boolean
  expandFeatureDetails: boolean
}

export interface SortFeatures {
  sortFeaturesByField: string
  sortFeaturesOrder: string
}

export interface GroupFeatures {
  groupFeaturesByField: string
  groupFeaturesOrder: string
}

export interface SummaryAnalysis {
  analysisType: string
  isSingleColorMode: boolean
  singleFieldColor: string
  summaryFields: SummaryFieldsInfo[]
  highlightResultsOnMap: boolean
  expandOnOpen: boolean
}

export interface SummaryFieldsInfo {
  fieldLabel: string
  fieldColor: string
  summaryFieldInfo: SumOfAreaLengthParam & Expression
}

export interface SumOfAreaLengthParam {
  summaryBy: string
  showSeparator: boolean
  numberFormattingOption: string
  significantDigits: number
}

export interface SelectedExpressionInfo {
  fieldLabel: string
  selectedExpression: Expression
}

export interface SummaryExpressionFieldInfo {
  fieldLabel: string
  fieldColor: string
  summaryFieldInfo: Expression
}

export interface CurrentLayer {
  layerDsId: string
  analysisType: string
}

export interface ColorUpdate {
  _fieldLabel: string
  _fillColor: string
}

export interface ColorMatchUpdate {
  [value: string]: ColorUpdate
}

export interface ColorMatch {
  _fillColor: string
}

export interface ColorMatches {
  [value: string]: ColorMatch
}

export interface SelectedLayers {
  label: string
  layer: LayerDsId
}

export interface LayerDsId {
  layerDsId: string
}

export interface FontSize {
  distance: number
  unit: string
}

export interface DataSourceOptions {
  label: string
  value: string
  isValid: boolean
  availableLayers: LayerDsId[]
}

export const enum AnalysisTypeName {
  Closest = 'closest',
  Proximity = 'proximity',
  Summary = 'summary'
}

export type IMConfig = ImmutableObject<Config>
