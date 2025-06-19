#!/usr/bin/env -S gjs -m

import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {createLogger} from '../libs/logger.js';
import {SocketHandler} from '../libs/socketByProfile.js';
import {
    BatteryType, BatteryChargingStatus, EarDetection, ANCMode, ConversationAwarenessMode,
    PacketConstants, AirpodsModelList
} from './configAirpods.js';

export const AirpodsDevice = GObject.registerClass(
class AirpodsDevice extends SocketHandler {
    _init(manager, devicePath, fd, bluezDeviceProxy, callbacks) {
        super._init(manager, devicePath, fd);
        const identifier = devicePath.split('_').slice(-3).join('');
        const tag = `AirpodsDevice-${identifier}`;
        this._log = createLogger(tag);
        this._log.info('AirpodsDevice init');
        this._bluezDeviceProxy = bluezDeviceProxy;
        this._batteryType = null;
        this._ancSupported = false;
        this._awarenessSupported = false;
        this._bud1State = EarDetection.IN_CASE;
        this._bud2State = EarDetection.IN_CASE;
        this._earStatus = {'bud1-inear-status': 'unknown', 'bud2-inear-status': 'unknown'};
        this._awarenessAttenuated = false;
        this._awarenessStatus = {'awareness-active': false};
        this._callbacks = callbacks;

        const modalias = this._bluezDeviceProxy.Modalias;
        if (!modalias) {
            this._bluezSignalId = this._bluezDeviceProxy.connect(
                'g-properties-changed', this._onBluezPropertiesChanged());
        } else {
            this._initializeModel(modalias);
        }
    }

    _onBluezPropertiesChanged() {
        const modalias = this._bluezDeviceProxy.Modalias;
        if (modalias) {
            this._initializeModel(modalias);
            if (this._bluezDeviceProxy && this._bluezSignalId)
                this._bluezDeviceProxy.disconnect(this._bluezSignalId);
            this._bluezSignalId = null;
            this._bluezDeviceProxy = null;
        }
    }

    _initializeModel(modalias) {
        const regex = /v004Cp([0-9A-Fa-f]{4})d/;
        const match = modalias.match(regex);
        if (match) {
            const model = match[1].toUpperCase();
            const modelData = AirpodsModelList.find(m => m.key === model);
            this._batteryType = modelData.batteryType;
            this._ancSupported = modelData.ancSupported;
            this._awarenessSupported = modelData.awarenessSupported;
            const deviceInfo = {'pid': model};
            if (this._callbacks?.updateDeviceInfo)
                this._callbacks.updateDeviceInfo(JSON.stringify(deviceInfo));
            this.start();
        }
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
            this._ackEvent?.set?.();
            return;
        }

        if (isPrefix(data, PacketConstants.FEATURES_ACK)) {
            this._log.info('Received FEATURES_ACK');
            return;
        }

        if (data.length === 22 &&
        isPrefix(data, PacketConstants.BATTERY_STATUS_NOTIFICATION)) {
            this._log.info('Received Battery notification');
            this.parseBatteryStatus(data);
            return;
        }

        if (isPrefix(data, PacketConstants.EAR_DETECTION_PREFIX)) {
            this._log.info('Received Ear detection status changes');
            this.parseEarDetection(data);
            return;
        }

        if (this._ancSupported &&
        data.length === 11 &&
        isPrefix(data, PacketConstants.NOISE_CANCELLATION_HEADER)) {
            this._log.info('Received ANC mode changes');
            this.parseAncStatus(data);
            return;
        }

        if (this._awarenessSupported &&
        data.length === 11 &&
        isPrefix(data, PacketConstants.CONVERSATION_AWARENESS_HEADER)) {
            this._log.info('Received Conversation mode changes');
            this.parseAwarenessStatus(data);
            return;
        }

        if (this._awarenessSupported &&
        data.length === 10 &&
        isPrefix(data, PacketConstants.CONVERSATION_AWARENESS_DATA)) {
            this._log.info('Received Conversation mode data ');
            this.parseAwarenessData(data);
        }
    }


    parseBatteryStatus(data) {
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
            this._callbacks.updateBatteryProps(JSON.stringify(props));
    }

    parseAncStatus(data) {
        if (data.length < 11)
            return;

        const modeByte = data[7];
        let toggle1State = 0;

        if (modeByte === ANCMode.ANC_ON)
            toggle1State = 1;
        else if (modeByte === ANCMode.TRANSPARENCY)
            toggle1State = 2;
        else if (modeByte === ANCMode.ADAPTIVE)
            toggle1State = 3;
        else
            return;

        if (this._callbacks?.updateToggle1State)
            this._callbacks.updateToggle1State(toggle1State);
    }

    parseAwarenessStatus(data) {
        if (data.length < 8)
            return;

        const modeByte = data[7];
        let toggle2State = 0;

        if (modeByte === ConversationAwarenessMode.ON)
            toggle2State = 1;
        else if (modeByte === ConversationAwarenessMode.OFF)
            toggle2State = 2;
        else
            return;

        if (this._callbacks?.updateToggle2State)
            this._callbacks.updateToggle2State(toggle2State);
    }


    _sendCombinedCustomMessage() {
        let message = {...this._earStatus};

        if (this._awarenessSupported)
            message = {...message, ...this._awarenessStatus};

        if (this._callbacks?.updateCustomMessage)
            this._callbacks.updateCustomMessage(JSON.stringify(message));
    }

    parseEarDetection(data) {
        const bud1Raw = data[6];
        const bud2Raw = data[7];

        const validValues = Object.values(EarDetection);
        if (!validValues.includes(bud1Raw) || !validValues.includes(bud2Raw))
            return;

        if (this._bud1State === EarDetection.IN_CASE && this._bud2State === EarDetection.IN_CASE &&
            (bud1Raw !== EarDetection.IN_CASE || bud2Raw !== EarDetection.IN_CASE)) {
            if (this._awarenessSupported) {
                this.sendMessage(PacketConstants.SET_SPECIFIC_FEATURES);
                this._log.info('Specific features sent');
            }
        }

        if (bud1Raw !== this._bud1State || bud2Raw !== this._bud2State) {
            this._bud1State = bud1Raw;
            this._bud2State = bud2Raw;

            const statusMap = {
                [EarDetection.IN_EAR]: 'in-ear',
                [EarDetection.OUT_EAR]: 'out-ear',
                [EarDetection.IN_CASE]: 'in-case',
            };

            const toStatusString = v => statusMap[v] ?? null;

            this._earStatus = {
                'bud1-inear-status': toStatusString(bud1Raw),
                'bud2-inear-status': toStatusString(bud2Raw),
            };
            this._sendCombinedCustomMessage();
        }
    }

    parseAwarenessData(data) {
        if (data.length < 10)
            return;

        const level = data[9];
        if (level >= 1 && level <= 9) {
            const attenuated = level <= 2;

            if (this._awarenessAttenuated !== attenuated) {
                this._awarenessAttenuated = attenuated;
                this._awarenessStatus = {'awareness-active': attenuated};
                this._sendCombinedCustomMessage();
            }
        }
    }

    setDeviceCommand(command) {
        let commandData;

        try {
            commandData = JSON.parse(command);
        } catch {
            return;
        }

        if (Object.keys(commandData).length !== 1)
            return;


        const [group, value] = Object.entries(commandData)[0];
        let mode = null;
        if (group === 'toggle1-activated') {
            if (value === 1)
                mode = PacketConstants.NOISE_CANCELLATION_ON;
            else if (value === 2)
                mode = PacketConstants.NOISE_CANCELLATION_TRANSPARENCY;
            else if (value === 3)
                mode = PacketConstants.NOISE_CANCELLATION_ADAPTIVE;
        } else if (group === 'toggle2-activated') {
            if (value === 1)
                mode = PacketConstants.CONVERSATION_AWARENESS_ON;
            else if (value === 2)
                mode = PacketConstants.CONVERSATION_AWARENESS_OFF;

            if (this._callbacks?.updateToggle2State)
                this._callbacks.updateToggle2State(value);
        } else {
            return;
        }

        if (mode !== null)
            this.sendMessage(mode);
    }

    onDestroy() {
        if (this._bluezDeviceProxy && this._bluezSignalId)
            this._bluezDeviceProxy.disconnect(this._bluezSignalId);
        this._bluezSignalId = null;
        this._bluezDeviceProxy = null;
        if (this._delayReadTimeoutId)
            GLib.source_remove(this._delayReadTimeoutId);
        this._delayReadTimeoutId = null;
    }
});

