import Packet from '#/io/Packet.js';

export abstract class ConfigType {
    id: number;
    debugname: string | null = null;

    constructor(id: number) {
        this.id = id;
    }

    abstract unpack(code: number, dat: Packet): void;

    unpackType(dat: Packet): this {
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const opcode: number = dat.g1();
            if (opcode === 0) {
                break;
            }
            this.unpack(opcode, dat);
        }
        return this;
    }
}
