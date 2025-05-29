'use strict';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

const BUS = 'com.github.maniacx.BluetoothBatteryMeter';
const OBJECT_PATH = '/com/github/maniacx/BluetoothBatteryMeter';
const MANAGER_INTERFACE = 'com.github.maniacx.BluetoothBatteryMeter.Manager';
const DEVICE_INTERFACE = 'com.github.maniacx.BluetoothBatteryMeter.Device';

Gio._promisify(Gio.DBusProxy, 'new_for_bus');
Gio._promisify(Gio.DBusProxy.prototype, 'call');
Gio._promisify(Gio.DBusConnection.prototype, 'call');

// Bluez Dbus functions

const BluezDeviceInterface = `
<node>
  <interface name="org.bluez.Device1">
    <property name="UUIDs" type="as" access="read"/>
  </interface>
</node>`;

export const BluezDeviceProxy = Gio.DBusProxy.makeProxyWrapper(BluezDeviceInterface);

// FreeDesktop Dbus functions
export async function getPlayerNames() {
    try {
        const res = await Gio.DBus.session.call(
            'org.freedesktop.DBus', '/org/freedesktop/DBus', 'org.freedesktop.DBus',
            'ListNames', null, new GLib.VariantType('(as)'), Gio.DBusCallFlags.NONE,
            -1, null
        );
        return res ? res.deepUnpack() : '';
    } catch {
        log('Bluetooth-Battery-Meter: Error ListNames');
        return '';
    }
}

// MediaPlayer2 dbus functions
export async function initMediaPlayerProxy(busname) {
    try {
        const proxy = await Gio.DBusProxy.new_for_bus(
            Gio.BusType.SESSION,
            Gio.DBusProxyFlags.NONE,
            null,
            busname,
            '/org/mpris/MediaPlayer2',
            'org.mpris.MediaPlayer2.Player',
            null
        );
        return proxy;
    } catch {
        log('Bluetooth-Battery-Meter: Failed to initialize proxy in mediaproxy');
        return null;
    }
}

export async function playPlayer(proxy) {
    try {
        if (proxy) {
            await proxy.call(
                'Play',
                null,
                Gio.DBusCallFlags.NONE,
                -1,
                null
            );
        } else {
            log('Bluetooth-Battery-Meter: Proxy not defined for playPlayer function.');
        }
    } catch {
        log('Bluetooth-Battery-Meter: Error adding device');
    }
}

export async function pausePlayer(proxy) {
    try {
        if (proxy) {
            await proxy.call(
                'Pause',
                null,
                Gio.DBusCallFlags.NONE,
                -1,
                null
            );
        } else {
            log('Bluetooth-Battery-Meter: Proxy not defined for pausePlayer function.');
        }
    } catch {
        log('Bluetooth-Battery-Meter: Error adding device');
    }
}

// Bluettooth battery meter Manager dbus functions
export function watchServiceStatus(onAdded, onRemoved) {
    try {
        const watchId = Gio.bus_watch_name(
            Gio.BusType.SESSION,
            'com.github.maniacx.BluetoothBatteryMeter',
            Gio.BusNameWatcherFlags.NONE,
            onAdded,
            onRemoved
        );
        return watchId;
    } catch {
        log('Bluetooth-Battery-Meter: Failed to watch bus name proxy');
        return null;
    }
}

export function unwatchServiceStatus(watchId) {
    try {
        Gio.bus_unwatch_name(watchId);
    } catch {
        log('Bluetooth-Battery-Meter: Failed to unwatch bus name proxy');
    }
}

export async function initManagerProxy() {
    try {
        const proxy = await Gio.DBusProxy.new_for_bus(
            Gio.BusType.SESSION,
            Gio.DBusProxyFlags.NONE,
            null,
            BUS,
            OBJECT_PATH,
            MANAGER_INTERFACE,
            null
        );
        return proxy;
    } catch {
        log('Bluetooth-Battery-Meter: Failed to initialize proxy in initManagerProxy');
        return null;
    }
}

export async function addDevice(proxy, devicePath, deviceType) {
    try {
        if (proxy) {
            await proxy.call(
                'AddDevice',
                new GLib.Variant('(ss)', [devicePath, deviceType]),
                Gio.DBusCallFlags.NONE,
                -1,
                null
            );
        } else {
            log('Bluetooth-Battery-Meter: Proxy not defined for addDevice function.');
        }
    } catch {
        log('Bluetooth-Battery-Meter: Error adding device');
    }
}

export async function shutdownService(proxy) {
    try {
        if (proxy) {
            await proxy.call(
                'ShutdownService',
                null,
                Gio.DBusCallFlags.NONE,
                -1,
                null
            );
        } else {
            log('Bluetooth-Battery-Meter: Proxy not defined for shutdownService function.');
        }
    } catch {
        log('Bluetooth-Battery-Meter: Error Shutting Down Script');
    }
}

// Bluettooth battery meter Device dbus functions

export async function deviceProxy(path) {
    try {
        const proxy = await Gio.DBusProxy.new_for_bus(
            Gio.BusType.SESSION,
            Gio.DBusProxyFlags.NONE,
            null,
            BUS,
            path,
            DEVICE_INTERFACE,
            null
        );
        return proxy;
    } catch {
        log('Bluetooth-Battery-Meter: Failed to initialize proxy in deviceProxy');
        return null;
    }
}


export async function requestStatus(proxy, information) {
    let respond = '';
    try {
        if (proxy) {
            const result = await proxy.call(
                'RequestStatus',
                new GLib.Variant('(s)', [information]),
                Gio.DBusCallFlags.NONE,
                -1,
                null
            );

            if (result)
                [respond] = result.deepUnpack();
        }
    } catch {
        log('Bluetooth-Battery-Meter: Errored during requestStatus');
    }

    return respond;
}

export async function setDeviceCommand(proxy, command) {
    try {
        if (proxy) {
            await proxy.call(
                'SetDeviceCommand',
                new GLib.Variant('(s)', [command]),
                Gio.DBusCallFlags.NONE,
                -1,
                null
            );
        } else {
            log('Bluetooth-Battery-Meter: Proxy not defined for setDeviceCommand function.');
        }
    } catch {
        log('Bluetooth-Battery-Meter: Errored during setDeviceCommand');
    }
}

export function isPythonInstalled() {
    return !!GLib.find_program_in_path('python3');
}

async function execCheck(argv) {
    try {
        const proc = new Gio.Subprocess({
            argv,
            flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE,
        });
        proc.init(null);
        return await new Promise(resolve => {
            proc.communicate_utf8_async(null, null, (obj, res) => {
                try {
                    const [, stdout] = obj.communicate_utf8_finish(res);
                    resolve(stdout ? stdout.trim() : null);
                } catch {
                    resolve(null);
                }
            });
        });
    } catch {
        return null;
    }
}

export async function isPythonEnvironmentCompatible(path) {
    const output = await execCheck(['python3', path]);
    if (!output)
        return ['not-installed'];

    if (output === 'available')
        return ['available'];

    return output.split(',');
}

export const DataHandler = GObject.registerClass({
    Signals: {
        'configuration-changed': {},
        'properties-changed': {},
    },
}, class DataHandler extends GObject.Object {
    constructor(config, props, set1ButtonClicked, set2ButtonClicked) {
        super();
        this._config = config;
        this._props = props;
        this.set1ButtonClicked = set1ButtonClicked;
        this.set2ButtonClicked = set2ButtonClicked;
    }

    getConfig() {
        return this._config;
    }

    setConfig(config) {
        this._config = config;
        this.emit('configuration-changed');
    }


    setProps(prop) {
        this._props = prop;
        this.emit('properties-changed');
    }

    getProps() {
        return this._props;
    }
});
