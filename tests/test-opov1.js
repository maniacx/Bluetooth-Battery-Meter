'use strict';
import {
    buildFrame, buildPacket, decodeVarint, encodeVarint, OPOv1StreamDecoder, parsePacket,
} from '../lib/devices/opov1/opov1Protocol.js';
import {assertDeepEqual, assertEqual, assertThrows} from './test-utils.js';

export const tests = [
    ['OPOv1 varint round-trips boundary values', () => {
        for (const value of [0, 127, 128, 660, 0x3FFF])
            assertEqual(decodeVarint(encodeVarint(value)).value, value, 'varint value');
    }],
    ['OPOv1 decoder accepts fragmented input and combined frames', () => {
        const first = buildFrame(buildPacket(0x0106, 0, [1, 2]));
        const second = buildFrame(buildPacket(0x0109, 1, [3]));
        const decoder = new OPOv1StreamDecoder();
        assertDeepEqual(decoder.feed(first.slice(0, 3)), [], 'partial frame has no packet');
        const packets = decoder.feed(Uint8Array.from([...first.slice(3), ...second]));
        assertDeepEqual(packets.map(packet => [packet.command, packet.sequence, [...packet.payload]]),
            [[0x0106, 0, [1, 2]], [0x0109, 1, [3]]], 'decoded packets');
    }],
    ['OPOv1 rejects malformed packets and lost alignment', () => {
        assertThrows(() => parsePacket([1, 2, 3]), 'short packet');
        assertThrows(() => new OPOv1StreamDecoder().feed([0]), 'lost alignment');
        assertThrows(() => decodeVarint([0x80, 0x80]), 'oversized varint');
    }],
];
