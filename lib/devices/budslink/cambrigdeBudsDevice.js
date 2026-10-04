'use strict';

const QualcommVendorUuids = [
    '0000eb04-d102-11e1-9b23-00025b00a5a5',
    '0000eb05-d102-11e1-9b23-00025b00a5a5',
    '0000eb06-d102-11e1-9b23-00025b00a5a5',
    '0000eb07-d102-11e1-9b23-00025b00a5a5',
];

const SppUUid = '00001101-0000-1000-8000-00805f9b34fb';

const SupportedModelsNamePatterns = [
    /^Melomania A100/,
];

export function isCambridgeBuds(bluezDeviceProxy) {
    const uuids = bluezDeviceProxy.UUIDs ?? [];
    const name = bluezDeviceProxy.Name ?? '';

    const deviceUuids = uuids.map(uuid => uuid.toLowerCase());

    if (!deviceUuids.includes(SppUUid))
        return false;

    if (!QualcommVendorUuids.every(uuid =>
        deviceUuids.includes(uuid)
    ))
        return false;

    return SupportedModelsNamePatterns.some(pattern =>
        pattern.test(name)
    );
}
