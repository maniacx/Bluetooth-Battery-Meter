'use strict';

const MaestroUUID = '25e97ff7-24ce-4c4c-8951-f764a708f7b5';

export function isGoogleBuds(bluezDeviceProxy) {
    const uuids = bluezDeviceProxy.UUIDs ?? [];
    return uuids.includes(MaestroUUID);
}

