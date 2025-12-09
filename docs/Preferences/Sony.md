---
layout: default
title: Sony Bluetooth Audio
parent: Preferences
nav_order: 6
permalink: /preferences/sony
---


## Sony Bluetooth Audio
<br>
<br>

**Sony Bluetooth Audio Popup**
<br>
<img src="{{ 'assets/images/preferences/sony/sony-popup.png' | relative_url }}" width="35%">

* The popup can appear in multiple modes: On-Hover, Panel Button, and/or Bluetooth Submenu.
* It shows a circular battery widget, supporting either a single battery (headset) or three separate levels for Left, Right, and Case.
* The case battery is shown only when the Sony report it, usually when the case is charging or when at least one bud is inside.
* **Conversation Awareness** in Sony term is **Speak to Chat**.

**Sony ANC and Conversation Awareness**

* Only certain Sony models support ANC mode.
* Some models support ANC but not Ambient mode.
* Some models also support Conversation Mode.

### Icons:

Anti-Noise Cancellation (ANC)

|:-:|:-:|
| <img src="{{ 'assets/images/preferences/airpods/anc-off.png' | relative_url }}" width="15%"> | Anti-Noise Cancellation Off  |
| <img src="{{ 'assets/images/preferences/airpods/anc-on.png' | relative_url }}" width="15%"> | Anti-Noise Cancellation On |
| <img src="{{ 'assets/images/preferences/airpods/transperancy.png' | relative_url }}" width="15%"> | Ambient |
| <img src="{{ 'assets/images/preferences/airpods/adaptive.png' | relative_url }}" width="15%"> | Adaptive |


Conversation Awareness (Speak to Chat)

|:-:|:-:|
| <img src="{{ 'assets/images/preferences/airpods/ca-on.png' | relative_url }}" width="15%"> | Conversation Awareness On |
| <img src="{{ 'assets/images/preferences/airpods/ca-off.png' | relative_url }}" width="15%"> | Conversation Awareness Off |


**Sony Preferences**
<br>
<img src="{{ 'assets/images/preferences/sony/sony-prefs.png' | relative_url }}" width="100%">

When enabled, the system can detect Sony headphones/earbuds among connected Bluetooth devices. It communicates over RFCOMM sockets to support features such as:

* Battery level reporting
* In-ear detection for automatic pause/play of media
* Control of ANC (Active Noise Cancellation) mode (if supported)
* Conversation Awareness mode (if supported)
* Other feature such as Equalizer, Listening Modes, etc

 
## Configuration by Device

Configure per device settings if supported

<img src="{{ 'assets/images/preferences/sony/sony-configure.png' | relative_url }}" width="80%">

## Icon selection

Choose which icon style to display in the panel and quick menu:
* Device icons: Select from the available options for your headset type (single-battery or dual-battery devices).
* Case icon: For models that report a case battery, an additional case icon can be selected.

## Other settings:
Other settings are self explanatory similar to settings available in Sony's Sound Connect app.

## Compatibility
Some devices have not yet been tested and may show incorrect features in the configuration. Others may be missing entirely. If you notice missing devices or incorrect feature mappings, please open an issue on GitHub so we can add or correct them.

Currently tested and confirmed working:
* **Sony WF-C510**  ✅ — Credits: G-dH
* **Sony WH-1000XM4**  ✅ — Credits: Int-Circuit
* **Sony WF-1000XM5**  ✅ — Credits: kilisei
* **Sony WH-1000XM5**  ✅ — Credits: pesader

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

### Sony WH-1000XM6

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Battery Level                 | Single         | ❌     |
| Ambient Mode                  | ✅             | ❌     |
| Anc Mode                      | ✅             | ❌     |
| Auto Ambient Sound Control    | ✅             | ❌     |
| Noise Control Button Mode     | ✅             | ❌     |
| Speak To Chat Config          | ✅             | ❌     |
| Voice Notifications           | ✅             | ❌     |
| Voice Notifications Volume    | ✅             | ❌     |
| Auto Power Off When Taken Off | ✅             | ❌     |
| Pause When Taken Off          | ✅             | ❌     |
| Equalizer Ten Bands           | ✅             | ❌     |
| Listening Mode                | ✅             | ❌     |
| DSEE                          | ✅             | ❌     |


<br>
### Sony WH-1000XM5

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Battery Level                 | Single         | ✅     |
| Ambient Mode                  | ✅             | ✅     |
| Anc Mode                      | ✅             | ✅     |
| Noise Control Button Mode     | ✅             | ✅     |
| Speak To Chat Config          | ✅             | ✅     |
| Voice Notifications           | ✅             | ✅     |
| Auto Power Off When Taken Off | ✅             | ✅     |
| Pause When Taken Off          | ✅             | ✅     |
| Equalizer Six Bands           | ✅             | ✅     |
| DSEE                          | ✅             | ✅     |

<br>
### Sony WH-1000XM4

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Battery Level                 | Single         | ✅     |
| Ambient Mode                  | ✅             | ✅     |
| Anc Mode                      | ✅             | ✅     |
| Speak To Chat Config          | ✅             | ✅     |
| Voice Notifications           | ✅             | ✅     |
| Auto Power Off When Taken Off | ✅             | ✅     |
| Pause When Taken Off          | ✅             | ✅     |
| Equalizer Six Bands           | ✅             | ✅     |
| DSEE                          | ✅             | ✅     |

<br>
### Sony WH-1000XM3

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Battery Level                 | Single         | ❌     |
| Ambient Mode                  | ✅             | ❌     |
| Anc Mode                      | ✅             | ❌     |
| Voice Notifications           | ✅             | ❌     |
| Auto Power Off When Taken Off | ✅             | ❌     |
| Auto Power Off When Taken Time| Yes            | ❌     |
| Equalizer Six Bands           | ✅             | ❌     |
| DSEE                          | ✅             | ❌     |

<br>
### Sony WH-1000XM2

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Battery Level                 | Single         | ❌     |
| Ambient Mode                  | ✅             | ❌     |
| Anc Mode                      | ✅             | ❌     |
| Voice Notifications           | ✅             | ❌     |
| Equalizer Six Bands           | ✅             | ❌     |
| DSEE                          | ✅             | ❌     |

<br>
### Sony WH-CH720N

| Feature                       | Supported      | Tested |
|:-----------------------------:|:--------------:|:------:|
| Battery Level                 | Single         | ❌     |
| Ambient Mode                  | ✅             | ❌     |
| Anc Mode                      | ✅             | ❌     |
| Noise Control Button Mode     | ✅             | ❌     |
| Auto Power Off When Taken Off | ✅             | ❌     |
| Voice Notifications           | ✅             | ❌     |
| Equalizer Six Bands           | ✅             | ❌     |
| DSEE                          | ✅             | ❌     |


### WF-1000XM5

| Feature                       | Supported | Tested |
|:-----------------------------:|:---------:|:------:|
| Battery Level                 | L, R, Case| ✅     |
| Ambient Mode                  | ✅        | ✅     |
| Speak To Chat Config          | ✅        | ✅     |
| Voice Notifications           | ✅        | ✅     |
| Pause When Taken Off          | ✅        | ✅     |
| Auto Power Off When Taken Off | ✅        | ✅     |
| Equalizer Six Bands           | ✅        | ✅     |
| Upscaling (DSEE)              | ✅        | ✅     |

<br>

### WF-1000XM4

| Feature                       | Supported | Tested |
|:-----------------------------:|:---------:|:------:|
| Battery Level                 | L, R, Case| ❌     |
| Ambient Mode                  | ✅        | ❌     |
| Anc Mode                      | ✅        | ❌     |
| Pause When Taken Off          | ✅        | ❌     |
| Auto Power Off When Taken Off | ✅        | ❌     |
| Equalizer Six Bands           | ✅        | ❌     |
| Upscaling (DSEE)              | ✅        | ❌     |

<br>

### WF-1000XM3

| Feature                       | Supported | Tested |
|:-----------------------------:|:---------:|:------:|
| Battery Level                 | L, R, Case| ❌     |
| Ambient Mode                  | ✅        | ❌     |
| Anc Mode                      | ✅        | ❌     |
| Voice Notifications           | ✅        | ❌     |
| Pause When Taken Off          | ✅        | ❌     |
| Auto Power Off When Taken Off | ✅        | ❌     |
| Equalizer Six Bands           | ✅        | ❌     |
| Upscaling (DSEE)              | ✅        | ❌     |

<br>

### WF-C710N

| Feature                       | Supported | Tested |
|:-----------------------------:|:---------:|:------:|
| Battery Level                 | Dual2+Case | No    |
| Ambient Mode                  | ✅        | ❌     |
| Anc Mode                      | ✅        | ❌     |
| Equalizer Six Bands           | ✅        | ❌     |
| Upscaling (DSEE)              | ✅        | ❌     |

<br>

### WF-C700N

| Feature                       | Supported | Tested |
|:-----------------------------:|:---------:|:------:|
| Battery Level                 | Dual2+Case | No    |
| Ambient Mode                  | ✅        | ❌     |
| Anc Mode                      | ✅        | ❌     |
| Auto Power Off When Taken Off | ✅        | ❌     |
| Equalizer Six Bands           | ✅        | ❌     |
| Upscaling (DSEE)              | ✅        | ❌     |

<br>

### WF-C510

| Feature                       | Supported | Tested |
|:-----------------------------:|:---------:|:------:|
| Battery Level                 | L, R, Case| ❌     |
| Ambient Mode                  | ✅        | ❌     |
| Voice Notifications           | ✅        | ❌     |
| Equalizer Six Bands           | ✅        | ❌     |
| Upscaling (DSEE)              | ✅        | ❌     |

<br>

### WF-C500

| Feature                       | Supported | Tested |
|:-----------------------------:|:---------:|:------:|
| Battery Level                 | L, R,     | ❌     |
| Voice Notifications           | ✅        | ❌     |
| Equalizer Six Bands           | ✅        | ❌     |
| Upscaling (DSEE)              | ✅        | ❌     |

<br>

### WI-C100

| Feature                       | Supported | Tested |
|:-----------------------------:|:---------:|:------:|
| Battery Level                 | Single    | ❌     |
| Voice Notifications           | ✅        | ❌     |
| Equalizer Six Bands           | ✅        | ❌     |
| Upscaling (DSEE)              | ✅        | ❌     |

<br>

### WF-SP800N

| Feature                       | Supported | Tested |
|:-----------------------------:|:---------:|:------:|
| Battery Level                 | L, R, Case| ❌     |
| Ambient Mode                  | ✅        | ❌     |
| Anc Mode                      | ✅        | ❌     |
| Voice Notifications           | ✅        | ❌     |
| Pause When Taken Off          | ✅        | ❌     |
| Auto Power Off When Taken Off | ✅        | ❌     |
| Equalizer Six Bands           | ✅        | ❌     |

<br>

### Sony ULT / ULT WEAR

| Feature                       | Supported | Tested |
|:-----------------------------:|:---------:|:------:|
| Battery Level                 | Single    | ❌     |
| Ambient Mode                  | ✅        | ❌     |
| Voice Notifications           | ✅        | ❌     |
| Pause When Taken Off          | ✅        | ❌     |

<br>

### WH-XB910N

| Feature                       | Supported | Tested |
|:-----------------------------:|:---------:|:------:|
| Battery Level                 | Single    | ❌     |
| Ambient Mode                  | ✅        | ❌     |
| Anc Mode                      | ✅        | ❌     |
| Voice Notifications           | ✅        | ❌     |
| Pause When Taken Off          | ✅        | ❌     |
| Auto Power Off When Taken Off | ✅        | ❌     |
| Equalizer Six Bands           | ✅        | ❌     |

<br>

### WI-SP600N

| Feature                       | Supported | Tested |
|:-----------------------------:|:---------:|:------:|
| Battery Level                 | Single    | ❌     |
| Ambient Mode                  | ✅        | ❌     |
| Anc Mode                      | ✅        | ❌     |
| Voice Notifications           | ✅        | ❌     |
| Equalizer Six Bands           | ✅        | ❌     |

### LinkBuds

| Feature                       | Supported | Tested |
|:-----------------------------:|:---------:|:------:|
| Battery Level                 | L, R, Case| ❌     |
| Speak To Chat Config          | ✅        | ❌     |
| Voice Notifications           | ✅        | ❌     |
| Pause When Taken Off          | ✅        | ❌     |
| Auto Power Off When Taken Off | ✅        | ❌     |
| Equalizer Six Bands           | ✅        | ❌     |
| Upscaling (DSEE)              | ✅        | ❌     |

<br>

### LinkBuds S

| Feature                       | Supported | Tested |
|:-----------------------------:|:---------:|:------:|
| Battery Level                 | L, R, Case| ❌     |
| Ambient Mode                  | ✅        | ❌     |
| Speak To Chat Config          | ✅        | ❌     |
| Voice Notifications           | ✅        | ❌     |
| Pause When Taken Off          | ✅        | ❌     |
| Auto Power Off When Taken Off | ✅        | ❌     |
| Equalizer Six Bands           | ✅        | ❌     |
| Upscaling (DSEE)              | ✅        | ❌     |

<br>

