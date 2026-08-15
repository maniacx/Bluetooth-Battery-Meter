'use strict';
import GObject from 'gi://GObject';

import {OPOv1Socket} from '../opov1/opov1Socket.js';
import {
    ANC_ACK, ANC_POLL, ANC_RESPONSE, ANC_SET, BATTERY_REQUEST, BATTERY_RESPONSE,
    STATUS_REQUEST, STATUS_RESPONSE,
} from './oneplusBudsConfig.js';
import {buildNoisePayload, decodeNoiseMode, decodeOnePlusPacket} from './oneplusBudsProtocol.js';

export const OnePlusBudsSocket = GObject.registerClass({
    GTypeName: 'BluetoothBatteryMeter_OnePlusBudsSocket',
}, class OnePlusBudsSocket extends OPOv1Socket {
    onConnected() {
        this.refreshState();
    }

    refreshState() {
        // State reads are issued only for a new RFCOMM session or a device notification.
        this.request(BATTERY_REQUEST, [0x01, 0x01], BATTERY_RESPONSE);
        this.request(STATUS_REQUEST, [0x01, 0x01], STATUS_RESPONSE);
    }

    setNoiseMode(protocolIndex) {
        if (this._ancWriteInProgress || !this.running)
            return false;
        this._ancWriteInProgress = true;
        const fail = () => {
            this._ancWriteInProgress = false;
            this._callbacks.ancError?.('timeout');
        };
        const accepted = this.request(ANC_SET, buildNoisePayload(protocolIndex), ANC_ACK, packet => {
            if (!packet.payload.length || packet.payload[0] !== 0) {
                this._ancWriteInProgress = false;
                this._callbacks.ancError?.('rejected');
                return;
            }
            // Successful writes are never trusted until same-session read-back agrees.
            this.request(ANC_POLL, [0x01, 0x01], ANC_RESPONSE, readback => {
                try {
                    const actualIndex = decodeNoiseMode(readback);
                    if (actualIndex !== protocolIndex) {
                        this._callbacks.ancError?.('readback-mismatch');
                    } else {
                        this._callbacks.anc?.(actualIndex);
                    }
                } catch (error) {
                    this._socketLog.error(error, 'Invalid OnePlus ANC read-back');
                    this._callbacks.ancError?.('invalid-readback');
                }
                this._ancWriteInProgress = false;
            }, fail);
        }, fail);
        if (!accepted)
            this._ancWriteInProgress = false;
        return accepted;
    }

    _readNoiseMode() {
        this.request(ANC_POLL, [0x01, 0x01], ANC_RESPONSE, packet => {
            try {
                this._callbacks.anc?.(decodeNoiseMode(packet));
            } catch (error) {
                this._socketLog.error(error, 'Invalid OnePlus ANC response');
            }
        });
    }

    _dispatchPacket(packet) {
        const unsolicitedAnc = packet.command === ANC_RESPONSE && !this._pending.has(ANC_RESPONSE);
        super._dispatchPacket(packet);

        if (unsolicitedAnc) {
            try {
                this._callbacks.anc?.(decodeNoiseMode(packet));
                // An external ANC change is an activity signal, not a polling interval.
                this.refreshState();
            } catch (error) {
                this._socketLog.error(error, 'Invalid unsolicited OnePlus ANC response');
            }
        }

        const events = decodeOnePlusPacket(packet);
        if (events.length)
            this._callbacks.battery?.(events);
    }
});
