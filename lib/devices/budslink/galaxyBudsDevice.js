'use strict';

export const SamsungMepSppUUID = 'f8620674-a1ed-41ab-a8b9-de9ad655729d';

export function isGalaxyBuds(uuids) {
    return uuids.includes(SamsungMepSppUUID);
}
