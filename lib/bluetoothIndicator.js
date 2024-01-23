'use strict';
import Gio from 'gi://Gio';
import GObject from 'gi://GObject';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';

export const BluetoothIndicator = GObject.registerClass(
class BluetoothIndicator extends QuickSettings.SystemIndicator {
    constructor(device, extensionObj) {
        super();
        this._extensionObj = extensionObj;
        this._device = device;
        this._indicator = this._addIndicator();
        this._indicator.visible = false;

        this._device.bind_property_full('battery_percentage',
            this._indicator, 'visible',
            GObject.BindingFlags.SYNC_CREATE,
            (bind, source) => [true, !(source <= 0)], null);

        this._device.bind_property_full('battery_percentage',
            this._indicator, 'gicon',
            GObject.BindingFlags.SYNC_CREATE,
            (bind, source) => [true, this._getGicon(source)], null);
    }

    _getGicon(percent) {
        let iconPrefix = '';
        if (percent > 85)
            iconPrefix = '100';
        else if (percent <= 85 && percent > 60)
            iconPrefix = '75';
        else if (percent <= 60 && percent > 35)
            iconPrefix = '50';
        else if (percent <= 35 && percent > 20)
            iconPrefix = '25';
        else if (percent <= 20 && percent > 10)
            iconPrefix = '20';
        else if (percent <= 10 && percent >= 0)
            iconPrefix = '10';
        return Gio.icon_new_for_string(
            `${this._extensionObj.path}/icons/hicolor/scalable/actions/bbm-${iconPrefix}-${this._device.icon}-symbolic.svg`);
    }
});
