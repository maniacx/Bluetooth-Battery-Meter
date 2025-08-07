'use strict';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {BluetoothIndicator} from './widgets/bluetoothIndicator.js';
import {BluetoothPopupMenuItem} from './widgets/bluetoothPopupMenu.js';
import {BluetoothPopupSubMenuItem} from './widgets/bluetoothPopupSubMenu.js';
import {OnHoverMenu} from './widgets/onHoverMenu.js';
import {MultimodeIndicator} from './widgets/multimodeIndicator.js';

export const WidgetManagerEnhanced = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_WidgetManagerEnhanced',
    Properties: {
        'batteryPercentage': GObject.ParamSpec.int('batteryPercentage', '', 'Battery Percentage',
            GObject.ParamFlags.READWRITE, 0, 100, 0),
    },
}, class WidgetManagerEnhanced extends GObject.Object {
    _init(toggle, device, qsLevelEnabled, indicatorMode, deviceIcon, enhancedDeviceProps) {
        super._init();
        this._toggle = toggle;
        this._settings = toggle._settings;
        this._path = device.get_object_path();
        this._device = device;
        this._deviceIcon = deviceIcon;
        this._alias = this._device.alias;
        this._gIcon = this._toggle.gIcon;
        this.type = enhancedDeviceProps?.type;
        this._dataHandler = enhancedDeviceProps?.dataHandler;
        this._widgetInfo = toggle._widgetInfo;
        this._enableMultimodeIndicator = toggle.enableMultimodeIndicator;
        this._hoverModeEnabled = toggle.hoverModeEnabled;
        this._isUnlockSession = toggle._isUnlockSession;
        this._qsLevelEnabled = qsLevelEnabled;
        this._indicatorMode = indicatorMode;
        //  this._setDevIcon();
        this._client = toggle._bluetoothToggle._client;

        if (this._dataHandler)
            this._updateUI();

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

    setDataHandler(dataHandler) {
        if (!this._dataHandler && dataHandler) {
            this._dataHandler = dataHandler;
            this._setDevIcon();
            this._updateUI();
            this.popupMenuItem?.setDataHandler?.(dataHandler);
        }
    }

    _setDevIcon() {
        if (this._dataHandler) {
            const extIcon = this._dataHandler.getConfig().commonIcon;
            if (this._deviceIcon !== extIcon) {
                this._deviceIcon = extIcon;
                const props = this._toggle.deviceList.get(this._path);
                this._toggle.deviceList.set(this._path, {...props, icon: extIcon});
                this._toggle.delayedUpdateDeviceGsettings();
            }
        }
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

            if (qsPropsUpdated)
                this.popupMenuItem?.updateProperties(this._qsLevelEnabled, this._deviceIcon);

            if (this._indicatorMode !== props.indicatorMode) {
                this._indicatorMode = props.indicatorMode;
                indicatorPropsUpdated = true;
            }
            if (indicatorPropsUpdated) {
                this.indicator?.updateProperties(this._indicatorMode, this._deviceIcon);

                if (this._indicatorMode === 0)
                    this._destroyIndicator();
                else
                    this._startIndicator();
            }
        }
    }

    _aliasUpdated(alias) {
        if (this._onHoverMenu)
            this._onHoverMenu.updateAlias(alias);
        if (this._enableMultimodeIndicator)
            this.indicator?.updateAlias(alias);
        if (this._toggle.panelButton)
            this._popupMenuWidgetItem?.updateAlias(alias);
        this.popupMenuItem?.updateAlias?.(alias);
    }

    _updateUI() {
        if (this._dataHandler && this._device.connected) {
            this._dataHandler.connectObject(
                'configuration-changed', () => {
                    if (this.type) {
                        this._deviceIcon = this._dataHandler.getConfig().commonIcon;
                        this.popupMenuItem?.updateProperties(
                            this._qsLevelEnabled, this._deviceIcon);
                        this.indicator?.updateProperties(this._indicatorMode, this._deviceIcon);
                    }
                },
                'properties-changed', () => {
                    const battProps = this._dataHandler.getProps();
                    this.batteryPercentage  = battProps.computedBatteryLevel;
                },
                this
            );

            const battProps = this._dataHandler.getProps();
            this.batteryPercentage  = battProps.computedBatteryLevel;

            if (this._toggle.panelButton && !this._isUnlockSession) {
                this._popupMenuWidgetItem =
                    this._toggle.panelButton.addDevice(this._path, this._alias, this._dataHandler);
            }

            this._startIndicator();
        }
    }

    _startIndicator() {
        if (!this._device.connected || this.indicator || !this._deviceIcon || !this._dataHandler)
            return;

        if (!this._toggle.indicatorEnabled || this._indicatorMode === 0)
            return;

        //      if(this.batteryPercentage <= 0)
        //          return;

        if (this._enableMultimodeIndicator) {
            this.indicator = new MultimodeIndicator(this, this._indicatorMode,
                this._gIcon, this._path, this._alias, this._widgetInfo, this._dataHandler,
                this._hoverModeEnabled, this._isUnlockSession);
            return;
        }

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
        this._dataHandler?.disconnectObject(this);
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
