---
layout: default
title: AirPods / Beats
parent: Preferences
nav_order: 7
permalink: /preferences/airpods
---


## AirPods / Beats
<br>
<br>

**AirPods / Beats Popup**
<br>
<img src="{{ 'assets/images/preferences/airpods/airpods-popup.png' | relative_url }}" width="35%">

* The popup can appear in multiple modes: On-Hover, Panel Button, and/or Bluetooth Submenu.
* It shows a circular battery widget, supporting either a single battery (headset) or three separate levels for Left, Right, and Case.
* The case battery is shown only when the AirPods report it, usually when the case is charging or when at least one AirPod is inside.

**AirPods / Beats Noise Control, Conversation Awareness, other features**

* Not all features are supported on every model; availability varies depending on the selected device.
* Features exclusive to this extension are described below.
* Other settings are self-explanatory and mirror those available on iPhone, iPad, and Mac.

### Button Visibility

* The ANC option (if supported) is only shown when one or both earbuds are in the ears.
* The Conversation Mode (if supported) option is only shown when both earbuds are in the ears.


### Icons:

Active Noise Cancellation (ANC)

|:-:|:-:|
| <img src="{{ 'assets/images/preferences/airpods/anc-off.png' | relative_url }}" width="15%"> | Active Noise Cancellation Off  |
| <img src="{{ 'assets/images/preferences/airpods/anc-on.png' | relative_url }}" width="15%"> | Active Noise Cancellation On |
| <img src="{{ 'assets/images/preferences/airpods/transperancy.png' | relative_url }}" width="15%"> | Transperancy |
| <img src="{{ 'assets/images/preferences/airpods/adaptive.png' | relative_url }}" width="15%"> | Adaptive |


Conversation Awareness

|:-:|:-:|
| <img src="{{ 'assets/images/preferences/airpods/ca-on.png' | relative_url }}" width="15%"> | Conversation Awareness On |
| <img src="{{ 'assets/images/preferences/airpods/ca-off.png' | relative_url }}" width="15%"> | Conversation Awareness Off |


**AirPods / Beats Preferences**
<br>
<img src="{{ 'assets/images/preferences/airpods/airpods-prefs.png' | relative_url }}" width="100%">

When enabled, the system can detect AirPods and Beats devices among connected Bluetooth devices. It communicates over L2CAP sockets to support features such as:

* Battery level reporting
* In-ear detection for automatic pause/play of media
* Control of ANC (Active Noise Cancellation) mode (if supported)
* Conversation Awareness mode (if supported)
* Adaptive noise level customization (if supported)
* Configure Stem/Touch  Equalizer, Notifications etc.

 
## Configuration by Device

Configure per device settings if supported

<img src="{{ 'assets/images/preferences/airpods/airpods-device.png' | relative_url }}" width="80%">

## Icon selection

Choose which icon style to display in the panel and quick menu:
* Device icons: Select from the available options for your headset type (single-battery or dual-battery devices).
* Case icon: For models that report a case battery, an additional case icon can be selected.

These options let you customize how your device appears in the indicator.

## Pause when device is not worn

When enabled, media playback automatically pauses when the earbuds are removed and resumes based on the selected behavior:

* Default behavior: Uses the device’s standard in-ear detection for pausing and resuming.
* Resume with both earbuds: Playback resumes only when both earbuds are worn.
* Resume with any earbud: Playback resumes as soon as at least one earbud is worn.

## Conversation awareness volume Limit

If supported by device, this setting limits media volume during active conversations to enhance awareness of your surroundings and reduce distractions.

* When conversation mode is triggered (based on supported device capabilities), the system automatically reduces media volume to a user-defined percentage of the maximum volume.

* This helps ensure you can still hear important external sounds while music or other media is playing.

Adjustable Range

* You can set the volume limit to any value between 0 and 50.
* Values are interpreted as a percentage of the device's maximum volume.
* Note: If the current playback volume is already below the specified limit, no adjustment will be made.

## Other settings:
Other settings are self explanatory similar to settings available in iPhone / iPads / Macs

## Compatibility

Currently tested and confirmed working:

* **AirPods 1st Gen** ✅ — Credits: Toxblh
* **AirPods Pro 1st Gen** ✅ — Credits: Toxblh, hazzac181
* **AirPods Pro 2nd Gen** ✅ — Credits: MobileAZN
* **AirPods 4th Gen with ANC** ✅ — Credits: Cameo007
* **AirPods Pro 2 USB-C** ✅ — Credits: maniacx
* **AirPods Max  USB-C** ✅ — Credits: GovanifY
* **Beats Powerbeats Fit** ✅ — Credits: schlagmichdoch

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

### AirPods 1st Gen

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 2002           | ✅     |
| Battery Level                 | L, R, Case     | ✅     |
| In‑Ear Play/Pause             | ✅             | ❌     |

<br>
### AirPods 2nd Gen

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 200F           | ❌     |
| Battery Level                 | L, R, Case     | ❌     |
| In‑Ear Play/Pause             | ✅             | ❌     |

<br>
### AirPods 3rd Gen

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 2013           | ❌     |
| Battery Level                 | L, R, Case     | ❌     |
| In‑Ear Play/Pause             | ✅             | ❌     |

<br>
### AirPods 4th Gen

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 2019           | ❌     |
| Battery Level                 | L, R, Case     | ❌     |
| In‑Ear Play/Pause             | ✅             | ❌     |

<br>
### AirPods 4th Gen with ANC

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 201B           | ✅     |
| Battery Level                 | L, R, Case     | ✅     |
| ANC                           | ✅             | ✅     |
| Adaptive                      | ✅             | ✅     |
| Ambient Sound Customization   | ✅             | ✅     |
| Conversation Awareness        | ✅             | ✅     |
| In‑Ear Play/Pause             | ✅             | ✅     |

<br>
### AirPods Pro 1st Gen

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 200E           | ✅     |
| Battery Level                 | L, R, Case     | ✅     |
| ANC                           | ✅             | ✅     |
| In‑Ear Play/Pause             | ✅             | ❌     |

<br>
### AirPods Pro 2nd Gen

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 2014           | ✅     |
| Battery Level                 | L, R, Case     | ✅     |
| ANC                           | ✅             | ✅     |
| Adaptive                      | ✅             | ✅     |
| Ambient Sound Customization   | ✅             | ✅     |
| Conversation Awareness        | ✅             | ✅     |
| In‑Ear Play/Pause             | ✅             | ✅     |

<br>
### AirPods Pro 2 USB‑C

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 2024           | ✅     |
| Battery Level                 | L, R, Case     | ✅     |
| ANC                           | ✅             | ✅     |
| Adaptive                      | ✅             | ✅     |
| Ambient Sound Customization   | ✅             | ✅     |
| Conversation Awareness        | ✅             | ✅     |
| In‑Ear Play/Pause             | ✅             | ✅     |

<br>
### AirPods Max

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 200A           | ❌     |
| Battery Level                 | Single         | ❌     |
| ANC                           | ✅             | ❌     |
| In‑Ear Play/Pause             | ✅             | ❌     |

<br>
### AirPods Max USB‑C

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 201F           | ✅     |
| Battery Level                 | Single         | ✅     |
| ANC                           | ✅             | ✅     |
| In‑Ear Play/Pause             | ✅             | ✅     |

<br>
### AirPods Max 2

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 202D           | ❌     |
| Battery Level                 | Single         | ❌     |
| ANC                           | ✅             | ❌     |
| In‑Ear Play/Pause             | ✅             | ❌     |

<br>
### Beats Fit Pro

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 2012           | ❌     |
| Battery Level                 | L, R, Case     | ❌     |
| ANC                           | ✅             | ❌     |
| In‑Ear Play/Pause             | ✅             | ❌     |

<br>
### Beats X

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 2005           | ❌     |
| Battery Level                 | Single         | ❌     |
| In‑Ear Play/Pause             | ✅             | ❌     |

<br>
### Beats Flex

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 2010           | ❌     |
| Battery Level                 | Single         | ❌     |
| In‑Ear Play/Pause             | ✅             | ❌     |

<br>
### Beats Solo 3

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 2006           | ❌     |
| Battery Level                 | Single         | ❌     |
| In‑Ear Play/Pause             | ✅             | ❌     |

<br>
### Beats Solo 4

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 2025           | ❌     |
| Battery Level                 | Single         | ❌     |
| In‑Ear Play/Pause             | ✅             | ❌     |

<br>
### Powerbeats 3

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 2003           | ❌     |
| Battery Level                 | Single         | ❌     |
| In‑Ear Play/Pause             | ✅             | ❌     |

<br>
### Beats Studio 3

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 2009           | ❌     |
| Battery Level                 | Single         | ❌     |
| In‑Ear Play/Pause             | ✅             | ❌     |

<br>
### Powerbeats Pro

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 200B           | ❌     |
| Battery Level                 | L, R, Case     | ❌     |
| In‑Ear Play/Pause             | ✅             | ❌     |

<br>
### Beats Fit Pro

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 202F           | ✅     |
| Battery Level                 | L, R, Case     | ✅     |
| ANC                           | ✅             | ✅     |
| In‑Ear Play/Pause             | ✅             | ✅     |

<br>
### Powerbeats 4

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 200D           | ❌     |
| Battery Level                 | Single         | ❌     |
| In‑Ear Play/Pause             | ✅             | ❌     |

<br>
### Beats Solo Pro

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 200C           | ❌     |
| Battery Level                 | Single         | ❌     |
| In‑Ear Play/Pause             | ✅             | ❌     |

<br>
### Beats Studio Pro

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 2017           | ❌     |
| Battery Level                 | Single         | ❌     |
| ANC                           | ✅             | ❌     |
| In‑Ear Play/Pause             | ✅             | ❌     |

<br>
### Beats Studio Buds

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 2011           | ❌     |
| Battery Level                 | L, R, Case     | ❌     |
| In‑Ear Play/Pause             | ✅             | ❌     |

<br>
### Beats Studio Buds Plus

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Modalias                      | 2016           | ❌     |
| Battery Level                 | L, R, Case     | ❌     |
| In‑Ear Play/Pause             | ✅             | ❌     |


