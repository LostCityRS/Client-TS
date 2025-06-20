import AnimBase from '#/graphics/AnimBase.js';
import AnimFrame from '#/graphics/AnimFrame.js';
import Pix2D from '#/graphics/Pix2D.js';
import Pix3D from '#/graphics/Pix3D.js';

import Jagfile from '#/io/Jagfile.js';
import Packet from '#/io/Packet.js';

import DoublyLinkable from '#/datastruct/DoublyLinkable.js';

import { Int32Array2d, TypedArray1d } from '#/util/Arrays.js';

export interface ModelPart {
    partIndex: number;
    originalModel: Model;
    originalModelName: string;
    vertexOffset: number;
    vertexCount: number;
    faceOffset: number;
    faceCount: number;
    texturedFaceOffset: number;
    texturedFaceCount: number;
    vertexMapping: Map<number, number>;
}

export interface ModelPartMapping {
    parts: ModelPart[];
    isNpcModel: boolean;
    npcId?: string;
}

class Metadata {
    vertexCount: number = 0;
    faceCount: number = 0;
    texturedFaceCount: number = 0;

    vertexFlagsOffset: number = -1;
    vertexXOffset: number = -1;
    vertexYOffset: number = -1;
    vertexZOffset: number = -1;
    vertexLabelsOffset: number = -1;
    faceVerticesOffset: number = -1;
    faceOrientationsOffset: number = -1;
    faceColorsOffset: number = -1;
    faceInfosOffset: number = -1;
    facePrioritiesOffset: number = 0;
    faceAlphasOffset: number = -1;
    faceLabelsOffset: number = -1;
    faceTextureAxisOffset: number = -1;

    data: Uint8Array | null = null;
}

export class VertexNormal {
    x: number = 0;
    y: number = 0;
    z: number = 0;
    w: number = 0;
}

type ModelType = {
    vertexCount: number;
    vertexX: Int32Array;
    vertexY: Int32Array;
    vertexZ: Int32Array;
    faceCount: number;
    faceVertexA: Int32Array;
    faceVertexB: Int32Array;
    faceVertexC: Int32Array;
    faceColorA: Int32Array | null;
    faceColorB: Int32Array | null;
    faceColorC: Int32Array | null;
    faceInfo: Int32Array | null;
    facePriority: Int32Array | null;
    faceAlpha: Int32Array | null;
    faceColor: Int32Array | null;
    priorityVal: number;
    texturedFaceCount: number;
    texturedVertexA: Int32Array;
    texturedVertexB: Int32Array;
    texturedVertexC: Int32Array;
    minX?: number;
    maxX?: number;
    minZ?: number;
    maxZ?: number;
    radius?: number;
    minY?: number;
    maxY?: number;
    maxDepth?: number;
    minDepth?: number;
    vertexLabel?: Int32Array | null;
    faceLabel?: Int32Array | null;
    labelVertices?: (Int32Array | null)[] | null;
    labelFaces?: (Int32Array | null)[] | null;
    vertexNormal?: (VertexNormal | null)[] | null;
    vertexNormalOriginal?: (VertexNormal | null)[] | null;
};

export default class Model extends DoublyLinkable {
    static modelMeta: (Metadata | null)[] | null = null;

    static head: Packet | null = null;
    static face1: Packet | null = null;
    static face2: Packet | null = null;
    static face3: Packet | null = null;
    static face4: Packet | null = null;
    static face5: Packet | null = null;
    static point1: Packet | null = null;
    static point2: Packet | null = null;
    static point3: Packet | null = null;
    static point4: Packet | null = null;
    static point5: Packet | null = null;
    static vertex1: Packet | null = null;
    static vertex2: Packet | null = null;
    static axis: Packet | null = null;

    static faceClippedX: boolean[] | null = new TypedArray1d(4096, false);
    static faceNearClipped: boolean[] | null = new TypedArray1d(4096, false);

    static vertexScreenX: Int32Array | null = new Int32Array(4096);
    static vertexScreenY: Int32Array | null = new Int32Array(4096);
    static vertexScreenZ: Int32Array | null = new Int32Array(4096);
    static vertexViewSpaceX: Int32Array | null = new Int32Array(4096);
    static vertexViewSpaceY: Int32Array | null = new Int32Array(4096);
    static vertexViewSpaceZ: Int32Array | null = new Int32Array(4096);

    static tmpDepthFaceCount: Int32Array | null = new Int32Array(1500);
    static tmpDepthFaces: Int32Array[] | null = new Int32Array2d(1500, 512);
    static tmpPriorityFaceCount: Int32Array | null = new Int32Array(12);
    static tmpPriorityFaces: Int32Array[] | null = new Int32Array2d(12, 2000);
    static tmpPriority10FaceDepth: Int32Array | null = new Int32Array(2000);
    static tmpPriority11FaceDepth: Int32Array | null = new Int32Array(2000);
    static tmpPriorityDepthSum: Int32Array | null = new Int32Array(12);

    static clippedX: Int32Array = new Int32Array(10);
    static clippedY: Int32Array = new Int32Array(10);
    static clippedColor: Int32Array = new Int32Array(10);

    static baseX: number = 0;
    static baseY: number = 0;
    static baseZ: number = 0;

    static checkHover: boolean = false;
    static mouseX: number = 0;
    static mouseY: number = 0;
    static pickedCount: number = 0;
    static picked: Int32Array = new Int32Array(1000);
    static checkHoverFace: boolean = false;
    public wireFrame: boolean = false;
    public isHighlightedFace?: (faceIndex: number) => boolean;
    private originalFaceColorA?: Int32Array;
    private originalFaceColorB?: Int32Array;
    private originalFaceColorC?: Int32Array;

    static unpack(models: Jagfile): void {
        try {
            Model.head = new Packet(models.read('ob_head.dat'));
            Model.face1 = new Packet(models.read('ob_face1.dat'));
            Model.face2 = new Packet(models.read('ob_face2.dat'));
            Model.face3 = new Packet(models.read('ob_face3.dat'));
            Model.face4 = new Packet(models.read('ob_face4.dat'));
            Model.face5 = new Packet(models.read('ob_face5.dat'));
            Model.point1 = new Packet(models.read('ob_point1.dat'));
            Model.point2 = new Packet(models.read('ob_point2.dat'));
            Model.point3 = new Packet(models.read('ob_point3.dat'));
            Model.point4 = new Packet(models.read('ob_point4.dat'));
            Model.point5 = new Packet(models.read('ob_point5.dat'));
            Model.vertex1 = new Packet(models.read('ob_vertex1.dat'));
            Model.vertex2 = new Packet(models.read('ob_vertex2.dat'));
            Model.axis = new Packet(models.read('ob_axis.dat'));

            Model.head.pos = 0;
            Model.point1.pos = 0;
            Model.point2.pos = 0;
            Model.point3.pos = 0;
            Model.point4.pos = 0;
            Model.vertex1.pos = 0;
            Model.vertex2.pos = 0;

            const count: number = Model.head.g2();
            Model.modelMeta = new TypedArray1d(count + 100, null);

            let vertexTextureDataOffset: number = 0;
            let labelDataOffset: number = 0;
            let triangleColorDataOffset: number = 0;
            let triangleInfoDataOffset: number = 0;
            let trianglePriorityDataOffset: number = 0;
            let triangleAlphaDataOffset: number = 0;
            let triangleSkinDataOffset: number = 0;

            for (let i: number = 0; i < count; i++) {
                const id: number = Model.head.g2();
                const meta: Metadata = new Metadata();

                meta.vertexCount = Model.head.g2();
                meta.faceCount = Model.head.g2();
                meta.texturedFaceCount = Model.head.g1();

                meta.vertexFlagsOffset = Model.point1.pos;
                meta.vertexXOffset = Model.point2.pos;
                meta.vertexYOffset = Model.point3.pos;
                meta.vertexZOffset = Model.point4.pos;
                meta.faceVerticesOffset = Model.vertex1.pos;
                meta.faceOrientationsOffset = Model.vertex2.pos;

                const hasInfo: number = Model.head.g1();
                const priority: number = Model.head.g1();
                const hasAlpha: number = Model.head.g1();
                const hasSkins: number = Model.head.g1();
                const hasLabels: number = Model.head.g1();

                for (let v: number = 0; v < meta.vertexCount; v++) {
                    const flags: number = Model.point1.g1();

                    if ((flags & 0x1) !== 0) {
                        Model.point2.gsmart();
                    }

                    if ((flags & 0x2) !== 0) {
                        Model.point3.gsmart();
                    }

                    if ((flags & 0x4) !== 0) {
                        Model.point4.gsmart();
                    }
                }

                for (let v: number = 0; v < meta.faceCount; v++) {
                    const type: number = Model.vertex2.g1();

                    if (type === 1) {
                        Model.vertex1.gsmart();
                        Model.vertex1.gsmart();
                    }

                    Model.vertex1.gsmart();
                }

                meta.faceColorsOffset = triangleColorDataOffset;
                triangleColorDataOffset += meta.faceCount * 2;

                if (hasInfo === 1) {
                    meta.faceInfosOffset = triangleInfoDataOffset;
                    triangleInfoDataOffset += meta.faceCount;
                }

                if (priority === 255) {
                    meta.facePrioritiesOffset = trianglePriorityDataOffset;
                    trianglePriorityDataOffset += meta.faceCount;
                } else {
                    meta.facePrioritiesOffset = -priority - 1;
                }

                if (hasAlpha === 1) {
                    meta.faceAlphasOffset = triangleAlphaDataOffset;
                    triangleAlphaDataOffset += meta.faceCount;
                }

                if (hasSkins === 1) {
                    meta.faceLabelsOffset = triangleSkinDataOffset;
                    triangleSkinDataOffset += meta.faceCount;
                }

                if (hasLabels === 1) {
                    meta.vertexLabelsOffset = labelDataOffset;
                    labelDataOffset += meta.vertexCount;
                }

                meta.faceTextureAxisOffset = vertexTextureDataOffset;
                vertexTextureDataOffset += meta.texturedFaceCount;

                Model.modelMeta[id] = meta;
            }
        } catch (err) {
            console.log('Error loading model index');
            console.error(err);
        }
    }

    static mulColorLightness(hsl: number, scalar: number, faceInfo: number): number {
        if ((faceInfo & 0x2) === 2) {
            if (scalar < 0) {
                scalar = 0;
            } else if (scalar > 127) {
                scalar = 127;
            }

            return 127 - scalar;
        }

        scalar = (scalar * (hsl & 0x7f)) >> 7;

        if (scalar < 2) {
            scalar = 2;
        } else if (scalar > 126) {
            scalar = 126;
        }

        return (hsl & 0xff80) + scalar;
    }

    static modelCopyFaces(src: Model, copyVertexY: boolean, copyFaces: boolean): Model {
        const vertexCount: number = src.vertexCount;
        const faceCount: number = src.faceCount;
        const texturedFaceCount: number = src.texturedFaceCount;

        let vertexY: Int32Array;
        if (copyVertexY) {
            vertexY = new Int32Array(vertexCount);
            for (let v: number = 0; v < vertexCount; v++) {
                vertexY[v] = src.vertexY[v];
            }
        } else {
            vertexY = src.vertexY;
        }

        let faceColorA: Int32Array | null;
        let faceColorB: Int32Array | null;
        let faceColorC: Int32Array | null;
        let faceInfo: Int32Array | null;
        let vertexNormal: (VertexNormal | null)[] | null = null;
        let vertexNormalOriginal: (VertexNormal | null)[] | null = null;
        if (copyFaces) {
            faceColorA = new Int32Array(faceCount);
            faceColorB = new Int32Array(faceCount);
            faceColorC = new Int32Array(faceCount);
            for (let f: number = 0; f < faceCount; f++) {
                if (src.faceColorA) {
                    faceColorA[f] = src.faceColorA[f];
                }
                if (src.faceColorB) {
                    faceColorB[f] = src.faceColorB[f];
                }
                if (src.faceColorC) {
                    faceColorC[f] = src.faceColorC[f];
                }
            }

            faceInfo = new Int32Array(faceCount);
            if (!src.faceInfo) {
                for (let f: number = 0; f < faceCount; f++) {
                    faceInfo[f] = 0;
                }
            } else {
                for (let f: number = 0; f < faceCount; f++) {
                    faceInfo[f] = src.faceInfo[f];
                }
            }

            vertexNormal = new TypedArray1d(vertexCount, null);
            for (let v: number = 0; v < vertexCount; v++) {
                const copy: VertexNormal = (vertexNormal[v] = new VertexNormal());
                if (src.vertexNormal) {
                    const original: VertexNormal | null = src.vertexNormal[v];
                    if (original) {
                        copy.x = original.x;
                        copy.y = original.y;
                        copy.z = original.z;
                        copy.w = original.w;
                    }
                }
            }

            vertexNormalOriginal = src.vertexNormalOriginal;
        } else {
            faceColorA = src.faceColorA;
            faceColorB = src.faceColorB;
            faceColorC = src.faceColorC;
            faceInfo = src.faceInfo;
        }
        return new Model({
            vertexCount: vertexCount,
            vertexX: src.vertexX,
            vertexY: vertexY,
            vertexZ: src.vertexZ,
            faceCount: faceCount,
            faceVertexA: src.faceVertexA,
            faceVertexB: src.faceVertexB,
            faceVertexC: src.faceVertexC,
            faceColorA: faceColorA,
            faceColorB: faceColorB,
            faceColorC: faceColorC,
            faceInfo: faceInfo,
            facePriority: src.facePriority,
            faceAlpha: src.faceAlpha,
            faceColor: src.faceColor,
            priorityVal: src.priorityVal,
            texturedFaceCount: texturedFaceCount,
            texturedVertexA: src.texturedVertexA,
            texturedVertexB: src.texturedVertexB,
            texturedVertexC: src.texturedVertexC,
            minX: src.minX,
            maxX: src.maxX,
            minZ: src.minZ,
            maxZ: src.maxZ,
            radius: src.radius,
            minY: src.minY,
            maxY: src.maxY,
            maxDepth: src.maxDepth,
            minDepth: src.minDepth,
            vertexNormal: vertexNormal,
            vertexNormalOriginal: vertexNormalOriginal
        });
    }

    static modelShareColored(src: Model, shareColors: boolean, shareAlpha: boolean, shareVertices: boolean): Model {
        const vertexCount: number = src.vertexCount;
        const faceCount: number = src.faceCount;
        const texturedFaceCount: number = src.texturedFaceCount;

        let vertexX: Int32Array;
        let vertexY: Int32Array;
        let vertexZ: Int32Array;

        if (shareVertices) {
            vertexX = src.vertexX;
            vertexY = src.vertexY;
            vertexZ = src.vertexZ;
        } else {
            vertexX = new Int32Array(vertexCount);
            vertexY = new Int32Array(vertexCount);
            vertexZ = new Int32Array(vertexCount);

            for (let v: number = 0; v < vertexCount; v++) {
                vertexX[v] = src.vertexX[v];
                vertexY[v] = src.vertexY[v];
                vertexZ[v] = src.vertexZ[v];
            }
        }

        let faceColor: Int32Array | null;
        if (shareColors) {
            faceColor = src.faceColor;
        } else {
            faceColor = new Int32Array(faceCount);
            for (let f: number = 0; f < faceCount; f++) {
                if (src.faceColor) {
                    faceColor[f] = src.faceColor[f];
                }
            }
        }

        let faceAlpha: Int32Array | null;
        if (shareAlpha) {
            faceAlpha = src.faceAlpha;
        } else {
            faceAlpha = new Int32Array(faceCount);
            if (!src.faceAlpha) {
                for (let f: number = 0; f < faceCount; f++) {
                    faceAlpha[f] = 0;
                }
            } else {
                for (let f: number = 0; f < faceCount; f++) {
                    faceAlpha[f] = src.faceAlpha[f];
                }
            }
        }
        return new Model({
            vertexCount: vertexCount,
            vertexX: vertexX,
            vertexY: vertexY,
            vertexZ: vertexZ,
            faceCount: faceCount,
            faceVertexA: src.faceVertexA,
            faceVertexB: src.faceVertexB,
            faceVertexC: src.faceVertexC,
            faceColorA: null,
            faceColorB: null,
            faceColorC: null,
            faceInfo: src.faceInfo,
            facePriority: src.facePriority,
            faceAlpha: faceAlpha,
            faceColor: faceColor,
            priorityVal: src.priorityVal,
            texturedFaceCount: texturedFaceCount,
            texturedVertexA: src.texturedVertexA,
            texturedVertexB: src.texturedVertexB,
            texturedVertexC: src.texturedVertexC,
            vertexLabel: src.vertexLabel,
            faceLabel: src.faceLabel
        });
    }

    static modelShareAlpha(src: Model, shareAlpha: boolean): Model {
        const vertexCount: number = src.vertexCount;
        const faceCount: number = src.faceCount;
        const texturedFaceCount: number = src.texturedFaceCount;

        const vertexX: Int32Array = new Int32Array(vertexCount);
        const vertexY: Int32Array = new Int32Array(vertexCount);
        const vertexZ: Int32Array = new Int32Array(vertexCount);

        for (let v: number = 0; v < vertexCount; v++) {
            vertexX[v] = src.vertexX[v];
            vertexY[v] = src.vertexY[v];
            vertexZ[v] = src.vertexZ[v];
        }

        let faceAlpha: Int32Array | null;
        if (shareAlpha) {
            faceAlpha = src.faceAlpha;
        } else {
            faceAlpha = new Int32Array(faceCount);
            if (!src.faceAlpha) {
                for (let f: number = 0; f < faceCount; f++) {
                    faceAlpha[f] = 0;
                }
            } else {
                for (let f: number = 0; f < faceCount; f++) {
                    faceAlpha[f] = src.faceAlpha[f];
                }
            }
        }
        return new Model({
            vertexCount: vertexCount,
            vertexX: vertexX,
            vertexY: vertexY,
            vertexZ: vertexZ,
            faceCount: faceCount,
            faceVertexA: src.faceVertexA,
            faceVertexB: src.faceVertexB,
            faceVertexC: src.faceVertexC,
            faceColorA: src.faceColorA,
            faceColorB: src.faceColorB,
            faceColorC: src.faceColorC,
            faceInfo: src.faceInfo,
            facePriority: src.facePriority,
            faceAlpha: faceAlpha,
            faceColor: src.faceColor,
            priorityVal: src.priorityVal,
            texturedFaceCount: texturedFaceCount,
            texturedVertexA: src.texturedVertexA,
            texturedVertexB: src.texturedVertexB,
            texturedVertexC: src.texturedVertexC,
            labelVertices: src.labelVertices,
            labelFaces: src.labelFaces
        });
    }

    static modelFromModelsBounds(models: Model[], count: number): Model {
        let copyInfo: boolean = false;
        let copyPriority: boolean = false;
        let copyAlpha: boolean = false;
        let copyColor: boolean = false;

        let vertexCount: number = 0;
        let faceCount: number = 0;
        let texturedFaceCount: number = 0;
        let priority: number = -1;

        for (let i: number = 0; i < count; i++) {
            const model: Model = models[i];
            if (model) {
                vertexCount += model.vertexCount;
                faceCount += model.faceCount;
                texturedFaceCount += model.texturedFaceCount;

                copyInfo ||= model.faceInfo !== null;

                if (!model.facePriority) {
                    if (priority === -1) {
                        priority = model.priorityVal;
                    }
                    if (priority !== model.priorityVal) {
                        copyPriority = true;
                    }
                } else {
                    copyPriority = true;
                }

                copyAlpha ||= model.faceAlpha !== null;
                copyColor ||= model.faceColor !== null;
            }
        }

        const vertexX: Int32Array = new Int32Array(vertexCount);
        const vertexY: Int32Array = new Int32Array(vertexCount);
        const vertexZ: Int32Array = new Int32Array(vertexCount);

        const faceVertexA: Int32Array = new Int32Array(faceCount);
        const faceVertexB: Int32Array = new Int32Array(faceCount);
        const faceVertexC: Int32Array = new Int32Array(faceCount);

        const faceColorA: Int32Array = new Int32Array(faceCount);
        const faceColorB: Int32Array = new Int32Array(faceCount);
        const faceColorC: Int32Array = new Int32Array(faceCount);

        const texturedVertexA: Int32Array = new Int32Array(texturedFaceCount);
        const texturedVertexB: Int32Array = new Int32Array(texturedFaceCount);
        const texturedVertexC: Int32Array = new Int32Array(texturedFaceCount);

        let faceInfo: Int32Array | null = null;
        if (copyInfo) {
            faceInfo = new Int32Array(faceCount);
        }

        let facePriority: Int32Array | null = null;
        if (copyPriority) {
            facePriority = new Int32Array(faceCount);
        }

        let faceAlpha: Int32Array | null = null;
        if (copyAlpha) {
            faceAlpha = new Int32Array(faceCount);
        }

        let faceColor: Int32Array | null = null;
        if (copyColor) {
            faceColor = new Int32Array(faceCount);
        }

        vertexCount = 0;
        faceCount = 0;
        texturedFaceCount = 0;

        for (let i: number = 0; i < count; i++) {
            const model: Model = models[i];
            if (model) {
                const vertexCount2: number = vertexCount;

                for (let v: number = 0; v < model.vertexCount; v++) {
                    vertexX[vertexCount] = model.vertexX[v];
                    vertexY[vertexCount] = model.vertexY[v];
                    vertexZ[vertexCount] = model.vertexZ[v];
                    vertexCount++;
                }

                for (let f: number = 0; f < model.faceCount; f++) {
                    faceVertexA[faceCount] = model.faceVertexA[f] + vertexCount2;
                    faceVertexB[faceCount] = model.faceVertexB[f] + vertexCount2;
                    faceVertexC[faceCount] = model.faceVertexC[f] + vertexCount2;
                    if (model.faceColorA) {
                        faceColorA[faceCount] = model.faceColorA[f];
                    }
                    if (model.faceColorB) {
                        faceColorB[faceCount] = model.faceColorB[f];
                    }
                    if (model.faceColorC) {
                        faceColorC[faceCount] = model.faceColorC[f];
                    }

                    if (copyInfo) {
                        if (!model.faceInfo) {
                            if (faceInfo) {
                                faceInfo[faceCount] = 0;
                            }
                        } else {
                            if (faceInfo) {
                                faceInfo[faceCount] = model.faceInfo[f];
                            }
                        }
                    }

                    if (copyPriority) {
                        if (!model.facePriority) {
                            if (facePriority) {
                                facePriority[faceCount] = model.priorityVal;
                            }
                        } else {
                            if (facePriority) {
                                facePriority[faceCount] = model.facePriority[f];
                            }
                        }
                    }

                    if (copyAlpha) {
                        if (!model.faceAlpha) {
                            if (faceAlpha) {
                                faceAlpha[faceCount] = 0;
                            }
                        } else {
                            if (faceAlpha) {
                                faceAlpha[faceCount] = model.faceAlpha[f];
                            }
                        }
                    }

                    if (copyColor && model.faceColor) {
                        if (faceColor) {
                            faceColor[faceCount] = model.faceColor[f];
                        }
                    }

                    faceCount++;
                }

                for (let f: number = 0; f < model.texturedFaceCount; f++) {
                    texturedVertexA[texturedFaceCount] = model.texturedVertexA[f] + vertexCount2;
                    texturedVertexB[texturedFaceCount] = model.texturedVertexB[f] + vertexCount2;
                    texturedVertexC[texturedFaceCount] = model.texturedVertexC[f] + vertexCount2;
                    texturedFaceCount++;
                }
            }
        }
        const model: Model = new Model({
            vertexCount: vertexCount,
            vertexX: vertexX,
            vertexY: vertexY,
            vertexZ: vertexZ,
            faceCount: faceCount,
            faceVertexA: faceVertexA,
            faceVertexB: faceVertexB,
            faceVertexC: faceVertexC,
            faceColorA: faceColorA,
            faceColorB: faceColorB,
            faceColorC: faceColorC,
            faceInfo: faceInfo,
            facePriority: facePriority,
            faceAlpha: faceAlpha,
            faceColor: faceColor,
            priorityVal: priority,
            texturedFaceCount: texturedFaceCount,
            texturedVertexA: texturedVertexA,
            texturedVertexB: texturedVertexB,
            texturedVertexC: texturedVertexC
        });
        model.calculateBoundsCylinder();
        return model;
    }

    static modelFromModels(models: (Model | null)[], count: number, modelNames?: string[]): Model {
        let copyInfo: boolean = false;
        let copyPriorities: boolean = false;
        let copyAlpha: boolean = false;
        let copyLabels: boolean = false;

        let vertexCount: number = 0;
        let faceCount: number = 0;
        let texturedFaceCount: number = 0;
        let priority: number = -1;

        for (let i: number = 0; i < count; i++) {
            const model: Model | null = models[i];
            if (model) {
                vertexCount += model.vertexCount;
                faceCount += model.faceCount;
                texturedFaceCount += model.texturedFaceCount;
                copyInfo ||= model.faceInfo !== null;

                if (!model.facePriority) {
                    if (priority === -1) {
                        priority = model.priorityVal;
                    }

                    if (priority !== model.priorityVal) {
                        copyPriorities = true;
                    }
                } else {
                    copyPriorities = true;
                }

                copyAlpha ||= model.faceAlpha !== null;
                copyLabels ||= model.faceLabel !== null;
            }
        }

        const vertexX: Int32Array = new Int32Array(vertexCount);
        const vertexY: Int32Array = new Int32Array(vertexCount);
        const vertexZ: Int32Array = new Int32Array(vertexCount);

        const vertexLabel: Int32Array = new Int32Array(vertexCount);

        const faceVertexA: Int32Array = new Int32Array(faceCount);
        const faceVertexB: Int32Array = new Int32Array(faceCount);
        const faceVertexC: Int32Array = new Int32Array(faceCount);

        const texturedVertexA: Int32Array = new Int32Array(texturedFaceCount);
        const texturedVertexB: Int32Array = new Int32Array(texturedFaceCount);
        const texturedVertexC: Int32Array = new Int32Array(texturedFaceCount);

        let faceInfo: Int32Array | null = null;
        if (copyInfo) {
            faceInfo = new Int32Array(faceCount);
        }

        let facePriority: Int32Array | null = null;
        if (copyPriorities) {
            facePriority = new Int32Array(faceCount);
        }

        let faceAlpha: Int32Array | null = null;
        if (copyAlpha) {
            faceAlpha = new Int32Array(faceCount);
        }

        let faceLabel: Int32Array | null = null;
        if (copyLabels) {
            faceLabel = new Int32Array(faceCount);
        }

        const faceColor: Int32Array = new Int32Array(faceCount);
        const parts: ModelPart[] = [];

        vertexCount = 0;
        faceCount = 0;
        texturedFaceCount = 0;

        const addVertex = (
            src: Model,
            vertexId: number,
            vertexX: Int32Array,
            vertexY: Int32Array,
            vertexZ: Int32Array,
            vertexLabel: Int32Array,
            vertexCount: number
        ): {
            vertex: number;
            vertexCount: number;
        } => {
            let identical: number = -1;

            const x: number = src.vertexX[vertexId];
            const y: number = src.vertexY[vertexId];
            const z: number = src.vertexZ[vertexId];

            for (let v: number = 0; v < vertexCount; v++) {
                if (x === vertexX[v] && y === vertexY[v] && z === vertexZ[v]) {
                    identical = v;
                    break;
                }
            }

            if (identical === -1) {
                vertexX[vertexCount] = x;
                vertexY[vertexCount] = y;
                vertexZ[vertexCount] = z;

                if (vertexLabel && src.vertexLabel) {
                    vertexLabel[vertexCount] = src.vertexLabel[vertexId];
                }

                identical = vertexCount++;
            }

            return { vertex: identical, vertexCount };
        };

        for (let i: number = 0; i < count; i++) {
            const model: Model | null = models[i];

            if (model) {
                const partStartVertex = vertexCount;
                const partStartFace = faceCount;
                const partStartTexturedFace = texturedFaceCount;
                const vertexMapping = new Map<number, number>();

                for (let face: number = 0; face < model.faceCount; face++) {
                    if (copyInfo) {
                        if (!model.faceInfo) {
                            if (faceInfo) {
                                faceInfo[faceCount] = 0;
                            }
                        } else {
                            if (faceInfo) {
                                faceInfo[faceCount] = model.faceInfo[face];
                            }
                        }
                    }

                    if (copyPriorities) {
                        if (!model.facePriority) {
                            if (facePriority) {
                                facePriority[faceCount] = model.priorityVal;
                            }
                        } else {
                            if (facePriority) {
                                facePriority[faceCount] = model.facePriority[face];
                            }
                        }
                    }

                    if (copyAlpha) {
                        if (!model.faceAlpha) {
                            if (faceAlpha) {
                                faceAlpha[faceCount] = 0;
                            }
                        } else {
                            if (faceAlpha) {
                                faceAlpha[faceCount] = model.faceAlpha[face];
                            }
                        }
                    }

                    if (copyLabels && model.faceLabel) {
                        if (faceLabel) {
                            faceLabel[faceCount] = model.faceLabel[face];
                        }
                    }

                    if (model.faceColor) {
                        faceColor[faceCount] = model.faceColor[face];
                    }

                    const a: { vertex: number; vertexCount: number } = addVertex(
                        model,
                        model.faceVertexA[face],
                        vertexX,
                        vertexY,
                        vertexZ,
                        vertexLabel,
                        vertexCount
                    );
                    if (!vertexMapping.has(model.faceVertexA[face])) {
                        vertexMapping.set(model.faceVertexA[face], a.vertex);
                    }
                    vertexCount = a.vertexCount;

                    const b: { vertex: number; vertexCount: number } = addVertex(
                        model,
                        model.faceVertexB[face],
                        vertexX,
                        vertexY,
                        vertexZ,
                        vertexLabel,
                        vertexCount
                    );
                    if (!vertexMapping.has(model.faceVertexB[face])) {
                        vertexMapping.set(model.faceVertexB[face], b.vertex);
                    }
                    vertexCount = b.vertexCount;

                    const c: { vertex: number; vertexCount: number } = addVertex(
                        model,
                        model.faceVertexC[face],
                        vertexX,
                        vertexY,
                        vertexZ,
                        vertexLabel,
                        vertexCount
                    );
                    if (!vertexMapping.has(model.faceVertexC[face])) {
                        vertexMapping.set(model.faceVertexC[face], c.vertex);
                    }
                    vertexCount = c.vertexCount;

                    faceVertexA[faceCount] = a.vertex;
                    faceVertexB[faceCount] = b.vertex;
                    faceVertexC[faceCount] = c.vertex;
                    faceCount++;
                }

                for (let f: number = 0; f < model.texturedFaceCount; f++) {
                    const a: { vertex: number; vertexCount: number } = addVertex(
                        model,
                        model.texturedVertexA[f],
                        vertexX,
                        vertexY,
                        vertexZ,
                        vertexLabel,
                        vertexCount
                    );
                    if (!vertexMapping.has(model.texturedVertexA[f])) {
                        vertexMapping.set(model.texturedVertexA[f], a.vertex);
                    }
                    vertexCount = a.vertexCount;

                    const b: { vertex: number; vertexCount: number } = addVertex(
                        model,
                        model.texturedVertexB[f],
                        vertexX,
                        vertexY,
                        vertexZ,
                        vertexLabel,
                        vertexCount
                    );
                    if (!vertexMapping.has(model.texturedVertexB[f])) {
                        vertexMapping.set(model.texturedVertexB[f], b.vertex);
                    }
                    vertexCount = b.vertexCount;

                    const c: { vertex: number; vertexCount: number } = addVertex(
                        model,
                        model.texturedVertexC[f],
                        vertexX,
                        vertexY,
                        vertexZ,
                        vertexLabel,
                        vertexCount
                    );
                    if (!vertexMapping.has(model.texturedVertexC[f])) {
                        vertexMapping.set(model.texturedVertexC[f], c.vertex);
                    }
                    vertexCount = c.vertexCount;

                    texturedVertexA[texturedFaceCount] = a.vertex;
                    texturedVertexB[texturedFaceCount] = b.vertex;
                    texturedVertexC[texturedFaceCount] = c.vertex;
                    texturedFaceCount++;
                }

                const originalModelName =
                    modelNames && modelNames[i] ? modelNames[i] : `part_${i}`;
                parts.push({
                    partIndex: i,
                    originalModel: model,
                    originalModelName: originalModelName,
                    vertexOffset: partStartVertex,
                    vertexCount: vertexCount - partStartVertex,
                    faceOffset: partStartFace,
                    faceCount: faceCount - partStartFace,
                    texturedFaceOffset: partStartTexturedFace,
                    texturedFaceCount: texturedFaceCount - partStartTexturedFace,
                    vertexMapping: vertexMapping,
                });
            }
        }

        const combinedModel = new Model({
            vertexCount: vertexCount,
            vertexX: vertexX,
            vertexY: vertexY,
            vertexZ: vertexZ,
            faceCount: faceCount,
            faceVertexA: faceVertexA,
            faceVertexB: faceVertexB,
            faceVertexC: faceVertexC,
            faceColorA: null,
            faceColorB: null,
            faceColorC: null,
            faceInfo: faceInfo,
            facePriority: facePriority,
            faceAlpha: faceAlpha,
            faceColor: faceColor,
            priorityVal: priority,
            texturedFaceCount: texturedFaceCount,
            texturedVertexA: texturedVertexA,
            texturedVertexB: texturedVertexB,
            texturedVertexC: texturedVertexC,
            vertexLabel: vertexLabel,
            faceLabel: faceLabel,
        });

        combinedModel.partMapping = {
            parts: parts,
            isNpcModel: false,
        };

        if (combinedModel.faceColor) {
            combinedModel.originalFaceColor = new Int32Array(combinedModel.faceColor);
        }

        return combinedModel;
    }

    static model(id: number): Model {
        if (!Model.modelMeta) {
            throw new Error();
        }

        const meta: Metadata | null = Model.modelMeta[id];
        if (!meta) {
            console.error(`Error model:${id} not found!`);
            throw new Error();
        }

        if (!Model.head || !Model.face1 || !Model.face2 || !Model.face3 || !Model.face4 || !Model.face5 || !Model.point1 || !Model.point2 || !Model.point3 || !Model.point4 || !Model.point5 || !Model.vertex1 || !Model.vertex2 || !Model.axis) {
            throw new Error();
        }

        const vertexCount: number = meta.vertexCount;
        const faceCount: number = meta.faceCount;
        const texturedFaceCount: number = meta.texturedFaceCount;

        const vertexX: Int32Array = new Int32Array(vertexCount);
        const vertexY: Int32Array = new Int32Array(vertexCount);
        const vertexZ: Int32Array = new Int32Array(vertexCount);

        const faceVertexA: Int32Array = new Int32Array(faceCount);
        const faceVertexB: Int32Array = new Int32Array(faceCount);
        const faceVertexC: Int32Array = new Int32Array(faceCount);

        const texturedVertexA: Int32Array = new Int32Array(texturedFaceCount);
        const texturedVertexB: Int32Array = new Int32Array(texturedFaceCount);
        const texturedVertexC: Int32Array = new Int32Array(texturedFaceCount);

        let vertexLabel: Int32Array | null = null;
        if (meta.vertexLabelsOffset >= 0) {
            vertexLabel = new Int32Array(vertexCount);
        }

        let faceInfo: Int32Array | null = null;
        if (meta.faceInfosOffset >= 0) {
            faceInfo = new Int32Array(faceCount);
        }

        let facePriority: Int32Array | null = null;
        let priority: number = 0;
        if (meta.facePrioritiesOffset >= 0) {
            facePriority = new Int32Array(faceCount);
        } else {
            priority = -meta.facePrioritiesOffset - 1;
        }

        let faceAlpha: Int32Array | null = null;
        if (meta.faceAlphasOffset >= 0) {
            faceAlpha = new Int32Array(faceCount);
        }

        let faceLabel: Int32Array | null = null;
        if (meta.faceLabelsOffset >= 0) {
            faceLabel = new Int32Array(faceCount);
        }

        const faceColor: Int32Array = new Int32Array(faceCount);

        Model.point1.pos = meta.vertexFlagsOffset;
        Model.point2.pos = meta.vertexXOffset;
        Model.point3.pos = meta.vertexYOffset;
        Model.point4.pos = meta.vertexZOffset;
        Model.point5.pos = meta.vertexLabelsOffset;

        let dx: number = 0;
        let dy: number = 0;
        let dz: number = 0;
        let a: number;
        let b: number;
        let c: number;

        for (let v: number = 0; v < vertexCount; v++) {
            const flags: number = Model.point1.g1();

            a = 0;
            if ((flags & 0x1) !== 0) {
                a = Model.point2.gsmart();
            }

            b = 0;
            if ((flags & 0x2) !== 0) {
                b = Model.point3.gsmart();
            }

            c = 0;
            if ((flags & 0x4) !== 0) {
                c = Model.point4.gsmart();
            }

            vertexX[v] = dx + a;
            vertexY[v] = dy + b;
            vertexZ[v] = dz + c;
            dx = vertexX[v];
            dy = vertexY[v];
            dz = vertexZ[v];

            if (vertexLabel) {
                vertexLabel[v] = Model.point5.g1();
            }
        }

        Model.face1.pos = meta.faceColorsOffset;
        Model.face2.pos = meta.faceInfosOffset;
        Model.face3.pos = meta.facePrioritiesOffset;
        Model.face4.pos = meta.faceAlphasOffset;
        Model.face5.pos = meta.faceLabelsOffset;

        for (let f: number = 0; f < faceCount; f++) {
            faceColor[f] = Model.face1.g2();

            if (faceInfo) {
                faceInfo[f] = Model.face2.g1();
            }

            if (facePriority) {
                facePriority[f] = Model.face3.g1();
            }

            if (faceAlpha) {
                faceAlpha[f] = Model.face4.g1();
            }

            if (faceLabel) {
                faceLabel[f] = Model.face5.g1();
            }
        }

        Model.vertex1.pos = meta.faceVerticesOffset;
        Model.vertex2.pos = meta.faceOrientationsOffset;

        a = 0;
        b = 0;
        c = 0;
        let last: number = 0;

        for (let f: number = 0; f < faceCount; f++) {
            const orientation: number = Model.vertex2.g1();

            if (orientation === 1) {
                a = Model.vertex1.gsmart() + last;
                last = a;
                b = Model.vertex1.gsmart() + last;
                last = b;
                c = Model.vertex1.gsmart() + last;
                last = c;
            } else if (orientation === 2) {
                b = c;
                c = Model.vertex1.gsmart() + last;
                last = c;
            } else if (orientation === 3) {
                a = c;
                c = Model.vertex1.gsmart() + last;
                last = c;
            } else if (orientation === 4) {
                const tmp: number = a;
                a = b;
                b = tmp;
                c = Model.vertex1.gsmart() + last;
                last = c;
            }

            faceVertexA[f] = a;
            faceVertexB[f] = b;
            faceVertexC[f] = c;
        }

        Model.axis.pos = meta.faceTextureAxisOffset * 6;
        for (let f: number = 0; f < texturedFaceCount; f++) {
            texturedVertexA[f] = Model.axis.g2();
            texturedVertexB[f] = Model.axis.g2();
            texturedVertexC[f] = Model.axis.g2();
        }
        return new Model({
            vertexCount: vertexCount,
            vertexX: vertexX,
            vertexY: vertexY,
            vertexZ: vertexZ,
            faceCount: faceCount,
            faceVertexA: faceVertexA,
            faceVertexB: faceVertexB,
            faceVertexC: faceVertexC,
            faceColorA: null,
            faceColorB: null,
            faceColorC: null,
            faceInfo: faceInfo,
            facePriority: facePriority,
            faceAlpha: faceAlpha,
            faceColor: faceColor,
            priorityVal: priority,
            texturedFaceCount: texturedFaceCount,
            texturedVertexA: texturedVertexA,
            texturedVertexB: texturedVertexB,
            texturedVertexC: texturedVertexC,
            vertexLabel: vertexLabel,
            faceLabel: faceLabel
        });
    }

    static modelFromNpcModels(
        models: (Model | null)[],
        count: number,
        npcId: string,
        modelNames: string[]
    ): Model {
        const combinedModel = Model.modelFromModels(models, count, modelNames);

        if (combinedModel.partMapping) {
            combinedModel.partMapping.isNpcModel = true;
            combinedModel.partMapping.npcId = npcId;
        }

        return combinedModel;
    }

    // ----
    vertexCount: number;
    vertexX: Int32Array;
    vertexY: Int32Array;
    vertexZ: Int32Array;

    faceCount: number;
    faceVertexA: Int32Array;
    faceVertexB: Int32Array;
    faceVertexC: Int32Array;
    faceColorA: Int32Array | null;
    faceColorB: Int32Array | null;
    faceColorC: Int32Array | null;
    faceInfo: Int32Array | null;
    facePriority: Int32Array | null;
    faceAlpha: Int32Array | null;
    faceColor: Int32Array | null;

    priorityVal: number;

    texturedFaceCount: number;
    texturedVertexA: Int32Array;
    texturedVertexB: Int32Array;
    texturedVertexC: Int32Array;

    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    radius: number;
    minY: number;
    maxY: number;
    maxDepth: number;
    minDepth: number;

    vertexLabel: Int32Array | null;
    faceLabel: Int32Array | null;
    labelVertices: (Int32Array | null)[] | null;
    labelFaces: (Int32Array | null)[] | null;

    vertexNormal: (VertexNormal | null)[] | null;
    vertexNormalOriginal: (VertexNormal | null)[] | null;

    // runtime
    objRaise: number = 0;
    pickable: boolean = false;
    pickedFace: number = -1;
    pickedFaceDepth: number = -1;

    private originalVertexX: Int32Array;
    private originalVertexY: Int32Array;
    private originalVertexZ: Int32Array;

    private originalFaceColor: Int32Array | null = null;

    faceTextures: Int32Array;

    public hadOriginalFaceLabels: boolean = false;
    public hadOriginalVertexLabels: boolean = false;
    private hadOriginalFacePriorities: boolean = false;
    private hadOriginalFaceAlphas: boolean = false;
    private hadOriginalFaceInfos: boolean = false;

    partMapping: ModelPartMapping | null = null;

    private currentScaleX: number = 128;
    private currentScaleY: number = 128;
    private currentScaleZ: number = 128;
    private baseScaleX: number = 128;
    private baseScaleY: number = 128;
    private baseScaleZ: number = 128;
    faceLabelForExport: Int32Array | undefined;
    vertexLabelForExport: Int32Array | undefined;

    constructor(type: ModelType) {
        super();

        this.vertexCount = type.vertexCount;
        this.vertexX = type.vertexX;
        this.vertexY = type.vertexY;
        this.vertexZ = type.vertexZ;
        this.faceCount = type.faceCount;
        this.faceVertexA = type.faceVertexA;
        this.faceVertexB = type.faceVertexB;
        this.faceVertexC = type.faceVertexC;
        this.faceColorA = type.faceColorA;
        this.faceColorB = type.faceColorB;
        this.faceColorC = type.faceColorC;
        this.faceInfo = type.faceInfo;
        this.facePriority = type.facePriority;
        this.faceAlpha = type.faceAlpha;
        this.faceColor = type.faceColor;
        this.priorityVal = type.priorityVal;
        this.texturedFaceCount = type.texturedFaceCount;
        this.texturedVertexA = type.texturedVertexA;
        this.texturedVertexB = type.texturedVertexB;
        this.texturedVertexC = type.texturedVertexC;
        this.minX = type.minX ?? 0;
        this.maxX = type.maxX ?? 0;
        this.minZ = type.minZ ?? 0;
        this.maxZ = type.maxZ ?? 0;
        this.radius = type.radius ?? 0;
        this.minY = type.minY ?? 0;
        this.maxY = type.maxY ?? 0;
        this.maxDepth = type.maxDepth ?? 0;
        this.minDepth = type.minDepth ?? 0;
        this.vertexLabel = type.vertexLabel ?? null;
        this.faceLabel = type.faceLabel ?? null;
        this.labelVertices = type.labelVertices ?? null;
        this.labelFaces = type.labelFaces ?? null;
        this.vertexNormal = type.vertexNormal ?? null;
        this.vertexNormalOriginal = type.vertexNormalOriginal ?? null;
        this.originalVertexX = new Int32Array(this.vertexX);
        this.originalVertexY = new Int32Array(this.vertexY);
        this.originalVertexZ = new Int32Array(this.vertexZ);
        this.faceTextures = new Int32Array(this.faceCount);
        this.faceTextures.fill(-1);
        this.initializeFaceTextures();
        this.priorityVal = type.priorityVal;
        this.currentScaleX = 128;
        this.currentScaleY = 128;
        this.currentScaleZ = 128;
        this.baseScaleX = 128;
        this.baseScaleY = 128;
        this.baseScaleZ = 128;
        this.wireFrame = false;
    }

    private initializeFaceTextures(): void {
        if (!this.faceInfo || !this.faceColor) {
            return;
        }

        for (let f = 0; f < this.faceCount; f++) {
            const type = this.faceInfo[f] & 0x3;
            if (type === 2 || type === 3) {
                this.faceTextures[f] = this.faceColor[f];
            }
        }
    }

    calculateBoundsCylinder(): void {
        this.maxY = 0;
        this.radius = 0;
        this.minY = 0;

        for (let i: number = 0; i < this.vertexCount; i++) {
            const x: number = this.vertexX[i];
            const y: number = this.vertexY[i];
            const z: number = this.vertexZ[i];

            if (-y > this.maxY) {
                this.maxY = -y;
            }

            if (y > this.minY) {
                this.minY = y;
            }

            const radiusSqr: number = x * x + z * z;
            if (radiusSqr > this.radius) {
                this.radius = radiusSqr;
            }
        }

        this.radius = (Math.sqrt(this.radius) + 0.99) | 0;
        this.minDepth = (Math.sqrt(this.radius * this.radius + this.maxY * this.maxY) + 0.99) | 0;
        this.maxDepth = this.minDepth + ((Math.sqrt(this.radius * this.radius + this.minY * this.minY) + 0.99) | 0);
    }

    calculateBoundsY(): void {
        this.maxY = 0;
        this.minY = 0;

        for (let v: number = 0; v < this.vertexCount; v++) {
            const y: number = this.vertexY[v];

            if (-y > this.maxY) {
                this.maxY = -y;
            }

            if (y > this.minY) {
                this.minY = y;
            }
        }

        this.minDepth = (Math.sqrt(this.radius * this.radius + this.maxY * this.maxY) + 0.99) | 0;
        this.maxDepth = this.minDepth + ((Math.sqrt(this.radius * this.radius + this.minY * this.minY) + 0.99) | 0);
    }

    createLabelReferences(): void {
        if (this.vertexLabel) {
            const labelVertexCount: Int32Array = new Int32Array(256);
            let count: number = 0;
            for (let v: number = 0; v < this.vertexCount; v++) {
                const label: number = this.vertexLabel[v];
                // const countDebug: number = labelVertexCount[label]++; // dead var
                labelVertexCount[label]++;
                if (label > count) {
                    count = label;
                }
            }
            this.labelVertices = new TypedArray1d(count + 1, null);
            for (let label: number = 0; label <= count; label++) {
                this.labelVertices[label] = new Int32Array(labelVertexCount[label]);
                labelVertexCount[label] = 0;
            }
            let v: number = 0;
            while (v < this.vertexCount) {
                const label: number = this.vertexLabel[v];
                const verts: Int32Array | null = this.labelVertices[label];
                if (!verts) {
                    continue;
                }
                verts[labelVertexCount[label]++] = v++;
            }
            this.vertexLabel = null;
        }

        if (this.faceLabel) {
            const labelFaceCount: Int32Array = new Int32Array(256);
            let count: number = 0;
            for (let f: number = 0; f < this.faceCount; f++) {
                const label: number = this.faceLabel[f];
                // const countDebug: number = labelFaceCount[label]++; // dead var
                labelFaceCount[label]++;
                if (label > count) {
                    count = label;
                }
            }
            this.labelFaces = new TypedArray1d(count + 1, null);
            for (let label: number = 0; label <= count; label++) {
                this.labelFaces[label] = new Int32Array(labelFaceCount[label]);
                labelFaceCount[label] = 0;
            }
            let face: number = 0;
            while (face < this.faceCount) {
                const label: number = this.faceLabel[face];
                const faces: Int32Array | null = this.labelFaces[label];
                if (!faces) {
                    continue;
                }
                faces[labelFaceCount[label]++] = face++;
            }
            this.faceLabel = null;
        }
    }

    public applyFaceHighlighting(): void {
        if (!this.isHighlightedFace) return;
        
        if (!this.originalFaceColorA && this.faceColorA) {
            this.originalFaceColorA = new Int32Array(this.faceColorA);
        }
        if (!this.originalFaceColorB && this.faceColorB) {
            this.originalFaceColorB = new Int32Array(this.faceColorB);
        }
        if (!this.originalFaceColorC && this.faceColorC) {
            this.originalFaceColorC = new Int32Array(this.faceColorC);
        }

        for (let f = 0; f < this.faceCount; f++) {
            if (this.isHighlightedFace(f)) {
                const highlightColorIndex: number = 573;
                if (this.faceColorA) this.faceColorA[f] = highlightColorIndex;
                if (this.faceColorB) this.faceColorB[f] = highlightColorIndex;
                if (this.faceColorC) this.faceColorC[f] = highlightColorIndex;
            }
        }
    }

    public restoreFaceColors(): void {
        if (this.originalFaceColorA && this.faceColorA) {
            this.faceColorA.set(this.originalFaceColorA);
        }
        if (this.originalFaceColorB && this.faceColorB) {
            this.faceColorB.set(this.originalFaceColorB);
        }
        if (this.originalFaceColorC && this.faceColorC) {
            this.faceColorC.set(this.originalFaceColorC);
        }
    }

    applyTransforms(primaryId: number, secondaryId: number, mask: Int32Array | null): void {
        if (primaryId === -1) {
            return;
        }

        if (!mask || secondaryId === -1) {
            this.applyTransform(primaryId);
        } else {
            const primary: AnimFrame = AnimFrame.instances[primaryId];
            const secondary: AnimFrame = AnimFrame.instances[secondaryId];
            const skeleton: AnimBase | null = primary.base;

            Model.baseX = 0;
            Model.baseY = 0;
            Model.baseZ = 0;

            let counter: number = 0;
            let maskBase: number = mask[counter++];

            for (let i: number = 0; i < primary.frameLength; i++) {
                if (!primary.bases) {
                    continue;
                }
                const base: number = primary.bases[i];
                while (base > maskBase) {
                    maskBase = mask[counter++];
                }

                if (skeleton && skeleton.animTypes && primary.x && primary.y && primary.z && skeleton.animLabels && (base !== maskBase || skeleton.animTypes[base] === 0)) {
                    this.applyTransform2(primary.x[i], primary.y[i], primary.z[i], skeleton.animLabels[base], skeleton.animTypes[base]);
                }
            }

            Model.baseX = 0;
            Model.baseY = 0;
            Model.baseZ = 0;

            counter = 0;
            maskBase = mask[counter++];

            for (let i: number = 0; i < secondary.frameLength; i++) {
                if (!secondary.bases) {
                    continue;
                }
                const base: number = secondary.bases[i];
                while (base > maskBase) {
                    maskBase = mask[counter++];
                }

                if (skeleton && skeleton.animTypes && secondary.x && secondary.y && secondary.z && skeleton.animLabels && (base === maskBase || skeleton.animTypes[base] === 0)) {
                    this.applyTransform2(secondary.x[i], secondary.y[i], secondary.z[i], skeleton.animLabels[base], skeleton.animTypes[base]);
                }
            }
        }
    }

    applyTransform(id: number): void {
        if (!this.labelVertices || id === -1 || !AnimFrame.instances[id]) {
            return;
        }

        const transform: AnimFrame = AnimFrame.instances[id];
        const skeleton: AnimBase | null = transform.base;

        Model.baseX = 0;
        Model.baseY = 0;
        Model.baseZ = 0;

        for (let i: number = 0; i < transform.frameLength; i++) {
            if (!transform.bases || !transform.x || !transform.y || !transform.z || !skeleton || !skeleton.animLabels || !skeleton.animTypes) {
                continue;
            }

            const base: number = transform.bases[i];
            this.applyTransform2(transform.x[i], transform.y[i], transform.z[i], skeleton.animLabels[base], skeleton.animTypes[base]);
        }
    }

    rotateY90(): void {
        for (let v: number = 0; v < this.vertexCount; v++) {
            const tmp: number = this.vertexX[v];
            this.vertexX[v] = this.vertexZ[v];
            this.vertexZ[v] = -tmp;
        }
    }

    rotateX(angle: number): void {
        const sin: number = Pix3D.sin[angle];
        const cos: number = Pix3D.cos[angle];

        for (let v: number = 0; v < this.vertexCount; v++) {
            const tmp: number = (this.vertexY[v] * cos - this.vertexZ[v] * sin) >> 16;
            this.vertexZ[v] = (this.vertexY[v] * sin + this.vertexZ[v] * cos) >> 16;
            this.vertexY[v] = tmp;
        }
    }

    translateModel(y: number, x: number, z: number): void {
        for (let v: number = 0; v < this.vertexCount; v++) {
            this.vertexX[v] += x;
            this.vertexY[v] += y;
            this.vertexZ[v] += z;
        }
    }

    recolor(src: number, dst: number): void {
        if (!this.faceColor) {
            return;
        }

        for (let f: number = 0; f < this.faceCount; f++) {
            if (this.faceColor[f] === src) {
                this.faceColor[f] = dst;
            }
        }
    }

    rotateY180(): void {
        for (let v: number = 0; v < this.vertexCount; v++) {
            this.vertexZ[v] = -this.vertexZ[v];
        }

        for (let f: number = 0; f < this.faceCount; f++) {
            const temp: number = this.faceVertexA[f];
            this.faceVertexA[f] = this.faceVertexC[f];
            this.faceVertexC[f] = temp;
        }
    }

    scale(x: number, y: number, z: number): void {
        for (let v: number = 0; v < this.vertexCount; v++) {
            this.vertexX[v] = ((this.vertexX[v] * x) / 128) | 0;
            this.vertexY[v] = ((this.vertexY[v] * y) / 128) | 0;
            this.vertexZ[v] = ((this.vertexZ[v] * z) / 128) | 0;
        }
    }

    calculateNormals(lightAmbient: number, lightAttenuation: number, lightSrcX: number, lightSrcY: number, lightSrcZ: number, applyLighting: boolean): void {
        const lightMagnitude: number = Math.sqrt(lightSrcX * lightSrcX + lightSrcY * lightSrcY + lightSrcZ * lightSrcZ) | 0;
        const attenuation: number = (lightAttenuation * lightMagnitude) >> 8;

        if (!this.faceColorA || !this.faceColorB || !this.faceColorC) {
            this.faceColorA = new Int32Array(this.faceCount);
            this.faceColorB = new Int32Array(this.faceCount);
            this.faceColorC = new Int32Array(this.faceCount);
        }

        if (!this.vertexNormal) {
            this.vertexNormal = new TypedArray1d(this.vertexCount, null);

            for (let v: number = 0; v < this.vertexCount; v++) {
                this.vertexNormal[v] = new VertexNormal();
            }
        }

        for (let f: number = 0; f < this.faceCount; f++) {
            const a: number = this.faceVertexA[f];
            const b: number = this.faceVertexB[f];
            const c: number = this.faceVertexC[f];

            const dxAB: number = this.vertexX[b] - this.vertexX[a];
            const dyAB: number = this.vertexY[b] - this.vertexY[a];
            const dzAB: number = this.vertexZ[b] - this.vertexZ[a];

            const dxAC: number = this.vertexX[c] - this.vertexX[a];
            const dyAC: number = this.vertexY[c] - this.vertexY[a];
            const dzAC: number = this.vertexZ[c] - this.vertexZ[a];

            let nx: number = dyAB * dzAC - dyAC * dzAB;
            let ny: number = dzAB * dxAC - dzAC * dxAB;
            let nz: number = dxAB * dyAC - dxAC * dyAB;

            while (nx > 8192 || ny > 8192 || nz > 8192 || nx < -8192 || ny < -8192 || nz < -8192) {
                nx >>= 1;
                ny >>= 1;
                nz >>= 1;
            }

            let length: number = Math.sqrt(nx * nx + ny * ny + nz * nz) | 0;
            if (length <= 0) {
                length = 1;
            }

            nx = ((nx * 256) / length) | 0;
            ny = ((ny * 256) / length) | 0;
            nz = ((nz * 256) / length) | 0;

            if (!this.faceInfo || (this.faceInfo[f] & 0x1) === 0) {
                let n: VertexNormal | null = this.vertexNormal[a];
                if (n) {
                    n.x += nx;
                    n.y += ny;
                    n.z += nz;
                    n.w++;
                }

                n = this.vertexNormal[b];
                if (n) {
                    n.x += nx;
                    n.y += ny;
                    n.z += nz;
                    n.w++;
                }

                n = this.vertexNormal[c];
                if (n) {
                    n.x += nx;
                    n.y += ny;
                    n.z += nz;
                    n.w++;
                }
            } else {
                const lightness: number = lightAmbient + (((lightSrcX * nx + lightSrcY * ny + lightSrcZ * nz) / (attenuation + ((attenuation / 2) | 0))) | 0);
                if (this.faceColor) {
                    this.faceColorA[f] = Model.mulColorLightness(this.faceColor[f], lightness, this.faceInfo[f]);
                }
            }
        }

        if (applyLighting) {
            this.applyLighting(lightAmbient, attenuation, lightSrcX, lightSrcY, lightSrcZ);
        } else {
            this.vertexNormalOriginal = new TypedArray1d(this.vertexCount, null);

            for (let v: number = 0; v < this.vertexCount; v++) {
                const normal: VertexNormal | null = this.vertexNormal[v];
                const copy: VertexNormal = new VertexNormal();

                if (normal) {
                    copy.x = normal.x;
                    copy.y = normal.y;
                    copy.z = normal.z;
                    copy.w = normal.w;
                }

                this.vertexNormalOriginal[v] = copy;
            }
        }

        if (applyLighting) {
            this.calculateBoundsCylinder();
        } else {
            this.calculateBoundsAABB();
        }
    }

    applyLighting(lightAmbient: number, lightAttenuation: number, lightSrcX: number, lightSrcY: number, lightSrcZ: number): void {
        for (let f: number = 0; f < this.faceCount; f++) {
            const a: number = this.faceVertexA[f];
            const b: number = this.faceVertexB[f];
            const c: number = this.faceVertexC[f];

            if (!this.faceInfo && this.faceColor && this.vertexNormal && this.faceColorA && this.faceColorB && this.faceColorC) {
                const color: number = this.faceColor[f];

                const va: VertexNormal | null = this.vertexNormal[a];
                if (va) {
                    this.faceColorA[f] = Model.mulColorLightness(color, lightAmbient + (((lightSrcX * va.x + lightSrcY * va.y + lightSrcZ * va.z) / (lightAttenuation * va.w)) | 0), 0);
                }

                const vb: VertexNormal | null = this.vertexNormal[b];
                if (vb) {
                    this.faceColorB[f] = Model.mulColorLightness(color, lightAmbient + (((lightSrcX * vb.x + lightSrcY * vb.y + lightSrcZ * vb.z) / (lightAttenuation * vb.w)) | 0), 0);
                }

                const vc: VertexNormal | null = this.vertexNormal[c];
                if (vc) {
                    this.faceColorC[f] = Model.mulColorLightness(color, lightAmbient + (((lightSrcX * vc.x + lightSrcY * vc.y + lightSrcZ * vc.z) / (lightAttenuation * vc.w)) | 0), 0);
                }
            } else if (this.faceInfo && (this.faceInfo[f] & 0x1) === 0 && this.faceColor && this.vertexNormal && this.faceColorA && this.faceColorB && this.faceColorC) {
                const color: number = this.faceColor[f];
                const info: number = this.faceInfo[f];

                const va: VertexNormal | null = this.vertexNormal[a];
                if (va) {
                    this.faceColorA[f] = Model.mulColorLightness(color, lightAmbient + (((lightSrcX * va.x + lightSrcY * va.y + lightSrcZ * va.z) / (lightAttenuation * va.w)) | 0), info);
                }

                const vb: VertexNormal | null = this.vertexNormal[b];
                if (vb) {
                    this.faceColorB[f] = Model.mulColorLightness(color, lightAmbient + (((lightSrcX * vb.x + lightSrcY * vb.y + lightSrcZ * vb.z) / (lightAttenuation * vb.w)) | 0), info);
                }

                const vc: VertexNormal | null = this.vertexNormal[c];
                if (vc) {
                    this.faceColorC[f] = Model.mulColorLightness(color, lightAmbient + (((lightSrcX * vc.x + lightSrcY * vc.y + lightSrcZ * vc.z) / (lightAttenuation * vc.w)) | 0), info);
                }
            }
        }

        this.vertexNormal = null;
        this.vertexNormalOriginal = null;
        this.vertexLabel = null;
        this.faceLabel = null;

        if (this.faceInfo) {
            for (let f: number = 0; f < this.faceCount; f++) {
                if ((this.faceInfo[f] & 0x2) === 2) {
                    return;
                }
            }
        }

        //this.faceColor = null;
    }

    // todo: better name, Java relies on overloads
    // this function is NOT near-clipped (helps with performance) so be careful how you use it!
    drawSimple(pitch: number, yaw: number, roll: number, eyePitch: number, eyeX: number, eyeY: number, eyeZ: number): void {
        const sinPitch: number = Pix3D.sin[pitch];
        const cosPitch: number = Pix3D.cos[pitch];

        const sinYaw: number = Pix3D.sin[yaw];
        const cosYaw: number = Pix3D.cos[yaw];

        const sinRoll: number = Pix3D.sin[roll];
        const cosRoll: number = Pix3D.cos[roll];

        const sinEyePitch: number = Pix3D.sin[eyePitch];
        const cosEyePitch: number = Pix3D.cos[eyePitch];

        const midZ: number = (eyeY * sinEyePitch + eyeZ * cosEyePitch) >> 16;

        for (let v: number = 0; v < this.vertexCount; v++) {
            let x: number = this.vertexX[v];
            let y: number = this.vertexY[v];
            let z: number = this.vertexZ[v];

            let tmp: number;
            if (roll !== 0) {
                tmp = (y * sinRoll + x * cosRoll) >> 16;
                y = (y * cosRoll - x * sinRoll) >> 16;
                x = tmp;
            }

            if (pitch !== 0) {
                tmp = (y * cosPitch - z * sinPitch) >> 16;
                z = (y * sinPitch + z * cosPitch) >> 16;
                y = tmp;
            }

            if (yaw !== 0) {
                tmp = (z * sinYaw + x * cosYaw) >> 16;
                z = (z * cosYaw - x * sinYaw) >> 16;
                x = tmp;
            }

            x += eyeX;
            y += eyeY;
            z += eyeZ;

            tmp = (y * cosEyePitch - z * sinEyePitch) >> 16;
            z = (y * sinEyePitch + z * cosEyePitch) >> 16;
            y = tmp;

            if (Model.vertexScreenX && Model.vertexScreenY && Model.vertexScreenZ) {
                Model.vertexScreenZ[v] = z - midZ;
                Model.vertexScreenX[v] = Pix3D.centerX + (((x << 9) / z) | 0);
                Model.vertexScreenY[v] = Pix3D.centerY + (((y << 9) / z) | 0);
            }

            if (this.texturedFaceCount > 0 && Model.vertexViewSpaceX && Model.vertexViewSpaceY && Model.vertexViewSpaceZ) {
                Model.vertexViewSpaceX[v] = x;
                Model.vertexViewSpaceY[v] = y;
                Model.vertexViewSpaceZ[v] = z;
            }
        }

        try {
            // try catch for example a model being drawn from 3d can crash like at baxtorian falls
            this.draw2(false, false, 0);
        } catch (err) {
            // console.error(err);
        }
    }

    // todo: better name, Java relies on overloads
    draw(yaw: number, sinEyePitch: number, cosEyePitch: number, sinEyeYaw: number, cosEyeYaw: number, relativeX: number, relativeY: number, relativeZ: number, typecode: number): void {
        const zPrime: number = (relativeZ * cosEyeYaw - relativeX * sinEyeYaw) >> 16;
        const midZ: number = (relativeY * sinEyePitch + zPrime * cosEyePitch) >> 16;
        const radiusCosEyePitch: number = (this.radius * cosEyePitch) >> 16;

        const maxZ: number = midZ + radiusCosEyePitch;
        if (maxZ <= 50 || midZ >= 3500) {
            return;
        }

        const midX: number = (relativeZ * sinEyeYaw + relativeX * cosEyeYaw) >> 16;
        let leftX: number = (midX - this.radius) << 9;
        if (((leftX / maxZ) | 0) >= Pix2D.centerX2d) {
            return;
        }

        let rightX: number = (midX + this.radius) << 9;
        if (((rightX / maxZ) | 0) <= -Pix2D.centerX2d) {
            return;
        }

        const midY: number = (relativeY * cosEyePitch - zPrime * sinEyePitch) >> 16;
        const radiusSinEyePitch: number = (this.radius * sinEyePitch) >> 16;

        let bottomY: number = (midY + radiusSinEyePitch) << 9;
        if (((bottomY / maxZ) | 0) <= -Pix2D.centerY2d) {
            return;
        }

        const yPrime: number = radiusSinEyePitch + ((this.maxY * cosEyePitch) >> 16);
        let topY: number = (midY - yPrime) << 9;
        if (((topY / maxZ) | 0) >= Pix2D.centerY2d) {
            return;
        }

        const radiusZ: number = radiusCosEyePitch + ((this.maxY * sinEyePitch) >> 16);

        let clipped: boolean = midZ - radiusZ <= 50;
        let picking: boolean = false;

        if (typecode > 0 && Model.checkHover) {
            let z: number = midZ - radiusCosEyePitch;
            if (z <= 50) {
                z = 50;
            }

            if (midX > 0) {
                leftX = (leftX / maxZ) | 0;
                rightX = (rightX / z) | 0;
            } else {
                rightX = (rightX / maxZ) | 0;
                leftX = (leftX / z) | 0;
            }

            if (midY > 0) {
                topY = (topY / maxZ) | 0;
                bottomY = (bottomY / z) | 0;
            } else {
                bottomY = (bottomY / maxZ) | 0;
                topY = (topY / z) | 0;
            }

            const mouseX: number = Model.mouseX - Pix3D.centerX;
            const mouseY: number = Model.mouseY - Pix3D.centerY;
            if (mouseX > leftX && mouseX < rightX && mouseY > topY && mouseY < bottomY) {
                if (this.pickable) {
                    Model.picked[Model.pickedCount++] = typecode;
                } else {
                    picking = true;
                }
            }
        }

        const centerX: number = Pix3D.centerX;
        const centerY: number = Pix3D.centerY;

        let sinYaw: number = 0;
        let cosYaw: number = 0;
        if (yaw !== 0) {
            sinYaw = Pix3D.sin[yaw];
            cosYaw = Pix3D.cos[yaw];
        }

        for (let v: number = 0; v < this.vertexCount; v++) {
            let x: number = this.vertexX[v];
            let y: number = this.vertexY[v];
            let z: number = this.vertexZ[v];

            let temp: number;
            if (yaw !== 0) {
                temp = (z * sinYaw + x * cosYaw) >> 16;
                z = (z * cosYaw - x * sinYaw) >> 16;
                x = temp;
            }

            x += relativeX;
            y += relativeY;
            z += relativeZ;

            temp = (z * sinEyeYaw + x * cosEyeYaw) >> 16;
            z = (z * cosEyeYaw - x * sinEyeYaw) >> 16;
            x = temp;

            temp = (y * cosEyePitch - z * sinEyePitch) >> 16;
            z = (y * sinEyePitch + z * cosEyePitch) >> 16;
            y = temp;

            if (Model.vertexScreenZ) {
                Model.vertexScreenZ[v] = z - midZ;
            }

            if (z >= 50 && Model.vertexScreenX && Model.vertexScreenY) {
                Model.vertexScreenX[v] = centerX + (((x << 9) / z) | 0);
                Model.vertexScreenY[v] = centerY + (((y << 9) / z) | 0);
            } else if (Model.vertexScreenX) {
                Model.vertexScreenX[v] = -5000;
                clipped = true;
            }

            if (Model.vertexViewSpaceX && Model.vertexViewSpaceY && Model.vertexViewSpaceZ) {
                Model.vertexViewSpaceX[v] = x;
                Model.vertexViewSpaceY[v] = y;
                Model.vertexViewSpaceZ[v] = z;
            }
        }

        try {
            // try catch for example a model being drawn from 3d can crash like at baxtorian falls
            this.draw2(clipped, picking, typecode, this.wireFrame);
        } catch (err) {
            // console.error(err);
        }
    }

    // todo: better name, Java relies on overloads
    private draw2(clipped: boolean, picking: boolean, typecode: number, wireframe: boolean = false): void {
        if (Model.checkHoverFace) {
            this.pickedFace = -1;
            this.pickedFaceDepth = -1;
        }

        for (let depth: number = 0; depth < this.maxDepth; depth++) {
            if (Model.tmpDepthFaceCount) {
                Model.tmpDepthFaceCount[depth] = 0;
            }
        }

        for (let f: number = 0; f < this.faceCount; f++) {
            if (this.faceInfo && this.faceInfo[f] === -1) {
                continue;
            }

            if (Model.vertexScreenX && Model.vertexScreenY && Model.vertexScreenZ && Model.tmpDepthFaces && Model.tmpDepthFaceCount) {
                const a: number = this.faceVertexA[f];
                const b: number = this.faceVertexB[f];
                const c: number = this.faceVertexC[f];

                const xA: number = Model.vertexScreenX[a];
                const xB: number = Model.vertexScreenX[b];
                const xC: number = Model.vertexScreenX[c];

                const yA: number = Model.vertexScreenY[a];
                const yB: number = Model.vertexScreenY[b];
                const yC: number = Model.vertexScreenY[c];

                const zA: number = Model.vertexScreenZ[a];
                const zB: number = Model.vertexScreenZ[b];
                const zC: number = Model.vertexScreenZ[c];

                if (clipped && (xA === -5000 || xB === -5000 || xC === -5000)) {
                    if (Model.faceNearClipped) {
                        Model.faceNearClipped[f] = true;
                    }

                    if (Model.tmpDepthFaces && Model.tmpDepthFaceCount) {
                        const depthAverage: number = (((zA + zB + zC) / 3) | 0) + this.minDepth;
                        Model.tmpDepthFaces[depthAverage][Model.tmpDepthFaceCount[depthAverage]++] = f;
                    }
                } else {
                    if (picking && this.pointWithinTriangle(Model.mouseX, Model.mouseY, yA, yB, yC, xA, xB, xC)) {
                        Model.picked[Model.pickedCount++] = typecode;
                        picking = false;
                    }

                    const dxAB: number = xA - xB;
                    const dyAB: number = yA - yB;
                    const dxCB: number = xC - xB;
                    const dyCB: number = yC - yB;

                    if (dxAB * dyCB - dyAB * dxCB <= 0) {
                        continue;
                    }

                    if (Model.faceNearClipped) {
                        Model.faceNearClipped[f] = false;
                    }
                    if (Model.faceClippedX) {
                        Model.faceClippedX[f] = xA < 0 || xB < 0 || xC < 0 || xA > Pix2D.boundX || xB > Pix2D.boundX || xC > Pix2D.boundX;
                    }

                    if (Model.tmpDepthFaces && Model.tmpDepthFaceCount) {
                        const depthAverage: number = (((zA + zB + zC) / 3) | 0) + this.minDepth;
                        Model.tmpDepthFaces[depthAverage][Model.tmpDepthFaceCount[depthAverage]++] = f;

                        // todo: better check (depth avg isn't always accurate)
                        if (Model.checkHoverFace && this.pointWithinTriangle(Model.mouseX, Model.mouseY, yA, yB, yC, xA, xB, xC) && this.pickedFaceDepth < depthAverage) {
                            this.pickedFace = f;
                            this.pickedFaceDepth = depthAverage;
                        }
                    }
                }
            }
        }

        if (!this.facePriority && Model.tmpDepthFaceCount) {
            for (let depth: number = this.maxDepth - 1; depth >= 0; depth--) {
                const count: number = Model.tmpDepthFaceCount[depth];
                if (count <= 0) {
                    continue;
                }

                if (Model.tmpDepthFaces) {
                    const faces: Int32Array = Model.tmpDepthFaces[depth];
                    for (let f: number = 0; f < count; f++) {
                        try {
                            this.drawFace(faces[f], wireframe);
                        } catch (e) {
                            // chrome's V8 optimizer hates us
                        }
                    }
                }
            }

            return;
        }

        for (let priority: number = 0; priority < 12; priority++) {
            if (Model.tmpPriorityFaceCount && Model.tmpPriorityDepthSum) {
                Model.tmpPriorityFaceCount[priority] = 0;
                Model.tmpPriorityDepthSum[priority] = 0;
            }
        }

        if (Model.tmpDepthFaceCount) {
            for (let depth: number = this.maxDepth - 1; depth >= 0; depth--) {
                const faceCount: number = Model.tmpDepthFaceCount[depth];

                if (faceCount > 0 && Model.tmpDepthFaces) {
                    const faces: Int32Array = Model.tmpDepthFaces[depth];

                    for (let i: number = 0; i < faceCount; i++) {
                        if (this.facePriority && Model.tmpPriorityFaceCount && Model.tmpPriorityFaces) {
                            const priorityDepth: number = faces[i];
                            const priorityFace: number = this.facePriority[priorityDepth];
                            const priorityFaceCount: number = Model.tmpPriorityFaceCount[priorityFace]++;

                            Model.tmpPriorityFaces[priorityFace][priorityFaceCount] = priorityDepth;

                            if (priorityFace < 10 && Model.tmpPriorityDepthSum) {
                                Model.tmpPriorityDepthSum[priorityFace] += depth;
                            } else if (priorityFace === 10 && Model.tmpPriority10FaceDepth) {
                                Model.tmpPriority10FaceDepth[priorityFaceCount] = depth;
                            } else if (Model.tmpPriority11FaceDepth) {
                                Model.tmpPriority11FaceDepth[priorityFaceCount] = depth;
                            }
                        }
                    }
                }
            }
        }

        let averagePriorityDepthSum1_2: number = 0;
        if (Model.tmpPriorityFaceCount && Model.tmpPriorityDepthSum && (Model.tmpPriorityFaceCount[1] > 0 || Model.tmpPriorityFaceCount[2] > 0)) {
            averagePriorityDepthSum1_2 = ((Model.tmpPriorityDepthSum[1] + Model.tmpPriorityDepthSum[2]) / (Model.tmpPriorityFaceCount[1] + Model.tmpPriorityFaceCount[2])) | 0;
        }

        let averagePriorityDepthSum3_4: number = 0;
        if (Model.tmpPriorityFaceCount && Model.tmpPriorityDepthSum && (Model.tmpPriorityFaceCount[3] > 0 || Model.tmpPriorityFaceCount[4] > 0)) {
            averagePriorityDepthSum3_4 = ((Model.tmpPriorityDepthSum[3] + Model.tmpPriorityDepthSum[4]) / (Model.tmpPriorityFaceCount[3] + Model.tmpPriorityFaceCount[4])) | 0;
        }

        let averagePriorityDepthSum6_8: number = 0;
        if (Model.tmpPriorityFaceCount && Model.tmpPriorityDepthSum && (Model.tmpPriorityFaceCount[6] > 0 || Model.tmpPriorityFaceCount[8] > 0)) {
            averagePriorityDepthSum6_8 = ((Model.tmpPriorityDepthSum[6] + Model.tmpPriorityDepthSum[8]) / (Model.tmpPriorityFaceCount[6] + Model.tmpPriorityFaceCount[8])) | 0;
        }

        if (Model.tmpPriorityFaceCount && Model.tmpPriorityFaces) {
            let priorityFace: number = 0;
            let priorityFaceCount: number = Model.tmpPriorityFaceCount[10];

            let priorityFaces: Int32Array = Model.tmpPriorityFaces[10];
            let priorityFaceDepths: Int32Array | null = Model.tmpPriority10FaceDepth;
            if (priorityFace === priorityFaceCount) {
                priorityFace = 0;
                priorityFaceCount = Model.tmpPriorityFaceCount[11];
                priorityFaces = Model.tmpPriorityFaces[11];
                priorityFaceDepths = Model.tmpPriority11FaceDepth;
            }

            let priorityDepth: number;
            if (priorityFace < priorityFaceCount && priorityFaceDepths) {
                priorityDepth = priorityFaceDepths[priorityFace];
            } else {
                priorityDepth = -1000;
            }

            for (let priority: number = 0; priority < 10; priority++) {
                while (priority === 0 && priorityDepth > averagePriorityDepthSum1_2) {
                    try {
                        this.drawFace(priorityFaces[priorityFace++], wireframe);

                        if (priorityFace === priorityFaceCount && priorityFaces !== Model.tmpPriorityFaces[11]) {
                            priorityFace = 0;
                            priorityFaceCount = Model.tmpPriorityFaceCount[11];
                            priorityFaces = Model.tmpPriorityFaces[11];
                            priorityFaceDepths = Model.tmpPriority11FaceDepth;
                        }

                        if (priorityFace < priorityFaceCount && priorityFaceDepths) {
                            priorityDepth = priorityFaceDepths[priorityFace];
                        } else {
                            priorityDepth = -1000;
                        }
                    } catch (e) {
                        // chrome's V8 optimizer hates us
                    }
                }

                while (priority === 3 && priorityDepth > averagePriorityDepthSum3_4) {
                    try {
                        this.drawFace(priorityFaces[priorityFace++], wireframe);

                        if (priorityFace === priorityFaceCount && priorityFaces !== Model.tmpPriorityFaces[11]) {
                            priorityFace = 0;
                            priorityFaceCount = Model.tmpPriorityFaceCount[11];
                            priorityFaces = Model.tmpPriorityFaces[11];
                            priorityFaceDepths = Model.tmpPriority11FaceDepth;
                        }

                        if (priorityFace < priorityFaceCount && priorityFaceDepths) {
                            priorityDepth = priorityFaceDepths[priorityFace];
                        } else {
                            priorityDepth = -1000;
                        }
                    } catch (e) {
                        // chrome's V8 optimizer hates us
                    }
                }

                while (priority === 5 && priorityDepth > averagePriorityDepthSum6_8) {
                    try {
                        this.drawFace(priorityFaces[priorityFace++], wireframe);

                        if (priorityFace === priorityFaceCount && priorityFaces !== Model.tmpPriorityFaces[11]) {
                            priorityFace = 0;
                            priorityFaceCount = Model.tmpPriorityFaceCount[11];
                            priorityFaces = Model.tmpPriorityFaces[11];
                            priorityFaceDepths = Model.tmpPriority11FaceDepth;
                        }

                        if (priorityFace < priorityFaceCount && priorityFaceDepths) {
                            priorityDepth = priorityFaceDepths[priorityFace];
                        } else {
                            priorityDepth = -1000;
                        }
                    } catch (e) {
                        // chrome's V8 optimizer hates us
                    }
                }

                const count: number = Model.tmpPriorityFaceCount[priority];
                const faces: Int32Array = Model.tmpPriorityFaces[priority];

                for (let i: number = 0; i < count; i++) {
                    try {
                        this.drawFace(faces[i], wireframe);
                    } catch (e) {
                        // chrome's V8 optimizer hates us
                    }
                }
            }

            while (priorityDepth !== -1000) {
                try {
                    this.drawFace(priorityFaces[priorityFace++], wireframe);

                    if (priorityFace === priorityFaceCount && priorityFaces !== Model.tmpPriorityFaces[11]) {
                        priorityFace = 0;
                        priorityFaces = Model.tmpPriorityFaces[11];
                        priorityFaceCount = Model.tmpPriorityFaceCount[11];
                        priorityFaceDepths = Model.tmpPriority11FaceDepth;
                    }

                    if (priorityFace < priorityFaceCount && priorityFaceDepths) {
                        priorityDepth = priorityFaceDepths[priorityFace];
                    } else {
                        priorityDepth = -1000;
                    }
                } catch (e) {
                    // chrome's V8 optimizer hates us
                }
            }
        }
    }

    private drawFace(face: number, wireframe: boolean = false): void {
        if (Model.faceNearClipped && Model.faceNearClipped[face]) {
            this.drawNearClippedFace(face, wireframe);
            return;
        }

        const a: number = this.faceVertexA[face];
        const b: number = this.faceVertexB[face];
        const c: number = this.faceVertexC[face];

        if (Model.faceClippedX) {
            Pix3D.clipX = Model.faceClippedX[face];
        }

        if (!this.faceAlpha) {
            Pix3D.alpha = 0;
        } else {
            Pix3D.alpha = this.faceAlpha[face];
        }

        let type: number;
        if (!this.faceInfo) {
            type = 0;
        } else {
            type = this.faceInfo[face] & 0x3;
        }

        if (wireframe && Model.vertexScreenX && Model.vertexScreenY && this.faceColorA && this.faceColorB && this.faceColorC) {
            Pix3D.drawLine(Model.vertexScreenX[a], Model.vertexScreenY[a], Model.vertexScreenX[b], Model.vertexScreenY[b], Pix3D.hslPal[this.faceColorA[face]]);
            Pix3D.drawLine(Model.vertexScreenX[b], Model.vertexScreenY[b], Model.vertexScreenX[c], Model.vertexScreenY[c], Pix3D.hslPal[this.faceColorB[face]]);
            Pix3D.drawLine(Model.vertexScreenX[c], Model.vertexScreenY[c], Model.vertexScreenX[a], Model.vertexScreenY[a], Pix3D.hslPal[this.faceColorC[face]]);
        } else if (type === 0 && this.faceColorA && this.faceColorB && this.faceColorC && Model.vertexScreenX && Model.vertexScreenY) {
            Pix3D.fillGouraudTriangle(
                Model.vertexScreenX[a],
                Model.vertexScreenX[b],
                Model.vertexScreenX[c],
                Model.vertexScreenY[a],
                Model.vertexScreenY[b],
                Model.vertexScreenY[c],
                this.faceColorA[face],
                this.faceColorB[face],
                this.faceColorC[face]
            );
        } else if (type === 1 && this.faceColorA && Model.vertexScreenX && Model.vertexScreenY) {
            Pix3D.fillTriangle(Model.vertexScreenX[a], Model.vertexScreenX[b], Model.vertexScreenX[c], Model.vertexScreenY[a], Model.vertexScreenY[b], Model.vertexScreenY[c], Pix3D.hslPal[this.faceColorA[face]]);
        } else if (type === 2 && this.faceInfo && this.faceColor && this.faceColorA && this.faceColorB && this.faceColorC && Model.vertexScreenX && Model.vertexScreenY && Model.vertexViewSpaceX && Model.vertexViewSpaceY && Model.vertexViewSpaceZ) {
            const texturedFace: number = this.faceInfo[face] >> 2;
            const tA: number = this.texturedVertexA[texturedFace];
            const tB: number = this.texturedVertexB[texturedFace];
            const tC: number = this.texturedVertexC[texturedFace];
            Pix3D.fillTexturedTriangle(
                Model.vertexScreenX[a],
                Model.vertexScreenX[b],
                Model.vertexScreenX[c],
                Model.vertexScreenY[a],
                Model.vertexScreenY[b],
                Model.vertexScreenY[c],
                this.faceColorA[face],
                this.faceColorB[face],
                this.faceColorC[face],
                Model.vertexViewSpaceX[tA],
                Model.vertexViewSpaceY[tA],
                Model.vertexViewSpaceZ[tA],
                Model.vertexViewSpaceX[tB],
                Model.vertexViewSpaceX[tC],
                Model.vertexViewSpaceY[tB],
                Model.vertexViewSpaceY[tC],
                Model.vertexViewSpaceZ[tB],
                Model.vertexViewSpaceZ[tC],
                this.faceColor[face]
            );
        } else if (type === 3 && this.faceInfo && this.faceColor && this.faceColorA && Model.vertexScreenX && Model.vertexScreenY && Model.vertexViewSpaceX && Model.vertexViewSpaceY && Model.vertexViewSpaceZ) {
            const texturedFace: number = this.faceInfo[face] >> 2;
            const tA: number = this.texturedVertexA[texturedFace];
            const tB: number = this.texturedVertexB[texturedFace];
            const tC: number = this.texturedVertexC[texturedFace];
            Pix3D.fillTexturedTriangle(
                Model.vertexScreenX[a],
                Model.vertexScreenX[b],
                Model.vertexScreenX[c],
                Model.vertexScreenY[a],
                Model.vertexScreenY[b],
                Model.vertexScreenY[c],
                this.faceColorA[face],
                this.faceColorA[face],
                this.faceColorA[face],
                Model.vertexViewSpaceX[tA],
                Model.vertexViewSpaceY[tA],
                Model.vertexViewSpaceZ[tA],
                Model.vertexViewSpaceX[tB],
                Model.vertexViewSpaceX[tC],
                Model.vertexViewSpaceY[tB],
                Model.vertexViewSpaceY[tC],
                Model.vertexViewSpaceZ[tB],
                Model.vertexViewSpaceZ[tC],
                this.faceColor[face]
            );
        }
    }

    private drawNearClippedFace(face: number, wireframe: boolean = false): void {
        let elements: number = 0;

        if (Model.vertexViewSpaceZ) {
            const centerX: number = Pix3D.centerX;
            const centerY: number = Pix3D.centerY;

            const a: number = this.faceVertexA[face];
            const b: number = this.faceVertexB[face];
            const c: number = this.faceVertexC[face];

            const zA: number = Model.vertexViewSpaceZ[a];
            const zB: number = Model.vertexViewSpaceZ[b];
            const zC: number = Model.vertexViewSpaceZ[c];

            if (zA >= 50 && Model.vertexScreenX && Model.vertexScreenY && this.faceColorA) {
                Model.clippedX[elements] = Model.vertexScreenX[a];
                Model.clippedY[elements] = Model.vertexScreenY[a];
                Model.clippedColor[elements++] = this.faceColorA[face];
            } else if (Model.vertexViewSpaceX && Model.vertexViewSpaceY && this.faceColorA) {
                const xA: number = Model.vertexViewSpaceX[a];
                const yA: number = Model.vertexViewSpaceY[a];
                const colorA: number = this.faceColorA[face];

                if (zC >= 50 && this.faceColorC) {
                    const scalar: number = (50 - zA) * Pix3D.reciprocal16[zC - zA];
                    Model.clippedX[elements] = centerX + ((((xA + (((Model.vertexViewSpaceX[c] - xA) * scalar) >> 16)) << 9) / 50) | 0);
                    Model.clippedY[elements] = centerY + ((((yA + (((Model.vertexViewSpaceY[c] - yA) * scalar) >> 16)) << 9) / 50) | 0);
                    Model.clippedColor[elements++] = colorA + (((this.faceColorC[face] - colorA) * scalar) >> 16);
                }

                if (zB >= 50 && this.faceColorB) {
                    const scalar: number = (50 - zA) * Pix3D.reciprocal16[zB - zA];
                    Model.clippedX[elements] = centerX + ((((xA + (((Model.vertexViewSpaceX[b] - xA) * scalar) >> 16)) << 9) / 50) | 0);
                    Model.clippedY[elements] = centerY + ((((yA + (((Model.vertexViewSpaceY[b] - yA) * scalar) >> 16)) << 9) / 50) | 0);
                    Model.clippedColor[elements++] = colorA + (((this.faceColorB[face] - colorA) * scalar) >> 16);
                }
            }

            if (zB >= 50 && Model.vertexScreenX && Model.vertexScreenY && this.faceColorB) {
                Model.clippedX[elements] = Model.vertexScreenX[b];
                Model.clippedY[elements] = Model.vertexScreenY[b];
                Model.clippedColor[elements++] = this.faceColorB[face];
            } else if (Model.vertexViewSpaceX && Model.vertexViewSpaceY && this.faceColorB) {
                const xB: number = Model.vertexViewSpaceX[b];
                const yB: number = Model.vertexViewSpaceY[b];
                const colorB: number = this.faceColorB[face];

                if (zA >= 50 && this.faceColorA) {
                    const scalar: number = (50 - zB) * Pix3D.reciprocal16[zA - zB];
                    Model.clippedX[elements] = centerX + ((((xB + (((Model.vertexViewSpaceX[a] - xB) * scalar) >> 16)) << 9) / 50) | 0);
                    Model.clippedY[elements] = centerY + ((((yB + (((Model.vertexViewSpaceY[a] - yB) * scalar) >> 16)) << 9) / 50) | 0);
                    Model.clippedColor[elements++] = colorB + (((this.faceColorA[face] - colorB) * scalar) >> 16);
                }

                if (zC >= 50 && this.faceColorC) {
                    const scalar: number = (50 - zB) * Pix3D.reciprocal16[zC - zB];
                    Model.clippedX[elements] = centerX + ((((xB + (((Model.vertexViewSpaceX[c] - xB) * scalar) >> 16)) << 9) / 50) | 0);
                    Model.clippedY[elements] = centerY + ((((yB + (((Model.vertexViewSpaceY[c] - yB) * scalar) >> 16)) << 9) / 50) | 0);
                    Model.clippedColor[elements++] = colorB + (((this.faceColorC[face] - colorB) * scalar) >> 16);
                }
            }

            if (zC >= 50 && Model.vertexScreenX && Model.vertexScreenY && this.faceColorC) {
                Model.clippedX[elements] = Model.vertexScreenX[c];
                Model.clippedY[elements] = Model.vertexScreenY[c];
                Model.clippedColor[elements++] = this.faceColorC[face];
            } else if (Model.vertexViewSpaceX && Model.vertexViewSpaceY && this.faceColorC) {
                const xC: number = Model.vertexViewSpaceX[c];
                const yC: number = Model.vertexViewSpaceY[c];
                const colorC: number = this.faceColorC[face];

                if (zB >= 50 && this.faceColorB) {
                    const scalar: number = (50 - zC) * Pix3D.reciprocal16[zB - zC];
                    Model.clippedX[elements] = centerX + ((((xC + (((Model.vertexViewSpaceX[b] - xC) * scalar) >> 16)) << 9) / 50) | 0);
                    Model.clippedY[elements] = centerY + ((((yC + (((Model.vertexViewSpaceY[b] - yC) * scalar) >> 16)) << 9) / 50) | 0);
                    Model.clippedColor[elements++] = colorC + (((this.faceColorB[face] - colorC) * scalar) >> 16);
                }

                if (zA >= 50 && this.faceColorA) {
                    const scalar: number = (50 - zC) * Pix3D.reciprocal16[zA - zC];
                    Model.clippedX[elements] = centerX + ((((xC + (((Model.vertexViewSpaceX[a] - xC) * scalar) >> 16)) << 9) / 50) | 0);
                    Model.clippedY[elements] = centerY + ((((yC + (((Model.vertexViewSpaceY[a] - yC) * scalar) >> 16)) << 9) / 50) | 0);
                    Model.clippedColor[elements++] = colorC + (((this.faceColorA[face] - colorC) * scalar) >> 16);
                }
            }
        }

        const x0: number = Model.clippedX[0];
        const x1: number = Model.clippedX[1];
        const x2: number = Model.clippedX[2];
        const y0: number = Model.clippedY[0];
        const y1: number = Model.clippedY[1];
        const y2: number = Model.clippedY[2];

        if ((x0 - x1) * (y2 - y1) - (y0 - y1) * (x2 - x1) <= 0) {
            return;
        }

        Pix3D.clipX = false;

        if (elements === 3) {
            if (x0 < 0 || x1 < 0 || x2 < 0 || x0 > Pix2D.boundX || x1 > Pix2D.boundX || x2 > Pix2D.boundX) {
                Pix3D.clipX = true;
            }

            let type: number;
            if (!this.faceInfo) {
                type = 0;
            } else {
                type = this.faceInfo[face] & 0x3;
            }

            if (wireframe) {
                Pix3D.drawLine(x0, x1, y0, y1, Model.clippedColor[0]);
                Pix3D.drawLine(x1, x2, y1, y2, Model.clippedColor[1]);
                Pix3D.drawLine(x2, x0, y2, y0, Model.clippedColor[2]);
            } else if (type === 0) {
                Pix3D.fillGouraudTriangle(x0, x1, x2, y0, y1, y2, Model.clippedColor[0], Model.clippedColor[1], Model.clippedColor[2]);
            } else if (type === 1 && this.faceColorA) {
                Pix3D.fillTriangle(x0, x1, x2, y0, y1, y2, Pix3D.hslPal[this.faceColorA[face]]);
            } else if (type === 2 && this.faceInfo && this.faceColor && Model.vertexViewSpaceX && Model.vertexViewSpaceY && Model.vertexViewSpaceZ) {
                const texturedFace: number = this.faceInfo[face] >> 2;
                const tA: number = this.texturedVertexA[texturedFace];
                const tB: number = this.texturedVertexB[texturedFace];
                const tC: number = this.texturedVertexC[texturedFace];
                Pix3D.fillTexturedTriangle(
                    x0,
                    x1,
                    x2,
                    y0,
                    y1,
                    y2,
                    Model.clippedColor[0],
                    Model.clippedColor[1],
                    Model.clippedColor[2],
                    Model.vertexViewSpaceX[tA],
                    Model.vertexViewSpaceY[tA],
                    Model.vertexViewSpaceZ[tA],
                    Model.vertexViewSpaceX[tB],
                    Model.vertexViewSpaceX[tC],
                    Model.vertexViewSpaceY[tB],
                    Model.vertexViewSpaceY[tC],
                    Model.vertexViewSpaceZ[tB],
                    Model.vertexViewSpaceZ[tC],
                    this.faceColor[face]
                );
            } else if (type === 3 && this.faceInfo && this.faceColor && this.faceColorA && Model.vertexViewSpaceX && Model.vertexViewSpaceY && Model.vertexViewSpaceZ) {
                const texturedFace: number = this.faceInfo[face] >> 2;
                const tA: number = this.texturedVertexA[texturedFace];
                const tB: number = this.texturedVertexB[texturedFace];
                const tC: number = this.texturedVertexC[texturedFace];
                Pix3D.fillTexturedTriangle(
                    x0,
                    x1,
                    x2,
                    y0,
                    y1,
                    y2,
                    this.faceColorA[face],
                    this.faceColorA[face],
                    this.faceColorA[face],
                    Model.vertexViewSpaceX[tA],
                    Model.vertexViewSpaceY[tA],
                    Model.vertexViewSpaceZ[tA],
                    Model.vertexViewSpaceX[tB],
                    Model.vertexViewSpaceX[tC],
                    Model.vertexViewSpaceY[tB],
                    Model.vertexViewSpaceY[tC],
                    Model.vertexViewSpaceZ[tB],
                    Model.vertexViewSpaceZ[tC],
                    this.faceColor[face]
                );
            }
        } else if (elements === 4) {
            if (x0 < 0 || x1 < 0 || x2 < 0 || x0 > Pix2D.boundX || x1 > Pix2D.boundX || x2 > Pix2D.boundX || Model.clippedX[3] < 0 || Model.clippedX[3] > Pix2D.boundX) {
                Pix3D.clipX = true;
            }

            let type: number;
            if (!this.faceInfo) {
                type = 0;
            } else {
                type = this.faceInfo[face] & 0x3;
            }

            if (wireframe) {
                Pix3D.drawLine(x0, x1, y0, y1, Model.clippedColor[0]);
                Pix3D.drawLine(x1, x2, y1, y2, Model.clippedColor[1]);
                Pix3D.drawLine(x2, Model.clippedX[3], y2, Model.clippedY[3], Model.clippedColor[2]);
                Pix3D.drawLine(Model.clippedX[3], x0, Model.clippedY[3], y0, Model.clippedColor[3]);
            } else if (type === 0) {
                Pix3D.fillGouraudTriangle(x0, x1, x2, y0, y1, y2, Model.clippedColor[0], Model.clippedColor[1], Model.clippedColor[2]);
                Pix3D.fillGouraudTriangle(x0, x2, Model.clippedX[3], y0, y2, Model.clippedY[3], Model.clippedColor[0], Model.clippedColor[2], Model.clippedColor[3]);
            } else if (type === 1) {
                if (this.faceColorA) {
                    const colorA: number = Pix3D.hslPal[this.faceColorA[face]];
                    Pix3D.fillTriangle(x0, x1, x2, y0, y1, y2, colorA);
                    Pix3D.fillTriangle(x0, x2, Model.clippedX[3], y0, y2, Model.clippedY[3], colorA);
                }
            } else if (type === 2 && this.faceInfo && this.faceColor && Model.vertexViewSpaceX && Model.vertexViewSpaceY && Model.vertexViewSpaceZ) {
                const texturedFace: number = this.faceInfo[face] >> 2;
                const tA: number = this.texturedVertexA[texturedFace];
                const tB: number = this.texturedVertexB[texturedFace];
                const tC: number = this.texturedVertexC[texturedFace];
                Pix3D.fillTexturedTriangle(
                    x0,
                    x1,
                    x2,
                    y0,
                    y1,
                    y2,
                    Model.clippedColor[0],
                    Model.clippedColor[1],
                    Model.clippedColor[2],
                    Model.vertexViewSpaceX[tA],
                    Model.vertexViewSpaceY[tA],
                    Model.vertexViewSpaceZ[tA],
                    Model.vertexViewSpaceX[tB],
                    Model.vertexViewSpaceX[tC],
                    Model.vertexViewSpaceY[tB],
                    Model.vertexViewSpaceY[tC],
                    Model.vertexViewSpaceZ[tB],
                    Model.vertexViewSpaceZ[tC],
                    this.faceColor[face]
                );
                Pix3D.fillTexturedTriangle(
                    x0,
                    x2,
                    Model.clippedX[3],
                    y0,
                    y2,
                    Model.clippedY[3],
                    Model.clippedColor[0],
                    Model.clippedColor[2],
                    Model.clippedColor[3],
                    Model.vertexViewSpaceX[tA],
                    Model.vertexViewSpaceY[tA],
                    Model.vertexViewSpaceZ[tA],
                    Model.vertexViewSpaceX[tB],
                    Model.vertexViewSpaceX[tC],
                    Model.vertexViewSpaceY[tB],
                    Model.vertexViewSpaceY[tC],
                    Model.vertexViewSpaceZ[tB],
                    Model.vertexViewSpaceZ[tC],
                    this.faceColor[face]
                );
            } else if (type === 3 && this.faceInfo && this.faceColor && this.faceColorA && Model.vertexViewSpaceX && Model.vertexViewSpaceY && Model.vertexViewSpaceZ) {
                const texturedFace: number = this.faceInfo[face] >> 2;
                const tA: number = this.texturedVertexA[texturedFace];
                const tB: number = this.texturedVertexB[texturedFace];
                const tC: number = this.texturedVertexC[texturedFace];
                Pix3D.fillTexturedTriangle(
                    x0,
                    x1,
                    x2,
                    y0,
                    y1,
                    y2,
                    this.faceColorA[face],
                    this.faceColorA[face],
                    this.faceColorA[face],
                    Model.vertexViewSpaceX[tA],
                    Model.vertexViewSpaceY[tA],
                    Model.vertexViewSpaceZ[tA],
                    Model.vertexViewSpaceX[tB],
                    Model.vertexViewSpaceX[tC],
                    Model.vertexViewSpaceY[tB],
                    Model.vertexViewSpaceY[tC],
                    Model.vertexViewSpaceZ[tB],
                    Model.vertexViewSpaceZ[tC],
                    this.faceColor[face]
                );
                Pix3D.fillTexturedTriangle(
                    x0,
                    x2,
                    Model.clippedX[3],
                    y0,
                    y2,
                    Model.clippedY[3],
                    this.faceColorA[face],
                    this.faceColorA[face],
                    this.faceColorA[face],
                    Model.vertexViewSpaceX[tA],
                    Model.vertexViewSpaceY[tA],
                    Model.vertexViewSpaceZ[tA],
                    Model.vertexViewSpaceX[tB],
                    Model.vertexViewSpaceX[tC],
                    Model.vertexViewSpaceY[tB],
                    Model.vertexViewSpaceY[tC],
                    Model.vertexViewSpaceZ[tB],
                    Model.vertexViewSpaceZ[tC],
                    this.faceColor[face]
                );
            }
        }
    }

    private applyTransform2(x: number, y: number, z: number, labels: Uint8Array | null, type: number): void {
        if (!labels) {
            return;
        }

        const labelCount: number = labels.length;

        if (type === 0) {
            let count: number = 0;
            Model.baseX = 0;
            Model.baseY = 0;
            Model.baseZ = 0;

            for (let g: number = 0; g < labelCount; g++) {
                if (!this.labelVertices) {
                    continue;
                }
                const label: number = labels[g];
                if (label < this.labelVertices.length) {
                    const vertices: Int32Array | null = this.labelVertices[label];
                    if (vertices) {
                        for (let i: number = 0; i < vertices.length; i++) {
                            const v: number = vertices[i];
                            Model.baseX += this.vertexX[v];
                            Model.baseY += this.vertexY[v];
                            Model.baseZ += this.vertexZ[v];
                            count++;
                        }
                    }
                }
            }

            if (count > 0) {
                Model.baseX = ((Model.baseX / count) | 0) + x;
                Model.baseY = ((Model.baseY / count) | 0) + y;
                Model.baseZ = ((Model.baseZ / count) | 0) + z;
            } else {
                Model.baseX = x;
                Model.baseY = y;
                Model.baseZ = z;
            }
        } else if (type === 1) {
            for (let g: number = 0; g < labelCount; g++) {
                const group: number = labels[g];
                if (!this.labelVertices || group >= this.labelVertices.length) {
                    continue;
                }

                const vertices: Int32Array | null = this.labelVertices[group];
                if (vertices) {
                    for (let i: number = 0; i < vertices.length; i++) {
                        const v: number = vertices[i];
                        this.vertexX[v] += x;
                        this.vertexY[v] += y;
                        this.vertexZ[v] += z;
                    }
                }
            }
        } else if (type === 2) {
            for (let g: number = 0; g < labelCount; g++) {
                const label: number = labels[g];
                if (!this.labelVertices || label >= this.labelVertices.length) {
                    continue;
                }

                const vertices: Int32Array | null = this.labelVertices[label];
                if (vertices) {
                    for (let i: number = 0; i < vertices.length; i++) {
                        const v: number = vertices[i];
                        this.vertexX[v] -= Model.baseX;
                        this.vertexY[v] -= Model.baseY;
                        this.vertexZ[v] -= Model.baseZ;

                        const pitch: number = (x & 0xff) * 8;
                        const yaw: number = (y & 0xff) * 8;
                        const roll: number = (z & 0xff) * 8;

                        let sin: number;
                        let cos: number;

                        if (roll !== 0) {
                            sin = Pix3D.sin[roll];
                            cos = Pix3D.cos[roll];
                            const x_: number = (this.vertexY[v] * sin + this.vertexX[v] * cos) >> 16;
                            this.vertexY[v] = (this.vertexY[v] * cos - this.vertexX[v] * sin) >> 16;
                            this.vertexX[v] = x_;
                        }

                        if (pitch !== 0) {
                            sin = Pix3D.sin[pitch];
                            cos = Pix3D.cos[pitch];
                            const y_: number = (this.vertexY[v] * cos - this.vertexZ[v] * sin) >> 16;
                            this.vertexZ[v] = (this.vertexY[v] * sin + this.vertexZ[v] * cos) >> 16;
                            this.vertexY[v] = y_;
                        }

                        if (yaw !== 0) {
                            sin = Pix3D.sin[yaw];
                            cos = Pix3D.cos[yaw];
                            const x_: number = (this.vertexZ[v] * sin + this.vertexX[v] * cos) >> 16;
                            this.vertexZ[v] = (this.vertexZ[v] * cos - this.vertexX[v] * sin) >> 16;
                            this.vertexX[v] = x_;
                        }

                        this.vertexX[v] += Model.baseX;
                        this.vertexY[v] += Model.baseY;
                        this.vertexZ[v] += Model.baseZ;
                    }
                }
            }
        } else if (type === 3) {
            for (let g: number = 0; g < labelCount; g++) {
                const label: number = labels[g];
                if (!this.labelVertices || label >= this.labelVertices.length) {
                    continue;
                }

                const vertices: Int32Array | null = this.labelVertices[label];
                if (vertices) {
                    for (let i: number = 0; i < vertices.length; i++) {
                        const v: number = vertices[i];
                        this.vertexX[v] -= Model.baseX;
                        this.vertexY[v] -= Model.baseY;
                        this.vertexZ[v] -= Model.baseZ;
                        this.vertexX[v] = ((this.vertexX[v] * x) / 128) | 0;
                        this.vertexY[v] = ((this.vertexY[v] * y) / 128) | 0;
                        this.vertexZ[v] = ((this.vertexZ[v] * z) / 128) | 0;
                        this.vertexX[v] += Model.baseX;
                        this.vertexY[v] += Model.baseY;
                        this.vertexZ[v] += Model.baseZ;
                    }
                }
            }
        } else if (type === 5 && this.labelFaces && this.faceAlpha) {
            for (let g: number = 0; g < labelCount; g++) {
                const label: number = labels[g];
                if (label >= this.labelFaces.length) {
                    continue;
                }

                const triangles: Int32Array | null = this.labelFaces[label];
                if (triangles) {
                    for (let i: number = 0; i < triangles.length; i++) {
                        const t: number = triangles[i];

                        this.faceAlpha[t] += x * 8;
                        if (this.faceAlpha[t] < 0) {
                            this.faceAlpha[t] = 0;
                        }

                        if (this.faceAlpha[t] > 255) {
                            this.faceAlpha[t] = 255;
                        }
                    }
                }
            }
        }
    }

    private calculateBoundsAABB(): void {
        this.maxY = 0;
        this.radius = 0;
        this.minY = 0;
        this.minX = 999999;
        this.maxX = -999999;
        this.maxZ = -99999;
        this.minZ = 99999;

        for (let v: number = 0; v < this.vertexCount; v++) {
            const x: number = this.vertexX[v];
            const y: number = this.vertexY[v];
            const z: number = this.vertexZ[v];

            if (x < this.minX) {
                this.minX = x;
            }

            if (x > this.maxX) {
                this.maxX = x;
            }

            if (z < this.minZ) {
                this.minZ = z;
            }

            if (z > this.maxZ) {
                this.maxZ = z;
            }

            if (-y > this.maxY) {
                this.maxY = -y;
            }

            if (y > this.minY) {
                this.minY = y;
            }

            const radiusSqr: number = x * x + z * z;
            if (radiusSqr > this.radius) {
                this.radius = radiusSqr;
            }
        }

        this.radius = Math.sqrt(this.radius) | 0;
        this.minDepth = Math.sqrt(this.radius * this.radius + this.maxY * this.maxY) | 0;
        this.maxDepth = this.minDepth + (Math.sqrt(this.radius * this.radius + this.minY * this.minY) | 0);
    }

    private pointWithinTriangle(x: number, y: number, yA: number, yB: number, yC: number, xA: number, xB: number, xC: number): boolean {
        if (y < yA && y < yB && y < yC) {
            return false;
        } else if (y > yA && y > yB && y > yC) {
            return false;
        } else if (x < xA && x < xB && x < xC) {
            return false;
        } else {
            return x <= xA || x <= xB || x <= xC;
        }
    }

    drawFaceOutline(face: number): void {
        if (!Model.vertexScreenX || !Model.vertexScreenY || !this.faceColorA || !this.faceColorB || !this.faceColorC) {
            return;
        }

        const a: number = this.faceVertexA[face];
        const b: number = this.faceVertexB[face];
        const c: number = this.faceVertexC[face];

        Pix3D.drawLine(Model.vertexScreenX[a], Model.vertexScreenY[a], Model.vertexScreenX[b], Model.vertexScreenY[b], Pix3D.hslPal[1000]);
        Pix3D.drawLine(Model.vertexScreenX[b], Model.vertexScreenY[b], Model.vertexScreenX[c], Model.vertexScreenY[c], Pix3D.hslPal[1000]);
        Pix3D.drawLine(Model.vertexScreenX[c], Model.vertexScreenY[c], Model.vertexScreenX[a], Model.vertexScreenY[a], Pix3D.hslPal[1000]);
    }

    private static encodeVertices(
        vertexX: Int32Array,
        vertexY: Int32Array,
        vertexZ: Int32Array,
        vertexCount: number
    ): {
        flags: Uint8Array;
        xData: Uint8Array;
        yData: Uint8Array;
        zData: Uint8Array;
    } {
        const flagsPacket = new Packet(new Uint8Array(vertexCount));
        const xPacket = new Packet(new Uint8Array(vertexCount * 2));
        const yPacket = new Packet(new Uint8Array(vertexCount * 2));
        const zPacket = new Packet(new Uint8Array(vertexCount * 2));

        let prevX = 0;
        let prevY = 0;
        let prevZ = 0;

        for (let v = 0; v < vertexCount; v++) {
            const currentX = vertexX[v];
            const currentY = vertexY[v];
            const currentZ = vertexZ[v];

            const dx = currentX - prevX;
            const dy = currentY - prevY;
            const dz = currentZ - prevZ;

            let flag = 0;
            if (dx !== 0) {
                flag |= 1;
                xPacket.psmarts(dx);
            }
            if (dy !== 0) {
                flag |= 2;
                yPacket.psmarts(dy);
            }
            if (dz !== 0) {
                flag |= 4;
                zPacket.psmarts(dz);
            }
            flagsPacket.p1(flag);

            prevX = currentX;
            prevY = currentY;
            prevZ = currentZ;
        }
        return {
            flags: flagsPacket.data,
            xData: xPacket.data.slice(0, xPacket.pos),
            yData: yPacket.data.slice(0, yPacket.pos),
            zData: zPacket.data.slice(0, zPacket.pos),
        };
    }

    private static encodeFaces(
        faceVertexA: Int32Array,
        faceVertexB: Int32Array,
        faceVertexC: Int32Array,
        faceCount: number
    ): { orientations: Uint8Array; vertexIndices: Uint8Array } {
        const orientationsPacket = new Packet(new Uint8Array(faceCount));
        const vertexIndicesPacket = new Packet(new Uint8Array(faceCount * 3 * 2));

        let encA = 0,
            encB = 0,
            encC = 0,
            encOffset = 0;

        for (let f = 0; f < faceCount; f++) {
            const vA = faceVertexA[f];
            const vB = faceVertexB[f];
            const vC = faceVertexC[f];

            let orientation: number;

            if (vA === encB && vB === encA && vC !== encOffset) {
                orientation = 4;
                orientationsPacket.p1(orientation);
                vertexIndicesPacket.psmarts(vC - encOffset);
            } else if (vA === encC && vB === encB && vC !== encOffset) {
                orientation = 3;
                orientationsPacket.p1(orientation);
                vertexIndicesPacket.psmarts(vC - encOffset);
            } else if (vA === encA && vB === encC && vC !== encOffset) {
                orientation = 2;
                orientationsPacket.p1(orientation);
                vertexIndicesPacket.psmarts(vC - encOffset);
            } else {
                orientation = 1;
                orientationsPacket.p1(orientation);
                vertexIndicesPacket.psmarts(vA - encOffset);
                vertexIndicesPacket.psmarts(vB - vA);
                vertexIndicesPacket.psmarts(vC - vB);
            }
            encOffset = vC;
            encA = vA;
            encB = vB;
            encC = vC;
        }
        return {
            orientations: orientationsPacket.data,
            vertexIndices: vertexIndicesPacket.data.slice(0, vertexIndicesPacket.pos),
        };
    }

    static convertFromData(data: Packet): Model {
        const originalDataEndPos = data.data.length - 18;
        data.pos = originalDataEndPos;

        const vertexCount = data.g2();
        const faceCount = data.g2();
        const texturedFaceCount = data.g1();

        const hasInfoFlagFromFile = data.g1();
        const hasPrioritiesFlagFromFile = data.g1();
        const hasAlphaFlagFromFile = data.g1();
        const hasFaceLabelsFlagFromFile = data.g1();
        const hasVertexLabelsFlagFromFile = data.g1();

        const vertexXLength = data.g2();
        const vertexYLength = data.g2();
        const vertexZLength = data.g2();
        const faceVertexLength = data.g2();

        data.pos = 0;

        const p_vertexCount_flags = new Uint8Array(vertexCount);
        data.gdata(p_vertexCount_flags, 0, p_vertexCount_flags.length);

        const p_faceCount_orientations = new Uint8Array(faceCount);
        data.gdata(p_faceCount_orientations, 0, p_faceCount_orientations.length);

        const facePriorities: number[] = [];
        const faceLabels: number[] = [];
        const faceInfos: number[] = [];
        const vertexLabels: number[] = [];
        const faceAlphas: number[] = [];

        if (hasPrioritiesFlagFromFile === 255) {
            const p_priorities = new Uint8Array(faceCount);
            data.gdata(p_priorities, 0, p_priorities.length);
            for (let i = 0; i < p_priorities.length; i++)
                facePriorities.push(p_priorities[i]);
        }

        if (hasFaceLabelsFlagFromFile === 1) {
            const p_labels = new Uint8Array(faceCount);
            data.gdata(p_labels, 0, p_labels.length);
            for (let i = 0; i < p_labels.length; i++) faceLabels.push(p_labels[i]);
        }

        if (hasInfoFlagFromFile === 1) {
            const p_infos = new Uint8Array(faceCount);
            data.gdata(p_infos, 0, p_infos.length);
            for (let i = 0; i < p_infos.length; i++) faceInfos.push(p_infos[i]);
        }

        if (hasVertexLabelsFlagFromFile === 1) {
            const p_vLabels = new Uint8Array(vertexCount);
            data.gdata(p_vLabels, 0, p_vLabels.length);
            for (let i = 0; i < p_vLabels.length; i++)
                vertexLabels.push(p_vLabels[i]);
        }

        if (hasAlphaFlagFromFile === 1) {
            const p_alphas = new Uint8Array(faceCount);
            data.gdata(p_alphas, 0, p_alphas.length);
            for (let i = 0; i < p_alphas.length; i++) faceAlphas.push(p_alphas[i]);
        }

        const p_faceVertexIndices = new Uint8Array(faceVertexLength);
        data.gdata(p_faceVertexIndices, 0, p_faceVertexIndices.length);

        const p_faceColors = new Uint8Array(faceCount * 2);
        data.gdata(p_faceColors, 0, p_faceColors.length);

        const p_texturedFaceIndices = new Uint8Array(texturedFaceCount * 6);
        data.gdata(p_texturedFaceIndices, 0, p_texturedFaceIndices.length);

        const p_vertexXData = new Uint8Array(vertexXLength);
        data.gdata(p_vertexXData, 0, p_vertexXData.length);

        const p_vertexYData = new Uint8Array(vertexYLength);
        data.gdata(p_vertexYData, 0, p_vertexYData.length);

        const p_vertexZData = new Uint8Array(vertexZLength);
        data.gdata(p_vertexZData, 0, p_vertexZData.length);

        const vertexX = new Int32Array(vertexCount);
        const vertexY = new Int32Array(vertexCount);
        const vertexZ = new Int32Array(vertexCount);
        const faceVertexA = new Int32Array(faceCount);
        const faceVertexB = new Int32Array(faceCount);
        const faceVertexC = new Int32Array(faceCount);
        const faceColor = new Int32Array(faceCount);
        const texturedVertexA = new Int32Array(texturedFaceCount);
        const texturedVertexB = new Int32Array(texturedFaceCount);
        const texturedVertexC = new Int32Array(texturedFaceCount);

        Model.processVertices(
            vertexX,
            vertexY,
            vertexZ,
            vertexCount,
            p_vertexXData,
            p_vertexYData,
            p_vertexZData,
            p_vertexCount_flags
        );
        Model.processFaces(
            faceVertexA,
            faceVertexB,
            faceVertexC,
            faceCount,
            p_faceVertexIndices,
            p_faceCount_orientations
        );
        Model.processColors(faceColor, faceCount, p_faceColors);
        Model.processTextures(
            texturedVertexA,
            texturedVertexB,
            texturedVertexC,
            texturedFaceCount,
            p_texturedFaceIndices
        );

        let finalPriorityVal = 0;
        if (hasPrioritiesFlagFromFile !== 255) {
            finalPriorityVal = hasPrioritiesFlagFromFile;
        }

        const modelType: ModelType = {
            vertexCount,
            vertexX,
            vertexY,
            vertexZ,
            faceCount,
            faceVertexA,
            faceVertexB,
            faceVertexC,
            faceColorA: null,
            faceColorB: null,
            faceColorC: null,
            faceInfo: faceInfos.length > 0 ? new Int32Array(faceInfos) : null,
            facePriority:
                facePriorities.length > 0 ? new Int32Array(facePriorities) : null,
            faceAlpha: faceAlphas.length > 0 ? new Int32Array(faceAlphas) : null,
            faceColor,
            priorityVal: finalPriorityVal,
            texturedFaceCount,
            texturedVertexA,
            texturedVertexB,
            texturedVertexC,
            vertexLabel:
                vertexLabels.length > 0 ? new Int32Array(vertexLabels) : null,
            faceLabel: faceLabels.length > 0 ? new Int32Array(faceLabels) : null,
            labelVertices: null,
            labelFaces: null,
            vertexNormal: null,
            vertexNormalOriginal: null,
        };

        const model = new Model(modelType);
        model.hadOriginalFaceInfos = hasInfoFlagFromFile === 1;
        model.hadOriginalFacePriorities = hasPrioritiesFlagFromFile === 255;
        model.hadOriginalFaceAlphas = hasAlphaFlagFromFile === 1;
        model.hadOriginalFaceLabels = hasFaceLabelsFlagFromFile === 1;
        model.hadOriginalVertexLabels = hasVertexLabelsFlagFromFile === 1;
        if (model.faceColor) {
            model.originalFaceColor = new Int32Array(model.faceColor);
        }
        return model;
    }

    public exportToOb2(): Uint8Array {
        const dataBlocks: Uint8Array[] = [];

        const {
            flags: vertexFlagsData,
            xData: vertexXData,
            yData: vertexYData,
            zData: vertexZData,
        } = Model.encodeVertices(
            this.vertexX,
            this.vertexY,
            this.vertexZ,
            this.vertexCount
        );
        dataBlocks.push(vertexFlagsData);

        const {
            orientations: faceOrientationsData,
            vertexIndices: faceVertexIndicesData,
        } = Model.encodeFaces(
            this.faceVertexA,
            this.faceVertexB,
            this.faceVertexC,
            this.faceCount
        );
        dataBlocks.push(faceOrientationsData);

        if (this.hadOriginalFacePriorities) {
            const facePrioritiesData = this.facePriority
                ? Uint8Array.from(this.facePriority)
                : new Uint8Array(this.faceCount).fill(0);
            dataBlocks.push(facePrioritiesData);
        }

        if (this.hadOriginalFaceLabels) {
            let actualFaceLabels = new Uint8Array(this.faceCount).fill(0);

            if ((this as any).faceLabelForExport instanceof Int32Array) {
                const src = (this as any).faceLabelForExport as Int32Array;
                console.log("Using faceLabelForExport in export:", src.slice(0, 20));
                for (let i = 0; i < this.faceCount && i < src.length; i++) {
                    actualFaceLabels[i] = src[i];
                }
            } else if (this.labelFaces) {
                for (let l = 0; l < this.labelFaces.length; l++) {
                    const indices = this.labelFaces[l];
                    if (indices) {
                        for (let i = 0; i < indices.length; i++) {
                            if (indices[i] < this.faceCount) {
                                actualFaceLabels[indices[i]] = l;
                            }
                        }
                    }
                }
            }
            dataBlocks.push(actualFaceLabels);
        }

        if (this.hadOriginalFaceInfos) {
            const faceInfosData = this.faceInfo
                ? Uint8Array.from(this.faceInfo)
                : new Uint8Array(this.faceCount).fill(0);
            dataBlocks.push(faceInfosData);
        }

    if (this.hadOriginalVertexLabels) {
        let actualVertexLabels = new Uint8Array(this.vertexCount).fill(0);

        if ((this as any).vertexLabelForExport instanceof Int32Array) {
            const src = (this as any).vertexLabelForExport as Int32Array;
            for (let i = 0; i < this.vertexCount && i < src.length; i++) {
                actualVertexLabels[i] = src[i];
            }
        } else if (this.labelVertices) {
            for (let l = 0; l < this.labelVertices.length; l++) {
                const indices = this.labelVertices[l];
                if (indices) {
                    for (let i = 0; i < indices.length; i++) {
                        if (indices[i] < this.vertexCount) {
                            actualVertexLabels[indices[i]] = l;
                        }
                    }
                }
            }
        }
        dataBlocks.push(actualVertexLabels);
        }

        if (this.hadOriginalFaceAlphas) {
            const faceAlphasData = this.faceAlpha
                ? Uint8Array.from(this.faceAlpha)
                : new Uint8Array(this.faceCount).fill(0);
            dataBlocks.push(faceAlphasData);
        }
        dataBlocks.push(faceVertexIndicesData);

        const faceColorsPacket = new Packet(new Uint8Array(this.faceCount * 2));
        const colorsToExport = this.originalFaceColor
            ? this.originalFaceColor
            : this.faceColor;

        if (colorsToExport) {
            for (let i = 0; i < this.faceCount; i++) {
                faceColorsPacket.p2(colorsToExport[i]);
            }
        } else {
            for (let i = 0; i < this.faceCount; i++) faceColorsPacket.p2(0);
        }

        const faceColorsData = faceColorsPacket.data;
        dataBlocks.push(faceColorsData);

        const texturedFaceDataPacket = new Packet(
            new Uint8Array(this.texturedFaceCount * 6)
        );
        for (let i = 0; i < this.texturedFaceCount; i++) {
            texturedFaceDataPacket.p2(this.texturedVertexA[i]);
            texturedFaceDataPacket.p2(this.texturedVertexB[i]);
            texturedFaceDataPacket.p2(this.texturedVertexC[i]);
        }
        const texturedFaceData = texturedFaceDataPacket.data;
        dataBlocks.push(texturedFaceData);

        dataBlocks.push(vertexXData);
        dataBlocks.push(vertexYData);
        dataBlocks.push(vertexZData);

        let totalDataLength = 0;
        for (let i = 0; i < dataBlocks.length; i++) {
            totalDataLength += dataBlocks[i].length;
        }

        const footerPacket = new Packet(new Uint8Array(18));
        footerPacket.p2(this.vertexCount);
        footerPacket.p2(this.faceCount);
        footerPacket.p1(this.texturedFaceCount);

        const footerHasInfo = this.hadOriginalFaceInfos ? 1 : 0;
        footerPacket.p1(footerHasInfo);

        let priorityFlagForFooter: number;
        if (this.hadOriginalFacePriorities) {
            priorityFlagForFooter = 255;
        } else {
            priorityFlagForFooter = this.priorityVal;
        }
        footerPacket.p1(priorityFlagForFooter);

        const footerHasAlpha = this.hadOriginalFaceAlphas ? 1 : 0;
        footerPacket.p1(footerHasAlpha);
        const footerHasFaceLabels = this.hadOriginalFaceLabels ? 1 : 0;
        footerPacket.p1(footerHasFaceLabels);
        const footerHasVertexLabels = this.hadOriginalVertexLabels ? 1 : 0;
        footerPacket.p1(footerHasVertexLabels);

        footerPacket.p2(vertexXData.length);
        footerPacket.p2(vertexYData.length);
        footerPacket.p2(vertexZData.length);
        footerPacket.p2(faceVertexIndicesData.length);
        const footerData = footerPacket.data;

        const finalOb2Data = new Uint8Array(totalDataLength + footerData.length);
        let currentOffset = 0;
        for (const block of dataBlocks) {
            finalOb2Data.set(block, currentOffset);
            currentOffset += block.length;
        }
        finalOb2Data.set(footerData, currentOffset);
        return finalOb2Data;
    }

    public saveCurrentVerticesAsOriginal(): void {
        if (
            this.baseScaleX !== 128 ||
            this.baseScaleY !== 128 ||
            this.baseScaleZ !== 128
        ) {
            this.originalVertexX = new Int32Array(this.vertexCount);
            this.originalVertexY = new Int32Array(this.vertexCount);
            this.originalVertexZ = new Int32Array(this.vertexCount);

            for (let i = 0; i < this.vertexCount; i++) {
                this.originalVertexX[i] =
                    ((this.vertexX[i] * 128) / this.baseScaleX) | 0;
                this.originalVertexY[i] =
                    ((this.vertexY[i] * 128) / this.baseScaleY) | 0;
                this.originalVertexZ[i] =
                    ((this.vertexZ[i] * 128) / this.baseScaleZ) | 0;
            }
        } else {
            this.originalVertexX = new Int32Array(this.vertexX);
            this.originalVertexY = new Int32Array(this.vertexY);
            this.originalVertexZ = new Int32Array(this.vertexZ);
        }

        if (this.partMapping && this.partMapping.isNpcModel) {
            this.updateAllPartVertices();
        }
    }

    public resetToOriginal(): void {
        this.vertexX.set(this.originalVertexX);
        this.vertexY.set(this.originalVertexY);
        this.vertexZ.set(this.originalVertexZ);

        this.currentScaleX = this.baseScaleX;
        this.currentScaleY = this.baseScaleY;
        this.currentScaleZ = this.baseScaleZ;

        if (this.partMapping && this.partMapping.isNpcModel) {
            for (const part of this.partMapping.parts) {
                part.originalModel.resetToOriginal();
            }
        }
    }

    private static processVertices(
        vertexX: Int32Array,
        vertexY: Int32Array,
        vertexZ: Int32Array,
        vertexCount: number,
        xData: Uint8Array,
        yData: Uint8Array,
        zData: Uint8Array,
        vertexFlags: Uint8Array
    ): void {
        const dataX = new Packet(xData);
        const dataY = new Packet(yData);
        const dataZ = new Packet(zData);

        let dx = 0;
        let dy = 0;
        let dz = 0;

        for (let v = 0; v < vertexCount; v++) {
            const flags = vertexFlags[v];

            let a = 0;
            if ((flags & 1) !== 0) {
                a = dataX.gsmart();
            }
            let b = 0;
            if ((flags & 2) !== 0) {
                b = dataY.gsmart();
            }
            let c = 0;
            if ((flags & 4) !== 0) {
                c = dataZ.gsmart();
            }

            const x = dx + a;
            const y = dy + b;
            const z = dz + c;

            dx = x;
            dy = y;
            dz = z;

            vertexX[v] = x;
            vertexY[v] = y;
            vertexZ[v] = z;
        }
    }

    private static processFaces(
        faceVertexA: Int32Array,
        faceVertexB: Int32Array,
        faceVertexC: Int32Array,
        faceCount: number,
        faceVertexDataArray: Uint8Array,
        faceOrientationArray: Uint8Array
    ): void {
        const vertexData = new Packet(faceVertexDataArray);
        const orientationData = new Packet(faceOrientationArray);

        let lastA = 0;
        let lastB = 0;
        let lastC = 0;
        let last = 0;

        for (let f = 0; f < faceCount; f++) {
            const orientation = orientationData.g1();

            if (orientation === 1) {
                lastA = vertexData.gsmart() + last;
                last = lastA;
                lastB = vertexData.gsmart() + last;
                last = lastB;
                lastC = vertexData.gsmart() + last;
                last = lastC;
            } else if (orientation === 2) {
                lastB = lastC;
                lastC = vertexData.gsmart() + last;
                last = lastC;
            } else if (orientation === 3) {
                lastA = lastC;
                lastC = vertexData.gsmart() + last;
                last = lastC;
            } else if (orientation === 4) {
                const temp = lastA;
                lastA = lastB;
                lastB = temp;
                lastC = vertexData.gsmart() + last;
                last = lastC;
            }
            faceVertexA[f] = lastA;
            faceVertexB[f] = lastB;
            faceVertexC[f] = lastC;
        }
    }

    private static processColors(
        faceColor: Int32Array,
        faceCount: number,
        faceColorsData: Uint8Array
    ): void {
        const colorPacket = new Packet(faceColorsData);

        for (let f = 0; f < faceCount; f++) {
            const color = colorPacket.g2();
            faceColor[f] = color;
        }
    }

    private static processTextures(
        texturedVertexA: Int32Array,
        texturedVertexB: Int32Array,
        texturedVertexC: Int32Array,
        texturedFaceCount: number,
        texturedFaceRawData: Uint8Array
    ): void {
        if (texturedFaceCount === 0) {
            return;
        }

        const textureData = new Packet(texturedFaceRawData);

        for (let i = 0; i < texturedFaceCount; i++) {
            texturedVertexA[i] = textureData.g2();
            texturedVertexB[i] = textureData.g2();
            texturedVertexC[i] = textureData.g2();
        }
    }

    exportNpcParts(): Map<number, Uint8Array> | null {
        if (!this.partMapping || !this.partMapping.isNpcModel) {
            return null;
        }

        const partExports = new Map<number, Uint8Array>();

        for (const part of this.partMapping.parts) {
            const exportedModel = this.extractModelPart(part);
            if (exportedModel) {
                const ob2Data = exportedModel.exportToOb2();
                partExports.set(part.partIndex, ob2Data);
            }
        }

        return partExports;
    }

    private extractModelPart(part: ModelPart): Model | null {
        if (!this.partMapping) {
            return null;
        }
        return part.originalModel.clone();
    }

    public updateVertex(
        vertexIndex: number,
        x: number,
        y: number,
        z: number
    ): void {
        if (vertexIndex >= 0 && vertexIndex < this.vertexCount) {
            this.vertexX[vertexIndex] = x;
            this.vertexY[vertexIndex] = y;
            this.vertexZ[vertexIndex] = z;

            if (
                this.currentScaleX !== 128 ||
                this.currentScaleY !== 128 ||
                this.currentScaleZ !== 128
            ) {
                this.originalVertexX[vertexIndex] = ((x * 128) / this.baseScaleX) | 0;
                this.originalVertexY[vertexIndex] = ((y * 128) / this.baseScaleY) | 0;
                this.originalVertexZ[vertexIndex] = ((z * 128) / this.baseScaleZ) | 0;
            } else {
                this.originalVertexX[vertexIndex] = x;
                this.originalVertexY[vertexIndex] = y;
                this.originalVertexZ[vertexIndex] = z;
            }

            if (this.partMapping && this.partMapping.isNpcModel) {
                this.updateAllPartVertices();
            }
        }
    }

    private updateAllPartVertices(): void {
        if (!this.partMapping) {
            return;
        }

        for (const part of this.partMapping.parts) {
            this.updatePartVertices(part);
        }
    }

    private updatePartVertices(part: ModelPart): void {
        for (const [originalVertexIdx, combinedVertexIdx] of part.vertexMapping) {
            if (combinedVertexIdx < this.vertexCount) {
                part.originalModel.vertexX[originalVertexIdx] =
                    this.vertexX[combinedVertexIdx];
                part.originalModel.vertexY[originalVertexIdx] =
                    this.vertexY[combinedVertexIdx];
                part.originalModel.vertexZ[originalVertexIdx] =
                    this.vertexZ[combinedVertexIdx];
            }
        }
        part.originalModel.originalVertexX = new Int32Array(
            part.originalModel.vertexX
        );
        part.originalModel.originalVertexY = new Int32Array(
            part.originalModel.vertexY
        );
        part.originalModel.originalVertexZ = new Int32Array(
            part.originalModel.vertexZ
        );
    }

    public clone(): Model {
        const modelTypeData: ModelType = {
            vertexCount: this.vertexCount,
            vertexX: new Int32Array(this.vertexX),
            vertexY: new Int32Array(this.vertexY),
            vertexZ: new Int32Array(this.vertexZ),
            faceCount: this.faceCount,
            faceVertexA: new Int32Array(this.faceVertexA),
            faceVertexB: new Int32Array(this.faceVertexB),
            faceVertexC: new Int32Array(this.faceVertexC),
            faceColorA: this.faceColorA ? new Int32Array(this.faceColorA) : null,
            faceColorB: this.faceColorB ? new Int32Array(this.faceColorB) : null,
            faceColorC: this.faceColorC ? new Int32Array(this.faceColorC) : null,
            faceInfo: this.faceInfo ? new Int32Array(this.faceInfo) : null,
            facePriority: this.facePriority
                ? new Int32Array(this.facePriority)
                : null,
            faceAlpha: this.faceAlpha ? new Int32Array(this.faceAlpha) : null,
            faceColor: this.faceColor ? new Int32Array(this.faceColor) : null,
            priorityVal: this.priorityVal,
            texturedFaceCount: this.texturedFaceCount,
            texturedVertexA: new Int32Array(this.texturedVertexA),
            texturedVertexB: new Int32Array(this.texturedVertexB),
            texturedVertexC: new Int32Array(this.texturedVertexC),
            minX: this.minX,
            maxX: this.maxX,
            minZ: this.minZ,
            maxZ: this.maxZ,
            radius: this.radius,
            minY: this.minY,
            maxY: this.maxY,
            maxDepth: this.maxDepth,
            minDepth: this.minDepth,
            vertexLabel: this.vertexLabel ? new Int32Array(this.vertexLabel) : null,
            faceLabel: this.faceLabel ? new Int32Array(this.faceLabel) : null,
            labelVertices: null,
            labelFaces: null,
            vertexNormal: null,
            vertexNormalOriginal: null,
        };

        const newModel = new Model(modelTypeData);

        newModel.currentScaleX = this.currentScaleX;
        newModel.currentScaleY = this.currentScaleY;
        newModel.currentScaleZ = this.currentScaleZ;
        newModel.baseScaleX = this.baseScaleX;
        newModel.baseScaleY = this.baseScaleY;
        newModel.baseScaleZ = this.baseScaleZ;
        newModel.wireFrame = this.wireFrame;

        if (this.partMapping) {
            newModel.partMapping = {
                parts: this.partMapping.parts.map((part) => ({
                    ...part,
                    originalModel: part.originalModel.clone(),
                    vertexMapping: new Map(part.vertexMapping),
                })),
                isNpcModel: this.partMapping.isNpcModel,
                npcId: this.partMapping.npcId,
            };
        }

        newModel.originalVertexX = new Int32Array(this.originalVertexX);
        newModel.originalVertexY = new Int32Array(this.originalVertexY);
        newModel.originalVertexZ = new Int32Array(this.originalVertexZ);

        if (this.originalFaceColor) {
            newModel.originalFaceColor = new Int32Array(this.originalFaceColor);
        } else if (this.faceColor) {
            newModel.originalFaceColor = new Int32Array(this.faceColor);
        }

        if (this.labelVertices) {
            newModel.labelVertices = this.labelVertices.map((group) =>
                group ? new Int32Array(group) : null
            );
        }
        if (this.labelFaces) {
            newModel.labelFaces = this.labelFaces.map((group) =>
                group ? new Int32Array(group) : null
            );
        }

        if (this.vertexNormal) {
            newModel.vertexNormal = this.vertexNormal.map((vn) => {
                if (vn) {
                    const newVn = new VertexNormal();
                    newVn.x = vn.x;
                    newVn.y = vn.y;
                    newVn.z = vn.z;
                    newVn.w = vn.w;
                    return newVn;
                }
                return null;
            });
        }
        if (this.vertexNormalOriginal) {
            newModel.vertexNormalOriginal = this.vertexNormalOriginal.map((vn) => {
                if (vn) {
                    const newVn = new VertexNormal();
                    newVn.x = vn.x;
                    newVn.y = vn.y;
                    newVn.z = vn.z;
                    newVn.w = vn.w;
                    return newVn;
                }
                return null;
            });
        }

        newModel.objRaise = this.objRaise;
        newModel.pickable = this.pickable;
        newModel.pickedFace = this.pickedFace;
        newModel.pickedFaceDepth = this.pickedFaceDepth;
        newModel.faceTextures.set(this.faceTextures);

        newModel.hadOriginalFaceLabels = this.hadOriginalFaceLabels;
        newModel.hadOriginalVertexLabels = this.hadOriginalVertexLabels;
        newModel.hadOriginalFacePriorities = this.hadOriginalFacePriorities;
        newModel.hadOriginalFaceAlphas = this.hadOriginalFaceAlphas;
        newModel.hadOriginalFaceInfos = this.hadOriginalFaceInfos;

        return newModel;
    }
}
