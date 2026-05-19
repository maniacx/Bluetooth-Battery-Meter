'use strict';

import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

import {createLogger} from '../logger.js';
import {SocketHandler} from '../socketByProfile.js';
import {
    PixelBudsUUID, DeviceTypePixelBuds, MessageGroup, DeviceInfoMessage, HearableControlMessage, ANCMode
} from './pixelBudsConfig.js';

export const PixelBudsSocket = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_PixelBudsSocket',
}, class PixelBudsSocket extends SocketHandler {
    _init(devicePath, profileManager, profile, callbacks) {
        super._init(devicePath, profileManager, profile);
        this._log = createLogger('PixelBudsSocket');
        this._log.info('PixelBudsSocket init');

        this._devicePath = devicePath;
        this._callbacks = callbacks;
        this._halfPacket = new Uint8Array(0);

        this._lastVersion = 0x01; // GFPS ANC Protocol version (1 or 2)
        this._lastUiToggles = 0xE8; // Default to all supported: Transparency, Adaptive, Off, ANC
        this._lastSettableToggles = 0xE8;
        this._lastCaseLevel = callbacks.initialCaseLevel || 0;
        this._lastCaseStatus = callbacks.initialCaseStatus || 'disconnected';

        this.startSocket();
    }

    processData(bytes) {
        // Accumulate bytes into accumulator
        const merged = new Uint8Array(this._halfPacket.length + bytes.length);
        merged.set(this._halfPacket, 0);
        merged.set(bytes, this._halfPacket.length);
        this._halfPacket = merged;

        // Parse accumulated packets
        while (this._halfPacket.length >= 4) {
            const group = this._halfPacket[0];
            const code = this._halfPacket[1];
            const len = (this._halfPacket[2] << 8) | this._halfPacket[3];

            if (this._halfPacket.length < 4 + len) {
                // Not enough bytes for the complete packet payload
                break;
            }

            const payload = this._halfPacket.slice(4, 4 + len);
            // Advance accumulator
            this._halfPacket = this._halfPacket.slice(4 + len);

            try {
                this._parseData(group, code, payload);
            } catch (e) {
                this._log.error(e, 'Error parsing GFPS packet');
            }
        }
    }

    async postConnectInitialization() {
        this._log.info('PixelBuds connected, querying current ANC state');
        // Query the current ANC state: Group 0x08, Code 0x11, Length 0
        const queryBytes = new Uint8Array([MessageGroup.HEARABLE_CONTROL, HearableControlMessage.GET_ANC_STATE, 0x00, 0x00]);
        this.sendMessage(queryBytes);
    }

    _parseData(group, code, payload) {
        if (group === MessageGroup.DEVICE_INFO && code === DeviceInfoMessage.BATTERY_UPDATE) {
            if (payload.length < 3) return;

            const parseComponent = (byte) => {
                if ((byte & 0x7F) === 0x7F) {
                    return { level: 0, status: 'disconnected' };
                }
                const charging = (byte & 0x80) !== 0;
                const level = byte & 0x7F;
                return {
                    level,
                    status: charging ? 'charging' : 'discharging'
                };
            };

            const left = parseComponent(payload[0]);
            const right = parseComponent(payload[1]);
            const caseInfo = parseComponent(payload[2]);

            if (caseInfo.status !== 'disconnected') {
                this._lastCaseLevel = caseInfo.level;
                this._lastCaseStatus = caseInfo.status;
            }

            this._log.info(`Parsed GFPS Battery: L=${left.level}% (${left.status}), R=${right.level}% (${right.status}), C=${caseInfo.level}% (${caseInfo.status}) (caching case: L=${this._lastCaseLevel}% S=${this._lastCaseStatus})`);

            this._callbacks.updateBatteryProps({
                battery1Level: left.level,
                battery1Status: left.status,
                battery2Level: right.level,
                battery2Status: right.status,
                battery3Level: this._lastCaseLevel,
                battery3Status: this._lastCaseStatus,
            });
        } else if (group === MessageGroup.HEARABLE_CONTROL && code === HearableControlMessage.NOTIFY_ANC_STATE) {
            if (payload.length < 4) return;

            const version = payload[0];
            const uiToggles = payload[1];
            const settableToggles = payload[2];
            const currentState = payload[3];

            this._log.info(`Parsed GFPS ANC Notification: Version=${version}, UI=${uiToggles.toString(16)}, Settable=${settableToggles.toString(16)}, State=${currentState.toString(16)}`);

            this._lastVersion = version;
            this._lastUiToggles = uiToggles;
            this._lastSettableToggles = settableToggles;

            this._callbacks.updateNoiseControl(currentState);
        }
    }

    sendAncState(targetState) {
        // Construct the 4-byte payload: [Version, UI toggles, Settable toggles, Target state]
        const payload = new Uint8Array([
            this._lastVersion,
            this._lastUiToggles,
            this._lastSettableToggles,
            targetState
        ]);

        const header = new Uint8Array([
            MessageGroup.HEARABLE_CONTROL,
            HearableControlMessage.SET_ANC_STATE,
            0x00,
            payload.length
        ]);

        const packet = new Uint8Array(header.length + payload.length);
        packet.set(header, 0);
        packet.set(payload, header.length);

        this.sendMessage(packet);
    }
});
