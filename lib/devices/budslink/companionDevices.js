'use strict';

import {isAirpods} from './airpodsDevice.js';
import {isBoseBuds} from './boseBudsDevice.js';
import {isGalaxyBuds} from './galaxyBudsDevice.js';
import {isGfps} from './gfpsDevice.js';
import {isGoogleBuds} from './googleBudsDevice.js';
import {isNothingBuds} from './nothingBudsDevice.js';
import {isRedmiBuds} from './redmiBudsDevice.js';
import {isSenhBuds} from './senhBudsDevice.js';
import {isSony} from './sonyDevice.js';

export const DeviceTypeBudsLink = 'budslink';

const DeviceDetectors = [
    isAirpods,
    isBoseBuds,
    isGalaxyBuds,
    isGfps,
    isGoogleBuds,
    isNothingBuds,
    isRedmiBuds,
    isSenhBuds,
    isSony,
];

export function isBudsLink(uuids, modalias) {
    return DeviceDetectors.some(detector => detector(uuids, modalias));
}
