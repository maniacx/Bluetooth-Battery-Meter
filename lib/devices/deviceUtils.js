'use strict';

export function booleanFromByte(val) {
    switch (val) {
        case 0x00:
            return false;
        case 0x01:
            return true;
        default:
            return null;
    }
}

export function isValidByte(val, enumObj) {
    return Object.values(enumObj).includes(val);
}

export function buds2to1BatteryLevel(battProps) {
    const bat1 = battProps.battery1Level;
    const bat2 = battProps.battery2Level;
    const status1 = battProps.battery1Status;
    const status2 = battProps.battery2Status;
    const isInvalid = level => level === null || level === undefined || level === 0;
    if (status1 === 'charging' && !isInvalid(bat1) && isInvalid(bat2))
        return bat1;

    if (status2 === 'charging' && !isInvalid(bat2) && isInvalid(bat1))
        return bat2;

    if (status1 === 'charging' && status2 !== 'charging')
        return isInvalid(bat2) ? 0 : bat2;

    if (status2 === 'charging' && status1 !== 'charging')
        return isInvalid(bat1) ? 0 : bat1;

    if (isInvalid(bat1) && isInvalid(bat2))
        return 0;

    if (isInvalid(bat1))
        return bat2;

    if (isInvalid(bat2))
        return bat1;

    return bat1 < bat2 ? bat1 : bat2;
}

export function validateProperties(settings, settingsKey, devicesList, defaults, devicePath) {
    const device = devicesList.find(d => d.path === devicePath);
    if (!device)
        return;

    let changed = false;

    // Remove unknown keys
    for (const key of Object.keys(device)) {
        if (!(key in defaults)) {
            delete device[key];
            changed = true;
        }
    }

    // Add missing default keys
    for (const [key, value] of Object.entries(defaults)) {
        if (!(key in device)) {
            device[key] = value;
            changed = true;
        }
    }

    // Save if modified
    if (changed) {
        settings.set_strv(
            settingsKey,
            devicesList.map(d => JSON.stringify(d))
        );
    }
}

