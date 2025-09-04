import ModelSource from '#/dash3d/ModelSource.js';

export default class GroundDecor {
    readonly y: number;
    readonly x: number;
    readonly z: number;
    model: ModelSource | null;
    readonly typecode: number;
    readonly info: number; // byte

    constructor(y: number, x: number, z: number, model: ModelSource | null, typecode: number, info: number) {
        this.y = y;
        this.x = x;
        this.z = z;
        this.model = model;
        this.typecode = typecode;
        this.info = info;
    }
}
