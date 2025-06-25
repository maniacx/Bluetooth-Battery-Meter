'use strict';
import GObject from 'gi://GObject';

export function createConfig() {
    // Assigning batteryIcon/setButtons a name(string) enables it.
    // commonIcon: St.Drawing vector name for indicator widget in indicatorVectorImages
    //             Also for svg icon for panel button.
    //              (`bbm-${config.commonIcon}-symbolic.svg`) in folder
    //             ${extensions directory}/icons/hicolor/scalable/actions
    // battery*Icon: St.Drawing vector name for circular widget  in circularBatteryVectorImages
    // battery*ShowOnDisconnect: false: Hide the circular battery widget when disconnected
    //                           true: Shows the circular battery widget
    //                                  when disconnected with disconnect icon
    // set1Button*Icon: First toggle set, accepts svg icon name located at
    //                  ${extensions directory}/icons/hicolor/scalable/actions
    // set1Button*Icon: Second toggle set, accepts svg icon name located a
    //                  ${extensions directory}/icons/hicolor/scalable/actions
    // panelButtonLabelFixed: Position of bat1/2 label relative to the icon
    //                        true: position bat1 : left, bat2 : right. if bat1/2 = 0 display '...'
    //                        false; if bat2 = 0, bat1 : right. else bat1 : left, bat2: right.

    return {
        commonIcon: null,
        albumArtIcon: null,
        battery1Icon: null,
        battery2Icon: null,
        battery3Icon: null,
        battery1ShowOnDisconnect: false,
        battery2ShowOnDisconnect: false,
        battery3ShowOnDisconnect: false,
        set1Button1Icon: null,
        set1Button2Icon: null,
        set1Button3Icon: null,
        set1Button4Icon: null,
        set2Button1Icon: null,
        set2Button2Icon: null,
        set2Button3Icon: null,
        set2Button4Icon: null,
        panelButtonLabelFixed: true,
    };
}

export function createProperties() {
    // battery*Level: accepted value 0 - 100. displays level on circular widget
    // battery*Status: accepted value : 'charging', 'discharging', 'disconnected'
    // toggle*State: accepted value: 0 - 3
    //               0: no buttons active,
    //               1: button1 is active, other inactive
    //               2: button2 is active, other inactive
    //               3: button3 is active, other inactive
    //               4: button3 is active, other inactive
    // toggle1Visible: accepted value: boolean
    // toggle2Visible: accepted value: boolean
    return {
        battery1Level: 0,
        battery2Level: 0,
        battery3Level: 0,
        battery1Status: 'not-reported',
        battery2Status: 'not-reported',
        battery3Status: 'not-reported',
        toggle1State: 0,
        toggle2State: 0,
        toggle1Visible: false,
        toggle2Visible: false,
    };
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
