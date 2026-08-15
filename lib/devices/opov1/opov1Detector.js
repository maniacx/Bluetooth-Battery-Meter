'use strict';

import {OPOV1_UUID} from '../oneplusBuds/oneplusBudsConfig.js';

// Generic OPOv1 support must remain UUID-gated because it has no confirmed model identity.
export function isGenericOPOv1(_bluezDeviceProxy, uuids) {
    return {supported: uuids.includes(OPOV1_UUID) ? 'yes' : 'no', bluezProps: []};
}
