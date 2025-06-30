import Jagfile from '#/io/Jagfile.js';
import Packet from '#/io/Packet.js';

import { TypedArray1d } from '#/util/Arrays.js';

export default class AnimBase {
    static instances: AnimBase[] = [];

    static unpack(models: Jagfile): void {
        const head: Packet = new Packet(models.read('base_head.dat'));
        const type: Packet = new Packet(models.read('base_type.dat'));
        const label: Packet = new Packet(models.read('base_label.dat'));

        const total: number = head.g2();
        head.pos += 2; // const count = head.g2();

        for (let i: number = 0; i < total; i++) {
            const id: number = head.g2();
            const length: number = head.g1();

            const transformTypes: Uint8Array = new Uint8Array(length);
            const groupLabels: (Uint8Array | null)[] = new TypedArray1d(length, null);

            for (let j: number = 0; j < length; j++) {
                transformTypes[j] = type.g1();

                const groupCount: number = label.g1();
                const labels: Uint8Array = new Uint8Array(groupCount);

                for (let k: number = 0; k < groupCount; k++) {
                    labels[k] = label.g1();
                }
                groupLabels[j] = labels;
            }

            this.instances[id] = new AnimBase();
            this.instances[id].animLength = length;
            this.instances[id].animTypes = transformTypes;
            this.instances[id].animLabels = groupLabels;
        }
    }

    static convertFromData(id: number, fileData: Packet) {
        fileData.pos = fileData.data.length - 4;
        const typeSectionLength = fileData.g2();
        const labelSectionLength = fileData.g2();

        fileData.pos = 0;

        const transformTypesData = new Uint8Array(typeSectionLength);
        fileData.gdata(transformTypesData, 0, typeSectionLength);

        const groupLabelsData = new Uint8Array(labelSectionLength);
        fileData.gdata(groupLabelsData, 0, labelSectionLength);

        const typePacket = new Packet(transformTypesData);
        const labelPacket = new Packet(groupLabelsData);

        const instance = new AnimBase();
        instance.animLength = typeSectionLength;

        const transformTypes = new Uint8Array(instance.animLength);
        const groupLabels = new TypedArray1d<Uint8Array | null>(
            instance.animLength,
            null
        );

        for (let j = 0; j < instance.animLength; j++) {
            transformTypes[j] = typePacket.g1();

            const groupCount = labelPacket.g1();
            const labels = new Uint8Array(groupCount);
            for (let k = 0; k < groupCount; k++) {
                labels[k] = labelPacket.g1();
            }
            groupLabels[j] = labels;
        }

        instance.animTypes = transformTypes;
        instance.animLabels = groupLabels;

        AnimBase.instances[id] = instance;
        return instance;
    }

    static convertFromData377(id: number, fileData: Packet): AnimBase {
        const instance = new AnimBase();
        instance.id = id;

        const length = fileData.g1();
        instance.animLength = length;

        const types = new Uint8Array(length);
        const labels = new Array<Uint8Array>(length);

        for (let i = 0; i < length; i++) {
            types[i] = fileData.g1();
        }

        for (let i = 0; i < length; i++) {
            const labelCount = fileData.g1();
            const groupLabels = new Uint8Array(labelCount);

            for (let j = 0; j < labelCount; j++) {
                groupLabels[j] = fileData.g1();
            }
            labels[i] = groupLabels;
        }

        instance.animTypes = types;
        instance.animLabels = labels;

        AnimBase.instances[id] = instance;
        return instance;
    }

    // ----

    id: number = 0;
    animLength: number = 0;
    animTypes: Uint8Array | null = null;
    animLabels: (Uint8Array | null)[] | null = null;
}
