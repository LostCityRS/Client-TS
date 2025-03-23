import SeqType from '#/config/SeqType.js';

import Linkable from '#/datastruct/Linkable.js';

export default class LocEntity extends Linkable {
    level: number;
    readonly layer: number;
    readonly x: number;
    readonly z: number;
    readonly index: number;
    readonly seq: SeqType;
    seqFrame: number;
    seqCycle: number;

    constructor(index: number, level: number, layer: number, x: number, z: number, seq: SeqType, randomFrame: boolean) {
        super();
        this.level = level;
        this.layer = layer;
        this.x = x;
        this.z = z;
        this.index = index;
        this.seq = seq;

        if (randomFrame && seq.replayoff !== -1 && this.seq.seqDelay) {
            this.seqFrame = (Math.random() * this.seq.seqFrameCount) | 0;
            this.seqCycle = (Math.random() * this.seq.seqDelay[this.seqFrame]) | 0;
        } else {
            this.seqFrame = -1;
            this.seqCycle = 0;
        }
    }
}
