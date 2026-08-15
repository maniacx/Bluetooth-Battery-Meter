'use strict';

// The shared OPOv1 codec deliberately contains no model-specific semantics.
export const MAX_FRAME_BODY = 660;

export function encodeVarint(value) {
    if (!Number.isInteger(value) || value < 0 || value > 0x3FFF)
        throw new Error('OPOv1 body length must be between 0 and 16383');

    const bytes = [];
    do {
        const byte = value & 0x7F;
        value >>= 7;
        bytes.push(value ? byte | 0x80 : byte);
    } while (value);
    return Uint8Array.from(bytes);
}

export function decodeVarint(data, offset = 0) {
    let value = 0;
    for (let index = 0; index < 2; index++) {
        const byte = data[offset + index];
        if (byte === undefined)
            return null;
        value |= (byte & 0x7F) << index * 7;
        if (!(byte & 0x80))
            return {value, size: index + 1};
    }
    throw new Error('OPOv1 length varint exceeds two bytes');
}

export function buildPacket(command, sequence, payload = []) {
    if (!Number.isInteger(command) || command < 0 || command > 0xFFFF)
        throw new Error('OPOv1 command must fit in uint16');
    if (!Number.isInteger(sequence) || sequence < 0 || sequence > 0xFF)
        throw new Error('OPOv1 sequence must fit in uint8');

    const body = Uint8Array.from(payload);
    if (body.length > 0xFFFF)
        throw new Error('OPOv1 packet payload is too large');
    return Uint8Array.from([
        command & 0xFF, command >> 8, sequence, body.length & 0xFF, body.length >> 8, ...body,
    ]);
}

export function parsePacket(data) {
    if (data.length < 5)
        throw new Error('OPOv1 inner packet lacks a header');
    const payloadLength = data[3] | data[4] << 8;
    if (payloadLength !== data.length - 5)
        throw new Error('OPOv1 packet payload length mismatch');
    return {
        command: data[0] | data[1] << 8,
        sequence: data[2],
        payload: data.slice(5),
        raw: data.slice(),
    };
}

export function buildFrame(packet, maxBody = MAX_FRAME_BODY) {
    const bodyLength = packet.length + 2;
    if (bodyLength > maxBody)
        throw new Error('Outbound OPOv1 fragmentation is not implemented');
    return Uint8Array.from([0xAA, ...encodeVarint(bodyLength), 0x00, 0x00, ...packet]);
}

export class OPOv1StreamDecoder {
    constructor(maxBody = MAX_FRAME_BODY) {
        this._maxBody = maxBody;
        this.reset();
    }

    reset() {
        this._buffer = new Uint8Array();
        this._fragments = [];
    }

    feed(bytes) {
        const incoming = Uint8Array.from(bytes);
        const merged = new Uint8Array(this._buffer.length + incoming.length);
        merged.set(this._buffer);
        merged.set(incoming, this._buffer.length);
        this._buffer = merged;
        const packets = [];

        while (this._buffer.length) {
            if (this._buffer[0] !== 0xAA)
                throw new Error('OPOv1 stream lost frame alignment');
            const length = decodeVarint(this._buffer, 1);
            if (!length)
                break;
            if (length.value < 2 || length.value > this._maxBody)
                throw new Error('Invalid OPOv1 frame body length');
            const frameLength = 1 + length.size + length.value;
            if (this._buffer.length < frameLength)
                break;
            const frame = this._buffer.slice(0, frameLength);
            this._buffer = this._buffer.slice(frameLength);
            const bodyOffset = 1 + length.size;
            const control = frame[bodyOffset];
            if (frame[bodyOffset + 1] !== 0)
                throw new Error('OPOv1 reserved byte is non-zero');
            const fragmentState = control & 0x03;
            const payloadOffset = bodyOffset + (fragmentState ? 3 : 2);
            if (fragmentState && frame.length < payloadOffset)
                throw new Error('Fragmented OPOv1 frame lacks fragment sequence');
            const payload = frame.slice(payloadOffset);
            if (!fragmentState) {
                if (this._fragments.length)
                    throw new Error('Unfragmented packet interrupted fragments');
                packets.push(parsePacket(payload));
            } else {
                this._fragments.push(...payload);
                if (fragmentState === 3) {
                    packets.push(parsePacket(Uint8Array.from(this._fragments)));
                    this._fragments = [];
                }
            }
        }
        return packets;
    }
}
