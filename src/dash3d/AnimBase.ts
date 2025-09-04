import Packet from '#/io/Packet.js';

import { TypedArray1d } from '#/util/Arrays.js';

export default class AnimBase {
    length: number = 0;
    types: Uint8Array | null = null;
    labels: (Uint8Array | null)[] | null = null;

    constructor(buf: Packet) {
        this.length = buf.g1();

        this.types = new Uint8Array(this.length);
        this.labels = new TypedArray1d(this.length, null);

        for (let i = 0; i < this.length; i++) {
            this.types[i] = buf.g1();
        }

        for (let i = 0; i < this.length; i++) {
            const count = buf.g1();
            this.labels[i] = new Uint8Array(count);

            for (let j = 0; j < count; j++) {
                this.labels[i]![j] = buf.g1();
            }
        }
    }
}
