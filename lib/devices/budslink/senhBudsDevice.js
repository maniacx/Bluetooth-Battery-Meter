'use strict';

const SenhBudsUUID = 'a2129ff3-081b-4c45-8afe-469d9c4842ec';

export function isSenhBuds(bluezDeviceProxy) {
    const uuids = bluezDeviceProxy.UUIDs ?? [];
    return uuids.includes(SenhBudsUUID);
}

