import AnimBase from '#/dash3d/AnimBase.js';

import Packet from '#/io/Packet.js';

export default class AnimFrame {
    static instances: AnimFrame[] = [];
    delay: number = -1;
    base: AnimBase | null = null;
    length: number = 0;
    groups: Int32Array | null = null;
    x: Int32Array | null = null;
    y: Int32Array | null = null;
    z: Int32Array | null = null;

    static init(total: number) {
        this.instances = new Array(total + 1);
    }

    static unpack(data: Uint8Array) {
        const buf = new Packet(data);
        buf.pos = data.length - 8;

        const headLength = buf.g2();
        const tran1Length = buf.g2();
        const tran2Length = buf.g2();
        const delLength = buf.g2();
        let pos = 0;

		const head = new Packet(data);
		head.pos = pos;
		pos += headLength + 2;

		const tran1 = new Packet(data);
		tran1.pos = pos;
		pos += tran1Length;

		const tran2 = new Packet(data);
		tran2.pos = pos;
		pos += tran2Length;

		const del = new Packet(data);
		del.pos = pos;
		pos += delLength;

		const baseBuf = new Packet(data);
		baseBuf.pos = pos;
		const base = new AnimBase(baseBuf);

        const total = head.g2();
        const labels: Int32Array = new Int32Array(500);
        const x: Int32Array = new Int32Array(500);
        const y: Int32Array = new Int32Array(500);
        const z: Int32Array = new Int32Array(500);

        for (let i: number = 0; i < total; i++) {
            const id: number = head.g2();

            const frame: AnimFrame = (this.instances[id] = new AnimFrame());
            frame.delay = del.g1();
            frame.base = base;

            const groupCount: number = head.g1();
            let lastGroup: number = -1;
            let current: number = 0;

            for (let j: number = 0; j < groupCount; j++) {
                if (!base.types) {
                    throw new Error();
                }

                const flags: number = tran1.g1();
                if (flags > 0) {
                    if (base.types[j] !== 0) {
                        for (let group: number = j - 1; group > lastGroup; group--) {
                            if (base.types[group] === 0) {
                                labels[current] = group;
                                x[current] = 0;
                                y[current] = 0;
                                z[current] = 0;
                                current++;
                                break;
                            }
                        }
                    }

                    labels[current] = j;

                    let defaultValue: number = 0;
                    if (base.types[labels[current]] === 3) {
                        defaultValue = 128;
                    }

                    if ((flags & 0x1) === 0) {
                        x[current] = defaultValue;
                    } else {
                        x[current] = tran2.gsmart();
                    }

                    if ((flags & 0x2) === 0) {
                        y[current] = defaultValue;
                    } else {
                        y[current] = tran2.gsmart();
                    }

                    if ((flags & 0x4) === 0) {
                        z[current] = defaultValue;
                    } else {
                        z[current] = tran2.gsmart();
                    }

                    lastGroup = j;
                    current++;
                }
            }

            frame.length = current;
            frame.groups = new Int32Array(current);
            frame.x = new Int32Array(current);
            frame.y = new Int32Array(current);
            frame.z = new Int32Array(current);

            for (let j: number = 0; j < current; j++) {
                frame.groups[j] = labels[j];
                frame.x[j] = x[j];
                frame.y[j] = y[j];
                frame.z[j] = z[j];
            }
        }
    }

    static get(id: number) {
        return AnimFrame.instances[id];
    }
}
