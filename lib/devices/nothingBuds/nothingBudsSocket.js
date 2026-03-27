import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {createLogger} from '../logger.js';
import {SocketHandler} from '../socketByProfile.js';
import {booleanFromByte, isValidByte} from '../deviceUtils.js';
import {getBluezDeviceProxy} from '../../bluezDeviceProxy.js';
import {
    crc16Ansi, NothingBudsModelList, PayloadType, BatteryType
} from './nothingBudsConfig.js';

const HEADER_MAGIC = [0x55, 0x60, 0x01];
const HEADER_LEN = 8;
const CRC_LEN = 2;

/**
Nothing Ear module for Bluetooth battery meter service to provide,
battery information, ANC and Convesational awareness on device that support it.

Credits:
https://github.com/radiance-project/ear-web
Team: radiance-project

https://github.com/DaanHessen/earctl/
DaanHessen
**/

export const NothingBudsSocket = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_NothingBudsSocket',
}, class NothingBudsSocket extends SocketHandler {
    _init(devicePath, profileManager, profile, callbacks) {
        super._init(devicePath, profileManager, profile);
        this._log = createLogger('NothingEarSocket');
        this._log.info('NothingEarSocket init');

        this._devicePath = devicePath;
        this._seq = 0;
        this._modelInitialized = false;

        this._halfPacket = null;

        this._callbacks = callbacks;

        this.startSocket();
    }

    _decode(buffer) {
        if (this._halfPacket && this._halfPacket.length > 0) {
            const merged = new Uint8Array(this._halfPacket.length + buffer.length);
            merged.set(this._halfPacket, 0);
            merged.set(buffer, this._halfPacket.length);
            buffer = merged;
            this._halfPacket = null;
        }

        let offset = 0;
        const MIN_PACKET = HEADER_LEN + CRC_LEN;

        while (buffer.length - offset >= 1) {
            const start = buffer.indexOf(0x55, offset);
            if (start === -1)
                return;

            offset = start;

            if (buffer.length - offset < MIN_PACKET) {
                this._halfPacket = buffer.slice(offset);
                return;
            }

            const payloadLen = buffer[offset + 5];
            const totalLen = HEADER_LEN + payloadLen + CRC_LEN;

            if (buffer.length - offset < totalLen) {
                this._halfPacket = buffer.slice(offset);
                return;
            }

            const frame = buffer.slice(offset, offset + totalLen);

            const crcExpected = frame[totalLen - 2] | frame[totalLen - 1] << 8;

            const crcActual =
            crc16Ansi(frame.slice(0, totalLen - CRC_LEN));

            if (crcActual !== crcExpected) {
                offset += 1;
                continue;
            }

            const payloadType = frame[3] | frame[4] << 8;

            const resp = {
                payloadType,
                operationId: frame[7],
                payload: frame.slice(HEADER_LEN, HEADER_LEN + payloadLen),
                bytes: frame,
            };

            this._parseData(resp);

            offset += totalLen;
        }
    }

    _encode(payloadType, payload) {
        this._seq = this._seq >= 250 ? 1 : this._seq + 1;
        const payloadLen = payload.length;

        const header = [
            ...HEADER_MAGIC,
            payloadType & 0xFF,
            payloadType >> 8 & 0xFF,
            payloadLen,
            0x00,
            this._seq,
        ];

        const packet = Uint8Array.from([...header, ...payload]);

        const crc = crc16Ansi(packet);

        return Uint8Array.from([...packet, crc & 0xFF, crc >> 8 & 0xFF]);
    }

    _sendPacket(payloadType, payload = []) {
        const pkt = this._encode(payloadType, payload);
        this.sendMessage(pkt);
    }

    processData(bytes) {
        this._decode(bytes);
    }

    postConnectInitialization() {
        this._onPostConnectInitialization();
    }

    _parseData(resp) {
        const {payloadType, payload} = resp;

        switch (payloadType) {
            case PayloadType.DEVICE_MODEL_RET:
                if (!this._modelInitialized)
                    this._getModelFromResponse(payload);
                break;
            case PayloadType.FIRMWARE_NTFY:
                this._parseFirmwareInfo(payload);
                break;
            case PayloadType.BATTERY_PRIMARY_NTFY:
            case PayloadType.BATTERY_SECONDARY_NTFY:
                if (this._modelData)
                    this._processBattery(payload);
                break;
            case PayloadType.ANC_PRIMARY_NTFY:
            case PayloadType.ANC_SECONDARY_NTFY:
                if (this._modelData?.noiseControl)
                    this._parseNoiseControl(payload);
                break;
            case PayloadType.PERSONALIZED_ANC_NTFY:
                if (this._modelData?.personalizeAnc)
                    this._parsePersonalizedAnc(payload);
                break;
            case PayloadType.EQ_NTFY:
                if (this._modelData?.eqPreset && !this._modelData?.eqListeningModeType)
                    this._parseEqPreset(payload);
                break;
            case PayloadType.LISTENING_MODE_NTFY:
                if (this._modelData?.eqPreset && this._modelData?.eqListeningModeType)
                    this._parseEqPreset(payload);
                break;
            case PayloadType.CUSTOM_EQ_NTFY:
                if (this._modelData?.eqCustom)
                    this._parseCustomEq(payload);
                break;
            case PayloadType.ENHANCED_BASS_RET:
            case PayloadType.ENHANCED_BASS_NTFY:
                if (this._modelData?.bassEnhanceLevel)
                    this._parseEnhancedBass(payload);
                break;
            case PayloadType.LATENCY_RET:
                if (this._modelData?.lowLatencyMode)
                    this._parseLatencyRet(payload);
                break;
            case PayloadType.LATENCY_NTFY:
                if (this._modelData?.lowLatencyMode)
                    this._parseLatency(payload);
                break;
            case PayloadType.IN_EAR_NTFY:
                if (this._modelData?.inEarDetection)
                    this._parseInEar(payload);
                break;
            case PayloadType.GESTURES_NTFY:
                if (this._modelData?.gestureOptions)
                    this._parseGestures(payload);
                break;
            case PayloadType.SPATIAL_AUDIO_NTFY:
                if (this._modelData?.spatialAudioSwitch)
                    this._parseSpatialAudio(payload);
                break;
        }
    }

    async _wait() {
        if (this._initTimeoutId)
            return;

        await new Promise(resolve => {
            this._initTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 100, () => {
                resolve();
                this._initTimeoutId = null;
                return GLib.SOURCE_REMOVE;
            });
        });
    }

    _onPostConnectInitialization() {
        this._getDeviceModelId();

        this._modelFallbackTimeoutId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 2, () => {
            if (!this._modelInitialized)
                this._getModelByName();

            this._modelFallbackTimeoutId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    async _onModelInitialized(modelData) {
        this._log.info('Model Initialized');
        this._modelInitialized = true;
        this._modelData = modelData;
        this._callbacks?.modelIntialized?.(modelData);

        this._getBattery();
        await this._wait();

        if (modelData.eqPreset) {
            this._getEqPreset();
            await this._wait();
        }

        this._getFirmwareInfo();
        await this._wait();

        if (!modelData.noUTCTimeUpdate) {
            this._setUTCtime();
            await this._wait();
        }

        if (modelData.inEarDetection) {
            this._getInEar();
            await this._wait();
        }

        if (modelData.lowLatencyMode) {
            this._getLatency();
            await this._wait();
        }

        if (modelData.personalizeAnc) {
            this._getPersonalizedAnc();
            await this._wait();
        }

        if (modelData.gestureOptions) {
            this._getGestures();
            await this._wait();
        }

        if (modelData.noiseControl) {
            this._getNoiseControlConfig();
            await this._wait();
            this._getNoiseControl();
            await this._wait();
        }

        if (modelData.bassEnhanceLevel) {
            this._getEnhancedBass();
            await this._wait();
        }

        if (this._modelData?.spatialAudioSwitch) {
            this._getSpatialAudio();
            await this._wait();
        }
    }

    _getModelByName() {
        this._log.info('Serial timeout, falling back to model-by-name');
        const bluezDeviceProxy = getBluezDeviceProxy(this._devicePath);
        const name = bluezDeviceProxy?.Name;

        if (!name) {
            this._log.info('Bluetooth device name not available for model fallback');
            return;
        }

        const modelData = NothingBudsModelList.find(model =>
            model.pattern && model.pattern.test(name)
        );

        if (!modelData) {
            this._log.info(`No model matched by name fallback: "${name}"`);
            return;
        }

        this._log.info(`Model resolved by name fallback: ${modelData.name} (${modelData.modelId})`);
        this._onModelInitialized(modelData);
    }

    _getModelFromResponse(payload) {
        if (!payload || payload.length < 2) {
            this._log.info('Model response payload invalid');
            return;
        }

        const modelIdNum = payload[1] << 8 | payload[0];
        const modelId = modelIdNum.toString(16).toUpperCase();

        const modelData = NothingBudsModelList.find(model => model.modelId === modelId);

        if (!modelData) {
            this._log.info(`No model matched for ID: ${modelId}`);
            return;
        }

        this._log.info(`Model resolved by ID: ${modelData.name} (${modelData.modelId})`);

        this._onModelInitialized(modelData);
    }

    _getSerialInfo() {
        this._log.info('Request SerialInfo');
        this._sendPacket(PayloadType.SERIAL_GET);
    }

    _getFirmwareInfo() {
        this._log.info('Request FirmwareInfo');
        this._sendPacket(PayloadType.FIRMWARE_GET);
    }

    _getDeviceModelId() {
        this._log.info('Request DeviceModelId');
        this._sendPacket(PayloadType.DEVICE_MODEL_GET);
    }

    _parseFirmwareInfo(payload) {
        this._log.info('Parse FirmwareInfo');
        if (!payload || payload.length < 1)
            return;

        const info = String.fromCharCode(...payload);

        this._log.info(`Firmware:${info}`);
        this._callbacks?.updateFirmwareInfo?.(info);
    }

    _setUTCtime() {
        const secEpoch = Math.floor(Date.now() / 1000);

        const payload = new Uint8Array(4);
        payload[0] = secEpoch >> 24 & 0xFF;
        payload[1] = secEpoch >> 16 & 0xFF;
        payload[2] = secEpoch >> 8 & 0xFF;
        payload[3] = secEpoch & 0xFF;

        this._sendPacket(PayloadType.UTC_TIME_SET, payload);
    }

    _getBattery() {
        this._log.info('Request battery status');
        this._sendPacket(PayloadType.BATTERY_GET);
    }

    _processBattery(payload) {
        this._log.info('Processing battery status');
        let left  = {state: 'disconnected', level: 0};
        let right = {state: 'disconnected', level: 0};
        let caseBat = {state: 'disconnected', level: 0};
        let singleBat = null;

        const count = payload[0];

        for (let i = 0; i < count; i++) {
            const idx = 1 + i * 2;
            if (idx + 1 >= payload.length)
                break;

            const devId = payload[idx];
            const levelByte = payload[idx + 1];

            const level = levelByte & 0x7F;
            const state = (levelByte & 0x80) !== 0 ? 'charging' : 'discharging';

            const reading = {level, state};

            if (devId === BatteryType.LEFT)
                left = reading;
            else if (devId === BatteryType.RIGHT)
                right = reading;
            else if (devId === BatteryType.CASE)
                caseBat = reading;
            else if (devId === BatteryType.SINGLE)
                singleBat = reading;
        }

        const props = {
            battery1Level: singleBat ? singleBat.level : left.level,
            battery1Status: singleBat ? singleBat.state : left.state,

            battery2Level: right.level,
            battery2Status: right.state,

            battery3Level: caseBat.level,
            battery3Status: caseBat.state,
        };

        this._callbacks?.updateBatteryProps?.(props);
    }

    _buildNoiseControlByteList() {
        this._noiseControlBytes = [];

        const nc = this._modelData?.noiseControl;

        if (nc.off?.byte != null)
            this._noiseControlBytes.push(nc.off.byte);

        if (nc.transparency?.byte != null)
            this._noiseControlBytes.push(nc.transparency.byte);

        if (nc.noiseCancellation) {
            if (nc.noiseCancellation.levels) {
                this._noiseControlBytes.push(
                    ...Object.values(nc.noiseCancellation.levels)
                );
            } else if (nc.noiseCancellation.byte != null) {
                this._noiseControlBytes.push(nc.noiseCancellation.byte);
            }
        }
        this._log.info(`this._noiseControlBytes = ${this._noiseControlBytes}`);
    }

    _getNoiseControlConfig() {
        this._log.info('Request NoiseControlConfig');
        this._buildNoiseControlByteList();
        this._sendPacket(PayloadType.ANC_CONFIGURATION_GET);
    }

    _getNoiseControl() {
        this._log.info('Request NoiseControl');
        this._buildNoiseControlByteList();
        this._sendPacket(PayloadType.ANC_GET);
    }

    _parseNoiseControl(payload) {
        this._log.info('Parse NoiseControl');
        if (!payload || payload.length < 2)
            return;

        const mode = payload[1];

        if (!this._noiseControlBytes?.includes(mode))
            return;

        this._callbacks?.updateNoiseControl?.(mode);
    }

    setNoiseControl(mode) {
        this._log.info('Set NoiseControl');
        const payload = [0x01, mode, 0x00];
        this._sendPacket(PayloadType.ANC_SET, payload);
    }

    _getPersonalizedAnc() {
        this._log.info('Request PersonalizedAnc');
        this._sendPacket(PayloadType.PERSONALIZED_ANC_GET);
    }

    _parsePersonalizedAnc(payload) {
        this._log.info('Parse PersonalizedAnc');
        if (!payload || payload.length < 1)
            return;

        const state = payload[0];
        const enable = booleanFromByte(state);
        if (enable === null)
            return;

        this._callbacks?.updatePersonalizedAnc?.(state);
    }

    setPersonalizedAnc(state) {
        this._log.info('Set PersonalizedAnc');
        const payload = [state];
        this._sendPacket(PayloadType.PERSONALIZED_ANC_SET, payload);
    }

    _getEqPreset() {
        this._log.info('Request EqPreset');
        const payloadType = this._modelData.eqListeningModeType
            ? PayloadType.EQ_GET : PayloadType.LISTENING_MODE_GET;
        this._sendPacket(payloadType);
    }

    _parseEqPreset(payload) {
        this._log.info('Parse EqPreset');

        if (!payload || payload.length < 1)
            return;

        const preset = this._modelData.eqPreset;
        const mode = payload[0];

        if (!isValidByte(mode, preset))
            return;

        if (mode === preset.custom)
            this._getCustomEq();

        this._callbacks?.updateEqPreset?.(mode);
    }

    setEqPreset(mode) {
        this._log.info('Set Equalizer');

        const preset = this._modelData.eqPreset;

        if (!isValidByte(mode, preset))
            return;

        const payloadType = this._modelData.eqListeningModeType
            ? PayloadType.LISTENING_MODE_SET : PayloadType.EQ_SET;

        const payload = [mode, 0x00];
        this._sendPacket(payloadType, payload);

        if (mode === preset.custom)
            this._getCustomEq();
    }

    _getCustomEq() {
        this._log.info('Request CustomEq');
        this._sendPacket(PayloadType.CUSTOM_EQ_GET);
    }

    _decodeEqFloat(bytes) {
        if (!bytes || bytes.length < 4)
            return 0.0;

        const arr = new Uint8Array(4);
        arr[0] = bytes[3];
        arr[1] = bytes[2];
        arr[2] = bytes[1];
        arr[3] = bytes[0];

        const view = new DataView(arr.buffer);

        const isNegative =
        arr[0] === 0x00 &&
        arr[1] === 0x00 &&
        arr[2] === 0x00 &&
        (arr[3] & 0x80) === 0x80;

        if (isNegative) {
            arr[3] &= 0x7F;
            return -view.getFloat32(0, false);
        }

        return view.getFloat32(0, false);
    }


    _encodeEqFloat(value, total = false) {
        if (total && value >= 0.0)
            return [0x00, 0x00, 0x00, 0x80];

        const buf = new ArrayBuffer(4);
        const view = new DataView(buf);
        view.setFloat32(0, value, false);

        const bytes = new Uint8Array(buf);

        if (value !== 0.0 && bytes[0] === 0x00 && bytes[1] === 0x00 && bytes[2] === 0x00)
            bytes[3] |= 0x80;

        return [bytes[3], bytes[2], bytes[1], bytes[0]];
    }

    _parseCustomEq(payload) {
        if (!payload || payload.length < 45)
            return;

        this._log.info('Parse CustomEq');

        const levels = [];

        for (let band = 0; band < 3; band++) {
            const offset = 6 + band * 13;
            if (offset + 4 > payload.length)
                return;

            const slice = payload.slice(offset, offset + 4);
            levels.push(this._decodeEqFloat(slice));
        }

        const clamp = v => Math.min(6, Math.max(-6, v));

        const customEqArray = [
            clamp(levels[2]),
            clamp(levels[0]),
            clamp(levels[1]),
        ];

        this._log.info(`CustomEq values: [Bass=${customEqArray[0]},` +
            `Mid=${customEqArray[1]}, Treble=${customEqArray[2]}]`);

        this._callbacks?.updateCustomEq?.(customEqArray);
    }

    setCustomEq(eqArray) {
        this._log.info('Parse CustomEq');
        const payload = new Uint8Array([
            0x03, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x75, 0x44,
            0xc3, 0xf5, 0x28, 0x3f, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00, 0xc0, 0x5a, 0x45, 0x00,
            0x00, 0x80, 0x3f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x43, 0xcd, 0xcc,
            0x4c, 0x3f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        ]);

        const [bass, mid, treble] = eqArray;
        const values = [mid, treble, bass];

        let highest = 0.0;
        for (const v of values)
            highest = Math.max(highest, Math.abs(v));

        const totalBytes = this._encodeEqFloat(-highest, true);
        payload.set(totalBytes, 1);

        values.forEach((value, index) => {
            const offset = 6 + index * 13;
            const bytes = this._encodeEqFloat(value, false);
            payload.set(bytes, offset);
        });

        this._sendPacket(PayloadType.CUSTOM_EQ_SET, payload);
    }

    _getEnhancedBass() {
        this._log.info('Request EnhancedBass');
        this._sendPacket(PayloadType.ENHANCED_BASS_GET);
    }

    _parseEnhancedBass(payload) {
        this._log.info('Parse EnhancedBass');
        if (!payload || payload.length < 2)
            return;

        const enable = booleanFromByte(payload[0]);
        if (enable === null)
            return;

        const level = payload[1] / 2;
        this._callbacks?.updateEnhancedBass?.(enable, level);
    }

    setEnhancedBass(enable, level) {
        this._log.info('Set EnhancedBass');
        const payload = [enable ? 0x01 : 0x00, level * 2];
        this._sendPacket(PayloadType.ENHANCED_BASS_SET, payload);
    }

    _getLatency() {
        this._log.info('Request Latency');
        this._sendPacket(PayloadType.LATENCY_GET);
    }

    _parseLatencyRet(payload) {
        this._log.info('Parse Latency');
        if (!payload || payload.length < 1)
            return;

        const enable = payload[0] === 0x01;
        this._callbacks?.updateLatency?.(enable);
    }

    _parseLatency(payload) {
        this._log.info('Parse Latency');
        if (!payload || payload.length < 2)
            return;

        const enable = payload[0] === 0x01;
        this._callbacks?.updateLatency?.(enable);
    }

    setLatency(enable) {
        this._log.info('Set Latency');
        const payload = [enable ? 0x01 : 0x02, 0x00];
        this._sendPacket(PayloadType.LATENCY_SET, payload);
    }


    _getInEar() {
        this._log.info('Request InEar');
        this._sendPacket(PayloadType.IN_EAR_GET);
    }

    _parseInEar(payload) {
        this._log.info('Parse InEar');
        if (!payload || payload.length < 3)
            return;

        const enable = booleanFromByte(payload[2]);
        if (enable === null)
            return;

        this._callbacks?.updateInEar?.(enable);
    }

    setInEar(enable) {
        this._log.info('Set InEar');
        const payload = [0x00, 0x00, enable ? 0x01 : 0x00];
        this._sendPacket(PayloadType.IN_EAR_SET, payload);
    }

    setRingMyBuds(state, isLeft) {
        this._log.info('Set RingMyBuds');
        const payload = [];

        if (!this._modelData.ringLegacy) {
            if (this._modelData.batterySingle)
                payload.push(0x06);
            else
                payload.push(isLeft ? 0x02 : 0x03);
        }

        payload.push(state === 'playing' ? 0x01 : 0x00);

        this._sendPacket(PayloadType.RING_SET, payload);
    }

    _getGestures() {
        this._log.info('Request Gestures');
        this._sendPacket(PayloadType.GESTURES_GET);
    }

    _parseGestures(payload) {
        this._log.info('Parse Gestures');

        if (!payload || payload.length < 1)
            return;

        const count = payload[0];
        const slots = [];

        let offset = 1;
        for (let i = 0; i < count; i++) {
            if (offset + 3 >= payload.length)
                break;

            slots.push({
                device: payload[offset],
                buttonId: payload[offset + 1],
                type: payload[offset + 2],
                action: payload[offset + 3],
            });

            offset += 4;
        }

        this._callbacks?.updateGestures?.(slots);
    }

    setGesture(slot) {
        this._log.info('Set Gesture');

        if (!slot)
            return;

        const payload = [
            0x01,
            slot.device & 0xFF,
            slot.buttonId & 0xFF,
            slot.type & 0xFF,
            slot.action & 0xFF,
        ];

        this._sendPacket(PayloadType.GESTURES_SET, payload);
    }

    _getSpatialAudio() {
        this._log.info('Request SpatialAudio');
        this._sendPacket(PayloadType.SPATIAL_AUDIO_GET);
    }

    _parseSpatialAudio(payload) {
        this._log.info('Parse SpatialAudio');
        if (!payload || payload.length < 1)
            return;

        const enable = payload[0] === 0x01;
        this._callbacks?.updateSpatialAudio?.(enable);
    }

    setSpatialAudio(enable) {
        this._log.info('Set SpatialAudio');
        const payload = [enable ? 0x01 : 0x00];
        this._sendPacket(PayloadType.SPATIAL_AUDIO_SET, payload);
    }

    destroy() {
        if (this._modelFallbackTimeoutId) {
            GLib.Source.remove(this._modelFallbackTimeoutId);
            this._modelFallbackTimeoutId = null;
        }

        if (this._initTimeoutId) {
            GLib.Source.remove(this._initTimeoutId);
            this._initTimeoutId = null;
        }

        super.destroy();
    }
});


