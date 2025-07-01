---
layout: default
title: Airpods
parent: Preferences
nav_order: 6
permalink: /preferences/airpods
---


## Airpods / Beats
<br>
<br>

{: .note }
>
> This preference is available only when Enhanced Devices is enabled.


**Airpods / Beats Preferences**
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


