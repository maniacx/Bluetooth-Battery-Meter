'use strict';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {
    supportedAudioSingleIcons, supportedAudioDualIcons, supportedCaseIcons
} from '../../../lib/widgets/iconGroups.js';
import {AirpodsModelList} from '../../../lib/devices/airpods/airpodsConfig.js';
import {CheckBoxesGroupWidget} from './../../widgets/checkBoxesGroupWidget.js';
import {SliderRowWidget} from './../../widgets/sliderRowWidget.js';
import {DropDownRowWidget} from './../../widgets/dropDownRowWidget.js';
import {IconSelectorWidget} from './../../widgets/iconSelectorWidget.js';

export const  ConfigureWindow = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_AirpodsConfigureWindow',
}, class ConfigureWindow extends Adw.Window {
    _init(settings, mac, devicePath, parentWindow, _) {
        super._init({
            default_width: 650,
            default_height: 650,
            modal: true,
            transient_for: parentWindow ?? null,
        });
        this._settings = settings;
        this._devicePath = devicePath;

        const pathsString = settings.get_strv('airpods-list').map(JSON.parse);
        this._settingsItems = pathsString.find(info => info.path === devicePath);
        this.title = this._settingsItems.alias;

        const modelData = AirpodsModelList.find(m => m.key === this._settingsItems.model);

        const toolViewBar = new Adw.ToolbarView();

        const headerBar = new Adw.HeaderBar({
            decoration_layout: 'icon:close',
            show_end_title_buttons: true,
        });

        const page = new Adw.PreferencesPage();

        toolViewBar.add_top_bar(headerBar);
        toolViewBar.set_content(page);
        this.set_content(toolViewBar);

        const aliasGroup = new Adw.PreferencesGroup({
            title: `MAC: ${mac}`,
        });

        page.add(aliasGroup);

        const iconList = modelData.batteryType === 1 ? supportedAudioSingleIcons
            : supportedAudioDualIcons;

        let caseIconList = [];
        let initialCaseIcon = '';
        if (modelData.batteryType === 3) {
            caseIconList = supportedCaseIcons;
            initialCaseIcon = this._settingsItems['case'];
        }

        const iconSelector = new IconSelectorWidget({
            grpTitle: _('Icon'),
            rowTitle: _('Select Icon'),
            rowSubtitle: _('Select the icon used for the indicator and quick menu'),
            iconList,
            initialIcon: this._settingsItems['icon'],
            caseIconList,
            initialCaseIcon,
        });

        iconSelector.connect('notify::selected-icon', () => {
            this._updateGsettings('icon', iconSelector.selected_icon);
        });

        if (modelData.batteryType === 3) {
            iconSelector.connect('notify::selected-case-icon', () => {
                this._updateGsettings('case', iconSelector.selected_case_icon);
            });
        }

        page.add(iconSelector);

        const inEarSettingsGroup = new Adw.PreferencesGroup({
            title: _('Playback Behavior'),
        });

        const inEarOptions = modelData.batteryType === 1 ? [
            _('Default behavior'),
            _('Resume when worn'),
        ] : [
            _('Default behavior'),
            _('Resume with both earbuds'),
            _('Resume with any earbud'),
        ];

        const inEarValues = modelData.batteryType === 1 ? [0, 1] : [0, 1, 2];

        this._inEarDropdown = new DropDownRowWidget({
            title: _('Choose playback behaviour for Ear detection'),
            subtitle: _('Automatically pause or resume playback ' +
                'based on wearing detection.'),
            options: inEarOptions,
            values: inEarValues,
            initialValue: this._settingsItems['wear-detection-mode'],
        });

        this._inEarDropdown.connect('notify::selected-item', () => {
            this._updateGsettings('wear-detection-mode', this._inEarDropdown.selected_item);
        });

        inEarSettingsGroup.add(this._inEarDropdown);

        page.add(inEarSettingsGroup);

        if (modelData.awarenessSupported) {
            const awarnessVolumeGroup = new Adw.PreferencesGroup({
                title: _('Volume Level'),
            });

            this._awarenessSwitchRow = new Adw.SwitchRow({
                title: _('Pause when device is not worn'),
                subtitle: _('Pause playback when the device is removed,' +
                    'resume when it is put back on'),
            });

            this._awarenessSwitchRow.active = this._settingsItems['ca-volume-enabled'];
            this._awarenessSwitchRow.connect('notify::active', () => {
                this._updateGsettings('ca-volume-enabled', this._awarenessSwitchRow.active);
            });
            awarnessVolumeGroup.add(this._awarenessSwitchRow);

            this._adjustment = new Gtk.Adjustment({
                lower: 0,
                upper: 50,
                step_increment: 1,
                page_increment: 10,
                value: this._settingsItems['ca-volume'],
            });

            const awarnessVolumeRow = new Adw.SpinRow({
                title: _('Conversation awareness volume limit'),
                subtitle: _('Limits media volume to this percentage during conversation.' +
            ' Note: No change if current volume is below this level.'),
                adjustment: this._adjustment,
                numeric: true,
            });

            awarnessVolumeRow.connect('notify::value', () => {
                this._updateGsettings('ca-volume', awarnessVolumeRow.value);
            });
            awarnessVolumeGroup.add(awarnessVolumeRow);

            this._awarenessSwitchRow.bind_property(
                'active',
                awarnessVolumeRow,
                'sensitive',
                GObject.BindingFlags.SYNC_CREATE
            );

            page.add(awarnessVolumeGroup);
        }

        if (modelData.longPressCycleSupported) {
            const items = [
                {name: _('Off'), icon: 'bbm-anc-off-symbolic'},
                {name: _('Transparency'), icon: 'bbm-transperancy-symbolic'},
                {name: _('Noise Cancellation'), icon: 'bbm-anc-on-symbolic'},
            ];

            if (modelData.adaptiveSupported)
                items.push({name: _('Adaptive'), icon: 'bbm-adaptive-symbolic'});

            this._longPressCycleWidget = new CheckBoxesGroupWidget({
                groupTitle: _('Press and Hold Cycle'),
                rowTitle: _('Press and hold cycles between'),
                rowSubtitle: _('Settings don’t reflect current state'),
                items,
                applyBtnName: _('Apply'),
                resetOnApply: true,
            });

            this._longPressCycleWidget.connect('notify::toggled-value', () => {
                this._updateGsettings('lp-value', this._longPressCycleWidget.toggled_value);
            });

            page.add(this._longPressCycleWidget);
        }

        if (modelData.toneVolumeSupported) {
            const toneGroup = new Adw.PreferencesGroup({
                title: _('Notification Volume'),
            });


            this._toneWidget = new SliderRowWidget({
                rowTitle: _('Tone Volume'),
                rowSubtitle: _('Adjust the tone volume of sound effects played by AirPods'),
                marks: [
                    {mark: 0, label: _('15%')},
                    {mark: 77, label: _('100%')},
                    {mark: 100, label: _('125%')},
                ],
                initialValue: this._settingsItems['noti-vol'],
            });

            this._toneWidget.connect('notify::value', () => {
                this._updateGsettings('noti-vol', this._toneWidget.value);
            });

            toneGroup.add(this._toneWidget);
            page.add(toneGroup);
        }

        if (modelData.volumeSwipeSupported) {
            const volumeControlGroup = new Adw.PreferencesGroup({
                title: _('Volume Control'),
            });

            this._volumeSwipeSwitchRow = new Adw.SwitchRow({
                title: _('Volume Swipe'),
                subtitle: _('Enable or disable volume adjustment by swiping on earbud stems'),
            });

            this._volumeSwipeSwitchRow.active = this._settingsItems['swipe-mode'];
            this._volumeSwipeSwitchRow.connect('notify::active', () => {
                this._updateGsettings('swipe-mode', this._volumeSwipeSwitchRow.active);
            });
            volumeControlGroup.add(this._volumeSwipeSwitchRow);

            const volumeSwipeDurOptions = [_('Default'), _('Longer'), _('Longest')];
            const volumeSwipeDurValues = [0, 1, 2];

            this._volumeSwipeDurDropdown = new DropDownRowWidget({
                title: _('Swipe Duration'),
                subtitle: _('To prevent unintended adjustments,' +
                    'select the preferred wait time between swipes'),
                options: volumeSwipeDurOptions,
                values: volumeSwipeDurValues,
                initialValue: this._settingsItems['swipe-len'],
            });

            this._volumeSwipeDurDropdown.connect('notify::selected-item', () => {
                this._updateGsettings('swipe-len', this._volumeSwipeDurDropdown.selected_item);
            });

            this._volumeSwipeSwitchRow.bind_property(
                'active',
                this._volumeSwipeDurDropdown,
                'sensitive',
                GObject.BindingFlags.SYNC_CREATE
            );

            volumeControlGroup.add(this._volumeSwipeDurDropdown);

            page.add(volumeControlGroup);
        }

        if (modelData.pressSpeedDurationSupported) {
            const pressHoldGroup = new Adw.PreferencesGroup({
                title: _('Stem and Crown Response'),
            });

            const speedOptions = [_('Default'), _('Longer'), _('Longest')];
            const speedValues = [0, 1, 2];

            this._pressSpeedDropdown = new DropDownRowWidget({
                title: _('Press Speed'),
                subtitle: _('Adjust how quickly you must double or ' +
                        'triple-press the stem or Digital Crown before an action occurs'),
                options: speedOptions,
                values: speedValues,
                initialValue: this._settingsItems['press-speed'],
            });

            this._pressSpeedDropdown.connect('notify::selected-item', () => {
                this._updateGsettings('press-speed', this._pressSpeedDropdown.selected_item);
            });

            pressHoldGroup.add(this._pressSpeedDropdown);

            const durationOptions = [_('Default'), _('Shorter'), _('Shortest')];
            const durationValues = [0, 1, 2];
            this._pressDurationDropdown = new DropDownRowWidget({
                title: _('Press and Hold Duration'),
                subtitle: _('Set how long you need to press and hold before an action occurs'),
                options: durationOptions,
                values: durationValues,
                initialValue: this._settingsItems['press-dur'],
            });

            this._pressDurationDropdown.connect('notify::selected-item', () => {
                this._updateGsettings('press-dur', this._pressDurationDropdown.selected_item);
            });

            pressHoldGroup.add(this._pressDurationDropdown);

            page.add(pressHoldGroup);
        }

        settings.connect('changed::airpods-list', () => {
            const updatedList = settings.get_strv('airpods-list').map(JSON.parse);
            this._settingsItems = updatedList.find(info => info.path === devicePath);

            this.title = this._settingsItems.alias;
            this._inEarDropdown.selected_item = this._settingsItems['wear-detection-mode'];

            if (modelData.awarenessSupported) {
                this._awarenessSwitchRow.active = this._settingsItems['ca-volume-enabled'];
                this._adjustment.value = this._settingsItems['ca-volume'];
            }

            if (modelData.toneVolumeSupported)
                this._toneWidget.value = this._settingsItems['noti-vol'];

            if (modelData.volumeSwipeSupported) {
                this._volumeSwipeSwitchRow.active = this._settingsItems['swipe-mode'];
                this._volumeSwipeDurDropdown.selected_item = this._settingsItems['swipe-len'];
            }
            if (modelData.pressSpeedDurationSupported) {
                this._pressSpeedDropdown.selected_item = this._settingsItems['press-speed'];
                this._pressDurationDropdown.selected_item = this._settingsItems['press-dur'];
            }
        });
    }

    _updateGsettings(key, value) {
        const pairedDevice = this._settings.get_strv('airpods-list');
        const existingPathIndex =
                pairedDevice.findIndex(item => JSON.parse(item).path === this._devicePath);
        if (existingPathIndex !== -1) {
            const existingItem = JSON.parse(pairedDevice[existingPathIndex]);
            existingItem[key] = value;
            pairedDevice[existingPathIndex] = JSON.stringify(existingItem);
            this._settings.set_strv('airpods-list', pairedDevice);
        }
    }
}
);


