import type { Client } from '#/client/Client.js';
import DoublyLinkList from '#/datastruct/DoublyLinkList.js';
import LinkList from '#/datastruct/LinkList.js';
import ClientStream from '#/io/ClientStream.js';
import type Jagfile from '#/io/Jagfile.js';
import OnDemandProvider from '#/io/OnDemandProvider.js';
import OnDemandRequest from '#/io/OnDemandRequest.js';
import Packet from '#/io/Packet.js';
import { downloadUrl, sleep } from '#/util/JsUtil';
import { gunzipSync, unzipSync } from '#3rdparty/deps.js';
import type { Unzipped } from 'fflate';

export default class OnDemand extends OnDemandProvider {
    modernized: boolean = true;
    zip: Unzipped | null = null;

    versions: number[][] = [];
    crcs: number[][] = [];
    priorities: number[][] = [];
    topPriority: number = 0;
    models: number[] = [];
    mapIndex: number[] = [];
    mapLand: number[] = [];
    mapLoc: number[] = [];
    mapMembers: number[] = [];
    animIndex: number[] = [];
    midiIndex: number[] = [];
    running: boolean = true;
    app: Client;
    active: boolean = false;
    importantCount: number = 0;
    requestCount: number = 0;
    requests: DoublyLinkList = new DoublyLinkList();
    queue: LinkList = new LinkList();
    missing: LinkList = new LinkList();
    pending: LinkList = new LinkList();
    completed: LinkList = new LinkList();
    prefetches: LinkList = new LinkList();
    message: string = '';
    buf: Uint8Array = new Uint8Array(500);
    data: Uint8Array = new Uint8Array(65000);
    loadedPrefetchFiles: number = 0;
    totalPrefetchFiles: number = 0;
    partOffset: number = 0;
    partAvailable: number = 0;
    waitCycles: number = 0;
    heartbeatCycle: number = 0;
    cycle: number = 0;
    socketOpenTime: number = 0;
    current: OnDemandRequest | null = null;
    stream: ClientStream | null = null;

    constructor(versionlist: Jagfile, app: Client) {
        super();

        const version: string[] = ['model_version', 'anim_version', 'midi_version', 'map_version'];
        for (let i = 0; i < 4; i++) {
            const data = versionlist.read(version[i]);
            if (!data) {
                throw new Error();
            }

            const count = data.length / 2;
            const buf = new Packet(data);

            this.versions[i] = new Array(count);
            this.priorities[i] = new Array(count);

            for (let j = 0; j < count; j++) {
                this.versions[i][j] = buf.g2();
            }
        }

        const crc: string[] = ['model_crc', 'anim_crc', 'midi_crc', 'map_crc'];
        for (let i = 0; i < 4; i++) {
            const data = versionlist.read(crc[i]);
            if (!data) {
                throw new Error();
            }

            const count = data.length / 4;
            const buf = new Packet(data);

            this.crcs[i] = new Array(count);

            for (let j = 0; j < count; j++) {
                this.crcs[i][j] = buf.g4();
            }
        }

        let data = versionlist.read('model_index');
        if (data) {
            const count = this.versions[0].length;
            this.models = new Array(count);

            for (let i = 0; i < count; i++) {
                if (i < data.length) {
                    this.models[i] = data[i];
                } else {
                    this.models[i] = 0;
                }
            }
        }

        data = versionlist.read('map_index');
        if (data) {
            const count = data.length / 7;
            const buf = new Packet(data);

            this.mapIndex = new Array(count);
            this.mapLand = new Array(count);
            this.mapLoc = new Array(count);
            this.mapMembers = new Array(count);

            for (let i = 0; i < count; i++) {
                this.mapIndex[i] = buf.g2();
                this.mapLand[i] = buf.g2();
                this.mapLoc[i] = buf.g2();
                this.mapMembers[i] = buf.g1();
            }
        }

        data = versionlist.read('anim_index');
        if (data) {
            const count = data.length / 2;
            const buf = new Packet(data);

            this.animIndex = new Array(count);
            for (let i = 0; i < count; i++) {
                this.animIndex[i] = buf.g2();
            }
        }

        data = versionlist.read('midi_index');
        if (data) {
            const count = data.length;
            const buf = new Packet(data);

            this.midiIndex = new Array(count);
            for (let i = 0; i < count; i++) {
                this.midiIndex[i] = buf.g1();
            }
        }

        this.app = app;
        this.running = true;
    }

    stop() {
        this.running = false;
    }

    getFileCount(archive: number) {
        return this.versions[archive].length;
    }

    getAnimCount() {
        return this.animIndex.length;
    }

    getMapFile(x: number, z: number, type: number) {
        const map = (x << 8) + z;

        for (let i = 0; i < this.mapIndex.length; i++) {
            if (this.mapIndex[i] === map) {
                if (type === 0) {
                    return this.mapLand[i];
                } else {
                    return this.mapLoc[i];
                }
            }
        }

        return -1;
    }

    async prefetchMaps(members: boolean) {
        const count = this.mapIndex.length;
        for (let i = 0; i < count; i++) {
            if (members || this.mapMembers[i] != 0) {
                await this.prefetchPriority(3, this.mapLoc[i], 2);
                await this.prefetchPriority(3, this.mapLand[i], 2);
            }
        }
    }

    hasMapLocFile(file: number) {
        for (let i = 0; i < this.mapIndex.length; i++) {
            if (this.mapLoc[i] === file) {
                return true;
            }
        }

        return false;
    }

    getModelFlags(id: number) {
        return this.models[id] & 0xFF;
    }

    shouldPrefetchMidi(id: number) {
        return this.midiIndex[id] === 1;
    }

    requestModel(id: number) {
        this.request(0, id);
    }

    request(archive: number, file: number) {
        if (archive < 0 || archive > this.versions.length || file < 0 || file > this.versions[archive].length || this.versions[archive][file] == 0) {
            return;
        }

        for (let req = this.requests.head() as OnDemandRequest | null; req !== null; req = this.requests.next() as OnDemandRequest | null) {
            if (req.archive == archive && req.file == file) {
                return;
            }
        }

        const req = new OnDemandRequest();
        req.archive = archive;
        req.file = file;
        req.urgent = true;

        this.queue.push(req);
        this.requests.push(req);
    }

    remaining() {
        return this.requests.size();
    }

    loop(): OnDemandRequest | null {
        const req = this.completed.pop() as OnDemandRequest | null;
        if (req === null) {
            return null;
        }

        req.unlink2();

        if (req.data === null) {
            return req;
        }

        req.data = gunzipSync(req.data.slice(0, req.data.length - 2));

        return req;
    }

    async prefetchPriority(archive: number, file: number, priority: number) {
        if (!this.app.db || this.versions[archive][file] === 0) {
            return;
        }

        const data = await this.app.db.read(archive + 1, file);
        if (this.validate(data, this.crcs[archive][file], this.versions[archive][file])) {
            return;
        }

        this.priorities[archive][file] = priority;
        if (priority > this.topPriority) {
            this.topPriority = priority;
        }

        this.totalPrefetchFiles++;
    }

    clearPrefetches() {
        this.prefetches.clear();
    }

    prefetch(archive: number, file: number) {
        if (!this.app.db || this.versions[archive][file] === 0 || this.priorities[archive][file] === 0 || this.topPriority === 0) {
            return;
        }

        const req = new OnDemandRequest();
        req.archive = archive;
        req.file = file;
        req.urgent = false;

        this.prefetches.push(req);
    }

    async run() {
        if (!this.running) {
            return;
        }

        this.cycle++;

        this.active = true;

        for (let i = 0; i < 100 && this.active; i++) {
            this.active = false;

            await this.handleQueue();
            await this.handlePending();

            if (this.importantCount === 0 && i >= 5) {
                break;
            }

            await this.handleExtras();
            await this.read();
        }

        let loading = false;

        for (let req = this.pending.head() as OnDemandRequest | null; req !== null; req = this.pending.next() as OnDemandRequest | null) {
            if (req.urgent) {
                loading = true;
                req.cycle++;

                if (req.cycle > 50) {
                    req.cycle = 0;
                    this.send(req);
                }
            }
        }

        if (!loading) {
            for (let req = this.pending.head() as OnDemandRequest | null; req !== null; req = this.pending.next() as OnDemandRequest | null) {
                loading = true;
                req.cycle++;

                if (req.cycle > 50) {
                    req.cycle = 0;
                    this.send(req);
                }
            }
        }

        if (loading) {
            this.waitCycles++;

            if (this.waitCycles > 750) {
                if (this.stream) {
                    this.stream.close();
                    this.stream = null;
                }

                this.partAvailable = 0;
            }
        } else {
            this.waitCycles = 0;
            this.message = '';
        }

        if (this.app.ingame && this.stream && (this.topPriority > 0 || !this.app.db)) {
            this.heartbeatCycle++;

            if (this.heartbeatCycle > 500) {
                this.heartbeatCycle = 0;

                this.buf[0] = 0;
                this.buf[1] = 0;
                this.buf[2] = 0;
                this.buf[3] = 10;

                this.stream.write(this.buf, 4);
            }
        }
    }

    async handleQueue() {
        let req = this.queue.pop() as OnDemandRequest | null;

        while (req !== null) {
            this.active = true;
            let data: Uint8Array | undefined;

            if (this.app.db) {
                data = await this.app.db.read(req.archive + 1, req.file);
            }

            if (!this.validate(data, this.crcs[req.archive][req.file], this.versions[req.archive][req.file])) {
                data = undefined;
            }

            if (!data) {
                this.missing.push(req);
            } else {
                req.data = data;
                this.completed.push(req);
            }

            req = this.queue.pop() as OnDemandRequest | null;
        }
    }

    async handlePending() {
        this.importantCount = 0;
        this.requestCount = 0;

        for (let req = this.pending.head() as OnDemandRequest | null; req !== null; req = this.pending.next() as OnDemandRequest | null) {
            if (req.urgent) {
                this.importantCount++;
            } else {
                this.requestCount++;
            }
        }

        while (this.importantCount < 10) {
            const req = this.missing.pop() as OnDemandRequest | null;
            if (req === null) {
                break;
            }

            if (this.priorities[req.archive][req.file] !== 0) {
                this.loadedPrefetchFiles++;
            }

            this.priorities[req.archive][req.file] = 0;
            this.pending.push(req);
            this.importantCount++;
            await this.send(req);
            this.active = true;
        }
    }

    async handleExtras() {
        while (this.importantCount === 0 && this.requestCount < 10) {
            if (this.topPriority === 0) {
                return;
            }

            let extra = this.prefetches.pop() as OnDemandRequest | null;
            while (extra !== null) {
                if (this.priorities[extra.archive][extra.file] != 0) {
                    this.priorities[extra.archive][extra.file] = 0;
                    this.pending.push(extra);
                    await this.send(extra);
                    this.active = true;

                    if (this.loadedPrefetchFiles < this.totalPrefetchFiles) {
                        this.loadedPrefetchFiles++;
                    }

                    this.message = 'Loading extra files - ' + ((this.loadedPrefetchFiles * 100 / this.totalPrefetchFiles) | 0) + '%';
                    this.requestCount++;

                    if (this.requestCount == 10) {
                        return;
                    }
                }

                extra = this.prefetches.pop() as OnDemandRequest | null;
            }

            for (let archive = 0; archive < 4; archive++) {
                const priorities = this.priorities[archive];
                const count = priorities.length;

                for (let i = 0; i < count; i++) {
                    if (priorities[i] == this.topPriority) {
                        priorities[i] = 0;

                        const req = new OnDemandRequest();
                        req.archive = archive;
                        req.file = i;
                        req.urgent = false;
                        this.pending.push(req);
                        await this.send(req);
                        this.active = true;

                        if (this.loadedPrefetchFiles < this.totalPrefetchFiles) {
                            this.loadedPrefetchFiles++;
                        }

                        this.message = 'Loading extra files - ' + ((this.loadedPrefetchFiles * 100 / this.totalPrefetchFiles) | 0) + '%';
                        this.requestCount++;

                        if (this.requestCount == 10) {
                            return;
                        }
                    }
                }
            }

            this.topPriority--;
        }
    }

    async read() {
        if (this.modernized) {
            for (let req = this.pending.head() as OnDemandRequest | null; req !== null; req = this.pending.next() as OnDemandRequest | null) {
                this.current = req;
                break;
            }

            if (this.current) {
                await this.downloadZip();

                if (!this.zip) {
                    return;
                }

                this.current.data = this.zip[`${this.current.archive + 1}.${this.current.file}`];

                if (!this.current.data) {
                    this.current.unlink();
                    this.current = null;
                    return;
                }

                if (this.app.db) {
                    await this.app.db.write(this.current.archive + 1, this.current.file, this.current.data);
                }

                if (!this.current.urgent && this.current.archive === 3) {
                    this.current.urgent = true;
                    this.current.archive = 93;
                }

                if (this.current.urgent) {
                    this.completed.push(this.current);
                } else {
                    this.current.unlink();
                }

                this.current = null;
            }
        } else {
            if (!this.stream) {
                return;
            }

            try {
                const available = this.stream.available;

                if (this.partAvailable === 0 && available >= 6) {
                    this.active = true;

                    await this.stream.readBytes(this.buf, 0, 6);
                    const archive = this.buf[0] & 0xFF;
                    const file = ((this.buf[1] & 0xFF) << 8) + (this.buf[2] & 0xFF);
                    const size = ((this.buf[3] & 0xFF) << 8) + (this.buf[4] & 0xFF);
                    const part = this.buf[5] & 0xFF;

                    this.current = null;

                    for (let req = this.pending.head() as OnDemandRequest | null; req !== null; req = this.pending.next() as OnDemandRequest | null) {
                        if (req.archive == archive && req.file == file) {
                            this.current = req;
                        }

                        if (this.current != null) {
                            req.cycle = 0;
                        }
                    }

                    if (this.current) {
                        this.waitCycles = 0;

                        if (size === 0) {
                            console.error('rej: ' + archive + ',' + file);

                            this.current.data = null;

                            if (this.current.urgent) {
                                this.completed.push(this.current);
                            } else {
                                this.current.unlink();
                            }

                            this.current = null;
                        } else {
                            if (this.current.data === null && part === 0) {
                                this.current.data = new Uint8Array(size);
                            }

                            if (this.current.data === null && part != 0) {
                                console.error('missing start of file');
                                throw new Error();
                            }
                        }
                    }

                    this.partOffset = part * 500;
                    this.partAvailable = 500;

                    if (this.partAvailable > size - part * 500) {
                        this.partAvailable = size - part * 500;
                    }
                }

                if (this.partAvailable > 0 && available >= this.partAvailable) {
                    this.active = true;

                    let dst = this.buf;
                    let off = 0;

                    if (this.current && this.current.data) {
                        dst = this.current.data;
                        off = this.partOffset;
                    }

                    await this.stream.readBytes(dst, off, this.partAvailable);

                    if (this.partAvailable + this.partOffset >= dst.length && this.current) {
                        if (this.app.db) {
                            this.app.db.write(this.current.archive + 1, this.current.file, dst);
                        }

                        if (!this.current.urgent && this.current.archive === 3) {
                            this.current.urgent = true;
                            this.current.archive = 93;
                        }

                        if (this.current.urgent) {
                            this.completed.push(this.current);
                        } else {
                            this.current.unlink();
                        }
                    }

                    this.partAvailable = 0;
                }
            } catch (err) {
                console.error(err);

                if (this.stream) {
                    this.stream.close();
                }

                this.stream = null;
                this.partAvailable = 0;
            }
        }
    }

    validate(src: Uint8Array | undefined, expectedCrc: number, expectedVersion: number) {
        if (typeof src === 'undefined' || src.length < 2) {
            return false;
        }

        const trailerPos = src.length - 2;

        const version = ((src[trailerPos] & 0xFF) << 8) + (src[trailerPos + 1] & 0xFF);
        const crc = Packet.getcrc(src, 0, src.length - 2);

        return version === expectedVersion && crc === expectedCrc;
    }

    async send(req: OnDemandRequest) {
        if (this.modernized) {
            // handled by the reader
            return;
        }

        try {
            if (this.stream === null) {
                const now = performance.now();
                if (now - this.socketOpenTime < 5000) {
                    return;
                }

                this.socketOpenTime = now;
                this.stream = new ClientStream(await ClientStream.openSocket(window.location.host, window.location.protocol === 'https:'));

                this.buf[0] = 15;
                this.stream.write(this.buf, 1);

                for (let i = 0; i < 8; i++) {
                    await this.stream.read();
                }

                this.waitCycles = 0;
            }

            this.buf[0] = req.archive;
            this.buf[1] = req.file >> 8;
            this.buf[2] = req.file;

            if (req.urgent) {
                this.buf[3] = 2;
            } else if (this.app.ingame) {
                this.buf[3] = 0;
            } else {
                this.buf[3] = 1;
            }

            this.stream.write(this.buf, 4);
            this.heartbeatCycle = 0;
        } catch (err) {
            console.error(err);

            this.stream = null;
            this.partAvailable = 0;
        }
    }

    async downloadZip() {
        while (!this.zip) {
            try {
                this.zip = unzipSync(await downloadUrl('/ondemand.zip'));
                break;
            } catch (_) {
                await sleep(1000);
            }
        }
    }

    async prefetchAll() {
        if (!this.app.db) {
            return;
        }

        let success = false;
        for (let retry = 0; retry < 3 && !success; retry++) {
            if (typeof (await this.app.db.read(2, 0)) !== 'undefined') {
                return;
            }

            try {
                const zip = unzipSync(await downloadUrl('/ondemand.zip'));

                for (let archive = 0; archive < 4; archive++) {
                    const count = this.versions[archive].length;

                    for (let file = 0; file < count; file++) {
                        const data = zip[`${archive + 1}.${file}`];
                        if (typeof data === 'undefined') {
                            continue;
                        }

                        const existing = await this.app.db.read(archive + 1, file);

                        if (!existing || !this.validate(existing, this.crcs[archive][file], this.versions[archive][file])) {
                            await this.app.db.write(archive + 1, file, data);
                        }
                    }
                }

                success = true;
            } catch (err) {
                console.error(err);
            }
        }
    }
}
