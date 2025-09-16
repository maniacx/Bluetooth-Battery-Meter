'use strict';
import Adw from 'gi://Adw';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';

import {AirpodsModelList} from '../../../lib/devices/airpods/airpodsConfig.js';

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

        const inEarSettingsRow = new Adw.ActionRow({
            title: _('Pause when device is not worn'),
            subtitle: _('Pause playback when the device is removed,' +
                    'resume when it is put back on'),
        });

        const inEarSettingsSwitch = new Gtk.Switch({
            valign: Gtk.Align.CENTER,
        });

        inEarSettingsSwitch.active = this._pathInfo['in-ear-control-enabled'];
        inEarSettingsSwitch.connect('notify::active', () => {
            this._updateGsettings('in-ear-control-enabled', inEarSettingsSwitch.active);
        });
        inEarSettingsRow.add_suffix(inEarSettingsSwitch);
        inEarSettingsGroup.add(inEarSettingsRow);

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
            const pressCycleGroup = new Adw.PreferencesGroup({
                title: _('Press and Hold Cycle'),
            });

            const pressCycleButtonContent = new Adw.ButtonContent({
                label: _('Apply'),
                icon_name: 'bbm-check-symbolic',
            });

            this._pressCycleButton = new Gtk.Button({
                halign: Gtk.Align.START,
                valign: Gtk.Align.CENTER,
                margin_start: 6,
                css_classes: ['suggested-action'],
                child: pressCycleButtonContent,
            });
            this._pressCycleButton.sensitive = false;

            const pressCycleRow = new Adw.ActionRow({
                title: _('Press and hold cycles between'),
                subtitle: _('Settings don’t reflect current state, press Apply to save'),
            });
            pressCycleRow.add_suffix(this._pressCycleButton);
            pressCycleGroup.add(pressCycleRow);

            const modesBox = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 8,
                homogeneous: true,
                valign: Gtk.Align.CENTER,
                margin_top: 8,
                margin_bottom: 8,
            });

            const createModeCell = (icon, labelText, checkButtonRef) => {
                const cell = new Gtk.Box({
                    orientation: Gtk.Orientation.VERTICAL,
                    spacing: 6,
                    halign: Gtk.Align.CENTER,
                    valign: Gtk.Align.CENTER,
                });

                const iconWidget = new Gtk.Image({
                    icon_name: icon,
                    halign: Gtk.Align.CENTER,
                });

                const label = new Gtk.Label({
                    label: labelText,
                    halign: Gtk.Align.CENTER,
                });
                label.add_css_class('caption-heading');

                const checkButton = new Gtk.CheckButton({halign: Gtk.Align.CENTER});
                if (checkButtonRef)
                    this[checkButtonRef] = checkButton;

                cell.append(iconWidget);
                cell.append(label);
                cell.append(checkButton);

                return cell;
            };

            modesBox.append(createModeCell('bbm-anc-off-symbolic',
                _('ANC Off'), '_cycleAncOffCheckButton'));

            modesBox.append(createModeCell('bbm-transperancy-symbolic',
                _('Transparency'), '_cycleAmbientCheckButton'));

            if (modelData.adaptiveSupported) {
                modesBox.append(createModeCell('bbm-adaptive-symbolic',
                    _('Adaptive'), '_cycleAdaptiveCheckButton'));
            }

            modesBox.append(createModeCell('bbm-anc-on-symbolic',
                _('ANC On'), '_cycleAncOnCheckButton'));

            const pressCycleButtonRow = new Adw.ActionRow();
            pressCycleButtonRow.set_child(modesBox);
            pressCycleGroup.add(pressCycleButtonRow);

            const updateApplySensitive = () => {
                let count = 0;
                if (this._cycleAncOffCheckButton.active)
                    count++;
                if (this._cycleAncOnCheckButton.active)
                    count++;
                if (this._cycleAmbientCheckButton.active)
                    count++;
                if (modelData.adaptiveSupported && this._cycleAdaptiveCheckButton.active)
                    count++;
                this._pressCycleButton.sensitive = count >= 2;
            };

            this._cycleAncOffCheckButton.connect('toggled', updateApplySensitive);
            this._cycleAncOnCheckButton.connect('toggled', updateApplySensitive);
            this._cycleAmbientCheckButton.connect('toggled', updateApplySensitive);
            if (modelData.adaptiveSupported)
                this._cycleAdaptiveCheckButton.connect('toggled', updateApplySensitive);

            this._pressCycleButton.connect('clicked', () => {
                let finalSumValue = 0;
                if (this._cycleAncOffCheckButton.active)
                    finalSumValue += 1;
                if (this._cycleAncOnCheckButton.active)
                    finalSumValue += 2;
                if (this._cycleAmbientCheckButton.active)
                    finalSumValue += 4;
                if (modelData.adaptiveSupported && this._cycleAdaptiveCheckButton.active)
                    finalSumValue += 8;

                this._updateGsettings('lp-value', finalSumValue);
                this._updateGsettings('lp-applied', !this._pathInfo['lp-applied']);

                this._cycleAncOffCheckButton.active = false;
                this._cycleAncOnCheckButton.active = false;
                this._cycleAmbientCheckButton.active = false;
                if (modelData.adaptiveSupported)
                    this._cycleAdaptiveCheckButton.active = false;

                updateApplySensitive();
            });

            page.add(pressCycleGroup);
        }

        if (modelData.toneVolumeSupported) {
            const toneVolGroup = new Adw.PreferencesGroup({
                title: _('Notification Volume'),
            });

            const toneVolRow = new Adw.ActionRow({
                title: _('Tone Volume'),
                subtitle: _('Adjust the tone volume of sound effects played by Airpods'),
            });

            this._toneVolSlider = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0, 100, 1);
            this._toneVolSlider.margin_start = 50;
            this._toneVolSlider.margin_end = 50;
            this._toneVolSlider.margin_top = 4;
            this._toneVolSlider.margin_bottom = 4;
            this._toneVolSlider.add_mark(0, Gtk.PositionType.BOTTOM, _('15%'));
            this._toneVolSlider.add_mark(77, Gtk.PositionType.BOTTOM, _('100%'));
            this._toneVolSlider.add_mark(100, Gtk.PositionType.BOTTOM, _('125%'));

            this._toneVolSlider.set_value(this._pathInfo['noti-vol']);
            this._toneVolSlider.connect('value-changed', () => {
                this._updateGsettings('noti-vol', this._toneVolSlider.get_value());
            });

            const toneVolSliderRow = new Adw.ActionRow({child: this._toneVolSlider});

            toneVolGroup.add(toneVolRow);
            toneVolGroup.add(toneVolSliderRow);

            page.add(toneVolGroup);
        }

        if (modelData.volumeSwipeSupported) {
            const volumeControlGroup = new Adw.PreferencesGroup({
                title: _('Volume Control'),
            });

            const volumeSwipeMode = new Adw.ActionRow({
                title: _('Volume Swipe'),
                subtitle: _('Enable or disable volume adjustment by swiping on earbud stems'),
            });

            this._volumeSwipeSwitch = new Gtk.Switch({
                valign: Gtk.Align.CENTER,
            });

            this._volumeSwipeSwitch.active = this._pathInfo['swipe-mode'];
            volumeSwipeMode.add_suffix(this._volumeSwipeSwitch);
            this._volumeSwipeSwitch.connect('notify::active', () => {
                this._updateGsettings('swipe-mode', this._volumeSwipeSwitch.active);
            });
            volumeControlGroup.add(volumeSwipeMode);

            const volumeSwipeDurRow = new Adw.ActionRow({
                title: _('Swipe Duration'),
                subtitle: _('To prevent unintended adjustments,' +
                        ' select the preferred wait time between swipes'),
            });

            const swipeDurationOptions = [_('Default'), _('Longer'), _('Longest')];
            this._volumeSwipeDurDropdown = Gtk.DropDown.new_from_strings(swipeDurationOptions);
            this._volumeSwipeDurDropdown.valign = Gtk.Align.CENTER;
            this._volumeSwipeDurDropdown.selected = this._pathInfo['swipe-len'];

            this._volumeSwipeDurDropdown.connect('notify::selected', () => {
                this._updateGsettings('swipe-len', this._volumeSwipeDurDropdown.selected);
            });

            this._volumeSwipeSwitch.bind_property(
                'active',
                volumeSwipeDurRow,
                'sensitive',
                GObject.BindingFlags.SYNC_CREATE
            );

            volumeSwipeDurRow.add_suffix(this._volumeSwipeDurDropdown);
            volumeControlGroup.add(volumeSwipeDurRow);

            page.add(volumeControlGroup);
        }


        if (modelData.pressSpeedDurationSupported) {
            const pressHoldGroup = new Adw.PreferencesGroup({
                title: _('Stem and Crown Response'),
            });

            const pressSpeedRow = new Adw.ActionRow({
                title: _('Press Speed'),
                subtitle: _('Adjust how quickly you must double or ' +
                        'triple-press the stem or Digital Crown before an action occurs'),
            });

            const speedOptions = [_('Default'), _('Slower'), _('Slowest')];
            this._pressSpeedDropdown = Gtk.DropDown.new_from_strings(speedOptions);
            this._pressSpeedDropdown.valign = Gtk.Align.CENTER;
            this._pressSpeedDropdown.selected = this._pathInfo['press-speed'];

            this._pressSpeedDropdown.connect('notify::selected', () => {
                this._updateGsettings('press-speed', this._pressSpeedDropdown.selected);
            });

            pressSpeedRow.add_suffix(this._pressSpeedDropdown);
            pressHoldGroup.add(pressSpeedRow);

            const pressDurationRow = new Adw.ActionRow({
                title: _('Press and Hold Duration'),
                subtitle: _('Set how long you need to press and hold before an action occurs'),
            });

            const durationOptions = [_('Default'), _('Shorter'), _('Shortest')];
            this._pressDurationDropdown = Gtk.DropDown.new_from_strings(durationOptions);
            this._pressDurationDropdown.valign = Gtk.Align.CENTER;
            this._pressDurationDropdown.selected = this._pathInfo['press-dur'];

            this._pressDurationDropdown.connect('notify::selected', () => {
                this._updateGsettings('press-dur', this._pressDurationDropdown.selected);
            });

            pressDurationRow.add_suffix(this._pressDurationDropdown);
            pressHoldGroup.add(pressDurationRow);

            page.add(pressHoldGroup);
        }

        settings.connect('changed::airpods-list', () => {
            const updatedList = settings.get_strv('airpods-list').map(JSON.parse);
            this._pathInfo = updatedList.find(info => info.path === devicePath);

            this.title = this._pathInfo.alias;
            inEarSettingsSwitch.active = this._pathInfo['in-ear-control-enabled'];

            if (modelData.awarenessSupported)
                this._adjustment.value = this._pathInfo['ca-volume'];

            if (modelData.toneVolumeSupported)
                this._toneVolSlider?.set_value(this._pathInfo['noti-vol']);

            if (modelData.volumeSwipeSupported) {
                this._volumeSwipeSwitch.active = this._pathInfo['swipe-mode'];
                this._volumeSwipeDurDropdown.selected = this._pathInfo['swipe-len'];
            }
            if (modelData.pressSpeedDurationSupported) {
                this._pressSpeedDropdown.selected = this._pathInfo['press-speed'];
                this._pressDurationDropdown.selected = this._pathInfo['press-dur'];
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


