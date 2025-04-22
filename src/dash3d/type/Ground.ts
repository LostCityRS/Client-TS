import Linkable from '#/datastruct/Linkable.js';

import GroundDecor from '#/dash3d/type/GroundDecor.js';
import Location from '#/dash3d/type/Location.js';
import ObjStack from '#/dash3d/type/ObjStack.js';
import TileOverlay from '#/dash3d/type/TileOverlay.js';
import TileUnderlay from '#/dash3d/type/TileUnderlay.js';
import Wall from '#/dash3d/type/Wall.js';
import Decor from '#/dash3d/type/Decor.js';

import { TypedArray1d } from '#/util/Arrays.js';
import { LocSpans } from '#/dash3d/LocSpans.ts';

export default class Ground extends Linkable {
    // constructor
    groundLevel: number;
    readonly x: number;
    readonly z: number;
    readonly occludeLevel: number;
    readonly locs: (Location | null)[];
    readonly locSpan: Int32Array;

    // runtime
    underlay: TileUnderlay | null = null;
    overlay: TileOverlay | null = null;
    wall: Wall | null = null;
    decor: Decor | null = null;
    groundDecor: GroundDecor | null = null;
    objStack: ObjStack | null = null;
    bridge: Ground | null = null;
    locCount: number = 0;
    locSpans: number = LocSpans.NONE;
    drawLevel: number = 0;
    groundVisible: boolean = false;
    update: boolean = false;
    containsLocs: boolean = false;
    checkLocSpans: number = LocSpans.NONE;
    blockLocSpans: number = LocSpans.NONE;
    inverseBlockLocSpans: number = LocSpans.NONE;
    backWallTypes: number = LocSpans.NONE;

    constructor(level: number, x: number, z: number) {
        super();
        this.occludeLevel = this.groundLevel = level;
        this.x = x;
        this.z = z;
        this.locs = new TypedArray1d(5, null);
        this.locSpan = new Int32Array(5);
    }
}
