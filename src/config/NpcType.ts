import { ConfigType } from '#/config/ConfigType.js';

import LruCache from '#/datastruct/LruCache.js';

import Model from '#/graphics/Model.js';

import Jagfile from '#/io/Jagfile.js';
import Packet from '#/io/Packet.js';

import { TypedArray1d } from '#/util/Arrays.js';

export default class NpcType extends ConfigType {
    static totalCount: number = 0;
    static typeCache: (NpcType | null)[] | null = null;
    static dat: Packet | null = null;
    static offsets: Int32Array | null = null;
    static cachePos: number = 0;
    static modelCache: LruCache | null = new LruCache(30);

    static unpack(config: Jagfile): void {
        this.dat = new Packet(config.read('npc.dat'));
        const idx: Packet = new Packet(config.read('npc.idx'));

        this.totalCount = idx.g2();
        this.offsets = new Int32Array(this.totalCount);

        let offset: number = 2;
        for (let id: number = 0; id < this.totalCount; id++) {
            this.offsets[id] = offset;
            offset += idx.g2();
        }

        this.typeCache = new TypedArray1d(20, null);
        for (let id: number = 0; id < 20; id++) {
            this.typeCache[id] = new NpcType(-1);
        }
    }

    static get(id: number): NpcType {
        if (!this.typeCache || !this.offsets || !this.dat) {
            throw new Error();
        }

        for (let i: number = 0; i < 20; i++) {
            const type: NpcType | null = this.typeCache[i];
            if (!type) {
                continue;
            }
            if (type.id === id) {
                return type;
            }
        }

        this.cachePos = (this.cachePos + 1) % 20;
        const loc: NpcType = (this.typeCache[this.cachePos] = new NpcType(id));
        this.dat.pos = this.offsets[id];
        loc.unpackType(this.dat);
        return loc;
    }

    // ----

    name: string | null = null;
    desc: string | null = null;
    size: number = 1;
    models: Uint16Array | null = null;
    heads: Uint16Array | null = null;
    disposeAlpha: boolean = false;
    readyanim: number = -1;
    walkanim: number = -1;
    walkanim_b: number = -1;
    walkanim_r: number = -1;
    walkanim_l: number = -1;
    recol_s: Uint16Array | null = null;
    recol_d: Uint16Array | null = null;
    op: (string | null)[] | null = null;
    resizex: number = -1;
    resizey: number = -1;
    resizez: number = -1;
    minimap: boolean = true;
    vislevel: number = -1;
    resizeh: number = 128;
    resizev: number = 128;

    unpack(code: number, dat: Packet): void {
        if (code === 1) {
            const count: number = dat.g1();
            this.models = new Uint16Array(count);

            for (let i: number = 0; i < count; i++) {
                this.models[i] = dat.g2();
            }
        } else if (code === 2) {
            this.name = dat.gjstr();
        } else if (code === 3) {
            this.desc = dat.gjstr();
        } else if (code === 12) {
            this.size = dat.g1b();
        } else if (code === 13) {
            this.readyanim = dat.g2();
        } else if (code === 14) {
            this.walkanim = dat.g2();
        } else if (code === 16) {
            this.disposeAlpha = true;
        } else if (code === 17) {
            this.walkanim = dat.g2();
            this.walkanim_b = dat.g2();
            this.walkanim_r = dat.g2();
            this.walkanim_l = dat.g2();
        } else if (code >= 30 && code < 40) {
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
            const count: number = dat.g1();
            this.heads = new Uint16Array(count);

            for (let i: number = 0; i < count; i++) {
                this.heads[i] = dat.g2();
            }
        } else if (code === 90) {
            this.resizex = dat.g2();
        } else if (code === 91) {
            this.resizey = dat.g2();
        } else if (code === 92) {
            this.resizez = dat.g2();
        } else if (code === 93) {
            this.minimap = false;
        } else if (code === 95) {
            this.vislevel = dat.g2();
        } else if (code === 97) {
            this.resizeh = dat.g2();
        } else if (code === 98) {
            this.resizev = dat.g2();
        }
    }

    getSequencedModel(primaryTransformId: number, secondaryTransformId: number, seqMask: Int32Array | null): Model | null {
        let tmp: Model | null = null;
        let model: Model | null = null;
        if (NpcType.modelCache) {
            model = NpcType.modelCache.get(BigInt(this.id)) as Model | null;

            if (!model && this.models) {
                const models: (Model | null)[] = new TypedArray1d(this.models.length, null);
                for (let i: number = 0; i < this.models.length; i++) {
                    models[i] = Model.model(this.models[i]);
                }

                if (models.length === 1) {
                    model = models[0];
                } else {
                    model = Model.modelFromModels(models, models.length);
                }

                if (this.recol_s && this.recol_d) {
                    for (let i: number = 0; i < this.recol_s.length; i++) {
                        model?.recolor(this.recol_s[i], this.recol_d[i]);
                    }
                }

                model?.createLabelReferences();
                model?.calculateNormals(64, 850, -30, -50, -30, true);
                if (model) {
                    NpcType.modelCache.put(BigInt(this.id), model);
                }
            }
        }

        if (model) {
            tmp = Model.modelShareAlpha(model, !this.disposeAlpha);
            if (primaryTransformId !== -1 && secondaryTransformId !== -1) {
                tmp.applyTransforms(primaryTransformId, secondaryTransformId, seqMask);
            } else if (primaryTransformId !== -1) {
                tmp.applyTransform(primaryTransformId);
            }

            if (this.resizeh !== 128 || this.resizev !== 128) {
                tmp.scale(this.resizeh, this.resizev, this.resizeh);
            }

            tmp.calculateBoundsCylinder();
            tmp.labelFaces = null;
            tmp.labelVertices = null;

            if (this.size === 1) {
                tmp.pickAabb = true;
            }
            return tmp;
        }

        return null;
    }

    getHeadModel(): Model | null {
        if (!this.heads) {
            return null;
        }

        const models: (Model | null)[] = new TypedArray1d(this.heads.length, null);
        for (let i: number = 0; i < this.heads.length; i++) {
            models[i] = Model.model(this.heads[i]);
        }

        let model: Model | null;
        if (models.length === 1) {
            model = models[0];
        } else {
            model = Model.modelFromModels(models, models.length);
        }

        if (this.recol_s && this.recol_d) {
            for (let i: number = 0; i < this.recol_s.length; i++) {
                model?.recolor(this.recol_s[i], this.recol_d[i]);
            }
        }

        return model;
    }
}
