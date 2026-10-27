'use strict';

const SoundcoreVendorUuidPrefix = '0cf12d31-fac3-4553-bd80-d6832e7b';
const SppUUid = '00001101-0000-1000-8000-00805f9b34fb';

const SupportedModels = [
    '3947', // Soundcore Liberty 4 NC
];

export function isSoundcore(bluezDeviceProxy) {
    const uuids = bluezDeviceProxy.UUIDs ?? [];

    if (!uuids.includes(SppUUid))
        return false;

    const soundcoreUuid = uuids.find(uuid => uuid.startsWith(SoundcoreVendorUuidPrefix));

    if (!soundcoreUuid)
        return false;

    const modelId = soundcoreUuid.slice(-4);
    return SupportedModels.includes(modelId);
}
