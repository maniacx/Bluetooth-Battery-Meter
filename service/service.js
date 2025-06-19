#!/usr/bin/env -S gjs -m

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import {SCRIPT_VERSION, SHUTDOWN_WHEN_EXTENSION_DISABLED} from './config.js';
import {DeviceProfiles} from './libs/profiles.js';
import {createLogger, LOG_PATH} from './libs/logger.js';
import {MonitorExtensionState} from './libs/monitorExtension.js';
import {ProfileManager} from './libs/profileManager.js';

import {AirpodsDevice} from './devices/deviceAirpods.js';
import {GattBasDevice} from './devices/deviceGattBas.js';

Gio._promisify(Gio.DBusProxy, 'new');
Gio._promisify(Gio.DBusProxy, 'new_for_bus');
Gio._promisify(Gio.DBusProxy.prototype, 'call');
Gio._promisify(Gio.DBusConnection.prototype, 'call');
Gio._promisify(Gio.InputStream.prototype, 'read_bytes_async');
Gio._promisify(Gio.OutputStream.prototype, 'write_bytes_async');

const BUS_NAME = 'com.github.maniacx.BluetoothBatteryMeter';
const OBJECT_PATH = '/com/github/maniacx/BluetoothBatteryMeter';
const MANAGER_INTERFACE_NAME = 'com.github.maniacx.BluetoothBatteryMeter.Manager';
const DEVICE_INTERFACE_NAME = 'com.github.maniacx.BluetoothBatteryMeter.Device';

const MANAGER_INTROSPECTION_XML = `
<node>
  <interface name="${MANAGER_INTERFACE_NAME}">
    <method name="AddDevice">
      <arg direction="in" name="device_path" type="s"/>
      <arg direction="in" name="device_type" type="s"/>
    </method>
    <method name="ShutdownService"/>
    <property name="Version" type="s" access="read"/>
    <signal name="DeviceRemoved">
      <arg name="device_path" type="s"/>
    </signal>
  </interface>
</node>`;

const DEVICE_INTROSPECTION_XML = `
<node>
  <interface name="${DEVICE_INTERFACE_NAME}">
    <method name="RequestStatus">
      <arg name="information" type="s" direction="in"/>
      <arg name="response" type="s" direction="out"/>
    </method>
    <method name="SetDeviceCommand">
      <arg name="command" type="s" direction="in"/>
    </method>
    <property name="DeviceInfo" type="s" access="read"/>
    <property name="BatteryInfo" type="s" access="read"/>
    <property name="Toggle1State" type="u" access="read"/>
    <property name="Toggle2State" type="u" access="read"/>
    <property name="CustomMessage" type="s" access="read"/>
  </interface>
</node>
`;

const BLUE_DEVICE_INTERFACE = `
<node>
  <interface name="org.bluez.Device1">
    <property name="Connected" type="b" access="read"/>
    <property name="Modalias" type="s" access="read"/>
    <property name="ServicesResolved" type="b" access="read"/>
    <property name="UUIDs" type="as" access="read"/>
  </interface>
</node>`;

const BluezDeviceProxy = Gio.DBusProxy.makeProxyWrapper(BLUE_DEVICE_INTERFACE);

const Device = GObject.registerClass(
class Device extends GObject.Object {
    _init(manager, devicePath, deviceType) {
        super._init();
        const identifier = devicePath.split('_').slice(-3).join('');
        const tag = `Device-${identifier}`;
        this._log = createLogger(tag);
        this._manager = manager;
        this._devicePath = devicePath;
        this._deviceType = deviceType;
        this._deviceProfiles = this._manager._deviceProfiles;
        this._profileManager = this._manager._profileManager;
        this._connection = this._manager._connection;
        this._interfaceName = DEVICE_INTERFACE_NAME;
        this._registrationId = 0;
        this._deviceInfo = 'unknown';
        this._batteryInfo = 'unknown';
        this._toggle1State = 0;
        this._toggle2State = 0;
        this._customMessage = 'unknown';
        this._pendingProps = {};
        this._emitScheduled = null;

        const introspection = Gio.DBusNodeInfo.new_for_xml(DEVICE_INTROSPECTION_XML);
        const ifaceInfo = introspection.lookup_interface(DEVICE_INTERFACE_NAME);
        this._registrationId = this._connection.register_object(
            devicePath,
            ifaceInfo,
            this._onMethodCall.bind(this),
            this._onGetProperty.bind(this),
            null
        );

        this._bluezDeviceProxy = BluezDeviceProxy(Gio.DBus.system, 'org.bluez', devicePath);
        this._bluezSignalId = this._bluezDeviceProxy.connect(
            'g-properties-changed', () => this._onBluezPropertiesChanged());

        this._callbacks = {
            updateDeviceInfo: this.updateDeviceInfo.bind(this),
            updateBatteryProps: this.updateBatteryProps.bind(this),
            updateToggle1State: this.updateToggle1State.bind(this),
            updateToggle2State: this.updateToggle2State.bind(this),
            updateCustomMessage: this.updateCustomMessage.bind(this),
        };

        if (!(this._deviceType in this._deviceProfiles)) {
            this._startDevices();
        } else {
            const existingFd = this._profileManager.getFd(this._devicePath);
            this._log.info(`Profile existingFd = ${existingFd} , path = ${this._devicePath}`);
            if (existingFd === -1) {
                this._profileSignalId = this._profileManager.connect(
                    'new-connection', (_, path, newFd) => {
                        this._log.info(`Profile newFd = ${newFd} , path = ${this._devicePath}`);
                        if (path !== this._devicePath)
                            return;
                        this._fd = newFd;
                        this._profileManager.disconnect(this._profileSignalId);
                        this._profileSignalId = null;
                        this._startDevices();
                    }
                );
                this._profileManager.registerProfile(this._deviceType,
                    this._deviceProfiles[this._deviceType]);
            } else {
                this._fd = existingFd;
                this._startDevices();
            }
        }
    }

    _startDevices() {
        if (this._deviceType === 'airpods') {
            this._device = new AirpodsDevice(
                this._manager,
                this._devicePath,
                this._fd,
                this._bluezDeviceProxy,
                this._callbacks
            );
        }

        if (this._deviceType === 'gatt-bas') {
            this._device = new GattBasDevice(
                this._devicePath,
                this._bluezDeviceProxy,
                this._callbacks
            );
        }
    }

    _onBluezPropertiesChanged() {
        const connected = this._bluezDeviceProxy.Connected;
        this._log.info(`Device connected props: ${connected}`);
        if (!connected)
            this._manager.removeDevice(this._devicePath);
    }

    _onMethodCall(connection, sender, objectPath,
        ifaceName, methodName, parameters, invocation) {
        if (ifaceName === DEVICE_INTERFACE_NAME) {
            if (methodName === 'RequestStatus') {
                const [information] = parameters.deep_unpack();
                this._log.info(`RequestStatus method: ${information}`);
                const value = this.device.request_status(information);
                invocation.return_value(GLib.Variant.new('(s)', [value]));
            } else if (methodName === 'SetDeviceCommand') {
                const [command] = parameters.deep_unpack();
                this._log.info(`SetDeviceCommand method: ${command}`);
                this._device.setDeviceCommand(command);
                invocation.return_value(null);
            }
        }
    }

    updateDeviceInfo(deviceInfo) {
        if (deviceInfo !== this._deviceInfo) {
            this._deviceInfo = deviceInfo;
            this._emitPropertiesChanged({
                'DeviceInfo': GLib.Variant.new('s', this._deviceInfo),
            });
        }
    }

    updateBatteryProps(props) {
        if (props !== this._batteryInfo) {
            this._batteryInfo = props;
            this._emitPropertiesChanged({
                'BatteryInfo': GLib.Variant.new('s', this._batteryInfo),
            });
        }
    }

    updateToggle1State(toggle1State) {
        if (toggle1State !== this._toggle1State) {
            this._toggle1State = toggle1State;
            this._emitPropertiesChanged({
                'Toggle1State': GLib.Variant.new('u', this._toggle1State),
            });
        }
    }

    updateToggle2State(toggle2State) {
        if (toggle2State !== this._toggle2State) {
            this._toggle2State = toggle2State;
            this._emitPropertiesChanged({
                'Toggle2State': GLib.Variant.new('u', this._toggle2State),
            });
        }
    }

    updateCustomMessage(message) {
        if (message !== this._customMessage) {
            this._customMessage = message;
            this._emitPropertiesChanged({
                'CustomMessage': GLib.Variant.new('s', this._customMessage),
            });
        }
    }

    _emitPropertiesChanged(props) {
        for (const key in props)
            this._pendingProps[key] = props[key];

        if (!this._emitTimeoutID) {
            this._emitTimeoutID = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 20, () => {
                this._emitPendingChanges();
                this._emitTimeoutID = null;
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    _emitPendingChanges() {
        const variantProps = {};
        for (const key in this._pendingProps) {
            const value = this._pendingProps[key];
            variantProps[key] = value instanceof GLib.Variant
                ? value
                : GLib.Variant.new_variant(value);
        }

        this._connection.emit_signal(
            null,
            this._devicePath,
            'org.freedesktop.DBus.Properties',
            'PropertiesChanged',
            GLib.Variant.new('(sa{sv}as)', [
                this._interfaceName,
                variantProps,
                [],
            ])
        );

        this._log.info(`Emitting PropertiesChanged: ${JSON.stringify(
            Object.fromEntries(Object.entries(this._pendingProps).map(
                ([k, v]) => [k, v.deepUnpack()]
            ))
        )}`);
        this._pendingProps = {};
        this._emitScheduled = null;
    }

    _onGetProperty(connection, sender, objectPath, ifaceName, propertyName) {
        const properties = {
            'DeviceInfo': GLib.Variant.new('s', this._deviceInfo),
            'BatteryInfo': GLib.Variant.new('s', this._batteryInfo),
            'Toggle1State': GLib.Variant.new('u', this._toggle1State),
            'Toggle2State': GLib.Variant.new('u', this._toggle2State),
            'CustomMessage': GLib.Variant.new('s', this._customMessage),
        };
        return properties[propertyName] || null;
    }


    destroy() {
        if (this._bluezDeviceProxy && this._bluezSignalId)
            this._bluezDeviceProxy.disconnect(this._bluezSignalId);
        this._bluezSignalId = null;
        this._bluezDeviceProxy = null;
        if (this._emitTimeoutID)
            GLib.source_remove(this._emitTimeoutID);
        this._emitTimeoutID = null;
        if (this._profileSignalId)
            this._profileManager.disconnect(this._profileSignalId);
        this._profileSignalId = null;
        if (this._registrationId > 0) {
            this._connection.unregister_object(this._registrationId);
            this._registrationId = 0;
        }
    }
});


const BluetoothBatteryMeterManager = GObject.registerClass(
class BluetoothBatteryMeterManager extends GObject.Object {
    _init(loop, systemBus) {
        super._init();
        const tag = 'BluetoothBatteryMeterManager';
        this._log = createLogger(tag);
        this._log.info('-------- INIT SCRIPT --------');
        this.loop = loop;
        this._systemBus = systemBus;
        this._deviceMap = new Map();
        this._ownNameId = 0;
        this._connection = null;
        this._emptyTimerId = null;
        this._profileManager = null;
        this._deviceProfiles = DeviceProfiles;

        const introspection = Gio.DBusNodeInfo.new_for_xml(MANAGER_INTROSPECTION_XML);
        this._ifaceInfo = introspection.lookup_interface(MANAGER_INTERFACE_NAME);

        try {
            this._ownNameId = Gio.bus_own_name(
                Gio.BusType.SESSION,
                BUS_NAME,
                Gio.BusNameOwnerFlags.NONE,
                this._onBusAcquired.bind(this),
                this._onNameAcquired.bind(this),
                this._onNameLost.bind(this)
            );
        } catch (e) {
            this._log.error(`Failed to register D-Bus object or initialize profile manager: ${e}`);
            this._log.info('-------- EXIT SCRIPT --------');
            this.loop.quit();
        }
    }

    _onBusAcquired(conn, name) {
        this._log.info(`Bus acquired: ${name}`);
        this._connection = conn;

        this._profileManager = new ProfileManager(this._systemBus);

        conn.register_object(
            OBJECT_PATH,
            this._ifaceInfo,
            this._onMethodCall.bind(this),
            this._onGetProperty.bind(this),
            null
        );
    }

    _onNameAcquired(conn, name) {
        this._log.info(`Name acquired: ${name}`);
    }

    _onNameLost(conn, name) {
        this._log.info(`Name lost or already taken: ${name}`);
        this._log.info('-------- EXIT SCRIPT --------');
        this.loop.quit();
    }

    _onMethodCall(conn, sender, objectPath, ifaceName, methodName, parameters, invocation) {
        if (ifaceName !== MANAGER_INTERFACE_NAME)
            return;

        if (methodName === 'AddDevice') {
            const [devicePath, deviceType] = parameters.deep_unpack();
            this._log.info(`AddDevice called: ${devicePath}, ${deviceType}`);
            this._addDevice(devicePath, deviceType);
            invocation.return_value(null);
        } else if (methodName === 'ShutdownService') {
            this._log.info('Shutdown requested.');
            invocation.return_value(null);
            this.destroy();
        }
    }

    _onGetProperty(conn, sender, objectPath, ifaceName, propertyName) {
        if (propertyName === 'Version')
            return new GLib.Variant('s', SCRIPT_VERSION);
        return null;
    }

    _addDevice(devicePath, deviceType) {
        if (this._deviceMap.has(devicePath))
            return;
        let device = null;
        this._deviceMap.set(devicePath, {deviceType, device});
        if (this._emptyTimerId)
            GLib.source_remove(this._emptyTimerId);

        device = new Device(this, devicePath, deviceType);
        this._deviceMap.set(devicePath, {deviceType, device});
    }

    removeDevice(devicePath) {
        this._log.info(`Removing device called: ${devicePath}`);
        if (this._deviceMap.has(devicePath)) {
            const {deviceType, device} = this._deviceMap.get(devicePath);
            device?.destroy?.();
            this._deviceMap.delete(devicePath);
            this._connection.emit_signal(
                null,
                devicePath,
                MANAGER_INTERFACE_NAME,
                'DeviceRemoved',
                new GLib.Variant('(s)', [devicePath])
            );

            this._profileManager.deleteFD(devicePath);

            let lastDeviceType = true;
            for (const entry of this._deviceMap.values()) {
                if (entry.deviceType === deviceType) {
                    lastDeviceType = false;
                    break;
                }
            }

            if (lastDeviceType)
                this._profileManager.unregisterProfile(deviceType);
        }
        if (this._deviceMap.size === 0) {
            if (this._emptyTimerId)
                GLib.source_remove(this._emptyTimerId);
            this._emptyTimerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 20, () => {
                this._log.info('No devices left. Exiting script');
                this.destroy();
                this._emptyTimerId = null;
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    destroy() {
        if (this._emptyTimerId)
            GLib.source_remove(this._emptyTimerId);
        this._emptyTimerId = null;

        for (const devicePath of [...this._deviceMap.keys()])
            this.removeDevice(devicePath);

        if (this._ownNameId > 0)
            Gio.bus_unown_name(this._ownNameId);
        this._ownNameId = 0;

        this._log.info('-------- EXIT SCRIPT --------');
        this.loop.quit();
    }
});

function main() {
    print('gjs script is service for Gnome extension Bluetooth Battery Meter');
    print(`Logs are stored in ${LOG_PATH}`);
    print('To view realtime logs use:\n');
    print(`tail -f ${LOG_PATH}\n`);

    const loop = new GLib.MainLoop(null, false);
    const systemBus = Gio.bus_get_sync(Gio.BusType.SYSTEM, null);
    loop._manager = new BluetoothBatteryMeterManager(loop, systemBus);

    const requestExitCb = () => {
        loop._manager.destroy();
    };

    if (SHUTDOWN_WHEN_EXTENSION_DISABLED)
        loop._monitorExtension = new MonitorExtensionState(requestExitCb);


    loop.run();
}

main();

