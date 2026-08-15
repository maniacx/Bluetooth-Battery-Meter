'use strict';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {ConfigureWindow} from './configureWindow.js';

const DeviceItem = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_OnePlusBudsDeviceItem',
}, class DeviceItem extends Adw.ActionRow {
    _init(settings, items, info) {
        super._init();
        this._settings = settings;
        this._items = items;
        this._path = info.path;
        this._mac = info.path.substring(info.path.indexOf('dev_') + 4).replace(/_/g, ':');
        this.add_prefix(new Gtk.Image({icon_name: `bbm-${info.icon}-symbolic`}));
        const configure = new Gtk.Button({
            icon_name: 'bbm-settings-symbolic',
            tooltip_text: _('Configure device.'),
            valign: Gtk.Align.CENTER,
        });
        configure.connect('clicked', () => new ConfigureWindow(
            settings, this._mac, this._path, configure.get_ancestor(Gtk.Window), _
        ).present());
        const remove = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            tooltip_text: _('The button is available after disabling OnePlus/Oppo Buds support'),
            css_classes: ['destructive-action'],
            valign: Gtk.Align.CENTER,
            sensitive: !settings.get_boolean('enable-oneplus-buds-device'),
        });
        remove.connect('clicked', () => {
            const list = settings.get_strv('oneplus-buds-list').map(JSON.parse)
                .filter(item => item.path !== this._path);
            settings.set_strv('oneplus-buds-list', list.map(JSON.stringify));
            items.delete(this._path);
            this.get_parent().remove(this);
        });
        const actions = new Gtk.Box({spacing: 16});
        actions.append(configure);
        actions.append(remove);
        this.add_suffix(actions);
        this.update(info);
    }

    update(info) {
        this.title = info.alias;
        this.subtitle = this._mac;
    }
});

export const OnePlusBuds = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_OnePlusBudsUI',
    Template: GLib.Uri.resolve_relative(
        import.meta.url, '../../../ui/devices/oneplusBuds.ui', GLib.UriFlags.NONE
    ),
    InternalChildren: [
        'enable_oneplus_buds_device', 'enable_experimental_opov1_device',
        'oneplus_buds_group', 'no_oneplus_buds_paired_row',
    ],
}, class OnePlusBuds extends Adw.PreferencesPage {
    constructor(settings) {
        super({});
        this._settings = settings;
        this._items = new Map();
        settings.bind('enable-oneplus-buds-device', this._enable_oneplus_buds_device,
            'active', Gio.SettingsBindFlags.DEFAULT);
        settings.bind('enable-experimental-opov1-device', this._enable_experimental_opov1_device,
            'active', Gio.SettingsBindFlags.DEFAULT);
        this._createDevices();
        this._signal = settings.connect('changed::oneplus-buds-list', () => this._createDevices());
    }

    _createDevices() {
        const devices = this._settings.get_strv('oneplus-buds-list').map(JSON.parse);
        this._no_oneplus_buds_paired_row.visible = devices.length === 0;
        for (const info of devices) {
            if (this._items.has(info.path))
                this._items.get(info.path).update(info);
            else {
                const item = new DeviceItem(this._settings, this._items, info);
                this._items.set(info.path, item);
                this._oneplus_buds_group.add(item);
            }
        }
    }

    destroy() {
        if (this._signal && this._settings)
            this._settings.disconnect(this._signal);
        this._signal = null;
        this._settings = null;
    }
});
