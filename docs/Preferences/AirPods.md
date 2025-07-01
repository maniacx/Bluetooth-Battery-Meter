---
layout: default
title: AirPods
parent: Preferences
nav_order: 6
permalink: /preferences/airpods
---


## AirPods / Beats
<br>
<br>

{: .note }
>
> This preference is available only when Enhanced Devices is enabled.


**AirPods / Beats Popup**
<br>
<img src="{{ 'assets/images/preferences/airpods/airpods-popup.png' | relative_url }}" width="35%">

* Popup is shown in either On-Hover Mode or Panel Button Mode.
* Displays a circular widget indicating battery level and status for either a single battery (headset) or for Left, Right, and Case separately.
* Case battery is displayed only when AirPods report it — typically when the case is charging or when one or more AirPods are placed inside the case.

**AirPods / Beats ANC and Conversation Awareness**

* Only certain AirPods models support ANC mode.
* Some models support ANC but not Ambient mode.
* Some models also support Conversation Mode.

### Button Visibility

* The ANC option (if supported) is only shown when one or both earbuds are in the ears.
* The Conversation Mode (if supported) option is only shown when both earbuds are in the ears.


### Icons:

Anti-Noise Cancellation (ANC)

|:-:|:-:|
| <img src="{{ 'assets/images/preferences/airpods/anc-off.png' | relative_url }}" width="15%"> | Anti-Noise Cancellation Off  |
| <img src="{{ 'assets/images/preferences/airpods/anc-on.png' | relative_url }}" width="15%"> | Anti-Noise Cancellation On |
| <img src="{{ 'assets/images/preferences/airpods/transperancy.png' | relative_url }}" width="15%"> | Transperancy |
| <img src="{{ 'assets/images/preferences/airpods/adaptive.png' | relative_url }}" width="15%"> | Adaptive |


Conversation Awareness

|:-:|:-:|
| <img src="{{ 'assets/images/preferences/airpods/ca-on.png' | relative_url }}" width="15%"> | Conversation Awareness On |
| <img src="{{ 'assets/images/preferences/airpods/ca-off.png' | relative_url }}" width="15%"> | Conversation Awareness Off |


**AirPods / Beats Preferences**
<br>
<img src="{{ 'assets/images/preferences/airpods/airpods-prefs.png' | relative_url }}" width="100%">

When enabled, the system can detect AirPods and Beats devices among connected Bluetooth devices. It uses a built-in Python script that communicates over L2CAP sockets to support features such as:

* Battery level reporting
* In-ear detection for automatic pause/play of media
* Control of ANC (Active Noise Cancellation) mode (if supported)
* Conversation Awareness mode (if supported)
* Adaptive noise level customization (if supported)

 
## Configuration by Device

Configure per device settings if supported

<img src="{{ 'assets/images/preferences/airpods/airpods-device.png' | relative_url }}" width="80%">


## Pause when device is not worn
When this option is enabled, the system intelligently controls media playback based on whether the earbuds are being worn:

* Auto-Pause: Playback is automatically paused when both earbuds are removed from the ears.
* Auto-Resume: Playback automatically resumes when the earbuds are placed back in the ears.

This feature relies on in-ear detection supported by compatible devices (e.g., certain AirPods or Beats models) and helps conserve battery and avoid missed content.

## Conversation awareness volume Limit

If supported by device, this setting limits media volume during active conversations to enhance awareness of your surroundings and reduce distractions.

* When conversation mode is triggered (based on supported device capabilities), the system automatically reduces media volume to a user-defined percentage of the maximum volume.

* This helps ensure you can still hear important external sounds while music or other media is playing.

Adjustable Range

* You can set the volume limit to any value between 0 and 50.
* Values are interpreted as a percentage of the device's maximum volume.
* Note: If the current playback volume is already below the specified limit, no adjustment will be made.

## Customize Adaptive Audio
If supported by device, Adaptive Audio is customizable. Moving the slider adjusts the level of external noise that is permitted to pass through in Adaptive mode.


