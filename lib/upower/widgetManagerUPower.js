'use strict';
import GObject from 'gi://GObject';

import {BluetoothIndicator} from '../widgets/bluetoothIndicator.js';
import {OnHoverMenu} from '../widgets/onHoverMenu.js';
import {createConfig, createProperties, DataHandler} from '../dataHandler.js';

export const WidgetManagerUPower = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_WidgetManagerUPower',
    Properties: {
        'batteryPercentage': GObject.ParamSpec.int('batteryPercentage', '', 'Battery Percentage',
            GObject.ParamFlags.READWRITE, 0, 100, 0),
    },
}, class WidgetManagerUPower extends GObject.Object {
    _init(toggle, path, alias, deviceIcon, percentage) {
        super._init();
        this._toggle = toggle;
        this._settings = toggle._settings;
        this._path = path;
        this._deviceIcon = deviceIcon;
        this._alias = alias;
        this._gIcon = this._toggle.gIcon;
        this._widgetInfo = toggle._widgetInfo;
        this._isUnlockSession = toggle._isUnlockSession;
        this._hoverModeEnabled = toggle.hoverModeEnabled;
        this.batteryPercentage = percentage;
        this._dconfig = createConfig();
        this._dprops = createProperties();
        this._dconfig.battery1Icon = this._deviceIcon;
        this._dconfig.commonIcon = this._deviceIcon;
        this._dconfig.albumArtIcon = this._deviceIcon;
        this._dprops.computedBatteryLevel = this.batteryPercentage;
        this._dprops.battery1Level = this.batteryPercentage;
        this._dataHandler = new DataHandler(this._dconfig, this._dprops);
        this._updateUI();
    }

    updatePercentage(percentage) {
        this.batteryPercentage = percentage;
    }

    _updateUI() {
        if (this._toggle.panelButton && !this._isUnlockSession && !this._popupMenuWidgetItem) {
            this._popupMenuWidgetItem =
                    this._toggle.panelButton.addDevice(this._path, this._alias, this._dataHandler);
        }

        this._startIndicator();
    }

    _startIndicator() {
        if (this.indicator || !this._deviceIcon)
            return;

        this.indicator = new BluetoothIndicator(this, 2, this._deviceIcon);
        this._toggle.addIndicatorWidget(this.indicator);

        if (this._hoverModeEnabled && !this._isUnlockSession && !this._onHoverMenu) {
            this._onHoverMenu = new OnHoverMenu(this.indicator, this._settings, this._gIcon,
                this._path, this._alias, this._widgetInfo, this._dataHandler);
        }
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
        this._destroyOnDisconnect();
        this._settings = null;
        this._toggle = null;
        this._device = null;
    }
});
