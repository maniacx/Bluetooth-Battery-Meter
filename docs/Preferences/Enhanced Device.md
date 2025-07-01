---
layout: default
title: Enhanced Device Support
parent: Preferences
nav_order: 5
permalink: /preferences/enhanced-device
---


## Enhanced Device Support
<br>
<br>

**Enhanced Device Support Preferences**
<br>
<img src="{{ 'assets/images/preferences/enhanced/enhanced-prefs.png' | relative_url }}" width="100%">


When enabled, the extension communicates with supported devices using:

   - Socket-based interface for devices like AirPods/Beats to retrieve battery levels and control features such as ANC.

   - D-Bus GATT Battery Service (BAS) for standard Bluetooth devices that expose battery information via the GATT protocol.


* Provides additional UI widgets to display battery levels and control features such as ANC:

   - Panel Button

   - On-hover details

   - Multiple indicator mode

 
## Panel button with Menu

* Adds a button to the top panel displaying the battery percentage as text.
* Clicking the button opens a popup menu showing detailed battery information and device controls.
* Selecting a device from the popup menu sets it as the active device, updating the panel button to show its battery status.

<img src="{{ 'assets/images/preferences/enhanced/panel-button.png' | relative_url }}" width="40%">

## Show Popup on Hover

* Displays a popup with battery info and controls when the mouse pointer hovers over the indicator for a custom delay.
* User can specify the number of seconds the mouse must hover over the indicator before detailed information is displayed.

<img src="{{ 'assets/images/preferences/enhanced/on-hover.png' | relative_url }}" width="40%">

## Multiple Battery Indicator

* When enabled, display one indicator per battery. 

<img src="{{ 'assets/images/preferences/enhanced/indicator-multiple.png' | relative_url }}" width="30%">

* When disabled, show a single indicator with the most critical (lowest) battery level.

<img src="{{ 'assets/images/preferences/enhanced/indicator-single.png' | relative_url }}" width="25%">

## Battery Circle Widget Color Scheme

Users can choose color scheme for battery circle widget.
If customized it choosen, it will use the colors selected in indicators customized scheme

<img src="{{ 'assets/images/preferences/enhanced/color-normal.png' | relative_url }}" width="35%">

<img src="{{ 'assets/images/preferences/enhanced/color-custom.png' | relative_url }}" width="35%">
