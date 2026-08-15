'use strict';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {SocketHandler} from '../socketByProfile.js';
import {buildFrame, buildPacket, OPOv1StreamDecoder} from './opov1Protocol.js';

const REQUEST_TIMEOUT_MS = 5000;

// SocketHandler owns the FD; this class adds OPOv1 session state and framing.
export const OPOv1Socket = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_OPOv1Socket',
}, class OPOv1Socket extends SocketHandler {
    _init(devicePath, profileManager, profile, callbacks = {}) {
        super._init(devicePath, profileManager, profile);
        this._callbacks = callbacks;
        this._decoder = new OPOv1StreamDecoder();
        this._sequence = 0;
        this._pending = new Map();
    }

    postConnectInitialization() {
        this._decoder.reset();
        this._sequence = 0;
        this._pending.clear();
        this.onConnected();
    }

    onConnected() {
    }

    request(command, payload, expectedCommand, callback = null, timeoutCallback = null) {
        if (!this.running || this._pending.has(expectedCommand))
            return false;
        const sequence = this._sequence++ & 0xFF;
        const timeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, REQUEST_TIMEOUT_MS, () => {
            this._pending.delete(expectedCommand);
            timeoutCallback?.();
            return GLib.SOURCE_REMOVE;
        });
        this._pending.set(expectedCommand, {sequence, callback, timeoutId});
        this.sendMessage(buildFrame(buildPacket(command, sequence, payload)));
        return true;
    }

    processData(bytes) {
        let packets;
        try {
            packets = this._decoder.feed(bytes);
        } catch (error) {
            this._socketLog.error(error, 'Discarding malformed OPOv1 frame');
            this._decoder.reset();
            return;
        }
        for (const packet of packets)
            this._dispatchPacket(packet);
    }

    _dispatchPacket(packet) {
        const pending = this._pending.get(packet.command);
        if (pending && pending.sequence === packet.sequence) {
            GLib.source_remove(pending.timeoutId);
            this._pending.delete(packet.command);
            pending.callback?.(packet);
        }
        this._callbacks.packet?.(packet);
    }

    destroy() {
        for (const pending of this._pending?.values() ?? [])
            GLib.source_remove(pending.timeoutId);
        this._pending?.clear();
        this._decoder?.reset();
        super.destroy();
    }
});
