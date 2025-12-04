'use strict';
import Adw from 'gi://Adw';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {supportedIcons} from '../lib/widgets/iconGroups.js';

const  ConfigureWindow = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_DeviceConfigureWindow',
}, class ConfigureWindow extends Adw.Window {
    _init(settings, mac, deviceItem, pathInfo, parentWindow) {
        super._init({
            title: pathInfo.alias,
            default_width: 580,
            default_height: 600,
            modal: true,
            transient_for: parentWindow,
        });

        const isAirpodsEnabled = settings.get_boolean('enable-airpods-device');
        const isGattBasEnabled = settings.get_boolean('enable-gattbas-device');
        const enhandedModeEnabled = isAirpodsEnabled || isGattBasEnabled;

        let isEnhancedDevice = false;

        if (enhandedModeEnabled) {
            if (pathInfo.isEnhancedDevice === 'airpods')
                isEnhancedDevice = isAirpodsEnabled;
            else if (pathInfo.isEnhancedDevice === 'gatt-bas')
                isEnhancedDevice = isGattBasEnabled;
        }
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

        const status = _('Battery Status:');
        let batteryStatus = pathInfo.batteryReported  ? _('Reported') : _('Not Available');
        batteryStatus = isEnhancedDevice ?  _('Reported from enhanced device service')
            : batteryStatus;

        aliasGroup.set_description(`${status} ${batteryStatus}`);
        page.add(aliasGroup);

        const iconGroup = new Adw.PreferencesGroup({
            title: _('Icon'),
        });

        const iconRow = new Adw.ActionRow({
            title: _('Select Icon'),
            subtitle: _('Select the icon used for the indicator and quick menu'),
        });
        const iconRowEnhanced = new Adw.ActionRow({
            title: _('This is an enhanced device'),
            subtitle: _('Icon selection if available are in Enhanced device per device settings'),
        });
        iconRow.visible = !isEnhancedDevice;
        iconRowEnhanced.visible = isEnhancedDevice;

        const iconSplitButton = new Adw.SplitButton({
            icon_name: `bbm-${pathInfo.icon}-symbolic`,
            valign: Gtk.Align.CENTER,
        });

        const popover = new Gtk.Popover({
            has_arrow: true,
            autohide: true,
        });

        const grid = new Gtk.Grid({
            column_spacing: 10,
            row_spacing: 10,
        });

        const maxRows = 7;
        const totalIcons = supportedIcons.length;
        const columns = Math.ceil(totalIcons / maxRows);
        supportedIcons.forEach((deviceType, index) => {
            const button = new Gtk.Button({
                icon_name: `bbm-${deviceType}-symbolic`,
                valign: Gtk.Align.CENTER,
            });
            const column = index % columns;
            const row = Math.floor(index / columns);
            grid.attach(button, column, row, 1, 1);
            button.connect('clicked', () => {
                popover.hide();
                const pairedDevice = settings.get_strv('device-list');
                const existingPathIndex =
                    pairedDevice.findIndex(item => JSON.parse(item).path === pathInfo.path);
                if (existingPathIndex === -1)
                    return;

                const existingItem = JSON.parse(pairedDevice[existingPathIndex]);
                existingItem['icon'] = deviceType;
                pairedDevice[existingPathIndex] = JSON.stringify(existingItem);
                settings.set_strv('device-list', pairedDevice);
                iconSplitButton.icon_name = `bbm-${deviceType}-symbolic`;
            });
        });

        popover.set_child(grid);
        iconSplitButton.set_popover(popover);
        iconRow.add_suffix(iconSplitButton);
        iconGroup.add(iconRow);
        iconGroup.add(iconRowEnhanced);
        page.add(iconGroup);

        const quickSettingsGroup = new Adw.PreferencesGroup({
            title: _('Quick Menu'),
        });

        const quickSettingsSwitchRow = new Adw.SwitchRow({
            title: _('Display Battery Level'),
            subtitle: _('Display battery level in the Bluetooth panel quick menu'),
        });

        quickSettingsSwitchRow.active = pathInfo.qsLevelEnabled;
        quickSettingsSwitchRow.connect('notify::active', () => {
            const pairedDevice = settings.get_strv('device-list');
            const existingPathIndex =
                pairedDevice.findIndex(item => JSON.parse(item).path === pathInfo.path);
            if (existingPathIndex !== -1) {
                const existingItem = JSON.parse(pairedDevice[existingPathIndex]);
                existingItem['qs-level'] = quickSettingsSwitchRow.active;
                pairedDevice[existingPathIndex] = JSON.stringify(existingItem);
                settings.set_strv('device-list', pairedDevice);
            }
        });
        quickSettingsGroup.visible =  pathInfo.batteryReported || isEnhancedDevice;
        quickSettingsGroup.add(quickSettingsSwitchRow);
        page.add(quickSettingsGroup);

        const indicatorGroup = new Adw.PreferencesGroup({
            title: _('Indicator'),
        });

        const indicatorRow = new Adw.ActionRow({
            title: _('Configure Indicator'),
            subtitle: _('Choose how the indicator should behave'),
        });
        const indicatorOptions = pathInfo.batteryReported || isEnhancedDevice
            ? [
                {id: 0, label: _('Do not show Icon')},
                {id: 1, label: _('Show Icon without Battery level')},
                {id: 2, label: _('Show Icon with Battery Level')},
            ]
            : [
                {id: 0, label: _('Hide Icon')},
                {id: 1, label: _('Show Icon')},
            ];

        const dropDown = new Gtk.DropDown({
            valign: Gtk.Align.CENTER,
            model: Gtk.StringList.new(indicatorOptions.map(option => option.label)),
            selected: indicatorOptions.findIndex(
                option => option.id === pathInfo.indicatorMode) >= 0
                ? indicatorOptions.findIndex(option => option.id === pathInfo.indicatorMode)
                : 0,
        });

        dropDown.connect('notify::selected', () => {
            const index = dropDown.get_selected();
            const selectedId = indicatorOptions[index].id;
            const pairedDevice = settings.get_strv('device-list');
            const existingPathIndex =
                pairedDevice.findIndex(item => JSON.parse(item).path === pathInfo.path);
            if (existingPathIndex !== -1) {
                const existingItem = JSON.parse(pairedDevice[existingPathIndex]);
                existingItem['indicator-mode'] = selectedId;
                pairedDevice[existingPathIndex] = JSON.stringify(existingItem);
                settings.set_strv('device-list', pairedDevice);
            }
        });

        indicatorRow.add_suffix(dropDown);
        indicatorRow.activatable_widget = dropDown;
        indicatorGroup.add(indicatorRow);
        page.add(indicatorGroup);
    }
}
);

const  DeviceItem = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_DeviceItem',
}, class DeviceItem extends Adw.ActionRow {
    constructor(settings, deviceItem, pathInfo) {
        super({});
        this._pathInfo = pathInfo;
        this._macAddress = this._pathToMacAddress(pathInfo.path);

        this._icon = new Gtk.Image({
            icon_name: `bbm-${this._pathInfo.icon}-symbolic`,
        });

        this._customiseButton = new Gtk.Button({
            icon_name: 'bbm-settings-symbolic',
            tooltip_text: _('Configure device.'),
            valign: Gtk.Align.CENTER,
        });

        this._customiseButton.connect('clicked', () => {
            const parentWindow = this._customiseButton.get_ancestor(Gtk.Window);
            const configureWindow =
                new ConfigureWindow(settings, this._macAddress,
                    deviceItem, this._pathInfo, parentWindow);
            configureWindow.present();
        });

        this._deleteButton = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            tooltip_text: _('Delete device information: ' +
            'The button is available after unpairing device'),
            css_classes: ['destructive-action'],
            valign: Gtk.Align.CENTER,
        });

        this._deleteButton.connect('clicked', () => {
            const pairedDevices = settings.get_strv('device-list');
            const existingPathIndex = pairedDevices.findIndex(entry => {
                const parsedEntry = JSON.parse(entry);
                return parsedEntry.path === pathInfo.path;
            });

            if (existingPathIndex !== -1) {
                pairedDevices.splice(existingPathIndex, 1);
                settings.set_strv('device-list', pairedDevices);
            }
            this.get_parent().remove(this);
            deviceItem.delete(pathInfo.path);
        });

        const box = new Gtk.Box({spacing: 16});
        box.append(this._customiseButton);
        box.append(this._deleteButton);
        this.add_prefix(this._icon);
        this.add_suffix(box);

        this.updateProperites(pathInfo);
    }

    updateProperites(pathInfo) {
        this._pathInfo = pathInfo;
        const removedLabel = _('(Removed)');
        const pairedLabel = _('(Paired)');
        this.title = pathInfo.alias;
        this.subtitle = pathInfo.paired ? `${this._macAddress} ${pairedLabel}`
            : `${this._macAddress} ${removedLabel}`;
        this._deleteButton.sensitive = !pathInfo.paired;
        this._icon.icon_name = `bbm-${pathInfo.icon}-symbolic`;
    }

    _pathToMacAddress(path) {
        const indexMacAddress = path.indexOf('dev_') + 4;
        const macAddress = path.substring(indexMacAddress);
        return macAddress.replace(/_/g, ':');
    }
});


export const  Device = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_DeviceUI',
    Template: GLib.Uri.resolve_relative(
        import.meta.url, '../ui/device.ui', GLib.UriFlags.NONE
    ),
    InternalChildren: [
        'device_group',
        'no_paired_row',
    ],
}, class Device extends Adw.PreferencesPage {
    constructor(settings) {
        super({});
        this._settings = settings;
        this._deviceItems = new Map();
        this._createDevices();
        this._settings.connect('changed::device-list', () => this._createDevices());
    }

    _createDevices() {
        const pathsString = this._settings.get_strv('device-list').map(JSON.parse);
        if (!pathsString || pathsString.length === 0) {
            this._no_paired_row.visible  = true;
            return;
        }
        this._no_paired_row.visible  = false;
        const pairedDevices = pathsString.filter(device => device.paired);
        const unpairedDevices = pathsString.filter(device => !device.paired);
        pairedDevices.sort((a, b) => b['connected-time'] - a['connected-time']);
        unpairedDevices.sort((a, b) => b['disconnected-time'] - a['disconnected-time']);
        const sortedDevices = [...pairedDevices, ...unpairedDevices];
        for (const info of sortedDevices) {
            const pathInfo = {
                path: info.path,
                icon: info.icon,
                alias: info.alias,
                paired: info.paired,
                batteryReported: info['battery-reported'],
                qsLevelEnabled: info['qs-level'],
                indicatorMode: info['indicator-mode'],
                isEnhancedDevice: info['enhanced-device'],
            };
            if (this._deviceItems.has(pathInfo.path)) {
                const row = this._deviceItems.get(pathInfo.path);
                row.updateProperites(pathInfo);
            } else {
                const deviceItem = new DeviceItem(this._settings, this._deviceItems, pathInfo);
                this._deviceItems.set(pathInfo.path, deviceItem);
                this._device_group.add(deviceItem);
            }
        }
    }
});

