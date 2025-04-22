import { ConfigType } from '#/config/ConfigType.js';

import LruCache from '#/datastruct/LruCache.js';

import Jagfile from '#/io/Jagfile.js';
import Packet from '#/io/Packet.js';

import { Colors } from '#/graphics/Colors.js';
import Pix2D from '#/graphics/Pix2D.js';
import Pix3D from '#/graphics/Pix3D.js';
import Model from '#/graphics/Model.js';
import Pix24 from '#/graphics/Pix24.js';

import { TypedArray1d } from '#/util/Arrays.js';

export default class ObjType extends ConfigType {
    static totalCount: number = 0;
    static typeCache: (ObjType | null)[] | null = null;
    static dat: Packet | null = null;
    static offsets: Int32Array | null = null;
    static cachePos: number = 0;
    static membersWorld: boolean = true;
    static modelCache: LruCache | null = new LruCache(50);
    static iconCache: LruCache | null = new LruCache(200);

    static unpack(config: Jagfile, members: boolean): void {
        this.membersWorld = members;
        this.dat = new Packet(config.read('obj.dat'));
        const idx: Packet = new Packet(config.read('obj.idx'));

        this.totalCount = idx.g2();
        this.offsets = new Int32Array(this.totalCount);

        let offset: number = 2;
        for (let id: number = 0; id < this.totalCount; id++) {
            this.offsets[id] = offset;
            offset += idx.g2();
        }

        this.typeCache = new TypedArray1d(10, null);
        for (let id: number = 0; id < 10; id++) {
            this.typeCache[id] = new ObjType(-1);
        }
    }

    static get(id: number): ObjType {
        if (!this.typeCache || !this.offsets || !this.dat) {
            throw new Error();
        }

        for (let i: number = 0; i < 10; i++) {
            const type: ObjType | null = this.typeCache[i];
            if (!type) {
                continue;
            }
            if (type.id === id) {
                return type;
            }
        }

        this.cachePos = (this.cachePos + 1) % 10;
        const obj: ObjType = this.typeCache[this.cachePos]!;
        this.dat.pos = this.offsets[id];
        obj.id = id;
        obj.reset();
        obj.unpackType(this.dat);

        if (obj.certtemplate !== -1) {
            obj.toCertificate();
        }

        if (!this.membersWorld && obj.members) {
            obj.name = 'Members Object';
            obj.desc = "Login to a members' server to use this object.";
            obj.op = null;
            obj.iop = null;
        }

        return obj;
    }

    static getIcon(id: number, count: number): Pix24 {
        if (ObjType.iconCache) {
            let icon: Pix24 | null = ObjType.iconCache.get(BigInt(id)) as Pix24 | null;
            if (icon && icon.cropH !== count && icon.cropH !== -1) {
                icon.unlink();
                icon = null;
            }

            if (icon) {
                return icon;
            }
        }

        let obj: ObjType = ObjType.get(id);
        if (!obj.countobj) {
            count = -1;
        }

        if (obj.countobj && obj.countco && count > 1) {
            let countobj: number = -1;
            for (let i: number = 0; i < 10; i++) {
                if (count >= obj.countco[i] && obj.countco[i] !== 0) {
                    countobj = obj.countobj[i];
                }
            }

            if (countobj !== -1) {
                obj = ObjType.get(countobj);
            }
        }

        const icon: Pix24 = new Pix24(32, 32);

        const _cx: number = Pix3D.centerX;
        const _cy: number = Pix3D.centerY;
        const _loff: Int32Array = Pix3D.lineOffset;
        const _data: Int32Array = Pix2D.pixels;
        const _w: number = Pix2D.width2d;
        const _h: number = Pix2D.height2d;
        const _l: number = Pix2D.left;
        const _r: number = Pix2D.right;
        const _t: number = Pix2D.top;
        const _b: number = Pix2D.bottom;

        Pix3D.jagged = false;
        Pix2D.bind(icon.pixels, 32, 32);
        Pix2D.fillRect2d(0, 0, 32, 32, Colors.BLACK);
        Pix3D.init2D();

        const iModel: Model = obj.getInterfaceModel(1);
        const sinPitch: number = (Pix3D.sin[obj.xan2d] * obj.zoom2d) >> 16;
        const cosPitch: number = (Pix3D.cos[obj.xan2d] * obj.zoom2d) >> 16;
        iModel.drawSimple(0, obj.yan2d, obj.zan2d, obj.xan2d, obj.xof2d, sinPitch + ((iModel.maxY / 2) | 0) + obj.yof2d, cosPitch + obj.yof2d);

        // draw outline
        for (let x: number = 31; x >= 0; x--) {
            for (let y: number = 31; y >= 0; y--) {
                if (icon.pixels[x + y * 32] !== 0) {
                    continue;
                }

                if (x > 0 && icon.pixels[x + y * 32 - 1] > 1) {
                    icon.pixels[x + y * 32] = 1;
                } else if (y > 0 && icon.pixels[x + (y - 1) * 32] > 1) {
                    icon.pixels[x + y * 32] = 1;
                } else if (x < 31 && icon.pixels[x + y * 32 + 1] > 1) {
                    icon.pixels[x + y * 32] = 1;
                } else if (y < 31 && icon.pixels[x + (y + 1) * 32] > 1) {
                    icon.pixels[x + y * 32] = 1;
                }
            }
        }

        // draw shadow
        for (let x: number = 31; x >= 0; x--) {
            for (let y: number = 31; y >= 0; y--) {
                if (icon.pixels[x + y * 32] === 0 && x > 0 && y > 0 && icon.pixels[x + (y - 1) * 32 - 1] > 0) {
                    icon.pixels[x + y * 32] = 3153952;
                }
            }
        }

        if (obj.certtemplate !== -1) {
            const linkedIcon: Pix24 = this.getIcon(obj.certlink, 10);
            const w: number = linkedIcon.cropW;
            const h: number = linkedIcon.cropH;
            linkedIcon.cropW = 32;
            linkedIcon.cropH = 32;
            linkedIcon.crop(5, 5, 22, 22);
            linkedIcon.cropW = w;
            linkedIcon.cropH = h;
        }

        ObjType.iconCache?.put(BigInt(id), icon);
        Pix2D.bind(_data, _w, _h);
        Pix2D.setBounds(_l, _t, _r, _b);
        Pix3D.centerX = _cx;
        Pix3D.centerY = _cy;
        Pix3D.lineOffset = _loff;
        Pix3D.jagged = true;
        if (obj.stackable) {
            icon.cropW = 33;
        } else {
            icon.cropW = 32;
        }
        icon.cropH = count;
        return icon;
    }

    // ----

    model: number = 0;
    name: string | null = null;
    desc: string | null = null;
    recol_s: Uint16Array | null = null;
    recol_d: Uint16Array | null = null;
    zoom2d: number = 2000;
    xan2d: number = 0;
    yan2d: number = 0;
    zan2d: number = 0;
    xof2d: number = 0;
    yof2d: number = 0;
    code9: boolean = false;
    code10: number = -1;
    stackable: boolean = false;
    cost: number = 1;
    members: boolean = false;
    op: (string | null)[] | null = null;
    iop: (string | null)[] | null = null;
    manwear: number = -1;
    manwear2: number = -1;
    manwearOffsetY: number = 0;
    womanwear: number = -1;
    womanwear2: number = -1;
    womanwearOffsetY: number = 0;
    manwear3: number = -1;
    womanwear3: number = -1;
    manhead: number = -1;
    manhead2: number = -1;
    womanhead: number = -1;
    womanhead2: number = -1;
    countobj: Uint16Array | null = null;
    countco: Uint16Array | null = null;
    certlink: number = -1;
    certtemplate: number = -1;

    unpack(code: number, dat: Packet): void {
        if (code === 1) {
            this.model = dat.g2();
        } else if (code === 2) {
            this.name = dat.gjstr();
        } else if (code === 3) {
            this.desc = dat.gjstr();
        } else if (code === 4) {
            this.zoom2d = dat.g2();
        } else if (code === 5) {
            this.xan2d = dat.g2();
        } else if (code === 6) {
            this.yan2d = dat.g2();
        } else if (code === 7) {
            this.xof2d = dat.g2b();
            if (this.xof2d > 32767) {
                this.xof2d -= 65536;
            }
        } else if (code === 8) {
            this.yof2d = dat.g2b();
            if (this.yof2d > 32767) {
                this.yof2d -= 65536;
            }
        } else if (code === 9) {
            this.code9 = true;
        } else if (code === 10) {
            this.code10 = dat.g2();
        } else if (code === 11) {
            this.stackable = true;
        } else if (code === 12) {
            this.cost = dat.g4();
        } else if (code === 16) {
            this.members = true;
        } else if (code === 23) {
            this.manwear = dat.g2();
            this.manwearOffsetY = dat.g1b();
        } else if (code === 24) {
            this.manwear2 = dat.g2();
        } else if (code === 25) {
            this.womanwear = dat.g2();
            this.womanwearOffsetY = dat.g1b();
        } else if (code === 26) {
            this.womanwear2 = dat.g2();
        } else if (code >= 30 && code < 35) {
            if (!this.op) {
                this.op = new TypedArray1d(5, null);
            }

            this.op[code - 30] = dat.gjstr();
            if (this.op[code - 30]?.toLowerCase() === 'hidden') {
                this.op[code - 30] = null;
            }
        } else if (code >= 35 && code < 40) {
            if (!this.iop) {
                this.iop = new TypedArray1d(5, null);
            }
            this.iop[code - 35] = dat.gjstr();
        } else if (code === 40) {
            const count: number = dat.g1();
            this.recol_s = new Uint16Array(count);
            this.recol_d = new Uint16Array(count);

            for (let i: number = 0; i < count; i++) {
                this.recol_s[i] = dat.g2();
                this.recol_d[i] = dat.g2();
            }
        } else if (code === 78) {
            this.manwear3 = dat.g2();
        } else if (code === 79) {
            this.womanwear3 = dat.g2();
        } else if (code === 90) {
            this.manhead = dat.g2();
        } else if (code === 91) {
            this.womanhead = dat.g2();
        } else if (code === 92) {
            this.manhead2 = dat.g2();
        } else if (code === 93) {
            this.womanhead2 = dat.g2();
        } else if (code === 95) {
            this.zan2d = dat.g2();
        } else if (code === 97) {
            this.certlink = dat.g2();
        } else if (code === 98) {
            this.certtemplate = dat.g2();
        } else if (code >= 100 && code < 110) {
            if (!this.countobj || !this.countco) {
                this.countobj = new Uint16Array(10);
                this.countco = new Uint16Array(10);
            }

            this.countobj[code - 100] = dat.g2();
            this.countco[code - 100] = dat.g2();
        }
    }

    getWornModel(gender: number): Model | null {
        let id1: number = this.manwear;
        if (gender === 1) {
            id1 = this.womanwear;
        }

        if (id1 === -1) {
            return null;
        }

        let id2: number = this.manwear2;
        let id3: number = this.manwear3;
        if (gender === 1) {
            id2 = this.womanwear2;
            id3 = this.womanwear3;
        }

        let model: Model = Model.model(id1);
        if (id2 !== -1) {
            const model2: Model = Model.model(id2);

            if (id3 === -1) {
                const models: Model[] = [model, model2];
                model = Model.modelFromModels(models, 2);
            } else {
                const model3: Model = Model.model(id3);
                const models: Model[] = [model, model2, model3];
                model = Model.modelFromModels(models, 3);
            }
        }

        if (gender === 0 && this.manwearOffsetY !== 0) {
            model.translateModel(this.manwearOffsetY, 0, 0);
        }

        if (gender === 1 && this.womanwearOffsetY !== 0) {
            model.translateModel(this.womanwearOffsetY, 0, 0);
        }

        if (this.recol_s && this.recol_d) {
            for (let i: number = 0; i < this.recol_s.length; i++) {
                model.recolor(this.recol_s[i], this.recol_d[i]);
            }
        }
        return model;
    }

    getHeadModel(gender: number): Model | null {
        let head1: number = this.manhead;
        if (gender === 1) {
            head1 = this.womanhead;
        }

        if (head1 === -1) {
            return null;
        }

        let head2: number = this.manhead2;
        if (gender === 1) {
            head2 = this.womanhead2;
        }

        let model: Model = Model.model(head1);
        if (head2 !== -1) {
            const model2: Model = Model.model(head2);
            const models: Model[] = [model, model2];
            model = Model.modelFromModels(models, 2);
        }

        if (this.recol_s && this.recol_d) {
            for (let i: number = 0; i < this.recol_s.length; i++) {
                model.recolor(this.recol_s[i], this.recol_d[i]);
            }
        }
        return model;
    }

    getInterfaceModel(count: number): Model {
        if (this.countobj && this.countco && count > 1) {
            let id: number = -1;
            for (let i: number = 0; i < 10; i++) {
                if (count >= this.countco[i] && this.countco[i] !== 0) {
                    id = this.countobj[i];
                }
            }

            if (id !== -1) {
                return ObjType.get(id).getInterfaceModel(1);
            }
        }

        if (ObjType.modelCache) {
            const model: Model | null = ObjType.modelCache.get(BigInt(this.id)) as Model | null;
            if (model) {
                return model;
            }
        }

        const model: Model = Model.model(this.model);
        if (this.recol_s && this.recol_d) {
            for (let i: number = 0; i < this.recol_s.length; i++) {
                model.recolor(this.recol_s[i], this.recol_d[i]);
            }
        }

        model.calculateNormals(64, 768, -50, -10, -50, true);
        model.pickAabb = true;
        ObjType.modelCache?.put(BigInt(this.id), model);
        return model;
    }

    private toCertificate(): void {
        const template: ObjType = ObjType.get(this.certtemplate);
        this.model = template.model;
        this.zoom2d = template.zoom2d;
        this.xan2d = template.xan2d;
        this.yan2d = template.yan2d;
        this.zan2d = template.zan2d;
        this.xof2d = template.xof2d;
        this.yof2d = template.yof2d;
        this.recol_s = template.recol_s;
        this.recol_d = template.recol_d;

        const link: ObjType = ObjType.get(this.certlink);
        this.name = link.name;
        this.members = link.members;
        this.cost = link.cost;

        let article: string = 'a';
        const c: string = (link.name || '').toLowerCase().charAt(0);
        if (c === 'a' || c === 'e' || c === 'i' || c === 'o' || c === 'u') {
            article = 'an';
        }
        this.desc = `Swap this note at any bank for ${article} ${link.name}.`;

        this.stackable = true;
    }

    private reset(): void {
        this.model = 0;
        this.name = null;
        this.desc = null;
        this.recol_s = null;
        this.recol_d = null;
        this.zoom2d = 2000;
        this.xan2d = 0;
        this.yan2d = 0;
        this.zan2d = 0;
        this.xof2d = 0;
        this.yof2d = 0;
        this.code9 = false;
        this.code10 = -1;
        this.stackable = false;
        this.cost = 1;
        this.members = false;
        this.op = null;
        this.iop = null;
        this.manwear = -1;
        this.manwear2 = -1;
        this.manwearOffsetY = 0;
        this.womanwear = -1;
        this.womanwear2 = -1;
        this.womanwearOffsetY = 0;
        this.manwear3 = -1;
        this.womanwear3 = -1;
        this.manhead = -1;
        this.manhead2 = -1;
        this.womanhead = -1;
        this.womanhead2 = -1;
        this.countobj = null;
        this.countco = null;
        this.certlink = -1;
        this.certtemplate = -1;
    }
}
