'use strict';

const NothingBudsUUID = 'aeac4a03-dff5-498f-843a-34487cf133eb';

export function isNothingBuds(bluezDeviceProxy) {
    const uuids = bluezDeviceProxy.UUIDs ?? [];
    return uuids.includes(NothingBudsUUID);
}

