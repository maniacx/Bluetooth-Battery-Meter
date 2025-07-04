'use strict';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {ngettext} from 'resource:///org/gnome/shell/extensions/extension.js';

import {EnhancedDeviceSupportManager} from './enhancedDeviceSupportManager.js';
import {DeviceWidgetManager} from './deviceWidgetManager.js';
import {PanelButton} from './panelButton.js';
import {UpowerClient} from './upower/upowerIndicator.js';
import {supportedIcons} from './widgets/indicatorVectorImages.js';

const QuickSettingsMenu = Main.panel.statusArea.quickSettings;
const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion = Number.parseInt(major);

export const BluetoothBatteryMeter = GObject.registerClass({
}, class BluetoothBatteryMeter extends GObject.Object {
    _init(settings, extensionPath, extuuid) {
        super._init();
        this._settings = settings;
        this._extensionPath = extensionPath;
        this._extuuid = extuuid;

        this._idleTimerId = GLib.idle_add(GLib.PRIORITY_LOW, () => {
            if (!Main.panel.statusArea.quickSettings._bluetooth &&
                Main.panel.statusArea.quickSettings._bluetooth.quickSettingsItems[0]
                    ._box.get_first_child().get_stage())
                return GLib.SOURCE_CONTINUE;

            this._bluetoothToggle = Main.panel.statusArea.quickSettings
                ._bluetooth.quickSettingsItems[0];
            this._startBluetoothToggle();
            this._idleTimerId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    _startBluetoothToggle() {
        this._syncRunning = false;
        this._syncPending = false;
        this._deviceItems = new Map();
        this.deviceList = new Map();
        this._colorsAssigned = false;
        this._enhancedDeviceConfigChanged = false;
        this.connectedColor = '#8fbbf0';
        this.disconnectedColor = '#ffffff';
        this._pullDevicesFromGsetting();
        this.gIcon = iconName => Gio.icon_new_for_string(
            `${this._extensionPath}/icons/hicolor/scalable/actions/${iconName}`);
        this.showBatteryPercentage = this._settings.get_boolean('enable-battery-level-text');
        this.showBatteryIcon = this._settings.get_boolean('enable-battery-level-icon');
        this.swapIconText = this._settings.get_boolean('swap-icon-text');
        this._sortDevicesByHistory = this._settings.get_boolean('sort-devices-by-history');
        this._bluetoothIndicatorEnabled = this._settings.get_boolean('enable-battery-indicator');
        this._hideBluetoothIndicator = this._settings.get_int('hide-bluetooth-indicator');
        this._enableEnhancedDeviceMode = this._settings.get_boolean('enable-enhanced-device-mode');
        this._enablePanelButton = this._settings.get_boolean('enable-panel-button-mode');
        this.airpodsEnabled = this._settings.get_boolean('enable-airpods-device');
        this.gattBasEnabled = this._settings.get_boolean('enable-gattbas-device');
        this._isUnlockSession = Main.sessionMode.currentMode === 'unlock-dialog';

        this._widgetInfo = {
            circleWidgetColor: this._settings.get_int('circle-widget-color'),
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
        this._bluetoothToggle._sync = () => {};
        this._bluetoothToggle._sync = () => {
            this.sync();
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
            this._onActiveChanged();
        }, this);

        this._settings.connectObject(
            'changed::enable-battery-indicator', () => {
                this._bluetoothIndicatorEnabled =
                    this._settings.get_boolean('enable-battery-indicator');
                this._onActiveChanged();
            },
            'changed::enable-battery-level-text', () => {
                this.showBatteryPercentage =
                    this._settings.get_boolean('enable-battery-level-text');
                this._onActiveChanged();
            },
            'changed::enable-battery-level-icon', () => {
                this.showBatteryIcon = this._settings.get_boolean('enable-battery-level-icon');
                this._onActiveChanged();
            },
            'changed::swap-icon-text', () => {
                this.swapIconText = this._settings.get_boolean('swap-icon-text');
                this._onActiveChanged();
            },
            'changed::sort-devices-by-history', () => {
                this._sortDevicesByHistory = this._settings.get_boolean('sort-devices-by-history');
                this._onActiveChanged();
            },
            'changed::hide-bluetooth-indicator', () => {
                this._hideBluetoothIndicator = this._settings.get_int('hide-bluetooth-indicator');
                this._onActiveChanged();
            },
            'changed::enable-enhanced-device-mode', () => {
                this._enableEnhancedDeviceMode =
                    this._settings.get_boolean('enable-enhanced-device-mode');
                this._setEnhancedDeviceMode();
                this._onActiveChanged();
            },
            'changed::enable-panel-button-mode', () => {
                this._enablePanelButton = this._settings.get_boolean('enable-panel-button-mode');
                this._setPanelButtonMode();
                this._onActiveChanged();
            },
            'changed::enable-airpods-device', () => {
                this.airpodsEnabled = this._settings.get_boolean('enable-airpods-device');
                this._enhancedDeviceConfigChanged = true;
                this._onActiveChanged();
            },
            'changed::enable-gattbas-device', () => {
                this.gattBasEnabled = this._settings.get_boolean('enable-gattbas-device');
                this._enhancedDeviceConfigChanged = true;
                this._onActiveChanged();
            },
            'changed::circle-widget-color', () => {
                this._widgetInfo.circleWidgetColor = this._settings.get_int('circle-widget-color');
                this._onActiveChanged();
            },
            'changed::level-indicator-type', () => {
                this._widgetInfo.levelIndicatorType =
                    this._settings.get_int('level-indicator-type');
                this._onActiveChanged();
                this._reloadUpowerIndicator();
            },
            'changed::level-indicator-color', () => {
                this._widgetInfo.levelIndicatorColor =
                    this._settings.get_int('level-indicator-color');
                this._onActiveChanged();
                this._reloadUpowerIndicator();
            },
            'changed::color-100', () => {
                this._widgetInfo.color100 = this._settings.get_string('color-100');
                this._onActiveChanged();
                this._reloadUpowerIndicator();
            },
            'changed::color-90', () => {
                this._widgetInfo.color90 = this._settings.get_string('color-90');
                this._onActiveChanged();
                this._reloadUpowerIndicator();
            },
            'changed::color-80', () => {
                this._widgetInfo.color80 = this._settings.get_string('color-80');
                this._onActiveChanged();
                this._reloadUpowerIndicator();
            },
            'changed::color-70', () => {
                this._widgetInfo.color70 = this._settings.get_string('color-70');
                this._onActiveChanged();
                this._reloadUpowerIndicator();
            },
            'changed::color-60', () => {
                this._widgetInfo.color60 = this._settings.get_string('color-60');
                this._onActiveChanged();
                this._reloadUpowerIndicator();
            },
            'changed::color-50', () => {
                this._widgetInfo.color50 = this._settings.get_string('color-50');
                this._onActiveChanged();
                this._reloadUpowerIndicator();
            },
            'changed::color-40', () => {
                this._widgetInfo.color40 = this._settings.get_string('color-40');
                this._onActiveChanged();
                this._reloadUpowerIndicator();
            },
            'changed::color-30', () => {
                this._widgetInfo.color30 = this._settings.get_string('color-30');
                this._onActiveChanged();
                this._reloadUpowerIndicator();
            },
            'changed::color-20', () => {
                this._widgetInfo.color20 = this._settings.get_string('color-20');
                this._onActiveChanged();
                this._reloadUpowerIndicator();
            },
            'changed::color-10', () => {
                this._widgetInfo.color10 = this._settings.get_string('color-10');
                this._onActiveChanged();
                this._reloadUpowerIndicator();
            },
            'changed::enable-upower-level-icon', () => {
                this._upowerEnabled = this._settings.get_boolean('enable-upower-level-icon');
                this._reloadUpowerIndicator();
            },
            this
        );
        this._bluetoothToggle._deviceItems.forEach(item => {
            item.destroy();
        });
        this._bluetoothToggle._deviceItems.clear();
        this._setEnhancedDeviceMode();
        this._setPanelButtonMode();
        this._connectSettingsSignal(true);
        this._onActiveChanged();

        Main.sessionMode.connectObject(
            'updated', session => {
                this._isUnlockSession = session.currentMode === 'unlock-dialog';
                this._setPanelButtonMode();
                this._onActiveChanged();
            },
            this
        );

        this._upowerEnabled = this._settings.get_boolean('enable-upower-level-icon');
        this._reloadUpowerIndicator();

        this.sync();
    }

    _reloadUpowerIndicator() {
        if (this._upowerEnabled) {
            this._upowerClient?.destroy();
            this._upowerClient = new UpowerClient(this._settings, this._widgetInfo,
                this.addIndicatorWidget.bind(this));
        } else {
            this._upowerClient?.destroy();
            this._upowerClient = null;
        }
    }

    _connectSettingsSignal(connect) {
        if (connect) {
            this._settingSignalId = this._settings.connect('changed::device-list', () => {
                this._pullDevicesFromGsetting();
                this.sync();
            });
        } else if (this._settingSignalId) {
            this._settings.disconnect(this._settingSignalId);
            this._settingSignalId = null;
        }
    }

    _reorderDeviceItems() {
        const devices = this._sortDevicesByHistory ? this._getRecencySortedDevices()
            : this._bluetoothToggle._getSortedDevices();
        for (const [i, dev] of devices.entries()) {
            const item = this._deviceItems.get(dev.get_object_path());
            if (!item)
                continue;

            this._bluetoothToggle._deviceSection.moveMenuItem(item.popupMenuItem, i);
        }
    }

    _removeDevice(path) {
        if (this.deviceList.has(path)) {
            const props = this.deviceList.get(path);
            props.paired = false;
            this.deviceList.set(path, props);
            this.pushDevicesToGsetting();
        }
        this._deviceItems.get(path)?.destroy();
        this._deviceItems.delete(path);
        this._updateDeviceVisibility();
    }

    _updateDeviceVisibility() {
        this._bluetoothToggle._deviceSection.actor.visible =
            [...this._deviceItems.values()].some(item => item.popupMenuItem.visible);
    }

    _onActiveChanged() {
        if (!this._colorsAssigned && this._bluetoothToggle.checked) {
            this._getColor();
        } else {
            this._bluetoothToggle._updatePlaceholder();
            this._deviceItems.forEach(item => item.destroy());
            this._deviceItems.clear();
            this.sync();
        }
    }

    _getRecencySortedDevices() {
        const devices = this._bluetoothToggle._getSortedDevices();
        const connectedDevices = [];
        const disconnectedDevices = [];

        devices.forEach(device => {
            const path = device.get_object_path();
            const props = this.deviceList.get(path);
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
        return [...connectedDevices.map(item => item.device),
            ...disconnectedDevices.map(item => item.device)];
    }

    _pullDevicesFromGsetting() {
        this.deviceList.clear();
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
                    'isEnhancedDevice': item['enhanced-device'],
                    'connectedTime': item['connected-time'] || 0,
                    'disconnectedTime': item['disconnected-time'] || 0,
                };
                this.deviceList.set(path, props);
            }
        }
    }

    pushDevicesToGsetting() {
        const deviceList = [];
        for (const [path, props] of this.deviceList) {
            const item = {
                path,
                'icon': props.icon,
                'alias': props.alias,
                'paired': props.paired,
                'battery-reported': props.batteryReported,
                'qs-level': props.qsLevelEnabled,
                'indicator-mode': props.indicatorMode,
                'enhanced-device': props.isEnhancedDevice,
                'connected-time': props.connectedTime,
                'disconnected-time': props.disconnectedTime,
            };
            deviceList.push(JSON.stringify(item));
        }
        this._connectSettingsSignal(false);
        this._settings.set_strv('device-list', deviceList);
        this._connectSettingsSignal(true);
        this.sync();
    }

    _addNewDeviceToList(device, reported, type) {
        const battReported = reported || type;
        const currentTime = GLib.DateTime.new_now_utc().to_unix();
        const path = device.get_object_path();
        const props = {
            icon: device.icon,
            alias: device.alias,
            paired: device.paired,
            batteryReported: battReported,
            qsLevelEnabled: battReported,
            indicatorMode: battReported ? 2 : 0,
            isEnhancedDevice: type,
            connectedTime: currentTime,
            disconnectedTime: currentTime,
        };
        this.deviceList.set(path, props);
        this.delayedUpdateDeviceGsettings();
    }

    delayedUpdateDeviceGsettings() {
        if (this._delayedTimerId)
            GLib.source_remove(this._delayedTimerId);
        this._delayedTimerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 500, () => {
            this.pushDevicesToGsetting();
            this._delayedTimerId = null;
            return GLib.SOURCE_REMOVE;
        });
    }

    sync() {
        if (this._syncRunning) {
            this._syncPending = true;
            return;
        }

        this._syncRunning = true;

        do {
            this._syncPending = false;
            this._sync();
        } while (this._syncPending);

        this._syncRunning = false;
    }

    _sync() {
        const devices = this._sortDevicesByHistory ? this._getRecencySortedDevices()
            : this._bluetoothToggle._getSortedDevices();

        for (const dev of devices) {
            const path = dev.get_object_path();
            if (this._deviceItems.has(path)) {
                const deviceWidgetManager = this._deviceItems.get(path);
                if (this.enhancedDeviceManager) {
                    const enhancedProps =
                        this.enhancedDeviceManager?.onDeviceSync(path, dev.connected, dev.icon,
                            this._enhancedDeviceConfigChanged);

                    if (deviceWidgetManager.type && enhancedProps?.dataHandler)
                        deviceWidgetManager.setDataHandler(enhancedProps.dataHandler);
                }
                deviceWidgetManager.update();
                continue;
            }

            const enhancedDeviceProps =
                this.enhancedDeviceManager?.onDeviceSync(path, dev.connected, dev.icon,
                    this._enhancedDeviceConfigChanged);
            const {type: enhanceDeviceType} = enhancedDeviceProps ?? {type: null};

            let props = {};
            let deviceIcon;
            if (this.deviceList.has(path)) {
                let updateGsettingPairedList = false;
                props = this.deviceList.get(path);
                if (props.alias !== dev.alias) {
                    props.alias = dev.alias;
                    updateGsettingPairedList = true;
                }
                if (props.paired !== dev.paired) {
                    props.paired = dev.paired;
                    updateGsettingPairedList = true;
                }
                if (!props.batteryReported && dev.battery_percentage > 0) {
                    props.batteryReported = true;
                    props.qsLevelEnabled = true;
                    props.indicatorMode = 2;
                    updateGsettingPairedList = true;
                }
                if (!props.isEnhancedDevice && enhanceDeviceType) {
                    props.isEnhancedDevice = enhanceDeviceType;
                    props.qsLevelEnabled = true;
                    props.indicatorMode = 2;
                    updateGsettingPairedList = true;
                }
                if (updateGsettingPairedList) {
                    this.deviceList.set(path, props);
                    this.delayedUpdateDeviceGsettings();
                }
                deviceIcon = props.icon;
            } else {
                deviceIcon = supportedIcons.includes(dev.icon) ? dev.icon : 'bluetooth';
                this._addNewDeviceToList(dev, dev.battery_percentage > 0, enhanceDeviceType);
            }

            const qsLevelEnabled = props.batteryReported || props.isEnhancedDevice
                ? this.deviceList.get(path).qsLevelEnabled : false;

            const item = new DeviceWidgetManager(this, dev, props.batteryReported, qsLevelEnabled,
                props.indicatorMode, deviceIcon, enhancedDeviceProps);

            item.popupMenuItem.connect('notify::visible', () => this._updateDeviceVisibility());
            this._bluetoothToggle._deviceSection.addMenuItem(item.popupMenuItem);
            this._deviceItems.set(path, item);
        }

        this._enhancedDeviceConfigChanged = false;
        const connectedDevices = devices.filter(dev => dev.connected);
        const nConnected = connectedDevices.length;

        if (nConnected > 1) {
            this._bluetoothToggle.subtitle =
                ngettext('%d Connected', '%d Connected', nConnected).format(nConnected);
        } else if (nConnected === 1) {
            this._bluetoothToggle.subtitle = connectedDevices[0].alias;
        } else {
            this._bluetoothToggle.subtitle = null;
        }

        this._updateDeviceVisibility();

        if (this._hideBluetoothIndicator === 2) {
            let indicatorCount = 0;

            this._deviceItems.forEach(item => {
                if (item.indicator !== null && item.indicator !== undefined)
                    indicatorCount++;
            });

            QuickSettingsMenu._bluetooth._indicator.visible = indicatorCount < 1 && nConnected > 0;
        } else if (this._hideBluetoothIndicator === 1) {
            QuickSettingsMenu._bluetooth._indicator.visible = false;
        } else {
            QuickSettingsMenu._bluetooth._indicator.visible = nConnected > 0;
        }

        this.enhancedDeviceManager?.updateEnhancedDevicesInstance();
    }

    _addIndicatorBoxLayout() {
        this._indicatorBox = new St.BoxLayout();
        this._indicatorBox.quickSettingsItems = [];
        Main.panel.statusArea.quickSettings.addExternalIndicator(this._indicatorBox);
        const removedSignal = shellVersion > 45 ? 'child-removed' : 'actor-removed';
        this._indicatorBox.connectObject(
            removedSignal, () => {
                if (this._indicatorBox.get_n_children() === 0)
                    this._removeIndicatorBoxLayout();
            },
            this
        );
    }

    _removeIndicatorBoxLayout() {
        this._indicatorBox?.disconnectObject(this);
        this._indicatorBox?.destroy();
        this._indicatorBox = null;
    }

    addIndicatorWidget(widget) {
        if (!this._indicatorBox)
            this._addIndicatorBoxLayout();
        this._indicatorBox.add_child(widget);
    }

    _setEnhancedDeviceMode() {
        if (this._enableEnhancedDeviceMode && !this.enhancedDeviceManager) {
            this._setPanelButtonMode();
            this.enhancedDeviceManager = new EnhancedDeviceSupportManager(this);
        } else if (!this._enableEnhancedDeviceMode) {
            this.enhancedDeviceManager?.stopDbusServiceScript();
            this.enhancedDeviceManager?.destroy();
            this.enhancedDeviceManager = null;
            this._setPanelButtonMode();
        }
    }

    _setPanelButtonMode() {
        if (!this._isUnlockSession && this._enablePanelButton &&
            this._enableEnhancedDeviceMode && !this.panelButton) {
            this.panelButton = new PanelButton(
                this._settings, this.gIcon, this._widgetInfo, this._extuuid);
            Main.panel.addToStatusArea(this._extuuid, this.panelButton);
        } else if (this._isUnlockSession || !this._enablePanelButton ||
            !this._enableEnhancedDeviceMode) {
            this.panelButton?.destroy();
            this.panelButton = null;
        }
    }

    _getColor() {
        const toggleButton = this._bluetoothToggle._box.get_first_child();
        const accentRGB = toggleButton.get_theme_node().get_background_color();
        const panelBackgroundRGB = Main.panel.statusArea.quickSettings
            .menu.box.get_theme_node().get_background_color();
        const panelForegroundRGB = Main.panel.statusArea.quickSettings
            .menu.box.get_theme_node().get_foreground_color();
        const panelBackgroundLuminance = rgbToHsl(panelBackgroundRGB.red,
            panelBackgroundRGB.green, panelBackgroundRGB.blue).l;
        const adjustLuminanceFactor = panelBackgroundLuminance < 40 ? 15 : -5;
        const accentHSL =  rgbToHsl(accentRGB.red, accentRGB.green, accentRGB.blue);
        const accentLuminanceAdjusted = accentHSL.l + adjustLuminanceFactor;
        this.connectedColor = hslToRgbHex(accentHSL.h, accentHSL.s, accentLuminanceAdjusted);
        this.disconnectedColor = panelForegroundRGB.to_string().substring(0, 7);
        this._colorsAssigned = true;
        this._onActiveChanged();
    }

    destroy() {
        this._syncRunning = false;
        this._syncPending = false;
        if (this._idleTimerId)
            GLib.source_remove(this._idleTimerId);
        this._idleTimerId = null;
        if (this._originalSync)
            this._bluetoothToggle._sync = () => {};
        if (this._originalReorderDeviceItems)
            this._bluetoothToggle._reorderDeviceItems = () => {};
        if (this._originalRemoveDevice)
            this._bluetoothToggle._removeDevice = () => {};
        if (this._delayedTimerId)
            GLib.source_remove(this._delayedTimerId);
        this._delayedTimerId = null;
        if (this._themeContext)
            this._themeContext.disconnectObject(this);
        if (this._settings)
            this._settings.disconnectObject(this);
        Main.sessionMode.disconnectObject(this);
        this._connectSettingsSignal(false);
        this._upowerClient?.destroy();
        this._upowerClient = null;
        if (this._deviceItems) {
            this._deviceItems.forEach(item => item.destroy());
            this._deviceItems.clear();
        }
        this.enhancedDeviceManager?.destroy();
        this.enhancedDeviceManager = null;
        this.panelButton?.destroy();
        this.panelButton = null;
        this._deviceItems = null;
        this.deviceList = null;
        this._removeIndicatorBoxLayout();
        this._themeContext = null;
        this._settings = null;
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
    const hex = `#${((1 << 24) + (Math.round(r * 255) << 16) +
        (Math.round(g * 255) << 8) + Math.round(b * 255)).toString(16).slice(1)}`;
    return hex;
}
