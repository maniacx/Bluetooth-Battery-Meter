'use strict';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {createLogger} from '../logger.js';
import {SocketHandler} from '../socketByProfile.js';
import {
    BatteryType, BatteryChargingStatus, EarDetection, ANCMode,
    AwarenessMode, PacketConstants
} from './airpodsConfig.js';

/**
AppleDevice Class: Airpods / Beats module for Bluetooth battery meter service to provide,
battery information, ANC and Convesational awareness on device that support it.

Credits:
https://github.com/steam3d/MagicPodsCore
steam3d for reverse battery reporting , ANC control

https://github.com/kavishdevar/librepods
kavishdevar for Conversation awarness and AAP Definations
**/

export const AirpodsSocket = GObject.registerClass(
class AirpodsSocket extends SocketHandler {
    _init(devicePath, fd, batteryType, ancSupported,
        adaptiveSupported, awarenessSupported, callbacks) {
        super._init(devicePath, fd);
        const identifier = devicePath.split('_').slice(-3).join('');
        const tag = `AirpodsDevice-${identifier}`;
        this._log = createLogger(tag);
        this._log.info('AirpodsDevice init');
        this._batteryType = batteryType;
        this._ancSupported = ancSupported;
        this._adaptiveSupported = adaptiveSupported;
        this._awarenessSupported = awarenessSupported;
        this._specificFeatureAckRecieved = false;
        this._callbacks = callbacks;

        this._ancMode = ANCMode.ANC_OFF;
        this._awarenessMode = AwarenessMode.OFF;
        this._bud1State = EarDetection.IN_CASE;
        this._bud2State = EarDetection.IN_CASE;

        this.startSocket(fd);
    }

    async postConnectInitialization() {
        await this.sendMessage(PacketConstants.HANDSHAKE);
        this._log.info('Handshake sent');

        if (this._awarenessSupported) {
            await this.sendMessage(PacketConstants.SET_SPECIFIC_FEATURES);
            this._log.info('Specific features sent');
        }

        await new Promise(resolve => {
            this._delayReadTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 250, () => {
                resolve();
                this._delayReadTimeoutId = null;
                return GLib.SOURCE_REMOVE;
            });
        });

        await this.sendMessage(PacketConstants.REQUEST_NOTIFICATIONS);
        this._log.info('Request notifications sent');
    }

    processData(data) {
        const isPrefix = (arr, prefix) =>
            prefix.every((val, i) => arr[i] === val);

        if (isPrefix(data, PacketConstants.HANDSHAKE_ACK)) {
            this._log.info('Received HANDSHAKE_ACK');
            return;
        }

        if (isPrefix(data, PacketConstants.FEATURES_ACK)) {
            this._specificFeatureAckRecieved = true;
            this._log.info('Received FEATURES_ACK');
            return;
        }

        if (data.length === 22 &&
                isPrefix(data, PacketConstants.BATTERY_STATUS_NOTIFICATION)) {
            this._log.info('Received Battery notification');
            this._parseBatteryStatus(data);
            return;
        }

        if (isPrefix(data, PacketConstants.EAR_DETECTION_PREFIX)) {
            this._log.info('Received Ear detection status update');
            this._parseEarDetection(data);
            return;
        }

        if (this._ancSupported && data.length === 11 &&
                isPrefix(data, PacketConstants.NOISE_CANCELLATION_HEADER)) {
            this._log.info('Received ANC mode update');
            this._parseAncStatus(data);
            return;
        }

        if (this._adaptiveSupported && data.length === 11 &&
                isPrefix(data, PacketConstants.ADAPTIVE_CONTROL_HEADER)) {
            this._log.info('Received Adative mode level update');
            this._parseAdaptiveLevel(data);
            return;
        }

        if (this._awarenessSupported && data.length === 11 &&
                isPrefix(data, PacketConstants.CONVERSATION_AWARENESS_HEADER)) {
            this._log.info('Received Conversation mode update');
            this._parseAwarenessStatus(data);
            return;
        }

        if (this._awarenessSupported && data.length === 10 &&
                isPrefix(data, PacketConstants.CONVERSATION_AWARENESS_DATA)) {
            this._log.info('Received Conversation mode data update');
            this._parseAwarenessData(data);
        }
    }


    _parseBatteryStatus(data) {
        const count = data[6];
        if (count < 1 || count > 3)
            return;

        let start = 7;
        const props = {};

        for (let i = 0; i < count; i++) {
            const type = data[start];
            const level = Math.max(0, Math.min(data[start + 2], 100));
            const statusByte = data[start + 3];

            const charging = (statusByte & BatteryChargingStatus.CHARGING) !== 0;
            const statusStr = charging ? 'charging' : 'discharging';

            let batteryIndex = null;
            if (type === BatteryType.SINGLE || type === BatteryType.LEFT)
                batteryIndex = 1;
            else if (type === BatteryType.RIGHT)
                batteryIndex = 2;
            else if (type === BatteryType.CASE)
                batteryIndex = 3;

            if (batteryIndex !== null) {
                props[`battery${batteryIndex}Level`] = level;
                props[`battery${batteryIndex}Status`] = statusStr;
            }

            start += 5;
        }

        if (this._callbacks?.updateBatteryProps)
            this._callbacks.updateBatteryProps(props);
    }

    _parseAncStatus(data) {
        if (data.length < 11)
            return;
        const ancModeByte = data[7];

        if (!Object.values(ANCMode).includes(ancModeByte))
            return;

        if (this._ancMode !== ancModeByte) {
            this._ancMode = ancModeByte;

            if (this._callbacks?.updateAncMode)
                this._callbacks.updateAncMode(ancModeByte);
        }
    }

    _parseAdaptiveLevel(data) {
        if (data.length < 11)
            return;
        const adaptiveLevelByte = data[7];

        if (adaptiveLevelByte < 0 && adaptiveLevelByte > 100)
            return;

        if (this._adaptiveLevelByte !== adaptiveLevelByte) {
            this._adaptiveLevelByte = adaptiveLevelByte;

            if (this._callbacks?.updateAdaptiveLevel)
                this._callbacks.updateAdaptiveLevel(adaptiveLevelByte);
        }
    }

    _parseAwarenessStatus(data) {
        if (data.length < 8)
            return;

        const awarenessModeByte = data[7];

        if (!Object.values(AwarenessMode).includes(awarenessModeByte))
            return;

        if (this._awarenessMode !== awarenessModeByte) {
            this._awarenessMode = awarenessModeByte;

            if (this._callbacks?.updateAwarenessMode)
                this._callbacks.updateAwarenessMode(awarenessModeByte);
        }
    }

    _parseEarDetection(data) {
        const bud1Raw = data[6];
        const bud2Raw = data[7];

        const validValues = Object.values(EarDetection);
        if (!validValues.includes(bud1Raw) || !validValues.includes(bud2Raw))
            return;

        if (this._awarenessSupported && this._specificFeatureAckRecieved) {
            const previousStateOutEar = this._bud1State !== EarDetection.IN_EAR &&
                this._bud2State !== EarDetection.IN_EAR;
            const newStateInEar = bud1Raw === EarDetection.IN_EAR ||
                bud2Raw !== EarDetection.IN_EAR;

            if (previousStateOutEar && newStateInEar) {
                this.sendMessage(PacketConstants.SET_SPECIFIC_FEATURES);
                this._log.info('Specific features sent');
            }
        }

        if (bud1Raw !== this._bud1State || bud2Raw !== this._bud2State) {
            this._bud1State = bud1Raw;
            this._bud2State = bud2Raw;

            if (this._callbacks?.updateInEarStatus)
                this._callbacks.updateInEarStatus(bud1Raw, bud2Raw);
        }
    }

    _parseAwarenessData(data) {
        if (data.length < 10)
            return;

        const level = data[9];
        if (level >= 1 && level <= 9) {
            const attenuated = level <= 2;

            if (this._callbacks?.updateAwarenessData)
                this._callbacks.updateAwarenessData(attenuated);
        }
    }

    setAncMode(mode) {
        if (mode === ANCMode.ANC_OFF)
            this.sendMessage(PacketConstants.NOISE_CANCELLATION_OFF);
        else if (mode === ANCMode.ANC_ON)
            this.sendMessage(PacketConstants.NOISE_CANCELLATION_ON);
        else if (mode === ANCMode.TRANSPARENCY)
            this.sendMessage(PacketConstants.NOISE_CANCELLATION_TRANSPARENCY);
        else if (mode === ANCMode.ADAPTIVE)
            this.sendMessage(PacketConstants.NOISE_CANCELLATION_ADAPTIVE);
    }

    setAdaptiveLevel(level) {
        const levelPacket = Uint8Array.from([
            ...PacketConstants.ADAPTIVE_CONTROL_HEADER,
            level,
            ...PacketConstants.SUFFIX,
        ]);
        this.sendMessage(levelPacket);
    }

    setAwarenessMode(mode) {
        if (mode === AwarenessMode.ON)
            this.sendMessage(PacketConstants.CONVERSATION_AWARENESS_ON);
        else if (mode === AwarenessMode.OFF)
            this.sendMessage(PacketConstants.CONVERSATION_AWARENESS_OFF);

        if (this._callbacks?.updateAwarenessMode)
            this._callbacks.updateAwarenessMode(mode);
    }

    destroy() {
        if (this._delayReadTimeoutId)
            GLib.source_remove(this._delayReadTimeoutId);
        this._delayReadTimeoutId = null;
        super.destroy();
    }
});

