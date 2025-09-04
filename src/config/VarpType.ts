import { ConfigType } from '#/config/ConfigType.js';

import Jagfile from '#/io/Jagfile.js';
import Packet from '#/io/Packet.js';

export default class VarpType extends ConfigType {
    static count: number = 0;
    static types: VarpType[] = [];
    static code3s: number[] = [];
    static code3Count: number = 0;
    code1: number = 0;
    code2: number = 0;
    code3: boolean = false;
    code4: boolean = true;
    clientcode: number = 0;
    code7: number = 0;
    code6: boolean = false;
    code8: boolean = false;
    code11: boolean = false;

    static unpack(config: Jagfile): void {
        const dat: Packet = new Packet(config.read('varp.dat'));
        this.count = dat.g2();
        for (let i: number = 0; i < this.count; i++) {
            this.types[i] = new VarpType(i).unpackType(dat);
        }
    }

    unpack(code: number, dat: Packet): void {
        if (code === 1) {
            this.code1 = dat.g1();
        } else if (code === 2) {
            this.code2 = dat.g1();
        } else if (code === 3) {
            this.code3 = true;
            VarpType.code3s[VarpType.code3Count++] = this.id;
        } else if (code === 4) {
            this.code4 = false;
        } else if (code === 5) {
            this.clientcode = dat.g2();
        } else if (code === 6) {
            this.code6 = true;
        } else if (code === 7) {
            this.code7 = dat.g4();
        } else if (code === 8) {
            this.code8 = true;
            this.code11 = true;
        } else if (code === 10) {
            this.debugname = dat.gjstr();
        } else if (code === 11) {
            this.code11 = true;
        } else {
            console.log('Error unrecognised config code: ', code);
        }
    }
}
