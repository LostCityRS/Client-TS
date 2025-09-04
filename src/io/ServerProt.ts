export const enum ServerProt {
    // interfaces
    IF_OPENCHAT = 189,
    IF_OPENMAIN_SIDE = 207,
    IF_CLOSE = 214,
    IF_SETTAB = 200,
    IF_OPENMAIN = 10,
    IF_OPENSIDE = 176,
    IF_SETTAB_ACTIVE = 56,

    // updating interfaces
    IF_SETCOLOUR = 78,
    IF_SETHIDE = 123,
    IF_SETOBJECT = 164,
    IF_SETMODEL = 245,
    IF_SETANIM = 219,
    IF_SETPLAYERHEAD = 108,
    IF_SETTEXT = 154,
    IF_SETNPCHEAD = 129,
    IF_SETPOSITION = 241,

    // tutorial area
    TUT_FLASH = 168,
    TUT_OPEN = 174,

    // inventory
    UPDATE_INV_STOP_TRANSMIT = 162,
    UPDATE_INV_FULL = 72,
    UPDATE_INV_PARTIAL = 132,

    // camera control
    CAM_LOOKAT = 222,
    CAM_SHAKE = 50,
    CAM_MOVETO = 12,
    CAM_RESET = 53,

    // entity updates
    NPC_INFO = 244,
    PLAYER_INFO = 86,

    // input tracking
    FINISH_TRACKING = 60,
    ENABLE_TRACKING = 22,

    // social
    MESSAGE_GAME = 95,
    UPDATE_IGNORELIST = 7,
    CHAT_FILTER_SETTINGS = 9,
    MESSAGE_PRIVATE = 30,
    UPDATE_FRIENDLIST = 70,

    // misc
    UNSET_MAP_FLAG = 62,
    UPDATE_RUNWEIGHT = 160,
    HINT_ARROW = 49,
    UPDATE_REBOOT_TIMER = 85,
    UPDATE_STAT = 24,
    UPDATE_RUNENERGY = 177,
    RESET_ANIMS = 242,
    UPDATE_PID = 210,
    LAST_LOGIN_INFO = 44,
    LOGOUT = 17,
    P_COUNTDIALOG = 152,
    SET_MULTIWAY = 97,

    // maps
    REBUILD_NORMAL = 165,

    // vars
    VARP_SMALL = 236,
    VARP_LARGE = 226,
    RESET_CLIENT_VARCACHE = 87,

    // audio
    SYNTH_SOUND = 151,
    MIDI_SONG = 240,
    MIDI_JINGLE = 173,

    // zones
    UPDATE_ZONE_PARTIAL_FOLLOWS = 94,
    UPDATE_ZONE_FULL_FOLLOWS = 131,
    UPDATE_ZONE_PARTIAL_ENCLOSED = 233,

    // zone protocol
    LOC_MERGE = 29,
    LOC_ANIM = 155,
    OBJ_DEL = 39,
    OBJ_REVEAL = 69,
    LOC_ADD_CHANGE = 232,
    MAP_PROJANIM = 137,
    LOC_DEL = 125,
    OBJ_COUNT = 209,
    MAP_ANIM = 198,
    OBJ_ADD = 234
};

// const lengths: number[] = [];
// lengths[189] = 2;
// lengths[207] = 4;
// lengths[214] = 0;
// lengths[200] = 3;
// lengths[56] = 1;
// lengths[10] = 2;
// lengths[176] = 2;
// lengths[158] = 2;

// lengths[78] = 4;
// lengths[123] = 3;
// lengths[164] = 6;
// lengths[245] = 4;
// lengths[219] = 4;
// lengths[108] = 2;
// lengths[154] = -2;
// lengths[129] = 4;
// lengths[241] = 6;

// lengths[168] = 1;
// lengths[174] = 2;

// lengths[162] = 2;
// lengths[72] = -2;
// lengths[132] = -2;

// lengths[222] = 6;
// lengths[50] = 4;
// lengths[12] = 6;
// lengths[53] = 0;

// lengths[244] = -2;
// lengths[86] = -2;

// lengths[60] = 0;
// lengths[22] = 0;

// lengths[95] = -1;
// lengths[7] = -2;
// lengths[9] = 3;
// lengths[30] = -1;
// lengths[70] = 9;

// lengths[62] = 0;
// lengths[160] = 2;
// lengths[49] = 6;
// lengths[85] = 2;
// lengths[24] = 6;
// lengths[177] = 1;
// lengths[242] = 0;
// lengths[210] = 3;
// lengths[44] = 10;
// lengths[17] = 0;
// lengths[152] = 0;
// lengths[97] = 1;

// lengths[165] = 4;

// lengths[236] = 3;
// lengths[226] = 6;
// lengths[87] = 0;

// lengths[151] = 5;
// lengths[240] = 2;
// lengths[173] = 4;

// lengths[94] = 2;
// lengths[131] = 2;
// lengths[233] = -2;

// lengths[29] = 14;
// lengths[155] = 4;
// lengths[39] = 3;
// lengths[69] = 7;
// lengths[232] = 4;
// lengths[137] = 15;
// lengths[125] = 2;
// lengths[209] = 7;
// lengths[198] = 6;
// lengths[234] = 5;

// let organized = [];
// for (let i = 0; i < 255; i++) {
//     if (typeof lengths[i] !== 'undefined') {
//         organized[i] = lengths[i];
//     } else {
//         organized[i] = 0;
//     }
// }

// console.log(organized.slice(0, 100));
// console.log(organized.slice(100, 200));
// console.log(organized.slice(200));

// prettier-ignore
export const ServerProtSizes = [
    0, 0, 0, 0, 0, 0, 0, -2, 0, 3, 2, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0,
    0, 0, 0, 14, -1, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 10, 0, 0, 0, 0, 6, 4, 0,
    0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 7, 9, 0, -2, 0, 0, 0, 0, 0, 4,
    0, 0, 0, 0, 0, 0, 2, -2, 0, 0, 0, 0, 0, 0, 0, 2, -1, 0, 1, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 2, 0,
    0, 0, 4, 0, 2, -2, 0, 0, 0, 0, 15, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 0,
    0, -2, 4, 0, 0, 2, 0, 2, 0, 2, 0, 6, 4, 0, 0, 1, 0, 0, 0, 0, 4, 2, 0, 2, 1, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0,
    3, 0, 0, 0, 0, 0, 0, 4, 0, 7, 3, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 0, 6, 0, 0, 0, 6,
    0, 0, 0, 0, 0, 4, -2, 5, 0, 3, 0, 0, 0, 2, 6, 0, 0, -2, 4, 0, 0, 0, 0, 0, 0, 0,
    0, 0
];
