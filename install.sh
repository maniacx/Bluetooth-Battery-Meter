#!/usr/bin/env bash

# Change working directory to project folder
cd "${0%/*}"

EXT_NAME="Bluetooth Battery Meter"
EXT_UUID="Bluetooth-Battery-Meter@maniacx.github.com"
BUILD_VERSION=""

bump_version() {
    local current_version new_version temp_metadata
    current_version=$(jq -r '.version' metadata.json)
    if ! [[ "$current_version" =~ ^[0-9]+$ ]]; then
        echo "metadata.json has an invalid extension version: $current_version"
        exit 1
    fi

    new_version=$((current_version + 1))
    temp_metadata=$(mktemp)
    jq --argjson version "$new_version" '.version = $version' metadata.json > "$temp_metadata"
    mv "$temp_metadata" metadata.json
    BUILD_VERSION="$new_version"
    echo "Building extension version $new_version..."
}

if ! command -v msgfmt &> /dev/null
then
    echo "Missing gettext!!!"
    echo "Please install gettext and re-run this installer."
    echo "Press any key to exit..."
    read -n1
    exit 1
fi

echo "Running headless tests..."
if ! tests/run-tests.sh; then
    echo "Tests failed. Extension packaging was skipped."
    echo "Press any key to exit..."
    read -n1
    exit 1
fi

bump_version

echo "Packing extension..."
gnome-extensions pack ./ \
    --extra-source=icons/ \
    --extra-source=lib/ \
    --extra-source=preferences/ \
    --extra-source=ui/ \
    --extra-source=script/ \
    --podir=po \
    --force \

if [ $? -ne 0 ]; then 
    echo "Error occur during compilation of Gnome Extension ${EXT_NAME}."
    echo "Press any key to exit..."
    read -n1
    exit $?
fi

echo "Installing extension..."
gnome-extensions install $EXT_UUID.shell-extension.zip --force

if [ $? -ne 0 ]; then 
    read -n1
    exit $?
fi

echo "Gnome Extension $EXT_NAME version $BUILD_VERSION was installed."
echo "Log out and log back in to load the new extension code."
echo "Then verify ${TMPDIR:-/tmp}/bluetooth_battery_meter/service.log contains version=$BUILD_VERSION."
exit 0
