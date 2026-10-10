'use strict';

const EdifierSppUUID = 'edf00000-edfe-dfed-fedf-edfedfedfedf';

export function isEdifierBuds(bluezDeviceProxy) {
    const uuids = bluezDeviceProxy.UUIDs ?? [];
    return uuids.includes(EdifierSppUUID);
}
