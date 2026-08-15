'use strict';
import {isOnePlusBuds} from '../lib/devices/oneplusBuds/oneplusBudsConfig.js';
import {
    buildNoisePayload, decodeNoiseMode, decodeOnePlusPacket, OnePlusBatteryState,
} from '../lib/devices/oneplusBuds/oneplusBudsProtocol.js';
import {BATTERY_RESPONSE, STATUS_RESPONSE} from '../lib/devices/oneplusBuds/oneplusBudsConfig.js';
import {isGenericOPOv1} from '../lib/devices/opov1/opov1Detector.js';
import {assertDeepEqual, assertEqual, assertThrows} from './test-utils.js';

export const tests = [
    ['confirmed OnePlus detection is MAC-first and waits for Address', () => {
        assertDeepEqual(isOnePlusBuds({}, []), {supported: 'pending', bluezProps: ['Address']},
            'missing address');
        assertEqual(isOnePlusBuds({Address: '40:72:18:cc:44:ea'}, []).supported, 'yes',
            'confirmed address');
        assertEqual(isOnePlusBuds({Address: '00:00:00:00:00:00'}, []).supported, 'no',
            'unconfirmed address');
    }],
    ['generic OPOv1 detection requires vendor UUID evidence', () => {
        assertEqual(isGenericOPOv1({}, []).supported, 'no', 'missing UUID');
        assertEqual(isGenericOPOv1({}, ['0000079A-D102-11E1-9B23-00025B00A5A5']).supported,
            'yes', 'vendor UUID');
    }],
    ['OnePlus packets preserve independent battery and presence state', () => {
        const state = new OnePlusBatteryState();
        state.apply(decodeOnePlusPacket({command: BATTERY_RESPONSE,
            payload: Uint8Array.from([0, 3, 1, 0xE4, 2, 100, 3, 80])}, 10));
        state.apply(decodeOnePlusPacket({command: STATUS_RESPONSE,
            payload: Uint8Array.from([0, 3, 1, 4, 2, 7, 3, 4])}, 11));
        assertDeepEqual(state.toProperties(), {
            connectedSides: 'right', battery1Level: 100, battery1Status: 'charging',
            battery2Level: 100, battery2Status: 'discharging',
            battery3Level: 80, battery3Status: 'discharging',
        }, 'component properties');
    }],
    ['unknown OnePlus commands cannot alter battery state', () => {
        const state = new OnePlusBatteryState();
        assertDeepEqual(decodeOnePlusPacket({command: 0xAA07, payload: Uint8Array.of(0, 1, 1, 0)}),
            [], 'unknown packet creates no events');
        state.apply([]);
        assertDeepEqual(state.toProperties(), {connectedSides: 'unknown'}, 'unknown state remains unknown');
    }],
    ['OnePlus ANC bitmap codec validates a single active mode', () => {
        assertDeepEqual([...buildNoisePayload(8)], [1, 1, 0, 1], 'index eight bitmap');
        assertEqual(decodeNoiseMode({payload: Uint8Array.of(0, 1, 1, 0x20)}), 5, 'decoded mode');
        assertThrows(() => decodeNoiseMode({payload: Uint8Array.of(0, 1, 1, 3)}),
            'multiple ANC modes');
    }],
];
