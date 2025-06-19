#!/usr/bin/env -S gjs -m

export const Bat1Group = new Set([
    'Front', 'Top', 'Upper', 'Main', 'Inside', 'Left', 'Internal',
]);

export const Bat2Group = new Set([
    'Back', 'Bottom', 'Lower', 'Backup', 'Auxiliary',
    'Supplementary', 'Outside', 'Right', 'External',
]);

export const CpfNames = {
    0x0100: 'Front',  0x0101: 'Back',       0x0102: 'Top',        0x0103: 'Bottom',
    0x0104: 'Upper',  0x0105: 'Lower',      0x0106: 'Main',       0x0107: 'Backup',
    0x0108: 'Auxiliary', 0x0109: 'Supplementary', 0x010B: 'Inside',  0x010C: 'Outside',
    0x010D: 'Left',   0x010E: 'Right',      0x010F: 'Internal',   0x0110: 'External',
};

