import { ConfigType } from '#/config/ConfigType.js';

import AnimFrame from '#/graphics/AnimFrame.js';

import Jagfile from '#/io/Jagfile.js';
import Packet from '#/io/Packet.js';

export const enum PreanimMove {
    DELAYMOVE = 0,
    DELAYANIM = 1,
    MERGE = 2
}

export const enum PostanimMove {
    DELAYMOVE = 0,
    ABORTANIM = 1,
    MERGE = 2
}

export const enum RestartMode {
    RESET = 1,
    RESETLOOP = 2
}

export default class SeqType extends ConfigType {
    static totalCount: number = 0;
    static instances: SeqType[] = [];

    seqFrameCount: number = 0;
    seqFrames: Int16Array | null = null;
    seqIframes: Int16Array | null = null;
    seqDelay: Int16Array | null = null;
    replayoff: number = -1;
    walkmerge: Int32Array | null = null;
    stretches: boolean = false;
    seqPriority: number = 5;
    righthand: number = -1;
    lefthand: number = -1;
    replaycount: number = 99;
    seqDuration: number = 0;
    preanimMove: number = -1;
    postanimMove: number = -1;
    restartMode: number = -1;


    static unpack(config: Jagfile): void {
        const dat: Packet = new Packet(config.read('seq.dat'));
        this.totalCount = dat.g2();
        for (let i: number = 0; i < this.totalCount; i++) {
            const seq: SeqType = new SeqType(i).unpackType(dat);
            
            if (seq.preanimMove === -1) {
                if (seq.walkmerge === null) {
                    seq.preanimMove = PreanimMove.DELAYMOVE;
                } else {
                    seq.preanimMove = PreanimMove.MERGE;
                }
            }

            if (seq.postanimMove === -1) {
                if (seq.walkmerge === null) {
                    seq.preanimMove = PostanimMove.DELAYMOVE;
                } else {
                    seq.postanimMove = PostanimMove.MERGE;
                }
            }

            if (seq.seqFrameCount === 0) {
                seq.seqFrameCount = 1;

                seq.seqFrames = new Int16Array(1);
                seq.seqFrames[0] = -1;

                seq.seqIframes = new Int16Array(1);
                seq.seqIframes[0] = -1;

                seq.seqDelay = new Int16Array(1);
                seq.seqDelay[0] = -1;
            }
            this.instances[i] = seq;
        }
    }

    unpack(code: number, dat: Packet): void {
        if (code === 1) {
            this.seqFrameCount = dat.g1();
            this.seqFrames = new Int16Array(this.seqFrameCount);
            this.seqIframes = new Int16Array(this.seqFrameCount);
            this.seqDelay = new Int16Array(this.seqFrameCount);

            for (let i: number = 0; i < this.seqFrameCount; i++) {
                this.seqFrames[i] = dat.g2();

                this.seqIframes[i] = dat.g2();
                if (this.seqIframes[i] === 65535) {
                    this.seqIframes[i] = -1;
                }

                this.seqDelay[i] = dat.g2();
                if (this.seqDelay[i] === 0) {
                    this.seqDelay[i] = AnimFrame.instances[this.seqFrames[i]].frameDelay;
                }

                if (this.seqDelay[i] === 0) {
                    this.seqDelay[i] = 1;
                }

                this.seqDuration += this.seqDelay[i];
            }
        } else if (code === 2) {
            this.replayoff = dat.g2();
        } else if (code === 3) {
            const count: number = dat.g1();
            this.walkmerge = new Int32Array(count + 1);

            for (let i: number = 0; i < count; i++) {
                this.walkmerge[i] = dat.g1();
            }

            this.walkmerge[count] = 9999999;
        } else if (code === 4) {
            this.stretches = true;
        } else if (code === 5) {
            this.seqPriority = dat.g1();
        } else if (code === 6) {
            this.righthand = dat.g2();
        } else if (code === 7) {
            this.lefthand = dat.g2();
        } else if (code === 8) {
            this.replaycount = dat.g1();
        } else if (code === 9) {
            this.preanimMove = dat.g1();
        } else if (code === 10) {
            this.postanimMove = dat.g1();
        } else if (code === 11) {
            this.restartMode = dat.g1();
            console.log('Error unrecognised seq config code: ', code);
        }
    }
}
