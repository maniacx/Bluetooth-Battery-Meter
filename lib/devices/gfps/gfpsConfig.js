'use strict';

// Google Fast Pair Service (GFPS) RFCOMM Message Stream UUID
export const GfpsUUID = 'df21fe2c-2515-4fdb-8886-f12c4d67927c';
export const DeviceTypeGfps = 'gfps';

// Message Group codes
export const MessageGroup = {
    DEVICE_INFO: 0x03,
    HEARABLE_CONTROL: 0x08,
};

// Message Code codes
export const DeviceInfoMessage = {
    BATTERY_UPDATE: 0x03,
};

export const HearableControlMessage = {
    GET_ANC_STATE: 0x11,
    SET_ANC_STATE: 0x12,
    NOTIFY_ANC_STATE: 0x13,
};

// Active Noise Control (ANC) Modes bitmasks / flags
export const ANCMode = {
    TRANSPARENCY: 0x80, // Bit 7
    ADAPTIVE: 0x40,     // Bit 6
    OFF: 0x20,          // Bit 5
    ANC_ON: 0x08,       // Bit 3
};

// Supported model configurations
export const GfpsModelList = [
    {
        modelId: 'PixelBudsPro2',
        alias: 'Pixel Buds Pro 2',
        pattern: /Pixel\s+Buds\s+Pro\s+2/i,
        budsIcon: 'earbuds-stem3',
        case: 'case-oval',
        batteryLR: true,
        batteryCase: true,
        supportsAnc: true,
    },
    {
        modelId: 'PixelBudsPro',
        alias: 'Pixel Buds Pro',
        pattern: /Pixel\s+Buds\s+Pro/i,
        budsIcon: 'earbuds-stem3',
        case: 'case-oval',
        batteryLR: true,
        batteryCase: true,
        supportsAnc: true,
    },
    {
        modelId: 'PixelBudsASeries',
        alias: 'Pixel Buds A-Series',
        pattern: /Pixel\s+Buds\s+A-Series|Pixel\s+Buds\s+A\s+Series/i,
        budsIcon: 'earbuds-stem3',
        case: 'case-oval',
        batteryLR: true,
        batteryCase: true,
        supportsAnc: false,
    },
    {
        modelId: 'PixelBuds2',
        alias: 'Pixel Buds (2020)',
        pattern: /Pixel\s+Buds/i,
        budsIcon: 'earbuds-stem3',
        case: 'case-oval',
        batteryLR: true,
        batteryCase: true,
        supportsAnc: false,
    },
    {
        modelId: 'GenericFastPair',
        alias: 'Fast Pair Earbuds',
        pattern: null,
        budsIcon: 'earbuds',
        case: 'case-oval',
        batteryLR: true,
        batteryCase: true,
        supportsAnc: true,
    }
];

