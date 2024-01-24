---
layout: default
title: Crowdin Guide
nav_order: 1
parent: Translation
permalink: /crowdin-guide
---
<style>
    .button1-fixed-width {
        width:220px;
    }
    .button2-fixed-width {
        width:180px;
    }
</style>

# Crowdin Guide

This guide covers the use of Crowdin for translating the Bluetooth-Battery-Meter project. Click below button move to crowdin site for this project.

[Bluetooth-Battery-Meter](https://crowdin.com/project/bluetooth-battery-meter){: .btn .btn-green .v-align-bottom .fs-2 .button1-fixed-width}

{: .note }
>
> **Translation for GNOME42-44 branch**
> * Due to limitation of free crowdin subscription plan, GNOME42-44 branch is not available on crowdin.
> * GNOME45 and GNOME42-44 have the same strings, but GNOME42-44  have 4 additional string and they are already translated (taken from Gnome-shell).
> * To submit translation fro GNOME42-44 branch, 
>   * Translate the strings on crowdin and  submit a Pull Request to  GNOME45 branch and I will cherry-pick it to GNOME42-44 branch
>   * Or use Poedit guide, update the string using POT and submit a pull request on GNOME42-44 branch

## Start Translating

### Example: Translating to French

---
### 1. Open the project from the link above and `Join`
<img src="./assets/images/translation/crowdin-guide/join.png" width="100%">

---
### 2. Choose the Language to Translate

{: .note }
> Translators cannot add new languages to the project.
> If the language you wish to translate to is not listed, [Raise an issue on Github](https://github.com/maniacx/Bluetooth-Battery-Meter/issues){: .btn .btn-purple .v-align-bottom .fs-2} to request its addition.

<img src="./assets/images/translation/crowdin-guide/choose-language.png" width="100%">

---
### 3. Click on `Translate All`
<img src="./assets/images/translation/crowdin-guide/translate-all.png" width="100%">

---
### 4. Select the string to translate. 
### 5. Choose an appropriate suggested translation or type your translation in the box.
### 6. Once string translations are done, use the back button on the top-left corner.
<img src="./assets/images/translation/crowdin-guide/translate-board.png" width="100%">

---
### 7. Click on the 3-dot menu and select `Download`
<img src="./assets/images/translation/crowdin-guide/download.png" width="100%">

---
### 8. Once downloaded (e.g., `fr.po` for French), create a Pull Request to upload it on GitHub.
[Pull Request Guide](./pull-request-guide){: .btn .btn-purple .button2-fixed-width}<br>

