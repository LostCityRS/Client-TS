import FloType from '#/config/FloType.js';
import LocType from '#/config/LocType.js';
import SeqType from '#/config/SeqType.js';

import LinkList from '#/datastruct/LinkList.js';

import CollisionMap, { CollisionConstants } from '#/dash3d/CollisionMap.js';
import { LocAngle } from '#/dash3d/LocAngle.js';
import LocShape from '#/dash3d/LocShape.js';
import World3D from '#/dash3d/World3D.js';

import LocEntity from '#/dash3d/entity/LocEntity.js';

import { TileOverlayShape } from '#/dash3d/type/TileOverlayShape.js';

import { Colors } from '#/graphics/Colors.js';
import Pix3D from '#/graphics/Pix3D.js';
import Model from '#/graphics/Model.js';

import Packet from '#/io/Packet.js';

import { Int32Array2d, Int32Array3d, Uint8Array3d } from '#/util/Arrays.js';
import { LocLayer } from '#/dash3d/LocLayer.ts';
import { TileFlag } from '#/dash3d/TileFlag.ts';
import { LocSpans } from '#/dash3d/LocSpans.ts';
import { OccludeType } from '#/dash3d/OccludeType.ts';

// noinspection JSSuspiciousNameCombination,DuplicatedCode
export default class World {
    static readonly ROTATION_WALL_TYPE: Int8Array = Int8Array.of(
        LocSpans.WEST,
        LocSpans.NORTH,
        LocSpans.EAST,
        LocSpans.SOUTH
    );

    static readonly ROTATION_WALL_CORNER_TYPE: Uint8Array = Uint8Array.of(
        LocSpans.CORNER_WEST,
        LocSpans.CORNER_NORTH,
        LocSpans.CORNER_EAST,
        LocSpans.CORNER_SOUTH
    );

    static readonly WALL_DECORATION_ROTATION_FORWARD_X: Int8Array = Int8Array.of(1, 0, -1, 0);
    static readonly WALL_DECORATION_ROTATION_FORWARD_Z: Int8Array = Int8Array.of(0, -1, 0, 1);

    static randomHueOffset: number = ((Math.random() * 17.0) | 0) - 8;
    static randomLightnessOffset: number = ((Math.random() * 33.0) | 0) - 16;

    static lowMemory: boolean = true;
    static levelBuilt: number = 0;
    static fullbright: boolean = false;

    static perlin(x: number, z: number): number {
        let value: number = this.perlinScale(x + 45365, z + 91923, 4) + ((this.perlinScale(x + 10294, z + 37821, 2) - 128) >> 1) + ((this.perlinScale(x, z, 1) - 128) >> 2) - 128;
        value = ((value * 0.3) | 0) + 35;
        if (value < 10) {
            value = 10;
        } else if (value > 60) {
            value = 60;
        }
        return value;
    }

    static perlinScale(x: number, z: number, scale: number): number {
        const intX: number = (x / scale) | 0;
        const fracX: number = x & (scale - 1);
        const intZ: number = (z / scale) | 0;
        const fracZ: number = z & (scale - 1);
        const v1: number = this.smoothNoise(intX, intZ);
        const v2: number = this.smoothNoise(intX + 1, intZ);
        const v3: number = this.smoothNoise(intX, intZ + 1);
        const v4: number = this.smoothNoise(intX + 1, intZ + 1);
        const i1: number = this.interpolate(v1, v2, fracX, scale);
        const i2: number = this.interpolate(v3, v4, fracX, scale);
        return this.interpolate(i1, i2, fracZ, scale);
    }

    static interpolate(a: number, b: number, x: number, scale: number): number {
        const f: number = (65536 - Pix3D.cos[((x * 1024) / scale) | 0]) >> 1;
        return ((a * (65536 - f)) >> 16) + ((b * f) >> 16);
    }

    static smoothNoise(x: number, y: number): number {
        const corners: number = this.noise(x - 1, y - 1) + this.noise(x + 1, y - 1) + this.noise(x - 1, y + 1) + this.noise(x + 1, y + 1);
        const sides: number = this.noise(x - 1, y) + this.noise(x + 1, y) + this.noise(x, y - 1) + this.noise(x, y + 1);
        const center: number = this.noise(x, y);
        return ((corners / 16) | 0) + ((sides / 8) | 0) + ((center / 4) | 0);
    }

    static noise(x: number, y: number): number {
        const n: number = x + y * 57;
        const n1: bigint = BigInt((n << 13) ^ n);
        return Number(((n1 * (n1 * n1 * 15731n + 789221n) + 1376312589n) & 0x7fffffffn) >> 19n) & 0xff;
    }

    static addLoc(level: number, x: number, z: number, scene: World3D | null, levelHeightmap: Int32Array[][], locs: LinkList, collision: CollisionMap | null, locId: number, shape: number, angle: number, trueLevel: number): void {
        const heightSW: number = levelHeightmap[trueLevel][x][z];
        const heightSE: number = levelHeightmap[trueLevel][x + 1][z];
        const heightNW: number = levelHeightmap[trueLevel][x + 1][z + 1];
        const heightNE: number = levelHeightmap[trueLevel][x][z + 1];
        const y: number = (heightSW + heightSE + heightNW + heightNE) >> 2;

        const loc: LocType = LocType.get(locId);

        let typecode: number = (x + (z << 7) + (locId << 14) + 0x40000000) | 0;
        if (!loc.locActive) {
            typecode += -0x80000000; // int.min
        }
        typecode |= 0;

        const info: number = ((((angle << 6) + shape) | 0) << 24) >> 24;

        if (shape === LocShape.GROUND_DECOR.id) {
            scene?.addGroundDecoration(loc.getModel(LocShape.GROUND_DECOR.id, angle, heightSW, heightSE, heightNW, heightNE, -1), level, x, z, y, typecode, info);

            if (loc.blockwalk && loc.locActive) {
                collision?.addFloor(x, z);
            }

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.GROUND_DECOR, x, z, SeqType.instances[loc.anim], true));
            }
        } else if (shape === LocShape.CENTREPIECE_STRAIGHT.id || shape === LocShape.CENTREPIECE_DIAGONAL.id) {
            const model: Model | null = loc.getModel(LocShape.CENTREPIECE_STRAIGHT.id, angle, heightSW, heightSE, heightNW, heightNE, -1);
            if (model) {
                let yaw: number = 0;
                if (shape === LocShape.CENTREPIECE_DIAGONAL.id) {
                    yaw += 256;
                }

                let width: number;
                let height: number;
                if (angle === LocAngle.NORTH || angle === LocAngle.SOUTH) {
                    width = loc.length;
                    height = loc.width;
                } else {
                    width = loc.width;
                    height = loc.length;
                }

                scene?.addLoc(level, x, z, y, model, null, typecode, info, width, height, yaw);
            }

            if (loc.blockwalk) {
                collision?.addLoc(x, z, loc.width, loc.length, angle, loc.blockrange);
            }

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.GROUND, x, z, SeqType.instances[loc.anim], true));
            }
        } else if (shape >= LocShape.ROOF_STRAIGHT.id) {
            scene?.addLoc(level, x, z, y, loc.getModel(shape, angle, heightSW, heightSE, heightNW, heightNE, -1), null, typecode, info, 1, 1, 0);

            if (loc.blockwalk) {
                collision?.addLoc(x, z, loc.width, loc.length, angle, loc.blockrange);
            }

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.GROUND, x, z, SeqType.instances[loc.anim], true));
            }
        } else if (shape === LocShape.WALL_STRAIGHT.id) {
            scene?.addWall(level, x, z, y, World.ROTATION_WALL_TYPE[angle], 0, loc.getModel(LocShape.WALL_STRAIGHT.id, angle, heightSW, heightSE, heightNW, heightNE, -1), null, typecode, info);

            if (loc.blockwalk) {
                collision?.addWall(x, z, shape, angle, loc.blockrange);
            }

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.WALL, x, z, SeqType.instances[loc.anim], true));
            }
        } else if (shape === LocShape.WALL_DIAGONAL_CORNER.id) {
            scene?.addWall(level, x, z, y, World.ROTATION_WALL_CORNER_TYPE[angle], 0, loc.getModel(LocShape.WALL_DIAGONAL_CORNER.id, angle, heightSW, heightSE, heightNW, heightNE, -1), null, typecode, info);

            if (loc.blockwalk) {
                collision?.addWall(x, z, shape, angle, loc.blockrange);
            }

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.WALL, x, z, SeqType.instances[loc.anim], true));
            }
        } else if (shape === LocShape.WALL_L.id) {
            const offset: number = (angle + 1) & 0x3;

            scene?.addWall(
                level,
                x,
                z,
                y,
                World.ROTATION_WALL_TYPE[angle],
                World.ROTATION_WALL_TYPE[offset],
                loc.getModel(LocShape.WALL_L.id, angle + 4, heightSW, heightSE, heightNW, heightNE, -1),
                loc.getModel(LocShape.WALL_L.id, offset, heightSW, heightSE, heightNW, heightNE, -1),
                typecode,
                info
            );

            if (loc.blockwalk) {
                collision?.addWall(x, z, shape, angle, loc.blockrange);
            }

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.WALL, x, z, SeqType.instances[loc.anim], true));
            }
        } else if (shape === LocShape.WALL_SQUARE_CORNER.id) {
            scene?.addWall(level, x, z, y, World.ROTATION_WALL_CORNER_TYPE[angle], 0, loc.getModel(LocShape.WALL_SQUARE_CORNER.id, angle, heightSW, heightSE, heightNW, heightNE, -1), null, typecode, info);

            if (loc.blockwalk) {
                collision?.addWall(x, z, shape, angle, loc.blockrange);
            }

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.WALL, x, z, SeqType.instances[loc.anim], true));
            }
        } else if (shape === LocShape.WALL_DIAGONAL.id) {
            scene?.addLoc(level, x, z, y, loc.getModel(shape, angle, heightSW, heightSE, heightNW, heightNE, -1), null, typecode, info, 1, 1, 0);

            if (loc.blockwalk) {
                collision?.addLoc(x, z, loc.width, loc.length, angle, loc.blockrange);
            }

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.GROUND, x, z, SeqType.instances[loc.anim], true));
            }
        } else if (shape === LocShape.WALLDECOR_STRAIGHT_NOOFFSET.id) {
            scene?.setWallDecoration(level, x, z, y, 0, 0, typecode, loc.getModel(LocShape.WALLDECOR_STRAIGHT_NOOFFSET.id, LocAngle.WEST, heightSW, heightSE, heightNW, heightNE, -1), info, angle * 512, World.ROTATION_WALL_TYPE[angle]);

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.WALL_DECOR, x, z, SeqType.instances[loc.anim], true));
            }
        } else if (shape === LocShape.WALLDECOR_STRAIGHT_OFFSET.id) {
            let offset: number = 16;
            if (scene) {
                const typecode: number = scene.getWallTypecode(level, x, z);
                if (typecode > 0) {
                    offset = LocType.get((typecode >> 14) & 0x7fff).wallwidth;
                }
            }

            scene?.setWallDecoration(
                level,
                x,
                z,
                y,
                World.WALL_DECORATION_ROTATION_FORWARD_X[angle] * offset,
                World.WALL_DECORATION_ROTATION_FORWARD_Z[angle] * offset,
                typecode,
                loc.getModel(LocShape.WALLDECOR_STRAIGHT_NOOFFSET.id, LocAngle.WEST, heightSW, heightSE, heightNW, heightNE, -1),
                info,
                angle * 512,
                World.ROTATION_WALL_TYPE[angle]
            );

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.WALL_DECOR, x, z, SeqType.instances[loc.anim], true));
            }
        } else if (shape === LocShape.WALLDECOR_DIAGONAL_OFFSET.id) {
            scene?.setWallDecoration(level, x, z, y, 0, 0, typecode, loc.getModel(LocShape.WALLDECOR_STRAIGHT_NOOFFSET.id, LocAngle.WEST, heightSW, heightSE, heightNW, heightNE, -1), info, angle, LocSpans.DECOR_OFFSET);

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.WALL_DECOR, x, z, SeqType.instances[loc.anim], true));
            }
        } else if (shape === LocShape.WALLDECOR_DIAGONAL_NOOFFSET.id) {
            scene?.setWallDecoration(level, x, z, y, 0, 0, typecode, loc.getModel(LocShape.WALLDECOR_STRAIGHT_NOOFFSET.id, LocAngle.WEST, heightSW, heightSE, heightNW, heightNE, -1), info, angle, LocSpans.DECOR_NOOFFSET);

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.WALL_DECOR, x, z, SeqType.instances[loc.anim], true));
            }
        } else if (shape === LocShape.WALLDECOR_DIAGONAL_BOTH.id) {
            scene?.setWallDecoration(level, x, z, y, 0, 0, typecode, loc.getModel(LocShape.WALLDECOR_STRAIGHT_NOOFFSET.id, LocAngle.WEST, heightSW, heightSE, heightNW, heightNE, -1), info, angle, LocSpans.DECOR_BOTH);

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.WALL_DECOR, x, z, SeqType.instances[loc.anim], true));
            }
        }
    }
    private readonly maxTileX: number;
    private readonly maxTileZ: number;
    private readonly levelHeightmap: Int32Array[][];
    private readonly levelTileFlags: Uint8Array[][];
    private readonly levelTileUnderlayIds: Uint8Array[][];
    private readonly levelTileOverlayIds: Uint8Array[][];
    private readonly levelTileOverlayShape: Uint8Array[][];
    private readonly levelTileOverlayRotation: Uint8Array[][];
    private readonly levelShademap: Uint8Array[][];
    private readonly levelLightmap: Int32Array[];
    private readonly blendChroma: Int32Array;
    private readonly blendSaturation: Int32Array;
    private readonly blendLightness: Int32Array;
    private readonly blendLuminance: Int32Array;
    private readonly blendMagnitude: Int32Array;
    private readonly levelOccludemap: Int32Array[][];

    public constructor(maxTileX: number, maxTileZ: number, levelHeightmap: Int32Array[][], levelTileFlags: Uint8Array[][]) {
        this.maxTileX = maxTileX;
        this.maxTileZ = maxTileZ;
        this.levelHeightmap = levelHeightmap;
        this.levelTileFlags = levelTileFlags;

        this.levelTileUnderlayIds = new Uint8Array3d(CollisionConstants.LEVELS, maxTileX, maxTileZ);
        this.levelTileOverlayIds = new Uint8Array3d(CollisionConstants.LEVELS, maxTileX, maxTileZ);
        this.levelTileOverlayShape = new Uint8Array3d(CollisionConstants.LEVELS, maxTileX, maxTileZ);
        this.levelTileOverlayRotation = new Uint8Array3d(CollisionConstants.LEVELS, maxTileX, maxTileZ);

        this.levelOccludemap = new Int32Array3d(CollisionConstants.LEVELS, maxTileX + 1, maxTileZ + 1);
        this.levelShademap = new Uint8Array3d(CollisionConstants.LEVELS, maxTileX + 1, maxTileZ + 1);
        this.levelLightmap = new Int32Array2d(maxTileX + 1, maxTileZ + 1);

        this.blendChroma = new Int32Array(maxTileZ);
        this.blendSaturation = new Int32Array(maxTileZ);
        this.blendLightness = new Int32Array(maxTileZ);
        this.blendLuminance = new Int32Array(maxTileZ);
        this.blendMagnitude = new Int32Array(maxTileZ);
    }

    build(scene: World3D | null, collision: (CollisionMap | null)[]): void {
        for (let level: number = 0; level < CollisionConstants.LEVELS; level++) {
            for (let x: number = 0; x < CollisionConstants.SIZE; x++) {
                for (let z: number = 0; z < CollisionConstants.SIZE; z++) {
                    // solid
                    if ((this.levelTileFlags[level][x][z] & TileFlag.BLOCKED) === TileFlag.BLOCKED) {
                        let trueLevel: number = level;

                        // bridge
                        if ((this.levelTileFlags[1][x][z] & TileFlag.BRIDGE) === TileFlag.BRIDGE) {
                            trueLevel--;
                        }

                        if (trueLevel >= 0) {
                            collision[trueLevel]?.addFloor(x, z);
                        }
                    }
                }
            }
        }

        World.randomHueOffset += ((Math.random() * 5.0) | 0) - 2;
        if (World.randomHueOffset < -8) {
            World.randomHueOffset = -8;
        } else if (World.randomHueOffset > 8) {
            World.randomHueOffset = 8;
        }

        World.randomLightnessOffset += ((Math.random() * 5.0) | 0) - 2;
        if (World.randomLightnessOffset < -16) {
            World.randomLightnessOffset = -16;
        } else if (World.randomLightnessOffset > 16) {
            World.randomLightnessOffset = 16;
        }

        for (let level: number = 0; level < CollisionConstants.LEVELS; level++) {
            const shademap: Uint8Array[] = this.levelShademap[level];
            const lightAmbient: number = 96;
            const lightAttenuation: number = 768;
            const lightX: number = -50;
            const lightY: number = -10;
            const lightZ: number = -50;
            const lightMag: number = Math.sqrt(lightX * lightX + lightY * lightY + lightZ * lightZ) | 0;
            const lightMagnitude: number = (lightAttenuation * lightMag) >> 8;

            for (let z: number = 1; z < this.maxTileZ - 1; z++) {
                for (let x: number = 1; x < this.maxTileX - 1; x++) {
                    const dx: number = this.levelHeightmap[level][x + 1][z] - this.levelHeightmap[level][x - 1][z];
                    const dz: number = this.levelHeightmap[level][x][z + 1] - this.levelHeightmap[level][x][z - 1];
                    const len: number = Math.sqrt(dx * dx + dz * dz + 65536) | 0;
                    const normalX: number = ((dx << 8) / len) | 0;
                    const normalY: number = (65536 / len) | 0;
                    const normalZ: number = ((dz << 8) / len) | 0;
                    const light: number = lightAmbient + (((lightX * normalX + lightY * normalY + lightZ * normalZ) / lightMagnitude) | 0);
                    const shade: number = (shademap[x - 1][z] >> 2) + (shademap[x + 1][z] >> 3) + (shademap[x][z - 1] >> 2) + (shademap[x][z + 1] >> 3) + (shademap[x][z] >> 1);
                    this.levelLightmap[x][z] = light - shade;
                }
            }

            for (let z: number = 0; z < this.maxTileZ; z++) {
                this.blendChroma[z] = 0;
                this.blendSaturation[z] = 0;
                this.blendLightness[z] = 0;
                this.blendLuminance[z] = 0;
                this.blendMagnitude[z] = 0;
            }

            for (let x0: number = -5; x0 < this.maxTileX + 5; x0++) {
                for (let z0: number = 0; z0 < this.maxTileZ; z0++) {
                    const x1: number = x0 + 5;
                    let debugMag: number;

                    if (x1 >= 0 && x1 < this.maxTileX) {
                        const underlayId: number = this.levelTileUnderlayIds[level][x1][z0] & 0xff;

                        if (underlayId > 0) {
                            const flu: FloType = FloType.instances[underlayId - 1];
                            this.blendChroma[z0] += flu.chroma;
                            this.blendSaturation[z0] += flu.saturation;
                            this.blendLightness[z0] += flu.lightness;
                            this.blendLuminance[z0] += flu.luminance;
                            debugMag = this.blendMagnitude[z0]++;
                        }
                    }

                    const x2: number = x0 - 5;
                    if (x2 >= 0 && x2 < this.maxTileX) {
                        const underlayId: number = this.levelTileUnderlayIds[level][x2][z0] & 0xff;

                        if (underlayId > 0) {
                            const flu: FloType = FloType.instances[underlayId - 1];
                            this.blendChroma[z0] -= flu.chroma;
                            this.blendSaturation[z0] -= flu.saturation;
                            this.blendLightness[z0] -= flu.lightness;
                            this.blendLuminance[z0] -= flu.luminance;
                            debugMag = this.blendMagnitude[z0]--;
                        }
                    }
                }

                if (x0 >= 1 && x0 < this.maxTileX - 1) {
                    let hueAccumulator: number = 0;
                    let saturationAccumulator: number = 0;
                    let lightnessAccumulator: number = 0;
                    let luminanceAccumulator: number = 0;
                    let magnitudeAccumulator: number = 0;

                    for (let z0: number = -5; z0 < this.maxTileZ + 5; z0++) {
                        const dz1: number = z0 + 5;
                        if (dz1 >= 0 && dz1 < this.maxTileZ) {
                            hueAccumulator += this.blendChroma[dz1];
                            saturationAccumulator += this.blendSaturation[dz1];
                            lightnessAccumulator += this.blendLightness[dz1];
                            luminanceAccumulator += this.blendLuminance[dz1];
                            magnitudeAccumulator += this.blendMagnitude[dz1];
                        }

                        const dz2: number = z0 - 5;
                        if (dz2 >= 0 && dz2 < this.maxTileZ) {
                            hueAccumulator -= this.blendChroma[dz2];
                            saturationAccumulator -= this.blendSaturation[dz2];
                            lightnessAccumulator -= this.blendLightness[dz2];
                            luminanceAccumulator -= this.blendLuminance[dz2];
                            magnitudeAccumulator -= this.blendMagnitude[dz2];
                        }

                        if (z0 >= 1 && z0 < this.maxTileZ - 1 && (!World.lowMemory || ((this.levelTileFlags[level][x0][z0] & TileFlag.LOWMEMORY) === TileFlag.OPEN && this.getDrawLevel(level, x0, z0) === World.levelBuilt))) {
                            const underlayId: number = this.levelTileUnderlayIds[level][x0][z0] & 0xff;
                            const overlayId: number = this.levelTileOverlayIds[level][x0][z0] & 0xff;

                            if (underlayId > 0 || overlayId > 0) {
                                const heightSW: number = this.levelHeightmap[level][x0][z0];
                                const heightSE: number = this.levelHeightmap[level][x0 + 1][z0];
                                const heightNE: number = this.levelHeightmap[level][x0 + 1][z0 + 1];
                                const heightNW: number = this.levelHeightmap[level][x0][z0 + 1];

                                const lightSW: number = this.levelLightmap[x0][z0];
                                const lightSE: number = this.levelLightmap[x0 + 1][z0];
                                const lightNE: number = this.levelLightmap[x0 + 1][z0 + 1];
                                const lightNW: number = this.levelLightmap[x0][z0 + 1];

                                let baseColor: number = -1;
                                let tintColor: number = -1;

                                if (underlayId > 0) {
                                    const hue: number = ((hueAccumulator * 256) / luminanceAccumulator) | 0;
                                    const saturation: number = (saturationAccumulator / magnitudeAccumulator) | 0;
                                    let lightness: number = (lightnessAccumulator / magnitudeAccumulator) | 0;
                                    baseColor = FloType.hsl24to16(hue, saturation, lightness);
                                    const randomHue: number = (hue + World.randomHueOffset) & 0xff;
                                    lightness += World.randomLightnessOffset;
                                    if (lightness < 0) {
                                        lightness = 0;
                                    } else if (lightness > 255) {
                                        lightness = 255;
                                    }
                                    tintColor = FloType.hsl24to16(randomHue, saturation, lightness);
                                }

                                if (level > 0) {
                                    let occludes: boolean = underlayId !== 0 || this.levelTileOverlayShape[level][x0][z0] === TileOverlayShape.PLAIN;

                                    if (overlayId > 0 && !FloType.instances[overlayId - 1].occlude) {
                                        occludes = false;
                                    }

                                    // occludes && flat
                                    if (occludes && heightSW === heightSE && heightSW === heightNE && heightSW === heightNW) {
                                        this.levelOccludemap[level][x0][z0] |= 0x924;
                                    }
                                }

                                let shadeColor: number = 0;
                                if (baseColor !== -1) {
                                    shadeColor = Pix3D.hslPal[FloType.mulHSL(tintColor, 96)];
                                }

                                if (overlayId === 0) {
                                    scene?.setTile(
                                        level,
                                        x0,
                                        z0,
                                        TileOverlayShape.PLAIN,
                                        LocAngle.WEST,
                                        -1,
                                        heightSW,
                                        heightSE,
                                        heightNE,
                                        heightNW,
                                        FloType.mulHSL(baseColor, lightSW),
                                        FloType.mulHSL(baseColor, lightSE),
                                        FloType.mulHSL(baseColor, lightNE),
                                        FloType.mulHSL(baseColor, lightNW),
                                        Colors.BLACK,
                                        Colors.BLACK,
                                        Colors.BLACK,
                                        Colors.BLACK,
                                        shadeColor,
                                        Colors.BLACK
                                    );
                                } else {
                                    const shape: number = this.levelTileOverlayShape[level][x0][z0] + 1;
                                    const rotation: number = this.levelTileOverlayRotation[level][x0][z0];
                                    const flo: FloType = FloType.instances[overlayId - 1];
                                    let textureId: number = flo.overlayTexture;
                                    let hsl: number;
                                    let rgb: number;

                                    if (textureId >= 0) {
                                        rgb = Pix3D.getAverageTextureRGB(textureId);
                                        hsl = -1;
                                    } else if (flo.rgb === Colors.MAGENTA) {
                                        rgb = 0;
                                        hsl = -2;
                                        textureId = -1;
                                    } else {
                                        hsl = FloType.hsl24to16(flo.hue, flo.saturation, flo.lightness);
                                        rgb = Pix3D.hslPal[FloType.adjustLightness(flo.hsl, 96)];
                                    }

                                    scene?.setTile(
                                        level,
                                        x0,
                                        z0,
                                        shape,
                                        rotation,
                                        textureId,
                                        heightSW,
                                        heightSE,
                                        heightNE,
                                        heightNW,
                                        FloType.mulHSL(baseColor, lightSW),
                                        FloType.mulHSL(baseColor, lightSE),
                                        FloType.mulHSL(baseColor, lightNE),
                                        FloType.mulHSL(baseColor, lightNW),
                                        FloType.adjustLightness(hsl, lightSW),
                                        FloType.adjustLightness(hsl, lightSE),
                                        FloType.adjustLightness(hsl, lightNE),
                                        FloType.adjustLightness(hsl, lightNW),
                                        shadeColor,
                                        rgb
                                    );
                                }
                            }
                        }
                    }
                }
            }

            for (let stz: number = 1; stz < this.maxTileZ - 1; stz++) {
                for (let stx: number = 1; stx < this.maxTileX - 1; stx++) {
                    scene?.setDrawLevel(level, stx, stz, this.getDrawLevel(level, stx, stz));
                }
            }
        }

        if (!World.fullbright) {
            scene?.buildModels(64, 768, -50, -10, -50);
        }

        for (let x: number = 0; x < this.maxTileX; x++) {
            for (let z: number = 0; z < this.maxTileZ; z++) {
                if ((this.levelTileFlags[1][x][z] & TileFlag.BRIDGE) === TileFlag.BRIDGE) {
                    scene?.setBridge(x, z);
                }
            }
        }

        if (!World.fullbright) {
            let horizontal: number = OccludeType.HORIZONTAL; // this flag is set by walls with rotation 0 or 2
            let vertical: number = OccludeType.VERTICAL; // this flag is set by walls with rotation 1 or 3
            let flat: number = OccludeType.FLAT; // this flag is set by floors which are flat

            for (let topLevel: number = 0; topLevel < CollisionConstants.LEVELS; topLevel++) {
                if (topLevel > 0) {
                    horizontal <<= 0x3;
                    vertical <<= 0x3;
                    flat <<= 0x3;
                }

                for (let level: number = 0; level <= topLevel; level++) {
                    for (let tileZ: number = 0; tileZ <= this.maxTileZ; tileZ++) {
                        for (let tileX: number = 0; tileX <= this.maxTileX; tileX++) {
                            if ((this.levelOccludemap[level][tileX][tileZ] & horizontal) !== OccludeType.NONE) {
                                let minTileZ: number = tileZ;
                                let maxTileZ: number = tileZ;
                                let minLevel: number = level;
                                let maxLevel: number = level;

                                while (minTileZ > 0 && (this.levelOccludemap[level][tileX][minTileZ - 1] & horizontal) !== OccludeType.NONE) {
                                    minTileZ--;
                                }

                                while (maxTileZ < this.maxTileZ && (this.levelOccludemap[level][tileX][maxTileZ + 1] & horizontal) !== OccludeType.NONE) {
                                    maxTileZ++;
                                }

                                find_min_level: while (minLevel > 0) {
                                    for (let z: number = minTileZ; z <= maxTileZ; z++) {
                                        if ((this.levelOccludemap[minLevel - 1][tileX][z] & horizontal) === OccludeType.NONE) {
                                            break find_min_level;
                                        }
                                    }
                                    minLevel--;
                                }

                                find_max_level: while (maxLevel < topLevel) {
                                    for (let z: number = minTileZ; z <= maxTileZ; z++) {
                                        if ((this.levelOccludemap[maxLevel + 1][tileX][z] & horizontal) === OccludeType.NONE) {
                                            break find_max_level;
                                        }
                                    }
                                    maxLevel++;
                                }

                                const area: number = (maxLevel + 1 - minLevel) * (maxTileZ + 1 - minTileZ);
                                if (area >= 8) {
                                    const minY: number = this.levelHeightmap[maxLevel][tileX][minTileZ] - 240;
                                    const maxX: number = this.levelHeightmap[minLevel][tileX][minTileZ];

                                    World3D.addOccluder(topLevel, OccludeType.HORIZONTAL, tileX * 128, minY, minTileZ * 128, tileX * 128, maxX, maxTileZ * 128 + 128);

                                    for (let l: number = minLevel; l <= maxLevel; l++) {
                                        for (let z: number = minTileZ; z <= maxTileZ; z++) {
                                            this.levelOccludemap[l][tileX][z] &= ~horizontal;
                                        }
                                    }
                                }
                            }

                            if ((this.levelOccludemap[level][tileX][tileZ] & vertical) !== OccludeType.NONE) {
                                let minTileX: number = tileX;
                                let maxTileX: number = tileX;
                                let minLevel: number = level;
                                let maxLevel: number = level;

                                while (minTileX > 0 && (this.levelOccludemap[level][minTileX - 1][tileZ] & vertical) !== OccludeType.NONE) {
                                    minTileX--;
                                }

                                while (maxTileX < this.maxTileX && (this.levelOccludemap[level][maxTileX + 1][tileZ] & vertical) !== OccludeType.NONE) {
                                    maxTileX++;
                                }

                                find_min_level2: while (minLevel > 0) {
                                    for (let x: number = minTileX; x <= maxTileX; x++) {
                                        if ((this.levelOccludemap[minLevel - 1][x][tileZ] & vertical) === OccludeType.NONE) {
                                            break find_min_level2;
                                        }
                                    }
                                    minLevel--;
                                }

                                find_max_level2: while (maxLevel < topLevel) {
                                    for (let x: number = minTileX; x <= maxTileX; x++) {
                                        if ((this.levelOccludemap[maxLevel + 1][x][tileZ] & vertical) === OccludeType.NONE) {
                                            break find_max_level2;
                                        }
                                    }
                                    maxLevel++;
                                }

                                const area: number = (maxLevel + 1 - minLevel) * (maxTileX + 1 - minTileX);

                                if (area >= 8) {
                                    const minY: number = this.levelHeightmap[maxLevel][minTileX][tileZ] - 240;
                                    const maxY: number = this.levelHeightmap[minLevel][minTileX][tileZ];

                                    World3D.addOccluder(topLevel, OccludeType.VERTICAL, minTileX * 128, minY, tileZ * 128, maxTileX * 128 + 128, maxY, tileZ * 128);

                                    for (let l: number = minLevel; l <= maxLevel; l++) {
                                        for (let x: number = minTileX; x <= maxTileX; x++) {
                                            this.levelOccludemap[l][x][tileZ] &= ~vertical;
                                        }
                                    }
                                }
                            }
                            if ((this.levelOccludemap[level][tileX][tileZ] & flat) !== OccludeType.NONE) {
                                let minTileX: number = tileX;
                                let maxTileX: number = tileX;
                                let minTileZ: number = tileZ;
                                let maxTileZ: number = tileZ;

                                while (minTileZ > 0 && (this.levelOccludemap[level][tileX][minTileZ - 1] & flat) !== OccludeType.NONE) {
                                    minTileZ--;
                                }

                                while (maxTileZ < this.maxTileZ && (this.levelOccludemap[level][tileX][maxTileZ + 1] & flat) !== OccludeType.NONE) {
                                    maxTileZ++;
                                }

                                find_min_tile_xz: while (minTileX > 0) {
                                    for (let z: number = minTileZ; z <= maxTileZ; z++) {
                                        if ((this.levelOccludemap[level][minTileX - 1][z] & flat) === OccludeType.NONE) {
                                            break find_min_tile_xz;
                                        }
                                    }
                                    minTileX--;
                                }

                                find_max_tile_xz: while (maxTileX < this.maxTileX) {
                                    for (let z: number = minTileZ; z <= maxTileZ; z++) {
                                        if ((this.levelOccludemap[level][maxTileX + 1][z] & flat) === OccludeType.NONE) {
                                            break find_max_tile_xz;
                                        }
                                    }
                                    maxTileX++;
                                }

                                if ((maxTileX + 1 - minTileX) * (maxTileZ + 1 - minTileZ) >= 4) {
                                    const y: number = this.levelHeightmap[level][minTileX][minTileZ];

                                    World3D.addOccluder(topLevel, OccludeType.FLAT, minTileX * 128, y, minTileZ * 128, maxTileX * 128 + 128, y, maxTileZ * 128 + 128);

                                    for (let x: number = minTileX; x <= maxTileX; x++) {
                                        for (let z: number = minTileZ; z <= maxTileZ; z++) {
                                            this.levelOccludemap[level][x][z] &= ~flat;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    clearLandscape(startX: number, startZ: number, endX: number, endZ: number): void {
        let waterOverlay: number = 0;
        for (let i: number = 0; i < FloType.totalCount; i++) {
            if (FloType.instances[i].debugname?.toLowerCase() === 'water') {
                waterOverlay = ((i + 1) << 24) >> 24;
                break;
            }
        }

        for (let z: number = startX; z < startX + endX; z++) {
            for (let x: number = startZ; x < startZ + endZ; x++) {
                if (x >= 0 && x < this.maxTileX && z >= 0 && z < this.maxTileZ) {
                    this.levelTileOverlayIds[0][x][z] = waterOverlay;

                    for (let level: number = 0; level < CollisionConstants.LEVELS; level++) {
                        this.levelHeightmap[level][x][z] = 0;
                        this.levelTileFlags[level][x][z] = TileFlag.OPEN;
                    }
                }
            }
        }
    }

    readLandscape(originX: number, originZ: number, xOffset: number, zOffset: number, src: Uint8Array): void {
        const buf: Packet = new Packet(src);

        for (let level: number = 0; level < CollisionConstants.LEVELS; level++) {
            for (let x: number = 0; x < 64; x++) {
                for (let z: number = 0; z < 64; z++) {
                    const stx: number = x + xOffset;
                    const stz: number = z + zOffset;
                    let opcode: number;

                    if (stx >= 0 && stx < CollisionConstants.SIZE && stz >= 0 && stz < CollisionConstants.SIZE) {
                        this.levelTileFlags[level][stx][stz] = TileFlag.OPEN;
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            opcode = buf.g1();
                            if (opcode === 0) {
                                if (level === 0) {
                                    this.levelHeightmap[0][stx][stz] = -World.perlin(stx + originX + 932731, stz + 556238 + originZ) * 8;
                                } else {
                                    this.levelHeightmap[level][stx][stz] = this.levelHeightmap[level - 1][stx][stz] - 240;
                                }
                                break;
                            }

                            if (opcode === 1) {
                                let height: number = buf.g1();
                                if (height === 1) {
                                    height = 0;
                                }
                                if (level === 0) {
                                    this.levelHeightmap[0][stx][stz] = -height * 8;
                                } else {
                                    this.levelHeightmap[level][stx][stz] = this.levelHeightmap[level - 1][stx][stz] - height * 8;
                                }
                                break;
                            }

                            if (opcode <= 49) {
                                this.levelTileOverlayIds[level][stx][stz] = buf.g1b();
                                this.levelTileOverlayShape[level][stx][stz] = ((((opcode - 2) / 4) | 0) << 24) >> 24;
                                this.levelTileOverlayRotation[level][stx][stz] = (((opcode - 2) & 0x3) << 24) >> 24;
                            } else if (opcode <= 81) {
                                this.levelTileFlags[level][stx][stz] = ((opcode - 49) << 24) >> 24;
                            } else {
                                this.levelTileUnderlayIds[level][stx][stz] = ((opcode - 81) << 24) >> 24;
                            }
                        }
                    } else {
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            opcode = buf.g1();
                            if (opcode === 0) {
                                break;
                            }

                            if (opcode === 1) {
                                buf.g1();
                                break;
                            }

                            if (opcode <= 49) {
                                buf.g1();
                            }
                        }
                    }
                }
            }
        }
    }

    readLocs(scene: World3D | null, locs: LinkList, collision: (CollisionMap | null)[], src: Uint8Array, xOffset: number, zOffset: number): void {
        const buf: Packet = new Packet(src);
        let locId: number = -1;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            const deltaId: number = buf.gsmarts();
            if (deltaId === 0) {
                return;
            }

            locId += deltaId;

            let locPos: number = 0;
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const deltaPos: number = buf.gsmarts();
                if (deltaPos === 0) {
                    break;
                }

                locPos += deltaPos - 1;
                const z: number = locPos & 0x3f;
                const x: number = (locPos >> 6) & 0x3f;
                const level: number = locPos >> 12;

                const info: number = buf.g1();
                const shape: number = info >> 2;
                const rotation: number = info & 0x3;
                const stx: number = x + xOffset;
                const stz: number = z + zOffset;

                if (stx > 0 && stz > 0 && stx < CollisionConstants.SIZE - 1 && stz < CollisionConstants.SIZE - 1) {
                    let currentLevel: number = level;
                    if ((this.levelTileFlags[1][stx][stz] & TileFlag.BRIDGE) === TileFlag.BRIDGE) {
                        currentLevel = level - 1;
                    }

                    let collisionMap: CollisionMap | null = null;
                    if (currentLevel >= 0) {
                        collisionMap = collision[currentLevel];
                    }

                    this.addLoc(level, stx, stz, scene, locs, collisionMap, locId, shape, rotation);
                }
            }
        }
    }

    private addLoc(level: number, x: number, z: number, scene: World3D | null, locs: LinkList, collision: CollisionMap | null, locId: number, shape: number, angle: number): void {
        if (World.lowMemory) {
            if ((this.levelTileFlags[level][x][z] & TileFlag.LOWMEMORY) !== TileFlag.OPEN) {
                return;
            }

            if (this.getDrawLevel(level, x, z) !== World.levelBuilt) {
                return;
            }
        }

        const heightSW: number = this.levelHeightmap[level][x][z];
        const heightSE: number = this.levelHeightmap[level][x + 1][z];
        const heightNW: number = this.levelHeightmap[level][x + 1][z + 1];
        const heightNE: number = this.levelHeightmap[level][x][z + 1];
        const y: number = (heightSW + heightSE + heightNW + heightNE) >> 2;

        const loc: LocType = LocType.get(locId);

        let typecode: number = (x + (z << 7) + (locId << 14) + 0x40000000) | 0;
        if (!loc.locActive) {
            typecode += -0x80000000; // int.min
        }
        typecode |= 0;

        const info: number = ((((angle << 6) + shape) | 0) << 24) >> 24;

        if (shape === LocShape.GROUND_DECOR.id) {
            if (!World.lowMemory || loc.locActive || loc.forcedecor) {
                scene?.addGroundDecoration(loc.getModel(LocShape.GROUND_DECOR.id, angle, heightSW, heightSE, heightNW, heightNE, -1), level, x, z, y, typecode, info);

                if (loc.blockwalk && loc.locActive) {
                    collision?.addFloor(x, z);
                }

                if (loc.anim !== -1) {
                    locs.addTail(new LocEntity(locId, level, LocLayer.GROUND_DECOR, x, z, SeqType.instances[loc.anim], true));
                }
            }
        } else if (shape === LocShape.CENTREPIECE_STRAIGHT.id || shape === LocShape.CENTREPIECE_DIAGONAL.id) {
            const model: Model | null = loc.getModel(LocShape.CENTREPIECE_STRAIGHT.id, angle, heightSW, heightSE, heightNW, heightNE, -1);
            if (model) {
                let yaw: number = 0;
                if (shape === LocShape.CENTREPIECE_DIAGONAL.id) {
                    yaw += 256;
                }

                let width: number;
                let height: number;
                if (angle === LocAngle.NORTH || angle === LocAngle.SOUTH) {
                    width = loc.length;
                    height = loc.width;
                } else {
                    width = loc.width;
                    height = loc.length;
                }

                if (scene?.addLoc(level, x, z, y, model, null, typecode, info, width, height, yaw) && loc.shadow) {
                    for (let dx: number = 0; dx <= width; dx++) {
                        for (let dz: number = 0; dz <= height; dz++) {
                            let shade: number = (model.radius / 4) | 0;
                            if (shade > 30) {
                                shade = 30;
                            }

                            if (shade > this.levelShademap[level][x + dx][z + dz]) {
                                this.levelShademap[level][x + dx][z + dz] = (shade << 24) >> 24;
                            }
                        }
                    }
                }
            }

            if (loc.blockwalk) {
                collision?.addLoc(x, z, loc.width, loc.length, angle, loc.blockrange);
            }

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.GROUND, x, z, SeqType.instances[loc.anim], true));
            }
        } else if (shape >= LocShape.ROOF_STRAIGHT.id) {
            scene?.addLoc(level, x, z, y, loc.getModel(shape, angle, heightSW, heightSE, heightNW, heightNE, -1), null, typecode, info, 1, 1, 0);

            if (shape >= LocShape.ROOF_STRAIGHT.id && shape <= LocShape.ROOF_FLAT.id && shape !== LocShape.ROOF_DIAGONAL_WITH_ROOFEDGE.id && level > 0) {
                this.levelOccludemap[level][x][z] |= 0x924;
            }

            if (loc.blockwalk) {
                collision?.addLoc(x, z, loc.width, loc.length, angle, loc.blockrange);
            }

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.GROUND, x, z, SeqType.instances[loc.anim], true));
            }
        } else if (shape === LocShape.WALL_STRAIGHT.id) {
            scene?.addWall(level, x, z, y, World.ROTATION_WALL_TYPE[angle], 0, loc.getModel(LocShape.WALL_STRAIGHT.id, angle, heightSW, heightSE, heightNW, heightNE, -1), null, typecode, info);

            if (angle === LocAngle.WEST) {
                if (loc.shadow) {
                    this.levelShademap[level][x][z] = 50;
                    this.levelShademap[level][x][z + 1] = 50;
                }

                if (loc.occlude) {
                    this.levelOccludemap[level][x][z] |= 0x249;
                }
            } else if (angle === LocAngle.NORTH) {
                if (loc.shadow) {
                    this.levelShademap[level][x][z + 1] = 50;
                    this.levelShademap[level][x + 1][z + 1] = 50;
                }

                if (loc.occlude) {
                    this.levelOccludemap[level][x][z + 1] |= 0x492;
                }
            } else if (angle === LocAngle.EAST) {
                if (loc.shadow) {
                    this.levelShademap[level][x + 1][z] = 50;
                    this.levelShademap[level][x + 1][z + 1] = 50;
                }

                if (loc.occlude) {
                    this.levelOccludemap[level][x + 1][z] |= 0x249;
                }
            } else if (angle === LocAngle.SOUTH) {
                if (loc.shadow) {
                    this.levelShademap[level][x][z] = 50;
                    this.levelShademap[level][x + 1][z] = 50;
                }

                if (loc.occlude) {
                    this.levelOccludemap[level][x][z] |= 0x492;
                }
            }

            if (loc.blockwalk) {
                collision?.addWall(x, z, shape, angle, loc.blockrange);
            }

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.WALL, x, z, SeqType.instances[loc.anim], true));
            }

            if (loc.wallwidth !== 16) {
                scene?.setWallDecorationOffset(level, x, z, loc.wallwidth);
            }
        } else if (shape === LocShape.WALL_DIAGONAL_CORNER.id) {
            scene?.addWall(level, x, z, y, World.ROTATION_WALL_CORNER_TYPE[angle], 0, loc.getModel(LocShape.WALL_DIAGONAL_CORNER.id, angle, heightSW, heightSE, heightNW, heightNE, -1), null, typecode, info);

            if (loc.shadow) {
                if (angle === LocAngle.WEST) {
                    this.levelShademap[level][x][z + 1] = 50;
                } else if (angle === LocAngle.NORTH) {
                    this.levelShademap[level][x + 1][z + 1] = 50;
                } else if (angle === LocAngle.EAST) {
                    this.levelShademap[level][x + 1][z] = 50;
                } else if (angle === LocAngle.SOUTH) {
                    this.levelShademap[level][x][z] = 50;
                }
            }

            if (loc.blockwalk) {
                collision?.addWall(x, z, shape, angle, loc.blockrange);
            }

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.WALL, x, z, SeqType.instances[loc.anim], true));
            }
        } else if (shape === LocShape.WALL_L.id) {
            const offset: number = (angle + 1) & 0x3;

            scene?.addWall(
                level,
                x,
                z,
                y,
                World.ROTATION_WALL_TYPE[angle],
                World.ROTATION_WALL_TYPE[offset],
                loc.getModel(LocShape.WALL_L.id, angle + 4, heightSW, heightSE, heightNW, heightNE, -1),
                loc.getModel(LocShape.WALL_L.id, offset, heightSW, heightSE, heightNW, heightNE, -1),
                typecode,
                info
            );

            if (loc.occlude) {
                if (angle === LocAngle.WEST) {
                    this.levelOccludemap[level][x][z] |= 0x109;
                    this.levelOccludemap[level][x][z + 1] |= 0x492;
                } else if (angle === LocAngle.NORTH) {
                    this.levelOccludemap[level][x][z + 1] |= 0x492;
                    this.levelOccludemap[level][x + 1][z] |= 0x249;
                } else if (angle === LocAngle.EAST) {
                    this.levelOccludemap[level][x + 1][z] |= 0x249;
                    this.levelOccludemap[level][x][z] |= 0x492;
                } else if (angle === LocAngle.SOUTH) {
                    this.levelOccludemap[level][x][z] |= 0x492;
                    this.levelOccludemap[level][x][z] |= 0x249;
                }
            }

            if (loc.blockwalk) {
                collision?.addWall(x, z, shape, angle, loc.blockrange);
            }

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.WALL, x, z, SeqType.instances[loc.anim], true));
            }

            if (loc.wallwidth !== 16) {
                scene?.setWallDecorationOffset(level, x, z, loc.wallwidth);
            }
        } else if (shape === LocShape.WALL_SQUARE_CORNER.id) {
            scene?.addWall(level, x, z, y, World.ROTATION_WALL_CORNER_TYPE[angle], 0, loc.getModel(LocShape.WALL_SQUARE_CORNER.id, angle, heightSW, heightSE, heightNW, heightNE, -1), null, typecode, info);

            if (loc.shadow) {
                if (angle === LocAngle.WEST) {
                    this.levelShademap[level][x][z + 1] = 50;
                } else if (angle === LocAngle.NORTH) {
                    this.levelShademap[level][x + 1][z + 1] = 50;
                } else if (angle === LocAngle.EAST) {
                    this.levelShademap[level][x + 1][z] = 50;
                } else if (angle === LocAngle.SOUTH) {
                    this.levelShademap[level][x][z] = 50;
                }
            }

            if (loc.blockwalk) {
                collision?.addWall(x, z, shape, angle, loc.blockrange);
            }

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.WALL, x, z, SeqType.instances[loc.anim], true));
            }
        } else if (shape === LocShape.WALL_DIAGONAL.id) {
            scene?.addLoc(level, x, z, y, loc.getModel(shape, angle, heightSW, heightSE, heightNW, heightNE, -1), null, typecode, info, 1, 1, 0);

            if (loc.blockwalk) {
                collision?.addLoc(x, z, loc.width, loc.length, angle, loc.blockrange);
            }

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.GROUND, x, z, SeqType.instances[loc.anim], true));
            }
        } else if (shape === LocShape.WALLDECOR_STRAIGHT_NOOFFSET.id) {
            scene?.setWallDecoration(level, x, z, y, 0, 0, typecode, loc.getModel(LocShape.WALLDECOR_STRAIGHT_NOOFFSET.id, LocAngle.WEST, heightSW, heightSE, heightNW, heightNE, -1), info, angle * 512, World.ROTATION_WALL_TYPE[angle]);

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.WALL_DECOR, x, z, SeqType.instances[loc.anim], true));
            }
        } else if (shape === LocShape.WALLDECOR_STRAIGHT_OFFSET.id) {
            let offset: number = 16;
            if (scene) {
                const typecode: number = scene.getWallTypecode(level, x, z);
                if (typecode > 0) {
                    offset = LocType.get((typecode >> 14) & 0x7fff).wallwidth;
                }
            }

            scene?.setWallDecoration(
                level,
                x,
                z,
                y,
                World.WALL_DECORATION_ROTATION_FORWARD_X[angle] * offset,
                World.WALL_DECORATION_ROTATION_FORWARD_Z[angle] * offset,
                typecode,
                loc.getModel(LocShape.WALLDECOR_STRAIGHT_NOOFFSET.id, LocAngle.WEST, heightSW, heightSE, heightNW, heightNE, -1),
                info,
                angle * 512,
                World.ROTATION_WALL_TYPE[angle]
            );

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.WALL_DECOR, x, z, SeqType.instances[loc.anim], true));
            }
        } else if (shape === LocShape.WALLDECOR_DIAGONAL_OFFSET.id) {
            scene?.setWallDecoration(level, x, z, y, 0, 0, typecode, loc.getModel(LocShape.WALLDECOR_STRAIGHT_NOOFFSET.id, LocAngle.WEST, heightSW, heightSE, heightNW, heightNE, -1), info, angle, LocSpans.DECOR_OFFSET);

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.WALL_DECOR, x, z, SeqType.instances[loc.anim], true));
            }
        } else if (shape === LocShape.WALLDECOR_DIAGONAL_NOOFFSET.id) {
            scene?.setWallDecoration(level, x, z, y, 0, 0, typecode, loc.getModel(LocShape.WALLDECOR_STRAIGHT_NOOFFSET.id, LocAngle.WEST, heightSW, heightSE, heightNW, heightNE, -1), info, angle, LocSpans.DECOR_NOOFFSET);

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.WALL_DECOR, x, z, SeqType.instances[loc.anim], true));
            }
        } else if (shape === LocShape.WALLDECOR_DIAGONAL_BOTH.id) {
            scene?.setWallDecoration(level, x, z, y, 0, 0, typecode, loc.getModel(LocShape.WALLDECOR_STRAIGHT_NOOFFSET.id, LocAngle.WEST, heightSW, heightSE, heightNW, heightNE, -1), info, angle, LocSpans.DECOR_BOTH);

            if (loc.anim !== -1) {
                locs.addTail(new LocEntity(locId, level, LocLayer.WALL_DECOR, x, z, SeqType.instances[loc.anim], true));
            }
        }
    }

    private getDrawLevel(level: number, stx: number, stz: number): number {
        if ((this.levelTileFlags[level][stx][stz] & TileFlag.WALL) === TileFlag.OPEN) {
            return level <= 0 || (this.levelTileFlags[1][stx][stz] & TileFlag.BRIDGE) === TileFlag.OPEN ? level : level - 1;
        }
        return 0;
    }
}
