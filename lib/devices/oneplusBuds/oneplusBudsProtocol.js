'use strict';
import {BATTERY_RESPONSE, STATUS_RESPONSE} from './oneplusBudsConfig.js';

export const BATTERY_FRESHNESS_MS = 300000;

export function buildNoisePayload(protocolIndex) {
    if (!Number.isInteger(protocolIndex) || protocolIndex < 0 || protocolIndex > 255)
        throw new Error('OnePlus ANC protocol index must fit in uint8');
    const size = Math.max(2, Math.floor(protocolIndex / 8) + 1);
    const bitmap = new Uint8Array(size);
    bitmap[Math.floor(protocolIndex / 8)] = 1 << protocolIndex % 8;
    return Uint8Array.from([0x01, 0x01, ...bitmap]);
}

export function decodeNoiseMode(packet) {
    if (packet.payload.length < 4 || packet.payload[0] !== 0 ||
            packet.payload[1] !== 1 || packet.payload[2] !== 1)
        throw new Error('Invalid OnePlus ANC poll response');
    let index = -1;
    for (let byteIndex = 3; byteIndex < packet.payload.length; byteIndex++) {
        const byte = packet.payload[byteIndex];
        for (let bit = 0; bit < 8; bit++) {
            if (!(byte & 1 << bit))
                continue;
            if (index !== -1)
                throw new Error('OnePlus ANC bitmap has multiple active modes');
            index = (byteIndex - 3) * 8 + bit;
        }
    }
    if (index === -1)
        throw new Error('OnePlus ANC bitmap has no active mode');
    return index;
}

function records(payload, responseName) {
    if (payload.length < 2 || payload[0] !== 0)
        return [];
    const count = payload[1];
    if (!count || payload.length < 2 + count * 2)
        throw new Error(`Invalid OnePlus ${responseName} response`);
    const result = [];
    for (let offset = 2; offset < 2 + count * 2; offset += 2)
        result.push({id: payload[offset], value: payload[offset + 1]});
    return result;
}

function componentName(id) {
    return {1: 'left', 2: 'right', 3: 'case'}[id] ?? null;
}

export function decodeOnePlusPacket(packet, observedAt = Date.now()) {
    const events = [];
    if (packet.command === BATTERY_RESPONSE) {
        for (const record of records(packet.payload, 'battery')) {
            const component = componentName(record.id);
            const level = record.value & 0x7F;
            if (component && level <= 100)
                events.push({component, level, charging: Boolean(record.value & 0x80), observedAt});
        }
    } else if (packet.command === STATUS_RESPONSE) {
        for (const record of records(packet.payload, 'status')) {
            const component = componentName(record.id);
            if (component === 'left' || component === 'right')
                events.push({component, presence: record.value & 1 ? 'present' : 'absent', observedAt});
        }
    }
    return events;
}

export class OnePlusBatteryState {
    constructor() {
        this.components = {
            left: {level: null, charging: null, presence: 'unknown', observedAt: null},
            right: {level: null, charging: null, presence: 'unknown', observedAt: null},
            case: {level: null, charging: null, presence: 'unknown', observedAt: null},
        };
    }

    apply(events) {
        for (const event of events) {
            const component = this.components[event.component];
            if (!component)
                continue;
            if (event.level !== undefined)
                component.level = event.level;
            if (event.charging !== undefined)
                component.charging = event.charging;
            if (event.presence && event.presence !== 'unknown')
                component.presence = event.presence;
            component.observedAt = event.observedAt;
        }
        return this.toProperties();
    }

    connectedSides(transportConnected = true) {
        if (!transportConnected)
            return 'none';
        const {left, right} = this.components;
        if (left.presence === 'present' && right.presence === 'present')
            return 'both';
        if (left.presence === 'present' && right.presence === 'absent')
            return 'left';
        if (left.presence === 'absent' && right.presence === 'present')
            return 'right';
        if (left.presence === 'absent' && right.presence === 'absent')
            return 'none';
        return 'unknown';
    }

    toProperties() {
        const result = {connectedSides: this.connectedSides()};
        for (const [slot, name] of [[1, 'left'], [2, 'right'], [3, 'case']]) {
            const component = this.components[name];
            if (component.level !== null) {
                result[`battery${slot}Level`] = component.level;
                result[`battery${slot}Status`] = component.charging ? 'charging' : 'discharging';
            }
        }
        return result;
    }
}
