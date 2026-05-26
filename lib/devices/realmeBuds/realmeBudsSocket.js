'use strict';
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

        this._profileManager.releaseFd(this._profile.type, this._devicePath, true);
        this.destroy();
    }

    destroy() {
        if (this._closeTimeoutId)
            GLib.source_remove(this._closeTimeoutId);
        this._closeTimeoutId = null;
        this._connecting = false;
        super.destroy();
    }
});
