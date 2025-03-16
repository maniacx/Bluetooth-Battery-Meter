'use strict';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {ngettext} from 'resource:///org/gnome/shell/extensions/extension.js';

import {BluetoothIndicator} from './bluetoothIndicator.js';
import {BluetoothDeviceItem} from './bluetoothPopupMenu.js';
import {UpowerClient} from './upowerIndicator.js';
import {supportedIcons} from './vectorImages.js';

const QuickSettingsMenu = Main.panel.statusArea.quickSettings;

export const BluetoothBatteryMeter = GObject.registerClass({
}, class BluetoothBatteryMeter extends GObject.Object {
    constructor(settings, extensionPath) {
        super();
        this._extensionPath = extensionPath;
        this._settings = settings;

        this._idleTimerId = GLib.idle_add(GLib.PRIORITY_LOW, () => {
            if (!Main.panel.statusArea.quickSettings._bluetooth &&
                Main.panel.statusArea.quickSettings._bluetooth.quickSettingsItems[0]._box.get_first_child().get_stage())
                return GLib.SOURCE_CONTINUE;
            this._bluetoothToggle = Main.panel.statusArea.quickSettings._bluetooth.quickSettingsItems[0];
            this._startBluetoothToggle();
            this._idleTimerId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    _startBluetoothToggle() {
        this._deviceItems = new Map();
        this._deviceIndicators = new Map();
        this._deviceList = new Map();
        this._removedDeviceList = [];
        this._colorsAssigned = false;
        this._connectedColor = '#8fbbf0';
        this._disconnectedColor = '#ffffff';
        this._pullDevicesFromGsetting();
        this._showBatteryPercentage = this._settings.get_boolean('enable-battery-level-text');
        this._showBatteryIcon = this._settings.get_boolean('enable-battery-level-icon');
        this._swapIconText = this._settings.get_boolean('swap-icon-text');
        this._sortDevicesByHistory = this._settings.get_boolean('sort-devices-by-history');
        this._hideBluetoothIndicator = this._settings.get_int('hide-bluetooth-indicator');
        this._widgetInfo = {
            levelIndicatorType: this._settings.get_int('level-indicator-type'),
            levelIndicatorColor: this._settings.get_int('level-indicator-color'),
            color100: this._settings.get_string('color-100'),
            color90: this._settings.get_string('color-90'),
            color80: this._settings.get_string('color-80'),
            color70: this._settings.get_string('color-70'),
            color60: this._settings.get_string('color-60'),
            color50: this._settings.get_string('color-50'),
            color40: this._settings.get_string('color-40'),
            color30: this._settings.get_string('color-30'),
            color20: this._settings.get_string('color-20'),
            color10: this._settings.get_string('color-10'),
        };


        this._originalSync = this._bluetoothToggle._sync;
        this._bluetoothToggle._sync = () => {
            this._sync();
        };
        this._originalRemoveDevice = this._bluetoothToggle._removeDevice;
        this._bluetoothToggle._removeDevice = path => {
            this._removeDevice(path);
        };
        this._originalOnActiveChanged = this._bluetoothToggle._onActiveChanged;
        this._bluetoothToggle._onActiveChanged = () => {
            this._onActiveChanged();
        };
        this._originalReorderDeviceItems = this._bluetoothToggle._reorderDeviceItems;
        this._bluetoothToggle._reorderDeviceItems = () => {
            this._reorderDeviceItems();
        };

        this._originalBluetoothIndicatorSync = QuickSettingsMenu._bluetooth._sync;
        QuickSettingsMenu._bluetooth._sync = () => {};

        this._themeContext = St.ThemeContext.get_for_stage(global.stage);
        this._themeContext.connectObject('changed', () => {
            this._colorsAssigned = false;
            this._destroyIndicators();
            this._onActiveChanged();
        }, this);

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
            'changed::sort-devices-by-history', () => {
                this._sortDevicesByHistory = this._settings.get_boolean('sort-devices-by-history');
                this._onActiveChanged();
            },
            'changed::hide-bluetooth-indicator', () => {
                this._hideBluetoothIndicator = this._settings.get_int('hide-bluetooth-indicator');
                this._sync();
            },
            'changed::level-indicator-type', () => {
                this._widgetInfo.levelIndicatorType = this._settings.get_int('level-indicator-type');
                this._destroyIndicators();
                this._sync();
                this._reloadUpowerIndicator();
            },
            'changed::level-indicator-color', () => {
                this._widgetInfo.levelIndicatorColor = this._settings.get_int('level-indicator-color');
                this._destroyIndicators();
                this._sync();
                this._reloadUpowerIndicator();
            },
            'changed::color-100', () => {
                this._widgetInfo.color100 = this._settings.get_string('color-100');
                this._destroyIndicators();
                this._sync();
                this._reloadUpowerIndicator();
            },
            'changed::color-90', () => {
                this._widgetInfo.color90 = this._settings.get_string('color-90');
                this._destroyIndicators();
                this._sync();
                this._reloadUpowerIndicator();
            },
            'changed::color-80', () => {
                this._widgetInfo.color80 = this._settings.get_string('color-80');
                this._destroyIndicators();
                this._sync();
                this._reloadUpowerIndicator();
            },
            'changed::color-70', () => {
                this._widgetInfo.color70 = this._settings.get_string('color-70');
                this._destroyIndicators();
                this._sync();
                this._reloadUpowerIndicator();
            },
            'changed::color-60', () => {
                this._widgetInfo.color60 = this._settings.get_string('color-60');
                this._destroyIndicators();
                this._sync();
                this._reloadUpowerIndicator();
            },
            'changed::color-50', () => {
                this._widgetInfo.color50 = this._settings.get_string('color-50');
                this._destroyIndicators();
                this._sync();
                this._reloadUpowerIndicator();
            },
            'changed::color-40', () => {
                this._widgetInfo.color40 = this._settings.get_string('color-40');
                this._destroyIndicators();
                this._sync();
                this._reloadUpowerIndicator();
            },
            'changed::color-30', () => {
                this._widgetInfo.color30 = this._settings.get_string('color-30');
                this._destroyIndicators();
                this._sync();
                this._reloadUpowerIndicator();
            },
            'changed::color-20', () => {
                this._widgetInfo.color20 = this._settings.get_string('color-20');
                this._destroyIndicators();
                this._sync();
                this._reloadUpowerIndicator();
            },
            'changed::color-10', () => {
                this._widgetInfo.color10 = this._settings.get_string('color-10');
                this._destroyIndicators();
                this._sync();
                this._reloadUpowerIndicator();
            },
            'changed::enable-upower-level-icon', () => {
                this._upowerEnabled = this._settings.get_boolean('enable-upower-level-icon');
                if (this._upowerEnabled) {
                    this._upowerClient = new UpowerClient(this._settings, this._widgetInfo);
                } else {
                    this._upowerClient?.destroy();
                    this._upowerClient = null;
                }
            },
            this
        );
        this._bluetoothToggle._deviceItems.forEach(item => {
            item.destroy();
        });
        this._bluetoothToggle._deviceItems.clear();

        this._connectSettingsSignal(true);
        this._onActiveChanged();

        this._upowerEnabled = this._settings.get_boolean('enable-upower-level-icon');
        if (this._upowerEnabled)
            this._upowerClient = new UpowerClient(this._settings, this._widgetInfo);
    }

    _reloadUpowerIndicator() {
        if (this._upowerEnabled) {
            this._upowerClient?.destroy();
            this._upowerClient = new UpowerClient(this._settings, this._widgetInfo);
        }
    }

    _connectSettingsSignal(connect) {
        if (connect) {
            this._settingSignalId = this._settings.connect('changed::device-list', () => {
                this._pullDevicesFromGsetting();
                this._destroyIndicators();
                this._sync();
            });
        } else if (this._settingSignalId) {
            this._settings.disconnect(this._settingSignalId);
            this._settingSignalId = null;
        }
    }

    _reorderDeviceItems() {
        const devices = this._sortDevicesByHistory ? this._getRecencySortedDevices() : this._bluetoothToggle._getSortedDevices();
        for (const [i, dev] of devices.entries()) {
            const item = this._deviceItems.get(dev.get_object_path());
            if (!item)
                continue;

            this._bluetoothToggle._deviceSection.moveMenuItem(item, i);
        }
    }

    _removeDevice(path) {
        this._removedDeviceList.push(path);
        if (this._deviceList.has(path)) {
            const props = this._deviceList.get(path);
            props.paired = false;
            this._deviceList.set(path, props);
            this._pushDevicesToGsetting();
        }
        this._deviceItems.get(path)?.destroy();
        this._deviceItems.delete(path);
        this._deviceIndicators.get(path)?.destroy();
        this._deviceIndicators.delete(path);
        this._updateDeviceVisibility();
    }

    _updateDeviceVisibility() {
        this._bluetoothToggle._deviceSection.actor.visible =
            [...this._deviceItems.values()].some(item => item.visible);
    }

    _onActiveChanged() {
        if (!this._colorsAssigned && this._bluetoothToggle.checked) {
            this._getColor();
        } else {
            this._bluetoothToggle._updatePlaceholder();
            this._deviceItems.forEach(item => item.destroy());
            this._deviceItems.clear();
            this._sync();
        }
    }

    _getRecencySortedDevices() {
        const devices = this._bluetoothToggle._getSortedDevices();
        const connectedDevices = [];
        const disconnectedDevices = [];

        devices.forEach(device => {
            const path = device.get_object_path();
            const props = this._deviceList.get(path);
            if (device.connected) {
                connectedDevices.push({
                    device,
                    time: props?.connectedTime || 0,
                });
            } else {
                disconnectedDevices.push({
                    device,
                    time: props?.disconnectedTime || 0,
                });
            }
        });
        connectedDevices.sort((a, b) => b.time - a.time);
        disconnectedDevices.sort((a, b) => b.time - a.time);
        return [...connectedDevices.map(item => item.device), ...disconnectedDevices.map(item => item.device)];
    }

    _pullDevicesFromGsetting() {
        this._deviceList.clear();
        const deviceList = this._settings.get_strv('device-list');
        if (deviceList.length !== 0) {
            for (const jsonString of deviceList) {
                const item = JSON.parse(jsonString);
                const path = item.path;
                const props = {
                    'icon': item['icon'],
                    'alias': item['alias'],
                    'paired': item['paired'],
                    'batteryReported': item['battery-reported'],
                    'qsLevelEnabled': item['qs-level'],
                    'indicatorMode': item['indicator-mode'],
                    'connectedTime': item['connected-time'] || 0,
                    'disconnectedTime': item['disconnected-time'] || 0,
                };
                this._deviceList.set(path, props);
            }
        }
    }

    _pushDevicesToGsetting() {
        const deviceList = [];
        for (const [path, props] of this._deviceList) {
            const item = {
                path,
                'icon': props.icon,
                'alias': props.alias,
                'paired': props.paired,
                'battery-reported': props.batteryReported,
                'qs-level': props.qsLevelEnabled,
                'indicator-mode': props.indicatorMode,
                'connected-time': props.connectedTime,
                'disconnected-time': props.disconnectedTime,
            };
            deviceList.push(JSON.stringify(item));
        }
        this._connectSettingsSignal(false);
        this._settings.set_strv('device-list', deviceList);
        this._connectSettingsSignal(true);
        this._sync();
    }

    _addNewDeviceToList(device, reported) {
        const currentTime = GLib.DateTime.new_now_utc().to_unix();
        const path = device.get_object_path();
        const props = {
            icon: device.icon,
            alias: device.alias,
            paired: device.paired,
            batteryReported: reported,
            qsLevelEnabled: reported,
            indicatorMode: reported ? 2 : 0,
            connectedTime: currentTime,
            disconnectedTime: currentTime,
        };
        this._deviceList.set(path, props);
        this._delayedUpdateDeviceGsettings();
    }

    _delayedUpdateDeviceGsettings() {
        if (this._delayedTimerId)
            GLib.source_remove(this._delayedTimerId);
        this._delayedTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
            this._pushDevicesToGsetting();
            this._delayedTimerId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    _sync() {
        const devices = this._sortDevicesByHistory ? this._getRecencySortedDevices() : this._bluetoothToggle._getSortedDevices();
        if (this._removedDeviceList.length > 0) {
            const pathsInDevices = new Set(devices.map(dev => dev.get_object_path()));
            this._removedDeviceList = this._removedDeviceList.filter(path => pathsInDevices.has(path));
        }

        for (const dev of devices) {
            const path = dev.get_object_path();
            if (this._deviceItems.has(path)) {
                if (this._deviceList.has(path)) {
                    const item = this._deviceItems.get(path);
                    item.updateProps(this._deviceList.get(path).qsLevelEnabled, this._deviceList.get(path).icon);
                }
                continue;
            }
            if (this._removedDeviceList.length > 0) {
                const pathIndex = this._removedDeviceList.indexOf(path);
                if (pathIndex > -1) {
                    if (dev.connected)
                        this._removedDeviceList.splice(pathIndex, 1);
                    else
                        continue;
                }
            }

            let props = {};
            let deviceIcon;
            if (this._deviceList.has(path)) {
                let updateGsettingPairedList = false;
                props = this._deviceList.get(path);
                if (props.alias !== dev.alias) {
                    props.alias = dev.alias;
                    updateGsettingPairedList = true;
                }
                if (props.paired !== dev.paired) {
                    props.paired = dev.paired;
                    updateGsettingPairedList = true;
                }
                if (props.batteryReported !== true && dev.battery_percentage > 0) {
                    props.batteryReported = true;
                    props.qsLevelEnabled = true;
                    props.indicatorMode = 2;
                    updateGsettingPairedList = true;
                }
                if (updateGsettingPairedList) {
                    this._deviceList.set(path, props);
                    this._delayedUpdateDeviceGsettings();
                }
                deviceIcon = props.icon;
            } else {
                deviceIcon = supportedIcons.includes(dev.icon) ? dev.icon : 'bluetooth';
                this._addNewDeviceToList(dev, dev.battery_percentage > 0);
            }

            const qsLevelEnabled = props.batteryReported ? this._deviceList.get(path).qsLevelEnabled : false;

            const item = new BluetoothDeviceItem(this, dev, props.batteryReported, qsLevelEnabled, deviceIcon);
            item.connect('notify::visible', () => this._updateDeviceVisibility());
            this._bluetoothToggle._deviceSection.addMenuItem(item);
            this._deviceItems.set(path, item);
        }

        if (this._settings.get_boolean('enable-battery-indicator')) {
            for (const dev of devices) {
                const path = dev.get_object_path();
                if (this._deviceIndicators.has(path)) {
                    if (!dev.connected || this._deviceList.get(path).indicatorMode === 0) {
                        this._deviceIndicators.get(path)?.destroy();
                        this._deviceIndicators.delete(path);
                    }
                    continue;
                }
                if (!dev.connected)
                    continue;
                if (this._deviceList.has(path)) {
                    const props = this._deviceList.get(path);
                    if (props.indicatorMode > 0) {
                        const indicator = new BluetoothIndicator(this._settings, dev, props.indicatorMode, props.icon, this._widgetInfo);
                        QuickSettingsMenu.addExternalIndicator(indicator);
                        this._deviceIndicators.set(path, indicator);
                    }
                }
            }
        }

        const connectedDevices = devices.filter(dev => dev.connected);
        const nConnected = connectedDevices.length;

        if (nConnected > 1)
            this._bluetoothToggle.subtitle = ngettext('%d Connected', '%d Connected', nConnected).format(nConnected);
        else if (nConnected === 1)
            this._bluetoothToggle.subtitle = connectedDevices[0].alias;
        else
            this._bluetoothToggle.subtitle = null;

        this._updateDeviceVisibility();

        if (this._hideBluetoothIndicator === 2)
            QuickSettingsMenu._bluetooth._indicator.visible = this._deviceIndicators.size < 1 && nConnected > 0;
        else if (this._hideBluetoothIndicator === 1)
            QuickSettingsMenu._bluetooth._indicator.visible = false;
        else
            QuickSettingsMenu._bluetooth._indicator.visible = nConnected > 0;
    }

    _getColor() {
        const toggleButton = this._bluetoothToggle._box.get_first_child();
        const accentRGB = toggleButton.get_theme_node().get_background_color();
        const panelBackgroundRGB = Main.panel.statusArea.quickSettings.menu.box.get_theme_node().get_background_color();
        const panelForegroundRGB = Main.panel.statusArea.quickSettings.menu.box.get_theme_node().get_foreground_color();
        const panelBackgroundLuminance = rgbToHsl(panelBackgroundRGB.red, panelBackgroundRGB.green, panelBackgroundRGB.blue).l;
        const adjustLuminanceFactor = panelBackgroundLuminance < 40 ? 20 : -10;
        const accentHSL =  rgbToHsl(accentRGB.red, accentRGB.green, accentRGB.blue);
        const accentLuminanceAdjusted = accentHSL.l + adjustLuminanceFactor;
        this._connectedColor = hslToRgbHex(accentHSL.h, accentHSL.s, accentLuminanceAdjusted);
        this._disconnectedColor = panelForegroundRGB.to_string().substring(0, 7);
        this._colorsAssigned = true;
        this._onActiveChanged();
    }

    _destroyIndicators() {
        if (this._deviceIndicators) {
            this._deviceIndicators.forEach(indicator => indicator?.destroy());
            this._deviceIndicators.clear();
        }
    }

    _destroyPopupMenuItems() {
        if (this._deviceItems) {
            this._deviceItems.forEach(item => item.destroy());
            this._deviceItems.clear();
        }
    }

    destroy() {
        if (this._idleTimerId)
            GLib.source_remove(this._idleTimerId);
        this._idleTimerId = null;
        if (this._delayedTimerId)
            GLib.source_remove(this._delayedTimerId);
        this._delayedTimerId = null;
        if (this._themeContext)
            this._themeContext.disconnectObject(this);
        if (this._settings)
            this._settings.disconnectObject(this);
        this._connectSettingsSignal(false);
        this._upowerClient?.destroy();
        this._upowerClient = null;
        if (this._bluetoothToggle && this._originalRemoveDevice)
            this._bluetoothToggle._removeDevice = this._originalRemoveDevice;
        this._originalRemoveDevice = null;
        if (this._bluetoothToggle && this._originalReorderDeviceItems)
            this._bluetoothToggle._reorderDeviceItems = this._originalReorderDeviceItems;
        this._originalReorderDeviceItems = null;
        if (this._bluetoothToggle && this._originalSync)
            this._bluetoothToggle._sync = this._originalSync;
        this._originalSync = null;
        if (this._bluetoothToggle && this._originalOnActiveChanged)
            this._bluetoothToggle._onActiveChanged = this._originalOnActiveChanged;
        this._originalOnActiveChanged = null;
        if (QuickSettingsMenu._bluetooth && this._originalBluetoothIndicatorSync)
            QuickSettingsMenu._bluetooth._sync = this._originalBluetoothIndicatorSync;
        this._originalBluetoothIndicatorSync = null;
        this._destroyIndicators();
        this._deviceIndicators = null;
        this._destroyPopupMenuItems();
        this._deviceItems = null;
        this._deviceList = null;
        this._themeContext = null;
        this._settings = null;
        this._bluetoothToggle?._onActiveChanged();
    }
});

function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const delta = max - min;
        s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
        switch (max) {
            case r:
                h = (g - b) / delta + (g < b ? 6 : 0);
                break;
            case g:
                h = (b - r) / delta + 2;
                break;
            case b:
                h = (r - g) / delta + 4;
                break;
        }
        h /= 6;
    }
    return {
        h: h * 360,
        s: s * 100,
        l: l * 100,
    };
}

function hslToRgbHex(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0)
                t += 1;
            if (t > 1)
                t -= 1;
            if (t < 1 / 6)
                return p + (q - p) * 6 * t;
            if (t < 1 / 2)
                return q;
            if (t < 2 / 3)
                return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    const hex = `#${((1 << 24) + (Math.round(r * 255) << 16) + (Math.round(g * 255) << 8) + Math.round(b * 255)).toString(16).slice(1)}`;
    return hex;
}
