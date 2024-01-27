'use strict';
const {Gio, GLib, GObject, Pango, GnomeBluetooth} = imports.gi;
const PopupMenu = imports.ui.popupMenu;
const QuickSettings = imports.ui.quickSettings;
const Main = imports.ui.main;
const Config = imports.misc.config;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const {BluetoothIndicator} = Me.imports.lib.bluetoothIndicator;
const {BluetoothDeviceItem} = Me.imports.lib.bluetoothPopupMenu;

const gettextDomain = Me.metadata['gettext-domain'];
const Gettext = imports.gettext.domain(gettextDomain);
const _ = Gettext.gettext;
const ngettext = Gettext.ngettext;

const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion44 = Number.parseInt(major) === 44;

const {AdapterState} = GnomeBluetooth;
const QuickSettingsMenu = Main.panel.statusArea.quickSettings;
const supportedIcons = ['audio-speakers', 'audio-headphones', 'audio-headset', 'input-gaming', 'input-keyboard', 'input-mouse', 'input-tablet'];

Gio._promisify(GnomeBluetooth.Client.prototype, 'connect_service');

var BluetoothBatteryMeter = GObject.registerClass({
}, class BluetoothBatteryMeter extends GObject.Object {
    constructor(extensionObj, settings) {
        super();
        this._extensionObj = extensionObj;
        this._settings = settings;

        this._idleTimerId = GLib.idle_add(GLib.PRIORITY_LOW, () => {
            if (!Main.panel.statusArea.quickSettings._bluetooth)
                return GLib.SOURCE_CONTINUE;
            this._startToggle();
            return GLib.SOURCE_REMOVE;
        });
    }

    _startToggle() {
        this._idleTimerId = null;
        this._indicator = Main.panel.statusArea.quickSettings._bluetooth;
        this._originalBluetoothToggle = this._indicator.quickSettingsItems[0];
        if (shellVersion44)
            this._originalBluetoothToggle._client.disconnectObject(this._originalBluetoothToggle);
        this._bluetoothToggle = new BluetoothToggle(this._indicator._client, this._settings, this._extensionObj);
        this._indicator.quickSettingsItems = [this._bluetoothToggle];
        QuickSettingsMenu.menu.addItem(this._bluetoothToggle);
        QuickSettingsMenu.menu._grid.set_child_below_sibling(this._bluetoothToggle, this._originalBluetoothToggle);
        QuickSettingsMenu.menu._grid.remove_child(this._originalBluetoothToggle);
    }

    destroy() {
        if (this._idleTimerId)
            GLib.source_remove(this._idleTimerId);
        this._idleTimerId = null;
        if (this._originalBluetoothToggle && this._bluetoothToggle) {
            this._bluetoothToggle.destroy();
            this._indicator.quickSettingsItems = [this._originalBluetoothToggle];
            QuickSettingsMenu.menu.addItem(this._originalBluetoothToggle);
            QuickSettingsMenu.menu._grid.set_child_below_sibling(this._originalBluetoothToggle, this._bluetoothToggle);
            QuickSettingsMenu.menu._grid.remove_child(this._bluetoothToggle);
            if (shellVersion44) {
                if (this._originalBluetoothToggle._client) {
                    this._originalBluetoothToggle._client.connectObject(
                        'notify::active', () => this._originalBluetoothToggle._onActiveChanged(),
                        'devices-changed', () => this._originalBluetoothToggle._sync(),
                        'device-removed', (c, path) => this._originalBluetoothToggle._removeDevice(path),
                        this._originalBluetoothToggle);
                }
                this._originalBluetoothToggle._onActiveChanged();
            }
        }
        this._bluetoothToggle = null;
        this._settings = null;
    }
});

const BluetoothToggle = GObject.registerClass(
class BluetoothToggle extends QuickSettings.QuickMenuToggle {
    _init(client, settings, extensionObj) {
        super._init();
        if (shellVersion44)
            this.title = _('Bluetooth');
        else
            this.label = _('Bluetooth');
        this._settings = settings;
        this._extensionObj = extensionObj;
        this._showBatteryPercentage = this._settings.get_boolean('enable-battery-level-text');
        this._showBatteryIcon = this._settings.get_boolean('enable-battery-level-icon');
        this._swapIconText = this._settings.get_boolean('swap-icon-text');

        this._client = client;
        this.menu.setHeader('bluetooth-active-symbolic', _('Bluetooth'));
        this._deviceIndicators = new Map();
        this._removedDeviceList = [];
        this._deviceItems = new Map();
        this._deviceSection = new PopupMenu.PopupMenuSection();
        this.menu.addMenuItem(this._deviceSection);
        this._placeholderItem = new PopupMenu.PopupMenuItem('', {
            reactive: false,
            can_focus: false,
        });
        this._placeholderItem.label.clutter_text.set({
            ellipsize: Pango.EllipsizeMode.NONE,
            line_wrap: true,
        });

        this._placeholderItem.add_style_class_name('bbm-bt-menu-placeholder');
        this._placeholderItem.label.add_style_class_name('bbm-bt-menu-placeholder-label');

        this.menu.addMenuItem(this._placeholderItem);
        this._placeholderItem.setOrnament(PopupMenu.Ornament.HIDDEN);
        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
        this.menu.addSettingsAction(_('Bluetooth Settings'),
            'gnome-bluetooth-panel.desktop');

        this._deviceSection.actor.bind_property('visible',
            this._placeholderItem, 'visible',
            GObject.BindingFlags.SYNC_CREATE |
            GObject.BindingFlags.INVERT_BOOLEAN);

        this._client.bind_property('available',
            this, 'visible',
            GObject.BindingFlags.SYNC_CREATE);

        this._client.bind_property('active',
            this, 'checked',
            GObject.BindingFlags.SYNC_CREATE);

        this._client.bind_property_full('adapter-state',
            this, 'icon-name',
            GObject.BindingFlags.SYNC_CREATE,
            (bind, source) => [true, this._getIconNameFromState(source)],
            null);

        this._client.connectObject(
            'notify::active', () => this._onActiveChanged(),
            'devices-changed', () => this._sync(),
            this);

        if (shellVersion44) {
            this._client.connectObject(
                'device-removed', (c, path) => this._removeDevice(path),
                this);
        }

        this.menu.connectObject('open-state-changed', isOpen => {
            if (isOpen)
                this._reorderDeviceItems();
        });

        this.connectObject('clicked', () => this._client.toggleActive());

        this._desktopSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.interface'});
        this._desktopSettings.connectObject(
            'changed::text-scaling-factor', () => {
                this._onActiveChanged();
            },
            this
        );

        this._settings.connectObject(
            'changed::enable-battery-indicator', () => {
                if (this._settings.get_boolean('enable-battery-indicator'))
                    this._sync();
                else
                    this._destroyIndicators();
            },
            'changed::enable-battery-level-text', () => {
                this._showBatteryPercentage = this._settings.get_boolean('enable-battery-level-text');
                this._onActiveChanged();
            },
            'changed::enable-battery-level-icon', () => {
                this._showBatteryIcon = this._settings.get_boolean('enable-battery-level-icon');
                this._onActiveChanged();
            },
            'changed::swap-icon-text', () => {
                this._swapIconText = this._settings.get_boolean('swap-icon-text');
                this._onActiveChanged();
            },
            this
        );

        if (!shellVersion44) {
            this._client.toggleDevice = async device => {
                await this._toggleDevice(device);
            };
            this._client._client.connectObject(
                'device-removed', (c, path) => this._removeDevice(path),
                this);
        }

        this._updatePlaceholder();
        this._sync();
    }

    async _toggleDevice(device) {
        const connect = !device.connected;
        console.debug(`${connect
            ? 'Connect' : 'Disconnect'} device "${device.name}"`);

        try {
            await this._client._client.connect_service(
                device.get_object_path(),
                connect,
                null);
            log(`Device "${device.name}" ${
                connect ? 'connected' : 'disconnected'}`);
        } catch (e) {
            log(`Failed to ${connect
                ? 'connect' : 'disconnect'} device "${device.name}": ${e.message}`);
        }
    }

    _onActiveChanged() {
        this._updatePlaceholder();

        this._deviceItems.forEach(item => item.destroy());
        this._deviceItems.clear();

        this._sync();
    }

    _updatePlaceholder() {
        this._placeholderItem.label.text = this._client.active
            ? _('No available or connected devices')
            : _('Turn on Bluetooth to connect to devices');
    }

    _updateDeviceVisibility() {
        this._deviceSection.actor.visible =
            [...this._deviceItems.values()].some(item => item.visible);
    }

    _getSortedDevices() {
        return [...this._client.getDevices()].sort((dev1, dev2) => {
            if (dev1.connected !== dev2.connected)
                return dev2.connected - dev1.connected;
            return dev1.alias.localeCompare(dev2.alias);
        });
    }

    _removeDevice(path) {
        this._deviceItems.get(path)?.destroy();
        this._deviceItems.delete(path);
        this._deviceIndicators.get(path)?.destroy();
        this._deviceIndicators.delete(path);
        this._removedDeviceList.push(path);

        this._updateDeviceVisibility();
    }

    _reorderDeviceItems() {
        const devices = this._getSortedDevices();
        for (const [i, dev] of devices.entries()) {
            const item = this._deviceItems.get(dev.get_object_path());
            if (!item)
                continue;

            this._deviceSection.moveMenuItem(item, i);
        }
    }

    _sync() {
        if (!shellVersion44 && !this._client.active) {
            this._updateDeviceVisibility();
            return;
        }
        const devices = this._getSortedDevices();
        if (this._removedDeviceList.length > 0) {
            const pathsInDevices = new Set(devices.map(dev => dev.get_object_path()));
            this._removedDeviceList = this._removedDeviceList.filter(path => pathsInDevices.has(path));
        }

        for (const dev of devices) {
            const path = dev.get_object_path();
            if (this._deviceItems.has(path))
                continue;
            if (this._removedDeviceList.length > 0) {
                const pathIndex = this._removedDeviceList.indexOf(path);
                if (pathIndex > -1) {
                    if (dev.connected)
                        this._removedDeviceList.splice(pathIndex, 1);
                    else
                        continue;
                }
            }

            const item = new BluetoothDeviceItem(dev, this._client, this._extensionObj,
                supportedIcons, this._showBatteryPercentage, this._showBatteryIcon, this._swapIconText);
            item.connect('notify::visible', () => this._updateDeviceVisibility());
            this._deviceSection.addMenuItem(item);
            this._deviceItems.set(path, item);
        }

        if (this._settings.get_boolean('enable-battery-indicator')) {
            for (const dev of devices) {
                const path = dev.get_object_path();
                if (this._deviceIndicators.has(path)) {
                    if (!dev.connected) {
                        this._deviceIndicators.get(path)?.destroy();
                        this._deviceIndicators.delete(path);
                    }
                    continue;
                }
                if (!dev.connected)
                    continue;
                if (!supportedIcons.includes(dev.icon))
                    continue;
                const indicator = new BluetoothIndicator(dev, this._extensionObj, this._settings);
                this._deviceIndicators.set(path, indicator);
            }
        }

        if (shellVersion44) {
            const connectedDevices = devices.filter(dev => dev.connected);
            const nConnected = connectedDevices.length;

            if (nConnected > 1)
                this.subtitle = ngettext('%d Connected', '%d Connected', nConnected).format(nConnected);
            else if (nConnected === 1)
                this.subtitle = connectedDevices[0].alias;
            else
                this.subtitle = null;
        }
        this._updateDeviceVisibility();
    }

    _getIconNameFromState(state) {
        switch (state) {
            case AdapterState.ON:
                return 'bluetooth-active-symbolic';
            case AdapterState.OFF:
            case AdapterState.ABSENT:
                return 'bluetooth-disabled-symbolic';
            case AdapterState.TURNING_ON:
            case AdapterState.TURNING_OFF:
                return 'bluetooth-acquiring-symbolic';
            default:
                console.warn(`Unexpected state ${
                    GObject.enum_to_string(AdapterState, state)}`);
                return '';
        }
    }

    _destroyIndicators() {
        if (this._deviceIndicators) {
            this._deviceIndicators.forEach(indicator => indicator?.destroy());
            this._deviceIndicators.clear();
        }
    }

    destroy() {
        this._destroyIndicators();
        if (this._client)
            this._client.disconnectObject(this);
        if (this._desktopSettings)
            this._desktopSettings.disconnectObject(this);
        this._settings.disconnectObject(this);
        this._deviceIndicators = null;
        this._deviceItems = null;
        this._desktopSettings = null;
        this._settings = null;
    }
});

