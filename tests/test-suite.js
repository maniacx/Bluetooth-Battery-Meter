'use strict';
import {tests as deviceListTests} from './test-device-list.js';
import {tests as quickSettingsTests} from './test-quick-settings.js';
import {tests as opov1Tests} from './test-opov1.js';
import {tests as onePlusTests} from './test-oneplus.js';
import {tests as contractTests} from './test-contracts.js';

const tests = [...contractTests, ...deviceListTests, ...quickSettingsTests, ...opov1Tests, ...onePlusTests];
let failed = 0;
for (const [name, test] of tests) {
    try {
        test();
        print(`PASS ${name}`);
    } catch (error) {
        failed++;
        printerr(`FAIL ${name}: ${error.message}`);
    }
}

if (failed > 0)
    throw new Error(`${failed} of ${tests.length} tests failed`);

print(`PASS ${tests.length} headless tests`);
