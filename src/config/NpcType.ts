import { ConfigType } from '#/config/ConfigType.js';

import LruCache from '#/datastruct/LruCache.js';

import Model from '#/dash3d/Model.js';

import Jagfile from '#/io/Jagfile.js';
import Packet from '#/io/Packet.js';

import { TypedArray1d } from '#/util/Arrays.js';

export default class NpcType extends ConfigType {
    static count: number = 0;
    static idx: Int32Array | null = null;
    static data: Packet | null = null;
    static cache: (NpcType | null)[] | null = null;
    static cachePos: number = 0;
    name: string | null = null;
    desc: string | null = null;
    size: number = 1;
    models: Uint16Array | null = null;
    heads: Uint16Array | null = null;
    readyanim: number = -1;
    walkanim: number = -1;
    walkanim_b: number = -1;
    walkanim_r: number = -1;
    walkanim_l: number = -1;
    animHasAlpha: boolean = false;
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
    alwaysontop: boolean = false;
    headicon: number = -1;
    static modelCache: LruCache | null = new LruCache(30);
    ambient: number = 0;
    contrast: number = 0;

    static unpack(config: Jagfile): void {
        this.data = new Packet(config.read('npc.dat'));
        const idx: Packet = new Packet(config.read('npc.idx'));

        this.count = idx.g2();
        this.idx = new Int32Array(this.count);

        let offset: number = 2;
        for (let id: number = 0; id < this.count; id++) {
            this.idx[id] = offset;
            offset += idx.g2();
        }

        this.cache = new TypedArray1d(20, null);
        for (let id: number = 0; id < 20; id++) {
            this.cache[id] = new NpcType(-1);
        }
    }

    static get(id: number): NpcType {
        if (!this.cache || !this.idx || !this.data) {
            throw new Error();
        }

        for (let i: number = 0; i < 20; i++) {
            const type: NpcType | null = this.cache[i];
            if (type && type.id === id) {
                return type;
            }
        }

        this.cachePos = (this.cachePos + 1) % 20;

        const loc: NpcType = (this.cache[this.cachePos] = new NpcType(id));
        this.data.pos = this.idx[id];
        loc.unpackType(this.data);
        return loc;
    }

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
            this.animHasAlpha = true;
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
        } else if (code === 99) {
            this.alwaysontop = true;
        } else if (code === 100) {
            this.ambient = dat.g1b();
        } else if (code === 101) {
            this.contrast = dat.g1b() * 5;
        } else if (code === 102) {
            this.headicon = dat.g2();
        }
    }

    getModel(primaryTransformId: number, secondaryTransformId: number, seqMask: Int32Array | null): Model | null {
        let model: Model | null = null;

        if (NpcType.modelCache) {
            model = NpcType.modelCache.get(BigInt(this.id)) as Model | null;

            if (!model && this.models) {
                let ready = false;
                for (let i = 0; i < this.models.length; i++) {
                    if (!Model.isReady(this.models[i])) {
                        ready = true;
                    }
                }
                if (ready) {
                    return null;
                }

                const models: (Model | null)[] = new TypedArray1d(this.models.length, null);
                for (let i: number = 0; i < this.models.length; i++) {
                    models[i] = Model.tryGet(this.models[i]);
                }

                if (models.length === 1) {
                    model = models[0];
                } else {
                    model = Model.modelFromModels(models, models.length);
                }

                if (model) {
                    if (this.recol_s && this.recol_d) {
                        for (let i: number = 0; i < this.recol_s.length; i++) {
                            model.recolour(this.recol_s[i], this.recol_d[i]);
                        }
                    }

                    model.createLabelReferences();
                    model.calculateNormals(64, 850, -30, -50, -30, true);
                    NpcType.modelCache.put(BigInt(this.id), model);
                }
            }
        }

        let tmp: Model | null = null;

        if (model) {
            tmp = Model.modelShareAlpha(model, !this.animHasAlpha);

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
                tmp.picking = true;
            }
        }

        return tmp;
    }

    getHeadModel(): Model | null {
        if (!this.heads) {
            return null;
        }

        let exists = false;
        for (let i = 0; i < this.heads.length; i++) {
            if (!Model.isReady(this.heads[i])) {
                exists = true;
            }
        }
        if (exists) {
            return null;
        }

        const models: (Model | null)[] = new TypedArray1d(this.heads.length, null);
        for (let i: number = 0; i < this.heads.length; i++) {
            models[i] = Model.tryGet(this.heads[i]);
        }

        let model: Model | null;
        if (models.length === 1) {
            model = models[0];
        } else {
            model = Model.modelFromModels(models, models.length);
        }

        if (model && this.recol_s && this.recol_d) {
            for (let i: number = 0; i < this.recol_s.length; i++) {
                model.recolour(this.recol_s[i], this.recol_d[i]);
            }
        }

        return model;
    }
}
