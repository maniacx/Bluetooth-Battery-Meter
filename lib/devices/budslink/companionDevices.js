'use strict';

import {isAirpods} from './airpodsDevice.js';
import {isBoseBuds} from './boseBudsDevice.js';
import {isGalaxyBuds} from './galaxyBudsDevice.js';
import {isGoogleBuds} from './googleBudsDevice.js';
import {isNothingBuds} from './nothingBudsDevice.js';
import {isRedmiBuds} from './redmiBudsDevice.js';
import {isSenhBuds} from './senhBudsDevice.js';
import {isSony} from './sonyDevice.js';
import {isOpoBuds} from './opoBudsDevice.js';
import {isEdifierBuds} from './edifierBudsDevice.js';
import {isSoundcore} from './soundcoreDevice.js';
import {isCambridgeBuds} from './cambrigdeBudsDevice.js';


export const DeviceTypeBudsLink = 'budslink';

const DeviceDetectors = [
    isAirpods,
    isBoseBuds,
    isGalaxyBuds,
    isGoogleBuds,
    isNothingBuds,
    isRedmiBuds,
    isSenhBuds,
    isSony,
    isOpoBuds,
    isEdifierBuds,
    isSoundcore,
    isCambridgeBuds,
];

export function isBudsLink(bluezDeviceProxy) {
    return DeviceDetectors.some(detector => detector(bluezDeviceProxy));
}
