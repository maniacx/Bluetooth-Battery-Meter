'use strict';

export function assert(condition, message) {
    if (!condition)
        throw new Error(message);
}

export function assertEqual(actual, expected, message) {
    if (actual !== expected)
        throw new Error(`${message}: expected ${expected}, received ${actual}`);
}

export function assertDeepEqual(actual, expected, message) {
    const actualText = JSON.stringify(actual);
    const expectedText = JSON.stringify(expected);
    if (actualText !== expectedText)
        throw new Error(`${message}: expected ${expectedText}, received ${actualText}`);
}

export function assertThrows(callback, message) {
    try {
        callback();
    } catch {
        return;
    }
    throw new Error(`${message}: expected an error`);
}
