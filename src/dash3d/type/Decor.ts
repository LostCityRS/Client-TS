import Model from '#/graphics/Model.js';

export default class Decor {
    readonly y: number;
    x: number;
    z: number;
    readonly spans: number;
    readonly angle: number;
    model: Model;
    readonly typecode: number;
    readonly info: number; // byte

    constructor(y: number, x: number, z: number, spans: number, angle: number, model: Model, typecode: number, info: number) {
        this.y = y;
        this.x = x;
        this.z = z;
        this.spans = spans;
        this.angle = angle;
        this.model = model;
        this.typecode = typecode;
        this.info = info;
    }
}
