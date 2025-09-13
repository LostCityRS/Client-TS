import Packet from '#/io/Packet.js';

export default class InputTracking {
    static enabled: boolean = false;
    static outBuffer: Packet | null = null;
    static oldBuffer: Packet | null = null;
    static lastTime: number = 0;
    static trackedCount: number = 0;
    static lastMoveTime: number = 0;
    static lastX: number = 0;
    static lastY: number = 0;

    static setEnabled(): void {
        this.outBuffer = Packet.alloc(1);
        this.oldBuffer = null;
        this.lastTime = performance.now();
        this.enabled = true;
    }

    static setDisabled(): void {
        this.enabled = false;
        this.outBuffer = null;
        this.oldBuffer = null;
    }

    static flush(): Packet | null {
        let buffer: Packet | null = null;

        if (this.oldBuffer && this.enabled) {
            buffer = this.oldBuffer;
        }

        this.oldBuffer = null;
        return buffer;
    }

    static stop(): Packet | null {
        let buffer: Packet | null = null;

        if (this.outBuffer && this.outBuffer.pos > 0 && this.enabled) {
            buffer = this.outBuffer;
        }

        this.setDisabled();
        return buffer;
    }

    private static ensureCapacity(n: number): void {
        if (!this.outBuffer) {
            return;
        }

        if (this.outBuffer.pos + n >= 500) {
            const buffer: Packet = this.outBuffer;
            this.outBuffer = Packet.alloc(1);
            this.oldBuffer = buffer;
        }
    }

    static mousePressed(x: number, y: number, button: number, _pointerType: string): void {
        if (!this.outBuffer) {
            return;
        }

        if (!this.enabled && (x >= 0 && x < 789 && y >= 0 && y < 532)) {
            return;
        }

        this.trackedCount++;

        const now: number = performance.now();
        let delta: number = ((now - this.lastTime) / 10) | 0;
        if (delta > 250) {
            delta = 250;
        }

        this.lastTime = now;
        this.ensureCapacity(5);

        if (button === 2) {
            this.outBuffer.p1(1);
        } else {
            this.outBuffer.p1(2);
        }

        this.outBuffer.p1(delta);
        this.outBuffer.p3(x + (y << 10));
    }

    static mouseReleased(button: number, _pointerType: string): void {
        if (!this.outBuffer) {
            return;
        }

        if (!this.enabled) {
            return;
        }

        this.trackedCount++;

        const now: number = performance.now();
        let delta: number = ((now - this.lastTime) / 10) | 0;
        if (delta > 250) {
            delta = 250;
        }

        this.lastTime = now;
        this.ensureCapacity(2);

        if (button === 2) {
            this.outBuffer.p1(3);
        } else {
            this.outBuffer.p1(4);
        }

        this.outBuffer.p1(delta);
    }

    static mouseMoved(x: number, y: number, _pointerType: string): void {
        if (!this.outBuffer) {
            return;
        }

        if (!this.enabled && (x >= 0 && x < 789 && y >= 0 && y < 532)) {
            return;
        }

        const now: number = performance.now();
        if (now - this.lastMoveTime < 50) {
            return;
        }

        this.lastMoveTime = now;
        this.trackedCount++;

        let delta: number = ((now - this.lastTime) / 10) | 0;
        if (delta > 250) {
            delta = 250;
        }

        this.lastTime = now;

        if (x - this.lastX < 8 && x - this.lastX >= -8 && y - this.lastY < 8 && y - this.lastY >= -8) {
            this.ensureCapacity(3);
            this.outBuffer.p1(5);
            this.outBuffer.p1(delta);
            this.outBuffer.p1(x + ((y - this.lastY + 8) << 4) + 8 - this.lastX);
        } else if (x - this.lastX < 128 && x - this.lastX >= -128 && y - this.lastY < 128 && y - this.lastY >= -128) {
            this.ensureCapacity(4);
            this.outBuffer.p1(6);
            this.outBuffer.p1(delta);
            this.outBuffer.p1(x + 128 - this.lastX);
            this.outBuffer.p1(y + 128 - this.lastY);
        } else {
            this.ensureCapacity(5);
            this.outBuffer.p1(7);
            this.outBuffer.p1(delta);
            this.outBuffer.p3(x + (y << 10));
        }

        this.lastX = x;
        this.lastY = y;
    }

    static keyPressed(key: number): void {
        if (!this.outBuffer) {
            return;
        }

        if (!this.enabled) {
            return;
        }

        this.trackedCount++;

        const now: number = performance.now();
        let delta: number = ((now - this.lastTime) / 10) | 0;
        if (delta > 250) {
            delta = 250;
        }

        this.lastTime = now;

        if (key === 1000) {
            key = 11;
        } else if (key === 1001) {
            key = 12;
        } else if (key === 1002) {
            key = 14;
        } else if (key === 1003) {
            key = 15;
        } else if (key >= 1008) {
            key -= 992;
        }

        this.ensureCapacity(3);
        this.outBuffer.p1(8);
        this.outBuffer.p1(delta);
        this.outBuffer.p1(key);
    }

    static keyReleased(key: number): void {
        if (!this.outBuffer) {
            return;
        }

        if (!this.enabled) {
            return;
        }

        this.trackedCount++;

        const now: number = performance.now();
        let delta: number = ((now - this.lastTime) / 10) | 0;
        if (delta > 250) {
            delta = 250;
        }

        this.lastTime = now;

        if (key === 1000) {
            key = 11;
        } else if (key === 1001) {
            key = 12;
        } else if (key === 1002) {
            key = 14;
        } else if (key === 1003) {
            key = 15;
        } else if (key >= 1008) {
            key -= 992;
        }

        this.ensureCapacity(3);
        this.outBuffer.p1(9);
        this.outBuffer.p1(delta);
        this.outBuffer.p1(key);
    }

    static focusGained(): void {
        if (!this.outBuffer) {
            return;
        }

        if (!this.enabled) {
            return;
        }

        this.trackedCount++;

        const now: number = performance.now();
        let delta: number = ((now - this.lastTime) / 10) | 0;
        if (delta > 250) {
            delta = 250;
        }

        this.lastTime = now;

        this.ensureCapacity(2);
        this.outBuffer.p1(10);
        this.outBuffer.p1(delta);
    }

    static focusLost(): void {
        if (!this.outBuffer) {
            return;
        }

        if (!this.enabled) {
            return;
        }

        this.trackedCount++;

        const now: number = performance.now();
        let delta: number = ((now - this.lastTime) / 10) | 0;
        if (delta > 250) {
            delta = 250;
        }

        this.lastTime = now;

        this.ensureCapacity(2);
        this.outBuffer.p1(11);
        this.outBuffer.p1(delta);
    }

    static mouseEntered(): void {
        if (!this.outBuffer) {
            return;
        }

        if (!this.enabled) {
            return;
        }

        this.trackedCount++;

        const now: number = performance.now();
        let delta: number = ((now - this.lastTime) / 10) | 0;
        if (delta > 250) {
            delta = 250;
        }

        this.lastTime = now;

        this.ensureCapacity(2);
        this.outBuffer.p1(12);
        this.outBuffer.p1(delta);
    }

    static mouseExited(): void {
        if (!this.outBuffer) {
            return;
        }

        if (!this.enabled) {
            return;
        }

        this.trackedCount++;

        const now: number = performance.now();
        let delta: number = ((now - this.lastTime) / 10) | 0;
        if (delta > 250) {
            delta = 250;
        }

        this.lastTime = now;

        this.ensureCapacity(2);
        this.outBuffer.p1(13);
        this.outBuffer.p1(delta);
    }
}
