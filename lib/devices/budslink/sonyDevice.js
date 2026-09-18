'use strict';

const SonyUUIDv1 = '96cc203e-5068-46ad-b32d-e316f5e069ba';
const SonyUUIDv2 = '956c7b26-d49a-4ba8-b03f-b17d393cb6e2';

const SupportedModels = [
    'v054Cp0DDF', // Sony LinkBuds
    'v054Cp0DF4', // Sony LinkBuds S
    'v054Cp0CE0', // Sony WF-1000XM3
    'v054Cp0DE1', // Sony WF-1000XM4
    'v054Cp0E63', // Sony WF-1000XM5
    'v054Cp0DD4', // Sony WF-C500
    'v054Cp0F36', // Sony WF-C510
    'v054Cp0EC4', // Sony WF-C700N
    'v054Cp0C67', // Sony WH-1000XM2
    'v054Cp0CD3', // Sony WH-1000XM3
    'v054Cp0D58', // Sony WH-1000XM4
    'v054Cp0DF0', // Sony WH-1000XM5
    'v054Cp0F8A', // Sony WH-1000XM6
    'v054Cp0EAF', // Sony WH-CH720N
    'v054Cp0CDC', // Sony WH-XB900N
    'v054Cp0DDC', // Sony WH-XB910N
    'v054Cp0C7E', // Sony WI-SP600N
];

export function isSony(uuids, modalias) {
    if (!uuids.includes(SonyUUIDv1) && !uuids.includes(SonyUUIDv2))
        return false;

    if (!modalias)
        return false;

    return SupportedModels.some(model => modalias.includes(model));
}
