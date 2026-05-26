'use strict';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {createLogger} from '../logger.js';
import {SocketHandler} from '../socketByProfile.js';

const COMMAND_ANC_SET = [0x04, 0x04];

export const RealmeBudsSocket = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_RealmeBudsSocket',
}, class RealmeBudsSocket extends SocketHandler {
    _init(devicePath, profileManager, profile, callbacks) {
        super._init(devicePath, profileManager, profile);
        const identifier = devicePath.slice(-2);
        this._log = createLogger(`RealmeBudsSocket-${identifier}`);
        this._seq = 0;
        this._frameBuffer = new Uint8Array(0);
        this._pendingMode = null;
        this._connecting = false;
        this._lastClosedAt = 0;
        this._callbacks = callbacks;
    }

    _nextSeq() {
        this._seq = this._seq >= 0xFF ? 0x01 : this._seq + 1;
        return this._seq;
    }

    _encodeFrame(command, data = []) {
        const payloadSize = 1 + command.length + 1 + 2 + data.length;
        const lenField = payloadSize + 1;
        const seq = this._nextSeq();

        return Uint8Array.from([
            0xAA,
            lenField & 0xFF,
            lenField >> 8 & 0xFF,
            0x00,
            ...command,
            seq,
            data.length & 0xFF,
            data.length >> 8 & 0xFF,
            ...data,
        ]);
    }

    processData(bytes) {
        if (!bytes || bytes.length === 0)
            return;

        const incoming = Uint8Array.from(bytes);
        const buffer = new Uint8Array(this._frameBuffer.length + incoming.length);
        buffer.set(this._frameBuffer, 0);
        buffer.set(incoming, this._frameBuffer.length);
        this._frameBuffer = new Uint8Array(0);

        let offset = 0;
        while (offset < buffer.length) {
            const start = buffer.indexOf(0xAA, offset);
            if (start === -1)
                return;

            if (buffer.length - start < 3) {
                this._frameBuffer = buffer.slice(start);
                return;
            }

            const frameLength = (buffer[start + 1] | buffer[start + 2] << 8) + 2;
            if (buffer.length - start < frameLength) {
                this._frameBuffer = buffer.slice(start);
                return;
            }

            const frame = buffer.slice(start, start + frameLength);
            this._parseFrame(frame);
            offset = start + frameLength;
        }
    }

    postConnectInitialization() {
        this._connecting = false;
        this._sendPendingMode();
    }

    _parseFrame(frame) {
        if (!frame || frame.length < 9)
            return;

        const command = [frame[4], frame[5]];
        const seq = frame[6];
        const dataLen = frame[7] | frame[8] << 8;
        const data = frame.slice(9, 9 + dataLen);

        const commandText = command.map(b => b.toString(16).padStart(2, '0')).join(' ');
        this._log.info(`Frame cmd=${commandText} seq=${seq}`);

        if (command[0] === 0x04 && command[1] === 0x84 && data[0] === 0x00) {
            this._callbacks?.ackReceived?.();
            this._scheduleClose(100);
        }
    }

    setNoiseControl(mode) {
        this._pendingMode = mode;

        if (this.running) {
            this._sendPendingMode();
            return;
        }

        if (this._connecting)
            return;

        this._connectWhenReady();
    }

    _connectWhenReady() {
        const elapsed = Date.now() - this._lastClosedAt;
        const delay = Math.max(0, 500 - elapsed);

        if (delay > 0) {
            if (this._connectDelayId)
                GLib.source_remove(this._connectDelayId);

            this._connectDelayId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delay, () => {
                this._connectDelayId = null;
                this._startSession();
                return GLib.SOURCE_REMOVE;
            });
            return;
        }

        this._startSession();
    }

    _startSession() {
        if (this.running || this._connecting)
            return;

        this._connecting = true;
        this.startSocket().finally(() => {
            this._connecting = false;
        });
    }

    _sendPendingMode() {
        if (!this.running || this._pendingMode == null)
            return;

        const mode = this._pendingMode;
        this._pendingMode = null;
        this._log.info(`Set NoiseControl: ${mode}`);
        const packet = this._encodeFrame(COMMAND_ANC_SET, [0x01, 0x01, mode]);
        this.sendMessage(packet);
        this._scheduleClose(700);
    }

    _scheduleClose(delayMs) {
        if (this._closeTimeoutId)
            GLib.source_remove(this._closeTimeoutId);

        this._closeTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, delayMs, () => {
            this._closeTimeoutId = null;
            this._closeSession();
            return GLib.SOURCE_REMOVE;
        });
    }

    _closeSession() {
        if (!this.running)
            return;

        this.running = false;
        this._cancellable.cancel();
        this._cancellable = new Gio.Cancellable();
        this._output_queue = [];
        this._lastClosedAt = Date.now();

        try {
            this._socket?.shutdown(true, true);
        } catch (e) {
            this._log.error(e, 'Error shutting down Bluetooth socket');
        }

        try {
            this._connection?.close(null);
        } catch (e) {
            this._log.error(e, 'Error closing Gio.SocketConnection');
        }

        try {
            this._socket?.close();
        } catch (e) {
            this._log.error(e, 'Error closing Gio.Socket');
        }

        this._connection = null;
        this._input_stream = null;
        this._output_stream = null;
        this._socket = null;
        this._profileManager.releaseFd(this._profile.type, this._devicePath, false);
    }

    destroy(permanent = false) {
        if (this._closeTimeoutId)
            GLib.source_remove(this._closeTimeoutId);
        this._closeTimeoutId = null;
        if (this._connectDelayId)
            GLib.source_remove(this._connectDelayId);
        this._connectDelayId = null;
        this._connecting = false;

        if (permanent) {
            super.destroy();
            return;
        }

        this._closeSession();
    }
});
