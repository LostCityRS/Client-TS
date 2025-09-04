import { ConfigType } from '#/config/ConfigType.js';

import LruCache from '#/datastruct/LruCache.js';

import LocShape from '#/dash3d/LocShape.js';
import { LocAngle } from '#/dash3d/LocAngle.js';

import Model from '#/dash3d/Model.js';

import Jagfile from '#/io/Jagfile.js';
import Packet from '#/io/Packet.js';

import { TypedArray1d } from '#/util/Arrays.js';
import type OnDemand from '#/io/OnDemand.js';

export default class LocType extends ConfigType {
    static ignoreCache: boolean = false;
    static count: number = 0;
    static idx: Int32Array | null = null;
    static data: Packet | null = null;
    static cache: (LocType | null)[] | null = null;
    static cachePos: number = 0;
    models: Int32Array | null = null;
    shapes: Int32Array | null = null;
    name: string | null = null;
    desc: string | null = null;
    recol_s: Uint16Array | null = null;
    recol_d: Uint16Array | null = null;
    width: number = 1;
    length: number = 1;
    blockwalk: boolean = true;
    blockrange: boolean = true;
    active: boolean = false;
    private _active: number = -1;
    hillskew: boolean = false;
    sharelight: boolean = false;
    occlude: boolean = false;
    static modelCacheStatic: LruCache | null = new LruCache(500);
    static modelCacheDynamic: LruCache | null = new LruCache(30);
    ambient: number = 0;
    contrast: number = 0;
    anim: number = -1;
    wallwidth: number = 16;
    mapfunction: number = -1;
    mapscene: number = -1;
    resizex: number = 128;
    resizey: number = 128;
    resizez: number = 128;
    offsetx: number = 0;
    offsety: number = 0;
    offsetz: number = 0;
    forceapproach: number = 0;
    animHasAlpha: boolean = false;
    mirror: boolean = false;
    shadow: boolean = true;
    forcedecor: boolean = false;
    op: (string | null)[] | null = null;

    static unpack(config: Jagfile): void {
        this.data = new Packet(config.read('loc.dat'));
        const idx: Packet = new Packet(config.read('loc.idx'));

        this.count = idx.g2();
        this.idx = new Int32Array(this.count);

        let offset: number = 2;
        for (let id: number = 0; id < this.count; id++) {
            this.idx[id] = offset;
            offset += idx.g2();
        }

        this.cache = new TypedArray1d(10, null);
        for (let id: number = 0; id < 10; id++) {
            this.cache[id] = new LocType(-1);
        }
    }

    static get(id: number): LocType {
        if (!this.cache || !this.idx || !this.data) {
            throw new Error();
        }

        for (let i: number = 0; i < 10; i++) {
            const type: LocType | null = this.cache[i];
            if (!type) {
                continue;
            }

            if (type.id === id) {
                return type;
            }
        }

        this.cachePos = (this.cachePos + 1) % 10;

        const loc: LocType = this.cache[this.cachePos]!;
        this.data.pos = this.idx[id];
        loc.id = id;
        loc.reset();
        loc.unpackType(this.data);

        if (!loc.shapes) {
            loc.shapes = new Int32Array(1);
        }

        if (loc._active === -1 && loc.shapes) {
            loc.active = loc.shapes.length > 0 && loc.shapes[0] === LocShape.CENTREPIECE_STRAIGHT.id;

            if (loc.op) {
                loc.active = true;
            }
        }
        return loc;
    }

    unpack(code: number, dat: Packet): void {
        if (code === 1) {
            const count: number = dat.g1();
            this.models = new Int32Array(count);
            this.shapes = new Int32Array(count);

            for (let i: number = 0; i < count; i++) {
                this.models[i] = dat.g2();
                this.shapes[i] = dat.g1();
            }
        } else if (code === 2) {
            this.name = dat.gjstr();
        } else if (code === 3) {
            this.desc = dat.gjstr();
        } else if (code === 14) {
            this.width = dat.g1();
        } else if (code === 15) {
            this.length = dat.g1();
        } else if (code === 17) {
            this.blockwalk = false;
        } else if (code === 18) {
            this.blockrange = false;
        } else if (code === 19) {
            this._active = dat.g1();
            if (this._active === 1) {
                this.active = true;
            }
        } else if (code === 21) {
            this.hillskew = true;
        } else if (code === 22) {
            this.sharelight = true;
        } else if (code === 23) {
            this.occlude = true;
        } else if (code === 24) {
            this.anim = dat.g2();

            if (this.anim === 65535) {
                this.anim = -1;
            }
        } else if (code === 25) {
            this.animHasAlpha = true;
        } else if (code === 28) {
            this.wallwidth = dat.g1();
        } else if (code === 29) {
            this.ambient = dat.g1b();
        } else if (code === 39) {
            this.contrast = dat.g1b();
        } else if (code >= 30 && code < 39) {
            if (!this.op) {
                this.op = new TypedArray1d(5, null);
            }

            this.op[code - 30] = dat.gjstr();
            if (this.op[code - 30]?.toLowerCase() === 'hidden') {
                this.op[code - 30] = null;
            }
        } else if (code === 40) {
            const count: number = dat.g1();
            this.recol_s = new Uint16Array(count);
            this.recol_d = new Uint16Array(count);

            for (let i: number = 0; i < count; i++) {
                this.recol_s[i] = dat.g2();
                this.recol_d[i] = dat.g2();
            }
        } else if (code === 60) {
            this.mapfunction = dat.g2();
        } else if (code === 62) {
            this.mirror = true;
        } else if (code === 64) {
            this.shadow = false;
        } else if (code === 65) {
            this.resizex = dat.g2();
        } else if (code === 66) {
            this.resizey = dat.g2();
        } else if (code === 67) {
            this.resizez = dat.g2();
        } else if (code === 68) {
            this.mapscene = dat.g2();
        } else if (code === 69) {
            this.forceapproach = dat.g1();
        } else if (code === 70) {
            this.offsetx = dat.g2b();
        } else if (code === 71) {
            this.offsety = dat.g2b();
        } else if (code === 72) {
            this.offsetz = dat.g2b();
        } else if (code === 73) {
            this.forcedecor = true;
        }
    }

    shapeModelsAreReady(shape: number): boolean {
        if (this.shapes === null) {
            return true;
        }

        let index = -1;
        for (let i = 0; i < this.shapes.length; i++) {
            if (this.shapes[i] == shape) {
                index = i;
                break;
            }
        }
        if (index == -1) {
            return true;
        }

        if (this.models == null) {
            return true;
        }

        const model = this.models[index];
        return model == -1 ? true : Model.isReady(model & 0xFFFF);
    }

    modelsAreReady(): boolean {
        let ready = true;
        if (this.models == null) {
            return true;
        }

        for (let i = 0; i < this.models.length; i++) {
            const model = this.models[i];
            if (model != -1) {
                ready &&= Model.isReady(model & 0xFFFF);
            }
        }

        return ready;
    }

    prefetch(od: OnDemand) {
        if (this.models == null) {
            return;
        }

        for (let i = 0; i < this.models.length; i++) {
            const model = this.models[i];
            if (model != -1) {
                od.prefetch(0, model & 0xFFFF);
            }
        }
    }

    getModel(shape: number, angle: number, heightmapSW: number, heightmapSE: number, heightmapNE: number, heightmapNW: number, transformId: number): Model | null {
        if (!this.shapes) {
            return null;
        }

        let index: number = -1;
        for (let i: number = 0; i < this.shapes.length; i++) {
            if (this.shapes[i] === shape) {
                index = i;
                break;
            }
        }
        if (index === -1) {
            return null;
        }

        let typecode = ((BigInt(transformId) + 1n) << 32n) + (BigInt(this.id) << 6n) + (BigInt(index) << 3n) + BigInt(angle);
        if (LocType.ignoreCache) {
            typecode = 0n;
        }

        let cached: Model | null = LocType.modelCacheDynamic?.get(typecode) as Model | null;
        if (cached) {
            if (LocType.ignoreCache) {
                return cached;
            }

            if (this.hillskew || this.sharelight) {
                cached = Model.modelCopyFaces(cached, this.hillskew, this.sharelight);
            }

            if (this.hillskew) {
                const groundY: number = ((heightmapSW + heightmapSE + heightmapNE + heightmapNW) / 4) | 0;

                for (let i: number = 0; i < cached.vertexCount; i++) {
                    const x: number = cached.vertexX![i];
                    const z: number = cached.vertexZ![i];

                    const heightS: number = heightmapSW + ((((heightmapSE - heightmapSW) * (x + 64)) / 128) | 0);
                    const heightN: number = heightmapNW + ((((heightmapNE - heightmapNW) * (x + 64)) / 128) | 0);
                    const y: number = heightS + ((((heightN - heightS) * (z + 64)) / 128) | 0);

                    cached.vertexY![i] += y - groundY;
                }

                cached.calculateBoundsY();
            }

            return cached;
        }

        if (!this.models || index >= this.models.length) {
            return null;
        }

        let modelId: number = this.models[index];
        if (modelId === -1) {
            return null;
        }

        const flip: boolean = this.mirror !== angle > 3;
        if (flip) {
            modelId += 65536;
        }

        let model: Model | null = LocType.modelCacheStatic?.get(BigInt(modelId)) as Model | null;
        if (!model) {
            model = Model.tryGet(modelId & 0xffff);
            if (!model) {
                return null;
            }

            if (flip) {
                model.rotateY180();
            }

            LocType.modelCacheStatic?.put(BigInt(modelId), model);
        }

        const scaled: boolean = this.resizex !== 128 || this.resizey !== 128 || this.resizez !== 128;
        const translated: boolean = this.offsetx !== 0 || this.offsety !== 0 || this.offsetz !== 0;

        let modified: Model = Model.modelShareColored(model, !this.recol_s, !this.animHasAlpha, angle === LocAngle.WEST && transformId === -1 && !scaled && !translated);
        if (transformId !== -1) {
            modified.createLabelReferences();
            modified.applyTransform(transformId);
            modified.labelFaces = null;
            modified.labelVertices = null;
        }

        while (angle-- > 0) {
            modified.rotateY90();
        }

        if (this.recol_s && this.recol_d) {
            for (let i: number = 0; i < this.recol_s.length; i++) {
                modified.recolour(this.recol_s[i], this.recol_d[i]);
            }
        }

        if (scaled) {
            modified.scale(this.resizex, this.resizey, this.resizez);
        }

        if (translated) {
            modified.translate(this.offsety, this.offsetx, this.offsetz);
        }

        modified.calculateNormals((this.ambient & 0xff) + 64, (this.contrast & 0xff) * 5 + 768, -50, -10, -50, !this.sharelight);

        if (this.blockwalk) {
            modified.objRaise = modified.minY;
        }

        LocType.modelCacheDynamic?.put(typecode, modified);

        if (this.hillskew || this.sharelight) {
            modified = Model.modelCopyFaces(modified, this.hillskew, this.sharelight);
        }

        if (this.hillskew) {
            const groundY: number = ((heightmapSW + heightmapSE + heightmapNE + heightmapNW) / 4) | 0;

            for (let i: number = 0; i < modified.vertexCount; i++) {
                const x: number = modified.vertexX![i];
                const z: number = modified.vertexZ![i];

                const heightS: number = heightmapSW + ((((heightmapSE - heightmapSW) * (x + 64)) / 128) | 0);
                const heightN: number = heightmapNW + ((((heightmapNE - heightmapNW) * (x + 64)) / 128) | 0);
                const y: number = heightS + ((((heightN - heightS) * (z + 64)) / 128) | 0);

                modified.vertexY![i] += y - groundY;
            }

            modified.calculateBoundsY();
        }

        return modified;
    }

    private reset(): void {
        this.models = null;
        this.shapes = null;
        this.name = null;
        this.desc = null;
        this.recol_s = null;
        this.recol_d = null;
        this.width = 1;
        this.length = 1;
        this.blockwalk = true;
        this.blockrange = true;
        this.active = false;
        this._active = -1;
        this.hillskew = false;
        this.sharelight = false;
        this.occlude = false;
        this.anim = -1;
        this.wallwidth = 16;
        this.ambient = 0;
        this.contrast = 0;
        this.op = null;
        this.animHasAlpha = false;
        this.mapfunction = -1;
        this.mapscene = -1;
        this.mirror = false;
        this.shadow = true;
        this.resizex = 128;
        this.resizey = 128;
        this.resizez = 128;
        this.forceapproach = 0;
        this.offsetx = 0;
        this.offsety = 0;
        this.offsetz = 0;
        this.forcedecor = false;
    }
}
