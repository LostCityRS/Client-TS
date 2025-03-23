import { CollisionConstants } from '#/dash3d/CollisionMap.js';
import { LocAngle } from '#/dash3d/LocAngle.js';
import Occlude from '#/dash3d/Occlude.js';

import Entity from '#/dash3d/entity/Entity.js';

import GroundDecor from '#/dash3d/type/GroundDecor.js';
import Location from '#/dash3d/type/Location.js';
import ObjStack from '#/dash3d/type/ObjStack.js';
import Ground from '#/dash3d/type/Ground.js';
import TileOverlay from '#/dash3d/type/TileOverlay.js';
import { TileOverlayShape } from '#/dash3d/type/TileOverlayShape.js';
import TileUnderlay from '#/dash3d/type/TileUnderlay.js';
import Wall from '#/dash3d/type/Wall.js';
import Decor from '#/dash3d/type/Decor.js';

import LinkList from '#/datastruct/LinkList.js';

import Pix2D from '#/graphics/Pix2D.js';
import Pix3D from '#/graphics/Pix3D.js';
import Model, { VertexNormal } from '#/graphics/Model.js';

import { Int32Array3d, TypedArray1d, TypedArray2d, TypedArray3d, TypedArray4d } from '#/util/Arrays.js';
import { LocSpans } from '#/dash3d/LocSpans.ts';
import { TypecodeEntity } from '#/dash3d/TypecodeEntity.ts';
import { OccludeType } from '#/dash3d/OccludeType.ts';
import { OccludeMode } from '#/dash3d/OccludeMode.ts';

export default class World3D {
    private static visibilityMatrix: boolean[][][][] = new TypedArray4d(8, 32, 51, 51, false);
    private static locBuffer: (Location | null)[] = new TypedArray1d(100, null);
    static levelOccluderCount: Int32Array = new Int32Array(CollisionConstants.LEVELS);
    private static levelOccluders: (Occlude | null)[][] = new TypedArray2d(CollisionConstants.LEVELS, 500, null);
    private static activeOccluders: (Occlude | null)[] = new TypedArray1d(500, null);
    private static drawTileQueue: LinkList = new LinkList();

    private static cycle: number = 0;

    private static viewportLeft: number = 0;
    private static viewportTop: number = 0;
    private static viewportRight: number = 0;
    private static viewportBottom: number = 0;
    private static viewportCenterX: number = 0;
    private static viewportCenterY: number = 0;

    private static sinEyePitch: number = 0;
    private static cosEyePitch: number = 0;
    private static sinEyeYaw: number = 0;
    private static cosEyeYaw: number = 0;

    private static eyeX: number = 0;
    private static eyeY: number = 0;
    private static eyeZ: number = 0;
    private static eyeTileX: number = 0;
    private static eyeTileZ: number = 0;

    private static minDrawTileX: number = 0;
    private static maxDrawTileX: number = 0;
    private static minDrawTileZ: number = 0;
    private static maxDrawTileZ: number = 0;

    static topLevel: number = 0;
    private static tilesRemaining: number = 0;
    private static takingInput: boolean = false;

    private static visibilityMap: boolean[][] | null = null;

    static readonly FRONT_WALL_TYPES: Uint8Array = Uint8Array.of(19, 55, 38, 155, 255, 110, 137, 205, 76);
    static readonly DIRECTION_ALLOW_WALL_CORNER_TYPE: Uint8Array = Uint8Array.of(160, 192, 80, 96, 0, 144, 80, 48, 160);
    static readonly BACK_WALL_TYPES: Uint8Array = Uint8Array.of(76, 8, 137, 4, 0, 1, 38, 2, 19);

    static readonly WALL_CORNER_TYPE_16_BLOCK_LOC_SPANS: Int8Array = Int8Array.of(
        LocSpans.NONE,
        LocSpans.NONE,
        LocSpans.NORTH,
        LocSpans.NONE,
        LocSpans.NONE,
        LocSpans.NORTH,
        LocSpans.WEST,
        LocSpans.WEST,
        LocSpans.NONE,
    );

    static readonly WALL_CORNER_TYPE_32_BLOCK_LOC_SPANS: Int8Array = Int8Array.of(
        LocSpans.NORTH,
        LocSpans.NONE,
        LocSpans.NONE,
        LocSpans.NORTH,
        LocSpans.NONE,
        LocSpans.NONE,
        LocSpans.NONE,
        LocSpans.EAST,
        LocSpans.EAST,
    );

    static readonly WALL_CORNER_TYPE_64_BLOCK_LOC_SPANS: Int8Array = Int8Array.of(
        LocSpans.NONE,
        LocSpans.EAST,
        LocSpans.EAST,
        LocSpans.SOUTH,
        LocSpans.NONE,
        LocSpans.NONE,
        LocSpans.SOUTH,
        LocSpans.NONE,
        LocSpans.NONE,
    );

    static readonly WALL_CORNER_TYPE_128_BLOCK_LOC_SPANS: Int8Array = Int8Array.of(
        LocSpans.WEST,
        LocSpans.WEST,
        LocSpans.NONE,
        LocSpans.NONE,
        LocSpans.NONE,
        LocSpans.SOUTH,
        LocSpans.NONE,
        LocSpans.NONE,
        LocSpans.SOUTH,
    );


    static readonly WALL_DECORATION_INSET_X: Int8Array = Int8Array.of(53, -53, -53, 53);
    static readonly WALL_DECORATION_INSET_Z: Int8Array = Int8Array.of(-53, -53, 53, 53);
    static readonly WALL_DECORATION_OUTSET_X: Int8Array = Int8Array.of(-45, 45, 45, -45);
    static readonly WALL_DECORATION_OUTSET_Z: Int8Array = Int8Array.of(45, 45, -45, -45);

    // prettier-ignore
    static readonly MINIMAP_TILE_MASK: Int8Array[] = [
        new Int8Array(16),
        Int8Array.of(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1), // PLAIN_SHAPE
        Int8Array.of(1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1), // DIAGONAL_SHAPE
        Int8Array.of(1, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0), // LEFT_SEMI_DIAGONAL_SMALL_SHAPE
        Int8Array.of(0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 1), // RIGHT_SEMI_DIAGONAL_SMALL_SHAPE
        Int8Array.of(0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1), // LEFT_SEMI_DIAGONAL_BIG_SHAPE
        Int8Array.of(1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1), // RIGHT_SEMI_DIAGONAL_BIG_SHAPE
        Int8Array.of(1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0), // HALF_SQUARE_SHAPE
        Int8Array.of(0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0), // CORNER_SMALL_SHAPE
        Int8Array.of(1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1), // CORNER_BIG_SHAPE
        Int8Array.of(1, 1, 1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0), // FAN_SMALL_SHAPE
        Int8Array.of(0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1), // FAN_BIG_SHAPE
        Int8Array.of(0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 1, 1)  // TRAPEZIUM_SHAPE
    ];

    // prettier-ignore
    static readonly MINIMAP_TILE_ROTATION_MAP: Int8Array[] = [
        Int8Array.of(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15),
        Int8Array.of(12, 8, 4, 0, 13, 9, 5, 1, 14, 10, 6, 2, 15, 11, 7, 3),
        Int8Array.of(15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0),
        Int8Array.of(3, 7, 11, 15, 2, 6, 10, 14, 1, 5, 9, 13, 0, 4, 8, 12),
    ];

    // prettier-ignore
    static readonly TEXTURE_HSL: Int32Array = Int32Array.of(
        41, 39248, 41, 4643, 41, 41, 41, 41,
        41, 41, 41, 41, 41, 41, 41, 43086,
        41, 41, 41, 41, 41, 41, 41, 8602,
        41, 28992, 41, 41, 41, 41, 41, 5056,
        41, 41, 41, 41, 41, 41, 41, 41,
        41, 41, 41, 41, 41, 41, 3131, 41,
        41, 41
    );
    static activeOccluderCount: number = 0;
    static mouseX: number = 0;
    static mouseY: number = 0;
    static clickTileX: number = -1;
    static clickTileZ: number = -1;
    static lowMemory: boolean = true;

    static init(viewportWidth: number, viewportHeight: number, frustumStart: number, frustumEnd: number, pitchDistance: Int32Array): void {
        this.viewportLeft = 0;
        this.viewportTop = 0;
        this.viewportRight = viewportWidth;
        this.viewportBottom = viewportHeight;
        this.viewportCenterX = (viewportWidth / 2) | 0;
        this.viewportCenterY = (viewportHeight / 2) | 0;

        const matrix: boolean[][][][] = new TypedArray4d(9, 32, 53, 53, false);
        for (let pitch: number = 128; pitch <= 384; pitch += 32) {
            for (let yaw: number = 0; yaw < 2048; yaw += 64) {
                this.sinEyePitch = Pix3D.sin[pitch];
                this.cosEyePitch = Pix3D.cos[pitch];
                this.sinEyeYaw = Pix3D.sin[yaw];
                this.cosEyeYaw = Pix3D.cos[yaw];

                const pitchLevel: number = ((pitch - 128) / 32) | 0;
                const yawLevel: number = (yaw / 64) | 0;
                for (let dx: number = -26; dx <= 26; dx++) {
                    for (let dz: number = -26; dz <= 26; dz++) {
                        const x: number = dx * 128;
                        const z: number = dz * 128;

                        let visible: boolean = false;
                        for (let y: number = -frustumStart; y <= frustumEnd; y += 128) {
                            if (this.testPoint(x, z, pitchDistance[pitchLevel] + y)) {
                                visible = true;
                                break;
                            }
                        }
                        matrix[pitchLevel][yawLevel][dx + 25 + 1][dz + 25 + 1] = visible;
                    }
                }
            }
        }

        for (let pitchLevel: number = 0; pitchLevel < 8; pitchLevel++) {
            for (let yawLevel: number = 0; yawLevel < 32; yawLevel++) {
                for (let x: number = -25; x < 25; x++) {
                    for (let z: number = -25; z < 25; z++) {
                        let visible: boolean = false;
                        check_areas: for (let dx: number = -1; dx <= 1; dx++) {
                            for (let dz: number = -1; dz <= 1; dz++) {
                                if (matrix[pitchLevel][yawLevel][x + dx + 25 + 1][z + dz + 25 + 1]) {
                                    visible = true;
                                    break check_areas;
                                }

                                if (matrix[pitchLevel][(yawLevel + 1) % 31][x + dx + 25 + 1][z + dz + 25 + 1]) {
                                    visible = true;
                                    break check_areas;
                                }

                                if (matrix[pitchLevel + 1][yawLevel][x + dx + 25 + 1][z + dz + 25 + 1]) {
                                    visible = true;
                                    break check_areas;
                                }

                                if (matrix[pitchLevel + 1][(yawLevel + 1) % 31][x + dx + 25 + 1][z + dz + 25 + 1]) {
                                    visible = true;
                                    break check_areas;
                                }
                            }
                        }
                        this.visibilityMatrix[pitchLevel][yawLevel][x + 25][z + 25] = visible;
                    }
                }
            }
        }
    }

    static addOccluder(level: number, type: number, minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number): void {
        World3D.levelOccluders[level][World3D.levelOccluderCount[level]++] = new Occlude((minX / 128) | 0, (maxX / 128) | 0, (minZ / 128) | 0, (maxZ / 128) | 0, type, minX, maxX, minZ, maxZ, minY, maxY);
    }

    private static testPoint(x: number, z: number, y: number): boolean {
        const px: number = (z * this.sinEyeYaw + x * this.cosEyeYaw) >> 16;
        const tmp: number = (z * this.cosEyeYaw - x * this.sinEyeYaw) >> 16;
        const pz: number = (y * this.sinEyePitch + tmp * this.cosEyePitch) >> 16;
        const py: number = (y * this.cosEyePitch - tmp * this.sinEyePitch) >> 16;
        if (pz < 50 || pz > 3500) {
            return false;
        }
        const viewportX: number = this.viewportCenterX + (((px << 9) / pz) | 0);
        const viewportY: number = this.viewportCenterY + (((py << 9) / pz) | 0);
        return viewportX >= this.viewportLeft && viewportX <= this.viewportRight && viewportY >= this.viewportTop && viewportY <= this.viewportBottom;
    }

    // ----
    private readonly maxLevel: number;
    private readonly maxTileX: number;
    private readonly maxTileZ: number;
    private readonly levelHeightmaps: Int32Array[][];
    private readonly levelTiles: (Ground | null)[][][];
    private readonly temporaryLocs: (Location | null)[];
    private readonly levelTileOcclusionCycles: Int32Array[][];
    private readonly mergeIndexA: Int32Array;
    private readonly mergeIndexB: Int32Array;

    // runtime
    private temporaryLocCount: number = 0;
    private minLevel: number = 0;
    private tmpMergeIndex: number = 0;

    constructor(levelHeightmaps: Int32Array[][], maxTileZ: number, maxLevel: number, maxTileX: number) {
        this.maxLevel = maxLevel;
        this.maxTileX = maxTileX;
        this.maxTileZ = maxTileZ;
        this.levelTiles = new TypedArray3d(maxLevel, maxTileX, maxTileZ, null);
        this.levelTileOcclusionCycles = new Int32Array3d(maxLevel, maxTileX + 1, maxTileZ + 1);
        this.levelHeightmaps = levelHeightmaps;
        this.temporaryLocs = new TypedArray1d(5000, null);
        this.mergeIndexA = new Int32Array(10000);
        this.mergeIndexB = new Int32Array(10000);
        this.reset();
    }

    reset(): void {
        for (let level: number = 0; level < this.maxLevel; level++) {
            for (let x: number = 0; x < this.maxTileX; x++) {
                for (let z: number = 0; z < this.maxTileZ; z++) {
                    this.levelTiles[level][x][z] = null;
                }
            }
        }

        for (let l: number = 0; l < CollisionConstants.LEVELS; l++) {
            for (let o: number = 0; o < World3D.levelOccluderCount[l]; o++) {
                World3D.levelOccluders[l][o] = null;
            }

            World3D.levelOccluderCount[l] = 0;
        }

        for (let i: number = 0; i < this.temporaryLocCount; i++) {
            this.temporaryLocs[i] = null;
        }

        this.temporaryLocCount = 0;
        World3D.locBuffer.fill(null);
    }

    setMinLevel(level: number): void {
        this.minLevel = level;

        for (let stx: number = 0; stx < this.maxTileX; stx++) {
            for (let stz: number = 0; stz < this.maxTileZ; stz++) {
                this.levelTiles[level][stx][stz] = new Ground(level, stx, stz);
            }
        }
    }

    setBridge(stx: number, stz: number): void {
        const ground: Ground | null = this.levelTiles[0][stx][stz];
        for (let level: number = 0; level < 3; level++) {
            this.levelTiles[level][stx][stz] = this.levelTiles[level + 1][stx][stz];
            const tile: Ground | null = this.levelTiles[level][stx][stz];
            if (tile) {
                tile.groundLevel--;
            }
        }

        if (!this.levelTiles[0][stx][stz]) {
            this.levelTiles[0][stx][stz] = new Ground(0, stx, stz);
        }
        const tile: Ground | null = this.levelTiles[0][stx][stz];
        if (tile) {
            tile.bridge = ground;
        }
        this.levelTiles[3][stx][stz] = null;
    }

    setDrawLevel(level: number, stx: number, stz: number, drawLevel: number): void {
        const tile: Ground | null = this.levelTiles[level][stx][stz];
        if (!tile) {
            return;
        }
        tile.drawLevel = drawLevel;
    }

    setTile(
        level: number,
        x: number,
        z: number,
        shape: number,
        angle: number,
        textureId: number,
        southwestY: number,
        southeastY: number,
        northeastY: number,
        northwestY: number,
        southwestColor: number,
        southeastColor: number,
        northeastColor: number,
        northwestColor: number,
        southwestColor2: number,
        southeastColor2: number,
        northeastColor2: number,
        northwestColor2: number,
        backgroundRgb: number,
        foregroundRgb: number
    ): void {
        if (shape === TileOverlayShape.PLAIN) {
            for (let l: number = level; l >= 0; l--) {
                if (!this.levelTiles[l][x][z]) {
                    this.levelTiles[l][x][z] = new Ground(l, x, z);
                }
            }
            const tile: Ground | null = this.levelTiles[level][x][z];
            if (tile) {
                tile.underlay = new TileUnderlay(southwestColor, southeastColor, northeastColor, northwestColor, -1, backgroundRgb, false);
            }
        } else if (shape === TileOverlayShape.DIAGONAL) {
            for (let l: number = level; l >= 0; l--) {
                if (!this.levelTiles[l][x][z]) {
                    this.levelTiles[l][x][z] = new Ground(l, x, z);
                }
            }
            const tile: Ground | null = this.levelTiles[level][x][z];
            if (tile) {
                tile.underlay = new TileUnderlay(southwestColor2, southeastColor2, northeastColor2, northwestColor2, textureId, foregroundRgb, southwestY === southeastY && southwestY === northeastY && southwestY === northwestY);
            }
        } else {
            for (let l: number = level; l >= 0; l--) {
                if (!this.levelTiles[l][x][z]) {
                    this.levelTiles[l][x][z] = new Ground(l, x, z);
                }
            }
            const tile: Ground | null = this.levelTiles[level][x][z];
            if (tile) {
                tile.overlay = new TileOverlay(
                    x,
                    shape,
                    southeastColor2,
                    southeastY,
                    northeastColor,
                    angle,
                    southwestColor,
                    northwestY,
                    foregroundRgb,
                    southwestColor2,
                    textureId,
                    northwestColor2,
                    backgroundRgb,
                    northeastY,
                    northeastColor2,
                    northwestColor,
                    southwestY,
                    z,
                    southeastColor
                );
            }
        }
    }

    addGroundDecoration(model: Model | null, tileLevel: number, tileX: number, tileZ: number, y: number, typecode: number, info: number): void {
        if (!this.levelTiles[tileLevel][tileX][tileZ]) {
            this.levelTiles[tileLevel][tileX][tileZ] = new Ground(tileLevel, tileX, tileZ);
        }
        const tile: Ground | null = this.levelTiles[tileLevel][tileX][tileZ];
        if (tile) {
            tile.groundDecor = new GroundDecor(y, tileX * 128 + 64, tileZ * 128 + 64, model, typecode, info);
        }
    }

    removeGroundDecoration(level: number, x: number, z: number): void {
        const tile: Ground | null = this.levelTiles[level][x][z];
        if (!tile) {
            return;
        }

        tile.groundDecor = null;
    }

    addObjStack(stx: number, stz: number, y: number, level: number, typecode: number, topObj: Model | null, middleObj: Model | null, bottomObj: Model | null): void {
        let stackOffset: number = 0;
        const tile: Ground | null = this.levelTiles[level][stx][stz];
        if (tile) {
            for (let l: number = 0; l < tile.locCount; l++) {
                const loc: Location | null = tile.locs[l];
                if (!loc || !loc.model) {
                    continue;
                }
                const height: number = loc.model.objRaise;
                if (height > stackOffset) {
                    stackOffset = height;
                }
            }
        } else {
            this.levelTiles[level][stx][stz] = new Ground(level, stx, stz);
        }
        const tile2: Ground | null = this.levelTiles[level][stx][stz];
        if (tile2) {
            tile2.objStack = new ObjStack(y, stx * 128 + 64, stz * 128 + 64, topObj, middleObj, bottomObj, typecode, stackOffset);
        }
    }

    removeObjStack(level: number, x: number, z: number): void {
        const tile: Ground | null = this.levelTiles[level][x][z];
        if (!tile) {
            return;
        }

        tile.objStack = null;
    }

    addWall(level: number, tileX: number, tileZ: number, y: number, spansA: number, spansB: number, modelA: Model | null, modelB: Model | null, typecode: number, info: number): void {
        if (!modelA && !modelB) {
            return;
        }
        for (let l: number = level; l >= 0; l--) {
            if (!this.levelTiles[l][tileX][tileZ]) {
                this.levelTiles[l][tileX][tileZ] = new Ground(l, tileX, tileZ);
            }
        }
        const tile: Ground | null = this.levelTiles[level][tileX][tileZ];
        if (tile) {
            tile.wall = new Wall(y, tileX * 128 + 64, tileZ * 128 + 64, spansA, spansB, modelA, modelB, typecode, info);
        }
    }

    removeWall(level: number, x: number, z: number, force: number): void {
        const tile: Ground | null = this.levelTiles[level][x][z];
        if (force === 1 && tile) {
            tile.wall = null;
        }
    }

    setWallDecoration(level: number, tileX: number, tileZ: number, y: number, offsetX: number, offsetZ: number, typecode: number, model: Model | null, info: number, angle: number, spans: number): void {
        if (!model) {
            return;
        }
        for (let l: number = level; l >= 0; l--) {
            if (!this.levelTiles[l][tileX][tileZ]) {
                this.levelTiles[l][tileX][tileZ] = new Ground(l, tileX, tileZ);
            }
        }
        const tile: Ground | null = this.levelTiles[level][tileX][tileZ];
        if (tile) {
            tile.decor = new Decor(y, tileX * 128 + offsetX + 64, tileZ * 128 + offsetZ + 64, spans, angle, model, typecode, info);
        }
    }

    removeWallDecoration(level: number, x: number, z: number): void {
        const tile: Ground | null = this.levelTiles[level][x][z];
        if (!tile) {
            return;
        }

        tile.decor = null;
    }

    setWallDecorationOffset(level: number, x: number, z: number, offset: number): void {
        const tile: Ground | null = this.levelTiles[level][x][z];
        if (!tile) {
            return;
        }

        const decor: Decor | null = tile.decor;
        if (!decor) {
            return;
        }

        const sx: number = x * 128 + 64;
        const sz: number = z * 128 + 64;
        decor.x = sx + ((((decor.x - sx) * offset) / 16) | 0);
        decor.z = sz + ((((decor.z - sz) * offset) / 16) | 0);
    }

    setWallDecorationModel(level: number, x: number, z: number, model: Model | null): void {
        if (!model) {
            return;
        }

        const tile: Ground | null = this.levelTiles[level][x][z];
        if (!tile) {
            return;
        }

        const decor: Decor | null = tile.decor;
        if (!decor) {
            return;
        }

        decor.model = model;
    }

    setGroundDecorationModel(level: number, x: number, z: number, model: Model | null): void {
        if (!model) {
            return;
        }

        const tile: Ground | null = this.levelTiles[level][x][z];
        if (!tile) {
            return;
        }

        const decor: GroundDecor | null = tile.groundDecor;
        if (!decor) {
            return;
        }

        decor.model = model;
    }

    setWallModel(level: number, x: number, z: number, model: Model | null): void {
        if (!model) {
            return;
        }

        const tile: Ground | null = this.levelTiles[level][x][z];
        if (!tile) {
            return;
        }

        const wall: Wall | null = tile.wall;
        if (!wall) {
            return;
        }

        wall.modelA = model;
    }

    setWallModels(x: number, z: number, level: number, modelA: Model | null, modelB: Model | null): void {
        if (!modelA) {
            return;
        }

        const tile: Ground | null = this.levelTiles[level][x][z];
        if (!tile) {
            return;
        }

        const wall: Wall | null = tile.wall;
        if (!wall) {
            return;
        }

        wall.modelA = modelA;
        wall.modelB = modelB;
    }

    addLoc(level: number, tileX: number, tileZ: number, y: number, model: Model | null, entity: Entity | null, typecode: number, info: number, width: number, length: number, yaw: number): boolean {
        if (!model && !entity) {
            return true;
        }
        const sceneX: number = tileX * 128 + width * 64;
        const sceneZ: number = tileZ * 128 + length * 64;
        return this.addLoc2(sceneX, sceneZ, y, level, tileX, tileZ, width, length, model, entity, typecode, info, yaw, false);
    }

    addTemporary(level: number, x: number, y: number, z: number, model: Model | null, entity: Entity | null, typecode: number, yaw: number, padding: number, forwardPadding: boolean): boolean {
        if (!model && !entity) {
            return true;
        }
        let x0: number = x - padding;
        let z0: number = z - padding;
        let x1: number = x + padding;
        let z1: number = z + padding;
        if (forwardPadding) {
            if (yaw > 640 && yaw < 1408) {
                z1 += 128;
            }
            if (yaw > 1152 && yaw < 1920) {
                x1 += 128;
            }
            if (yaw > 1664 || yaw < 384) {
                z0 -= 128;
            }
            if (yaw > 128 && yaw < 896) {
                x0 -= 128;
            }
        }
        x0 = (x0 / 128) | 0;
        z0 = (z0 / 128) | 0;
        x1 = (x1 / 128) | 0;
        z1 = (z1 / 128) | 0;
        return this.addLoc2(x, z, y, level, x0, z0, x1 + 1 - x0, z1 - z0 + 1, model, entity, typecode, 0, yaw, true);
    }

    addTemporary2(level: number, x: number, y: number, z: number, minTileX: number, minTileZ: number, maxTileX: number, maxTileZ: number, model: Model | null, entity: Entity | null, typecode: number, yaw: number): boolean {
        return (!model && !entity) || this.addLoc2(x, z, y, level, minTileX, minTileZ, maxTileX + 1 - minTileX, maxTileZ - minTileZ + 1, model, entity, typecode, 0, yaw, true);
    }

    removeLoc(level: number, x: number, z: number): void {
        const tile: Ground | null = this.levelTiles[level][x][z];
        if (!tile) {
            return;
        }

        for (let l: number = 0; l < tile.locCount; l++) {
            const loc: Location | null = tile.locs[l];
            if (loc && ((loc.typecode >> 29) & 0x3) === TypecodeEntity.LOC && loc.minSceneTileX === x && loc.minSceneTileZ === z) {
                this.removeLoc2(loc);
                return;
            }
        }
    }

    setLocModel(level: number, x: number, z: number, model: Model | null): void {
        if (!model) {
            return;
        }

        const tile: Ground | null = this.levelTiles[level][x][z];
        if (!tile) {
            return;
        }

        for (let i: number = 0; i < tile.locCount; i++) {
            const loc: Location | null = tile.locs[i];
            if (loc && ((loc.typecode >> 29) & 0x3) === TypecodeEntity.LOC) {
                loc.model = model;
                return;
            }
        }
    }

    clearTemporaryLocs(): void {
        for (let i: number = 0; i < this.temporaryLocCount; i++) {
            const loc: Location | null = this.temporaryLocs[i];
            if (loc) {
                this.removeLoc2(loc);
            }
            this.temporaryLocs[i] = null;
        }

        this.temporaryLocCount = 0;
    }

    getWallTypecode(level: number, x: number, z: number): number {
        const tile: Ground | null = this.levelTiles[level][x][z];
        return !tile || !tile.wall ? 0 : tile.wall.typecode;
    }

    getDecorTypecode(level: number, z: number, x: number): number {
        const tile: Ground | null = this.levelTiles[level][x][z];
        return !tile || !tile.decor ? 0 : tile.decor.typecode;
    }

    getLocTypecode(level: number, x: number, z: number): number {
        const tile: Ground | null = this.levelTiles[level][x][z];
        if (!tile) {
            return 0;
        }

        for (let l: number = 0; l < tile.locCount; l++) {
            const loc: Location | null = tile.locs[l];
            if (loc && ((loc.typecode >> 29) & 0x3) === TypecodeEntity.LOC && loc.minSceneTileX === x && loc.minSceneTileZ === z) {
                return loc.typecode;
            }
        }

        return 0;
    }

    getGroundDecorTypecode(level: number, x: number, z: number): number {
        const tile: Ground | null = this.levelTiles[level][x][z];
        return !tile || !tile.groundDecor ? 0 : tile.groundDecor.typecode;
    }

    getInfo(level: number, x: number, z: number, typecode: number): number {
        const tile: Ground | null = this.levelTiles[level][x][z];
        if (!tile) {
            return -1;
        } else if (tile.wall && tile.wall.typecode === typecode) {
            return tile.wall.info & 0xff;
        } else if (tile.decor && tile.decor.typecode === typecode) {
            return tile.decor.info & 0xff;
        } else if (tile.groundDecor && tile.groundDecor.typecode === typecode) {
            return tile.groundDecor.info & 0xff;
        } else {
            for (let i: number = 0; i < tile.locCount; i++) {
                const loc: Location | null = tile.locs[i];
                if (loc && loc.typecode === typecode) {
                    return loc.info & 0xff;
                }
            }
            return -1;
        }
    }

    buildModels(lightAmbient: number, lightAttenuation: number, lightSrcX: number, lightSrcY: number, lightSrcZ: number): void {
        const lightMagnitude: number = Math.sqrt(lightSrcX * lightSrcX + lightSrcY * lightSrcY + lightSrcZ * lightSrcZ) | 0;
        const attenuation: number = (lightAttenuation * lightMagnitude) >> 8;

        for (let level: number = 0; level < this.maxLevel; level++) {
            for (let tileX: number = 0; tileX < this.maxTileX; tileX++) {
                for (let tileZ: number = 0; tileZ < this.maxTileZ; tileZ++) {
                    const tile: Ground | null = this.levelTiles[level][tileX][tileZ];
                    if (!tile) {
                        continue;
                    }

                    const wall: Wall | null = tile.wall;
                    if (wall && wall.modelA && wall.modelA.vertexNormal) {
                        this.mergeLocNormals(level, tileX, tileZ, 1, 1, wall.modelA);
                        if (wall.modelB && wall.modelB.vertexNormal) {
                            this.mergeLocNormals(level, tileX, tileZ, 1, 1, wall.modelB);
                            this.mergeNormals(wall.modelA, wall.modelB, 0, 0, 0, false);
                            wall.modelB.applyLighting(lightAmbient, attenuation, lightSrcX, lightSrcY, lightSrcZ);
                        }
                        wall.modelA.applyLighting(lightAmbient, attenuation, lightSrcX, lightSrcY, lightSrcZ);
                    }

                    for (let i: number = 0; i < tile.locCount; i++) {
                        const loc: Location | null = tile.locs[i];
                        if (loc && loc.model && loc.model.vertexNormal) {
                            this.mergeLocNormals(level, tileX, tileZ, loc.maxSceneTileX + 1 - loc.minSceneTileX, loc.maxSceneTileZ - loc.minSceneTileZ + 1, loc.model);
                            loc.model.applyLighting(lightAmbient, attenuation, lightSrcX, lightSrcY, lightSrcZ);
                        }
                    }

                    const decor: GroundDecor | null = tile.groundDecor;
                    if (decor && decor.model && decor.model.vertexNormal) {
                        this.mergeGroundDecorationNormals(level, tileX, tileZ, decor.model);
                        decor.model.applyLighting(lightAmbient, attenuation, lightSrcX, lightSrcY, lightSrcZ);
                    }
                }
            }
        }
    }

    mergeGroundDecorationNormals(level: number, tileX: number, tileZ: number, model: Model): void {
        if (tileX < this.maxTileX) {
            const tile: Ground | null = this.levelTiles[level][tileX + 1][tileZ];
            if (tile && tile.groundDecor && tile.groundDecor.model && tile.groundDecor.model.vertexNormal) {
                this.mergeNormals(model, tile.groundDecor.model, 128, 0, 0, true);
            }
        }

        if (tileZ < this.maxTileX) {
            const tile: Ground | null = this.levelTiles[level][tileX][tileZ + 1];
            if (tile && tile.groundDecor && tile.groundDecor.model && tile.groundDecor.model.vertexNormal) {
                this.mergeNormals(model, tile.groundDecor.model, 0, 0, 128, true);
            }
        }

        if (tileX < this.maxTileX && tileZ < this.maxTileZ) {
            const tile: Ground | null = this.levelTiles[level][tileX + 1][tileZ + 1];
            if (tile && tile.groundDecor && tile.groundDecor.model && tile.groundDecor.model.vertexNormal) {
                this.mergeNormals(model, tile.groundDecor.model, 128, 0, 128, true);
            }
        }

        if (tileX < this.maxTileX && tileZ > 0) {
            const tile: Ground | null = this.levelTiles[level][tileX + 1][tileZ - 1];
            if (tile && tile.groundDecor && tile.groundDecor.model && tile.groundDecor.model.vertexNormal) {
                this.mergeNormals(model, tile.groundDecor.model, 128, 0, -128, true);
            }
        }
    }

    mergeLocNormals(level: number, tileX: number, tileZ: number, tileSizeX: number, tileSizeZ: number, model: Model): void {
        let allowFaceRemoval: boolean = true;

        let minTileX: number = tileX;
        const maxTileX: number = tileX + tileSizeX;
        const minTileZ: number = tileZ - 1;
        const maxTileZ: number = tileZ + tileSizeZ;

        for (let l: number = level; l <= level + 1; l++) {
            if (l === this.maxLevel) {
                continue;
            }

            for (let x: number = minTileX; x <= maxTileX; x++) {
                if (x < 0 || x >= this.maxTileX) {
                    continue;
                }

                for (let z: number = minTileZ; z <= maxTileZ; z++) {
                    if (z < 0 || z >= this.maxTileZ || (allowFaceRemoval && x < maxTileX && z < maxTileZ && (z >= tileZ || x === tileX))) {
                        continue;
                    }

                    const tile: Ground | null = this.levelTiles[l][x][z];
                    if (!tile) {
                        continue;
                    }

                    const offsetX: number = (x - tileX) * 128 + (1 - tileSizeX) * 64;
                    const offsetZ: number = (z - tileZ) * 128 + (1 - tileSizeZ) * 64;
                    const offsetY: number =
                        (((this.levelHeightmaps[l][x][z] + this.levelHeightmaps[l][x + 1][z] + this.levelHeightmaps[l][x][z + 1] + this.levelHeightmaps[l][x + 1][z + 1]) / 4) | 0) -
                        (((this.levelHeightmaps[level][tileX][tileZ] + this.levelHeightmaps[level][tileX + 1][tileZ] + this.levelHeightmaps[level][tileX][tileZ + 1] + this.levelHeightmaps[level][tileX + 1][tileZ + 1]) / 4) | 0);

                    const wall: Wall | null = tile.wall;
                    if (wall && wall.modelA && wall.modelA.vertexNormal) {
                        this.mergeNormals(model, wall.modelA, offsetX, offsetY, offsetZ, allowFaceRemoval);
                    }

                    if (wall && wall.modelB && wall.modelB.vertexNormal) {
                        this.mergeNormals(model, wall.modelB, offsetX, offsetY, offsetZ, allowFaceRemoval);
                    }

                    for (let i: number = 0; i < tile.locCount; i++) {
                        const loc: Location | null = tile.locs[i];
                        if (!loc || !loc.model || !loc.model.vertexNormal) {
                            continue;
                        }

                        const locTileSizeX: number = loc.maxSceneTileX + 1 - loc.minSceneTileX;
                        const locTileSizeZ: number = loc.maxSceneTileZ + 1 - loc.minSceneTileZ;
                        this.mergeNormals(model, loc.model, (loc.minSceneTileX - tileX) * 128 + (locTileSizeX - tileSizeX) * 64, offsetY, (loc.minSceneTileZ - tileZ) * 128 + (locTileSizeZ - tileSizeZ) * 64, allowFaceRemoval);
                    }
                }
            }

            minTileX--;
            allowFaceRemoval = false;
        }
    }

    mergeNormals(modelA: Model, modelB: Model, offsetX: number, offsetY: number, offsetZ: number, allowFaceRemoval: boolean): void {
        this.tmpMergeIndex++;

        let merged: number = 0;
        const vertexX: Int32Array = modelB.vertexX;
        const vertexCountB: number = modelB.vertexCount;

        if (modelA.vertexNormal && modelA.vertexNormalOriginal) {
            for (let vertexA: number = 0; vertexA < modelA.vertexCount; vertexA++) {
                const normalA: VertexNormal | null = modelA.vertexNormal[vertexA];
                const originalNormalA: VertexNormal | null = modelA.vertexNormalOriginal[vertexA];
                if (originalNormalA && originalNormalA.w !== 0) {
                    const y: number = modelA.vertexY[vertexA] - offsetY;
                    if (y > modelB.minY) {
                        continue;
                    }

                    const x: number = modelA.vertexX[vertexA] - offsetX;
                    if (x < modelB.minX || x > modelB.maxX) {
                        continue;
                    }

                    const z: number = modelA.vertexZ[vertexA] - offsetZ;
                    if (z < modelB.minZ || z > modelB.maxZ) {
                        continue;
                    }

                    if (modelB.vertexNormal && modelB.vertexNormalOriginal) {
                        for (let vertexB: number = 0; vertexB < vertexCountB; vertexB++) {
                            const normalB: VertexNormal | null = modelB.vertexNormal[vertexB];
                            const originalNormalB: VertexNormal | null = modelB.vertexNormalOriginal[vertexB];
                            if (x !== vertexX[vertexB] || z !== modelB.vertexZ[vertexB] || y !== modelB.vertexY[vertexB] || (originalNormalB && originalNormalB.w === 0)) {
                                continue;
                            }

                            if (normalA && normalB && originalNormalB) {
                                normalA.x += originalNormalB.x;
                                normalA.y += originalNormalB.y;
                                normalA.z += originalNormalB.z;
                                normalA.w += originalNormalB.w;
                                normalB.x += originalNormalA.x;
                                normalB.y += originalNormalA.y;
                                normalB.z += originalNormalA.z;
                                normalB.w += originalNormalA.w;
                                merged++;
                            }
                            this.mergeIndexA[vertexA] = this.tmpMergeIndex;
                            this.mergeIndexB[vertexB] = this.tmpMergeIndex;
                        }
                    }
                }
            }
        }

        if (merged < 3 || !allowFaceRemoval) {
            return;
        }

        if (modelA.faceInfo) {
            for (let i: number = 0; i < modelA.faceCount; i++) {
                if (this.mergeIndexA[modelA.faceVertexA[i]] === this.tmpMergeIndex && this.mergeIndexA[modelA.faceVertexB[i]] === this.tmpMergeIndex && this.mergeIndexA[modelA.faceVertexC[i]] === this.tmpMergeIndex) {
                    modelA.faceInfo[i] = -1;
                }
            }
        }

        if (modelB.faceInfo) {
            for (let i: number = 0; i < modelB.faceCount; i++) {
                if (this.mergeIndexB[modelB.faceVertexA[i]] === this.tmpMergeIndex && this.mergeIndexB[modelB.faceVertexB[i]] === this.tmpMergeIndex && this.mergeIndexB[modelB.faceVertexC[i]] === this.tmpMergeIndex) {
                    modelB.faceInfo[i] = -1;
                }
            }
        }
    }

    drawMinimapTile(level: number, x: number, z: number, dst: Int32Array, offset: number, step: number): void {
        const tile: Ground | null = this.levelTiles[level][x][z];
        if (!tile) {
            return;
        }

        const underlay: TileUnderlay | null = tile.underlay;
        if (underlay) {
            const rgb: number = underlay.colour;
            if (rgb !== 0) {
                for (let i: number = 0; i < 4; i++) {
                    dst[offset] = rgb;
                    dst[offset + 1] = rgb;
                    dst[offset + 2] = rgb;
                    dst[offset + 3] = rgb;
                    offset += step;
                }
            }
            return;
        }

        const overlay: TileOverlay | null = tile.overlay;
        if (!overlay) {
            return;
        }

        const shape: number = overlay.shape;
        const angle: number = overlay.shapeAngle;
        const background: number = overlay.backgroundRgb;
        const foreground: number = overlay.foregroundRgb;
        const mask: Int8Array = World3D.MINIMAP_TILE_MASK[shape];
        const rotation: Int8Array = World3D.MINIMAP_TILE_ROTATION_MAP[angle];
        let off: number = 0;
        if (background !== 0) {
            for (let i: number = 0; i < 4; i++) {
                dst[offset] = mask[rotation[off++]] === 0 ? background : foreground;
                dst[offset + 1] = mask[rotation[off++]] === 0 ? background : foreground;
                dst[offset + 2] = mask[rotation[off++]] === 0 ? background : foreground;
                dst[offset + 3] = mask[rotation[off++]] === 0 ? background : foreground;
                offset += step;
            }
            return;
        }

        for (let i: number = 0; i < 4; i++) {
            if (mask[rotation[off++]] !== 0) {
                dst[offset] = foreground;
            }
            if (mask[rotation[off++]] !== 0) {
                dst[offset + 1] = foreground;
            }
            if (mask[rotation[off++]] !== 0) {
                dst[offset + 2] = foreground;
            }
            if (mask[rotation[off++]] !== 0) {
                dst[offset + 3] = foreground;
            }
            offset += step;
        }
    }

    click(mouseX: number, mouseY: number): void {
        World3D.takingInput = true;
        World3D.mouseX = mouseX;
        World3D.mouseY = mouseY;
        World3D.clickTileX = -1;
        World3D.clickTileZ = -1;
    }

    draw(eyeX: number, eyeY: number, eyeZ: number, topLevel: number, eyeYaw: number, eyePitch: number, loopCycle: number): void {
        if (eyeX < 0) {
            eyeX = 0;
        } else if (eyeX >= this.maxTileX * 128) {
            eyeX = this.maxTileX * 128 - 1;
        }

        if (eyeZ < 0) {
            eyeZ = 0;
        } else if (eyeZ >= this.maxTileZ * 128) {
            eyeZ = this.maxTileZ * 128 - 1;
        }

        World3D.cycle++;
        World3D.sinEyePitch = Pix3D.sin[eyePitch];
        World3D.cosEyePitch = Pix3D.cos[eyePitch];
        World3D.sinEyeYaw = Pix3D.sin[eyeYaw];
        World3D.cosEyeYaw = Pix3D.cos[eyeYaw];

        World3D.visibilityMap = World3D.visibilityMatrix[((eyePitch - 128) / 32) | 0][(eyeYaw / 64) | 0];
        World3D.eyeX = eyeX;
        World3D.eyeY = eyeY;
        World3D.eyeZ = eyeZ;
        World3D.eyeTileX = (eyeX / 128) | 0;
        World3D.eyeTileZ = (eyeZ / 128) | 0;
        World3D.topLevel = topLevel;

        World3D.minDrawTileX = World3D.eyeTileX - 25;
        if (World3D.minDrawTileX < 0) {
            World3D.minDrawTileX = 0;
        }

        World3D.minDrawTileZ = World3D.eyeTileZ - 25;
        if (World3D.minDrawTileZ < 0) {
            World3D.minDrawTileZ = 0;
        }

        World3D.maxDrawTileX = World3D.eyeTileX + 25;
        if (World3D.maxDrawTileX > this.maxTileX) {
            World3D.maxDrawTileX = this.maxTileX;
        }

        World3D.maxDrawTileZ = World3D.eyeTileZ + 25;
        if (World3D.maxDrawTileZ > this.maxTileZ) {
            World3D.maxDrawTileZ = this.maxTileZ;
        }

        this.updateActiveOccluders();
        World3D.tilesRemaining = 0;

        for (let level: number = this.minLevel; level < this.maxLevel; level++) {
            const tiles: (Ground | null)[][] = this.levelTiles[level];
            for (let x: number = World3D.minDrawTileX; x < World3D.maxDrawTileX; x++) {
                for (let z: number = World3D.minDrawTileZ; z < World3D.maxDrawTileZ; z++) {
                    const tile: Ground | null = tiles[x][z];
                    if (!tile) {
                        continue;
                    }

                    if (tile.drawLevel <= topLevel && (World3D.visibilityMap[x + 25 - World3D.eyeTileX][z + 25 - World3D.eyeTileZ] || this.levelHeightmaps[level][x][z] - eyeY >= 2000)) {
                        tile.groundVisible = true;
                        tile.update = true;
                        tile.containsLocs = tile.locCount > 0;
                        World3D.tilesRemaining++;
                    } else {
                        tile.groundVisible = false;
                        tile.update = false;
                        tile.checkLocSpans = LocSpans.NONE;
                    }
                }
            }
        }

        for (let level: number = this.minLevel; level < this.maxLevel; level++) {
            const tiles: (Ground | null)[][] = this.levelTiles[level];
            for (let dx: number = -25; dx <= 0; dx++) {
                const rightTileX: number = World3D.eyeTileX + dx;
                const leftTileX: number = World3D.eyeTileX - dx;

                if (rightTileX < World3D.minDrawTileX && leftTileX >= World3D.maxDrawTileX) {
                    continue;
                }

                for (let dz: number = -25; dz <= 0; dz++) {
                    const forwardTileZ: number = World3D.eyeTileZ + dz;
                    const backwardTileZ: number = World3D.eyeTileZ - dz;
                    let tile: Ground | null;
                    if (rightTileX >= World3D.minDrawTileX) {
                        if (forwardTileZ >= World3D.minDrawTileZ) {
                            tile = tiles[rightTileX][forwardTileZ];
                            if (tile && tile.groundVisible) {
                                this.drawTile(tile, true, loopCycle);
                            }
                        }

                        if (backwardTileZ < World3D.maxDrawTileZ) {
                            tile = tiles[rightTileX][backwardTileZ];
                            if (tile && tile.groundVisible) {
                                this.drawTile(tile, true, loopCycle);
                            }
                        }
                    }

                    if (leftTileX < World3D.maxDrawTileX) {
                        if (forwardTileZ >= World3D.minDrawTileZ) {
                            tile = tiles[leftTileX][forwardTileZ];
                            if (tile && tile.groundVisible) {
                                this.drawTile(tile, true, loopCycle);
                            }
                        }

                        if (backwardTileZ < World3D.maxDrawTileZ) {
                            tile = tiles[leftTileX][backwardTileZ];
                            if (tile && tile.groundVisible) {
                                this.drawTile(tile, true, loopCycle);
                            }
                        }
                    }

                    if (World3D.tilesRemaining === 0) {
                        World3D.takingInput = false;
                        return;
                    }
                }
            }
        }

        for (let level: number = this.minLevel; level < this.maxLevel; level++) {
            const tiles: (Ground | null)[][] = this.levelTiles[level];
            for (let dx: number = -25; dx <= 0; dx++) {
                const rightTileX: number = World3D.eyeTileX + dx;
                const leftTileX: number = World3D.eyeTileX - dx;
                if (rightTileX < World3D.minDrawTileX && leftTileX >= World3D.maxDrawTileX) {
                    continue;
                }

                for (let dz: number = -25; dz <= 0; dz++) {
                    const forwardTileZ: number = World3D.eyeTileZ + dz;
                    const backgroundTileZ: number = World3D.eyeTileZ - dz;
                    let tile: Ground | null;
                    if (rightTileX >= World3D.minDrawTileX) {
                        if (forwardTileZ >= World3D.minDrawTileZ) {
                            tile = tiles[rightTileX][forwardTileZ];
                            if (tile && tile.groundVisible) {
                                this.drawTile(tile, false, loopCycle);
                            }
                        }

                        if (backgroundTileZ < World3D.maxDrawTileZ) {
                            tile = tiles[rightTileX][backgroundTileZ];
                            if (tile && tile.groundVisible) {
                                this.drawTile(tile, false, loopCycle);
                            }
                        }
                    }

                    if (leftTileX < World3D.maxDrawTileX) {
                        if (forwardTileZ >= World3D.minDrawTileZ) {
                            tile = tiles[leftTileX][forwardTileZ];
                            if (tile && tile.groundVisible) {
                                this.drawTile(tile, false, loopCycle);
                            }
                        }

                        if (backgroundTileZ < World3D.maxDrawTileZ) {
                            tile = tiles[leftTileX][backgroundTileZ];
                            if (tile && tile.groundVisible) {
                                this.drawTile(tile, false, loopCycle);
                            }
                        }
                    }

                    if (World3D.tilesRemaining === 0) {
                        World3D.takingInput = false;
                        return;
                    }
                }
            }
        }
    }

    private addLoc2(
        x: number,
        z: number,
        y: number,
        level: number,
        tileX: number,
        tileZ: number,
        tileSizeX: number,
        tileSizeZ: number,
        model: Model | null,
        entity: Entity | null,
        typecode: number,
        info: number,
        yaw: number,
        temporary: boolean
    ): boolean {
        if (!model && !entity) {
            return false;
        }
        for (let tx: number = tileX; tx < tileX + tileSizeX; tx++) {
            for (let tz: number = tileZ; tz < tileZ + tileSizeZ; tz++) {
                if (tx < 0 || tz < 0 || tx >= this.maxTileX || tz >= this.maxTileZ) {
                    return false;
                }
                const tile: Ground | null = this.levelTiles[level][tx][tz];
                if (tile && tile.locCount >= 5) {
                    return false;
                }
            }
        }
        const loc: Location = new Location(level, y, x, z, model, entity, yaw, tileX, tileX + tileSizeX - 1, tileZ, tileZ + tileSizeZ - 1, typecode, info);
        for (let tx: number = tileX; tx < tileX + tileSizeX; tx++) {
            for (let tz: number = tileZ; tz < tileZ + tileSizeZ; tz++) {
                let spans: number = LocSpans.NONE;
                if (tx > tileX) {
                    spans |= LocSpans.WEST;
                }
                if (tx < tileX + tileSizeX - 1) {
                    spans += LocSpans.EAST;
                }
                if (tz > tileZ) {
                    spans += LocSpans.SOUTH;
                }
                if (tz < tileZ + tileSizeZ - 1) {
                    spans += LocSpans.NORTH;
                }
                for (let l: number = level; l >= 0; l--) {
                    if (!this.levelTiles[l][tx][tz]) {
                        this.levelTiles[l][tx][tz] = new Ground(l, tx, tz);
                    }
                }
                const tile: Ground | null = this.levelTiles[level][tx][tz];
                if (tile) {
                    tile.locs[tile.locCount] = loc;
                    tile.locSpan[tile.locCount] = spans;
                    tile.locSpans |= spans;
                    tile.locCount++;
                }
            }
        }
        if (temporary) {
            this.temporaryLocs[this.temporaryLocCount++] = loc;
        }
        return true;
    }

    private removeLoc2(loc: Location): void {
        for (let tx: number = loc.minSceneTileX; tx <= loc.maxSceneTileX; tx++) {
            for (let tz: number = loc.minSceneTileZ; tz <= loc.maxSceneTileZ; tz++) {
                const tile: Ground | null = this.levelTiles[loc.locLevel][tx][tz];
                if (!tile) {
                    continue;
                }

                for (let i: number = 0; i < tile.locCount; i++) {
                    if (tile.locs[i] === loc) {
                        tile.locCount--;
                        for (let j: number = i; j < tile.locCount; j++) {
                            tile.locs[j] = tile.locs[j + 1];
                            tile.locSpan[j] = tile.locSpan[j + 1];
                        }
                        tile.locs[tile.locCount] = null;
                        break;
                    }
                }

                tile.locSpans = LocSpans.NONE;

                for (let i: number = 0; i < tile.locCount; i++) {
                    tile.locSpans |= tile.locSpan[i];
                }
            }
        }
    }

    private updateActiveOccluders(): void {
        const count: number = World3D.levelOccluderCount[World3D.topLevel];
        const occluders: (Occlude | null)[] = World3D.levelOccluders[World3D.topLevel];
        World3D.activeOccluderCount = 0;
        for (let i: number = 0; i < count; i++) {
            const occluder: Occlude | null = occluders[i];
            if (!occluder) {
                continue;
            }

            let deltaMaxY: number;
            let deltaMinTileZ: number;
            let deltaMaxTileZ: number;
            let deltaMaxTileX: number;
            if (occluder.type === OccludeType.HORIZONTAL) {
                deltaMaxY = occluder.minTileX + 25 - World3D.eyeTileX;
                if (deltaMaxY >= 0 && deltaMaxY <= 50) {
                    deltaMinTileZ = occluder.minTileZ + 25 - World3D.eyeTileZ;
                    if (deltaMinTileZ < 0) {
                        deltaMinTileZ = 0;
                    }
                    deltaMaxTileZ = occluder.maxTileZ + 25 - World3D.eyeTileZ;
                    if (deltaMaxTileZ > 50) {
                        deltaMaxTileZ = 50;
                    }
                    let ok: boolean = false;
                    while (deltaMinTileZ <= deltaMaxTileZ) {
                        if (World3D.visibilityMap && World3D.visibilityMap[deltaMaxY][deltaMinTileZ++]) {
                            ok = true;
                            break;
                        }
                    }
                    if (ok) {
                        deltaMaxTileX = World3D.eyeX - occluder.minX;
                        if (deltaMaxTileX > 32) {
                            occluder.mode = OccludeMode.FRONT;
                        } else {
                            if (deltaMaxTileX >= -32) {
                                continue;
                            }
                            occluder.mode = OccludeMode.BACK;
                            deltaMaxTileX = -deltaMaxTileX;
                        }
                        occluder.minDeltaZ = (((occluder.minZ - World3D.eyeZ) << 8) / deltaMaxTileX) | 0;
                        occluder.maxDeltaZ = (((occluder.maxZ - World3D.eyeZ) << 8) / deltaMaxTileX) | 0;
                        occluder.minDeltaY = (((occluder.minY - World3D.eyeY) << 8) / deltaMaxTileX) | 0;
                        occluder.maxDeltaY = (((occluder.maxY - World3D.eyeY) << 8) / deltaMaxTileX) | 0;
                        World3D.activeOccluders[World3D.activeOccluderCount++] = occluder;
                    }
                }
            } else if (occluder.type === OccludeType.VERTICAL) {
                deltaMaxY = occluder.minTileZ + 25 - World3D.eyeTileZ;
                if (deltaMaxY >= 0 && deltaMaxY <= 50) {
                    deltaMinTileZ = occluder.minTileX + 25 - World3D.eyeTileX;
                    if (deltaMinTileZ < 0) {
                        deltaMinTileZ = 0;
                    }
                    deltaMaxTileZ = occluder.maxTileX + 25 - World3D.eyeTileX;
                    if (deltaMaxTileZ > 50) {
                        deltaMaxTileZ = 50;
                    }
                    let ok: boolean = false;
                    while (deltaMinTileZ <= deltaMaxTileZ) {
                        if (World3D.visibilityMap && World3D.visibilityMap[deltaMinTileZ++][deltaMaxY]) {
                            ok = true;
                            break;
                        }
                    }
                    if (ok) {
                        deltaMaxTileX = World3D.eyeZ - occluder.minZ;
                        if (deltaMaxTileX > 32) {
                            occluder.mode = OccludeMode.RIGHT;
                        } else {
                            if (deltaMaxTileX >= -32) {
                                continue;
                            }
                            occluder.mode = OccludeMode.LEFT;
                            deltaMaxTileX = -deltaMaxTileX;
                        }
                        occluder.minDeltaX = (((occluder.minX - World3D.eyeX) << 8) / deltaMaxTileX) | 0;
                        occluder.maxDeltaX = (((occluder.maxX - World3D.eyeX) << 8) / deltaMaxTileX) | 0;
                        occluder.minDeltaY = (((occluder.minY - World3D.eyeY) << 8) / deltaMaxTileX) | 0;
                        occluder.maxDeltaY = (((occluder.maxY - World3D.eyeY) << 8) / deltaMaxTileX) | 0;
                        World3D.activeOccluders[World3D.activeOccluderCount++] = occluder;
                    }
                }
            } else if (occluder.type === OccludeType.FLAT) {
                deltaMaxY = occluder.minY - World3D.eyeY;
                if (deltaMaxY > 128) {
                    deltaMinTileZ = occluder.minTileZ + 25 - World3D.eyeTileZ;
                    if (deltaMinTileZ < 0) {
                        deltaMinTileZ = 0;
                    }
                    deltaMaxTileZ = occluder.maxTileZ + 25 - World3D.eyeTileZ;
                    if (deltaMaxTileZ > 50) {
                        deltaMaxTileZ = 50;
                    }
                    if (deltaMinTileZ <= deltaMaxTileZ) {
                        let deltaMinTileX: number = occluder.minTileX + 25 - World3D.eyeTileX;
                        if (deltaMinTileX < 0) {
                            deltaMinTileX = 0;
                        }
                        deltaMaxTileX = occluder.maxTileX + 25 - World3D.eyeTileX;
                        if (deltaMaxTileX > 50) {
                            deltaMaxTileX = 50;
                        }
                        let ok: boolean = false;
                        find_visible_tile: for (let x: number = deltaMinTileX; x <= deltaMaxTileX; x++) {
                            for (let z: number = deltaMinTileZ; z <= deltaMaxTileZ; z++) {
                                if (World3D.visibilityMap && World3D.visibilityMap[x][z]) {
                                    ok = true;
                                    break find_visible_tile;
                                }
                            }
                        }
                        if (ok) {
                            occluder.mode = OccludeMode.ABOVE;
                            occluder.minDeltaX = (((occluder.minX - World3D.eyeX) << 8) / deltaMaxY) | 0;
                            occluder.maxDeltaX = (((occluder.maxX - World3D.eyeX) << 8) / deltaMaxY) | 0;
                            occluder.minDeltaZ = (((occluder.minZ - World3D.eyeZ) << 8) / deltaMaxY) | 0;
                            occluder.maxDeltaZ = (((occluder.maxZ - World3D.eyeZ) << 8) / deltaMaxY) | 0;
                            World3D.activeOccluders[World3D.activeOccluderCount++] = occluder;
                        }
                    }
                }
            }
        }
    }

    private drawTile(next: Ground, checkAdjacent: boolean, loopCycle: number): void {
        World3D.drawTileQueue.addTail(next);

        // eslint-disable-next-line no-constant-condition
        while (true) {
            let tile: Ground | null;

            do {
                tile = World3D.drawTileQueue.removeHead() as Ground | null;

                if (!tile) {
                    return;
                }
            } while (!tile.update);

            const tileX: number = tile.x;
            const tileZ: number = tile.z;
            const level: number = tile.groundLevel;
            const occludeLevel: number = tile.occludeLevel;
            const tiles: (Ground | null)[][] = this.levelTiles[level];

            if (tile.groundVisible) {
                if (checkAdjacent) {
                    if (level > 0) {
                        const above: Ground | null = this.levelTiles[level - 1][tileX][tileZ];

                        if (above && above.update) {
                            continue;
                        }
                    }

                    if (tileX <= World3D.eyeTileX && tileX > World3D.minDrawTileX) {
                        const adjacent: Ground | null = tiles[tileX - 1][tileZ];

                        if (adjacent && adjacent.update && (adjacent.groundVisible || (tile.locSpans & LocSpans.WEST) === LocSpans.NONE)) {
                            continue;
                        }
                    }

                    if (tileX >= World3D.eyeTileX && tileX < World3D.maxDrawTileX - 1) {
                        const adjacent: Ground | null = tiles[tileX + 1][tileZ];

                        if (adjacent && adjacent.update && (adjacent.groundVisible || (tile.locSpans & LocSpans.EAST) === LocSpans.NONE)) {
                            continue;
                        }
                    }

                    if (tileZ <= World3D.eyeTileZ && tileZ > World3D.minDrawTileZ) {
                        const adjacent: Ground | null = tiles[tileX][tileZ - 1];

                        if (adjacent && adjacent.update && (adjacent.groundVisible || (tile.locSpans & LocSpans.SOUTH) === LocSpans.NONE)) {
                            continue;
                        }
                    }

                    if (tileZ >= World3D.eyeTileZ && tileZ < World3D.maxDrawTileZ - 1) {
                        const adjacent: Ground | null = tiles[tileX][tileZ + 1];

                        if (adjacent && adjacent.update && (adjacent.groundVisible || (tile.locSpans & LocSpans.NORTH) === LocSpans.NONE)) {
                            continue;
                        }
                    }
                } else {
                    checkAdjacent = true;
                }

                tile.groundVisible = false;

                if (tile.bridge) {
                    const bridge: Ground = tile.bridge;

                    if (!bridge.underlay) {
                        if (bridge.overlay && !this.tileVisible(0, tileX, tileZ)) {
                            this.drawTileOverlay(tileX, tileZ, bridge.overlay, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw);
                        }
                    } else if (!this.tileVisible(0, tileX, tileZ)) {
                        this.drawTileUnderlay(bridge.underlay, 0, tileX, tileZ, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw);
                    }

                    const wall: Wall | null = bridge.wall;
                    if (wall) {
                        wall.modelA?.draw(0, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw, wall.x - World3D.eyeX, wall.y - World3D.eyeY, wall.z - World3D.eyeZ, wall.typecode);
                    }

                    for (let i: number = 0; i < bridge.locCount; i++) {
                        const loc: Location | null = bridge.locs[i];

                        if (loc) {
                            let model: Model | null = loc.model;
                            if (!model) {
                                model = loc.entity?.draw(loopCycle) ?? null;
                            }
                            model?.draw(loc.yaw, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw, loc.x - World3D.eyeX, loc.y - World3D.eyeY, loc.z - World3D.eyeZ, loc.typecode);
                        }
                    }
                }

                let tileDrawn: boolean = false;
                if (!tile.underlay) {
                    if (tile.overlay && !this.tileVisible(occludeLevel, tileX, tileZ)) {
                        tileDrawn = true;
                        this.drawTileOverlay(tileX, tileZ, tile.overlay, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw);
                    }
                } else if (!this.tileVisible(occludeLevel, tileX, tileZ)) {
                    tileDrawn = true;
                    this.drawTileUnderlay(tile.underlay, occludeLevel, tileX, tileZ, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw);
                }

                let direction: number = 0;
                let frontWallTypes: number = 0;

                const wall: Wall | null = tile.wall;
                const decor: Decor | null = tile.decor;

                if (wall || decor) {
                    if (World3D.eyeTileX === tileX) {
                        direction += 1;
                    } else if (World3D.eyeTileX < tileX) {
                        direction += 2;
                    }

                    if (World3D.eyeTileZ === tileZ) {
                        direction += 3;
                    } else if (World3D.eyeTileZ > tileZ) {
                        direction += 6;
                    }

                    frontWallTypes = World3D.FRONT_WALL_TYPES[direction];
                    tile.backWallTypes = World3D.BACK_WALL_TYPES[direction];
                }

                if (wall) {
                    if ((wall.spansA & World3D.DIRECTION_ALLOW_WALL_CORNER_TYPE[direction]) === LocSpans.NONE) {
                        tile.checkLocSpans = LocSpans.NONE;
                    } else if (wall.spansA === LocSpans.CORNER_WEST) {
                        tile.checkLocSpans = LocSpans.NONE | LocSpans.WEST | LocSpans.NORTH;
                        tile.blockLocSpans = World3D.WALL_CORNER_TYPE_16_BLOCK_LOC_SPANS[direction]; // northwest basically
                        tile.inverseBlockLocSpans = (LocSpans.NONE | LocSpans.WEST | LocSpans.NORTH) - tile.blockLocSpans;
                    } else if (wall.spansA === LocSpans.CORNER_NORTH) {
                        tile.checkLocSpans = LocSpans.NONE | LocSpans.NORTH | LocSpans.EAST;
                        tile.blockLocSpans = World3D.WALL_CORNER_TYPE_32_BLOCK_LOC_SPANS[direction]; // northeast basically
                        tile.inverseBlockLocSpans = (LocSpans.NONE | LocSpans.NORTH | LocSpans.EAST) - tile.blockLocSpans;
                    } else if (wall.spansA === LocSpans.CORNER_EAST) {
                        tile.checkLocSpans = LocSpans.NONE | LocSpans.EAST | LocSpans.SOUTH;
                        tile.blockLocSpans = World3D.WALL_CORNER_TYPE_64_BLOCK_LOC_SPANS[direction]; // southeast basically
                        tile.inverseBlockLocSpans = (LocSpans.NONE | LocSpans.EAST | LocSpans.SOUTH) - tile.blockLocSpans;
                    } else {
                        tile.checkLocSpans = LocSpans.NONE | LocSpans.WEST | LocSpans.SOUTH;
                        tile.blockLocSpans = World3D.WALL_CORNER_TYPE_128_BLOCK_LOC_SPANS[direction]; // southwest basically
                        tile.inverseBlockLocSpans = (LocSpans.NONE | LocSpans.WEST | LocSpans.SOUTH) - tile.blockLocSpans;
                    }

                    if ((wall.spansA & frontWallTypes) !== LocSpans.NONE && !this.wallVisible(occludeLevel, tileX, tileZ, wall.spansA)) {
                        wall.modelA?.draw(0, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw, wall.x - World3D.eyeX, wall.y - World3D.eyeY, wall.z - World3D.eyeZ, wall.typecode);
                    }

                    if ((wall.spansB & frontWallTypes) !== LocSpans.NONE && !this.wallVisible(occludeLevel, tileX, tileZ, wall.spansB)) {
                        wall.modelB?.draw(0, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw, wall.x - World3D.eyeX, wall.y - World3D.eyeY, wall.z - World3D.eyeZ, wall.typecode);
                    }
                }

                if (decor && !this.visible(occludeLevel, tileX, tileZ, decor.model.maxY)) {
                    if ((decor.spans & frontWallTypes) !== LocSpans.NONE) {
                        decor.model.draw(decor.angle, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw, decor.x - World3D.eyeX, decor.y - World3D.eyeY, decor.z - World3D.eyeZ, decor.typecode);
                    } else if ((decor.spans & LocSpans.DECOR_BOTH) !== LocSpans.NONE) {
                        const x: number = decor.x - World3D.eyeX;
                        const y: number = decor.y - World3D.eyeY;
                        const z: number = decor.z - World3D.eyeZ;
                        const angle: number = decor.angle;

                        let nearestX: number;
                        if (angle === LocAngle.NORTH || angle === LocAngle.EAST) {
                            nearestX = -x;
                        } else {
                            nearestX = x;
                        }

                        let nearestZ: number;
                        if (angle === LocAngle.EAST || angle === LocAngle.SOUTH) {
                            nearestZ = -z;
                        } else {
                            nearestZ = z;
                        }

                        if ((decor.spans & LocSpans.DECOR_OFFSET) !== LocSpans.NONE && nearestZ < nearestX) {
                            const drawX: number = x + World3D.WALL_DECORATION_INSET_X[angle];
                            const drawZ: number = z + World3D.WALL_DECORATION_INSET_Z[angle];
                            decor.model.draw(angle * 512 + 256, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw, drawX, y, drawZ, decor.typecode);
                        }

                        if ((decor.spans & LocSpans.DECOR_NOOFFSET) !== LocSpans.NONE && nearestZ > nearestX) {
                            const drawX: number = x + World3D.WALL_DECORATION_OUTSET_X[angle];
                            const drawZ: number = z + World3D.WALL_DECORATION_OUTSET_Z[angle];
                            decor.model.draw((angle * 512 + 1280) & 0x7ff, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw, drawX, y, drawZ, decor.typecode);
                        }
                    }
                }

                if (tileDrawn) {
                    const groundDecor: GroundDecor | null = tile.groundDecor;
                    if (groundDecor) {
                        groundDecor.model?.draw(0, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw, groundDecor.x - World3D.eyeX, groundDecor.y - World3D.eyeY, groundDecor.z - World3D.eyeZ, groundDecor.typecode);
                    }

                    const objs: ObjStack | null = tile.objStack;
                    if (objs && objs.offset === 0) {
                        if (objs.bottomObj) {
                            objs.bottomObj.draw(0, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw, objs.x - World3D.eyeX, objs.y - World3D.eyeY, objs.z - World3D.eyeZ, objs.typecode);
                        }

                        if (objs.middleObj) {
                            objs.middleObj.draw(0, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw, objs.x - World3D.eyeX, objs.y - World3D.eyeY, objs.z - World3D.eyeZ, objs.typecode);
                        }

                        if (objs.topObj) {
                            objs.topObj.draw(0, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw, objs.x - World3D.eyeX, objs.y - World3D.eyeY, objs.z - World3D.eyeZ, objs.typecode);
                        }
                    }
                }

                const spans: number = tile.locSpans;

                if (spans !== LocSpans.NONE) {
                    if (tileX < World3D.eyeTileX && (spans & LocSpans.EAST) !== LocSpans.NONE) {
                        const adjacent: Ground | null = tiles[tileX + 1][tileZ];
                        if (adjacent && adjacent.update) {
                            World3D.drawTileQueue.addTail(adjacent);
                        }
                    }

                    if (tileZ < World3D.eyeTileZ && (spans & LocSpans.NORTH) !== LocSpans.NONE) {
                        const adjacent: Ground | null = tiles[tileX][tileZ + 1];
                        if (adjacent && adjacent.update) {
                            World3D.drawTileQueue.addTail(adjacent);
                        }
                    }

                    if (tileX > World3D.eyeTileX && (spans & LocSpans.WEST) !== LocSpans.NONE) {
                        const adjacent: Ground | null = tiles[tileX - 1][tileZ];
                        if (adjacent && adjacent.update) {
                            World3D.drawTileQueue.addTail(adjacent);
                        }
                    }

                    if (tileZ > World3D.eyeTileZ && (spans & LocSpans.SOUTH) !== LocSpans.NONE) {
                        const adjacent: Ground | null = tiles[tileX][tileZ - 1];
                        if (adjacent && adjacent.update) {
                            World3D.drawTileQueue.addTail(adjacent);
                        }
                    }
                }
            }

            if (tile.checkLocSpans !== LocSpans.NONE) {
                let draw: boolean = true;
                for (let i: number = 0; i < tile.locCount; i++) {
                    const loc: Location | null = tile.locs[i];
                    if (!loc) {
                        continue;
                    }
                    if (loc.cycle !== World3D.cycle && (tile.locSpan[i] & tile.checkLocSpans) === tile.blockLocSpans) {
                        draw = false;
                        break;
                    }
                }

                if (draw) {
                    const wall: Wall | null = tile.wall;

                    if (wall && !this.wallVisible(occludeLevel, tileX, tileZ, wall.spansA)) {
                        wall.modelA?.draw(0, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw, wall.x - World3D.eyeX, wall.y - World3D.eyeY, wall.z - World3D.eyeZ, wall.typecode);
                    }

                    tile.checkLocSpans = LocSpans.NONE;
                }
            }

            if (tile.containsLocs) {
                const locCount: number = tile.locCount;
                tile.containsLocs = false;
                let locBufferSize: number = 0;

                iterate_locs: for (let i: number = 0; i < locCount; i++) {
                    const loc: Location | null = tile.locs[i];

                    if (!loc || loc.cycle === World3D.cycle) {
                        continue;
                    }

                    for (let x: number = loc.minSceneTileX; x <= loc.maxSceneTileX; x++) {
                        for (let z: number = loc.minSceneTileZ; z <= loc.maxSceneTileZ; z++) {
                            const other: Ground | null = tiles[x][z];

                            if (!other) {
                                continue;
                            }

                            if (!other.groundVisible) {
                                if (other.checkLocSpans === LocSpans.NONE) {
                                    continue;
                                }

                                let spans: number = LocSpans.NONE;

                                if (x > loc.minSceneTileX) {
                                    spans += LocSpans.WEST;
                                }

                                if (x < loc.maxSceneTileX) {
                                    spans += LocSpans.EAST;
                                }

                                if (z > loc.minSceneTileZ) {
                                    spans += LocSpans.SOUTH;
                                }

                                if (z < loc.maxSceneTileZ) {
                                    spans += LocSpans.NORTH;
                                }

                                if ((spans & other.checkLocSpans) !== tile.inverseBlockLocSpans) {
                                    continue;
                                }
                            }

                            tile.containsLocs = true;
                            continue iterate_locs;
                        }
                    }

                    World3D.locBuffer[locBufferSize++] = loc;

                    let minTileDistanceX: number = World3D.eyeTileX - loc.minSceneTileX;
                    const maxTileDistanceX: number = loc.maxSceneTileX - World3D.eyeTileX;

                    if (maxTileDistanceX > minTileDistanceX) {
                        minTileDistanceX = maxTileDistanceX;
                    }

                    const minTileDistanceZ: number = World3D.eyeTileZ - loc.minSceneTileZ;
                    const maxTileDistanceZ: number = loc.maxSceneTileZ - World3D.eyeTileZ;

                    if (maxTileDistanceZ > minTileDistanceZ) {
                        loc.distance = minTileDistanceX + maxTileDistanceZ;
                    } else {
                        loc.distance = minTileDistanceX + minTileDistanceZ;
                    }
                }

                // eslint-disable-next-line no-constant-condition
                while (true) {
                    let farthestDistance: number = -50;
                    let farthestIndex: number = -1;

                    for (let index: number = 0; index < locBufferSize; index++) {
                        const loc: Location | null = World3D.locBuffer[index];
                        if (!loc) {
                            continue;
                        }

                        if (loc.cycle !== World3D.cycle) {
                            if (loc.distance > farthestDistance) {
                                farthestDistance = loc.distance;
                                farthestIndex = index;
                            }
                        }
                    }

                    if (farthestIndex === -1) {
                        break;
                    }

                    const farthest: Location | null = World3D.locBuffer[farthestIndex];
                    if (farthest) {
                        farthest.cycle = World3D.cycle;

                        let model: Model | null = farthest.model;
                        if (!model) {
                            model = farthest.entity?.draw(loopCycle) ?? null;
                        }

                        if (model && !this.locVisible(occludeLevel, farthest.minSceneTileX, farthest.maxSceneTileX, farthest.minSceneTileZ, farthest.maxSceneTileZ, model.maxY)) {
                            model.draw(farthest.yaw, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw, farthest.x - World3D.eyeX, farthest.y - World3D.eyeY, farthest.z - World3D.eyeZ, farthest.typecode);
                        }

                        for (let x: number = farthest.minSceneTileX; x <= farthest.maxSceneTileX; x++) {
                            for (let z: number = farthest.minSceneTileZ; z <= farthest.maxSceneTileZ; z++) {
                                const occupied: Ground | null = tiles[x][z];
                                if (!occupied) {
                                    continue;
                                }

                                if (occupied.checkLocSpans !== LocSpans.NONE) {
                                    World3D.drawTileQueue.addTail(occupied);
                                } else if ((x !== tileX || z !== tileZ) && occupied.update) {
                                    World3D.drawTileQueue.addTail(occupied);
                                }
                            }
                        }
                    }
                }

                if (tile.containsLocs) {
                    continue;
                }
            }

            if (!tile.update || tile.checkLocSpans !== LocSpans.NONE) {
                continue;
            }

            if (tileX <= World3D.eyeTileX && tileX > World3D.minDrawTileX) {
                const adjacent: Ground | null = tiles[tileX - 1][tileZ];
                if (adjacent && adjacent.update) {
                    continue;
                }
            }

            if (tileX >= World3D.eyeTileX && tileX < World3D.maxDrawTileX - 1) {
                const adjacent: Ground | null = tiles[tileX + 1][tileZ];
                if (adjacent && adjacent.update) {
                    continue;
                }
            }

            if (tileZ <= World3D.eyeTileZ && tileZ > World3D.minDrawTileZ) {
                const adjacent: Ground | null = tiles[tileX][tileZ - 1];
                if (adjacent && adjacent.update) {
                    continue;
                }
            }

            if (tileZ >= World3D.eyeTileZ && tileZ < World3D.maxDrawTileZ - 1) {
                const adjacent: Ground | null = tiles[tileX][tileZ + 1];
                if (adjacent && adjacent.update) {
                    continue;
                }
            }

            tile.update = false;
            World3D.tilesRemaining--;

            const objs: ObjStack | null = tile.objStack;
            if (objs && objs.offset !== 0) {
                if (objs.bottomObj) {
                    objs.bottomObj.draw(0, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw, objs.x - World3D.eyeX, objs.y - World3D.eyeY - objs.offset, objs.z - World3D.eyeZ, objs.typecode);
                }

                if (objs.middleObj) {
                    objs.middleObj.draw(0, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw, objs.x - World3D.eyeX, objs.y - World3D.eyeY - objs.offset, objs.z - World3D.eyeZ, objs.typecode);
                }

                if (objs.topObj) {
                    objs.topObj.draw(0, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw, objs.x - World3D.eyeX, objs.y - World3D.eyeY - objs.offset, objs.z - World3D.eyeZ, objs.typecode);
                }
            }

            if (tile.backWallTypes !== LocSpans.NONE) {
                const decor: Decor | null = tile.decor;

                if (decor && !this.visible(occludeLevel, tileX, tileZ, decor.model.maxY)) {
                    if ((decor.spans & tile.backWallTypes) !== LocSpans.NONE) {
                        decor.model.draw(decor.angle, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw, decor.x - World3D.eyeX, decor.y - World3D.eyeY, decor.z - World3D.eyeZ, decor.typecode);
                    } else if ((decor.spans & LocSpans.DECOR_BOTH) !== LocSpans.NONE) {
                        const x: number = decor.x - World3D.eyeX;
                        const y: number = decor.y - World3D.eyeY;
                        const z: number = decor.z - World3D.eyeZ;
                        const angle: number = decor.angle;

                        let nearestX: number;
                        if (angle === LocAngle.NORTH || angle === LocAngle.EAST) {
                            nearestX = -x;
                        } else {
                            nearestX = x;
                        }

                        let nearestZ: number;
                        if (angle === LocAngle.EAST || angle === LocAngle.SOUTH) {
                            nearestZ = -z;
                        } else {
                            nearestZ = z;
                        }

                        if ((decor.spans & LocSpans.DECOR_OFFSET) !== LocSpans.NONE && nearestZ >= nearestX) {
                            const drawX: number = x + World3D.WALL_DECORATION_INSET_X[angle];
                            const drawZ: number = z + World3D.WALL_DECORATION_INSET_Z[angle];
                            decor.model.draw(angle * 512 + 256, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw, drawX, y, drawZ, decor.typecode);
                        }

                        if ((decor.spans & LocSpans.DECOR_NOOFFSET) !== LocSpans.NONE && nearestZ <= nearestX) {
                            const drawX: number = x + World3D.WALL_DECORATION_OUTSET_X[angle];
                            const drawZ: number = z + World3D.WALL_DECORATION_OUTSET_Z[angle];
                            decor.model.draw((angle * 512 + 1280) & 0x7ff, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw, drawX, y, drawZ, decor.typecode);
                        }
                    }
                }

                const wall: Wall | null = tile.wall;
                if (wall) {
                    if ((wall.spansB & tile.backWallTypes) !== LocSpans.NONE && !this.wallVisible(occludeLevel, tileX, tileZ, wall.spansB)) {
                        wall.modelB?.draw(0, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw, wall.x - World3D.eyeX, wall.y - World3D.eyeY, wall.z - World3D.eyeZ, wall.typecode);
                    }

                    if ((wall.spansA & tile.backWallTypes) !== LocSpans.NONE && !this.wallVisible(occludeLevel, tileX, tileZ, wall.spansA)) {
                        wall.modelA?.draw(0, World3D.sinEyePitch, World3D.cosEyePitch, World3D.sinEyeYaw, World3D.cosEyeYaw, wall.x - World3D.eyeX, wall.y - World3D.eyeY, wall.z - World3D.eyeZ, wall.typecode);
                    }
                }
            }

            if (level < this.maxLevel - 1) {
                const above: Ground | null = this.levelTiles[level + 1][tileX][tileZ];
                if (above && above.update) {
                    World3D.drawTileQueue.addTail(above);
                }
            }

            if (tileX < World3D.eyeTileX) {
                const adjacent: Ground | null = tiles[tileX + 1][tileZ];
                if (adjacent && adjacent.update) {
                    World3D.drawTileQueue.addTail(adjacent);
                }
            }

            if (tileZ < World3D.eyeTileZ) {
                const adjacent: Ground | null = tiles[tileX][tileZ + 1];
                if (adjacent && adjacent.update) {
                    World3D.drawTileQueue.addTail(adjacent);
                }
            }

            if (tileX > World3D.eyeTileX) {
                const adjacent: Ground | null = tiles[tileX - 1][tileZ];
                if (adjacent && adjacent.update) {
                    World3D.drawTileQueue.addTail(adjacent);
                }
            }

            if (tileZ > World3D.eyeTileZ) {
                const adjacent: Ground | null = tiles[tileX][tileZ - 1];
                if (adjacent && adjacent.update) {
                    World3D.drawTileQueue.addTail(adjacent);
                }
            }
        }
    }

    private drawTileUnderlay(underlay: TileUnderlay, level: number, tileX: number, tileZ: number, sinEyePitch: number, cosEyePitch: number, sinEyeYaw: number, cosEyeYaw: number): void {
        let x3: number;
        let x0: number = (x3 = (tileX << 7) - World3D.eyeX);
        let z1: number;
        let z0: number = (z1 = (tileZ << 7) - World3D.eyeZ);
        let x2: number;
        let x1: number = (x2 = x0 + 128);
        let z3: number;
        let z2: number = (z3 = z0 + 128);

        let y0: number = this.levelHeightmaps[level][tileX][tileZ] - World3D.eyeY;
        let y1: number = this.levelHeightmaps[level][tileX + 1][tileZ] - World3D.eyeY;
        let y2: number = this.levelHeightmaps[level][tileX + 1][tileZ + 1] - World3D.eyeY;
        let y3: number = this.levelHeightmaps[level][tileX][tileZ + 1] - World3D.eyeY;

        let tmp: number = (z0 * sinEyeYaw + x0 * cosEyeYaw) >> 16;
        z0 = (z0 * cosEyeYaw - x0 * sinEyeYaw) >> 16;
        x0 = tmp;

        tmp = (y0 * cosEyePitch - z0 * sinEyePitch) >> 16;
        z0 = (y0 * sinEyePitch + z0 * cosEyePitch) >> 16;
        y0 = tmp;

        if (z0 < 50) {
            return;
        }

        tmp = (z1 * sinEyeYaw + x1 * cosEyeYaw) >> 16;
        z1 = (z1 * cosEyeYaw - x1 * sinEyeYaw) >> 16;
        x1 = tmp;

        tmp = (y1 * cosEyePitch - z1 * sinEyePitch) >> 16;
        z1 = (y1 * sinEyePitch + z1 * cosEyePitch) >> 16;
        y1 = tmp;

        if (z1 < 50) {
            return;
        }

        tmp = (z2 * sinEyeYaw + x2 * cosEyeYaw) >> 16;
        z2 = (z2 * cosEyeYaw - x2 * sinEyeYaw) >> 16;
        x2 = tmp;

        tmp = (y2 * cosEyePitch - z2 * sinEyePitch) >> 16;
        z2 = (y2 * sinEyePitch + z2 * cosEyePitch) >> 16;
        y2 = tmp;

        if (z2 < 50) {
            return;
        }

        tmp = (z3 * sinEyeYaw + x3 * cosEyeYaw) >> 16;
        z3 = (z3 * cosEyeYaw - x3 * sinEyeYaw) >> 16;
        x3 = tmp;

        tmp = (y3 * cosEyePitch - z3 * sinEyePitch) >> 16;
        z3 = (y3 * sinEyePitch + z3 * cosEyePitch) >> 16;
        y3 = tmp;

        if (z3 < 50) {
            return;
        }

        const px0: number = Pix3D.centerX + (((x0 << 9) / z0) | 0);
        const py0: number = Pix3D.centerY + (((y0 << 9) / z0) | 0);
        const pz0: number = Pix3D.centerX + (((x1 << 9) / z1) | 0);
        const px1: number = Pix3D.centerY + (((y1 << 9) / z1) | 0);
        const py1: number = Pix3D.centerX + (((x2 << 9) / z2) | 0);
        const pz1: number = Pix3D.centerY + (((y2 << 9) / z2) | 0);
        const px3: number = Pix3D.centerX + (((x3 << 9) / z3) | 0);
        const py3: number = Pix3D.centerY + (((y3 << 9) / z3) | 0);

        Pix3D.alpha = 0;

        if ((py1 - px3) * (px1 - py3) - (pz1 - py3) * (pz0 - px3) > 0) {
            Pix3D.clipX = py1 < 0 || px3 < 0 || pz0 < 0 || py1 > Pix2D.boundX || px3 > Pix2D.boundX || pz0 > Pix2D.boundX;
            if (World3D.takingInput && this.pointInsideTriangle(World3D.mouseX, World3D.mouseY, pz1, py3, px1, py1, px3, pz0)) {
                World3D.clickTileX = tileX;
                World3D.clickTileZ = tileZ;
            }
            if (underlay.textureId === -1) {
                if (underlay.northeastColor !== 12345678) {
                    Pix3D.fillGouraudTriangle(py1, px3, pz0, pz1, py3, px1, underlay.northeastColor, underlay.northwestColor, underlay.southeastColor);
                }
            } else if (World3D.lowMemory) {
                const averageColor: number = World3D.TEXTURE_HSL[underlay.textureId];
                Pix3D.fillGouraudTriangle(py1, px3, pz0, pz1, py3, px1, this.mulLightness(averageColor, underlay.northeastColor), this.mulLightness(averageColor, underlay.northwestColor), this.mulLightness(averageColor, underlay.southeastColor));
            } else if (underlay.flat) {
                Pix3D.fillTexturedTriangle(py1, px3, pz0, pz1, py3, px1, underlay.northeastColor, underlay.northwestColor, underlay.southeastColor, x0, y0, z0, x1, x3, y1, y3, z1, z3, underlay.textureId);
            } else {
                Pix3D.fillTexturedTriangle(py1, px3, pz0, pz1, py3, px1, underlay.northeastColor, underlay.northwestColor, underlay.southeastColor, x2, y2, z2, x3, x1, y3, y1, z3, z1, underlay.textureId);
            }
        }
        if ((px0 - pz0) * (py3 - px1) - (py0 - px1) * (px3 - pz0) <= 0) {
            return;
        }
        Pix3D.clipX = px0 < 0 || pz0 < 0 || px3 < 0 || px0 > Pix2D.boundX || pz0 > Pix2D.boundX || px3 > Pix2D.boundX;
        if (World3D.takingInput && this.pointInsideTriangle(World3D.mouseX, World3D.mouseY, py0, px1, py3, px0, pz0, px3)) {
            World3D.clickTileX = tileX;
            World3D.clickTileZ = tileZ;
        }
        if (underlay.textureId !== -1) {
            if (!World3D.lowMemory) {
                Pix3D.fillTexturedTriangle(px0, pz0, px3, py0, px1, py3, underlay.southwestColor, underlay.southeastColor, underlay.northwestColor, x0, y0, z0, x1, x3, y1, y3, z1, z3, underlay.textureId);
                return;
            }
            const averageColor: number = World3D.TEXTURE_HSL[underlay.textureId];
            Pix3D.fillGouraudTriangle(px0, pz0, px3, py0, px1, py3, this.mulLightness(averageColor, underlay.southwestColor), this.mulLightness(averageColor, underlay.southeastColor), this.mulLightness(averageColor, underlay.northwestColor));
        } else if (underlay.southwestColor !== 12345678) {
            Pix3D.fillGouraudTriangle(px0, pz0, px3, py0, px1, py3, underlay.southwestColor, underlay.southeastColor, underlay.northwestColor);
        }
    }

    private drawTileOverlay(tileX: number, tileZ: number, overlay: TileOverlay, sinEyePitch: number, cosEyePitch: number, sinEyeYaw: number, cosEyeYaw: number): void {
        let vertexCount: number = overlay.vertexX.length;

        for (let i: number = 0; i < vertexCount; i++) {
            let x: number = overlay.vertexX[i] - World3D.eyeX;
            let y: number = overlay.vertexY[i] - World3D.eyeY;
            let z: number = overlay.vertexZ[i] - World3D.eyeZ;

            let tmp: number = (z * sinEyeYaw + x * cosEyeYaw) >> 16;
            z = (z * cosEyeYaw - x * sinEyeYaw) >> 16;
            x = tmp;

            tmp = (y * cosEyePitch - z * sinEyePitch) >> 16;
            z = (y * sinEyePitch + z * cosEyePitch) >> 16;
            y = tmp;

            if (z < 50) {
                return;
            }

            if (overlay.triangleTextureIds) {
                TileOverlay.tmpViewspaceX[i] = x;
                TileOverlay.tmpViewspaceY[i] = y;
                TileOverlay.tmpViewspaceZ[i] = z;
            }
            TileOverlay.tmpScreenX[i] = Pix3D.centerX + (((x << 9) / z) | 0);
            TileOverlay.tmpScreenY[i] = Pix3D.centerY + (((y << 9) / z) | 0);
        }

        Pix3D.alpha = 0;

        vertexCount = overlay.triangleVertexA.length;
        for (let v: number = 0; v < vertexCount; v++) {
            const a: number = overlay.triangleVertexA[v];
            const b: number = overlay.triangleVertexB[v];
            const c: number = overlay.triangleVertexC[v];

            const x0: number = TileOverlay.tmpScreenX[a];
            const x1: number = TileOverlay.tmpScreenX[b];
            const x2: number = TileOverlay.tmpScreenX[c];
            const y0: number = TileOverlay.tmpScreenY[a];
            const y1: number = TileOverlay.tmpScreenY[b];
            const y2: number = TileOverlay.tmpScreenY[c];

            if ((x0 - x1) * (y2 - y1) - (y0 - y1) * (x2 - x1) > 0) {
                Pix3D.clipX = x0 < 0 || x1 < 0 || x2 < 0 || x0 > Pix2D.boundX || x1 > Pix2D.boundX || x2 > Pix2D.boundX;
                if (World3D.takingInput && this.pointInsideTriangle(World3D.mouseX, World3D.mouseY, y0, y1, y2, x0, x1, x2)) {
                    World3D.clickTileX = tileX;
                    World3D.clickTileZ = tileZ;
                }
                if (!overlay.triangleTextureIds || overlay.triangleTextureIds[v] === -1) {
                    if (overlay.triangleColorA[v] !== 12345678) {
                        Pix3D.fillGouraudTriangle(x0, x1, x2, y0, y1, y2, overlay.triangleColorA[v], overlay.triangleColorB[v], overlay.triangleColorC[v]);
                    }
                } else if (World3D.lowMemory) {
                    const textureColor: number = World3D.TEXTURE_HSL[overlay.triangleTextureIds[v]];
                    Pix3D.fillGouraudTriangle(x0, x1, x2, y0, y1, y2, this.mulLightness(textureColor, overlay.triangleColorA[v]), this.mulLightness(textureColor, overlay.triangleColorB[v]), this.mulLightness(textureColor, overlay.triangleColorC[v]));
                } else if (overlay.flat) {
                    Pix3D.fillTexturedTriangle(
                        x0,
                        x1,
                        x2,
                        y0,
                        y1,
                        y2,
                        overlay.triangleColorA[v],
                        overlay.triangleColorB[v],
                        overlay.triangleColorC[v],
                        TileOverlay.tmpViewspaceX[0],
                        TileOverlay.tmpViewspaceY[0],
                        TileOverlay.tmpViewspaceZ[0],
                        TileOverlay.tmpViewspaceX[1],
                        TileOverlay.tmpViewspaceX[3],
                        TileOverlay.tmpViewspaceY[1],
                        TileOverlay.tmpViewspaceY[3],
                        TileOverlay.tmpViewspaceZ[1],
                        TileOverlay.tmpViewspaceZ[3],
                        overlay.triangleTextureIds[v]
                    );
                } else {
                    Pix3D.fillTexturedTriangle(
                        x0,
                        x1,
                        x2,
                        y0,
                        y1,
                        y2,
                        overlay.triangleColorA[v],
                        overlay.triangleColorB[v],
                        overlay.triangleColorC[v],
                        TileOverlay.tmpViewspaceX[a],
                        TileOverlay.tmpViewspaceY[a],
                        TileOverlay.tmpViewspaceZ[a],
                        TileOverlay.tmpViewspaceX[b],
                        TileOverlay.tmpViewspaceX[c],
                        TileOverlay.tmpViewspaceY[b],
                        TileOverlay.tmpViewspaceY[c],
                        TileOverlay.tmpViewspaceZ[b],
                        TileOverlay.tmpViewspaceZ[c],
                        overlay.triangleTextureIds[v]
                    );
                }
            }
        }
    }

    private tileVisible(level: number, x: number, z: number): boolean {
        const cycle: number = this.levelTileOcclusionCycles[level][x][z];
        if (cycle === -World3D.cycle) {
            return false;
        } else if (cycle === World3D.cycle) {
            return true;
        } else {
            const sx: number = x << 7;
            const sz: number = z << 7;
            if (
                this.occluded(sx + 1, this.levelHeightmaps[level][x][z], sz + 1) &&
                this.occluded(sx + 128 - 1, this.levelHeightmaps[level][x + 1][z], sz + 1) &&
                this.occluded(sx + 128 - 1, this.levelHeightmaps[level][x + 1][z + 1], sz + 128 - 1) &&
                this.occluded(sx + 1, this.levelHeightmaps[level][x][z + 1], sz + 128 - 1)
            ) {
                this.levelTileOcclusionCycles[level][x][z] = World3D.cycle;
                return true;
            } else {
                this.levelTileOcclusionCycles[level][x][z] = -World3D.cycle;
                return false;
            }
        }
    }

    private wallVisible(level: number, x: number, z: number, spans: number): boolean {
        if (!this.tileVisible(level, x, z)) {
            return false;
        }
        const sceneX: number = x << 7;
        const sceneZ: number = z << 7;
        const sceneY: number = this.levelHeightmaps[level][x][z] - 1;
        const y0: number = sceneY - 120;
        const y1: number = sceneY - 230;
        const y2: number = sceneY - 238;
        if (spans < LocSpans.CORNER_WEST) {
            if (spans === LocSpans.WEST) {
                if (sceneX > World3D.eyeX) {
                    if (!this.occluded(sceneX, sceneY, sceneZ)) {
                        return false;
                    }
                    if (!this.occluded(sceneX, sceneY, sceneZ + 128)) {
                        return false;
                    }
                }
                if (level > 0) {
                    if (!this.occluded(sceneX, y0, sceneZ)) {
                        return false;
                    }
                    if (!this.occluded(sceneX, y0, sceneZ + 128)) {
                        return false;
                    }
                }
                if (!this.occluded(sceneX, y1, sceneZ)) {
                    return false;
                }
                return this.occluded(sceneX, y1, sceneZ + 128);
            }
            if (spans === LocSpans.NORTH) {
                if (sceneZ < World3D.eyeZ) {
                    if (!this.occluded(sceneX, sceneY, sceneZ + 128)) {
                        return false;
                    }
                    if (!this.occluded(sceneX + 128, sceneY, sceneZ + 128)) {
                        return false;
                    }
                }
                if (level > 0) {
                    if (!this.occluded(sceneX, y0, sceneZ + 128)) {
                        return false;
                    }
                    if (!this.occluded(sceneX + 128, y0, sceneZ + 128)) {
                        return false;
                    }
                }
                if (!this.occluded(sceneX, y1, sceneZ + 128)) {
                    return false;
                }
                return this.occluded(sceneX + 128, y1, sceneZ + 128);
            }
            if (spans === LocSpans.EAST) {
                if (sceneX < World3D.eyeX) {
                    if (!this.occluded(sceneX + 128, sceneY, sceneZ)) {
                        return false;
                    }
                    if (!this.occluded(sceneX + 128, sceneY, sceneZ + 128)) {
                        return false;
                    }
                }
                if (level > 0) {
                    if (!this.occluded(sceneX + 128, y0, sceneZ)) {
                        return false;
                    }
                    if (!this.occluded(sceneX + 128, y0, sceneZ + 128)) {
                        return false;
                    }
                }
                if (!this.occluded(sceneX + 128, y1, sceneZ)) {
                    return false;
                }
                return this.occluded(sceneX + 128, y1, sceneZ + 128);
            }
            if (spans === LocSpans.SOUTH) {
                if (sceneZ > World3D.eyeZ) {
                    if (!this.occluded(sceneX, sceneY, sceneZ)) {
                        return false;
                    }
                    if (!this.occluded(sceneX + 128, sceneY, sceneZ)) {
                        return false;
                    }
                }
                if (level > 0) {
                    if (!this.occluded(sceneX, y0, sceneZ)) {
                        return false;
                    }
                    if (!this.occluded(sceneX + 128, y0, sceneZ)) {
                        return false;
                    }
                }
                if (!this.occluded(sceneX, y1, sceneZ)) {
                    return false;
                }
                return this.occluded(sceneX + 128, y1, sceneZ);
            }
        }
        if (!this.occluded(sceneX + 64, y2, sceneZ + 64)) {
            return false;
        } else if (spans === LocSpans.CORNER_WEST) {
            return this.occluded(sceneX, y1, sceneZ + 128);
        } else if (spans === LocSpans.CORNER_NORTH) {
            return this.occluded(sceneX + 128, y1, sceneZ + 128);
        } else if (spans === LocSpans.CORNER_EAST) {
            return this.occluded(sceneX + 128, y1, sceneZ);
        } else if (spans === LocSpans.CORNER_SOUTH) {
            return this.occluded(sceneX, y1, sceneZ);
        }
        console.warn('Warning unsupported wall type!');
        return true;
    }

    private visible(level: number, tileX: number, tileZ: number, y: number): boolean {
        if (this.tileVisible(level, tileX, tileZ)) {
            const x: number = tileX << 7;
            const z: number = tileZ << 7;
            return (
                this.occluded(x + 1, this.levelHeightmaps[level][tileX][tileZ] - y, z + 1) &&
                this.occluded(x + 128 - 1, this.levelHeightmaps[level][tileX + 1][tileZ] - y, z + 1) &&
                this.occluded(x + 128 - 1, this.levelHeightmaps[level][tileX + 1][tileZ + 1] - y, z + 128 - 1) &&
                this.occluded(x + 1, this.levelHeightmaps[level][tileX][tileZ + 1] - y, z + 128 - 1)
            );
        }
        return false;
    }

    private locVisible(level: number, minX: number, maxX: number, minZ: number, maxZ: number, y: number): boolean {
        let x: number;
        let z: number;
        if (minX !== maxX || minZ !== maxZ) {
            for (x = minX; x <= maxX; x++) {
                for (z = minZ; z <= maxZ; z++) {
                    if (this.levelTileOcclusionCycles[level][x][z] === -World3D.cycle) {
                        return false;
                    }
                }
            }
            z = (minX << 7) + 1;
            const z0: number = (minZ << 7) + 2;
            const y0: number = this.levelHeightmaps[level][minX][minZ] - y;
            if (!this.occluded(z, y0, z0)) {
                return false;
            }
            const x1: number = (maxX << 7) - 1;
            if (!this.occluded(x1, y0, z0)) {
                return false;
            }
            const z1: number = (maxZ << 7) - 1;
            if (!this.occluded(z, y0, z1)) {
                return false;
            } else return this.occluded(x1, y0, z1);
        } else if (this.tileVisible(level, minX, minZ)) {
            x = minX << 7;
            z = minZ << 7;
            return (
                this.occluded(x + 1, this.levelHeightmaps[level][minX][minZ] - y, z + 1) &&
                this.occluded(x + 128 - 1, this.levelHeightmaps[level][minX + 1][minZ] - y, z + 1) &&
                this.occluded(x + 128 - 1, this.levelHeightmaps[level][minX + 1][minZ + 1] - y, z + 128 - 1) &&
                this.occluded(x + 1, this.levelHeightmaps[level][minX][minZ + 1] - y, z + 128 - 1)
            );
        }
        return false;
    }

    private occluded(x: number, y: number, z: number): boolean {
        for (let i: number = 0; i < World3D.activeOccluderCount; i++) {
            const occluder: Occlude | null = World3D.activeOccluders[i];
            if (!occluder) {
                continue;
            }

            if (occluder.mode === OccludeMode.FRONT) {
                const dx: number = occluder.minX - x;
                if (dx > 0) {
                    const minZ: number = occluder.minZ + ((occluder.minDeltaZ * dx) >> 8);
                    const maxZ: number = occluder.maxZ + ((occluder.maxDeltaZ * dx) >> 8);
                    const minY: number = occluder.minY + ((occluder.minDeltaY * dx) >> 8);
                    const maxY: number = occluder.maxY + ((occluder.maxDeltaY * dx) >> 8);
                    if (z >= minZ && z <= maxZ && y >= minY && y <= maxY) {
                        return true;
                    }
                }
            } else if (occluder.mode === OccludeMode.BACK) {
                const dx: number = x - occluder.minX;
                if (dx > 0) {
                    const minZ: number = occluder.minZ + ((occluder.minDeltaZ * dx) >> 8);
                    const maxZ: number = occluder.maxZ + ((occluder.maxDeltaZ * dx) >> 8);
                    const minY: number = occluder.minY + ((occluder.minDeltaY * dx) >> 8);
                    const maxY: number = occluder.maxY + ((occluder.maxDeltaY * dx) >> 8);
                    if (z >= minZ && z <= maxZ && y >= minY && y <= maxY) {
                        return true;
                    }
                }
            } else if (occluder.mode === OccludeMode.RIGHT) {
                const dz: number = occluder.minZ - z;
                if (dz > 0) {
                    const minX: number = occluder.minX + ((occluder.minDeltaX * dz) >> 8);
                    const maxX: number = occluder.maxX + ((occluder.maxDeltaX * dz) >> 8);
                    const minY: number = occluder.minY + ((occluder.minDeltaY * dz) >> 8);
                    const maxY: number = occluder.maxY + ((occluder.maxDeltaY * dz) >> 8);
                    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                        return true;
                    }
                }
            } else if (occluder.mode === OccludeMode.LEFT) {
                const dz: number = z - occluder.minZ;
                if (dz > 0) {
                    const minX: number = occluder.minX + ((occluder.minDeltaX * dz) >> 8);
                    const maxX: number = occluder.maxX + ((occluder.maxDeltaX * dz) >> 8);
                    const minY: number = occluder.minY + ((occluder.minDeltaY * dz) >> 8);
                    const maxY: number = occluder.maxY + ((occluder.maxDeltaY * dz) >> 8);
                    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
                        return true;
                    }
                }
            } else if (occluder.mode === OccludeMode.ABOVE) {
                const dy: number = y - occluder.minY;
                if (dy > 0) {
                    const minX: number = occluder.minX + ((occluder.minDeltaX * dy) >> 8);
                    const maxX: number = occluder.maxX + ((occluder.maxDeltaX * dy) >> 8);
                    const minZ: number = occluder.minZ + ((occluder.minDeltaZ * dy) >> 8);
                    const maxZ: number = occluder.maxZ + ((occluder.maxDeltaZ * dy) >> 8);
                    if (x >= minX && x <= maxX && z >= minZ && z <= maxZ) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private pointInsideTriangle(x: number, y: number, y0: number, y1: number, y2: number, x0: number, x1: number, x2: number): boolean {
        if (y < y0 && y < y1 && y < y2) {
            return false;
        } else if (y > y0 && y > y1 && y > y2) {
            return false;
        } else if (x < x0 && x < x1 && x < x2) {
            return false;
        } else if (x > x0 && x > x1 && x > x2) {
            return false;
        }
        const crossProduct_01: number = (y - y0) * (x1 - x0) - (x - x0) * (y1 - y0);
        const crossProduct_20: number = (y - y2) * (x0 - x2) - (x - x2) * (y0 - y2);
        const crossProduct_12: number = (y - y1) * (x2 - x1) - (x - x1) * (y2 - y1);
        return crossProduct_01 * crossProduct_12 > 0 && crossProduct_12 * crossProduct_20 > 0;
    }

    private mulLightness(hsl: number, lightness: number): number {
        const invLightness: number = 127 - lightness;
        lightness = ((invLightness * (hsl & 0x7f)) / 160) | 0;
        if (lightness < 2) {
            lightness = 2;
        } else if (lightness > 126) {
            lightness = 126;
        }
        return (hsl & 0xff80) + lightness;
    }
}
