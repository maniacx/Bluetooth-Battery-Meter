'use strict';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {ConfigureWindow} from './configureWindow.js';

const DeviceItem = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_GfpsDeviceItem',
}, class DeviceItem extends Adw.ActionRow {
    constructor(settings, deviceItem, pathInfo) {
        super({});
        this._settings = settings;
        this._macAddress = this._pathToMacAddress(pathInfo.path);

        this._icon = new Gtk.Image({
            icon_name: `bbm-${pathInfo.icon}-symbolic`,
        });

        this._customiseButton = new Gtk.Button({
            icon_name: 'bbm-settings-symbolic',
            tooltip_text: _('Configure device.'),
            valign: Gtk.Align.CENTER,
        });

        this._customiseButton.connect('clicked', () => {
            const parentWindow = this._customiseButton.get_ancestor(Gtk.Window);
            const configureWindow = new ConfigureWindow(settings, this._macAddress,
                pathInfo.path, parentWindow, _, true);

            configureWindow.present();
        });

        const gfpsLabel = _('Google Fast Pair');
        this._deleteButton = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            tooltip_text: _('The button is available after disabling %s mode')
                .format(gfpsLabel),
            css_classes: ['destructive-action'],
            valign: Gtk.Align.CENTER,
        });

        this._deleteButton.connect('clicked', () => {
            const pairedDevices = settings.get_strv('gfps-list');
            const existingPathIndex = pairedDevices.findIndex(entry => {
                const parsedEntry = JSON.parse(entry);
                return parsedEntry.path === pathInfo.path;
            });

            if (existingPathIndex !== -1) {
                pairedDevices.splice(existingPathIndex, 1);
                settings.set_strv('gfps-list', pairedDevices);
            }
            this.get_parent().remove(this);
            deviceItem.delete(pathInfo.path);
        });

        const box = new Gtk.Box({spacing: 16});
        box.append(this._customiseButton);
        box.append(this._deleteButton);
        this.add_prefix(this._icon);
        this.add_suffix(box);

        this.updateProperties(pathInfo);
    }

    updateProperties(pathInfo) {
        this.title = pathInfo.alias;
        this.subtitle = this._macAddress;
        this._deleteButton.sensitive = !this._settings.get_boolean('enable-gfps-device');
        this._icon.icon_name = `bbm-${pathInfo.icon}-symbolic`;
    }

    _pathToMacAddress(path) {
        const indexMacAddress = path.indexOf('dev_') + 4;
        const macAddress = path.substring(indexMacAddress);
        return macAddress.replace(/_/g, ':');
    }
});

export const Gfps = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_GfpsUI',
    Template: GLib.Uri.resolve_relative(
        import.meta.url, '../../../ui/devices/gfps.ui', GLib.UriFlags.NONE
    ),
    InternalChildren: [
        'enable_gfps_device',
        'gfps_group',
        'no_gfps_paired_row',
    ],
}, class Gfps extends Adw.PreferencesPage {
    constructor(settings) {
        super({});
        this._settings = settings;
        this._deviceItems = new Map();

        settings.bind(
            'enable-gfps-device',
            this._enable_gfps_device,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        this._createDevices();
        this._settings.connect('changed::enable-gfps-device', () => this._createDevices());
        this._settings.connect('changed::gfps-list', () => this._createDevices());
    }

    _createDevices() {
        const pathsString = this._settings.get_strv('gfps-list').map(JSON.parse);
        if (!pathsString || pathsString.length === 0) {
            this._no_gfps_paired_row.visible = true;
            return;
        }
        this._no_gfps_paired_row.visible = false;
        for (const info of pathsString) {
            const pathInfo = {
                path: info['path'],
                icon: info['icon'],
                alias: info['alias'],
            };
            if (this._deviceItems.has(pathInfo.path)) {
                const row = this._deviceItems.get(pathInfo.path);
                row.updateProperties(pathInfo);
            } else {
                const deviceItem = new DeviceItem(this._settings, this._deviceItems, pathInfo);
                this._deviceItems.set(pathInfo.path, deviceItem);
                this._gfps_group.add(deviceItem);
            }
        }
    }
});
