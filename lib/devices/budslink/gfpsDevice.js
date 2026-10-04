'use strict';

const GfpsUUID = 'df21fe2c-2515-4fdb-8886-f12c4d67927c';

export function isGfps(bluezDeviceProxy) {
    const uuids = bluezDeviceProxy.UUIDs ?? [];
    return uuids.includes(GfpsUUID);
}


