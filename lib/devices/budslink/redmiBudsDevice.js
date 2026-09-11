'use strict';

const RedmiBudsUUID = '0000fd2d-0000-1000-8000-00805f9b34fb';

export function isRedmiBuds(uuids) {
    return uuids.includes(RedmiBudsUUID);
}

