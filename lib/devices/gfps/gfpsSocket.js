'use strict';

import GObject from 'gi://GObject';

import {createLogger, getDeviceIdentifier} from '../logger.js';
import {SocketHandler} from '../socketByProfile.js';
import {MessageGroup, DeviceInfoMessage, HearableControlMessage} from './gfpsConfig.js';

export const GfpsSocket = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_GfpsSocket',
}, class GfpsSocket extends SocketHandler {
    _init(devicePath, profileManager, profile, callbacks) {
        super._init(devicePath, profileManager, profile);
        const identifier = getDeviceIdentifier(devicePath);
        const tag = `GfpsSocket-${identifier}`;
        this._log = createLogger(tag);
        this._log.info('GfpsSocket init');

        this._devicePath = devicePath;
        this._callbacks = callbacks;
        this._initialized = false;
        this._halfPacket = new Uint8Array(0);

        this._lastVersion = 0x01; // GFPS ANC Protocol version (1 or 2)
        this._lastUiToggles = 0xE8; // Default to all supported: Transparency, Adaptive, Off, ANC
        this._lastSettableToggles = 0xE8;

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

            // If length is unreasonably large, assume corruption and resync by dropping 1 byte
            if (len > 256) {
                this._log.info(`Corrupt GFPS header detected (len=${len}), dropping 1 byte to resync`);
                this._halfPacket = this._halfPacket.slice(1);
                continue;
            }

            if (this._halfPacket.length < 4 + len) {
                // Not enough bytes for the complete packet payload
                // Prevent buffer from growing infinitely
                if (this._halfPacket.length > 512) {
                    this._log.info(`GFPS buffer overflow (len=${this._halfPacket.length}), clearing accumulator`);
                    this._halfPacket = new Uint8Array(0);
                }
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

    postConnectInitialization() {
        this._log.info('GFPS Socket Initialized');
    }

    _parseData(group, code, payload) {
        if (group === MessageGroup.DEVICE_INFO && code === DeviceInfoMessage.BATTERY_UPDATE) {
            const parseComponent = byte => {
                if ((byte & 0x7F) === 0x7F)
                    return {level: 0, status: 'disconnected'};

                const charging = (byte & 0x80) !== 0;
                const level = byte & 0x7F;
                return {
                    level,
                    status: charging ? 'charging' : 'discharging',
                };
            };

            const bat1 = parseComponent(payload[0]);
            let bat2, bat3;
            if (payload.length === 3) {
                bat2 = parseComponent(payload[1]);
                bat3 = parseComponent(payload[2]);
            } else if (payload.length === 1) {
                bat2 = {level: 0, status: 'disconnected'};
                bat3 = {level: 0, status: 'disconnected'};
            } else {
                this._log.info(`Unexpected GFPS battery payload length: ${payload.length}`);
                return;
            }

            this._log.info(
                `Parsed GFPS Battery: L=${bat1.level}% (${bat1.status}), ` +
                `R=${bat2.level}% (${bat2.status}), C=${bat3.level}% (${bat3.status})`
            );

            if (!this._initialized) {
                const battType = payload.length === 1 ? 1 : 3;
                this._initialize(battType);
            }

            this._callbacks.updateBatteryProps({
                battery1Level: bat1.level,
                battery1Status: bat1.status,
                battery2Level: bat2.level,
                battery2Status: bat2.status,
                battery3Level: bat3.level,
                battery3Status: bat3.status,
            });
        } else if (group === MessageGroup.HEARABLE_CONTROL &&
                 code === HearableControlMessage.NOTIFY_ANC_STATE) {
            if (payload.length < 4)
                return;

            const version = payload[0];
            const uiToggles = payload[1];
            const settableToggles = payload[2];
            const currentState = payload[3];

            this._log.info(
                `Parsed GFPS ANC Notification: Version=${version}, UI=${uiToggles.toString(16)}, ` +
                `Settable=${settableToggles.toString(16)}, State=${currentState.toString(16)}`
            );

            this._lastVersion = version;
            this._lastUiToggles = uiToggles;
            this._lastSettableToggles = settableToggles;

            this._callbacks.updateNoiseControl(currentState, settableToggles);
        }
    }

    _requestAncState() {
        this._log.info('GFPS connected, querying current ANC state');
        // Query the current ANC state: Group 0x08, Code 0x11, Length 0
        const queryBytes = new Uint8Array([MessageGroup.HEARABLE_CONTROL,
            HearableControlMessage.GET_ANC_STATE, 0x00, 0x00]);

        this.sendMessage(queryBytes);
    }

    _initialize(battType) {
        this._initialized = true;
        this._callbacks.updateInitDevice(battType);
        this._requestAncState();
    }

    sendAncState(targetState) {
        // Construct the 4-byte payload: [Version, UI toggles, Settable toggles, Target state]
        const payload = new Uint8Array([
            this._lastVersion,
            this._lastUiToggles,
            this._lastSettableToggles,
            targetState,
        ]);

        const header = new Uint8Array([
            MessageGroup.HEARABLE_CONTROL,
            HearableControlMessage.SET_ANC_STATE,
            0x00,
            payload.length,
        ]);

        const packet = new Uint8Array(header.length + payload.length);
        packet.set(header, 0);
        packet.set(payload, header.length);

        this.sendMessage(packet);
    }
});
