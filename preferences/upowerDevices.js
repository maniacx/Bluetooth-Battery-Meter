'use strict';
import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import Gtk from 'gi://Gtk';
import {gettext as _} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {supportedIcons} from '../lib/vectorImages.js';
import * as Helper from '../lib/upowerHelper.js';

const  ConfigureWindow = GObject.registerClass({
}, class ConfigureWindow extends Adw.Window {
    _init(settings, deviceItem, pathInfo, parentWindow) {
        super._init({
            title: pathInfo.model,
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

        const modelGroup = new Adw.PreferencesGroup({
            title: `Model: ${pathInfo.model}`,
        });

        const status = _('Battery Status:');
        const batteryStatus = pathInfo.batteryReported  ? _('Reported') : _('Not Available');
        modelGroup.set_description(`${status} ${batteryStatus}`);
        page.add(modelGroup);

        const iconGroup = new Adw.PreferencesGroup({
            title: _('Icon'),
        });

        const iconRow = new Adw.ActionRow({
            title: _('Select Icon'),
            subtitle: _('Select the icon used for the indicator and quick menu'),
        });

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

        supportedIcons.forEach((deviceType, index) => {
            const button = new Gtk.Button({
                icon_name: `bbm-${deviceType}-symbolic`,
                valign: Gtk.Align.CENTER,
            });
            grid.attach(button, index % 4, Math.floor(index / 4), 1, 1);
            button.connect('clicked', () => {
                popover.hide();
                const onlineDevice = settings.get_strv('upower-device-list');
                const existingPathIndex = onlineDevice.findIndex(item => JSON.parse(item).path === pathInfo.path);
                const existingItem = JSON.parse(onlineDevice[existingPathIndex]);
                existingItem['icon'] = deviceType;
                onlineDevice[existingPathIndex] = JSON.stringify(existingItem);
                settings.set_strv('upower-device-list', onlineDevice);
                iconSplitButton.icon_name = `bbm-${deviceType}-symbolic`;
            });
        });

        popover.set_child(grid);
        iconSplitButton.set_popover(popover);
        iconRow.add_suffix(iconSplitButton);
        iconGroup.add(iconRow);
        page.add(iconGroup);

        const indicatorGroup = new Adw.PreferencesGroup({
            title: _('Indicator'),
        });

        const indicatorRow = new Adw.ActionRow({
            title: _('Configure Indicator'),
            subtitle: _('Choose how the indicator should behave'),
        });

        const indicatorOptions = [
            {id: false, label: _('Hide Icon')},
            {id: true, label: _('Show Icon')},
        ];

        const dropDown = new Gtk.DropDown({
            valign: Gtk.Align.CENTER,
            model: Gtk.StringList.new(indicatorOptions.map(option => option.label)),
            selected: indicatorOptions.findIndex(option => option.id === pathInfo.indicatorMode),
        });

        dropDown.connect('notify::selected', () => {
            const index = dropDown.get_selected();
            const selectedId = indicatorOptions[index].id;

            const onlineDevice = settings.get_strv('upower-device-list');
            const existingPathIndex = onlineDevice.findIndex(item => JSON.parse(item).path === pathInfo.path);

            if (existingPathIndex !== -1) {
                const existingItem = JSON.parse(onlineDevice[existingPathIndex]);
                existingItem['indicator-mode'] = selectedId;
                onlineDevice[existingPathIndex] = JSON.stringify(existingItem);
                settings.set_strv('upower-device-list', onlineDevice);
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
}, class DeviceItem extends Adw.ActionRow {
    constructor(settings, deviceItem, pathInfo, presentDevices) {
        super({});
        this._pathInfo = pathInfo;

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
            const configureWindow = new ConfigureWindow(settings, deviceItem, this._pathInfo, parentWindow);
            configureWindow.present();
        });

        this._deleteButton = new Gtk.Button({
            icon_name: 'user-trash-symbolic',
            tooltip_text: _('Delete device information: The button is available after upower device are removed'),
            css_classes: ['destructive-action'],
            valign: Gtk.Align.CENTER,
        });

        this._deleteButton.connect('clicked', () => {
            const upowerDevices = settings.get_strv('upower-device-list');
            const existingPathIndex = upowerDevices.findIndex(entry => {
                const parsedEntry = JSON.parse(entry);
                return parsedEntry.path === pathInfo.path;
            });

            if (existingPathIndex !== -1) {
                upowerDevices.splice(existingPathIndex, 1);
                settings.set_strv('upower-device-list', upowerDevices);
            }
            this.get_parent().remove(this);
            deviceItem.delete(pathInfo.path);
        });

        const box = new Gtk.Box({spacing: 16});
        box.append(this._customiseButton);
        box.append(this._deleteButton);
        this.add_prefix(this._icon);
        this.add_suffix(box);

        this.updateProperites(pathInfo, presentDevices);
    }

    updateProperites(pathInfo, presentDevices) {
        this._pathInfo = pathInfo;
        const devicePresent = presentDevices.includes(pathInfo.path);
        const removedLabel = _('(Removed)');
        const onlineLabel = _('(Added)');
        this.title = pathInfo.model;
        this.subtitle = devicePresent ? `${pathInfo.path} ${onlineLabel}` : `${pathInfo.path} ${removedLabel}`;
        this._deleteButton.sensitive = !devicePresent;
        this._icon.icon_name = `bbm-${pathInfo.icon}-symbolic`;
    }
});


export const  UpowerDevices = GObject.registerClass({
    GTypeName: 'BBM_UpowerDevice',
    Template: GLib.Uri.resolve_relative(import.meta.url, '../ui/upowerDevices.ui', GLib.UriFlags.NONE),
    InternalChildren: [
        'enable_upower_level_icon',
        'upower_device_group',
        'no_online_row',
    ],
}, class UpowerDevices extends Adw.PreferencesPage {
    constructor(settings) {
        super({});
        this._settings = settings;
        this._requestedProps = ['PowerSupply', 'NativePath'];
        this._presentDevices = [];
        this._deviceItems = new Map();
        this._settings.bind(
            'enable-upower-level-icon',
            this._enable_upower_level_icon,
            'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        this._settings.connect('changed::enable-upower-level-icon', () => this._upowerManager());
        this._upowerManager();
    }

    async _upowerManager() {
        const enableUpowerIndicator = this._settings.get_boolean('enable-upower-level-icon');
        this._upower_device_group.visible = enableUpowerIndicator;
        if (enableUpowerIndicator) {
            await this._initializeUpower();
            this._createDevices();
            this._signalId = this._settings.connect('changed::upower-device-list', () => this._createDevices());
        } else {
            if (this._signalId)
                this._settings.disconnect(this._signalId);
            this._signalId = null;
            if (this._dbusSignalId && this._dbusProxy)
                this._dbusProxy.disconnect(this._dbusSignalId);
            this._dbusSignalId = null;
            this._dbusProxy = null;
            if (this._cancellable) {
                this._cancellable.cancel();
                this._cancellable = null;
            }
            if (this._deviceItems.size > 0) {
                this._deviceItems.forEach(item => this._upower_device_group.remove(item));
                this._deviceItems.clear();
            }
        }
    }

    async _initializeUpower() {
        this._cancellable = new Gio.Cancellable();
        this._dbusProxy = await Helper.initProxy(this._cancellable);
        if (!this._dbusProxy)
            return;

        const devices = await Helper.getDevices(this._dbusProxy, this._cancellable, this._requestedProps);
        if (!this._cancellable || this._cancellable.is_cancelled())
            return;
        this._dbusSignalId = Helper.watchDevices(this._dbusProxy, this._refreshDevices.bind(this));
        for (const dev of devices)
            this._addDevice(dev);
    }

    _createDevices() {
        const devices = this._settings.get_strv('upower-device-list').map(JSON.parse);
        if (!devices || devices.length === 0) {
            this._no_online_row.visible  = true;
            return;
        }
        this._no_online_row.visible  = false;
        for (const info of devices) {
            const pathInfo = {
                path: info['path'],
                icon: info['icon'],
                model: info['model'],
                indicatorMode: info['indicator-mode'],
            };
            if (this._deviceItems.has(pathInfo.path)) {
                const row = this._deviceItems.get(pathInfo.path);
                row.updateProperites(pathInfo, this._presentDevices);
            } else {
                const deviceItem = new DeviceItem(this._settings, this._deviceItems, pathInfo, this._presentDevices);
                this._deviceItems.set(pathInfo.path, deviceItem);
                this._upower_device_group.add(deviceItem);
            }
        }
    }

    _addDevice(dev) {
        const path = dev.path;
        const isPowerSupply = dev.properties['PowerSupply'];
        const nativePath = dev.properties['NativePath'];
        if (!isPowerSupply && !nativePath.startsWith('/org/bluez/') && !this._presentDevices.includes(path))
            this._presentDevices.push(path);
    }

    async _refreshDevices(path, action) {
        if (action === 'add') {
            const device = await Helper.getDeviceProps(path, null, this._requestedProps);
            this._addDevice(device);
        } else if (action === 'remove') {
            const index = this._presentDevices.indexOf(path);
            if (index !== -1)
                this._presentDevices.splice(index, 1);
            this._createDevices(path);
        }
    }
});

