import ObjType from '#/config/ObjType.js';
import type Model from '#/dash3d/Model.js';
import ModelSource from '#/dash3d/ModelSource.js';

export default class ClientObj extends ModelSource {
    readonly index: number;
    count: number;

    constructor(index: number, count: number) {
        super();
        this.index = index;
        this.count = count;
    }

    getModel(): Model | null {
        const obj = ObjType.get(this.index);
        return obj.getModel(this.count);
    }
}
