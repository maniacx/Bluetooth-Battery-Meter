import {
    GalaxyBudsModel, BudsUUID, BudsLegacyUUID, DeviceIdPrefixUUID
} from './galaxyBudsConfig.js';

export function checkForSamsungBuds(uuids, name) {
    if (uuids.includes(BudsLegacyUUID))
        return GalaxyBudsModel.GalaxyBuds;

    if (!uuids.includes(BudsUUID))
        return null;

    let model = null;

    const coloredGuid = uuids.find(g => g.startsWith(DeviceIdPrefixUUID));
    if (coloredGuid) {
        const hexId = coloredGuid.slice(DeviceIdPrefixUUID.length);
        if (hexId.length === 4) {
            const id = parseInt(hexId, 16);

            switch (id) {
                case 0x0102: case 0x0103: case 0x0104: case 0x0105:
                case 0x0106: case 0x0107: case 0x0108: case 0x0109:
                    model = GalaxyBudsModel.GalaxyBudsPlus;
                    break;

                case 0x0116: case 0x0117: case 0x0118:
                case 0x0119: case 0x011A: case 0x011B: case 0x011C:
                    model = GalaxyBudsModel.GalaxyBudsLive;
                    break;

                case 0x012A: case 0x012B:
                case 0x012C: case 0x012D:
                    model = GalaxyBudsModel.GalaxyBudsPro;
                    break;

                case 0x0139: case 0x013A: case 0x013B: case 0x013C:
                case 0x013D: case 0x013E: case 0x013F: case 0x0140:
                case 0x0141: case 0x3801:
                    model = GalaxyBudsModel.GalaxyBuds2;
                    break;

                case 0x0146: case 0x0147: case 0x0148:
                    model = GalaxyBudsModel.GalaxyBuds2Pro;
                    break;

                case 0x014A: case 0x014B:
                    model = GalaxyBudsModel.GalaxyBudsFe;
                    break;

                case 0x014D: case 0x014E:
                    model = GalaxyBudsModel.GalaxyBuds3;
                    break;

                case 0x0154: case 0x0155:
                    model = GalaxyBudsModel.GalaxyBuds3Pro;
                    break;
            }
        }
    }

    if (!model && name) {
        const lower = name.toLowerCase();

        if (lower.includes('buds live'))
            model = GalaxyBudsModel.GalaxyBudsLive;
        else if (lower.includes('buds pro'))
            model = GalaxyBudsModel.GalaxyBudsPro;
        else if (lower.includes('buds2 pro'))
            model = GalaxyBudsModel.GalaxyBuds2Pro;
        else if (lower.includes('buds2'))
            model = GalaxyBudsModel.GalaxyBuds2;
        else if (lower.includes('buds fe'))
            model = GalaxyBudsModel.GalaxyBudsFe;
        else if (lower.includes('buds3 pro'))
            model = GalaxyBudsModel.GalaxyBuds3Pro;
        else if (lower.includes('buds3'))
            model = GalaxyBudsModel.GalaxyBuds3;
        else if (lower.includes('galaxy buds+'))
            model = GalaxyBudsModel.GalaxyBudsPlus;
    }

    if (!model)
        return null;

    return model;
}

