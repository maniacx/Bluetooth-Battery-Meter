import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

const BluezDeviceInterface = `
<node>
  <interface name="org.bluez.Device1">
    <property name="Connected" type="b" access="read"/>
    <property name="Address" type="s" access="read"/>
    <property name="Modalias" type="s" access="read"/>
    <property name="Name" type="s" access="read"/>
    <property name="ServicesResolved" type="b" access="read"/>
    <property name="UUIDs" type="as" access="read"/>
  </interface>
</node>`;

const BluezDeviceProxy = Gio.DBusProxy.makeProxyWrapper(BluezDeviceInterface);

export function getBluezDeviceProxy(path) {
    return  new BluezDeviceProxy(Gio.DBus.system, 'org.bluez', path);
}

export function getBluezDevicePropertiesAsync(path, callback) {
    Gio.DBus.system.call(
        'org.bluez', path, 'org.freedesktop.DBus.Properties', 'GetAll',
        new GLib.Variant('(s)', ['org.bluez.Device1']), null,
        Gio.DBusCallFlags.NONE, -1, null,
        (connection, result) => {
            try {
                const [properties] = connection.call_finish(result).deepUnpack();
                // GetAll returns a{sv}; unpack values for JavaScript device detectors.
                callback(Object.fromEntries(Object.entries(properties).map(([key, value]) =>
                    [key, value.deepUnpack()])), null);
            } catch (error) {
                callback(null, error);
            }
        }
    );
}
