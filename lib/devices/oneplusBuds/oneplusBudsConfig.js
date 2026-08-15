'use strict';

export const DeviceTypeOnePlusBuds = 'oneplusBuds';
export const OPOV1_PROFILE_TYPE = 'opov1';
// BlueZ advertises this vendor RFCOMM service for the confirmed device.
export const OPOV1_UUID = '0000079A-D102-11E1-9B23-00025B00A5A5';
export const CONFIRMED_ADDRESS = '40:72:18:CC:44:EA';
export const BATTERY_REQUEST = 0x0106;
export const BATTERY_RESPONSE = 0x8106;
export const STATUS_REQUEST = 0x0109;
export const STATUS_RESPONSE = 0x8109;
export const ANC_POLL = 0x010C;
export const ANC_SET = 0x0404;
export const ANC_ACK = 0x8404;
export const ANC_RESPONSE = 0x810C;

export const ANC_MODES = [
    {index: 3, name: 'off'},
    {index: 4, name: 'noise-high'},
    {index: 5, name: 'noise-medium'},
    {index: 6, name: 'noise-low'},
    {index: 7, name: 'auto-medium'},
    {index: 8, name: 'transparency'},
];

export const OnePlusBudsProfile = {type: OPOV1_PROFILE_TYPE, uuid: OPOV1_UUID};

export function isOnePlusBuds(bluezDeviceProxy, _uuids) {
    if (!bluezDeviceProxy.Address) {
        return {supported: 'pending', bluezProps: ['Address']};
    }
    return {
        supported: bluezDeviceProxy.Address.toUpperCase() === CONFIRMED_ADDRESS ? 'yes' : 'no',
        bluezProps: [],
    };
}
