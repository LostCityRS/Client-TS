import Entity from '#/dash3d/entity/Entity.js';

import Model from '#/graphics/Model.js';

export default class Location {
    // constructor
    readonly locLevel: number;
    readonly y: number;
    readonly x: number;
    readonly z: number;
    model: Model | null;
    readonly entity: Entity | null;
    readonly yaw: number;
    readonly minSceneTileX: number;
    readonly maxSceneTileX: number;
    readonly minSceneTileZ: number;
    readonly maxSceneTileZ: number;
    readonly typecode: number;
    readonly info: number; // byte

    // runtime
    distance: number = 0;
    cycle: number = 0;

    constructor(level: number, y: number, x: number, z: number, model: Model | null, entity: Entity | null, yaw: number, minSceneTileX: number, maxSceneTileX: number, minSceneTileZ: number, maxSceneTileZ: number, typecode: number, info: number) {
        this.locLevel = level;
        this.y = y;
        this.x = x;
        this.z = z;
        this.model = model;
        this.entity = entity;
        this.yaw = yaw;
        this.minSceneTileX = minSceneTileX;
        this.maxSceneTileX = maxSceneTileX;
        this.minSceneTileZ = minSceneTileZ;
        this.maxSceneTileZ = maxSceneTileZ;
        this.typecode = typecode;
        this.info = info;
    }
}
