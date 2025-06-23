import Gio from 'gi://Gio';

const BluezDeviceInterface = `
<node>
  <interface name="org.bluez.Device1">
    <property name="Connected" type="b" access="read"/>
    <property name="Modalias" type="s" access="read"/>
    <property name="ServicesResolved" type="b" access="read"/>
    <property name="UUIDs" type="as" access="read"/>
  </interface>
</node>`;

const BluezDeviceProxy = Gio.DBusProxy.makeProxyWrapper(BluezDeviceInterface);

export function getBluezDeviceProxy(path) {
    return  new BluezDeviceProxy(Gio.DBus.system, 'org.bluez', path);
}
