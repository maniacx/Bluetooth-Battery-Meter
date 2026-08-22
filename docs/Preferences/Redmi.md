---
layout: default
title: Redmi / Xiaomi
parent: Preferences
nav_order: 13
permalink: /preferences/redmi
---

# Redmi / Xiaomi Earbuds

{: .note }
>
> Redmi / Xiaomi Earbuds sockets can be accessed by only one application at a time. 
> Do not run other Redmi / Xiaomi Earbuds's companion or monitoring apps while using Bluetooth Battery Meter GNOME Extension.

<br>
<img src="{{ 'assets/images/preferences/redmi/redmi-popup.png' | relative_url }}" width="35%">

* Displays a circular battery widget, supporting either a single battery (headset) or three separate levels for Left, Right, and Case.
* The case battery is shown only when the Redmi / Xiaomi  report it, usually when the case is charging or when at least one bud is inside.
* Only certain Redmi / Xiaomi  models support ANC mode.
* Some models support ANC but not Ambient mode.

## Icons:

Active Noise Cancellation (ANC)

|:-:|:-:|
| <img src="{{ 'assets/images/preferences/airpods/anc-off.png' | relative_url }}" width="15%"> | Active Noise Cancellation Off  |
| <img src="{{ 'assets/images/preferences/airpods/anc-on.png' | relative_url }}" width="15%"> | Active Noise Cancellation On |
| <img src="{{ 'assets/images/preferences/airpods/transperancy.png' | relative_url }}" width="15%"> | Transperancy |


**Redmi / Xiaomi Headband / Earbuds Preferences**
<br>
<img src="{{ 'assets/images/preferences/redmi/redmi-prefs.png' | relative_url }}" width="100%">

When enabled, the system can detect Redmi / Xiaomi  Headband/earbuds among connected Bluetooth devices. It communicates over RFCOMM sockets to support features such as:

* Battery level reporting
* Control of ANC (Active Noise Cancellation) / Ambient mode (if supported)
* Configure Stem/Touch, Equalizer, Notifications etc.

 
## Configuration by Device

Configure per device settings if supported

<img src="{{ 'assets/images/preferences/redmi/redmi-configure.png' | relative_url }}" width="85%">

## Icon selection

* Device icons: Select from the available options for your headset type (single-battery or dual-battery devices).
* Case icon: For models that report a case battery, an additional case icon can be selected.

## Other settings:
Other settings are self explanatory similar to settings available in OEM Mobile App

## Compatibility
Some devices have not yet been tested and may show incorrect features in the configuration. Others may be missing entirely. If you notice missing devices or incorrect feature mappings, please open an issue on GitHub so we can add or correct them.

Currently tested and confirmed working:
* **Redmi Buds 6 Play**  ✅ — Credits: drinkingoutofcups


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

### Redmi Buds 6 Play

| Feature                       | Supported | Tested |
|:-----------------------------:|:---------:|:------:|
| Battery Level                 | L, R, Case| ✅     |
| Equalizer Preset              | ✅        | ✅     |
| Low Latency                   | ✅        | ✅     |
| Find My buds (Ring)           | ✅        | ✅     |
| Gestures                      | ✅        | ✅     |

### Redmi Buds 8 Pro

| Feature                       | Supported | Tested |
|:-----------------------------:|:---------:|:------:|
| Battery Level                 | L, R, Case| ❌     |
| Noise Cancellation (strength) | ✅        | ❌     |
| Transparency (modes)          | ✅        | ❌     |
| Equalizer Preset              | ✅        | ❌     |
| Equalizer Custom              | ✅        | ❌     |
| In Ear Detection              | ✅        | ❌     |
| Auto Answer Calls             | ✅        | ❌     |
| Adaptive Sound                | ✅        | ❌     |
| Low Latency                   | ✅        | ❌     |
| Dual Connection (Multipoint)  | ✅        | ❌     |
| Find My buds (Ring)           | ✅        | ❌     |
| Gestures                      | ✅        | ❌     |

