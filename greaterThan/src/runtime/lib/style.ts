import { type IMThemeVariables, css, type SerializedStyles } from 'jimu-core'

export function getStyle (theme: IMThemeVariables, listMaxHeight: string, textStyle?): SerializedStyles {
  const bgColor = theme.surfaces[1].bg

  return css`
  background-color: ${bgColor};
    .widget-near-me {
      width: 100%;
      height: 100%;
      padding: 5px;
      overflow: auto;
    }

    .layerContainer {
      max-height: ${listMaxHeight};
      overflow: auto;
      width: 100%;
      padding: 8px
    }

    .layer-Container {
      margin-bottom: 10px;
    }

    .card {
      width: 96% !important;
      margin: auto;
      margin-bottom: 0.4rem !important;
    }

    .applyTextStyle {
      font-family: ${textStyle.fontFamily};
      font-weight: ${textStyle.fontBold ? 'bold' : ''};
      font-style: ${textStyle.fontItalic ? 'italic' : ''};
      text-decoration: ${textStyle.fontUnderline ? 'underline' : ''};
      text-decoration: ${textStyle.fontStrike ? 'line-through' : ''};
      color: ${textStyle.fontColor};
      font-size: ${textStyle.fontSize}
    }

    .headingLabel {
      margin: 0 !important;
      font-weight: 500;
    }
  `
}

//get the styles for locate incident component
export function getLocateIncidentStyle (theme: IMThemeVariables): SerializedStyles {
  return css`
    .main-row {
      flex-wrap: wrap;
      display: flex;
    }

    .headingLabel {
      margin: 0 !important;
      font-weight: 500;
    }

    .icon-verticalLine {
      border-right: 1px solid rgba(110,110,110,.3);
    }

    .column-section {
      display: flex;
      align-items: center;
      margin: 6px 0;
    }

    .hidden {
      display: none;
    }

   .pointer {
    cursor: pointer;
   }
  `
}

//get the styles for aoi tool component
export function getAoiToolStyle (theme: IMThemeVariables): SerializedStyles {
  return css`
    .main-row {
      flex-wrap: wrap;
      display: flex;
    }

    .headingLabel {
      margin: 0 !important;
      font-weight: 500;
    }

    .locate-incident {
      min-width: 140px;
      width: 50%;
    }

    .buffer-distance {
      min-width: 140px;
      width: 50%;
      align-items: center;
    }

    .column-section {
      display: flex;
      align-items: center;
      margin: 6px 0;
    }

    .hidden {
      display: none;
    }
  `
}

//get the styles for buffer UI
export function getBufferStyle (theme: IMThemeVariables): SerializedStyles {
  return css`
  .headingLabel {
      margin: 0 !important;
      font-weight: 500;
    }
  `
}

//get the styles for layer accordion component
export function getLayerAccordionStyle (theme: IMThemeVariables, layerLabelWidth: string): SerializedStyles {
  return css`
  .layer-title-Container {
    display: inline-flex;
    -webkit-box-align: baseline;
    align-items: center;
    width: 100%;
    cursor: pointer;
  }

  .icon {
    margin-left: 10px;
    width: 20px;
  }

  .layer-title {
    width:  ${layerLabelWidth};
    padding: 10px 2px 10px 8px;
    font-weight: 500;
    margin-top: 2px;
  }

  .count {
    width: 50px;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: auto;
    text-align: center;
    cursor: pointer;
  }

  .label-title {
    width: 100%;
    margin: 0;
    cursor: pointer;
  }

  .row {
    margin-left: 0px;
    margin-right: 0px;
  }
  `
}

//get the styles for feature set component
export function getFeaturesSetStyles (theme: IMThemeVariables, featureTitleWidth: string): SerializedStyles {
  return css`


  margin: 2px 0px;
  
  .feature-title-container {
    display: inline-flex; 
    align-items: center;
    width: 100%;
    cursor: pointer;
  }

  .pointer {
    cursor: pointer;
  }

  .feature-title {
    width: ${featureTitleWidth};
    padding: 5px 2px 5px 10px;
  }

  .label-title {
    margin: 0;
  }

  .expand-list-label-title {
    padding-left: 10px;
  }

  .approximateDist-container {
    display: inline-flex; 
    align-items: center;
    width: 100%;
    padding: 5px 10px 5px 10px;
  }

  .approximateDist-label{
    width: calc(100% - 60px);
    font-weight: bold;
  }

  .approximateDist{
    margin-bottom: 0px;
    width: 100px;
    text-align: end;
  }

  .donutWidth {
    right: 26%;
  }

  .esri-feature__title {
    font-size: 14px;
    display: block;
    word-break: break-word;
    word-wrap: break-word;
    margin-left: 10px;
  }
  `
}

//get the styles for list cards
export function getCardStyle (theme: IMThemeVariables, layerLabelWidth: string): SerializedStyles {
  return css`

  .layer-title-Container {
    display: inline-flex;
    -webkit-box-align: baseline;
    align-items: center;
    cursor: pointer;
    padding: 5px
  }

  .card {
    width: 90% !important;
    margin: auto;
  }

  .icon {
    margin-left: 10px;
    width: 20px;
  }

  .layer-title {
    width: ${layerLabelWidth};
    padding: 5px 2px 5px 8px;
    font-weight: 500;
    margin-top: 2px;
  }

  .count {
    width: 40px;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: auto;
    text-align: center;
    cursor: pointer;
  }

  .label-title {
    width: 100%;
    margin: 0;
    cursor: pointer;
  }

  .row {
    margin-left: 0px;
    margin-right: 0px;
  }
  `
}

//get the styles for summary field card component
export function getSummaryCardStyle (theme: IMThemeVariables, bgColor: string, textColor: string, fieldLabelWidth): SerializedStyles {
  return css`

  .summaryCard {
    margin: auto;
    width: 96%;
    align-items: center;
    display: flex;
    flex-flow: row wrap;
  }

  .field {
    width: ${fieldLabelWidth};
    font-weight: 500;
  }

  .summary-value {
    font-size: large;
  }

  .summaryBgColor {
    background-color: ${bgColor};
  }

  .textColor {
    color: ${textColor};
  }
  `
}
