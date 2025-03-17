import Jagfile from '#/io/Jagfile.js';
import Packet from '#/io/Packet.js';

import Model from '#/graphics/Model.js';
import PixFont from '#/graphics/PixFont.js';

import LruCache from '#/datastruct/LruCache.js';
import JString from '#/datastruct/JString.js';

import Pix2D from '#/graphics/Pix2D.js';
import Pix24 from '#/graphics/Pix24.js';

import { TypedArray1d } from '#/util/Arrays.js';

export const enum ComponentType {
    TYPE_LAYER = 0,
    TYPE_UNUSED = 1, // TODO
    TYPE_INV = 2,
    TYPE_RECT = 3,
    TYPE_TEXT = 4,
    TYPE_GRAPHIC = 5,
    TYPE_MODEL = 6,
    TYPE_INV_TEXT = 7,
};

export const enum ButtonType {
    BUTTON_OK = 1,
    BUTTON_TARGET = 2,
    BUTTON_CLOSE = 3,
    BUTTON_TOGGLE = 4,
    BUTTON_SELECT = 5,
    BUTTON_CONTINUE = 6,
};

export default class Component {
    static instances: Component[] = [];
    static imageCache: LruCache | null = null;
    static modelCache: LruCache | null = null;

    static unpack(interfaces: Jagfile, media: Jagfile, fonts: PixFont[]): void {
        this.imageCache = new LruCache(50000);
        this.modelCache = new LruCache(50000);

        const dat: Packet = new Packet(interfaces.read('data'));
        let layer: number = -1;

        dat.pos += 2; // const count = dat.g2();

        while (dat.pos < dat.length) {
            let id: number = dat.g2();
            if (id === 65535) {
                layer = dat.g2();
                id = dat.g2();
            }

            const com: Component = (this.instances[id] = new Component());
            com.id = id;
            com.layer = layer;
            com.comType = dat.g1();
            com.buttonType = dat.g1();
            com.clientCode = dat.g2();
            com.width = dat.g2();
            com.height = dat.g2();
            com.alpha = dat.g1();

            com.overLayer = dat.g1();
            if (com.overLayer === 0) {
                com.overLayer = -1;
            } else {
                com.overLayer = ((com.overLayer - 1) << 8) + dat.g1();
            }

            const comparatorCount: number = dat.g1();
            if (comparatorCount > 0) {
                com.scriptComparator = new Uint8Array(comparatorCount);
                com.scriptOperand = new Uint16Array(comparatorCount);

                for (let i: number = 0; i < comparatorCount; i++) {
                    com.scriptComparator[i] = dat.g1();
                    com.scriptOperand[i] = dat.g2();
                }
            }

            const scriptCount: number = dat.g1();
            if (scriptCount > 0) {
                com.script = new TypedArray1d(scriptCount, null);

                for (let i: number = 0; i < scriptCount; i++) {
                    const opcodeCount: number = dat.g2();

                    const script: Uint16Array = new Uint16Array(opcodeCount);
                    com.script[i] = script;
                    for (let j: number = 0; j < opcodeCount; j++) {
                        script[j] = dat.g2();
                    }
                }
            }

            if (com.comType === ComponentType.TYPE_LAYER) {
                com.scroll = dat.g2();
                com.hide = dat.g1() === 1;

                const childCount: number = dat.g2();
                com.childId = new Array(childCount);
                com.childX = new Array(childCount);
                com.childY = new Array(childCount);

                for (let i: number = 0; i < childCount; i++) {
                    com.childId[i] = dat.g2();
                    com.childX[i] = dat.g2b();
                    com.childY[i] = dat.g2b();
                }
            }

            if (com.comType === ComponentType.TYPE_UNUSED) {
                dat.pos += 3;
            }

            if (com.comType === ComponentType.TYPE_INV) {
                com.invSlotObjId = new Int32Array(com.width * com.height);
                com.invSlotObjCount = new Int32Array(com.width * com.height);

                com.draggable = dat.g1() === 1;
                com.interactable = dat.g1() === 1;
                com.usable = dat.g1() === 1;
                com.marginX = dat.g1();
                com.marginY = dat.g1();

                com.invSlotOffsetX = new Int16Array(20);
                com.invSlotOffsetY = new Int16Array(20);
                com.invSlotSprite = new TypedArray1d(20, null);

                for (let i: number = 0; i < 20; i++) {
                    if (dat.g1() === 1) {
                        com.invSlotOffsetX[i] = dat.g2b();
                        com.invSlotOffsetY[i] = dat.g2b();
                        const sprite: string = dat.gjstr();
                        if (sprite.length > 0) {
                            const spriteIndex: number = sprite.lastIndexOf(',');
                            // com.inventorySlotImage[i] = {name: sprite.substring(0, spriteIndex), sprite: parseInt(sprite.substring(spriteIndex + 1), 10)}; // Pix24.fromArchive(media, sprite.substring(0, spriteIndex), parseInt(sprite.substring(spriteIndex + 1), 10));
                            com.invSlotSprite[i] = this.getImage(media, sprite.substring(0, spriteIndex), parseInt(sprite.substring(spriteIndex + 1), 10));
                        }
                    }
                }

                com.iops = new TypedArray1d(5, null);
                for (let i: number = 0; i < 5; i++) {
                    const iop: string = dat.gjstr();
                    com.iops[i] = iop;

                    if (iop.length === 0) {
                        com.iops[i] = null;
                    }
                }
            }

            if (com.comType === ComponentType.TYPE_RECT) {
                com.fill = dat.g1() === 1;
            }

            if (com.comType === ComponentType.TYPE_TEXT || com.comType === ComponentType.TYPE_UNUSED) {
                com.center = dat.g1() === 1;
                const fontId: number = dat.g1();
                if (fonts) {
                    com.font = fonts[fontId];
                }
                com.shadowed = dat.g1() === 1;
            }

            if (com.comType === ComponentType.TYPE_TEXT) {
                com.text = dat.gjstr();
                com.activeText = dat.gjstr();
            }

            if (com.comType === ComponentType.TYPE_UNUSED || com.comType === ComponentType.TYPE_RECT || com.comType === ComponentType.TYPE_TEXT) {
                com.colour = dat.g4();
            }

            if (com.comType === ComponentType.TYPE_RECT || com.comType === ComponentType.TYPE_TEXT) {
                com.activeColour = dat.g4();
                com.overColour = dat.g4();
            }

            if (com.comType === ComponentType.TYPE_GRAPHIC) {
                const graphic: string = dat.gjstr();
                if (graphic.length > 0) {
                    const index: number = graphic.lastIndexOf(',');
                    com.graphic = this.getImage(media, graphic.substring(0, index), parseInt(graphic.substring(index + 1), 10));
                }
                const activeGraphic: string = dat.gjstr();
                if (activeGraphic.length > 0) {
                    const index: number = activeGraphic.lastIndexOf(',');
                    com.activeGraphic = this.getImage(media, activeGraphic.substring(0, index), parseInt(activeGraphic.substring(index + 1), 10));
                }
            }

            if (com.comType === ComponentType.TYPE_MODEL) {
                const model: number = dat.g1();
                if (model !== 0) {
                    com.model = this.getModel(((model - 1) << 8) + dat.g1());
                }

                const activeModel: number = dat.g1();
                if (activeModel !== 0) {
                    com.activeModel = this.getModel(((activeModel - 1) << 8) + dat.g1());
                }

                com.anim = dat.g1();
                if (com.anim === 0) {
                    com.anim = -1;
                } else {
                    com.anim = ((com.anim - 1) << 8) + dat.g1();
                }

                com.activeAnim = dat.g1();
                if (com.activeAnim === 0) {
                    com.activeAnim = -1;
                } else {
                    com.activeAnim = ((com.activeAnim - 1) << 8) + dat.g1();
                }

                com.zoom = dat.g2();
                com.xan = dat.g2();
                com.yan = dat.g2();
            }

            if (com.comType === ComponentType.TYPE_INV_TEXT) {
                com.invSlotObjId = new Int32Array(com.width * com.height);
                com.invSlotObjCount = new Int32Array(com.width * com.height);

                com.center = dat.g1() === 1;
                const fontId: number = dat.g1();
                if (fonts) {
                    com.font = fonts[fontId];
                }

                com.shadowed = dat.g1() === 1;
                com.colour = dat.g4();
                com.marginX = dat.g2b();
                com.marginY = dat.g2b();
                com.interactable = dat.g1() === 1;

                com.iops = new TypedArray1d(5, null);
                for (let i: number = 0; i < 5; i++) {
                    const iop: string = dat.gjstr();
                    com.iops[i] = iop;

                    if (iop.length === 0) {
                        com.iops[i] = null;
                    }
                }
            }

            if (com.buttonType === ButtonType.BUTTON_TARGET || com.comType === ComponentType.TYPE_INV) {
                com.actionVerb = dat.gjstr();
                com.action = dat.gjstr();
                com.actionTarget = dat.g2();
            }

            if (com.buttonType === ButtonType.BUTTON_OK || com.buttonType === ButtonType.BUTTON_TOGGLE || com.buttonType === ButtonType.BUTTON_SELECT || com.buttonType === ButtonType.BUTTON_CONTINUE) {
                com.option = dat.gjstr();

                if (com.option.length === 0) {
                    if (com.buttonType === ButtonType.BUTTON_OK) {
                        com.option = 'Ok';
                    } else if (com.buttonType === ButtonType.BUTTON_TOGGLE) {
                        com.option = 'Select';
                    } else if (com.buttonType === ButtonType.BUTTON_SELECT) {
                        com.option = 'Select';
                    } else if (com.buttonType === ButtonType.BUTTON_CONTINUE) {
                        com.option = 'Continue';
                    }
                }
            }
        }

        this.imageCache = null;
        this.modelCache = null;
    }

    private static getImage(media: Jagfile, sprite: string, spriteId: number): Pix24 | null {
        const uid: bigint = (JString.hashCode(sprite) << 8n) | BigInt(spriteId);
        if (this.imageCache) {
            const image: Pix24 | null = this.imageCache.get(uid) as Pix24 | null;
            if (image) {
                return image;
            }
        }

        let image: Pix24;
        try {
            image = Pix24.fromArchive(media, sprite, spriteId);
            this.imageCache?.put(uid, image);
        } catch (e) {
            return null;
        }
        return image;
    }

    private static getModel(id: number): Model {
        if (this.modelCache) {
            const model: Model | null = this.modelCache.get(BigInt(id)) as Model | null;
            if (model) {
                return model;
            }
        }
        const model: Model = Model.model(id);
        this.modelCache?.put(BigInt(id), model);
        return model;
    }

    /* Client codes:
     * ---- friends
     * 1-200: friends list
     * 201: add friend
     * 202: delete friend
     * 203: friends list scrollbar size
     * ---- logout
     * 205: logout
     * ---- player_design
     * 300: change head (left)
     * 301: change head (right)
     * 302: change jaw (left)
     * 303: change jaw (right)
     * 304: change torso (left)
     * 305: change torso (right)
     * 306: change arms (left)
     * 307: change arms (right)
     * 308: change hands (left)
     * 309: change hands (right)
     * 310: change legs (left)
     * 311: change legs (right)
     * 312: change feet (left)
     * 313: change feet (right)
     * 314: recolour hair (left)
     * 315: recolour hair (right)
     * 316: recolour torso (left)
     * 317: recolour torso (right)
     * 318: recolour legs (left)
     * 319: recolour legs (right)
     * 320: recolour feet (left)
     * 321: recolour feet (right)
     * 322: recolour skin (left)
     * 323: recolour skin (right)
     * 324: switch to male
     * 325: switch to female
     * 326: accept design
     * 327: design preview
     * ---- ignore
     * 401-500: ignore list
     * 501: add ignore
     * 502: delete ignore
     * 503: ignore list scrollbar size
     * ---- reportabuse
     * 601: rule 1
     * 602: rule 2
     * 603: rule 3
     * 604: rule 4
     * 605: rule 5
     * 606: rule 6
     * 607: rule 7
     * 608: rule 8
     * 609: rule 9
     * 610: rule 10
     * 611: rule 11
     * 612: rule 12
     * 613: moderator mute
     * ---- welcome_screen / welcome_screen2
     * 650: last login info (has recovery questions set)
     * 651: unread messages
     * 655: last login info (no recovery questions set)
     */

    // ----

    id: number = -1;
    layer: number = -1;
    comType: number = -1;
    buttonType: number = -1;
    clientCode: number = 0;
    width: number = 0;
    height: number = 0;
    alpha: number = 0;
    overLayer: number = -1;
    scriptComparator: Uint8Array | null = null;
    scriptOperand: Uint16Array | null = null;
    script: (Uint16Array | null)[] | null = null;
    scroll: number = 0;
    hide: boolean = false;
    draggable: boolean = false;
    interactable: boolean = false;
    usable: boolean = false;
    marginX: number = 0;
    marginY: number = 0;
    invSlotOffsetX: Int16Array | null = null;
    invSlotOffsetY: Int16Array | null = null;
    invSlotSprite: (Pix24 | null)[] | null = null;
    iops: (string | null)[] | null = null;
    fill: boolean = false;
    center: boolean = false;
    font: PixFont | null = null;
    shadowed: boolean = false;
    text: string | null = null;
    activeText: string | null = null;
    colour: number = 0;
    activeColour: number = 0;
    overColour: number = 0;
    graphic: Pix24 | null = null;
    activeGraphic: Pix24 | null = null;
    model: Model | null = null;
    activeModel: Model | null = null;
    anim: number = -1;
    activeAnim: number = -1;
    zoom: number = 0;
    xan: number = 0;
    yan: number = 0;
    actionVerb: string | null = null;
    action: string | null = null;
    actionTarget: number = -1;
    option: string | null = null;
    childId: number[] | null = null;
    childX: number[] | null = null;
    childY: number[] | null = null;

    // other
    x: number = 0;
    y: number = 0;
    scrollPosition: number = 0;
    invSlotObjId: Int32Array | null = null;
    invSlotObjCount: Int32Array | null = null;
    seqFrame: number = 0;
    seqCycle: number = 0;

    getModel(primaryFrame: number, secondaryFrame: number, active: boolean): Model | null {
        let model: Model | null = this.model;
        if (active) {
            model = this.activeModel;
        }

        if (!model) {
            return null;
        }

        if (primaryFrame === -1 && secondaryFrame === -1 && !model.faceColor) {
            return model;
        }

        const tmp: Model = Model.modelShareColored(model, true, true, false);
        if (primaryFrame !== -1 || secondaryFrame !== -1) {
            tmp.createLabelReferences();
        }

        if (primaryFrame !== -1) {
            tmp.applyTransform(primaryFrame);
        }

        if (secondaryFrame !== -1) {
            tmp.applyTransform(secondaryFrame);
        }

        tmp.calculateNormals(64, 768, -50, -10, -50, true);
        return tmp;
    }

    getAbsoluteX(): number {
        if (this.layer === this.id) {
            return this.x;
        }

        let parent: Component = Component.instances[this.layer];
        if (!parent.childId || !parent.childX || !parent.childY) {
            return this.x;
        }

        let childIndex: number = parent.childId.indexOf(this.id);
        if (childIndex === -1) {
            return this.x;
        }

        let x: number = parent.childX[childIndex];
        while (parent.layer !== parent.id) {
            const grandParent: Component = Component.instances[parent.layer];
            if (grandParent.childId && grandParent.childX && grandParent.childY) {
                childIndex = grandParent.childId.indexOf(parent.id);
                if (childIndex !== -1) {
                    x += grandParent.childX[childIndex];
                }
            }
            parent = grandParent;
        }

        return x;
    }

    getAbsoluteY(): number {
        if (this.layer === this.id) {
            return this.y;
        }

        let parent: Component = Component.instances[this.layer];
        if (!parent.childId || !parent.childX || !parent.childY) {
            return this.y;
        }

        let childIndex: number = parent.childId.indexOf(this.id);
        if (childIndex === -1) {
            return this.y;
        }

        let y: number = parent.childY[childIndex];
        while (parent.layer !== parent.id) {
            const grandParent: Component = Component.instances[parent.layer];
            if (grandParent.childId && grandParent.childX && grandParent.childY) {
                childIndex = grandParent.childId.indexOf(parent.id);
                if (childIndex !== -1) {
                    y += grandParent.childY[childIndex];
                }
            }
            parent = grandParent;
        }

        return y;
    }

    outline(color: number): void {
        const x: number = this.getAbsoluteX();
        const y: number = this.getAbsoluteY();
        Pix2D.drawRect(x, y, this.width, this.height, color);
    }

    move(x: number, y: number): void {
        if (this.layer === this.id) {
            return;
        }

        this.x = 0;
        this.y = 0;

        const parent: Component = Component.instances[this.layer];

        if (parent.childId && parent.childX && parent.childY) {
            const childIndex: number = parent.childId.indexOf(this.id);

            if (childIndex !== -1) {
                parent.childX[childIndex] = x;
                parent.childY[childIndex] = y;
            }
        }
    }

    delete(): void {
        if (this.layer === this.id) {
            return;
        }

        const parent: Component = Component.instances[this.layer];

        if (parent.childId && parent.childX && parent.childY) {
            const childIndex: number = parent.childId.indexOf(this.id);

            if (childIndex !== -1) {
                parent.childId.splice(childIndex, 1);
                parent.childX.splice(childIndex, 1);
                parent.childY.splice(childIndex, 1);
            }
        }
    }
}
