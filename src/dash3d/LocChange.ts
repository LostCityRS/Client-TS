import Linkable from '#/datastruct/Linkable.js';

export default class LocChange extends Linkable {
    endTime: number = -1;

    newType: number = 0;
    newAngle: number = 0;
    newShape: number = 0;

    level: number = 0;
    layer: number = 0;
    x: number = 0;
    z: number = 0;

    oldType: number = 0;
    oldAngle: number = 0;
    oldShape: number = 0;

    startTime: number = 0;
}
