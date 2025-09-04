import ModelSource from '#/dash3d/ModelSource.js';

export default class GroundObject {
    readonly y: number;
    readonly x: number;
    readonly z: number;
    readonly topObj: ModelSource | null;
    readonly middleObj: ModelSource | null;
    readonly bottomObj: ModelSource | null;
    readonly typecode: number;
    readonly offset: number;

    constructor(y: number, x: number, z: number, topObj: ModelSource | null, middleObj: ModelSource | null, bottomObj: ModelSource | null, typecode: number, offset: number) {
        this.y = y;
        this.x = x;
        this.z = z;
        this.topObj = topObj;
        this.middleObj = middleObj;
        this.bottomObj = bottomObj;
        this.typecode = typecode;
        this.offset = offset;
    }
}
