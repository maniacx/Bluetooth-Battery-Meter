#!/usr/bin/env -S gjs -m

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {createLogger} from './logger.js';

const EXTENSION_BUS_NAME = 'org.gnome.Shell.Extensions';
const EXTENSION_OBJECT_PATH = '/org/gnome/Shell/Extensions';
const EXTENSION_INTERFACE = 'org.gnome.Shell.Extensions';
const TARGET_EXTENSION_UUID = 'Bluetooth-Battery-Meter@maniacx.github.com';

export const MonitorExtensionState = GObject.registerClass(
class MonitorExtensionState extends GObject.Object {
    _init(requestExitCb) {
        super._init();
        const tag = 'MonitorExtensionState';
        this._log = createLogger(tag);
        this._timeoutId = null;
        this._requestExitCb = requestExitCb;
        this.EXTENSION_STATE_ACTIVE = 1;
        this._initialize();
    }

    async _initialize() {
        try {
            this._proxy = await Gio.DBusProxy.new(
                Gio.DBus.session,
                Gio.DBusProxyFlags.NONE,
                null,
                EXTENSION_BUS_NAME,
                EXTENSION_OBJECT_PATH,
                EXTENSION_INTERFACE,
                null
            );

            this._proxy.connect('g-signal', this._onSignal.bind(this));
            this._queryInitialState();
        } catch (e) {
            this._log.error(e, 'Failed to create proxy');
        }
    }

    async _queryInitialState() {
        try {
            const result = await this._proxy.call(
                'GetExtensionInfo',
                GLib.Variant.new_tuple([GLib.Variant.new_string(TARGET_EXTENSION_UUID)]),
                Gio.DBusCallFlags.NONE,
                -1,
                null
            );

            const [info] = result.recursiveUnpack();
            this._log.info(`Extension initial state → ${info.state}`);
            this._handleExtensionState(TARGET_EXTENSION_UUID, info);
        } catch (e) {
            this._log.error(e, 'Initial GetExtensionInfo call failed');
        }
    }

    _onSignal(proxy, senderName, signalName, parameters) {
        if (signalName !== 'ExtensionStateChanged')
            return;

        const [uuid, info] = parameters.recursiveUnpack();
        this._handleExtensionState(uuid, info);
    }

    _handleExtensionState(uuid, stateDict) {
        if (uuid !== TARGET_EXTENSION_UUID)
            return;

        const newState = stateDict.state;
        this._log.info(`ExtensionStateChanged ${uuid} → state ${newState}`);

        if (newState !== this.EXTENSION_STATE_ACTIVE) {
            if (!this._timeoutId) {
                this._timeoutId = GLib.timeout_add_seconds(
                    GLib.PRIORITY_DEFAULT, 3,
                    this._exitIfStillInactive.bind(this)
                );
            }
        } else if (this._timeoutId) {
            GLib.source_remove(this._timeoutId);
            this._timeoutId = null;
        }
    }

    _exitIfStillInactive() {
        this._requestExitCb();
    }
});

