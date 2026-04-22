---
layout: default
title: Nothing / CMF Buds
parent: Preferences
nav_order: 9
permalink: /preferences/nothingcmf
---


## Nothing / CMF Buds
<br>
<br>

**Nothing / CMF Buds Popup**
<br>
<img src="{{ 'assets/images/preferences/nothing/nothing-popup.png' | relative_url }}" width="35%">

* The popup can appear in multiple modes: On-Hover, Panel Button, and/or Bluetooth Submenu.
* It shows a circular battery widget, supporting either a single battery (headset) or three separate levels for Left, Right, and Case.
* The case battery is shown only when the buds report it, usually when the case is charging or when at least one bud is inside.


**Nothing / CMF**

* Only certain Nothing / CMF models support ANC mode.
* Some models support ANC but not Ambient mode.
* Some models also support Conversation Mode.

### Icons:

Anti-Noise Cancellation (ANC)

|:-:|:-:|
| <img src="{{ 'assets/images/preferences/airpods/anc-off.png' | relative_url }}" width="15%"> | Anti-Noise Cancellation Off  |
| <img src="{{ 'assets/images/preferences/airpods/anc-on.png' | relative_url }}" width="15%"> | Anti-Noise Cancellation On |
| <img src="{{ 'assets/images/preferences/airpods/transperancy.png' | relative_url }}" width="15%"> | Ambient |
| <img src="{{ 'assets/images/preferences/airpods/adaptive.png' | relative_url }}" width="15%"> | Adaptive |



**Nothing / CMF Preferences**
<br>
<img src="{{ 'assets/images/preferences/nothing/nothing-prefs.png' | relative_url }}" width="100%">

When enabled, the system can detect Nothing / CMF headphones/earbuds among connected Bluetooth devices. It communicates over RFCOMM sockets to support features such as:

* Battery level reporting
* Control of ANC (Active Noise Cancellation) mode (if supported)
* Other feature such as Equalizer, Listening Modes, etc

 
## Configuration by Device

Configure per device settings if supported

<img src="{{ 'assets/images/preferences/nothing/nothing-configure.png' | relative_url }}" width="80%">

## Icon selection

Choose which icon style to display in the panel and quick menu:
* Device icons: Select from the available options for your headset type (single-battery or dual-battery devices).
* Case icon: For models that report a case battery, an additional case icon can be selected.

## Other settings:
Other settings are self explanatory similar to settings available in Nothing X app.

## Compatibility
Some devices have not yet been tested and may show incorrect features in the configuration. Others may be missing entirely. If you notice missing devices or incorrect feature mappings, please open an issue on GitHub so we can add or correct them.

Currently tested and confirmed working:
* **CMF Buds 2 Plus**  ✅ — Credits: ArcticDev78
* **Nothing Headphone (1)**  ✅ — Credits: Lascar_s@matrix

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

# Compatibility List

---

## Ear (2) (B155)

| Feature | Supported | Tested |
|:--|:--:|:--:|
| Battery Level | Left+Right+Case | ❌ |
| Noise Control | ✅ | ❌ |
| Noise Control Level | Low, Mid, High | ❌ |
| Noise Control Adaptive | ✅ | ❌ |
| Personalized ANC | ✅ | ❌ |
| Eq Preset | ✅ | ❌ |
| Eq Custom | Not Implemented | ❌ |
| In Ear Detection | ✅ | ❌ |
| Low Latency Mode | ✅ | ❌ |
| Find My Buds | ✅ | ❌ |
| Gesture | ✅ | ❌ |

---

## Ear (Stick) (B157)

| Feature | Supported | Tested |
|:--|:--:|:--:|
| Battery Level | Left+Right+Case | ❌ |
| Noise Control | ✅ | ❌ |
| Eq Preset | ✅ | ❌ |
| Eq Custom | Not Implemented | ❌ |
| In Ear Detection | ✅ | ❌ |
| Low Latency Mode | ✅ | ❌ |
| Gesture | ✅ | ❌ |

---

## Nothing Ear (A) (B162)

| Feature | Supported | Tested |
|:--|:--:|:--:|
| Battery Level | Left+Right+Case | ❌ |
| Noise Control | ✅ | ❌ |
| Noise Control Level | Low, Mid, High | ❌ |
| Noise Control Adaptive | ✅ | ❌ |
| Eq Preset | ✅ | ❌ |
| Eq Custom | Not Implemented | ❌ |
| Enhanced Bass | ✅ | ❌ |
| In Ear Detection | ✅ | ❌ |
| Low Latency Mode | ✅ | ❌ |
| Gesture | ✅ | ❌ |

---

## Buds Pro (B163)

| Feature | Supported | Tested |
|:--|:--:|:--:|
| Battery Level | Left+Right+Case | ❌ |
| Noise Control | ✅ | ❌ |
| Noise Control Level | Low, Mid, High | ❌ |
| Eq Preset | ✅ | ❌ |
| Eq Custom | Not Implemented | ❌ |
| In Ear Detection | ✅ | ❌ |
| Low Latency Mode | ✅ | ❌ |
| Find My Buds | ✅ | ❌ |
| Gesture | ✅ | ❌ |

---

## Neckband Pro (B164)

| Feature | Supported | Tested |
|:--|:--:|:--:|
| Battery Level | Single | ❌ |
| Noise Control | ✅ | ❌ |
| Noise Control Level | Low, Mid, High | ❌ |
| Noise Control Adaptive | ✅ | ❌ |
| Eq Preset | ✅ | ❌ |
| Eq Custom | Not Implemented | ❌ |
| Enhanced Bass | ✅ | ❌ |
| Spatial Audio | ✅ | ❌ |
| Low Latency Mode | ✅ | ❌ |
| Find My Buds | ✅ | ❌ |
| Gesture | ✅ | ❌ |

---

## CMF Buds (B168)

| Feature | Supported | Tested |
|:--|:--:|:--:|
| Battery Level | Left+Right+Case | ❌ |
| Noise Control | ✅ | ❌ |
| Eq Preset | ✅ | ❌ |
| Eq Custom | Not Implemented | ❌ |
| Enhanced Bass | ✅ | ❌ |
| In Ear Detection | ✅ | ❌ |
| Low Latency Mode | ✅ | ❌ |
| Find My Buds | ✅ | ❌ |
| Gesture | ✅ | ❌ |

---

## Nothing Headphone (1) (B170)

| Feature | Supported | Tested |
|:--|:--:|:--:|
| Battery Level | Single | ✅ |
| Noise Control | ✅ | ✅ |
| Noise Control Level | Low, Mid, High | ✅ |
| Noise Control Adaptive | ✅ | ✅ |
| Eq Preset | ✅ | ✅ |
| Eq Custom | Not Implemented | ❌ |
| Enhanced Bass | ✅ | ✅ |
| Spatial Audio | ✅ | ✅ |
| In Ear Detection | ✅ | ❌ |
| Low Latency Mode | ✅ | ✅ |
| Find My Buds | ✅ | ✅ |
| Gesture | ✅ | ✅ |

---

## Nothing Ear (B171)

| Feature | Supported | Tested |
|:--|:--:|:--:|
| Battery Level | Left+Right+Case | ❌ |
| Noise Control | ✅ | ❌ |
| Noise Control Level | Low, Mid, High | ❌ |
| Noise Control Adaptive | ✅ | ❌ |
| Personalized ANC | ✅ | ❌ |
| Eq Preset | ✅ | ❌ |
| Eq Custom | Not Implemented | ❌ |
| Enhanced Bass | ✅ | ❌ |
| In Ear Detection | ✅ | ❌ |
| Low Latency Mode | ✅ | ❌ |
| Gesture | ✅ | ❌ |

---

## CMF Buds Pro 2 (B172)

| Feature | Supported | Tested |
|:--|:--:|:--:|
| Battery Level | Left+Right+Case | ❌ |
| Noise Control | ✅ | ❌ |
| Noise Control Level | Low, Mid, High | ❌ |
| Noise Control Adaptive | ✅ | ❌ |
| Eq Preset | ✅ | ❌ |
| Eq Custom | Not Implemented | ❌ |
| Enhanced Bass | ✅ | ❌ |
| Spatial Audio | ✅ | ❌ |
| In Ear Detection | ✅ | ❌ |
| Low Latency Mode | ✅ | ❌ |
| Find My Buds | ✅ | ❌ |
| Gesture | ✅ | ❌ |

---

## Nothing Ear (3) (B173)

| Feature | Supported | Tested |
|:--|:--:|:--:|
| Battery Level | Left+Right+Case | ❌ |
| Noise Control | ✅ | ❌ |
| Noise Control Level | Low, Mid, High | ❌ |
| Noise Control Adaptive | ✅ | ❌ |
| Personalized ANC | ✅ | ❌ |
| Eq Preset | ✅ | ❌ |
| Eq Custom | Not Implemented | ❌ |
| Spatial Audio | ✅ | ❌ |
| In Ear Detection | ✅ | ❌ |
| Low Latency Mode | ✅ | ❌ |
| Gesture | ✅ | ❌ |

---

## Nothing Ear (Open) (B174)

| Feature | Supported | Tested |
|:--|:--:|:--:|
| Battery Level | Left+Right+Case | ❌ |
| Eq Preset | ✅ | ❌ |
| Eq Custom | Not Implemented | ❌ |
| Low Latency Mode | ✅ | ❌ |

---

## CMF Headphone Pro (B175)

| Feature | Supported | Tested |
|:--|:--:|:--:|
| Battery Level | Single | ❌ |
| Noise Control | ✅ | ❌ |
| Noise Control Level | Low, Mid, High | ❌ |
| Noise Control Adaptive | ✅ | ❌ |
| Eq Preset | ✅ | ❌ |
| Eq Custom | Not Implemented | ❌ |
| Enhanced Bass | ✅ | ❌ |
| Spatial Audio | ✅ | ❌ |
| In Ear Detection | ✅ | ❌ |
| Low Latency Mode | ✅ | ❌ |
| Find My Buds | ✅ | ❌ |
| Gesture | ✅ | ❌ |

---

## CMF Buds 2 (B179)

| Feature | Supported | Tested |
|:--|:--:|:--:|
| Battery Level | Left+Right+Case | ❌ |
| Noise Control | ✅ | ❌ |
| Noise Control Level | Low, Mid, High | ❌ |
| Noise Control Adaptive | ✅ | ❌ |
| Eq Preset | ✅ | ❌ |
| Eq Custom | Not Implemented | ❌ |
| Enhanced Bass | ✅ | ❌ |
| Spatial Audio | ✅ | ❌ |
| Low Latency Mode | ✅ | ❌ |
| Find My Buds | ✅ | ❌ |
| Gesture | ✅ | ❌ |

---

## Nothing Ear (1) (B181)

| Feature | Supported | Tested |
|:--|:--:|:--:|
| Battery Level | Left+Right+Case | ❌ |
| Noise Control | ✅ | ❌ |
| Noise Control Level | Low, High | ❌ |
| Eq Preset | ✅ | ❌ |
| Low Latency Mode | ✅ | ❌ |
| Gesture | ✅ | ❌ |

---

## Nothing Ear (a) (B183)

| Feature | Supported | Tested |
|:--|:--:|:--:|
| Battery Level | Left+Right+Case | ❌ |
| Noise Control | ✅ | ❌ |
| Noise Control Level | Low, Mid, High | ❌ |
| Noise Control Adaptive | ✅ | ❌ |
| Eq Preset | ✅ | ❌ |
| Eq Custom | Not Implemented | ❌ |
| Enhanced Bass | ✅ | ❌ |
| In Ear Detection | ✅ | ❌ |
| Low Latency Mode | ✅ | ❌ |
| Gesture | ✅ | ❌ |

---

## CMF Buds 2 Plus (B184)

| Feature | Supported | Tested |
|:--|:--:|:--:|
| Battery Level | Left+Right+Case | ❌ |
| Noise Control | ✅ | ✅ |
| Noise Control Level | Low, Mid, High | ✅ |
| Noise Control Adaptive | ✅ | ✅ |
| Eq Preset | ✅ | ✅ |
| Eq Custom | Not Implemented | ✅ |
| Enhanced Bass | ✅ | ✅ |
| Spatial Audio | ✅ | ✅ |
| In Ear Detection | ✅ | ✅ |
| Low Latency Mode | ✅ | ✅ |
| Find My Buds | ✅ | ❌ |
| Gesture | ✅ | ✅ |

---

## CMF Buds 2a (B185)

| Feature | Supported | Tested |
|:--|:--:|:--:|
| Battery Level | Left+Right+Case | ❌ |
| Noise Control | ✅ | ❌ |
| Eq Preset | ✅ | ❌ |
| Eq Custom | Not Implemented | ❌ |
| Enhanced Bass | ✅ | ❌ |
| Low Latency Mode | ✅ | ❌ |
| Find My Buds | ✅ | ❌ |
| Gesture | ✅ | ❌ |

---

## CMF Buds Pro 2 (B187)

| Feature | Supported | Tested |
|:--|:--:|:--:|
| Battery Level | Left+Right+Case | ❌ |
| Noise Control | ✅ | ❌ |
| Noise Control Level | Low, Mid, High | ❌ |
| Noise Control Adaptive | ✅ | ❌ |
| Eq Preset | ✅ | ❌ |
| Eq Custom | Not Implemented | ❌ |
| Enhanced Bass | ✅ | ❌ |
| Spatial Audio | ✅ | ❌ |
| In Ear Detection | ✅ | ❌ |
| Low Latency Mode | ✅ | ❌ |
| Find My Buds | ✅ | ❌ |
| Gesture | ✅ | ❌ |
