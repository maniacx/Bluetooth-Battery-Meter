'use strict';

// Device-list persistence is kept free from GNOME Shell APIs for headless tests.
export function loadDeviceList(entries) {
    const devices = new Map();
    for (const entry of entries) {
        const item = JSON.parse(entry);
        devices.set(item.path, {
            icon: item.icon,
            alias: item.alias,
            paired: item.paired,
            batteryReported: item['battery-reported'],
            qsLevelEnabled: item['qs-level'],
            indicatorMode: item['indicator-mode'],
            isEnhancedDevice: item['enhanced-device'],
            connectedTime: item['connected-time'] || 0,
            disconnectedTime: item['disconnected-time'] || 0,
        });
    }
    return devices;
}

export function saveDeviceList(devices) {
    const entries = [];
    for (const [path, props] of devices) {
        entries.push(JSON.stringify({
            path,
            icon: props.icon,
            alias: props.alias,
            paired: props.paired,
            'battery-reported': props.batteryReported,
            'qs-level': props.qsLevelEnabled,
            'indicator-mode': props.indicatorMode,
            'enhanced-device': props.isEnhancedDevice,
            'connected-time': props.connectedTime,
            'disconnected-time': props.disconnectedTime,
        }));
    }
    return entries;
}

export function sortDevicesByHistory(devices, deviceList) {
    const connected = [];
    const disconnected = [];
    for (const device of devices) {
        const props = deviceList.get(device.get_object_path());
        const item = {
            device,
            time: device.connected ? props?.connectedTime || 0 : props?.disconnectedTime || 0,
        };
        (device.connected ? connected : disconnected).push(item);
    }
    connected.sort((a, b) => b.time - a.time);
    disconnected.sort((a, b) => b.time - a.time);
    return [...connected, ...disconnected].map(item => item.device);
}
