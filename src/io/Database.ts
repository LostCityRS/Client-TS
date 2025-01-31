export default class Database {
    private readonly db: IDBDatabase;

    constructor(db: IDBDatabase) {
        db.onerror = this.onerror;
        db.onclose = this.onclose;
        this.db = db;
    }

    static openDatabase = async (): Promise<IDBDatabase> => {
        return await new Promise<IDBDatabase>((resolve, reject): void => {
            const request: IDBOpenDBRequest = indexedDB.open('lostcity', 1);

            request.onsuccess = (event: Event): void => {
                const target: IDBOpenDBRequest = event.target as IDBOpenDBRequest;
                resolve(target.result);
            };

            request.onupgradeneeded = (event: Event): void => {
                const target: IDBOpenDBRequest = event.target as IDBOpenDBRequest;
                target.result.createObjectStore('cache');
            };

            request.onerror = (event: Event): void => {
                const target: IDBOpenDBRequest = event.target as IDBOpenDBRequest;
                reject(target.result);
            };
        });
    };

    async cacheload(name: string) {
        return await new Promise<Uint8Array | undefined>((resolve): void => {
            const transaction: IDBTransaction = this.db.transaction('cache', 'readonly');
            const store: IDBObjectStore = transaction.objectStore('cache');
            const request: IDBRequest<Uint8Array> = store.get(name);

            request.onsuccess = (): void => {
                if (request.result) {
                    resolve(new Uint8Array(request.result));
                } else {
                    // IDB will call onsuccess with "undefined" if key does not exist
                    resolve(undefined);
                }
            };

            request.onerror = (): void => {
                resolve(undefined);
            };
        });
    }

    async cachesave(name: string, src: Uint8Array | Int8Array) {
        return await new Promise<void>((resolve, reject): void => {
            const transaction: IDBTransaction = this.db.transaction('cache', 'readwrite');
            const store: IDBObjectStore = transaction.objectStore('cache');
            const request: IDBRequest<IDBValidKey> = store.put(src, name);

            request.onsuccess = (): void => {
                resolve();
            };

            request.onerror = (): void => {
                // not too worried if it doesn't save, it'll redownload later
                resolve();
            };
        });
    }

    private onclose = (event: Event): void => {};

    private onerror = (event: Event): void => {};

    private genHash = (str: string): number => {
        const trimmed: string = str.trim();
        let hash: number = 0;
        for (let i: number = 0; i < trimmed.length && i < 12; i++) {
            const c: string = trimmed.charAt(i);
            hash *= 37;

            if (c >= 'A' && c <= 'Z') {
                hash += c.charCodeAt(0) + 1 - 65;
            } else if (c >= 'a' && c <= 'z') {
                hash += c.charCodeAt(0) + 1 - 97;
            } else if (c >= '0' && c <= '9') {
                hash += c.charCodeAt(0) + 27 - 48;
            }
        }
        return hash;
    };
}
