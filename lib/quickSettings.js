'use strict';

export function getReadyBluetoothToggle(quickSettings) {
    const bluetooth = quickSettings?._bluetooth;
    const toggle = bluetooth?.quickSettingsItems?.[0];

    // Shell creates the Bluetooth toggle asynchronously during session startup.
    // Its child actor can still be off-stage when the toggle is safe to customize.
    return toggle ?? null;
}
