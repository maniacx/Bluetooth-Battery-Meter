'use strict';
import GLib from 'gi://GLib';

import {assert, assertEqual} from './test-utils.js';

const ROOT = GLib.build_filenamev([GLib.get_current_dir()]);
const IGNORED_DIRECTORIES = new Set(['.git', '.kilo', '.work', 'tests']);

function readText(path) {
    const [ok, contents] = GLib.file_get_contents(path);
    if (!ok)
        throw new Error(`Cannot read ${path}`);
    return new TextDecoder().decode(contents);
}

function sourceFiles(directory = ROOT) {
    const files = [];
    const dir = GLib.Dir.open(directory, 0);
    let name;
    while ((name = dir.read_name()) !== null) {
        const path = GLib.build_filenamev([directory, name]);
        if (GLib.file_test(path, GLib.FileTest.IS_DIR)) {
            if (!IGNORED_DIRECTORIES.has(name))
                files.push(...sourceFiles(path));
        } else if (name.endsWith('.js')) {
            files.push(path);
        }
    }
    dir.close();
    return files;
}

function schemaKeys() {
    const schema = readText(GLib.build_filenamev([ROOT, 'schemas',
        'org.gnome.shell.extensions.Bluetooth-Battery-Meter.gschema.xml']));
    return new Set([...schema.matchAll(/<key\s+name="([^"]+)"/g)].map(match => match[1]));
}

function schemaDefault(key) {
    const schema = readText(GLib.build_filenamev([ROOT, 'schemas',
        'org.gnome.shell.extensions.Bluetooth-Battery-Meter.gschema.xml']));
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = schema.match(new RegExp(
        `<key\\s+name="${escapedKey}"[^>]*>[\\s\\S]*?<default>([^<]+)</default>`
    ));
    if (!match)
        throw new Error(`missing default for settings key ${key}`);
    return match[1].trim();
}

function settingsKeys(source) {
    const keys = new Set();
    const pattern = /(?:get_(?:boolean|int|strv|string)|set_(?:boolean|int|strv|string))\('([^']+)'\)|changed::([\w-]+)/g;
    for (const match of source.matchAll(pattern))
        keys.add(match[1] ?? match[2]);
    return keys;
}

export const tests = [
    ['metadata has the extension and settings identities', () => {
        const metadata = JSON.parse(readText(GLib.build_filenamev([ROOT, 'metadata.json'])));
        assertEqual(metadata.uuid, 'Bluetooth-Battery-Meter@maniacx.github.com', 'extension UUID');
        assertEqual(metadata['settings-schema'],
            'org.gnome.shell.extensions.Bluetooth-Battery-Meter', 'settings schema');
        assert(metadata['shell-version'].length > 0, 'supported Shell versions are declared');
        assert(Number.isInteger(metadata.version) && metadata.version > 0,
            'extension build version is a positive integer');
    }],
    ['all local JavaScript imports resolve to files', () => {
        for (const file of sourceFiles()) {
            const source = readText(file);
            for (const match of source.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g)) {
                const target = GLib.build_filenamev([GLib.path_get_dirname(file), match[1]]);
                assert(GLib.file_test(target, GLib.FileTest.EXISTS),
                    `missing import ${match[1]} referenced by ${file}`);
            }
        }
    }],
    ['all used GSettings keys are declared by the schema', () => {
        const declared = schemaKeys();
        for (const file of sourceFiles()) {
            for (const key of settingsKeys(readText(file))) {
                assert(declared.has(key), `settings key ${key} from ${file} is not declared`);
            }
        }
    }],
    ['OnePlus/Oppo support is opt-in by default', () => {
        assertEqual(schemaDefault('enable-oneplus-buds-device'), 'false',
            'OnePlus/Oppo profile default');
        assertEqual(schemaDefault('enable-experimental-opov1-device'), 'false',
            'legacy generic OPOv1 profile default');
    }],
    ['OnePlus detection is not globally blocked by UUIDs', () => {
        const manager = readText(GLib.build_filenamev([ROOT, 'lib',
            'enhancedDeviceSupportManager.js']));
        assert(!manager.includes('if (uuids.length === 0)'),
            'profile detectors, not the manager, decide which BlueZ properties are required');
    }],
    ['BlueZ proxy exposes the OnePlus MAC address', () => {
        const proxy = readText(GLib.build_filenamev([ROOT, 'lib', 'bluezDeviceProxy.js']));
        assert(proxy.includes('<property name="Address" type="s" access="read"/>'),
            'MAC-first OnePlus detection requires the BlueZ Address property');
    }],
    ['pending BlueZ detection handles initial property load races', () => {
        const manager = readText(GLib.build_filenamev([ROOT, 'lib',
            'enhancedDeviceSupportManager.js']));
        assert(manager.includes('getBluezDevicePropertiesAsync(path,'),
            'detection fetches initial BlueZ properties atomically');
        assert(manager.includes('this._detectDevice(path, deviceProps, bluezDeviceProps);'),
            'detection runs after BlueZ properties have loaded');
    }],
    ['BlueZ GetAll properties are unpacked for device detectors', () => {
        const proxy = readText(GLib.build_filenamev([ROOT, 'lib', 'bluezDeviceProxy.js']));
        assert(proxy.includes('value.deepUnpack()'),
            'BlueZ a{sv} values are converted from GLib.Variant before detection');
    }],
    ['OnePlus/Oppo discovery does not depend on Quick Settings items', () => {
        const manager = readText(GLib.build_filenamev([ROOT, 'lib',
            'enhancedDeviceSupportManager.js']));
        assert(manager.includes("'org.freedesktop.DBus.ObjectManager', 'GetManagedObjects'"),
            'confirmed OnePlus devices are scanned through BlueZ ObjectManager');
        assert(manager.includes('this._discoverOPOv1Devices();'),
            'the OnePlus/Oppo profile scans BlueZ when support is enabled');
    }],
    ['generic OPOv1 support remains separately opt-in', () => {
        const manager = readText(GLib.build_filenamev([ROOT, 'lib',
            'enhancedDeviceSupportManager.js']));
        const page = readText(GLib.build_filenamev([ROOT, 'ui', 'devices', 'oneplusBuds.ui']));
        assert(manager.includes('enabled: this._toggle.experimentalOPOv1Enabled'),
            'generic OPOv1 detection requires its experimental toggle');
        assert(page.includes('id="enable_experimental_opov1_device"'),
            'preferences expose the experimental OPOv1 toggle');
    }],
    ['OnePlus device settings provide complete confirmed ANC control', () => {
        const window = readText(GLib.build_filenamev([ROOT, 'preferences', 'devices',
            'oneplusBuds', 'configureWindow.js']));
        for (const mode of ['off', 'noise-high', 'noise-medium', 'noise-low', 'auto-medium',
            'transparency']) {
            assert(window.includes(mode), `OnePlus device settings include ${mode}`);
        }
        assert(window.includes("_update('noise-mode'"),
            'OnePlus device settings persist the selected ANC mode');
    }],
    ['OnePlus ANC state is synchronized from the device on connection', () => {
        const socket = readText(GLib.build_filenamev([ROOT, 'lib', 'devices', 'oneplusBuds',
            'oneplusBudsSocket.js']));
        const device = readText(GLib.build_filenamev([ROOT, 'lib', 'devices', 'oneplusBuds',
            'oneplusBudsDevice.js']));
        assert(socket.includes('this._ancSynchronized = true;'),
            'initial device state triggers one current ANC mode request');
        assert(device.includes('this._saveNoiseMode(protocolIndex);'),
            'device-confirmed ANC mode replaces the persisted preference');
    }],
    ['generic OPOv1 devices receive battery widgets and icon configuration', () => {
        const device = readText(GLib.build_filenamev([ROOT, 'lib', 'devices', 'opov1',
            'genericOpov1Device.js']));
        assert(device.includes('new OnePlusBudsSocket('),
            'generic OPOv1 uses the battery-capable shared transport');
        assert(device.includes('battery: this._updateBattery.bind(this)'),
            'generic OPOv1 forwards battery events to its data handler');
        assert(device.includes("profile: 'generic-opov1'"),
            'generic OPOv1 creates a configurable device record');
    }],
];
