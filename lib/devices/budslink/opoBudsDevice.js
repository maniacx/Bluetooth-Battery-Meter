'use strict';

const OpoBudsUUID = '0000079a-d102-11e1-9b23-00025b00a5a5';

export function isOpoBuds(bluezDeviceProxy) {
    const uuids = bluezDeviceProxy.UUIDs ?? [];
    return uuids.includes(OpoBudsUUID);
}
