export const enum LocSpans {
    NONE = 0x0,
    WEST = 0x1,
    NORTH = 0x2,
    EAST = 0x4,
    SOUTH = 0x8,
    // ----
    CORNER_WEST = 0x10,
    CORNER_NORTH = 0x20,
    CORNER_EAST = 0x40,
    CORNER_SOUTH = 0x80,
    // ----
    DECOR_OFFSET = 0x100,
    DECOR_NOOFFSET = 0x200,
    DECOR_BOTH = 0x300,
}