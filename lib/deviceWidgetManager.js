'use strict';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {BluetoothIndicator} from './widgets/bluetoothIndicator.js';
import {BluetoothPopupMenuItem} from './widgets/bluetoothPopupMenu.js';
import {OnHoverMenu} from './widgets/onHoverMenu.js';
import {MultimodeIndicator} from './widgets/multimodeIndicator.js';

export const DeviceWidgetManager = GObject.registerClass({
    Properties: {
        'batteryPercentage': GObject.ParamSpec.int('batteryPercentage', '', 'Battery Percentage',
            GObject.ParamFlags.READWRITE, 0, 100, 0),
    },
}, class DeviceWidgetManager extends GObject.Object {
    _init(toggle, device, batteryReported, qsLevelEnabled,
        indicatorMode, deviceIcon, enhancedDeviceProps) {
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
        this._isUnlockSession = toggle._isUnlockSession;
        this._batteryReported = batteryReported;
        this._qsLevelEnabled = qsLevelEnabled;
        this._indicatorMode = indicatorMode;
        this._enableMultimodeIndicator = this._settings.get_boolean('enable-multi-indicator-mode');
        this._hoverModeEnabled = this._settings.get_boolean('enable-on-hover-mode');
        this._setDevIcon();
        this._client = toggle._bluetoothToggle._client;
        if (!this.type) {
            this._checkLateBluezBatteryReporting();
            this._startIndicator();
        }
        if (toggle.enhancedDeviceManager && this.type && this._dataHandler)
            this._startExtendedGUI();

        this.popupMenuItem = new BluetoothPopupMenuItem(this, device, qsLevelEnabled, deviceIcon);

        this._settings.connectObject(
            'changed::enable-multi-indicator-mode', () => {
                this._enableMultimodeIndicator =
                    this._settings.get_boolean('enable-multi-indicator-mode');
                this._destroyIndicator();
                this._startIndicator();
            },
            'changed::enable-on-hover-mode', () => {
                this._hoverModeEnabled = this._settings.get_boolean('enable-on-hover-mode');
                this._destroyIndicator();
                this._startIndicator();
            },
            this
        );

        this._device.connectObject(
            'notify::connected', () => {
                if (this._device.connected) {
                    if (!this.type)
                        this._startIndicator();
                } else {
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
            this._startExtendedGUI();
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
                this.popupMenuItem?.updateProperties(this._qsLevelEnabled, this._deviceIcon);
                this.indicator?.updateProperties(this._indicatorMode, this._deviceIcon);
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
            if (!this._type && this._deviceIcon !== props.icon) {
                this._deviceIcon = props.icon;
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
            else if (!this.type || this._dataHandler)
                this._startIndicator();
        }
    }

    _checkLateBluezBatteryReporting() {
        this._device.bind_property('battery_percentage',
            this, 'batteryPercentage',
            GObject.BindingFlags.SYNC_CREATE);
        if (!this._batteryReported) {
            this._notiftId = this.connect(
                'notify::batteryPercentage', () => {
                    if (this._device.battery_percentage > 0) {
                        const props = this._toggle.deviceList.get(this._path);
                        this._toggle.deviceList.set(this._path, {
                            ...props, batteryReported: true,
                            qsLevelEnabled: true, indicatorMode: 2,
                        });
                        this._toggle.pushDevicesToGsetting();
                        this.disconnect(this._notiftId);
                        this._notiftId = null;
                    }
                }
            );
        }
    }

    _aliasUpdated(alias) {
        if (this._onHoverMenu)
            this._onHoverMenu.updateAlias(alias);
        if (this._enableMultimodeIndicator)
            this.indicator?.updateAlias(alias);
        if (this._toggle.panelButton)
            this._popupMenuWidgetItem?.updateAlias(alias);
    }

    _startExtendedGUI() {
        if (this._dataHandler && this._device.connected) {
            this._device.connectObject(
                'notify::alias', () => this._aliasUpdated(this._alias), this);
            this._dataHandler.connectObject(
                'configuration-changed', () => {
                    this._deviceIcon = this._dataHandler.getConfig().commonIcon;
                    this.popupMenuItem?.updateProperties(this._qsLevelEnabled, this._deviceIcon);
                    this.indicator?.updateProperties(this._indicatorMode, this._deviceIcon);
                },
                'properties-changed', () => {
                    const battProps = this._dataHandler.getProps();
                    this.batteryPercentage  = this._updateCriticalBatteryInfo(battProps);
                },
                this
            );

            const battProps = this._dataHandler.getProps();
            this.batteryPercentage  = this._updateCriticalBatteryInfo(battProps);

            if (this._toggle.panelButton && !this._isUnlockSession) {
                this._popupMenuWidgetItem =
                    this._toggle.panelButton.addDevice(this._path, this._alias, this._dataHandler);
            }

            this._startIndicator();
        }
    }

    _startIndicator() {
        if (!this._device.connected)
            return;

        if (!this._toggle._bluetoothIndicatorEnabled || this._indicatorMode === 0)
            return;

        if (this.indicator || !this._deviceIcon)
            return;

        if (!this.type) {
            this.indicator = new BluetoothIndicator(this, this._indicatorMode, this._deviceIcon);
            this._toggle.addIndicatorWidget(this.indicator);
            return;
        }

        const hasInfo = this.type && this._dataHandler && this._deviceIcon;
        if (!hasInfo)
            return;

        if (this._enableMultimodeIndicator) {
            if (this.indicator) {
                return;
            } else {
                this.indicator = new MultimodeIndicator(this, this._indicatorMode,
                    this._gIcon, this._path, this._alias, this._widgetInfo, this._dataHandler,
                    this._hoverModeEnabled, this._isUnlockSession);
                return;
            }
        }

        this.indicator = new BluetoothIndicator(this, this._indicatorMode, this._deviceIcon);
        this._toggle.addIndicatorWidget(this.indicator);

        if (this._hoverModeEnabled && !this._isUnlockSession && !this._onHoverMenu) {
            this._onHoverMenu = new OnHoverMenu(this.indicator, this._settings, this._gIcon,
                this._path, this._alias, this._widgetInfo, this._dataHandler);
        }
    }

    _updateCriticalBatteryInfo(battProps) {
        const bat1 = battProps.battery1Level;
        const bat2 = battProps.battery2Level;
        const status1 = battProps.battery1Status;
        const status2 = battProps.battery2Status;
        const isInvalid = level => level === null || level === undefined || level === 0;
        if (status1 === 'charging' && !isInvalid(bat1) && isInvalid(bat2))
            return bat1;

        if (status2 === 'charging' && !isInvalid(bat2) && isInvalid(bat1))
            return bat2;

        if (status1 === 'charging' && status2 !== 'charging')
            return isInvalid(bat2) ? 0 : bat2;

        if (status2 === 'charging' && status1 !== 'charging')
            return isInvalid(bat1) ? 0 : bat1;

        if (isInvalid(bat1) && isInvalid(bat2))
            return 0;

        if (isInvalid(bat1))
            return bat2;

        if (isInvalid(bat2))
            return bat1;

        return bat1 < bat2 ? bat1 : bat2;
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
        if (this._notiftId)
            this.disconnect(this._notiftId);
        this._notiftId = null;
        if (this._eventTimerId)
            GLib.source_remove(this._eventTimerId);
        this._eventTimerId = null;
        if (this._stateSignalId)
            this._client?._client?.disconnect(this._stateSignalId);
        this._stateSignalId = null;
        this._settings?.disconnectObject(this);
        this._device?.disconnectObject(this);
        this._destroyOnDisconnect();
        this.popupMenuItem?.destroy();
        this.popupMenuItem = null;
        this._client = null;
        this._settings = null;
        this._toggle = null;
        this._device = null;
    }
});
