// jimu / react
import { React } from "jimu-core";
import { AllWidgetSettingProps } from "jimu-for-builder";
import {
  MapWidgetSelector,
  SettingSection,
  SettingRow,
} from "jimu-ui/advanced/setting-components";

// resources
import { IMConfig } from "../config";

// exported settings
const Settings = (props: AllWidgetSettingProps<IMConfig>): JSX.Element => {
    debugger
  // supporting functions
  const onSettingChange = (settings) =>
    props.onSettingChange({ ...settings, id: props.id });

  // event handlers
  const onMapWidgetSelected = (useMapWidgetIds: string[]) =>
    onSettingChange({ useMapWidgetIds });

  // render
  return (
    <div className="widget-swipe-setting p-2">
      <SettingSection
        title={props.intl.formatMessage({
          id: "mapSelectorTitle",
        })}
      >
        <SettingRow>
          <MapWidgetSelector
            onSelect={onMapWidgetSelected}
            useMapWidgetIds={props.useMapWidgetIds}
          />
        </SettingRow>
      </SettingSection>
    </div>
  );
};
export default Settings;