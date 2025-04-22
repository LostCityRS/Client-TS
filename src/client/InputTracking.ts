import Packet from '#/io/Packet.js';
import { PacketType } from '#/io/PacketType.ts';
import { InputTrackingType } from '#/client/InputTrackingType.ts';

export default class InputTracking {
    static trackingActive: boolean = false;
    static outBuffer: Packet | null = null;
    static oldBuffer: Packet | null = null;
    static lastTime: number = 0;
    static trackedCount: number = 0;
    static lastMoveTime: number = 0;
    static lastX: number = 0;
    static lastY: number = 0;

    private static readonly MAX_BYTES: number = 500;

    static setEnabled(): void {
        this.outBuffer = Packet.alloc(PacketType.TYPE_5KB);
        this.oldBuffer = null;
        this.lastTime = performance.now();
        this.trackingActive = true;
    }

    static setDisabled(): void {
        this.trackingActive = false;
        this.outBuffer = null;
    }

    static flush(): Packet | null {
        let buffer: Packet | null = null;
        if (this.oldBuffer && this.trackingActive) {
            buffer = this.oldBuffer;
        }
        this.oldBuffer = null;
        return buffer;
    }

    static stop(): Packet | null {
        let buffer: Packet | null = null;
        if (this.outBuffer && this.outBuffer.pos > 0 && this.trackingActive) {
            buffer = this.outBuffer;
        }
        this.setDisabled();
        return buffer;
    }

    static mousePressed(x: number, y: number, button: number): void {
        if (!(this.trackingActive && x >= 0 && x < 789 && y >= 0 && y < 532)) {
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
            this.outBuffer?.p1(InputTrackingType.MOUSEDOWNR);
        } else {
            this.outBuffer?.p1(InputTrackingType.MOUSEDOWNL);
        }
        this.outBuffer?.p1(delta);
        this.outBuffer?.p3(x + (y << 10));
    }

    static mouseReleased(button: number): void {
        if (!this.trackingActive) {
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
            this.outBuffer?.p1(InputTrackingType.MOUSEUPR);
        } else {
            this.outBuffer?.p1(InputTrackingType.MOUSEUPL);
        }
        this.outBuffer?.p1(delta);
    }

    static mouseMoved(x: number, y: number): void {
        if (!(this.trackingActive && x >= 0 && x < 789 && y >= 0 && y < 532)) {
            return;
        }
        const now: number = performance.now();
        if (now - this.lastMoveTime >= 50) {
            this.lastMoveTime = now;
            this.trackedCount++;

            let delta: number = ((now - this.lastTime) / 10) | 0;
            if (delta > 250) {
                delta = 250;
            }

            this.lastTime = now;
            if (x - this.lastX < 8 && x - this.lastX >= -8 && y - this.lastY < 8 && y - this.lastY >= -8) {
                this.ensureCapacity(3);
                this.outBuffer?.p1(InputTrackingType.MOUSEMOVE1);
                this.outBuffer?.p1(delta);
                this.outBuffer?.p1(x + ((y - this.lastY + 8) << 4) + 8 - this.lastX);
            } else if (x - this.lastX < 128 && x - this.lastX >= -128 && y - this.lastY < 128 && y - this.lastY >= -128) {
                this.ensureCapacity(4);
                this.outBuffer?.p1(InputTrackingType.MOUSEMOVE2);
                this.outBuffer?.p1(delta);
                this.outBuffer?.p1(x + 128 - this.lastX);
                this.outBuffer?.p1(y + 128 - this.lastY);
            } else {
                this.ensureCapacity(5);
                this.outBuffer?.p1(InputTrackingType.MOUSEMOVE3);
                this.outBuffer?.p1(delta);
                this.outBuffer?.p3(x + (y << 10));
            }

            this.lastX = x;
            this.lastY = y;
        }
    }

    static keyPressed(key: number): void {
        if (!this.trackingActive) {
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
        this.outBuffer?.p1(InputTrackingType.KEYDOWN);
        this.outBuffer?.p1(delta);
        this.outBuffer?.p1(key);
    }

    static keyReleased(key: number): void {
        if (!this.trackingActive) {
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
        this.outBuffer?.p1(InputTrackingType.KEYUP);
        this.outBuffer?.p1(delta);
        this.outBuffer?.p1(key);
    }

    static focusGained(): void {
        if (!this.trackingActive) {
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
        this.outBuffer?.p1(InputTrackingType.FOCUS);
        this.outBuffer?.p1(delta);
    }

    static focusLost(): void {
        if (!this.trackingActive) {
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
        this.outBuffer?.p1(InputTrackingType.BLUR);
        this.outBuffer?.p1(delta);
    }

    static mouseEntered(): void {
        if (!this.trackingActive) {
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
        this.outBuffer?.p1(InputTrackingType.MOUSEENTER);
        this.outBuffer?.p1(delta);
    }

    static mouseExited(): void {
        if (!this.trackingActive) {
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
        this.outBuffer?.p1(InputTrackingType.MOUSELEAVE);
        this.outBuffer?.p1(delta);
    }

    private static ensureCapacity(n: number): void {
        if (!this.outBuffer) {
            return;
        }
        if (this.outBuffer.pos + n >= InputTracking.MAX_BYTES) {
            const buffer: Packet = this.outBuffer;
            this.outBuffer = Packet.alloc(PacketType.TYPE_5KB);
            this.oldBuffer = buffer;
        }
    }
}
