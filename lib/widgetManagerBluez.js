'use strict';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {BluetoothIndicator} from './widgets/bluetoothIndicator.js';
import {BluetoothPopupMenuItem} from './widgets/bluetoothPopupMenu.js';
import {BluetoothPopupSubMenuItem} from './widgets/bluetoothPopupSubMenu.js';
import {OnHoverMenu} from './widgets/onHoverMenu.js';
import {createConfig, createProperties, DataHandler} from './dataHandler.js';

export const WidgetManagerBluez = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_WidgetManagerBluez',
    Properties: {
        'batteryPercentage': GObject.ParamSpec.int('batteryPercentage', '', 'Battery Percentage',
            GObject.ParamFlags.READWRITE, 0, 100, 0),
    },
}, class WidgetManagerBluez extends GObject.Object {
    _init(toggle, device, batteryReported, qsLevelEnabled, indicatorMode, deviceIcon) {
        super._init();
        this._toggle = toggle;
        this._settings = toggle._settings;
        this._path = device.get_object_path();
        this._device = device;
        this._deviceIcon = deviceIcon;
        this._alias = this._device.alias;
        this._gIcon = this._toggle.gIcon;
        this._widgetInfo = toggle._widgetInfo;
        this._isUnlockSession = toggle._isUnlockSession;
        this._hoverModeEnabled = toggle.hoverModeEnabled;
        this._batteryReported = batteryReported;
        this._qsLevelEnabled = qsLevelEnabled;
        this._indicatorMode = indicatorMode;
        this._client = toggle._bluetoothToggle._client;

        this._checkLateBluezBatteryReporting();

        if (this._toggle.usePopupInQuickSettings) {
            this.popupMenuItem =
                new BluetoothPopupSubMenuItem(this, device, qsLevelEnabled, deviceIcon);
        } else {
            this.popupMenuItem =
                new BluetoothPopupMenuItem(this, device, qsLevelEnabled, deviceIcon);
        }


        this._device.connectObject(
            'notify::alias', () => this._aliasUpdated(this._alias),
            'notify::connected', () => {
                if (!this._device.connected) {
                    this._destroyOnDisconnect();
                    this.batteryPercentage = 0;
                }
                this._recordTimeEvent();
            },
            this
        );
    }

    _checkLateBluezBatteryReporting() {
        this._device.bind_property('battery_percentage',
            this, 'batteryPercentage',
            GObject.BindingFlags.SYNC_CREATE);
        this.connectObject(
            'notify::batteryPercentage', () => {
                if (!this._batteryReported && this._device.battery_percentage > 0) {
                    const props = this._toggle.deviceList.get(this._path);
                    this._toggle.deviceList.set(this._path, {
                        ...props, batteryReported: true,
                        qsLevelEnabled: true, indicatorMode: 2,
                    });
                    this._toggle.pushDevicesToGsetting();
                }
                this._updateDataHandler();
            },
            this
        );
        this._updateDataHandler();
    }

    _updateDataHandler() {
        if (!this._dataHandler && this._device.battery_percentage > 0) {
            this._dconfig = createConfig();
            this._dprops = createProperties();
            this._dconfig.battery1Icon = this._deviceIcon;
            this._dconfig.commonIcon = this._deviceIcon;
            this._dconfig.albumArtIcon = this._deviceIcon;
            this._dprops.computedBatteryLevel = this.batteryPercentage;
            this._dprops.battery1Level = this.batteryPercentage;
            this._dataHandler = new DataHandler(this._dconfig, this._dprops);
            this.popupMenuItem?.setDataHandler?.(this._dataHandler);
            this._updateUI();
        } else if (this._device.battery_percentage > 0) {
            this._dprops.computedBatteryLevel = this.batteryPercentage;
            this._dprops.battery1Level = this.batteryPercentage;
            this._dataHandler?.setProps(this._dprops);
        }
        this._updateUI();
    }

    update() {
        if (this._toggle.deviceList.has(this._path)) {
            let qsPropsUpdated = false;
            let indicatorPropsUpdated = false;
            const props = this._toggle.deviceList.get(this._path);
            if (this._qsLevelEnabled !== props.qsLevelEnabled) {
                this._qsLevelEnabled = props.qsLevelEnabled;
                qsPropsUpdated = true;
            }
            if (this._deviceIcon !== props.icon) {
                this._deviceIcon = props.icon;
                this._dconfig.battery1Icon = this._deviceIcon;
                this._dconfig.commonIcon = this._deviceIcon;
                this._dconfig.albumArtIcon = this._deviceIcon;
                this._dataHandler?.setConfig(this._dconfig);
                qsPropsUpdated = true;
                indicatorPropsUpdated = true;
            }
            if (qsPropsUpdated)
                this.popupMenuItem?.updateProperties(this._qsLevelEnabled, this._deviceIcon);

            if (this._indicatorMode !== props.indicatorMode) {
                this._indicatorMode = props.indicatorMode;
                indicatorPropsUpdated = true;
            }
            if (indicatorPropsUpdated)
                this.indicator?.updateProperties(this._indicatorMode, this._deviceIcon);

            if (this._indicatorMode === 0)
                this._destroyIndicator();
            else
                this._updateDataHandler();
        }
    }

    _aliasUpdated(alias) {
        if (this._onHoverMenu)
            this._onHoverMenu.updateAlias(alias);
        if (this._toggle.panelButton)
            this._popupMenuWidgetItem?.updateAlias(alias);
        this.popupMenuItem?.updateAlias?.(alias);
    }

    _updateUI() {
        if (this._dataHandler && this._device.connected) {
            if (this._toggle.panelButton && !this._isUnlockSession && !this._popupMenuWidgetItem) {
                this._popupMenuWidgetItem =
                    this._toggle.panelButton.addDevice(this._path, this._alias, this._dataHandler);
            }

            this._startIndicator();
        }
    }

    _startIndicator() {
        if (!this._device.connected || this.indicator || !this._deviceIcon)
            return;

        if (!this._toggle.indicatorEnabled || this._indicatorMode === 0)
            return;

        this.indicator = new BluetoothIndicator(this, this._indicatorMode, this._deviceIcon);
        this._toggle.addIndicatorWidget(this.indicator);

        if (this._hoverModeEnabled && !this._isUnlockSession && !this._onHoverMenu) {
            this._onHoverMenu = new OnHoverMenu(this.indicator, this._settings, this._gIcon,
                this._path, this._alias, this._widgetInfo, this._dataHandler);
        }
    }

    _recordTimeEvent() {
        let stateChanged = false;

        this._stateSignalId = this._client._client.connect(
            'notify::default-adapter-state', () => {
                stateChanged = true;
                if (this._eventTimerId) {
                    GLib.Source.remove(this._eventTimerId);
                    this._eventTimerId = null;
                }
                this._client._client.disconnect(this._stateSignalId);
            }
        );

        this._eventTimerId = GLib.timeout_add_seconds(GLib.PRIORITY_LOW, 3, () => {
            if (!stateChanged) {
                const currentTime = GLib.DateTime.new_now_utc().to_unix();
                const props = this._toggle.deviceList.get(this._path);
                if (this._device.connected) {
                    this._toggle.deviceList
                        .set(this._path, {...props, connectedTime: currentTime});
                } else {
                    this._toggle.deviceList
                        .set(this._path, {...props, disconnectedTime: currentTime});
                }
                this._toggle.delayedUpdateDeviceGsettings();
            }

            if (this._stateSignalId)
                this._client._client.disconnect(this._stateSignalId);
            this._stateSignalId = null;
            this._eventTimerId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    _destroyIndicator() {
        this._onHoverMenu?.destroy();
        this._onHoverMenu = null;
        this.indicator?.destroy();
        this.indicator = null;
    }

    _destroyOnDisconnect() {
        this._dataHandler = null;
        this._toggle?.panelButton?.removeDevice(this._path);
        this._popupMenuWidgetItem = null;
        this._destroyIndicator();
    }

    destroy() {
        if (this._eventTimerId)
            GLib.source_remove(this._eventTimerId);
        this._eventTimerId = null;
        if (this._stateSignalId)
            this._client?._client?.disconnect(this._stateSignalId);
        this._stateSignalId = null;
        this._settings?.disconnectObject(this);
        this._device?.disconnectObject(this);
        this.disconnectObject(this);
        this._destroyOnDisconnect();
        this.popupMenuItem?.destroy();
        this.popupMenuItem = null;
        this._client = null;
        this._settings = null;
        this._toggle = null;
        this._device = null;
    }
});
