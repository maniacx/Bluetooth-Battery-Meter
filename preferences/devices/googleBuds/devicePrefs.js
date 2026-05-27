'use strict';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {ConfigureWindow} from './configureWindow.js';

const DeviceItem = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_GoogleBudsDeviceItem',
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

        const googleBudsLabel = _('Google Pixel Buds');
        this._deleteButton = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            tooltip_text: _('The button is available after disabling %s mode')
                .format(googleBudsLabel),
            css_classes: ['destructive-action'],
            valign: Gtk.Align.CENTER,
        });

        this._deleteButton.connect('clicked', () => {
            const pairedDevices = settings.get_strv('google-buds-list');
            const existingPathIndex = pairedDevices.findIndex(entry => {
                const parsedEntry = JSON.parse(entry);
                return parsedEntry.path === pathInfo.path;
            });

            if (existingPathIndex !== -1) {
                pairedDevices.splice(existingPathIndex, 1);
                settings.set_strv('google-buds-list', pairedDevices);
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
        this._deleteButton.sensitive = !this._settings.get_boolean('enable-google-buds-device');
        this._icon.icon_name = `bbm-${pathInfo.icon}-symbolic`;
    }

    _pathToMacAddress(path) {
        const indexMacAddress = path.indexOf('dev_') + 4;
        const macAddress = path.substring(indexMacAddress);
        return macAddress.replace(/_/g, ':');
    }
});

export const GoogleBuds = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_GoogleBudsUI',
    Template: GLib.Uri.resolve_relative(
        import.meta.url, '../../../ui/devices/googleBuds.ui', GLib.UriFlags.NONE
    ),
    InternalChildren: [
        'enable_google_buds_device',
        'google_buds_group',
        'no_google_buds_paired_row',
    ],
}, class GoogleBuds extends Adw.PreferencesPage {
    constructor(settings) {
        super({});
        this._settings = settings;
        this._deviceItems = new Map();

        settings.bind(
            'enable-google-buds-device',
            this._enable_google_buds_device,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );

        this._createDevices();
        this._settings.connect('changed::enable-google-buds-device', () => this._createDevices());
        this._settings.connect('changed::google-buds-list', () => this._createDevices());
    }

    _createDevices() {
        const pathsString = this._settings.get_strv('google-buds-list').map(JSON.parse);
        if (!pathsString || pathsString.length === 0) {
            this._no_google_buds_paired_row.visible = true;
            return;
        }
        this._no_google_buds_paired_row.visible = false;
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
                this._google_buds_group.add(deviceItem);
            }
        }
    }
});
