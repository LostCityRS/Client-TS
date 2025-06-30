import AnimBase from '#/graphics/AnimBase.ts';
import AnimFrame from '#/graphics/AnimFrame.ts';
import AnimSet from '#/graphics/AnimSet.ts';
import Model from '#/graphics/Model.ts';
import Packet from '#/io/Packet.ts';
import ColorConversion from '#/jaged/ColorConversion.ts';

interface NpcDataType {
    models?: string[];
    recols?: { [key: number]: [number, number] };
    name?: string;
    desc?: string;
    resizeh: number;
    resizev: number;
    size: number;
}

interface ObjDataType {
    model?: string;
    recols?: { [key: number]: [number, number] };
    name?: string;
    desc?: string;
}

interface LocDataType {
    name?: string;
    desc?: string;
    model?: string;
    recols?: { [key: number]: [number, number] };
    retexs?: { [key: number]: [string | null, string | null] };
    width: number;
    length: number;
    hillskew: boolean;
    sharelight: boolean;
    occlude: boolean;
    anim: number;
    wallwidth: number;
    ambient: number;
    contrast: number;
    animHasAlpha: boolean;
    mapfunction: number;
    mirror: boolean;
    shadow: boolean;
    resizex: number;
    resizey: number;
    resizez: number;
    offsetx: number;
    offsety: number;
    offsetz: number;
    forcedecor: boolean;
    active: boolean;
    mapscene: number;
    op1?: string;
    op2?: string;
    category?: string;
    blockrange?: boolean;
    forceapproach?: string;
}

interface SeqDataType {
    frameIds?: (string | undefined)[];
    iframeIds?: (string | undefined)[];
    delayValues?: (number | undefined)[];
    replayoff?: number;
    walkmerge?: number[];
    stretches?: boolean;
    priority?: number;
    righthand?: string;
    lefthand?: string;
    replaycount?: number;
}

export default class FileLoader {
    availableFiles: Map<string, File>;
    loadedModels: Map<string, Model>;
    npcData: Map<string, NpcDataType>;
    seqData: Map<string, SeqDataType>;
    availableTextures: Map<number, File>;
    textureNameToId: Map<string, number>;
    objData: Map<string, ObjDataType>;
    locData: Map<string, LocDataType>;

    constructor() {
        this.availableFiles = new Map();
        this.loadedModels = new Map();
        this.npcData = new Map();
        this.seqData = new Map();
        this.availableTextures = new Map();
        this.textureNameToId = new Map();
        this.objData = new Map();
        this.locData = new Map();
    }

    async parseNpcFile(file: File): Promise<Map<string, NpcDataType>> {
        const text = await this.readFileAsText(file);
        const npcMap = new Map<string, NpcDataType>();

        let currentName: string | null = null;
        let modelMap = new Map<number, string>();
        let recolMap = new Map<number, [number, number]>();
        let name: string | null = null;
        let desc: string | null = null;
        let resizeh = 128;
        let resizev = 128;
        let size = 1;

        const lines = text.split("\n");

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith("//")) continue;

            const nameMatch = line.match(/\[(.*?)\]/);
            if (nameMatch) {
                this.saveNpcData(
                    npcMap,
                    currentName,
                    modelMap,
                    recolMap,
                    name,
                    desc,
                    resizeh,
                    resizev,
                    size
                );

                currentName = nameMatch[1];
                modelMap.clear();
                recolMap.clear();
                name = null;
                desc = null;
                size = 1;
                resizeh = 128;
                resizev = 128;
            } else if (line.startsWith("name=")) {
                name = line.substring(5).trim();
            } else if (line.startsWith("size=")) {
                size = parseInt(line.substring(5).trim());
            } else if (line.startsWith("desc=")) {
                desc = line.substring(5).trim();
            } else if (line.startsWith("resizeh=")) {
                resizeh = parseInt(line.substring(8).trim());
            } else if (line.startsWith("resizev=")) {
                resizev = parseInt(line.substring(8).trim());
            } else if (line.startsWith("recol")) {
                const recolMatch = line.match(/recol(\d+)([sd])=(\d+)/);
                if (recolMatch) {
                    const recolIndex = parseInt(recolMatch[1]);
                    const recolType = recolMatch[2];
                    const recolValue = parseInt(recolMatch[3]);

                    if (!recolMap.has(recolIndex)) {
                        recolMap.set(recolIndex, [0, 0]);
                    }
                    const recolValues = recolMap.get(recolIndex);

                    if (recolValues && recolType === "s") {
                        recolValues[0] = ColorConversion.rgb15toHsl16(recolValue);
                    } else if (recolValues && recolType === "d") {
                        recolValues[1] = ColorConversion.rgb15toHsl16(recolValue);
                    }
                }
            } else if (line.startsWith("model")) {
                const modelMatch = line.match(/model(\d+)=(.+)/);
                if (modelMatch) {
                    const modelIndex = parseInt(modelMatch[1]);
                    const modelValue = modelMatch[2].trim();
                    modelMap.set(modelIndex, modelValue);
                }
            }
        }

        this.saveNpcData(
            npcMap,
            currentName,
            modelMap,
            recolMap,
            name,
            desc,
            resizeh,
            resizev,
            size
        );

        return npcMap;
    }

    saveNpcData(
        npcMap: Map<string, NpcDataType>,
        currentName: string | null,
        modelMap: Map<number, string>,
        recolMap: Map<number, [number, number]>,
        name: string | null,
        desc: string | null,
        resizeh: number,
        resizev: number,
        size: number
    ): void {
        if (currentName !== null) {
            const data: NpcDataType = { resizeh, resizev, size };

            if (modelMap.size > 0) {
                const maxModelIndex = Math.max(...modelMap.keys());
                const models = new Array(maxModelIndex);

                for (let i = 1; i <= maxModelIndex; i++) {
                    if (modelMap.has(i)) {
                        models[i - 1] = modelMap.get(i);
                    }
                }

                data.models = models.filter((model) => model !== undefined);
            }

            if (recolMap.size > 0) {
                const recols: { [key: number]: [number, number] } = {};
                for (let [key, value] of recolMap.entries()) {
                    recols[key] = [...value];
                }
                data.recols = recols;
            }

            if (name !== null) data.name = name;
            if (desc !== null) data.desc = desc;
            data.resizeh = resizeh;
            data.resizev = resizev;
            data.size = size;

            npcMap.set(currentName, data);
        }
    }

    async parseObjFile(file: File): Promise<Map<string, ObjDataType>> {
        const text = await this.readFileAsText(file);
        const objMap = new Map<string, ObjDataType>();

        let currentName: string | null = null;
        let model: string | null = null;
        let recolMap = new Map<number, [number, number]>();
        let name: string | null = null;
        let desc: string | null = null;

        const lines = text.split(/\r?\n/);

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith("//")) continue;

            const nameMatch = line.match(/\[(.*?)\]/);
            if (nameMatch) {
                if (currentName) {
                    this.saveObjData(objMap, currentName, model, recolMap, name, desc);
                }

                currentName = nameMatch[1];
                model = null;
                recolMap.clear();
                name = null;
                desc = null;
            } else if (currentName) {
                if (line.startsWith("name=")) {
                    name = line.substring(5).trim();
                } else if (line.startsWith("desc=")) {
                    desc = line.substring(5).trim();
                } else if (line.startsWith("model=")) {
                    model = line.substring(6).trim();
                } else if (line.startsWith("recol")) {
                    const recolMatch = line.match(/recol(\d+)([sd])=(\d+)/);
                    if (recolMatch) {
                        const recolIndex = parseInt(recolMatch[1]);
                        const recolType = recolMatch[2];
                        const recolValue = parseInt(recolMatch[3]);

                        if (!recolMap.has(recolIndex)) {
                            recolMap.set(recolIndex, [0, 0]);
                        }
                        const recolValues = recolMap.get(recolIndex);

                        if (recolValues && recolType === "s") {
                            recolValues[0] = ColorConversion.rgb15toHsl16(recolValue);
                        } else if (recolValues && recolType === "d") {
                            recolValues[1] = ColorConversion.rgb15toHsl16(recolValue);
                        }
                    }
                }
            }
        }

        if (currentName) {
            this.saveObjData(objMap, currentName, model, recolMap, name, desc);
        }

        return objMap;
    }

    saveObjData(
        objMap: Map<string, ObjDataType>,
        currentName: string | null,
        model: string | null,
        recolMap: Map<number, [number, number]>,
        name: string | null,
        desc: string | null
    ): void {
        if (currentName !== null) {
            const data: ObjDataType = {};

            if (model !== null) {
                data.model = model;
            }

            if (recolMap.size > 0) {
                const recols: { [key: number]: [number, number] } = {};
                for (let [key, value] of recolMap.entries()) {
                    recols[key] = [...value];
                }
                data.recols = recols;
            }

            if (name !== null) data.name = name;
            if (desc !== null) data.desc = desc;
            objMap.set(currentName, data);
        }
    }

    async parseLocFile(file: File): Promise<Map<string, LocDataType>> {
        const text = await this.readFileAsText(file);
        const locMap = new Map<string, LocDataType>();

        let currentName: string | null = null;

        let name: string | null = null;
        let desc: string | null = null;
        let model: string | null = null;
        let recolMap = new Map<number, [number, number]>();
        let retexMap = new Map<number, [string | null, string | null]>();

        let width = 1;
        let length = 1;
        let hillskew = false;
        let sharelight = false;
        let occlude = true;
        let anim = 0;
        let wallwidth = 16;
        let ambient = 0;
        let contrast = 0;
        let animHasAlpha = false;
        let mapfunction = 0;
        let mirror = false;
        let shadow = false;
        let resizex = 128;
        let resizey = 128;
        let resizez = 128;
        let offsetx = 0;
        let offsety = 0;
        let offsetz = 0;
        let forcedecor = false;
        let active = false;
        let mapscene = 0;
        let op1: string | null = null;
        let op2: string | null = null;
        let category: string | null = null;
        let blockrange: boolean | null = null;
        let forceapproach: string | null = null;

        const lines = text.split(/\r?\n/);

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith("//")) continue;

            const nameMatch = line.match(/\[(.*?)\]/);
            if (nameMatch) {
                if (currentName) {
                    this.saveLocData(
                        locMap,
                        currentName,
                        name,
                        desc,
                        model,
                        recolMap,
                        retexMap,
                        width,
                        length,
                        hillskew,
                        sharelight,
                        occlude,
                        anim,
                        wallwidth,
                        ambient,
                        contrast,
                        animHasAlpha,
                        mapfunction,
                        mirror,
                        shadow,
                        resizex,
                        resizey,
                        resizez,
                        offsetx,
                        offsety,
                        offsetz,
                        forcedecor,
                        active,
                        mapscene,
                        op1,
                        op2,
                        category,
                        blockrange,
                        forceapproach
                    );
                }

                currentName = nameMatch[1];
                name = null;
                desc = null;
                model = null;
                recolMap.clear();
                retexMap.clear();
                width = 1;
                length = 1;
                hillskew = false;
                sharelight = false;
                occlude = true;
                anim = 0;
                wallwidth = 16;
                ambient = 0;
                contrast = 0;
                animHasAlpha = false;
                mapfunction = 0;
                mirror = false;
                shadow = false;
                resizex = 128;
                resizey = 128;
                resizez = 128;
                offsetx = 0;
                offsety = 0;
                offsetz = 0;
                forcedecor = false;
                active = false;
                mapscene = 0;
                op1 = null;
                op2 = null;
                category = null;
                blockrange = null;
                forceapproach = null;
            } else if (currentName) {
                if (line.startsWith("name=")) {
                    name = line.substring(5).trim();
                } else if (line.startsWith("desc=")) {
                    desc = line.substring(5).trim();
                } else if (line.startsWith("model=")) {
                    model = line.substring(6).trim();
                } else if (line.startsWith("width=")) {
                    width = parseInt(line.substring(6).trim()) || 1;
                } else if (line.startsWith("length=")) {
                    length = parseInt(line.substring(7).trim()) || 1;
                } else if (line.startsWith("hillskew=")) {
                    hillskew = line.substring(9).trim().toLowerCase() === "yes";
                } else if (line.startsWith("sharelight=")) {
                    sharelight = line.substring(11).trim().toLowerCase() === "yes";
                } else if (line.startsWith("occlude=")) {
                    occlude = line.substring(8).trim().toLowerCase() !== "no";
                } else if (line.startsWith("anim=")) {
                    anim = parseInt(line.substring(5).trim()) || 0;
                } else if (line.startsWith("wallwidth=")) {
                    wallwidth = parseInt(line.substring(10).trim()) || 16;
                } else if (line.startsWith("ambient=")) {
                    ambient = parseInt(line.substring(8).trim()) || 0;
                } else if (line.startsWith("contrast=")) {
                    contrast = parseInt(line.substring(9).trim()) || 0;
                } else if (line.startsWith("mapfunction=")) {
                    mapfunction = parseInt(line.substring(12).trim()) || 0;
                } else if (line.startsWith("mirror=")) {
                    mirror = line.substring(7).trim().toLowerCase() === "yes";
                } else if (line.startsWith("resizex=")) {
                    resizex = parseInt(line.substring(8).trim()) || 128;
                } else if (line.startsWith("resizey=")) {
                    resizey = parseInt(line.substring(8).trim()) || 128;
                } else if (line.startsWith("resizez=")) {
                    resizez = parseInt(line.substring(8).trim()) || 128;
                } else if (line.startsWith("offsetx=")) {
                    offsetx = parseInt(line.substring(8).trim()) || 0;
                } else if (line.startsWith("offsety=")) {
                    offsety = parseInt(line.substring(8).trim()) || 0;
                } else if (line.startsWith("offsetz=")) {
                    offsetz = parseInt(line.substring(8).trim()) || 0;
                } else if (line.startsWith("forcedecor=")) {
                    forcedecor = line.substring(11).trim().toLowerCase() === "yes";
                } else if (line.startsWith("active=")) {
                    active = line.substring(7).trim().toLowerCase() === "yes";
                } else if (line.startsWith("mapscene=")) {
                    mapscene = parseInt(line.substring(9).trim()) || 0;
                } else if (line.startsWith("op1=")) {
                    op1 = line.substring(4).trim();
                } else if (line.startsWith("op2=")) {
                    op2 = line.substring(4).trim();
                } else if (line.startsWith("category=")) {
                    category = line.substring(9).trim();
                } else if (line.startsWith("blockrange=")) {
                    blockrange = line.substring(11).trim().toLowerCase() !== "yes";
                } else if (line.startsWith("forceapproach=")) {
                    forceapproach = line.substring(14).trim();
                } else if (line.startsWith("recol")) {
                    const recolMatch = line.match(/recol(\d+)([sd])=(\d+)/);
                    if (recolMatch) {
                        const recolIndex = parseInt(recolMatch[1]);
                        const recolType = recolMatch[2];
                        const recolValue = parseInt(recolMatch[3]);
                        if (!recolMap.has(recolIndex)) {
                            recolMap.set(recolIndex, [0, 0]);
                        }
                        const recolValues = recolMap.get(recolIndex);
                        if (recolValues && recolType === "s") {
                            recolValues[0] = ColorConversion.rgb15toHsl16(recolValue);
                        } else if (recolValues && recolType === "d") {
                            recolValues[1] = ColorConversion.rgb15toHsl16(recolValue);
                        }
                    }
                } else if (line.startsWith("retex")) {
                    const retexMatch = line.match(/retex(\d+)([sd])=(.+)/);
                    if (retexMatch) {
                        const retexIndex = parseInt(retexMatch[1]);
                        const retexType = retexMatch[2];
                        const retexValue = retexMatch[3].trim();
                        if (!retexMap.has(retexIndex)) {
                            retexMap.set(retexIndex, [null, null]);
                        }
                        const retexValues = retexMap.get(retexIndex);
                        if (retexValues && retexType === "s") {
                            retexValues[0] = retexValue;
                        } else if (retexValues && retexType === "d") {
                            retexValues[1] = retexValue;
                        }
                    }
                }
            }
        }

        if (currentName) {
            this.saveLocData(
                locMap,
                currentName,
                name,
                desc,
                model,
                recolMap,
                retexMap,
                width,
                length,
                hillskew,
                sharelight,
                occlude,
                anim,
                wallwidth,
                ambient,
                contrast,
                animHasAlpha,
                mapfunction,
                mirror,
                shadow,
                resizex,
                resizey,
                resizez,
                offsetx,
                offsety,
                offsetz,
                forcedecor,
                active,
                mapscene,
                op1,
                op2,
                category,
                blockrange,
                forceapproach
            );
        }

        return locMap;
    }

    saveLocData(
        locMap: Map<string, LocDataType>,
        currentName: string | null,
        name: string | null,
        desc: string | null,
        model: string | null,
        recolMap: Map<number, [number, number]>,
        retexMap: Map<number, [string | null, string | null]>,
        width: number,
        length: number,
        hillskew: boolean,
        sharelight: boolean,
        occlude: boolean,
        anim: number,
        wallwidth: number,
        ambient: number,
        contrast: number,
        animHasAlpha: boolean,
        mapfunction: number,
        mirror: boolean,
        shadow: boolean,
        resizex: number,
        resizey: number,
        resizez: number,
        offsetx: number,
        offsety: number,
        offsetz: number,
        forcedecor: boolean,
        active: boolean,
        mapscene: number,
        op1: string | null,
        op2: string | null,
        category: string | null,
        blockrange: boolean | null,
        forceapproach: string | null
    ): void {
        if (currentName !== null) {
            const data: LocDataType = {
                width,
                length,
                hillskew,
                sharelight,
                occlude,
                anim,
                wallwidth,
                ambient,
                contrast,
                animHasAlpha,
                mapfunction,
                mirror,
                shadow,
                resizex,
                resizey,
                resizez,
                offsetx,
                offsety,
                offsetz,
                forcedecor,
                active,
                mapscene,
            };

            if (name !== null) data.name = name;
            if (desc !== null) data.desc = desc;
            if (model !== null) data.model = model;

            if (recolMap.size > 0) {
                const recols: { [key: number]: [number, number] } = {};
                for (let [key, value] of recolMap.entries()) {
                    recols[key] = [...value];
                }
                data.recols = recols;
            }
            if (retexMap.size > 0) {
                const retexs: { [key: number]: [string | null, string | null] } = {};
                for (let [key, value] of retexMap.entries()) {
                    retexs[key] = [...value];
                }
                data.retexs = retexs;
            }

            if (op1 !== null) data.op1 = op1;
            if (op2 !== null) data.op2 = op2;
            if (category !== null) data.category = category;
            if (blockrange !== null) data.blockrange = blockrange;
            if (forceapproach !== null) data.forceapproach = forceapproach;

            locMap.set(currentName, data);
        }
    }

    async parseSeqFile(file: File): Promise<Map<string, SeqDataType>> {
        const text = await this.readFileAsText(file);
        const seqMap = new Map<string, SeqDataType>();

        let currentName: string | null = null;
        let frames = new Map<number, string>();
        let iframes = new Map<number, string>();
        let delays = new Map<number, number>();
        let replayoff: number | undefined = undefined;
        let walkmerge: number[] | undefined = undefined;
        let stretches = false;
        let priority = 0;
        let righthand: string | undefined = undefined;
        let lefthand: string | undefined = undefined;
        let replaycount: number | undefined = undefined;

        const lines = text.split(/\r?\n/);

        for (let line of lines) {
            line = line.trim();
            if (!line || line.startsWith("//")) continue;

            const nameMatch = line.match(/\[(.*?)\]/);
            if (nameMatch) {
                this.saveSeqData(
                    seqMap,
                    currentName,
                    frames,
                    iframes,
                    delays,
                    replayoff,
                    walkmerge,
                    stretches,
                    priority,
                    righthand,
                    lefthand,
                    replaycount
                );

                currentName = nameMatch[1];
                frames.clear();
                iframes.clear();
                delays.clear();
                replayoff = undefined;
                walkmerge = undefined;
                stretches = false;
                priority = 0;
                righthand = undefined;
                lefthand = undefined;
                replaycount = undefined;
            } else if (currentName) {
                const [key, ...valueParts] = line.split("=");
                const value = valueParts.join("=").trim();

                if (key.startsWith("frame")) {
                    const index = parseInt(key.substring("frame".length));
                    if (!isNaN(index)) frames.set(index, value);
                } else if (key.startsWith("iframe")) {
                    const index = parseInt(key.substring("iframe".length));
                    if (!isNaN(index)) iframes.set(index, value);
                } else if (key.startsWith("delay")) {
                    const index = parseInt(key.substring("delay".length));
                    const numValue = parseInt(value);
                    if (!isNaN(index) && !isNaN(numValue)) delays.set(index, numValue);
                } else if (key === "replayoff") {
                    replayoff = parseInt(value);
                } else if (key === "walkmerge") {
                    walkmerge = value
                        .split(",")
                        .map((v) => parseInt(v.trim()))
                        .filter((n) => !isNaN(n));
                } else if (key === "stretches") {
                    stretches =
                        value.toLowerCase() === "yes" || value.toLowerCase() === "true";
                } else if (key === "priority") {
                    priority = parseInt(value);
                } else if (key === "righthand") {
                    righthand = value;
                } else if (key === "lefthand") {
                    lefthand = value;
                } else if (key === "replaycount") {
                    replaycount = parseInt(value);
                }
            }
        }

        this.saveSeqData(
            seqMap,
            currentName,
            frames,
            iframes,
            delays,
            replayoff,
            walkmerge,
            stretches,
            priority,
            righthand,
            lefthand,
            replaycount
        );

        return seqMap;
    }

    saveSeqData(
        seqMap: Map<string, SeqDataType>,
        currentName: string | null,
        frames: Map<number, string>,
        iframes: Map<number, string>,
        delays: Map<number, number>,
        replayoff: number | undefined,
        walkmerge: number[] | undefined,
        stretches: boolean,
        priority: number,
        righthand: string | undefined,
        lefthand: string | undefined,
        replaycount: number | undefined
    ): void {
        if (currentName === null) return;

        const data: SeqDataType = {};

        let maxIndex = 0;
        if (frames.size > 0) maxIndex = Math.max(maxIndex, ...frames.keys());
        if (iframes.size > 0) maxIndex = Math.max(maxIndex, ...iframes.keys());
        if (delays.size > 0) maxIndex = Math.max(maxIndex, ...delays.keys());

        if (maxIndex > 0) {
            data.frameIds = new Array(maxIndex);
            data.iframeIds = new Array(maxIndex);
            data.delayValues = new Array(maxIndex);

            for (let i = 1; i <= maxIndex; i++) {
                data.frameIds[i - 1] = frames.get(i);
                data.iframeIds[i - 1] = iframes.get(i);
                data.delayValues[i - 1] = delays.get(i);
            }
        } else {
            data.frameIds = [];
            data.iframeIds = [];
            data.delayValues = [];
        }

        if (replayoff !== undefined && !isNaN(replayoff))
            data.replayoff = replayoff;
        if (walkmerge !== undefined && walkmerge.length > 0)
            data.walkmerge = walkmerge;
        if (stretches) data.stretches = stretches;
        if (priority !== undefined && !isNaN(priority)) data.priority = priority;
        if (righthand !== undefined) data.righthand = righthand;
        if (lefthand !== undefined) data.lefthand = lefthand;
        if (replaycount !== undefined && !isNaN(replaycount))
            data.replaycount = replaycount;

        seqMap.set(currentName, data);
    }

    async loadNpcModels(npcId: string): Promise<Model> {
        const npcData = this.getNpcData(npcId);
        if (!npcData || !npcData.models) {
            throw new Error(`NPC ${npcId} has no models defined`);
        }

        const models: Model[] = [];
        const modelNames: string[] = [];

        for (const modelName of npcData.models) {
            try {
                let foundModelId: string | null = null;

                for (const [availableModelId] of this.availableFiles.entries()) {
                    if (availableModelId.includes(modelName)) {
                        foundModelId = availableModelId;
                        break;
                    }
                }

                if (!foundModelId) {
                    console.warn(`Model file not found for: ${modelName}`);
                    continue;
                }

                const model = await this.loadNpcPartModel(foundModelId);
                models.push(model);
                modelNames.push(modelName);
            } catch (error) {
                console.warn(
                    `Failed to load model component ${modelName} for NPC ${npcId}:`,
                    error
                );
            }
        }

        if (models.length === 0) {
            throw new Error(`No models could be loaded for NPC ${npcId}`);
        }

        const combinedModel = Model.modelFromNpcModels(
            models,
            models.length,
            npcId,
            modelNames
        );

        if (npcData.recols) {
            for (const key in npcData.recols) {
                const [source, dest] = npcData.recols[key];
                combinedModel.recolor(source, dest);
            }
        }

        combinedModel.saveCurrentVerticesAsOriginal();

        if (npcData.resizeh !== 128 || npcData.resizev !== 128) {
            combinedModel.scale(npcData.resizeh, npcData.resizev, npcData.resizeh);
        }

        combinedModel.createLabelReferences();
        combinedModel.calculateNormals(64, 850, -30, -50, -30, true);
        return combinedModel;
    }

    async loadContentFiles(files: FileList | File[]): Promise<void> {
        this.textureNameToId.clear();
        this.availableFiles.clear();
        this.loadedModels.clear();
        this.npcData.clear();
        this.seqData.clear();
        this.locData.clear();
        this.objData.clear();
        this.availableTextures.clear();

        const ob2Files = Array.from(files).filter((file) =>
            file.name.toLowerCase().endsWith(".ob2")
        );

        const packFiles = Array.from(files).filter((file) =>
            file.name.toLowerCase().endsWith(".pack")
        );

        const npcFiles = Array.from(files).filter((file) =>
            file.name.toLowerCase().endsWith(".npc")
        );

        const objFiles = Array.from(files).filter((file) =>
            file.name.toLowerCase().endsWith(".obj")
        );

        const locFiles = Array.from(files).filter((file) =>
            file.name.toLowerCase().endsWith(".loc")
        );

        const seqFiles = Array.from(files).filter((file) =>
            file.name.toLowerCase().endsWith(".seq")
        );

        const animsetFiles = Array.from(files).filter((file) =>
            file.name.toLowerCase().endsWith(".anim")
        );

        const baseFiles = Array.from(files).filter((file) =>
            file.name.toLowerCase().endsWith(".base")
        );

        const frameFiles = Array.from(files).filter((file) =>
            file.name.toLowerCase().endsWith(".frame")
        );

        const pngFiles = Array.from(files).filter((file) =>
            file.name.toLowerCase().endsWith(".png")
        );

        for (const file of packFiles) {
            if (file.name.toLowerCase().includes("texture")) {
                const packContent = await file.text();
                const lines = packContent.split("\n");

                for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine && trimmedLine.includes("=")) {
                        const [idStr, textureName] = trimmedLine.split("=");
                        const textureId = parseInt(idStr.trim(), 10);
                        const name = textureName.trim();

                        if (!isNaN(textureId) && name) {
                            this.textureNameToId.set(name, textureId);
                        }
                    }
                }
            }
        }

        for (const file of ob2Files) {
            const relativePath = (file as any).webkitRelativePath || file.name;
            if (!String(relativePath).includes("_unpack")) {
                const fileNameNoExt = relativePath.substring(
                    relativePath.indexOf("/models/") + 8,
                    relativePath.lastIndexOf(".")
                );
                this.availableFiles.set(fileNameNoExt, file);
            }
        }

        for (const file of pngFiles) {
            const relativePath = (file as any).webkitRelativePath || file.name;
            if (String(relativePath).includes("/textures/")) {
                const fileNameNoExt = relativePath.substring(
                    relativePath.lastIndexOf("/") + 1,
                    relativePath.lastIndexOf(".")
                );

                if (this.textureNameToId.has(fileNameNoExt)) {
                    const textureId = this.textureNameToId.get(fileNameNoExt);
                    if (textureId !== undefined) {
                        this.availableTextures.set(textureId, file);
                    }
                }
            }
        }

        for (const file of npcFiles) {
            try {
                const npcMap = await this.parseNpcFile(file);

                for (let [npcId, npcInfo] of npcMap.entries()) {
                    this.npcData.set(npcId, npcInfo);
                }
            } catch (error) {
                console.error(`Error processing NPC file ${file.name}:`, error);
            }
        }

        for (const file of objFiles) {
            try {
                const objMap = await this.parseObjFile(file);
                for (let [objId, objInfo] of objMap.entries()) {
                    this.objData.set(objId, objInfo);
                }
            } catch (error) {
                console.error(`Error processing OBJ file ${file.name}:`, error);
            }
        }

        for (const file of locFiles) {
            try {
                const locMap = await this.parseLocFile(file);
                for (let [locId, locInfo] of locMap.entries()) {
                    this.locData.set(locId, locInfo);
                }
            } catch (error) {
                console.error(`Error processing LOC file ${file.name}:`, error);
            }
        }

        for (const file of seqFiles) {
            try {
                const seqMap = await this.parseSeqFile(file);

                for (let [seqId, seqInfo] of seqMap.entries()) {
                    this.seqData.set(seqId, seqInfo);
                }
            } catch (error) {
                console.error(`Error processing SEQ file ${file.name}:`, error);
            }
        }

        for (const file of animsetFiles) {
            try {
                const parts = file.name.split("_");
                const idString = parts[parts.length - 1];
                const currentId = parseInt(idString, 10);
                await this.convertAnimset(currentId, file);
            } catch (error) {
                console.error(`Error processing Animset file ${file.name}:`, error);
            }
        }

        for (const file of baseFiles) {
            try {
                const parts = file.name.split("_");
                const idString = parts[parts.length - 1];
                const currentId = parseInt(idString, 10);
                await this.convertBase(currentId, file);
            } catch (error) {
                console.error(`Error processing Frame file ${file.name}:`, error);
            }
        }

        for (const file of frameFiles) {
            try {
                const parts = file.name.split("_");
                const idString = parts[parts.length - 1];
                const currentId = parseInt(idString, 10);
                await this.convertFrame(currentId, file);
            } catch (error) {
                console.error(`Error processing Frame file ${file.name}:`, error);
            }
        }
    }

    async loadModel(modelId: string): Promise<Model> {
        if (this.loadedModels.has(modelId)) {
            const model = this.loadedModels.get(modelId);
            if (model) {
                return model;
            }
        }

        const file = this.availableFiles.get(modelId);
        if (!file) {
            throw new Error(`Model file not found: ${modelId}`);
        }

        try {
            const model = await this.convertModel(file);
            model.createLabelReferences();
            model.calculateNormals(64, 768, -50, -10, -50, true);
            model.saveCurrentVerticesAsOriginal();
            this.loadedModels.set(modelId, model);
            return model;
        } catch (error) {
            console.error(`Failed to load model '${modelId}': ${error}`);
            throw error;
        }
    }

    async loadNpcPartModel(modelId: string): Promise<Model> {
        if (this.loadedModels.has("part_" + modelId)) {
            const model = this.loadedModels.get("part_" + modelId);
            if (model) {
                return model;
            }
        }

        const file = this.availableFiles.get(modelId);
        if (!file) {
            throw new Error(`Model file not found for NPC part: ${modelId}`);
        }

        try {
            const model = await this.convertModel(file);
            this.loadedModels.set("part_" + modelId, model);
            return model;
        } catch (error) {
            throw error;
        }
    }

    async convertModel(file: File): Promise<Model> {
        const arrayBuffer = await this.readFileAsArrayBuffer(file);
        const uint8View = new Uint8Array(arrayBuffer);
        const data = new Packet(uint8View);
        return Model.convertFromData(data);
    }

    async convertAnimset(currentId: number, file: File): Promise<void> {
        const arrayBuffer = await this.readFileAsArrayBuffer(file);
        const uint8View = new Uint8Array(arrayBuffer);
        AnimSet.convertFromData(currentId, uint8View);
    }

    async convertBase(currentId: number, file: File): Promise<void> {
        const arrayBuffer = await this.readFileAsArrayBuffer(file);
        const uint8View = new Uint8Array(arrayBuffer);
        const data = new Packet(uint8View);
        AnimBase.convertFromData(currentId, data);
    }

    async convertFrame(currentId: number, file: File): Promise<void> {
        const arrayBuffer = await this.readFileAsArrayBuffer(file);
        const uint8View = new Uint8Array(arrayBuffer);
        const data = new Packet(uint8View);
        AnimFrame.convertFromData(currentId, data);
        if (AnimFrame.instances && AnimFrame.instances[currentId]) {
            const instance = AnimFrame.instances[currentId];
            (instance as any).originalPath =
                (file as any).webkitRelativePath || file.name;
            (instance as any).originalFileName = file.name;
        }
    }

    getAvailableModels(): string[] {
        return Array.from(this.availableFiles.keys()).sort();
    }

    getLoadedModels(): Map<string, Model> {
        return this.loadedModels;
    }

    getNpcData(npcId: string): NpcDataType | undefined {
        return this.npcData.get(npcId);
    }

    getAllNpcs(): string[] {
        return Array.from(this.npcData.keys()).sort();
    }

    getAllSeqs(): string[] {
        return Array.from(this.seqData.keys()).sort();
    }

    getSeqData(seqId: string): SeqDataType | undefined {
        return this.seqData.get(seqId);
    }

    getObjData(objId: string): ObjDataType | undefined {
        return this.objData.get(objId);
    }

    getAllObjs(): string[] {
        return Array.from(this.objData.keys()).sort();
    }

    getLocData(locId: string): LocDataType | undefined {
        return this.locData.get(locId);
    }

    getAllLocs(): string[] {
        return Array.from(this.locData.keys()).sort();
    }

    getTextureIdByName(textureName: string): number | undefined {
        return this.textureNameToId.get(textureName);
    }

    async readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target!.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    async readFileAsText(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target!.result as string);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }
}
