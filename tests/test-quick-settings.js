'use strict';

import {getReadyBluetoothToggle} from '../lib/quickSettings.js';
import {assertEqual} from './test-utils.js';

function toggleWithOffStageChild() {
    return {
        _box: {
            get_first_child() {
                return {
                    get_stage() {
                        return null;
                    },
                };
            },
        },
    };
}

export const tests = [
    ['Bluetooth Quick Settings wait until its toggle is ready', () => {
        assertEqual(getReadyBluetoothToggle(null), null, 'missing Quick Settings');
        assertEqual(getReadyBluetoothToggle({}), null, 'missing Bluetooth toggle');
        assertEqual(getReadyBluetoothToggle({_bluetooth: {quickSettingsItems: []}}), null,
            'missing Bluetooth item');

        const toggle = toggleWithOffStageChild();
        assertEqual(getReadyBluetoothToggle({_bluetooth: {quickSettingsItems: [toggle]}}), toggle,
            'Bluetooth toggle with an off-stage child');
    }],
];
