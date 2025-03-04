export default class ClientStream {
    // constructor
    private readonly socket: WebSocket;
    private readonly wsin: WebSocketReader;
    private readonly wsout: WebSocketWriter;

    // runtime
    private closed: boolean = false;
    private ioerror: boolean = false;

    static openSocket = async (host: string, secured: boolean): Promise<WebSocket> => {
        return await new Promise<WebSocket>((resolve, reject): void => {
            const protocol: string = secured ? 'wss' : 'ws';
            const ws: WebSocket = new WebSocket(`${protocol}://${host}`, 'binary');

            ws.addEventListener('open', (): void => {
                resolve(ws);
            });

            ws.addEventListener('error', (): void => {
                reject(ws);
            });
        });
    };

    constructor(socket: WebSocket) {
        socket.onclose = this.onclose;
        socket.onerror = this.onerror;
        this.wsin = new WebSocketReader(socket, 5000);
        this.wsout = new WebSocketWriter(socket, 5000);
        this.socket = socket;
    }

    get host(): string {
        return this.socket.url.split('/')[2];
    }

    get port(): number {
        return parseInt(this.socket.url.split(':')[2], 10);
    }

    get available(): number {
        return this.closed ? 0 : this.wsin.available;
    }

    write(src: Uint8Array, len: number): void {
        if (!this.closed) {
            this.wsout.write(src, len);
        }
    }

    async read(): Promise<number> {
        return this.closed ? 0 : await this.wsin.read();
    }

    async readBytes(dst: Uint8Array, off: number, len: number): Promise<void> {
        if (this.closed) {
            return;
        }
        await this.wsin.readBytes(dst, off, len);
    }

    close(): void {
        this.closed = true;
        this.socket.close();
        this.wsin.close();
        this.wsout.close();
    }

    private onclose = (event: CloseEvent): void => {
        if (this.closed) {
            return;
        }
        this.close();
    };

    private onerror = (event: Event): void => {
        if (this.closed) {
            return;
        }
        this.ioerror = true;
        this.close();
    };
}

class WebSocketWriter {
    // constructor
    private readonly socket: WebSocket;
    private readonly limit: number;

    private closed: boolean = false;
    private ioerror: boolean = false;

    constructor(socket: WebSocket, limit: number) {
        this.socket = socket;
        this.limit = limit;
    }

    write(src: Uint8Array, len: number): void {
        if (this.closed) {
            return;
        }
        if (this.ioerror) {
            this.ioerror = false;
            throw new Error('Error in writer thread');
        }
        if (len > this.limit || src.length > this.limit) {
            throw new Error('buffer overflow');
        }
        try {
            this.socket.send(src.slice(0, len));
        } catch (e) {
            this.ioerror = true;
        }
    }

    close(): void {
        this.closed = true;
    }
}

class WebSocketEvent {
    private readonly bytes: Uint8Array;
    private position: number;

    constructor(bytes: Uint8Array) {
        this.bytes = bytes;
        this.position = 0;
    }

    get available(): number {
        return this.bytes.length - this.position;
    }

    get read(): number {
        return this.bytes[this.position++];
    }

    get len(): number {
        return this.bytes.length;
    }
}

class WebSocketReader {
    // constructor
    private readonly limit: number;

    // runtime
    private queue: WebSocketEvent[] = [];
    private event: WebSocketEvent | null = null;
    private callback: ((data: WebSocketEvent) => void) | null = null;
    private closed: boolean = false;
    private total: number = 0;

    constructor(socket: WebSocket, limit: number) {
        this.limit = limit;
        socket.binaryType = 'arraybuffer';
        socket.onmessage = this.onmessage;
    }

    get available(): number {
        return this.total;
    }

    private onmessage = (e: MessageEvent): void => {
        if (this.closed) {
            throw new Error('WebSocketReader is closed!');
        }

        const event: WebSocketEvent = new WebSocketEvent(new Uint8Array(e.data));

        this.total += event.available;

        if (this.callback) {
            const cb = this.callback;
            this.callback = null;
            cb(event);
        } else {
            this.queue.push(event);
        }
    };

    async read(): Promise<number> {
        if (this.closed) {
            throw new Error('WebSocketReader is closed!');
        }
        return await Promise.race([
            new Promise<number>((resolve) => {
                if (!this.event || this.event.available === 0) {
                    this.event = this.queue.shift() ?? null;
                }
                if (this.event && this.event.available > 0) {
                    resolve(this.event.read);
                    this.total--;
                } else {
                    this.callback = (event: WebSocketEvent) => {
                        this.event = event;
                        this.total--;
                        resolve(event.read);
                    };
                }
            }),
            new Promise<number>((_, reject) => {
                setTimeout(() => {
                    if (this.closed) {
                        reject(new Error('WebSocketReader closed while reading.'));
                    } else {
                        reject(new Error('No data received within 2 seconds.'));
                    }
                }, 20000);
            }),
        ]);
    }

    async readBytes(dst: Uint8Array, off: number, len: number): Promise<Uint8Array> {
        if (this.closed) {
            throw new Error('WebSocketReader is closed!');
        }
        for (let i = 0; i < len; i++) {
            dst[off + i] = await this.read();
        }
        return dst;
    }

    close(): void {
        this.closed = true;
        this.callback = null;
        this.event = null;
        this.queue = [];
    }
}
