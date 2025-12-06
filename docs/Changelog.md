---
layout: default
title: Changelogs
nav_order: 5
permalink: /changelogs
---

# Changelogs

{: .important-title }
> GN-45_Version 41 &emsp;&emsp; Dec 07, 2025
> * Added support for Sony. Thanks to everyone who supported in testing. Credits mentioned on Credit page.
> * BugFix: Gaurds to avoid potential crash when displaying Indicators/PanelButton
> * BugFix: Avoid use of symlinks for ConfigureWindow Desktop File and its Icon.
> * Improvements in ProfileManager using retry ConnectProfile
> * Airpods: BugFix: In-Ear Pause/Resume feature doesn't work first time when enabled.
> * Airpods: BugFix: In-ear Resume does not work on some players.
> * Airpods: Add properties only if feature supported
> * Airpods: Removed Airpods/Beats Album arts png in favor of Generic png.
> * Option to set change earbuds, headphone, case icons for Enhanced device (Airpods, Sony)
> * Ukranian translations: credit Bohdan@crowdin
> * Polish translations: credits alewicki95

{: .important-title }
> GN-45_Version 40 &emsp;&emsp; Sep 28, 2025
> * Added support for Airpods Pro 3
> * Fix bug, that would not display Airpods/Beats single device in GUI.
> * Italian translations: credits AlexFalappa

{: .important-title }
> GN-45_Version 39 &emsp;&emsp; Sep 15, 2025
> * Bug Fixes
> * Add option to display indicator without Battery Level dot/bar
> * Improved theme compatibility
> * Corrected screen reader prompts
> * Polish translations: credits alewicki95

{: .important-title }
> GN-45_Version 38 &emsp;&emsp; Sep 04, 2025
> * WidgetManager: disconnect signal / remove timeout before initiating new ones. There could be multiple instance this is called, so disconnect previous signals or remove timeout before creating new once. :Credits JustPerfection

{: .important-title }
> GN-45_Version 37 &emsp;&emsp; Aug 30, 2025
> * Used TextureCache to render device icons
> * Introduced Vertical Bar feature
> * Introduced Bluetooth Popup Menu feature
> * Enabled Panel Menu, OnHover Menu, and Bluetooth Popup Menu for all battery devices
> * Removed partial enable option for Panel Button and Indicator. Now either the Panel Button or the System Indicator can be used, not both at the same time
> * Improved UI for Popup Menu
> * Enhanced Preferences Menu
> * Added Settings button to launch the AirPods Preferences window via script
> * Added more AirPods control features: Long-press cycle configuration, press speed, long-press duration, notification tone volume, and volume swipe toggle/duration
> * Greek translations: credits Jim Spentzos dspentzos@crowdin.com
> * Ukrainian: Translation, credits Klymentii S (Mynt) myntus@crowdin.com

{: .important-title }
> GN-45_Version 36 &emsp;&emsp; Jul 26, 2025
> * ProfileManager: Registration: rely on UUID, skip manual Channel/PSM within the GNOME Shell extension.
> * Bug Fixes

{: .important-title }
> GN-45_Version 35 &emsp;&emsp; Jun 30, 2025
> * Removed the dependency on the Python script by using BlueZ's ProfileManager1 to handle socket communication directly within the GNOME Shell extension.
> * Added support for Adaptive Audio customization.

{: .important-title }
> GN-45_Version 34 &emsp;&emsp; Jun 07, 2025 (Rejected by Gnome reviewer)
> * Removed Message Tray Feature

{: .important-title }
> GN-45_Version 33 &emsp;&emsp; Jun 06, 2025 (Rejected by Gnome reviewer)
> * Added support Enhanced Devices for AirPods and GATT Battery Service (BAS) devices using python scripy
> * Added message tray, panel button, onHover, Multple Indicator widget for battery reportinh and control
> * French translation update

{: .important-title }
> GN-45_Version 30 &emsp;&emsp; Mar 02, 2025
> * metadata.json: Now compatible with GNOME48
> * Added feature to display Upower devices, such as non bluetooth mouse/keyboard

{: .note-title }
> GN-44_Version 29 &emsp;&emsp; Mar 02, 2025
> * Added feature to display Upower devices, such as non bluetooth mouse/keyboard

{: .important-title }
> GN-45_Version 28 &emsp;&emsp; Jan 22, 2025
> * Fix bug with color of indicator icon in light-style.
> * translation: Update Italian translation. Credits: AlexFalappa

{: .note-title }
> GN-44_Version 27 &emsp;&emsp; Jan 22, 2025
> * Fix bug with color of indicator icon in light-style.
> * translation: Update Italian translation. Credits: AlexFalappa

> GN-45_Version 26 &emsp;&emsp; Jan 03, 2025
> * Added option to use battery bar as level meter
> * Added option for to change device icons
> * Added option to hide / show indicator for bluetooth non battery device
> * Added option to hide bluetooth connection status indicator icon
> * Added option to sort by recency
> * translation: Update Brazilian Portuguese translation. Credits: gabriel.fwittaker@crowdin
> * translation: Update Russian translation. Credits: Toxblh
> * translation: Update Spanish translation. Credits: txelu
> * translation: Update Chinese (Traditional) translation. PeterDaveHello

{: .note-title }
> GN-44_Version 25 &emsp;&emsp; Jan 03, 2025
> * Added option to use battery bar as level meter
> * Added option for to change device icons
> * Added option to hide / show indicator for bluetooth non battery device
> * Added option to hide bluetooth connection status indicator icon
> * Added option to sort by recency
> * translation: Update Brazilian Portuguese translation. Credits: gabriel.fwittaker@crowdin
> * translation: Update Russian translation. Credits: Toxblh
> * translation: Update Spanish translation. Credits: txelu
> * translation: Update Chinese (Traditional) translation. PeterDaveHello

{: .important-title }
> GN-45_Version 22 &emsp;&emsp; Sep 15, 2024
> * Add support for Gnome-shell 47
> * translation: Update Swedish translation. Credits: jnsson@crowdin.com
> * translation: Update Chinese translation. credits: 资深小白程序猿 (ZSXB2468)@crowdin

{: .note-title }
> GN-44_Version 21 &emsp;&emsp; Sep 15, 2024
> * translation: Update Swedish translation. Credits: jnsson@crowdin.com
> * translation: Update Chinese translation. credits: 资深小白程序猿 (ZSXB2468)@crowdin

{: .important-title }
> GN-45_Version 20 &emsp;&emsp; Sep 08, 2024
> * translation: Update Occitan translation. Credits: Mejans
> * translation: Update French translation. Credits: Surfoo

{: .note-title }
> GN-44_Version 19 &emsp;&emsp; Sep 08, 2024
> * translation: Update Occitan translation. Credits: Mejans
> * translation: Update French translation. Credits: Surfoo

{: .important-title }
> GN-45_Version 18 &emsp;&emsp; Jul 05, 2024
> * Custom theme support
> * Bug fix: bluetoothIndicators: Avoid displaying battery percentage text 0% while disconnecting
> * Bug fix: bluetoothIndicators: Do not create invisible indicators if device is not connected.
> * translation: Update Russian translation. Credits: Bitals@crowdin
> * translation: Update Italian translation. Credits: albanobattistella

{: .note-title }
> GN-44_Version 17 &emsp;&emsp; Jul 05, 2024
> * Custom theme support
> * Bug fix: bluetoothIndicators: Avoid displaying battery percentage text 0% while disconnecting
> * Bug fix: bluetoothIndicators: Do not create invisible indicators if device is not connected.
> * translation: Update Russian translation. Credits: Bitals@crowdin
> * translation: Update Italian translation. Credits: albanobattistella

{: .important-title }
> GN-45_Version 16 &emsp;&emsp; Jun 16, 2024
> * Added option to show pexcentage in text next to indicator.
> * Added option to show hide battery information on quicksettings and indicators.
> * Add Phone support. Shows battery level for iphones and android phone.
> * translation: Update Swedish translation. Credits: jnsson@crowdin
> * translation: Update Hungarian translation. Credits: ViBE-HU

{: .note-title }
> GN-44_Version 15 &emsp;&emsp; Jun 16, 2024
> * Added option to show pexcentage in text next to indicator.
> * Added option to show hide battery information on quicksettings and indicators.
> * Add Phone support. Shows battery level for iphones and android phone.
> * translation: Update Swedish translation. Credits: jnsson@crowdin
> * translation: Update Hungarian translation. Credits: ViBE-HU

{: .important-title }
> GN-45_Version 14 &emsp;&emsp; Feb 15, 2024
> * translation: Update Traditional Chinese(zh_TW) translation. Credits: PeterDaveHello

{: .note-title }
> GN-44_Version 13 &emsp;&emsp; Feb 15, 2024 
> * translation: Update Traditional Chinese(zh_TW) translation. Credits: PeterDaveHello

{: .important-title }
> GN-45_Version 12 &emsp;&emsp; Feb 15, 2024
> * translation: Update pt_BR translation. Credits: tiagoFlach


{: .note-title }
> GN-44_Version 11 &emsp;&emsp; Feb 15, 2024 
> * translation: Update pt_BR translation. Credits: tiagoFlach


{: .important-title }
> GN-45_Version 10 &emsp;&emsp; Jan 30, 2024
> * disable: disconnected signal before restoring original functions
> * corrected string in prefs about section
> * translation: Add Ukrainian translation. Credits: Bohdan Shkliarenko @crowdin


{: .note-title }
> GN-44_Version 09 &emsp;&emsp; Jan 30, 2024 
> * disable: disconnected signal before restoring original functions
> * corrected string in prefs about section
> * translation: Add Ukrainian translation. Credits: Bohdan Shkliarenko @crowdin


{: .important-title }
> GN-45_Version 08 &emsp;&emsp; Jan 23, 2024
> * Align precentage text to the center when swapped with icon before text
> * Update Czech translation. Credits: PetrBalvin


{: .note-title }
> GN-44_Version 07 &emsp;&emsp; Jan 23, 2024 
> * Ported extension to GNOME 42, 43 and 44.


{: .important-title }
> GN-45_Version 06 &emsp;&emsp; Jan 20, 2024
> * Add Gnome 46 to supported shell version. Tested on GNOME46.Alpha
> * Solve bug related to desktopSetting error when extension rebasing of extension, percentange label
> * Use idle timers with PRIORITY_LOW
> * Added Hungarian translation. Credits: ViBE-HU
> * Added Czech translation. Credits: PetrBalvin
> * Added Turkish translation. Credits: sabriunal


{: .important-title }
> GN-45_Version 05 &emsp;&emsp; Jan 14, 2024
> * Popupmenu: Better fix for .get_width() warnings. Credits:GdH
> * Prefs: General, when bat level text or icon is disabled, force disable swap text icon
> * Toggle: Rebuild Popupmenu on large text accessiblity settings change
> * Another attempt to fix alignment with battery percentage text
> * With upcoming bug fix in gnome-shell, destroy indicators when device is removed


{: .important-title }
> GN-45_Version 03 &emsp;&emsp; Jan 13, 2024
> * Minor icon modification
> * Updated Occitan translation Credits:Mejans
> * Updated Italian translation Credits:albanobattistella
> * Updated Russian translation Credits:Toxblh
> * Updated Spanish translation Credits:txelu


{: .important-title }
> GN-45_Version 02 &emsp;&emsp; Jan 10, 2024
> * Fixed device not getting removed from Popupmenu when unpaired
> * Fixed alignment with battery percentage text
> * Updated About page
> * Updated translation
> * Updated Occitan translation Credits:Mejans
> * Updated Italian translation Credits:albanobattistella


{: .important-title }
> GN-45_Version 01 &emsp;&emsp; Jan 06, 2024 
> * Intial Commit


