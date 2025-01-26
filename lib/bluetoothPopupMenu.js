'use strict';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import {gettext as _} from 'resource:///org/gnome/shell/extensions/extension.js';

export const BluetoothDeviceItem = GObject.registerClass({
    Properties: {
        'batteryPercentage': GObject.ParamSpec.int('batteryPercentage', '', 'Battery Percentage',
            GObject.ParamFlags.READWRITE, 0, 100, 0),
    },
}, class BluetoothDeviceItem extends PopupMenu.PopupBaseMenuItem {
    constructor(toggle, device, batteryReported, qsLevelEnabled, deviceIcon) {
        super({
            style_class: 'bt-device-item',
        });
        this._toggle = toggle;
        this._settings = toggle._settings;
        this._client = toggle._bluetoothToggle._client;
        this._extensionPath = toggle._extensionPath;
        this._showBatteryPercentage = toggle._showBatteryPercentage;
        this._showBatteryIcon = toggle._showBatteryIcon;
        this._swapIconText = toggle._swapIconText;
        this._connectedColor = toggle._connectedColor;
        this._disconnectedColor = toggle._disconnectedColor;
        this._device = device;
        this._iconType = deviceIcon;
        this._qsLevelEnabled = qsLevelEnabled;

        this._icon = new St.Icon({
            style_class: 'popup-menu-icon',
        });
        this._icon.set_gicon(this._getIcon(`bbm-${this._iconType}-symbolic`));
        this.add_child(this._icon);

        this._label = new St.Label({
            x_expand: true,
        });
        this.add_child(this._label);

        if (this._swapIconText) {
            this._displayBatteryLevelIcon();
            this._displayBatteryLevelTextPercentage();
        } else {
            this._displayBatteryLevelTextPercentage();
            this._displayBatteryLevelIcon();
        }

        this._pairIcon = new St.Icon({
            style_class: 'popup-menu-icon',
        });
        this.add_child(this._pairIcon);

        this._device.bind_property('connectable',
            this, 'visible',
            GObject.BindingFlags.SYNC_CREATE);

        this._device.bind_property('alias',
            this._label, 'text',
            GObject.BindingFlags.SYNC_CREATE);

        this._device.bind_property_full('connected',
            this, 'accessible_name',
            GObject.BindingFlags.SYNC_CREATE,
            (bind, source) => [true, source ? _('Disconnect') : _('Connect')],
            null);

        this._assignPairingIcon(false);

        this.activate = __ => {
            this._toggleConnected().catch(logError);
        };

        this._device.connectObject(
            'notify::connected', () => {
                this._assignPairingIcon(false);
                this._recordTimeEvent();
            },
            this
        );

        if (!batteryReported) {
            this._device.bind_property('battery_percentage',
                this, 'batteryPercentage',
                GObject.BindingFlags.SYNC_CREATE);

            this._notiftId = this.connect(
                'notify::batteryPercentage', () => {
                    if (this._device.battery_percentage > 0) {
                        this._addBatterySupportedDevice();
                        this.disconnect(this._notiftId);
                        this._notiftId = null;
                    }
                }
            );

            if (this._device.battery_percentage > 0)
                this._addBatterySupportedDevice();
        }

        this.connectObject('destroy', () => {
            if (this._iconChangeTimerId)
                GLib.source_remove(this._iconChangeTimerId);
            this._iconChangeTimerId = null;
            if (this._idleTimerId)
                GLib.source_remove(this._idleTimerId);
            this._idleTimerId = null;
            if (this._eventTimerId)
                GLib.source_remove(this._eventTimerId);
            this._eventTimerId = null;
            if (this._stateSignalId)
                this._client._client.disconnect(this._stateSignalId);
            this._stateSignalId = null;
            if (this._notiftId)
                this.disconnect(this._notiftId);
            this._notiftId = null;
        }, this);
    }

    updateProps(qsLevelEnabled, deviceIcon) {
        this._qsLevelEnabled = qsLevelEnabled;
        if (this._showBatteryIcon)
            this._batteryIcon.visible =  this._qsLevelEnabled && this._device.battery_percentage > 0;
        if (this._showBatteryPercentage)
            this._batteryPercentageLabel.visible =  this._qsLevelEnabled && this._device.battery_percentage > 0;
        if (this._iconType !== deviceIcon) {
            this._iconType = deviceIcon;
            this._icon.set_gicon(this._getIcon(`bbm-${this._iconType}-symbolic`));
        }
    }

    _addBatterySupportedDevice() {
        const path = this._device.get_object_path();
        const props = this._toggle._deviceList.get(path);
        this._toggle._deviceList.set(path, {...props, batteryReported: true, qsLevelEnabled: true, indicatorMode: 2});
        this._toggle._pushDevicesToGsetting();
    }

    _displayBatteryLevelTextPercentage() {
        if (this._showBatteryPercentage) {
            this._batteryPercentageLabel = new St.Label({text: '100%'});
            this.add_child(this._batteryPercentageLabel);
            if (this._idleTimerId)
                GLib.source_remove(this._idleTimerId);
            this._idleTimerId = GLib.idle_add(GLib.PRIORITY_LOW, () => {
                if (!this._batteryPercentageLabel.get_parent())
                    return GLib.SOURCE_CONTINUE;
                if (this._swapIconText) {
                    this._batteryPercentageLabel.set_width(this._batteryPercentageLabel.get_width());
                    this._batteryPercentageLabel.style_class = 'bbm-bt-percentage-label';
                }
                this._batteryPercentageLabel.text = '';
                this._bindLabel();
                this._idleTimerId = null;
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    _bindLabel() {
        this._device.bind_property_full('battery_percentage',
            this._batteryPercentageLabel, 'visible',
            GObject.BindingFlags.SYNC_CREATE,
            (bind, source) => [true, this._qsLevelEnabled && source > 0], null);

        this._device.bind_property_full('battery_percentage',
            this._batteryPercentageLabel, 'text',
            GObject.BindingFlags.SYNC_CREATE,
            (bind, source) => [true, `${source}%`], null);
    }

    _displayBatteryLevelIcon() {
        if (this._showBatteryIcon) {
            this._batteryIcon = new St.Icon({
                style_class: 'popup-menu-icon',
            });
            this.add_child(this._batteryIcon);

            this._device.bind_property_full('battery_percentage',
                this._batteryIcon, 'visible',
                GObject.BindingFlags.SYNC_CREATE,
                (bind, source) => [true, this._qsLevelEnabled && source > 0], null);

            this._device.bind_property_full('battery_percentage',
                this._batteryIcon, 'icon-name',
                GObject.BindingFlags.SYNC_CREATE,
                (bind, source) => [true, source <= 0 ? '' : `battery-level-${10 * Math.floor(source / 10)}-symbolic`],
                null);
        }
    }

    async _toggleConnected() {
        this._assignPairingIcon(true);
        await this._client.toggleDevice(this._device);
        this._assignPairingIcon(false);
    }

    _assignPairingIcon(toggleActivated) {
        if (toggleActivated) {
            if (this._iconChangeTimerId)
                GLib.source_remove(this._iconChangeTimerId);
            this._counter = 4;
            if (!this._device.connected)
                this._pairIcon?.set_style(`color: ${this._connectedColor};`);
            else
                this._pairIcon?.set_style(`color: ${this._disconnectedColor};`);

            const connected = this._device.connected;
            this._iconChangeTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
                this._pairIcon?.set_gicon(connected ? this._getIcon(`bbm-bluetooth-disconnecting-${this._counter}-symbolic`)
                    : this._getIcon(`bbm-bluetooth-connecting-${this._counter}-symbolic`));
                this._counter = this._counter <= 1 ? 4 : this._counter - 1;
                return GLib.SOURCE_CONTINUE;
            });
        } else {
            if (this._iconChangeTimerId)
                GLib.source_remove(this._iconChangeTimerId);
            this._iconChangeTimerId = null;
            if (this._device.connected) {
                this._pairIcon?.set_gicon(this._getIcon('bbm-bluetooth-connected-symbolic'));
                this._pairIcon?.set_style(`color: ${this._connectedColor};`);
            } else {
                this._pairIcon?.set_gicon(this._getIcon('bbm-bluetooth-disconnecting-1-symbolic'));
                this._pairIcon?.set_style(`color: ${this._disconnectedColor};`);
            }
        }
    }

    _getIcon(iconName) {
        return Gio.icon_new_for_string(`${this._extensionPath}/icons/hicolor/scalable/actions/${iconName}.svg`);
    }

    _recordTimeEvent() {
        let stateChanged = false;

        this._stateSignalId = this._client._client.connect('notify::default-adapter-state', () => {
            stateChanged = true;
            if (this._eventTimerId) {
                GLib.Source.remove(this._eventTimerId);
                this._eventTimerId = null;
            }
            this._client._client.disconnect(this._stateSignalId);
        });

        this._eventTimerId = GLib.timeout_add_seconds(GLib.PRIORITY_LOW, 3, () => {
            if (!stateChanged) {
                const currentTime = GLib.DateTime.new_now_utc().to_unix();
                const path = this._device.get_object_path();
                const props = this._toggle._deviceList.get(path);
                if (this._device.connected)
                    this._toggle._deviceList.set(path, {...props, connectedTime: currentTime});
                else
                    this._toggle._deviceList.set(path, {...props, disconnectedTime: currentTime});
                this._toggle._pushDevicesToGsetting();
            }

            if (this._stateSignalId)
                this._client._client.disconnect(this._stateSignalId);
            this._stateSignalId = null;
            this._eventTimerId = null;
            return GLib.SOURCE_REMOVE;
        });
    }
});


