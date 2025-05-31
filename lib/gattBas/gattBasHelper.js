'use strict';

export function checkForGattBasDevices(UUIDs) {
    const UUID = '0000180f-0000-1000-8000-00805f9b34fb';
    const isGattBasDevice = !!UUIDs && UUIDs.includes(UUID);
    return isGattBasDevice;
}

export const supportedCommonIcons = [
    'audio-card', 'audio-speakers', 'audio-speakers2', 'audio-speakers3',
    'audio-headphones', 'audio-headset', 'headphone1', 'earbuds',
    'earbuds-wingtip', 'earbuds-wingtip2',  'earbuds-neckband', 'earbuds-stem',
    'earbuds-stem2', 'earbuds-stem3', 'input-microphone', 'input-gaming',
    'input-gaming2', 'input-gaming3', 'input-keyboard', 'input-keyboard2', 'input-mouse',
    'input-tablet', 'touchpad', 'phone', 'camera-photo', 'camera-video',
    'computer', 'video-display', 'printer', 'scanner', 'multimedia-player',
    'modem', 'network-wireless', 'wearable', 'wearable2',
];

export const supportedCircularWidgetIcons = [
    'audio-card', 'audio-speakers', 'audio-speakers2', 'audio-speakers3',
    'audio-headphones', 'audio-headset', 'headphone1', 'earbuds',
    'earbuds-left', 'earbuds-right', 'earbuds-wingtip', 'earbuds-wingtip-left',
    'earbuds-wingtip-right', 'earbuds-wingtip2', 'earbuds-wingtip2-left',
    'earbuds-wingtip2-right', 'earbuds-neckband', 'earbuds-stem', 'earbuds-stem-left',
    'earbuds-stem-right', 'earbuds-stem2', 'earbuds-stem2-left', 'earbuds-stem2-right',
    'earbuds-stem3', 'earbuds-stem3-left', 'earbuds-stem3-right', 'case-normal',
    'case-narrow', 'case-oval', 'case-oval-short', 'input-microphone', 'input-gaming',
    'input-gaming2', 'input-gaming3', 'input-keyboard', 'input-keyboard2',
    'input-split-keyboard-l', 'input-split-keyboard-r', 'input-mouse',
    'input-tablet', 'touchpad', 'phone', 'multimedia-player', 'pda', 'camera-photo',
    'camera-video', 'computer', 'video-display', 'printer', 'scanner',
    'modem', 'network-wireless', 'wearable', 'wearable2',
];
