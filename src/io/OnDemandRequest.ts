import DoublyLinkable from '#/datastruct/DoublyLinkable.js';

export default class OnDemandRequest extends DoublyLinkable {
    archive: number = 0;
    file: number = 0;
    data: Uint8Array | null = null;
    cycle: number = 0;
    urgent: boolean = true;
}
