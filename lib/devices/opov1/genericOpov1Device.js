'use strict';
import GObject from 'gi://GObject';

import {createConfig, createProperties, DataHandler} from '../../dataHandler.js';
import {createLogger, getDeviceIdentifier} from '../logger.js';
import {OPOv1Socket} from './opov1Socket.js';
import {OPOV1_PROFILE_TYPE, OPOV1_UUID} from '../oneplusBuds/oneplusBudsConfig.js';
import {isGenericOPOv1} from './opov1Detector.js';

export const DeviceTypeGenericOPOv1 = 'genericOpov1';
export {isGenericOPOv1};

const GenericOPOv1Socket = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_GenericOPOv1Socket',
}, class GenericOPOv1Socket extends OPOv1Socket {
    onConnected() {
        // Unknown models are never probed: only proven unsolicited framing is accepted.
    }
});

export const GenericOPOv1Device = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_GenericOPOv1Device',
}, class GenericOPOv1Device extends GObject.Object {
    _init(_settings, devicePath, alias, _extPath, profileManager, updateDeviceMapCb) {
        super._init();
        this._log = createLogger(`GenericOPOv1-${getDeviceIdentifier(devicePath)}`);
        this._config = createConfig();
        this._props = createProperties();
        this._dataHandler = new DataHandler(this._config, this._props);
        updateDeviceMapCb(devicePath, this._dataHandler);
        this._socket = new GenericOPOv1Socket(devicePath, profileManager, {
            type: OPOV1_PROFILE_TYPE, uuid: OPOV1_UUID,
        });
        this._socket.startSocket();
        this._log.info(`Experimental read-only OPOv1 profile initialized for ${alias}`);
    }

    destroy() {
        this._socket?.destroy();
        this._socket = null;
        this._dataHandler = null;
    }
});
