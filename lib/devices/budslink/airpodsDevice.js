'use strict';

const AirpodsUUID = '74ec2172-0bad-4d01-8f77-997b2be0722a';

const SupportedModels = [
    '2002', // AirPods 1st Gen
    '200F', // AirPods 2nd Gen
    '2013', // AirPods 3rd Gen
    '201B', // AirPods 4th Gen with ANC
    '2019', // AirPods 4th Gen
    '202D', // AirPods Max 2
    '200A', // AirPods Max
    '201F', // AirPods Max USB-C
    '2014', // AirPods Pro 2nd Gen
    '2024', // AirPods Pro 2nd Gen USB-C
    '2027', // AirPods Pro 3rd Gen
    '200E', // AirPods Pro
    '2012', // Beats Fit Pro
    '2010', // Beats Flex
    '2006', // Beats Solo 3
    '2025', // Beats Solo 4
    '2026', // Beats Solo Buds
    '200C', // Beats Solo Pro
    '2009', // Beats Studio 3
    '2011', // Beats Studio Buds
    '2016', // Beats Studio Buds Plus
    '2017', // Beats Studio Pro
    '2005', // Beats X
    '2003', // Powerbeats 3
    '200D', // Powerbeats 4
    '200B', // Powerbeats Pro
    '201D', // Powerbeats Pro 2
    '202F', // Powerbeats Fit
];

export function isAirpods(uuids, modalias) {
    if (!uuids.includes(AirpodsUUID))
        return false;

    if (!modalias)
        return false;

    const regex = /v004Cp([0-9A-Fa-f]{4})d/;
    const match = modalias.match(regex);
    if (!match)
        return false;

    const model = match[1].toUpperCase();
    return SupportedModels.includes(model);
}

