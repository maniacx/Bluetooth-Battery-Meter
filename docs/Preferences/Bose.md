---
layout: default
title: Bose
parent: Preferences
nav_order: 12
permalink: /preferences/bose
---


# Bose Headband / Earbuds

{: .note }
>
> Bose Headband / Earbuds sockets can be accessed by only one application at a time. 
> Do not run other Bose Headband / Earbuds's companion or monitoring apps while using BudsLink, such as:
>
> * **Bluetooth Battery Meter** GNOME Extension  (disable the Bose feature in the extension preferences)


<br>
<img src="{{ 'assets/images/preferences/bose/bose-popup.png' | relative_url }}" width="35%">

* Displays a circular battery widget, supporting either a single battery (headset) or three separate levels for Left, Right, and Case.
* The case battery is shown only when the Bose  report it, usually when the case is charging or when at least one bud is inside.
* Main Page has only option to display 4 mode. Other modes can be found in `Configure` page.


**Bose Headband / Earbuds Preferences**
<br>
<img src="{{ 'assets/images/preferences/bose/bose-prefs.png' | relative_url }}" width="100%">

When enabled, the system can detect Bose  headphones/earbuds among connected Bluetooth devices. It communicates over RFCOMM sockets to support features such as:

* Battery level reporting
* Modes (if supported)
* Spatial Audio, Configure Stem/Touch, Equalizer, Notifications etc.

 
## Configuration by Device

Configure per device settings if supported

<img src="{{ 'assets/images/preferences/bose/bose-configure.png' | relative_url }}" width="85%">

## Icon selection

* Device icons: Select from the available options for your headset type (single-battery or dual-battery devices).
* Case icon: For models that report a case battery, an additional case icon can be selected.

## Modes
<img src="{{ 'assets/images/preferences/bose/bose-mode.png' | relative_url }}" width="85%">

The Modes page provides the same mode selection and configuration options as the OEM mobile app. The main difference is the `Show in toggle` button.

Clicking `Show in toggle` adds the selected mode to the Main Page toggle, allowing you to switch between modes directly from the main page. A maximum of 4 modes can be added to the Main Page.
<img src="{{ 'assets/images/preferences/bose/bose-add-toggle.png' | relative_url }}" width="100%">


## Other settings:
Other settings are self explanatory similar to settings available in OEM Mobile App

## Compatibility
Some devices have not yet been tested and may show incorrect features in the configuration. Others may be missing entirely. If you notice missing devices or incorrect feature mappings, please open an issue on GitHub so we can add or correct them.

Currently tested and confirmed working:
* **Bose QuietComfort Ultra Earbuds**  ✅ — Credits: SMaiz, MobileAZN
* **Bose QuietComfort 35 II**  ✅ — Credits: amaxine
* **Bose QuietComfort 35**  ✅ — Credits: amaxine 


<style>
table th:first-of-type {
    width: 60%;
}
table th:nth-of-type(2) {
    width: 20%;
}
table th:nth-of-type(3) {
    width: 20%;
}
</style>

### Bose QuietComfort Ultra Earbuds

| Feature                        |      Supported      | Tested |
| :----------------------------- | :-----------------: | :----: |
| Battery Level                  | Left / Right / Case |    ✅   |
| Audio Modes                    |          ✅          |    ✅   |
| Custom Audio Modes             |          ✅          |    ✅   |
| Spatial Audio                  |          ✅          |    ✅   |
| Equalizer Preset               |          ✅          |    ✅   |
| Equalizer Custom               |          ✅          |    ✅   |
| SideTone                       |          ✅          |    ✅   |
| Auto Answer Calls              |          ✅          |    ✅   |
| Auto Pause                     |          ✅          |    ✅   |
| Auto Transparency              |          ✅          |    ✅   |
| Device Management (Multipoint) |          ❌          |    ❌   |
| Voice Prompts                  |          ✅          |    ✅   |
| Gesture Customization          |          ✅          |    ✅   |


### Bose QuietComfort 35 II

| Feature                        | Supported | Tested |
| :----------------------------- | :-------: | :----: |
| Battery Level                  |  Headband |    ✅   |
| Noise Cancellation (strength)  |     ✅     |    ✅   |
| SideTone                       |     ✅     |    ✅   |
| Automatic Power Off Timer      |     ✅     |    ✅   |
| Voice Prompts                  |     ✅     |    ✅   |
| Device Management (Multipoint) |     ❌     |    ❌   |
| Gesture / Button Customization |     ✅     |    ✅   |

### Bose QuietComfort 35

| Feature                        | Supported | Tested |
| :----------------------------- | :-------: | :----: |
| Battery Level                  |  Headband |    ✅   |
| Noise Cancellation (strength)  |     ✅     |    ✅   |
| Automatic Power Off Timer      |     ✅     |    ✅   |
| Voice Prompts                  |     ✅     |    ✅   |
| Device Management (Multipoint) |     ❌     |    ❌   |



