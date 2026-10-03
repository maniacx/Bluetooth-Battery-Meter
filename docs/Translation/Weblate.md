---
layout: default
title: Weblate Guide
nav_order: 1
parent: Translation
permalink: /weblate-guide
---
<style>
    .button1-fixed-width {
        width:120px;
    }
    .button2-fixed-width {
        width:180px;
    }
</style>

# Weblate Guide

Click the Weblate logo below to open the BudsLink project on Weblate.

[<img src="{{ 'assets/images/translation/weblate-logo.png' | relative_url }}" width="40%" target="_blank">](https://hosted.weblate.org/engage/budslink/)

## Getting Started

<img src="{{ 'assets/images/translation/weblate-guide/weblate-budslink.png' | relative_url }}" width="100%" alt="BudsLink project on Weblate">

Sign in to Weblate using your GitHub account, or choose another supported sign-in method, such as GitLab. You can also create a Weblate account manually.

<img src="{{ 'assets/images/translation/weblate-guide/weblate-signin.png' | relative_url }}" width="100%" alt="Weblate sign-in">

Navigate to the BudsLink project.

<img src="{{ 'assets/images/translation/weblate-guide/weblate-project.png' | relative_url }}" width="100%" alt="BudsLink project">

Select the language you want to translate.

<img src="{{ 'assets/images/translation/weblate-guide/weblate-language.png' | relative_url }}" width="100%" alt="Select language">

This will show the translation strings for the entire project. The BudsLink project consists of the following components:
BudsLink Flatpak app strings
Bluetooth Battery Meter GNOME Extension strings
BudsLink-Companion Plasma Widget strings
BudsLink-Companion Cinnamon Applet strings

Translators are encouraged to help translate the entire project so that all BudsLink components can be localized.

If you only want to translate a specific component, such as the Bluetooth Battery Meter GNOME Extension, navigate to the corresponding component.

<img src="{{ 'assets/images/translation/weblate-guide/weblate-component.png' | relative_url }}" width="100%" alt="Select a Weblate component">

Select the language you want to translate.

<img src="{{ 'assets/images/translation/weblate-guide/weblate-language.png' | relative_url }}" width="100%" alt="Select language">

Click "Translate".

<img src="{{ 'assets/images/translation/weblate-guide/weblate-translate.png' | relative_url }}" width="100%" alt="Translate button">

Enter your translation in the translation field.

<img src="{{ 'assets/images/translation/weblate-guide/weblate-string.png' | relative_url }}" width="100%" alt="Translation field">

Alternatively, you can use an automatic suggestion if it is correct.

<img src="{{ 'assets/images/translation/weblate-guide/weblate-suggestion.png' | relative_url }}" width="100%" alt="Automatic translation suggestion">

Click "Save and continue" to save your translation and move to the next string.

When you are finished translating, you can simply leave Weblate. There is no need to manually commit or upload your translations. Weblate will automatically push the changes to the BudsLink GitHub repository after 24 hours and create a pull request for the project author to review and accept.
