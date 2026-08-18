---
layout: default
title: Google Pixel Buds
parent: Preferences
nav_order: 11
permalink: /preferences/pixel
---

# Google Pixel Buds

{: .note }
>
> Google Pixel Buds Earbuds sockets can be accessed by only one application at a time. 
> Do not run other Google Pixel Buds Earbuds's companion or monitoring apps while using Bluetooth Battery Meter GNOME Extension, such as:
>
> * **BudsLink** flatpak app


<br>
<img src="{{ 'assets/images/preferences/pixel/pixel-popup.png' | relative_url }}" width="35%">

* Displays a circular battery widget, supporting either a single battery (headset) or three separate levels for Left, Right, and Case.
* The case battery is shown only when the Google Pixel Buds report it, usually when the case is charging or when at least one bud is inside.


## Icons:

Anti-Noise Cancellation (ANC)

|:-:|:-:|
| <img src="{{ 'assets/images/preferences/airpods/anc-off.png' | relative_url }}" width="15%"> | Anti-Noise Cancellation Off  |
| <img src="{{ 'assets/images/preferences/airpods/anc-on.png' | relative_url }}" width="15%"> | Anti-Noise Cancellation On |
| <img src="{{ 'assets/images/preferences/airpods/transperancy.png' | relative_url }}" width="15%"> | Transperancy |
| <img src="{{ 'assets/images/preferences/airpods/adaptive.png' | relative_url }}" width="15%"> | Adaptive |


**Google Pixel Buds Preferences**
<br>
<img src="{{ 'assets/images/preferences/pixel/pixel-prefs.png' | relative_url }}" width="85%">

When enabled, the system can detect Google Pixel Buds headphones/earbuds among connected Bluetooth devices. It communicates over RFCOMM sockets to support features such as:
* Battery level reporting
* Noise control
* Equalizer

 
## Configuration by Device

Configure per device settings if supported

<img src="{{ 'assets/images/preferences/pixel/pixel-configure.png' | relative_url }}" width="85%">

## Icon selection

* Device icons: Select from the available options for your headset type (single-battery or dual-battery devices).
* Case icon: For models that report a case battery, an additional case icon can be selected.

## Other settings:
Other settings are self explanatory similar to settings available in OEM Mobile App

## Compatibility
Some devices have not yet been tested and may show incorrect features in the configuration. Others may be missing entirely. If you notice missing devices or incorrect feature mappings, please open an issue on GitHub so we can add or correct them.

Currently tested and confirmed working:

* **Google Pixel Buds Pro** ✅ — Credits: bhack@github.com
* **Google Pixel Buds Pro 2** ✅ — Credits: IGS-GIT@github.com


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

## Google Pixel Buds Pro

| Feature | Supported | Tested |
|:--|:--:|:--:|
| Battery Level | ✅ | ✅ |
| Noise Control | ✅ | ✅ |
| Equalizer Preset | ✅ | ✅ |
| Volume EQ | ✅ | ✅ |

---

## Google Pixel Buds Pro 2

| Feature | Supported | Tested |
|:--|:--:|:--:|
| Battery Level | ✅ | ✅ |
| Noise Control | ✅ | ✅ |
| Equalizer Preset | ✅ | ✅ |
| Volume EQ | ✅ | ✅ |


