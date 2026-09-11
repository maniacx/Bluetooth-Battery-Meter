'use strict';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

export const HideBackgroundApps = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_HideBackgroundApps',
}, class HideBackgroundApps extends GObject.Object {
    _init() {
        super._init();

        this._idleTimerId = GLib.idle_add(GLib.PRIORITY_LOW, () => {
            if (!Main.panel.statusArea.quickSettings._backgroundApps &&
                Main.panel.statusArea.quickSettings._backgroundApps.quickSettingsItems[0])
                return GLib.SOURCE_CONTINUE;

            this._backgroundApps =
                    Main.panel.statusArea.quickSettings._backgroundApps.quickSettingsItems[0];

            this._hideBackgroundApps();

            this._idleTimerId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    _hideBackgroundApps() {
        this._handlerId = GObject.signal_handler_find(this._backgroundApps._proxy,
            {signalId: 'g-properties-changed'});

        this._shellBackgroundProxy = this._backgroundApps._proxy;
        this._backgroundApps._proxy = {};

        if (this._handlerId)
            GObject.signal_handler_block(this._shellBackgroundProxy, this._handlerId);

        this._shellBackgroundProxy.connectObject('g-properties-changed', () => this._sync(), this);
        this._sync();
    }

    _sync() {
        const backgroundApps = this._shellBackgroundProxy.BackgroundApps;
        this._backgroundApps._proxy.BackgroundApps = backgroundApps.filter(backgroundApp =>
            backgroundApp.app_id?.deepUnpack() !== 'io.github.maniacx.BudsLink');

        this._backgroundApps._sync();
    }


    destroy() {
        if (this._idleTimerId)
            GLib.source_remove(this._idleTimerId);
        this._idleTimerId = null;

        if (!this._backgroundApps)
            return;

        if (this._shellBackgroundProxy) {
            this._shellBackgroundProxy.disconnectObject(this);
            this._backgroundApps._proxy = this._shellBackgroundProxy;

            if (this._handlerId)
                GObject.signal_handler_unblock(this._shellBackgroundProxy, this._handlerId);
            this._handlerId = null;
        }

        this._backgroundApps._sync();

        this._backgroundApps = null;
        this._shellBackgroundProxy = null;
    }
});
