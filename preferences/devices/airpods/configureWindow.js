'use strict';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {AirpodsModelList} from '../../../lib/devices/airpods/airpodsConfig.js';
import * as PrefsWidget from './../../prefsWidget.js';

export const  ConfigureWindow = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_AirpodsConfigureWindow',
}, class ConfigureWindow extends Adw.Window {
    _init(settings, mac, devicePath, parentWindow, _) {
        super._init({
            default_width: 580,
            default_height: 600,
            modal: true,
            transient_for: parentWindow ?? null,
        });
        this._settings = settings;
        this._devicePath = devicePath;

        const pathsString = settings.get_strv('airpods-list').map(JSON.parse);
        this._pathInfo = pathsString.find(info => info.path === devicePath);
        this.title = this._pathInfo.alias;

        const modelData = AirpodsModelList.find(m => m.key === this._pathInfo.model);

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

        const inEarSettingsGroup = new Adw.PreferencesGroup({
            title: _('Playback Behavior'),
        });

        const inEarSettingsSwitchRow = new Adw.SwitchRow({
            title: _('Pause when device is not worn'),
            subtitle: _('Pause playback when the device is removed,' +
                    'resume when it is put back on'),
        });

        inEarSettingsSwitchRow.active = this._pathInfo['in-ear-control-enabled'];
        inEarSettingsSwitchRow.connect('notify::active', () => {
            this._updateGsettings('in-ear-control-enabled', inEarSettingsSwitchRow.active);
        });
        inEarSettingsGroup.add(inEarSettingsSwitchRow);

        page.add(inEarSettingsGroup);

        if (modelData.awarenessSupported) {
            const awarnessVolumeGroup = new Adw.PreferencesGroup({
                title: _('Volume Level'),
            });

            this._adjustment = new Gtk.Adjustment({
                lower: 0,
                upper: 50,
                step_increment: 1,
                page_increment: 10,
                value: this._pathInfo['ca-volume'],
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

            page.add(awarnessVolumeGroup);
        }

        if (modelData.longPressCycleSupported) {
            const items = [
                {name: _('ANC Off'), icon: 'bbm-anc-off-symbolic'},
                {name: _('Transparency'), icon: 'bbm-transperancy-symbolic'},
                {name: _('ANC On'), icon: 'bbm-anc-on-symbolic'},
            ];

            if (modelData.adaptiveSupported)
                items.push({name: _('Adaptive'), icon: 'bbm-adaptive-symbolic'});

            this._longPressCycleWidget = new PrefsWidget.CheckBoxesGroupWidget({
                groupTitle: _('Press and Hold Cycle'),
                rowTitle: _('Press and hold cycles between'),
                rowSubtitle: _('Settings don’t reflect current state, press Apply to save'),
                items,
                applyBtnName: _('Apply'),
                initialValue: 0,
            });

            this._longPressCycleWidget.connect('notify::toggled-value', () => {
                this._updateGsettings('lp-value', this._longPressCycleWidget.toggled_value);
            });

            page.add(this._longPressCycleWidget);
        }

        if (modelData.toneVolumeSupported) {
            this._toneWidget = new PrefsWidget.SliderGroupWidget({
                groupTitle: _('Notification Volume'),
                rowTitle: _('Tone Volume'),
                rowSubtitle: _('Adjust the tone volume of sound effects played by AirPods'),
                marks: [
                    {mark: 0, label: _('15%')},
                    {mark: 77, label: _('100%')},
                    {mark: 100, label: _('125%')},
                ],
                initialValue: this._pathInfo['noti-vol'],
            });

            this._toneWidget.connect('notify::value', () => {
                this._updateGsettings('noti-vol', this._toneWidget.value);
            });

            page.add(this._toneWidget);
        }

        if (modelData.volumeSwipeSupported) {
            const volumeControlGroup = new Adw.PreferencesGroup({
                title: _('Volume Control'),
            });

            this._volumeSwipeSwitchRow = new Adw.SwitchRow({
                title: _('Volume Swipe'),
                subtitle: _('Enable or disable volume adjustment by swiping on earbud stems'),
            });

            this._volumeSwipeSwitchRow.active = this._pathInfo['swipe-mode'];
            this._volumeSwipeSwitchRow.connect('notify::active', () => {
                this._updateGsettings('swipe-mode', this._volumeSwipeSwitchRow.active);
            });
            volumeControlGroup.add(this._volumeSwipeSwitchRow);

            const volumeSwipeDurOptions = [_('Default'), _('Longer'), _('Longest')];
            const volumeSwipeDurValues = [0, 1, 2];

            this._volumeSwipeDurDropdown = new PrefsWidget.DropDownRowWidget({
                title: _('Swipe Duration'),
                subtitle: _('To prevent unintended adjustments,' +
                    'select the preferred wait time between swipes'),
                options: volumeSwipeDurOptions,
                values: volumeSwipeDurValues,
                initialValue: this._pathInfo['swipe-len'],
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

            this._pressSpeedDropdown = new PrefsWidget.DropDownRowWidget({
                title: _('Press Speed'),
                subtitle: _('Adjust how quickly you must double or ' +
                        'triple-press the stem or Digital Crown before an action occurs'),
                options: speedOptions,
                values: speedValues,
                initialValue: this._pathInfo['press-speed'],
            });

            this._pressSpeedDropdown.connect('notify::selected-item', () => {
                this._updateGsettings('press-speed', this._pressSpeedDropdown.selected_item);
            });

            pressHoldGroup.add(this._pressSpeedDropdown);

            const durationOptions = [_('Default'), _('Shorter'), _('Shortest')];
            const durationValues = [0, 1, 2];
            this._pressDurationDropdown = new PrefsWidget.DropDownRowWidget({
                title: _('Press and Hold Duration'),
                subtitle: _('Set how long you need to press and hold before an action occurs'),
                options: durationOptions,
                values: durationValues,
                initialValue: this._pathInfo['press-dur'],
            });

            this._pressDurationDropdown.connect('notify::selected-item', () => {
                this._updateGsettings('press-dur', this._pressDurationDropdown.selected_item);
            });

            pressHoldGroup.add(this._pressDurationDropdown);

            page.add(pressHoldGroup);
        }

        settings.connect('changed::airpods-list', () => {
            const updatedList = settings.get_strv('airpods-list').map(JSON.parse);
            this._pathInfo = updatedList.find(info => info.path === devicePath);

            this.title = this._pathInfo.alias;
            inEarSettingsSwitchRow.active = this._pathInfo['in-ear-control-enabled'];

            if (modelData.awarenessSupported)
                this._adjustment.value = this._pathInfo['ca-volume'];

            if (modelData.toneVolumeSupported)
                this._toneWidget.value = this._pathInfo['noti-vol'];

            if (modelData.volumeSwipeSupported) {
                this._volumeSwipeSwitchRow.active = this._pathInfo['swipe-mode'];
                this._volumeSwipeDurDropdown.selected_item = this._pathInfo['swipe-len'];
            }
            if (modelData.pressSpeedDurationSupported) {
                this._pressSpeedDropdown.selected_item = this._pathInfo['press-speed'];
                this._pressDurationDropdown.selected_item = this._pathInfo['press-dur'];
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


