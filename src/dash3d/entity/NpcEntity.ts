import NpcType from '#/config/NpcType.js';
import SeqType from '#/config/SeqType.js';
import SpotAnimType from '#/config/SpotAnimType.js';

import PathingEntity from '#/dash3d/entity/PathingEntity.js';

import Model from '#/graphics/Model.js';

export const enum NpcUpdate {
    DAMAGE2 = 0x1,
    ANIM = 0x2,
    FACE_ENTITY = 0x4,
    SAY = 0x8,
    DAMAGE = 0x10,
    CHANGE_TYPE = 0x20,
    SPOTANIM = 0x40,
    FACE_COORD = 0x80
}

export default class NpcEntity extends PathingEntity {
    npcType: NpcType | null = null;

    draw(_loopCycle: number): Model | null {
        if (!this.npcType) {
            return null;
        }

        if (this.spotanimId === -1 || this.spotanimFrame === -1) {
            return this.getSequencedModel();
        }

        const model: Model | null = this.getSequencedModel();
        if (!model) {
            return null;
        }
        const spotanim: SpotAnimType = SpotAnimType.instances[this.spotanimId];

        const model1: Model = Model.modelShareColored(spotanim.getModel(), true, !spotanim.disposeAlpha, false);
        model1.translateModel(-this.spotanimOffset, 0, 0);
        model1.createLabelReferences();
        if (spotanim.seq && spotanim.seq.seqFrames) {
            model1.applyTransform(spotanim.seq.seqFrames[this.spotanimFrame]);
        }
        model1.labelFaces = null;
        model1.labelVertices = null;

        if (spotanim.resizeh !== 128 || spotanim.resizev !== 128) {
            model1.scale(spotanim.resizeh, spotanim.resizev, spotanim.resizeh);
        }

        model1.calculateNormals(64 + spotanim.ambient, 850 + spotanim.contrast, -30, -50, -30, true);
        const models: Model[] = [model, model1];

        const tmp: Model = Model.modelFromModelsBounds(models, 2);
        if (this.npcType.size === 1) {
            tmp.pickable = true;
        }

        return tmp;
    }

    isVisibleNow(): boolean {
        return this.npcType !== null;
    }

    private getSequencedModel(): Model | null {
        if (!this.npcType) {
            return null;
        }
        if (this.primarySeqId >= 0 && this.primarySeqDelay === 0) {
            const frames: Int16Array | null = SeqType.instances[this.primarySeqId].seqFrames;
            if (frames) {
                const primaryTransformId: number = frames[this.primarySeqFrame];
                let secondaryTransformId: number = -1;
                if (this.secondarySeqId >= 0 && this.secondarySeqId !== this.seqStandId) {
                    const secondFrames: Int16Array | null = SeqType.instances[this.secondarySeqId].seqFrames;
                    if (secondFrames) {
                        secondaryTransformId = secondFrames[this.secondarySeqFrame];
                    }
                }
                return this.npcType.getSequencedModel(primaryTransformId, secondaryTransformId, SeqType.instances[this.primarySeqId].walkmerge);
            }
        }

        let transformId: number = -1;
        if (this.secondarySeqId >= 0) {
            const secondFrames: Int16Array | null = SeqType.instances[this.secondarySeqId].seqFrames;
            if (secondFrames) {
                transformId = secondFrames[this.secondarySeqFrame];
            }
        }

        const model: Model | null = this.npcType.getSequencedModel(transformId, -1, null);
        if (!model) {
            return null;
        }
        this.maxY = model.maxY;
        return model;
    }
}
