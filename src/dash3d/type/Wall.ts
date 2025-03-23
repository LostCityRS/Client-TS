import Model from '#/graphics/Model.js';

export default class Wall {
    readonly y: number;
    readonly x: number;
    readonly z: number;
    readonly spansA: number;
    readonly spansB: number;
    modelA: Model | null;
    modelB: Model | null;
    readonly typecode: number;
    readonly info: number; // byte

    constructor(y: number, x: number, z: number, spansA: number, spansB: number, modelA: Model | null, modelB: Model | null, typecode: number, info: number) {
        this.y = y;
        this.x = x;
        this.z = z;
        this.spansA = spansA;
        this.spansB = spansB;
        this.modelA = modelA;
        this.modelB = modelB;
        this.typecode = typecode;
        this.info = info;
    }
}
