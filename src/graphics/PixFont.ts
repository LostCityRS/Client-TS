import DoublyLinkable from '#/datastruct/DoublyLinkable.js';

import { Colors } from '#/graphics/Colors.js';
import Pix2D from '#/graphics/Pix2D.js';

import Jagfile from '#/io/Jagfile.js';
import Packet from '#/io/Packet.js';

import JavaRandom from '#/util/JavaRandom.js';

export default class PixFont extends DoublyLinkable {
    static readonly CHARSET: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!"£$%^&*()-_=+[{]};:\'@#~,<.>/?\\| ';
    static readonly CHARCODESET: number[] = [];

    private readonly charMask: Int8Array[] = [];
    readonly charMaskWidth: Int32Array = new Int32Array(94);
    readonly charMaskHeight: Int32Array = new Int32Array(94);
    readonly charOffsetX: Int32Array = new Int32Array(94);
    readonly charOffsetY: Int32Array = new Int32Array(94);
    readonly charAdvance: Int32Array = new Int32Array(95);
    readonly drawWidth: Int32Array = new Int32Array(256);
    private readonly random: JavaRandom = new JavaRandom(BigInt(Date.now()));

    height2d: number = 0;

    static {
        const isCapacitor: boolean = navigator.userAgent.includes('Capacitor');

        for (let i: number = 0; i < 256; i++) {
            let c: number = PixFont.CHARSET.indexOf(String.fromCharCode(i));

            // This fixes text mangling in Capacitor native builds (Android/IOS)
            if (isCapacitor)
                if (c >= 63) {
                    // "
                    c--;
                }

            if (c === -1) {
                c = 74; // space
            }

            PixFont.CHARCODESET[i] = c;
        }
    }

    static fromArchive(archive: Jagfile, name: string): PixFont {
        const dat: Packet = new Packet(archive.read(name + '.dat'));
        const idx: Packet = new Packet(archive.read('index.dat'));

        idx.pos = dat.g2() + 4; // skip cropW and cropH

        const off: number = idx.g1();
        if (off > 0) {
            // skip palette
            idx.pos += (off - 1) * 3;
        }

        const font: PixFont = new PixFont();

        for (let i: number = 0; i < 94; i++) {
            font.charOffsetX[i] = idx.g1();
            font.charOffsetY[i] = idx.g1();

            const w: number = (font.charMaskWidth[i] = idx.g2());
            const h: number = (font.charMaskHeight[i] = idx.g2());

            const type: number = idx.g1();
            const len: number = w * h;

            font.charMask[i] = new Int8Array(len);

            if (type === 0) {
                for (let j: number = 0; j < w * h; j++) {
                    font.charMask[i][j] = dat.g1b();
                }
            } else if (type === 1) {
                for (let x: number = 0; x < w; x++) {
                    for (let y: number = 0; y < h; y++) {
                        font.charMask[i][x + y * w] = dat.g1b();
                    }
                }
            }

            if (h > font.height2d) {
                font.height2d = h;
            }

            font.charOffsetX[i] = 1;
            font.charAdvance[i] = w + 2;

            {
                let space: number = 0;
                for (let y: number = (h / 7) | 0; y < h; y++) {
                    space += font.charMask[i][y * w];
                }

                if (space <= ((h / 7) | 0)) {
                    font.charAdvance[i]--;
                    font.charOffsetX[i] = 0;
                }
            }

            {
                let space: number = 0;
                for (let y: number = (h / 7) | 0; y < h; y++) {
                    space += font.charMask[i][w + y * w - 1];
                }

                if (space <= ((h / 7) | 0)) {
                    font.charAdvance[i]--;
                }
            }
        }

        font.charAdvance[94] = font.charAdvance[8];
        for (let i: number = 0; i < 256; i++) {
            font.drawWidth[i] = font.charAdvance[PixFont.CHARCODESET[i]];
        }

        return font;
    }

    drawString(x: number, y: number, str: string | null, color: number): void {
        if (!str) {
            return;
        }

        x |= 0;
        y |= 0;

        const length: number = str.length;
        y -= this.height2d;
        for (let i: number = 0; i < length; i++) {
            const c: number = PixFont.CHARCODESET[str.charCodeAt(i)];

            if (c !== 94) {
                this.drawChar(this.charMask[c], x + this.charOffsetX[c], y + this.charOffsetY[c], this.charMaskWidth[c], this.charMaskHeight[c], color);
            }

            x += this.charAdvance[c];
        }
    }

    drawStringTaggable(x: number, y: number, str: string, color: number, shadowed: boolean): void {
        x |= 0;
        y |= 0;

        const length: number = str.length;
        y -= this.height2d;
        for (let i: number = 0; i < length; i++) {
            if (str.charAt(i) === '@' && i + 4 < length && str.charAt(i + 4) === '@') {
                color = this.evaluateTag(str.substring(i + 1, i + 4));
                i += 4;
            } else {
                const c: number = PixFont.CHARCODESET[str.charCodeAt(i)];

                if (c !== 94) {
                    if (shadowed) {
                        this.drawChar(this.charMask[c], x + this.charOffsetX[c] + 1, y + this.charOffsetY[c] + 1, this.charMaskWidth[c], this.charMaskHeight[c], Colors.BLACK);
                    }
                    this.drawChar(this.charMask[c], x + this.charOffsetX[c], y + this.charOffsetY[c], this.charMaskWidth[c], this.charMaskHeight[c], color);
                }

                x += this.charAdvance[c];
            }
        }
    }

    stringWidth(str: string | null): number {
        if (!str) {
            return 0;
        }

        const length: number = str.length;
        let w: number = 0;
        for (let i: number = 0; i < length; i++) {
            if (str.charAt(i) === '@' && i + 4 < length && str.charAt(i + 4) === '@') {
                i += 4;
            } else {
                w += this.drawWidth[str.charCodeAt(i)];
            }
        }

        return w;
    }

    drawStringTaggableCenter(x: number, y: number, str: string, color: number, shadowed: boolean): void {
        x |= 0;
        y |= 0;

        this.drawStringTaggable(x - ((this.stringWidth(str) / 2) | 0), y, str, color, shadowed);
    }

    drawStringCenter(x: number, y: number, str: string | null, color: number): void {
        if (!str) {
            return;
        }

        x |= 0;
        y |= 0;

        this.drawString(x - ((this.stringWidth(str) / 2) | 0), y, str, color);
    }

    drawStringTooltip(x: number, y: number, str: string, color: number, shadowed: boolean, seed: number): void {
        x |= 0;
        y |= 0;

        this.random.setSeed(BigInt(seed));

        const rand: number = (this.random.nextInt() & 0x1f) + 192;
        const offY: number = y - this.height2d;
        for (let i: number = 0; i < str.length; i++) {
            if (str.charAt(i) === '@' && i + 4 < str.length && str.charAt(i + 4) === '@') {
                color = this.evaluateTag(str.substring(i + 1, i + 4));
                i += 4;
            } else {
                const c: number = PixFont.CHARCODESET[str.charCodeAt(i)];
                if (c !== 94) {
                    if (shadowed) {
                        this.drawCharAlpha(x + this.charOffsetX[c] + 1, offY + this.charOffsetY[c] + 1, this.charMaskWidth[c], this.charMaskHeight[c], Colors.BLACK, 192, this.charMask[c]);
                    }

                    this.drawCharAlpha(x + this.charOffsetX[c], offY + this.charOffsetY[c], this.charMaskWidth[c], this.charMaskHeight[c], color, rand, this.charMask[c]);
                }

                x += this.charAdvance[c];
                if ((this.random.nextInt() & 0x3) === 0) {
                    x++;
                }
            }
        }
    }

    drawStringRight(x: number, y: number, str: string, color: number, shadowed: boolean = true): void {
        x |= 0;
        y |= 0;

        if (shadowed) {
            this.drawString(x - this.stringWidth(str) + 1, y + 1, str, Colors.BLACK);
        }
        this.drawString(x - this.stringWidth(str), y, str, color);
    }

    drawCenteredWave(x: number, y: number, str: string | null, color: number, phase: number): void {
        if (!str) {
            return;
        }

        x |= 0;
        y |= 0;

        x -= (this.stringWidth(str) / 2) | 0;
        const offY: number = y - this.height2d;

        for (let i: number = 0; i < str.length; i++) {
            const c: number = PixFont.CHARCODESET[str.charCodeAt(i)];

            if (c != 94) {
                this.drawChar(this.charMask[c], x + this.charOffsetX[c], offY + this.charOffsetY[c] + ((Math.sin(i / 2.0 + phase / 5.0) * 5.0) | 0), this.charMaskWidth[c], this.charMaskHeight[c], color);
            }

            x += this.charAdvance[c];
        }
    }

    drawChar(data: Int8Array, x: number, y: number, w: number, h: number, color: number): void {
        x |= 0;
        y |= 0;
        w |= 0;
        h |= 0;

        let dstOff: number = x + y * Pix2D.width2d;
        let dstStep: number = Pix2D.width2d - w;

        let srcStep: number = 0;
        let srcOff: number = 0;

        if (y < Pix2D.top) {
            const cutoff: number = Pix2D.top - y;
            h -= cutoff;
            y = Pix2D.top;
            srcOff += cutoff * w;
            dstOff += cutoff * Pix2D.width2d;
        }

        if (y + h >= Pix2D.bottom) {
            h -= y + h + 1 - Pix2D.bottom;
        }

        if (x < Pix2D.left) {
            const cutoff: number = Pix2D.left - x;
            w -= cutoff;
            x = Pix2D.left;
            srcOff += cutoff;
            dstOff += cutoff;
            srcStep += cutoff;
            dstStep += cutoff;
        }

        if (x + w >= Pix2D.right) {
            const cutoff: number = x + w + 1 - Pix2D.right;
            w -= cutoff;
            srcStep += cutoff;
            dstStep += cutoff;
        }

        if (w > 0 && h > 0) {
            this.drawMask(w, h, data, srcOff, srcStep, Pix2D.pixels, dstOff, dstStep, color);
        }
    }

    drawCharAlpha(x: number, y: number, w: number, h: number, color: number, alpha: number, mask: Int8Array): void {
        x |= 0;
        y |= 0;
        w |= 0;
        h |= 0;

        let dstOff: number = x + y * Pix2D.width2d;
        let dstStep: number = Pix2D.width2d - w;

        let srcStep: number = 0;
        let srcOff: number = 0;

        if (y < Pix2D.top) {
            const cutoff: number = Pix2D.top - y;
            h -= cutoff;
            y = Pix2D.top;
            srcOff += cutoff * w;
            dstOff += cutoff * Pix2D.width2d;
        }

        if (y + h >= Pix2D.bottom) {
            h -= y + h + 1 - Pix2D.bottom;
        }

        if (x < Pix2D.left) {
            const cutoff: number = Pix2D.left - x;
            w -= cutoff;
            x = Pix2D.left;
            srcOff += cutoff;
            dstOff += cutoff;
            srcStep += cutoff;
            dstStep += cutoff;
        }

        if (x + w >= Pix2D.right) {
            const cutoff: number = x + w + 1 - Pix2D.right;
            w -= cutoff;
            srcStep += cutoff;
            dstStep += cutoff;
        }

        if (w > 0 && h > 0) {
            this.drawMaskAlpha(w, h, Pix2D.pixels, dstOff, dstStep, mask, srcOff, srcStep, color, alpha);
        }
    }

    private drawMask(w: number, h: number, src: Int8Array, srcOff: number, srcStep: number, dst: Int32Array, dstOff: number, dstStep: number, rgb: number): void {
        w |= 0;
        h |= 0;

        const hw: number = -(w >> 2);
        w = -(w & 0x3);

        for (let y: number = -h; y < 0; y++) {
            for (let x: number = hw; x < 0; x++) {
                if (src[srcOff++] === 0) {
                    dstOff++;
                } else {
                    dst[dstOff++] = rgb;
                }

                if (src[srcOff++] === 0) {
                    dstOff++;
                } else {
                    dst[dstOff++] = rgb;
                }

                if (src[srcOff++] === 0) {
                    dstOff++;
                } else {
                    dst[dstOff++] = rgb;
                }

                if (src[srcOff++] === 0) {
                    dstOff++;
                } else {
                    dst[dstOff++] = rgb;
                }
            }

            for (let x: number = w; x < 0; x++) {
                if (src[srcOff++] === 0) {
                    dstOff++;
                } else {
                    dst[dstOff++] = rgb;
                }
            }

            dstOff += dstStep;
            srcOff += srcStep;
        }
    }

    private drawMaskAlpha(w: number, h: number, dst: Int32Array, dstOff: number, dstStep: number, mask: Int8Array, maskOff: number, maskStep: number, color: number, alpha: number): void {
        w |= 0;
        h |= 0;

        const rgb: number = ((((color & 0xff00ff) * alpha) & 0xff00ff00) + (((color & 0xff00) * alpha) & 0xff0000)) >> 8;
        const invAlpha: number = 256 - alpha;

        for (let y: number = -h; y < 0; y++) {
            for (let x: number = -w; x < 0; x++) {
                if (mask[maskOff++] === 0) {
                    dstOff++;
                } else {
                    const dstRgb: number = dst[dstOff];
                    dst[dstOff++] = (((((dstRgb & 0xff00ff) * invAlpha) & 0xff00ff00) + (((dstRgb & 0xff00) * invAlpha) & 0xff0000)) >> 8) + rgb;
                }
            }

            dstOff += dstStep;
            maskOff += maskStep;
        }
    }

    evaluateTag(tag: string): number {
        if (tag === 'red') {
            return Colors.RED;
        } else if (tag === 'gre') {
            return Colors.GREEN;
        } else if (tag === 'blu') {
            return Colors.BLUE;
        } else if (tag === 'yel') {
            return Colors.YELLOW;
        } else if (tag === 'cya') {
            return Colors.CYAN;
        } else if (tag === 'mag') {
            return Colors.MAGENTA;
        } else if (tag === 'whi') {
            return Colors.WHITE;
        } else if (tag === 'bla') {
            return Colors.BLACK;
        } else if (tag === 'lre') {
            return Colors.LIGHTRED;
        } else if (tag === 'dre') {
            return Colors.DARKRED;
        } else if (tag === 'dbl') {
            return Colors.DARKBLUE;
        } else if (tag === 'or1') {
            return Colors.ORANGE1;
        } else if (tag === 'or2') {
            return Colors.ORANGE2;
        } else if (tag === 'or3') {
            return Colors.ORANGE3;
        } else if (tag === 'gr1') {
            return Colors.GREEN1;
        } else if (tag === 'gr2') {
            return Colors.GREEN2;
        } else if (tag === 'gr3') {
            return Colors.GREEN3;
        } else {
            return Colors.BLACK;
        }
    }

    split(str: string, maxWidth: number): string[] {
        if (str.length === 0) {
            // special case for empty string
            return [str];
        }

        const lines: string[] = [];
        while (str.length > 0) {
            // check if the string even needs to be broken up
            const width: number = this.stringWidth(str);
            if (width <= maxWidth && str.indexOf('|') === -1) {
                lines.push(str);
                break;
            }

            // we need to split on the next word boundary
            let splitIndex: number = str.length;

            // check the width at every space to see where we can cut the line
            for (let i: number = 0; i < str.length; i++) {
                if (str[i] === ' ') {
                    const w: number = this.stringWidth(str.substring(0, i));
                    if (w > maxWidth) {
                        break;
                    }

                    splitIndex = i;
                } else if (str[i] === '|') {
                    splitIndex = i;
                    break;
                }
            }

            lines.push(str.substring(0, splitIndex));
            str = str.substring(splitIndex + 1);
        }

        return lines;
    }
}
