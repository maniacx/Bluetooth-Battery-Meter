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
    ['OnePlus profiles are opt-in by default', () => {
        assertEqual(schemaDefault('enable-oneplus-buds-device'), 'false',
            'confirmed OnePlus profile default');
        assertEqual(schemaDefault('enable-experimental-opov1-device'), 'false',
            'experimental generic OPOv1 profile default');
    }],
];
