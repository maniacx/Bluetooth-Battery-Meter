'use strict';
import {loadDeviceList, saveDeviceList, sortDevicesByHistory} from '../lib/deviceList.js';
import {assertDeepEqual, assertEqual} from './test-utils.js';

function device(path, connected) {
    return {connected, get_object_path: () => path};
}

export const tests = [
    ['device list round-trip preserves persisted fields', () => {
        const input = [JSON.stringify({
            path: '/dev/one', icon: 'headphones', alias: 'One', paired: true,
            'battery-reported': true, 'qs-level': false, 'indicator-mode': 2,
            'enhanced-device': 'airpods', 'connected-time': 12, 'disconnected-time': 7,
        })];
        const devices = loadDeviceList(input);
        assertEqual(devices.get('/dev/one').connectedTime, 12, 'connected time is loaded');
        assertDeepEqual(saveDeviceList(devices), input, 'serialized list equals original list');
    }],
    ['device history keeps connected devices first', () => {
        const first = device('/dev/first', false);
        const second = device('/dev/second', true);
        const third = device('/dev/third', true);
        const devices = new Map([
            ['/dev/first', {disconnectedTime: 99}],
            ['/dev/second', {connectedTime: 20}],
            ['/dev/third', {connectedTime: 30}],
        ]);
        assertDeepEqual(sortDevicesByHistory([first, second, third], devices)
            .map(item => item.get_object_path()),
        ['/dev/third', '/dev/second', '/dev/first'], 'history sort order');
    }],
];
