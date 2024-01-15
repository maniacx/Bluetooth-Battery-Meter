'use strict';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {ngettext} from 'resource:///org/gnome/shell/extensions/extension.js';
import {BluetoothIndicator} from './blutoothIndicator.js';
import {BluetoothDeviceItem} from './blutoothPopupMenu.js';

const QuickSettingsMenu = Main.panel.statusArea.quickSettings;
const supportedIcons = ['audio-speakers', 'audio-headphones', 'audio-headset', 'input-gaming', 'input-keyboard', 'input-mouse', 'input-tablet'];

export const BluetoothToggle = GObject.registerClass({
}, class BluetoothToggle extends GObject.Object {
    constructor(extensionObj, settings) {
        super();
        this._extensionObj = extensionObj;
        this._settings = settings;

        this._idleTimerId = GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            if (!Main.panel.statusArea.quickSettings._bluetooth)
                return GLib.SOURCE_CONTINUE;
            this._bluetoothToggle = Main.panel.statusArea.quickSettings._bluetooth.quickSettingsItems[0];
            this._startBluetoothToggle();
            return GLib.SOURCE_REMOVE;
        });
    }

    _startBluetoothToggle() {
        this._deviceIndicators = new Map();
        this._removedDeviceList = [];
        this._originalSync = this._bluetoothToggle._sync;
        this._bluetoothToggle._sync = () => {
            this._sync();
        };
        this._originalRemoveDevice = this._bluetoothToggle._removeDevice;
        this._bluetoothToggle._removeDevice = path => {
            this._removeDevice(path);
        };
        this._desktopSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this._desktopSettings.connectObject(
            'changed::text-scaling-factor', () => {
                this._bluetoothToggle._onActiveChanged();
            },
            this
        );

        this._settings.connectObject(
            'changed::enable-battery-indicator', () => {
                if (this._settings.get_boolean('enable-battery-indicator'))
                    this._sync();
                else
                    this._destroyIndicators();
            },
            'changed::enable-battery-level-text', () => {
                this._showBatteryPercentage = this._settings.get_boolean('enable-battery-level-text');
                this._bluetoothToggle._onActiveChanged();
            },
            'changed::enable-battery-level-icon', () => {
                this._showBatteryIcon = this._settings.get_boolean('enable-battery-level-icon');
                this._bluetoothToggle._onActiveChanged();
            },
            'changed::swap-icon-text', () => {
                this._swapIconText = this._settings.get_boolean('swap-icon-text');
                this._bluetoothToggle._onActiveChanged();
            },
            this
        );
        this._idleTimerId = null;
        this._showBatteryPercentage = this._settings.get_boolean('enable-battery-level-text');
        this._showBatteryIcon = this._settings.get_boolean('enable-battery-level-icon');
        this._swapIconText = this._settings.get_boolean('swap-icon-text');
        // Note: this._bluetoothToggle._onActiveChanged() calls destroy() on all popup-menu items
        //    and calls sync which creates new popup-menu items, if bluetooth device is connected
        //    See https://gitlab.gnome.org/GNOME/gnome-shell/-/blob/main/js/ui/status/bluetooth.js?ref_type=heads#L324-L331
        this._bluetoothToggle._onActiveChanged();
    }

    _removeDevice(path) {
        this._bluetoothToggle._deviceItems.get(path)?.destroy();
        this._bluetoothToggle._deviceItems.delete(path);
        this._deviceIndicators.get(path)?.destroy();
        this._deviceIndicators.delete(path);
        this._removedDeviceList.push(path);

        this._bluetoothToggle._updateDeviceVisibility();
    }

    _sync() {
        const devices = this._bluetoothToggle._getSortedDevices();
        if (this._removedDeviceList.length > 0) {
            const pathsInDevices = new Set(devices.map(dev => dev.get_object_path()));
            this._removedDeviceList = this._removedDeviceList.filter(path => pathsInDevices.has(path));
        }

        for (const dev of devices) {
            const path = dev.get_object_path();
            if (this._bluetoothToggle._deviceItems.has(path))
                continue;
            if (this._removedDeviceList.length > 0) {
                const pathIndex = this._removedDeviceList.indexOf(path);
                if (pathIndex > -1) {
                    if (dev.connected)
                        this._removedDeviceList.splice(pathIndex, 1);
                    else
                        continue;
                }
            }

            const item = new BluetoothDeviceItem(dev, this._bluetoothToggle._client, this._extensionObj,
                supportedIcons, this._showBatteryPercentage, this._showBatteryIcon, this._swapIconText);
            item.connect('notify::visible', () => this._bluetoothToggle._updateDeviceVisibility());
            this._bluetoothToggle._deviceSection.addMenuItem(item);
            this._bluetoothToggle._deviceItems.set(path, item);
        }

        if (this._settings.get_boolean('enable-battery-indicator')) {
            for (const dev of devices) {
                const path = dev.get_object_path();
                if (this._deviceIndicators.has(path)) {
                    if (!dev.connected) {
                        this._deviceIndicators.get(path)?.destroy();
                        this._deviceIndicators.delete(path);
                    }
                    continue;
                }
                if (!dev.connected)
                    continue;
                if (!supportedIcons.includes(dev.icon))
                    continue;
                const indicator = new BluetoothIndicator(dev, this._extensionObj, this._settings);
                QuickSettingsMenu.addExternalIndicator(indicator);
                this._deviceIndicators.set(path, indicator);
            }
        }

        const connectedDevices = devices.filter(dev => dev.connected);
        const nConnected = connectedDevices.length;

        if (nConnected > 1)

            this._bluetoothToggle.subtitle = ngettext('%d Connected', '%d Connected', nConnected).format(nConnected);
        else if (nConnected === 1)
            this._bluetoothToggle.subtitle = connectedDevices[0].alias;
        else
            this._bluetoothToggle.subtitle = null;

        this._bluetoothToggle._updateDeviceVisibility();
    }

    _destroyIndicators() {
        if (this._deviceIndicators) {
            this._deviceIndicators.forEach(indicator => indicator?.destroy());
            this._deviceIndicators.clear();
        }
    }

    destroy() {
        this._destroyIndicators();
        if (this._bluetoothToggle && this._originalSync)
            this._bluetoothToggle._sync = this._originalSync;
        this._originalSync = null;
        if (this._bluetoothToggle && this._originalRemoveDevice)
            this._bluetoothToggle._removeDevice = this._originalRemoveDevice;
        this._originalRemoveDevice = null;
        this._bluetoothToggle?._onActiveChanged();
        if (this._idleTimerId)
            GLib.source_remove(this._idleTimerId);
        this._desktopSettings.disconnectObject(this);
        this._settings.disconnectObject(this);
        this._idleTimerId = null;
        this._deviceIndicators = null;
        this._desktopSettings = null;
        this._settings = null;
    }
});


