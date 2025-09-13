import Linkable from '#/datastruct/Linkable.js';

export default class HashTable {
    readonly bucketCount: number;
    readonly buckets: Linkable[];

    constructor(size: number) {
        this.buckets = new Array(size);
        this.bucketCount = size;
        for (let i: number = 0; i < size; i++) {
            const sentinel = (this.buckets[i] = new Linkable());
            sentinel.next = sentinel;
            sentinel.prev = sentinel;
        }
    }

    get(key: bigint): Linkable | null {
        const start: Linkable = this.buckets[Number(key & BigInt(this.bucketCount - 1))];

        for (let node: Linkable | null = start.next; node !== start; node = node.next) {
            if (!node) {
                continue;
            }
            if (node.key === key) {
                return node;
            }
        }

        return null;
    }

    put(key: bigint, value: Linkable): void {
        if (value.prev) {
            value.unlink();
        }

        const sentinel: Linkable = this.buckets[Number(key & BigInt(this.bucketCount - 1))];
        value.prev = sentinel.prev;
        value.next = sentinel;
        if (value.prev) {
            value.prev.next = value;
        }
        value.next.prev = value;
        value.key = key;
    }
}
