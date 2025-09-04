import { BZip2 } from '#3rdparty/deps.js';

import Packet from '#/io/Packet.js';

export default class Jagfile {
    static genHash(name: string): number {
        let hash: number = 0;
        name = name.toUpperCase();
        for (let i: number = 0; i < name.length; i++) {
            hash = (hash * 61 + name.charCodeAt(i) - 32) | 0; // wtf?
        }
        return hash;
    }
    jagSrc: Uint8Array;
    compressedWhole: boolean;
    fileCount: number;
    fileHash: number[];
    fileUnpackedSize: number[];
    filePackedSize: number[];
    fileOffset: number[];
    fileUnpacked: Uint8Array[] = [];

    constructor(src: Uint8Array) {
        let data: Packet = new Packet(new Uint8Array(src));
        const unpackedSize: number = data.g3();
        const packedSize: number = data.g3();

        if (unpackedSize === packedSize) {
            this.jagSrc = src;
            this.compressedWhole = false;
        } else {
            this.jagSrc = BZip2.decompress(src.subarray(6), unpackedSize, true);
            data = new Packet(new Uint8Array(this.jagSrc));
            this.compressedWhole = true;
        }

        this.fileCount = data.g2();
        this.fileHash = [];
        this.fileUnpackedSize = [];
        this.filePackedSize = [];
        this.fileOffset = [];

        let offset: number = data.pos + this.fileCount * 10;
        for (let i: number = 0; i < this.fileCount; i++) {
            this.fileHash.push(data.g4());
            this.fileUnpackedSize.push(data.g3());
            this.filePackedSize.push(data.g3());
            this.fileOffset.push(offset);
            offset += this.filePackedSize[i];
        }
    }

    read(name: string): Uint8Array | null {
        const hash: number = Jagfile.genHash(name);
        const index: number = this.fileHash.indexOf(hash);
        if (index === -1) {
            return null;
        }
        return this.readIndex(index);
    }

    readIndex(index: number): Uint8Array | null {
        if (index < 0 || index >= this.fileCount) {
            return null;
        }

        if (this.fileUnpacked[index]) {
            return this.fileUnpacked[index];
        }

        const offset: number = this.fileOffset[index];
        const length: number = offset + this.filePackedSize[index];
        const src: Uint8Array = new Uint8Array(this.jagSrc.subarray(offset, offset + length));
        if (this.compressedWhole) {
            this.fileUnpacked[index] = src;
            return src;
        } else {
            const data: Uint8Array = BZip2.decompress(src, this.fileUnpackedSize[index], true);
            this.fileUnpacked[index] = data;
            return data;
        }
    }
}
