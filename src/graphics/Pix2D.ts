import DoublyLinkable from '#/datastruct/DoublyLinkable.js';

export default class Pix2D extends DoublyLinkable {
    static pixels: Int32Array = new Int32Array();

    static width2d: number = 0;
    static height2d: number = 0;

    static top: number = 0;
    static bottom: number = 0;
    static left: number = 0;
    static right: number = 0;
    static boundX: number = 0;

    static centerX2d: number = 0;
    static centerY2d: number = 0;

    static bind(pixels: Int32Array, width: number, height: number): void {
        this.pixels = pixels;
        this.width2d = width;
        this.height2d = height;
        this.setBounds(0, 0, width, height);
    }

    static resetBounds(): void {
        this.left = 0;
        this.top = 0;
        this.right = this.width2d;
        this.bottom = this.height2d;
        this.boundX = this.right - 1;
        this.centerX2d = (this.right / 2) | 0;
    }

    static setBounds(left: number, top: number, right: number, bottom: number): void {
        if (left < 0) {
            left = 0;
        }

        if (top < 0) {
            top = 0;
        }

        if (right > this.width2d) {
            right = this.width2d;
        }

        if (bottom > this.height2d) {
            bottom = this.height2d;
        }

        this.top = top;
        this.bottom = bottom;
        this.left = left;
        this.right = right;
        this.boundX = this.right - 1;
        this.centerX2d = (this.right / 2) | 0;
        this.centerY2d = (this.bottom / 2) | 0;
    }

    static clear(): void {
        const len: number = this.width2d * this.height2d;
        for (let i: number = 0; i < len; i++) {
            this.pixels[i] = 0;
        }
    }

    static drawRect(x: number, y: number, w: number, h: number, color: number): void {
        this.drawHorizontalLine(x, y, color, w);
        this.drawHorizontalLine(x, y + h - 1, color, w);
        this.drawVerticalLine(x, y, color, h);
        this.drawVerticalLine(x + w - 1, y, color, h);
    }

    static drawRectAlpha(x: number, y: number, w: number, h: number, color: number, alpha: number): void {
        this.drawHorizontalLineAlpha(x, y, color, w, alpha);
        this.drawHorizontalLineAlpha(x, y + h - 1, color, w, alpha);
        if (h >= 3) {
            this.drawVerticalLineAlpha(x, y, color, h, alpha);
            this.drawVerticalLineAlpha(x + w - 1, y, color, h, alpha);
        }
    }

    static drawHorizontalLine(x: number, y: number, color: number, width: number): void {
        if (y < this.top || y >= this.bottom) {
            return;
        }

        if (x < this.left) {
            width -= this.left - x;
            x = this.left;
        }

        if (x + width > this.right) {
            width = this.right - x;
        }

        const off: number = x + y * this.width2d;
        for (let i: number = 0; i < width; i++) {
            this.pixels[off + i] = color;
        }
    }

    static drawHorizontalLineAlpha = (x: number, y: number, color: number, width: number, alpha: number): void => {
        if (y < this.top || y >= this.bottom) {
            return;
        }

        if (x < this.left) {
            width -= this.left - x;
            x = this.left;
        }

        if (x + width > this.right) {
            width = this.right - x;
        }

        const invAlpha: number = 256 - alpha;
        const r0: number = ((color >> 16) & 0xff) * alpha;
        const g0: number = ((color >> 8) & 0xff) * alpha;
        const b0: number = (color & 0xff) * alpha;
        const step: number = this.width2d - width;
        let offset: number = x + y * this.width2d;
        for (let i: number = 0; i < width; i++) {
            const r1: number = ((this.pixels[offset] >> 16) & 0xff) * invAlpha;
            const g1: number = ((this.pixels[offset] >> 8) & 0xff) * invAlpha;
            const b1: number = (this.pixels[offset] & 0xff) * invAlpha;
            const color: number = (((r0 + r1) >> 8) << 16) + (((g0 + g1) >> 8) << 8) + ((b0 + b1) >> 8);
            this.pixels[offset++] = color;
        }
    };

    static drawVerticalLine(x: number, y: number, color: number, height: number): void {
        if (x < this.left || x >= this.right) {
            return;
        }

        if (y < this.top) {
            height -= this.top - y;
            y = this.top;
        }

        if (y + height > this.bottom) {
            height = this.bottom - y;
        }

        const off: number = x + y * this.width2d;
        for (let i: number = 0; i < height; i++) {
            this.pixels[off + i * this.width2d] = color;
        }
    }

    static drawVerticalLineAlpha = (x: number, y: number, color: number, height: number, alpha: number): void => {
        if (x < this.left || x >= this.right) {
            return;
        }

        if (y < this.top) {
            height -= this.top - y;
            y = this.top;
        }

        if (y + height > this.bottom) {
            height = this.bottom - y;
        }

        const invAlpha: number = 256 - alpha;
        const r0: number = ((color >> 16) & 0xff) * alpha;
        const g0: number = ((color >> 8) & 0xff) * alpha;
        const b0: number = (color & 0xff) * alpha;
        let offset: number = x + y * this.width2d;
        for (let i: number = 0; i < height; i++) {
            const r1: number = ((this.pixels[offset] >> 16) & 0xff) * invAlpha;
            const g1: number = ((this.pixels[offset] >> 8) & 0xff) * invAlpha;
            const b1: number = (this.pixels[offset] & 0xff) * invAlpha;
            const color: number = (((r0 + r1) >> 8) << 16) + (((g0 + g1) >> 8) << 8) + ((b0 + b1) >> 8);
            this.pixels[offset] = color;
            offset += this.width2d;
        }
    };

    static drawLine(x1: number, y1: number, x2: number, y2: number, color: number): void {
        const dx: number = Math.abs(x2 - x1);
        const dy: number = Math.abs(y2 - y1);

        const sx: number = x1 < x2 ? 1 : -1;
        const sy: number = y1 < y2 ? 1 : -1;

        let err: number = dx - dy;

        // eslint-disable-next-line no-constant-condition
        while (true) {
            if (x1 >= this.left && x1 < this.right && y1 >= this.top && y1 < this.bottom) {
                this.pixels[x1 + y1 * this.width2d] = color;
            }

            if (x1 === x2 && y1 === y2) {
                break;
            }

            const e2: number = 2 * err;

            if (e2 > -dy) {
                err = err - dy;
                x1 = x1 + sx;
            }

            if (e2 < dx) {
                err = err + dx;
                y1 = y1 + sy;
            }
        }
    }

    static fillRect2d(x: number, y: number, width: number, height: number, color: number): void {
        if (x < this.left) {
            width -= this.left - x;
            x = this.left;
        }

        if (y < this.top) {
            height -= this.top - y;
            y = this.top;
        }

        if (x + width > this.right) {
            width = this.right - x;
        }

        if (y + height > this.bottom) {
            height = this.bottom - y;
        }

        const step: number = this.width2d - width;
        let offset: number = x + y * this.width2d;
        for (let i: number = -height; i < 0; i++) {
            for (let j: number = -width; j < 0; j++) {
                this.pixels[offset++] = color;
            }

            offset += step;
        }
    }

    static fillRectAlpha(x: number, y: number, width: number, height: number, rgb: number, alpha: number): void {
        if (x < this.left) {
            width -= this.left - x;
            x = this.left;
        }

        if (y < this.top) {
            height -= this.top - y;
            y = this.top;
        }

        if (x + width > this.right) {
            width = this.right - x;
        }

        if (y + height > this.bottom) {
            height = this.bottom - y;
        }

        const invAlpha: number = 256 - alpha;
        const r0: number = ((rgb >> 16) & 0xff) * alpha;
        const g0: number = ((rgb >> 8) & 0xff) * alpha;
        const b0: number = (rgb & 0xff) * alpha;
        const step: number = this.width2d - width;
        let offset: number = x + y * this.width2d;
        for (let i: number = 0; i < height; i++) {
            for (let j: number = -width; j < 0; j++) {
                const r1: number = ((this.pixels[offset] >> 16) & 0xff) * invAlpha;
                const g1: number = ((this.pixels[offset] >> 8) & 0xff) * invAlpha;
                const b1: number = (this.pixels[offset] & 0xff) * invAlpha;
                const color: number = (((r0 + r1) >> 8) << 16) + (((g0 + g1) >> 8) << 8) + ((b0 + b1) >> 8);
                this.pixels[offset++] = color;
            }
            offset += step;
        }
    }

    static fillCircle(xCenter: number, yCenter: number, yRadius: number, rgb: number, alpha: number): void {
        const invAlpha: number = 256 - alpha;
        const r0: number = ((rgb >> 16) & 0xff) * alpha;
        const g0: number = ((rgb >> 8) & 0xff) * alpha;
        const b0: number = (rgb & 0xff) * alpha;

        let yStart: number = yCenter - yRadius;
        if (yStart < 0) {
            yStart = 0;
        }

        let yEnd: number = yCenter + yRadius;
        if (yEnd >= this.height2d) {
            yEnd = this.height2d - 1;
        }

        for (let y: number = yStart; y <= yEnd; y++) {
            const midpoint: number = y - yCenter;
            const xRadius: number = Math.sqrt(yRadius * yRadius - midpoint * midpoint) | 0;

            let xStart: number = xCenter - xRadius;
            if (xStart < 0) {
                xStart = 0;
            }

            let xEnd: number = xCenter + xRadius;
            if (xEnd >= this.width2d) {
                xEnd = this.width2d - 1;
            }

            let offset: number = xStart + y * this.width2d;
            for (let x: number = xStart; x <= xEnd; x++) {
                const r1: number = ((this.pixels[offset] >> 16) & 0xff) * invAlpha;
                const g1: number = ((this.pixels[offset] >> 8) & 0xff) * invAlpha;
                const b1: number = (this.pixels[offset] & 0xff) * invAlpha;
                const color: number = (((r0 + r1) >> 8) << 16) + (((g0 + g1) >> 8) << 8) + ((b0 + b1) >> 8);
                this.pixels[offset++] = color;
            }
        }
    }

    static setPixel(x: number, y: number, color: number): void {
        if (x < this.left || x >= this.right || y < this.top || y >= this.bottom) {
            return;
        }

        this.pixels[x + y * this.width2d] = color;
    }
}
