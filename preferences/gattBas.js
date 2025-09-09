'use strict';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {
    supportedCommonIcons,
    supportedCircularWidgetIcons
} from '../lib/devices/gattBas/gattBasConfig.js';

const  ConfigureWindow = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_GattBasConfigureWindow',
}, class ConfigureWindow extends Adw.Window {
    _init(settings, mac, deviceItem, pathInfo, parentWindow) {
        super._init({
            title: pathInfo.alias,
            default_width: 580,
            default_height: 600,
            modal: true,
            transient_for: parentWindow,
        });

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

        const iconGroup1 = new Adw.PreferencesGroup({
            title: _('Select Icon'),
            description: _('Single Indicator, Panel Button, Quick Menu, Album Art'),
        });

        const iconGroup2 = new Adw.PreferencesGroup({
            title: _('Select Icon'),
            description: _('Multiple Indicators, Circular Battery Widgets'),
        });

        const pairedDevice = settings.get_strv('gattbas-list');
        const deviceData = JSON.parse(
            pairedDevice.find(item => JSON.parse(item).path === pathInfo.path) || '{}');

        iconGroup1.add(this._createIconRow({
            title: _('Icon '),
            propertyKey: 'icon',
            currentValue: deviceData['icon'] || pathInfo.icon,
            pathInfo,
            settings,
            iconsSupported: supportedCommonIcons,
        }));

        iconGroup2.add(this._createIconRow({
            title: _('Battery 1 Icon'),
            propertyKey: 'icon-batt1',
            currentValue: deviceData['icon-batt1'],
            pathInfo,
            settings,
            iconsSupported: supportedCircularWidgetIcons,
        }));

        iconGroup2.add(this._createIconRow({
            title: _('Battery 2 Icon'),
            propertyKey: 'icon-batt2',
            currentValue: deviceData['icon-batt2'],
            pathInfo,
            settings,
            iconsSupported: supportedCircularWidgetIcons,
        }));

        iconGroup2.add(this._createIconRow({
            title: _('Battery 3 Icon'),
            propertyKey: 'icon-batt3',
            currentValue: deviceData['icon-batt3'],
            pathInfo,
            settings,
            iconsSupported: supportedCircularWidgetIcons,
        }));
        page.add(iconGroup1);
        page.add(iconGroup2);
    }

    _createIconRow({
        title, propertyKey, currentValue,
        pathInfo, settings, iconsSupported,
    }) {
        const row = new Adw.ActionRow({
            title,
        });

        const splitButton = new Adw.SplitButton({
            icon_name: `bbm-${currentValue}-symbolic`,
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
        const totalIcons = iconsSupported.length;
        const columns = Math.ceil(totalIcons / maxRows);

        iconsSupported.forEach((deviceType, index) => {
            const button = new Gtk.Button({
                icon_name: `bbm-${deviceType}-symbolic`,
                valign: Gtk.Align.CENTER,
            });
            const column = index % columns;
            const rowNum = Math.floor(index / columns);
            grid.attach(button, column, rowNum, 1, 1);

            button.connect('clicked', () => {
                popover.hide();
                const pairedDevice = settings.get_strv('gattbas-list');
                const existingPathIndex =
                pairedDevice.findIndex(item => JSON.parse(item).path === pathInfo.path);
                const existingItem = JSON.parse(pairedDevice[existingPathIndex]);

                existingItem[propertyKey] = deviceType;
                pairedDevice[existingPathIndex] = JSON.stringify(existingItem);
                settings.set_strv('gattbas-list', pairedDevice);

                splitButton.icon_name = `bbm-${deviceType}-symbolic`;
            });
        });

        popover.set_child(grid);
        splitButton.set_popover(popover);
        row.add_suffix(splitButton);

        return row;
    }
}
);

const  DeviceItem = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_GattBasDeviceItem',
}, class DeviceItem extends Adw.ActionRow {
    constructor(settings, deviceItem, pathInfo) {
        super({});
        this._settings = settings;
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
                new ConfigureWindow(settings, this._macAddress, deviceItem,
                    this._pathInfo, parentWindow);
            configureWindow.present();
        });

        const basLabel = _('Battery Service (BAS)');
        this._deleteButton = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            tooltip_text: _('The button is available after disabling %s mode').format(basLabel),
            css_classes: ['destructive-action'],
            valign: Gtk.Align.CENTER,
        });

        this._deleteButton.connect('clicked', () => {
            const pairedDevices = settings.get_strv('gattbas-list');
            const existingPathIndex = pairedDevices.findIndex(entry => {
                const parsedEntry = JSON.parse(entry);
                return parsedEntry.path === pathInfo.path;
            });

            if (existingPathIndex !== -1) {
                pairedDevices.splice(existingPathIndex, 1);
                settings.set_strv('gattbas-list', pairedDevices);
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
        this._icon.icon_name = `bbm-${this._pathInfo.icon}-symbolic`;
        this.title = pathInfo.alias;
        this.subtitle = this._macAddress;
        this._deleteButton.sensitive = !this._settings.get_boolean('enable-gattbas-device');
    }

    _pathToMacAddress(path) {
        const indexMacAddress = path.indexOf('dev_') + 4;
        const macAddress = path.substring(indexMacAddress);
        return macAddress.replace(/_/g, ':');
    }
});

export const  GattBas = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_GattBasUI',
    Template: GLib.Uri.resolve_relative(
        import.meta.url, '../ui/gattBas.ui', GLib.UriFlags.NONE
    ),
    InternalChildren: [
        'enable_gatt_bass',
        'gattbas_group',
        'no_gattbas_paired_row',
    ],
}, class GattBas extends Adw.PreferencesPage {
    constructor(settings) {
        super({});
        this._settings = settings;
        this._deviceItems = new Map();
        this._attemptOnce  = 1;

        settings.bind(
            'enable-gattbas-device',
            this._enable_gatt_bass,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        this._createDevices();
        this._settings.connect('changed::enable-gattbas-device', () => this._createDevices());
        this._settings.connect('changed::gattbas-list', () => this._createDevices());
    }

    _createDevices() {
        const pathsString = this._settings.get_strv('gattbas-list').map(JSON.parse);
        if (!pathsString || pathsString.length === 0) {
            this._no_gattbas_paired_row.visible  = true;
            return;
        }
        this._no_gattbas_paired_row.visible  = false;
        for (const info of pathsString) {
            const pathInfo = {
                path: info['path'],
                icon: info['icon'],
                alias: info['alias'],
                bat1Icon: info['icon-batt1'],
                bat2Icon: info['icon-batt2'],
                bat3Icon: info['icon-batt2'],
            };
            if (!pathInfo.alias && this._attemptOnce > 0) {
                const pathsDeviceString = this._settings.get_strv('device-list').map(JSON.parse);
                if (!pathsDeviceString || pathsDeviceString.length === 0) {
                    return;
                } else {
                    const existingPathIndex =
                    pathsDeviceString.findIndex(item => item.path === pathInfo.path);
                    if (existingPathIndex !== -1) {
                        const existingItem = pathsDeviceString[existingPathIndex];
                        pathInfo.alias = existingItem.alias;
                        const currentItem = pathsString.find(item => item.path === pathInfo.path);
                        currentItem.alias = pathInfo.alias;
                        this._settings.set_strv('gattbas-list',
                            pathsString.map(obj => JSON.stringify(obj)));
                        this._attemptOnce--;
                    }
                }
            }
            if (this._deviceItems.has(pathInfo.path)) {
                const row = this._deviceItems.get(pathInfo.path);
                row.updateProperites(pathInfo);
            } else {
                const deviceItem = new DeviceItem(this._settings, this._deviceItems, pathInfo);
                this._deviceItems.set(pathInfo.path, deviceItem);
                this._gattbas_group.add(deviceItem);
            }
        }
    }
});

