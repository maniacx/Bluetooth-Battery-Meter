#!/bin/bash

# Script to update main.pot and *.po files
#
# This Script is released under GPL v3 license
# Copyright (C) 2020-2022 Javad Rahmatzadeh

ALL_FILES=$(find lib preferences ui -type f \( -name '*.js' -o -name '*.ui' \))


xgettext \
    --add-comments="Translators:" \
    --from-code=UTF-8 \
    --copyright-holder="maniacx@github.com" \
    --package-name="Bluetooth Battery Meter" \
    --output="po/Bluetooth-Battery-Meter.pot" \
    $ALL_FILES

for file in po/*.po
do
    echo -n "Updating $(basename "$file" .po)"
    msgmerge --backup=off --update --no-fuzzy-matching "$file" po/Bluetooth-Battery-Meter.pot
  
    if grep --silent "#, fuzzy" "$file"; then
        fuzzy+=("$(basename "$file" .po)")
    fi
    
    echo $file
done

if [[ -v fuzzy ]]; then
    echo "WARNING: Translations have unclear strings and need an update: ${fuzzy[*]}"
fi
