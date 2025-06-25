'use strict';

export const BatteryType = {
    SINGLE: 0x01,
    RIGHT: 0x02,
    LEFT: 0x04,
    CASE: 0x08,
};

export const BatteryChargingStatus = {
    CHARGING: 0x01,
    DISCHARGING: 0x02,
    DISCONNECTED: 0x04,
};

export const EarDetection = {
    IN_EAR: 0x00,
    OUT_EAR: 0x01,
    IN_CASE: 0x02,
};

export const ANCMode = {
    ANC_OFF: 0x01,
    ANC_ON: 0x02,
    TRANSPARENCY: 0x03,
    ADAPTIVE: 0x04,
};

export const AwarenessMode = {
    ON: 0x01,
    OFF: 0x02,
};

export const PacketConstants = {
    SETTINGS: [0x09, 0x00],
    PREFIX: [0x04, 0x00, 0x04, 0x00],
    SUFFIX: [0x00, 0x00, 0x00],

    HANDSHAKE: Uint8Array.from([
        0x00, 0x00, 0x04, 0x00, 0x01, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
    ]),

    SET_SPECIFIC_FEATURES: Uint8Array.from([
        0x04, 0x00, 0x04, 0x00, 0x4d, 0x00, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ]),

    REQUEST_NOTIFICATIONS: Uint8Array.from([
        0x04, 0x00, 0x04, 0x00, 0x0f, 0x00, 0xff, 0xff, 0xff, 0xff,
    ]),

    HANDSHAKE_ACK: Uint8Array.from([
        0x01, 0x00, 0x04, 0x00,
    ]),

    FEATURES_ACK: Uint8Array.from([
        0x04, 0x00, 0x04, 0x00, 0x2b, 0x00,
    ]),

    BATTERY_STATUS_NOTIFICATION: Uint8Array.from([
        0x04, 0x00, 0x04, 0x00, 0x04, 0x00,
    ]),

    CONVERSATION_AWARENESS_DATA: Uint8Array.from([
        0x04, 0x00, 0x04, 0x00, 0x4b, 0x00, 0x02, 0x00, 0x01,
    ]),

    EAR_DETECTION_PREFIX: Uint8Array.from([
        0x04, 0x00, 0x04, 0x00, 0x06, 0x00,
    ]),

    ADAPTIVE_CONTROL_HEADER: Uint8Array.from([
        0x04, 0x00, 0x04, 0x00, 0x09, 0x00, 0x2E,
    ]),
};

PacketConstants.NOISE_CANCELLATION_HEADER = Uint8Array.from([
    ...PacketConstants.PREFIX, ...PacketConstants.SETTINGS, 0x0d,
]);

PacketConstants.NOISE_CANCELLATION_OFF = Uint8Array.from([
    ...PacketConstants.NOISE_CANCELLATION_HEADER, 0x01, ...PacketConstants.SUFFIX,
]);

PacketConstants.NOISE_CANCELLATION_ON = Uint8Array.from([
    ...PacketConstants.NOISE_CANCELLATION_HEADER, 0x02, ...PacketConstants.SUFFIX,
]);

PacketConstants.NOISE_CANCELLATION_TRANSPARENCY = Uint8Array.from([
    ...PacketConstants.NOISE_CANCELLATION_HEADER, 0x03, ...PacketConstants.SUFFIX,
]);

PacketConstants.NOISE_CANCELLATION_ADAPTIVE = Uint8Array.from([
    ...PacketConstants.NOISE_CANCELLATION_HEADER, 0x04, ...PacketConstants.SUFFIX,
]);

PacketConstants.CONVERSATION_AWARENESS_HEADER = Uint8Array.from([
    ...PacketConstants.PREFIX, ...PacketConstants.SETTINGS, 0x28,
]);

PacketConstants.CONVERSATION_AWARENESS_OFF = Uint8Array.from([
    ...PacketConstants.CONVERSATION_AWARENESS_HEADER, 0x02, ...PacketConstants.SUFFIX,
]);

PacketConstants.CONVERSATION_AWARENESS_ON = Uint8Array.from([
    ...PacketConstants.CONVERSATION_AWARENESS_HEADER, 0x01, ...PacketConstants.SUFFIX,
]);

export const AirpodsModelList = [
    // AirPods 1st Gen
    {
        key: '2002',
        batteryType: 3,
        ancSupported: false,
        adaptiveSupported: false,
        awarenessSupported: false,
        albumArtIcon: 'airpod',
        budsIcon: 'earbuds-stem3',
        case: 'case-narrow',
    },
    // AirPods 2nd Gen
    {
        key: '200F',
        batteryType: 3,
        ancSupported: false,
        adaptiveSupported: false,
        awarenessSupported: false,
        albumArtIcon: 'airpod',
        budsIcon: 'earbuds-stem3',
        case: 'case-narrow',
    },
    // AirPods 3rd Gen
    {
        key: '2013',
        batteryType: 3,
        ancSupported: false,
        adaptiveSupported: false,
        awarenessSupported: false,
        albumArtIcon: 'airpod3',
        budsIcon: 'earbuds-stem2',
        case: 'case-normal',
    },
    // AirPods 4th Gen
    {
        key: '2019',
        batteryType: 3,
        ancSupported: false,
        adaptiveSupported: false,
        awarenessSupported: false,
        albumArtIcon: 'airpod3',
        budsIcon: 'earbuds-stem2',
        case: 'case-normal',
    },
    // AirPods 4th Gen with ANC
    {
        key: '201B',
        batteryType: 3,
        ancSupported: true,
        adaptiveSupported: true,
        awarenessSupported: true,
        albumArtIcon: 'airpod3',
        budsIcon: 'earbuds-stem2',
        case: 'case-normal',
    },
    // AirPods Pro
    {
        key: '200E',
        batteryType: 3,
        ancSupported: true,
        adaptiveSupported: false,
        awarenessSupported: false,
        albumArtIcon: 'airpodpro',
        budsIcon: 'earbuds-stem',
        case: 'case-normal',
    },
    // AirPods Pro 2nd Gen
    {
        key: '2014',
        batteryType: 3,
        ancSupported: true,
        adaptiveSupported: true,
        awarenessSupported: true,
        albumArtIcon: 'airpodpro',
        budsIcon: 'earbuds-stem',
        case: 'case-normal',
    },
    // AirPods Pro 2nd Gen USB-C
    {
        key: '2024',
        batteryType: 3,
        ancSupported: true,
        adaptiveSupported: true,
        awarenessSupported: true,
        albumArtIcon: 'airpodpro',
        budsIcon: 'earbuds-stem',
        case: 'case-normal',
    },
    // AirPods Max
    {
        key: '200A',
        batteryType: 1,
        ancSupported: true,
        adaptiveSupported: false,
        awarenessSupported: false,
        albumArtIcon: 'airpodmax',
        budsIcon: 'headphone1',
        case: null,
    },
    // AirPods Max USB-C
    {
        key: '201F',
        batteryType: 1,
        ancSupported: true,
        adaptiveSupported: false,
        awarenessSupported: false,
        albumArtIcon: 'airpodmax',
        budsIcon: 'headphone1',
        case: null,
    },
    // Beats Fit Pro
    {
        key: '2012',
        batteryType: 3,
        ancSupported: true,
        adaptiveSupported: false,
        awarenessSupported: false,
        albumArtIcon: 'beats-fitpro',
        budsIcon: 'earbuds-wingtip',
        case: 'case-oval',
    },
    // Beats X
    {
        key: '2005',
        batteryType: 1,
        ancSupported: false,
        adaptiveSupported: false,
        awarenessSupported: false,
        albumArtIcon: 'beats-flex',
        budsIcon: 'earbuds-neckband',
        case: null,
    },
    // Beats Flex
    {
        key: '2010',
        batteryType: 1,
        ancSupported: false,
        adaptiveSupported: false,
        awarenessSupported: false,
        albumArtIcon: 'beats-flex',
        budsIcon: 'earbuds-neckband',
        case: null,
    },
    // Beats Solo 3
    {
        key: '2006',
        batteryType: 1,
        ancSupported: false,
        adaptiveSupported: false,
        awarenessSupported: false,
        albumArtIcon: 'beats-solo',
        budsIcon: 'headphone1',
        case: null,
    },
    // Powerbeats 3
    {
        key: '2003',
        batteryType: 1,
        ancSupported: false,
        adaptiveSupported: false,
        awarenessSupported: false,
        albumArtIcon: 'beats-powerbeats',
        budsIcon: 'earbuds-wingtip2',
        case: null,
    },
    // Beats Studio 3
    {
        key: '2009',
        batteryType: 1,
        ancSupported: false,
        adaptiveSupported: false,
        awarenessSupported: false,
        albumArtIcon: 'beats-studio',
        budsIcon: 'headphone1',
        case: null,
    },
    // Powerbeats Pro
    {
        key: '200B',
        batteryType: 3,
        ancSupported: false,
        adaptiveSupported: false,
        awarenessSupported: false,
        albumArtIcon: 'beats-powerbeats',
        budsIcon: 'earbuds-wingtip2',
        case: 'case-oval-short',
    },
    // Beats Solo Pro
    {
        key: '200C',
        batteryType: 1,
        ancSupported: false,
        adaptiveSupported: false,
        awarenessSupported: false,
        albumArtIcon: 'beats-solo',
        budsIcon: 'headphone1',
        case: null,
    },
    // Powerbeats 4
    {
        key: '200D',
        batteryType: 1,
        ancSupported: false,
        adaptiveSupported: false,
        awarenessSupported: false,
        albumArtIcon: 'beats-powerbeats',
        budsIcon: 'earbuds-wingtip2',
        case: null,
    },
    // Beats Studio Pro
    {
        key: '2017',
        batteryType: 1,
        ancSupported: true,
        adaptiveSupported: false,
        awarenessSupported: false,
        albumArtIcon: 'beats-studio',
        budsIcon: 'headphone1',
        case: null,
    },
    // Beats Studio Buds
    {
        key: '2011',
        batteryType: 3,
        ancSupported: false,
        adaptiveSupported: false,
        awarenessSupported: false,
        albumArtIcon: 'beats-buds',
        budsIcon: 'earbuds',
        case: 'case-oval',
    },
    // Beats Studio Buds Plus
    {
        key: '2016',
        batteryType: 3,
        ancSupported: false,
        adaptiveSupported: false,
        awarenessSupported: false,
        albumArtIcon: 'beats-buds',
        budsIcon: 'earbuds',
        case: 'case-oval',
    },
];


