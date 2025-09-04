import Pix2D from '#/graphics/Pix2D.js';
import Pix8 from '#/graphics/Pix8.js';

import Jagfile from '#/io/Jagfile.js';
import { Int32Array2d, TypedArray1d } from '#/util/Arrays.js';

// noinspection JSSuspiciousNameCombination,DuplicatedCode
export default class Pix3D extends Pix2D {
    static lowMemory: boolean = false;

    static reciprocal15: Int32Array = new Int32Array(512);
    static reciprocal16: Int32Array = new Int32Array(2048);
    static sin: Int32Array = new Int32Array(2048);
    static cos: Int32Array = new Int32Array(2048);
    static hslPal: Int32Array = new Int32Array(65536);

    static textures: (Pix8 | null)[] = new TypedArray1d(50, null);
    static textureCount: number = 0;

    static lineOffset: Int32Array = new Int32Array();
    static centerX: number = 0;
    static centerY: number = 0;

    static jagged: boolean = true;
    static clipX: boolean = false;
    static alpha: number = 0;

    static texelPool: (Int32Array | null)[] | null = null;
    static activeTexels: (Int32Array | null)[] = new TypedArray1d(50, null);
    static poolSize: number = 0;
    static cycle: number = 0;
    static textureCycle: Int32Array = new Int32Array(50);
    static texPal: (Int32Array | null)[] = new TypedArray1d(50, null);

    private static opaque: boolean = false;
    private static textureTranslucent: boolean[] = new TypedArray1d(50, false);
    private static averageTextureRGB: Int32Array = new Int32Array(50);

    static {
        for (let i: number = 1; i < 512; i++) {
            this.reciprocal15[i] = (32768 / i) | 0;
        }

        for (let i: number = 1; i < 2048; i++) {
            this.reciprocal16[i] = (65536 / i) | 0;
        }

        for (let i: number = 0; i < 2048; i++) {
            // angular frequency: 2 * pi / 2048 = 0.0030679615757712823
            // * 65536 = maximum amplitude
            this.sin[i] = (Math.sin(i * 0.0030679615757712823) * 65536.0) | 0;
            this.cos[i] = (Math.cos(i * 0.0030679615757712823) * 65536.0) | 0;
        }
    }

    static init2D(): void {
        this.lineOffset = new Int32Array(Pix2D.height2d);
        for (let y: number = 0; y < Pix2D.height2d; y++) {
            this.lineOffset[y] = Pix2D.width2d * y;
        }
        this.centerX = (Pix2D.width2d / 2) | 0;
        this.centerY = (Pix2D.height2d / 2) | 0;
    }

    static init3D(width: number, height: number): void {
        this.lineOffset = new Int32Array(height);
        for (let y: number = 0; y < height; y++) {
            this.lineOffset[y] = width * y;
        }
        this.centerX = (width / 2) | 0;
        this.centerY = (height / 2) | 0;
    }

    static clearTexels(): void {
        this.texelPool = null;
        this.activeTexels.fill(null);
    }

    static unpackTextures(textures: Jagfile): void {
        this.textureCount = 0;

        for (let i: number = 0; i < 50; i++) {
            try {
                this.textures[i] = Pix8.fromArchive(textures, i.toString());
                if (this.lowMemory && this.textures[i]?.cropW === 128) {
                    this.textures[i]?.shrink();
                } else {
                    this.textures[i]?.crop();
                }
                this.textureCount++;
            } catch (err) {
                /* empty */
            }
        }
    }

    static getAverageTextureRGB(id: number): number {
        if (this.averageTextureRGB[id] !== 0) {
            return this.averageTextureRGB[id];
        }

        const palette: Int32Array | null = this.texPal[id];
        if (!palette) {
            return 0;
        }

        let r: number = 0;
        let g: number = 0;
        let b: number = 0;
        const length: number = palette.length;
        for (let i: number = 0; i < length; i++) {
            r += (palette[i] >> 16) & 0xff;
            g += (palette[i] >> 8) & 0xff;
            b += palette[i] & 0xff;
        }

        let rgb: number = (((r / length) | 0) << 16) + (((g / length) | 0) << 8) + ((b / length) | 0);
        rgb = this.setGamma(rgb, 1.4);
        if (rgb === 0) {
            rgb = 1;
        }
        this.averageTextureRGB[id] = rgb;
        return rgb;
    }

    static setBrightness(brightness: number): void {
        const randomBrightness: number = brightness + Math.random() * 0.03 - 0.015;
        let offset: number = 0;
        for (let y: number = 0; y < 512; y++) {
            const hue: number = ((y / 8) | 0) / 64.0 + 0.0078125;
            const saturation: number = (y & 0x7) / 8.0 + 0.0625;
            for (let x: number = 0; x < 128; x++) {
                const lightness: number = x / 128.0;
                let r: number = lightness;
                let g: number = lightness;
                let b: number = lightness;
                if (saturation !== 0.0) {
                    let q: number;
                    if (lightness < 0.5) {
                        q = lightness * (saturation + 1.0);
                    } else {
                        q = lightness + saturation - lightness * saturation;
                    }
                    const p: number = lightness * 2.0 - q;
                    let t: number = hue + 0.3333333333333333;
                    if (t > 1.0) {
                        t--;
                    }
                    let d11: number = hue - 0.3333333333333333;
                    if (d11 < 0.0) {
                        d11++;
                    }
                    if (t * 6.0 < 1.0) {
                        r = p + (q - p) * 6.0 * t;
                    } else if (t * 2.0 < 1.0) {
                        r = q;
                    } else if (t * 3.0 < 2.0) {
                        r = p + (q - p) * (0.6666666666666666 - t) * 6.0;
                    } else {
                        r = p;
                    }
                    if (hue * 6.0 < 1.0) {
                        g = p + (q - p) * 6.0 * hue;
                    } else if (hue * 2.0 < 1.0) {
                        g = q;
                    } else if (hue * 3.0 < 2.0) {
                        g = p + (q - p) * (0.6666666666666666 - hue) * 6.0;
                    } else {
                        g = p;
                    }
                    if (d11 * 6.0 < 1.0) {
                        b = p + (q - p) * 6.0 * d11;
                    } else if (d11 * 2.0 < 1.0) {
                        b = q;
                    } else if (d11 * 3.0 < 2.0) {
                        b = p + (q - p) * (0.6666666666666666 - d11) * 6.0;
                    } else {
                        b = p;
                    }
                }
                const intR: number = (r * 256.0) | 0;
                const intG: number = (g * 256.0) | 0;
                const intB: number = (b * 256.0) | 0;
                const rgb: number = (intR << 16) + (intG << 8) + intB;
                this.hslPal[offset++] = this.setGamma(rgb, randomBrightness);
            }
        }
        for (let id: number = 0; id < 50; id++) {
            const texture: Pix8 | null = this.textures[id];
            if (!texture) {
                continue;
            }
            const palette: Int32Array = texture.rgbPal;
            this.texPal[id] = new Int32Array(palette.length);
            for (let i: number = 0; i < palette.length; i++) {
                const texturePalette: Int32Array | null = this.texPal[id];
                if (!texturePalette) {
                    continue;
                }
                texturePalette[i] = this.setGamma(palette[i], randomBrightness);
            }
        }

        for (let id: number = 0; id < 50; id++) {
            this.pushTexture(id);
        }
    }

    private static setGamma(rgb: number, gamma: number): number {
        const r: number = (rgb >> 16) / 256.0;
        const g: number = ((rgb >> 8) & 0xff) / 256.0;
        const b: number = (rgb & 0xff) / 256.0;
        const powR: number = Math.pow(r, gamma);
        const powG: number = Math.pow(g, gamma);
        const powB: number = Math.pow(b, gamma);
        const intR: number = (powR * 256.0) | 0;
        const intG: number = (powG * 256.0) | 0;
        const intB: number = (powB * 256.0) | 0;
        return (intR << 16) + (intG << 8) + intB;
    }

    static initPool(size: number): void {
        if (this.texelPool) {
            return;
        }
        this.poolSize = size;
        if (this.lowMemory) {
            this.texelPool = new Int32Array2d(size, 16384);
        } else {
            this.texelPool = new Int32Array2d(size, 65536);
        }
        this.activeTexels.fill(null);
    }

    static fillGouraudTriangle(xA: number, xB: number, xC: number, yA: number, yB: number, yC: number, colorA: number, colorB: number, colorC: number): void {
        let xStepAB: number = 0;
        let colorStepAB: number = 0;
        if (yB !== yA) {
            xStepAB = (((xB - xA) << 16) / (yB - yA)) | 0;
            colorStepAB = (((colorB - colorA) << 15) / (yB - yA)) | 0;
        }

        let xStepBC: number = 0;
        let colorStepBC: number = 0;
        if (yC !== yB) {
            xStepBC = (((xC - xB) << 16) / (yC - yB)) | 0;
            colorStepBC = (((colorC - colorB) << 15) / (yC - yB)) | 0;
        }

        let xStepAC: number = 0;
        let colorStepAC: number = 0;
        if (yC !== yA) {
            xStepAC = (((xA - xC) << 16) / (yA - yC)) | 0;
            colorStepAC = (((colorA - colorC) << 15) / (yA - yC)) | 0;
        }

        if (yA <= yB && yA <= yC) {
            if (yA < Pix2D.bottom) {
                if (yB > Pix2D.bottom) {
                    yB = Pix2D.bottom;
                }
                if (yC > Pix2D.bottom) {
                    yC = Pix2D.bottom;
                }
                if (yB < yC) {
                    xC = xA <<= 0x10;
                    colorC = colorA <<= 0xf;
                    if (yA < 0) {
                        xC -= xStepAC * yA;
                        xA -= xStepAB * yA;
                        colorC -= colorStepAC * yA;
                        colorA -= colorStepAB * yA;
                        yA = 0;
                    }
                    xB <<= 0x10;
                    colorB <<= 0xf;
                    if (yB < 0) {
                        xB -= xStepBC * yB;
                        colorB -= colorStepBC * yB;
                        yB = 0;
                    }
                    if ((yA !== yB && xStepAC < xStepAB) || (yA === yB && xStepAC > xStepBC)) {
                        yC -= yB;
                        yB -= yA;
                        yA = Pix3D.lineOffset[yA];
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            yB--;
                            if (yB < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    yC--;
                                    if (yC < 0) {
                                        return;
                                    }
                                    this.drawGouraudScanline(xC >> 16, xB >> 16, colorC >> 7, colorB >> 7, Pix2D.pixels, yA, 0);
                                    xC += xStepAC;
                                    xB += xStepBC;
                                    colorC += colorStepAC;
                                    colorB += colorStepBC;
                                    yA += Pix2D.width2d;
                                }
                            }
                            this.drawGouraudScanline(xC >> 16, xA >> 16, colorC >> 7, colorA >> 7, Pix2D.pixels, yA, 0);
                            xC += xStepAC;
                            xA += xStepAB;
                            colorC += colorStepAC;
                            colorA += colorStepAB;
                            yA += Pix2D.width2d;
                        }
                    } else {
                        yC -= yB;
                        yB -= yA;
                        yA = Pix3D.lineOffset[yA];
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            yB--;
                            if (yB < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    yC--;
                                    if (yC < 0) {
                                        return;
                                    }
                                    this.drawGouraudScanline(xB >> 16, xC >> 16, colorB >> 7, colorC >> 7, Pix2D.pixels, yA, 0);
                                    xC += xStepAC;
                                    xB += xStepBC;
                                    colorC += colorStepAC;
                                    colorB += colorStepBC;
                                    yA += Pix2D.width2d;
                                }
                            }
                            this.drawGouraudScanline(xA >> 16, xC >> 16, colorA >> 7, colorC >> 7, Pix2D.pixels, yA, 0);
                            xC += xStepAC;
                            xA += xStepAB;
                            colorC += colorStepAC;
                            colorA += colorStepAB;
                            yA += Pix2D.width2d;
                        }
                    }
                } else {
                    xB = xA <<= 0x10;
                    colorB = colorA <<= 0xf;
                    if (yA < 0) {
                        xB -= xStepAC * yA;
                        xA -= xStepAB * yA;
                        colorB -= colorStepAC * yA;
                        colorA -= colorStepAB * yA;
                        yA = 0;
                    }
                    xC <<= 0x10;
                    colorC <<= 0xf;
                    if (yC < 0) {
                        xC -= xStepBC * yC;
                        colorC -= colorStepBC * yC;
                        yC = 0;
                    }
                    if ((yA !== yC && xStepAC < xStepAB) || (yA === yC && xStepBC > xStepAB)) {
                        yB -= yC;
                        yC -= yA;
                        yA = Pix3D.lineOffset[yA];
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            yC--;
                            if (yC < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    yB--;
                                    if (yB < 0) {
                                        return;
                                    }
                                    this.drawGouraudScanline(xC >> 16, xA >> 16, colorC >> 7, colorA >> 7, Pix2D.pixels, yA, 0);
                                    xC += xStepBC;
                                    xA += xStepAB;
                                    colorC += colorStepBC;
                                    colorA += colorStepAB;
                                    yA += Pix2D.width2d;
                                }
                            }
                            this.drawGouraudScanline(xB >> 16, xA >> 16, colorB >> 7, colorA >> 7, Pix2D.pixels, yA, 0);
                            xB += xStepAC;
                            xA += xStepAB;
                            colorB += colorStepAC;
                            colorA += colorStepAB;
                            yA += Pix2D.width2d;
                        }
                    } else {
                        yB -= yC;
                        yC -= yA;
                        yA = Pix3D.lineOffset[yA];
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            yC--;
                            if (yC < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    yB--;
                                    if (yB < 0) {
                                        return;
                                    }
                                    this.drawGouraudScanline(xA >> 16, xC >> 16, colorA >> 7, colorC >> 7, Pix2D.pixels, yA, 0);
                                    xC += xStepBC;
                                    xA += xStepAB;
                                    colorC += colorStepBC;
                                    colorA += colorStepAB;
                                    yA += Pix2D.width2d;
                                }
                            }
                            this.drawGouraudScanline(xA >> 16, xB >> 16, colorA >> 7, colorB >> 7, Pix2D.pixels, yA, 0);
                            xB += xStepAC;
                            xA += xStepAB;
                            colorB += colorStepAC;
                            colorA += colorStepAB;
                            yA += Pix2D.width2d;
                        }
                    }
                }
            }
        } else if (yB <= yC) {
            if (yB < Pix2D.bottom) {
                if (yC > Pix2D.bottom) {
                    yC = Pix2D.bottom;
                }
                if (yA > Pix2D.bottom) {
                    yA = Pix2D.bottom;
                }
                if (yC < yA) {
                    xA = xB <<= 0x10;
                    colorA = colorB <<= 0xf;
                    if (yB < 0) {
                        xA -= xStepAB * yB;
                        xB -= xStepBC * yB;
                        colorA -= colorStepAB * yB;
                        colorB -= colorStepBC * yB;
                        yB = 0;
                    }
                    xC <<= 0x10;
                    colorC <<= 0xf;
                    if (yC < 0) {
                        xC -= xStepAC * yC;
                        colorC -= colorStepAC * yC;
                        yC = 0;
                    }
                    if ((yB !== yC && xStepAB < xStepBC) || (yB === yC && xStepAB > xStepAC)) {
                        yA -= yC;
                        yC -= yB;
                        yB = Pix3D.lineOffset[yB];
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            yC--;
                            if (yC < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    yA--;
                                    if (yA < 0) {
                                        return;
                                    }
                                    this.drawGouraudScanline(xA >> 16, xC >> 16, colorA >> 7, colorC >> 7, Pix2D.pixels, yB, 0);
                                    xA += xStepAB;
                                    xC += xStepAC;
                                    colorA += colorStepAB;
                                    colorC += colorStepAC;
                                    yB += Pix2D.width2d;
                                }
                            }
                            this.drawGouraudScanline(xA >> 16, xB >> 16, colorA >> 7, colorB >> 7, Pix2D.pixels, yB, 0);
                            xA += xStepAB;
                            xB += xStepBC;
                            colorA += colorStepAB;
                            colorB += colorStepBC;
                            yB += Pix2D.width2d;
                        }
                    } else {
                        yA -= yC;
                        yC -= yB;
                        yB = Pix3D.lineOffset[yB];
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            yC--;
                            if (yC < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    yA--;
                                    if (yA < 0) {
                                        return;
                                    }
                                    this.drawGouraudScanline(xC >> 16, xA >> 16, colorC >> 7, colorA >> 7, Pix2D.pixels, yB, 0);
                                    xA += xStepAB;
                                    xC += xStepAC;
                                    colorA += colorStepAB;
                                    colorC += colorStepAC;
                                    yB += Pix2D.width2d;
                                }
                            }
                            this.drawGouraudScanline(xB >> 16, xA >> 16, colorB >> 7, colorA >> 7, Pix2D.pixels, yB, 0);
                            xA += xStepAB;
                            xB += xStepBC;
                            colorA += colorStepAB;
                            colorB += colorStepBC;
                            yB += Pix2D.width2d;
                        }
                    }
                } else {
                    xC = xB <<= 0x10;
                    colorC = colorB <<= 0xf;
                    if (yB < 0) {
                        xC -= xStepAB * yB;
                        xB -= xStepBC * yB;
                        colorC -= colorStepAB * yB;
                        colorB -= colorStepBC * yB;
                        yB = 0;
                    }
                    xA <<= 0x10;
                    colorA <<= 0xf;
                    if (yA < 0) {
                        xA -= xStepAC * yA;
                        colorA -= colorStepAC * yA;
                        yA = 0;
                    }
                    yC -= yA;
                    yA -= yB;
                    yB = Pix3D.lineOffset[yB];
                    if (xStepAB < xStepBC) {
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            yA--;
                            if (yA < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    yC--;
                                    if (yC < 0) {
                                        return;
                                    }
                                    this.drawGouraudScanline(xA >> 16, xB >> 16, colorA >> 7, colorB >> 7, Pix2D.pixels, yB, 0);
                                    xA += xStepAC;
                                    xB += xStepBC;
                                    colorA += colorStepAC;
                                    colorB += colorStepBC;
                                    yB += Pix2D.width2d;
                                }
                            }
                            this.drawGouraudScanline(xC >> 16, xB >> 16, colorC >> 7, colorB >> 7, Pix2D.pixels, yB, 0);
                            xC += xStepAB;
                            xB += xStepBC;
                            colorC += colorStepAB;
                            colorB += colorStepBC;
                            yB += Pix2D.width2d;
                        }
                    } else {
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            yA--;
                            if (yA < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    yC--;
                                    if (yC < 0) {
                                        return;
                                    }
                                    this.drawGouraudScanline(xB >> 16, xA >> 16, colorB >> 7, colorA >> 7, Pix2D.pixels, yB, 0);
                                    xA += xStepAC;
                                    xB += xStepBC;
                                    colorA += colorStepAC;
                                    colorB += colorStepBC;
                                    yB += Pix2D.width2d;
                                }
                            }
                            this.drawGouraudScanline(xB >> 16, xC >> 16, colorB >> 7, colorC >> 7, Pix2D.pixels, yB, 0);
                            xC += xStepAB;
                            xB += xStepBC;
                            colorC += colorStepAB;
                            colorB += colorStepBC;
                            yB += Pix2D.width2d;
                        }
                    }
                }
            }
        } else if (yC < Pix2D.bottom) {
            if (yA > Pix2D.bottom) {
                yA = Pix2D.bottom;
            }
            if (yB > Pix2D.bottom) {
                yB = Pix2D.bottom;
            }
            if (yA < yB) {
                xB = xC <<= 0x10;
                colorB = colorC <<= 0xf;
                if (yC < 0) {
                    xB -= xStepBC * yC;
                    xC -= xStepAC * yC;
                    colorB -= colorStepBC * yC;
                    colorC -= colorStepAC * yC;
                    yC = 0;
                }
                xA <<= 0x10;
                colorA <<= 0xf;
                if (yA < 0) {
                    xA -= xStepAB * yA;
                    colorA -= colorStepAB * yA;
                    yA = 0;
                }
                yB -= yA;
                yA -= yC;
                yC = Pix3D.lineOffset[yC];
                if (xStepBC < xStepAC) {
                    // eslint-disable-next-line no-constant-condition
                    while (true) {
                        yA--;
                        if (yA < 0) {
                            // eslint-disable-next-line no-constant-condition
                            while (true) {
                                yB--;
                                if (yB < 0) {
                                    return;
                                }
                                this.drawGouraudScanline(xB >> 16, xA >> 16, colorB >> 7, colorA >> 7, Pix2D.pixels, yC, 0);
                                xB += xStepBC;
                                xA += xStepAB;
                                colorB += colorStepBC;
                                colorA += colorStepAB;
                                yC += Pix2D.width2d;
                            }
                        }
                        this.drawGouraudScanline(xB >> 16, xC >> 16, colorB >> 7, colorC >> 7, Pix2D.pixels, yC, 0);
                        xB += xStepBC;
                        xC += xStepAC;
                        colorB += colorStepBC;
                        colorC += colorStepAC;
                        yC += Pix2D.width2d;
                    }
                } else {
                    // eslint-disable-next-line no-constant-condition
                    while (true) {
                        yA--;
                        if (yA < 0) {
                            // eslint-disable-next-line no-constant-condition
                            while (true) {
                                yB--;
                                if (yB < 0) {
                                    return;
                                }
                                this.drawGouraudScanline(xA >> 16, xB >> 16, colorA >> 7, colorB >> 7, Pix2D.pixels, yC, 0);
                                xB += xStepBC;
                                xA += xStepAB;
                                colorB += colorStepBC;
                                colorA += colorStepAB;
                                yC += Pix2D.width2d;
                            }
                        }
                        this.drawGouraudScanline(xC >> 16, xB >> 16, colorC >> 7, colorB >> 7, Pix2D.pixels, yC, 0);
                        xB += xStepBC;
                        xC += xStepAC;
                        colorB += colorStepBC;
                        colorC += colorStepAC;
                        yC += Pix2D.width2d;
                    }
                }
            } else {
                xA = xC <<= 0x10;
                colorA = colorC <<= 0xf;
                if (yC < 0) {
                    xA -= xStepBC * yC;
                    xC -= xStepAC * yC;
                    colorA -= colorStepBC * yC;
                    colorC -= colorStepAC * yC;
                    yC = 0;
                }
                xB <<= 0x10;
                colorB <<= 0xf;
                if (yB < 0) {
                    xB -= xStepAB * yB;
                    colorB -= colorStepAB * yB;
                    yB = 0;
                }
                yA -= yB;
                yB -= yC;
                yC = Pix3D.lineOffset[yC];
                if (xStepBC < xStepAC) {
                    // eslint-disable-next-line no-constant-condition
                    while (true) {
                        yB--;
                        if (yB < 0) {
                            // eslint-disable-next-line no-constant-condition
                            while (true) {
                                yA--;
                                if (yA < 0) {
                                    return;
                                }
                                this.drawGouraudScanline(xB >> 16, xC >> 16, colorB >> 7, colorC >> 7, Pix2D.pixels, yC, 0);
                                xB += xStepAB;
                                xC += xStepAC;
                                colorB += colorStepAB;
                                colorC += colorStepAC;
                                yC += Pix2D.width2d;
                            }
                        }
                        this.drawGouraudScanline(xA >> 16, xC >> 16, colorA >> 7, colorC >> 7, Pix2D.pixels, yC, 0);
                        xA += xStepBC;
                        xC += xStepAC;
                        colorA += colorStepBC;
                        colorC += colorStepAC;
                        yC += Pix2D.width2d;
                    }
                } else {
                    // eslint-disable-next-line no-constant-condition
                    while (true) {
                        yB--;
                        if (yB < 0) {
                            // eslint-disable-next-line no-constant-condition
                            while (true) {
                                yA--;
                                if (yA < 0) {
                                    return;
                                }
                                this.drawGouraudScanline(xC >> 16, xB >> 16, colorC >> 7, colorB >> 7, Pix2D.pixels, yC, 0);
                                xB += xStepAB;
                                xC += xStepAC;
                                colorB += colorStepAB;
                                colorC += colorStepAC;
                                yC += Pix2D.width2d;
                            }
                        }
                        this.drawGouraudScanline(xC >> 16, xA >> 16, colorC >> 7, colorA >> 7, Pix2D.pixels, yC, 0);
                        xA += xStepBC;
                        xC += xStepAC;
                        colorA += colorStepBC;
                        colorC += colorStepAC;
                        yC += Pix2D.width2d;
                    }
                }
            }
        }
    }

    private static drawGouraudScanline(x0: number, x1: number, color0: number, color1: number, dst: Int32Array, offset: number, length: number): void {
        let rgb: number;

        if (Pix3D.jagged) {
            let colorStep: number;

            if (Pix3D.clipX) {
                if (x1 - x0 > 3) {
                    colorStep = ((color1 - color0) / (x1 - x0)) | 0;
                } else {
                    colorStep = 0;
                }
                if (x1 > Pix2D.boundX) {
                    x1 = Pix2D.boundX;
                }
                if (x0 < 0) {
                    color0 -= x0 * colorStep;
                    x0 = 0;
                }
                if (x0 >= x1) {
                    return;
                }
                offset += x0;
                length = (x1 - x0) >> 2;
                colorStep <<= 0x2;
            } else if (x0 < x1) {
                offset += x0;
                length = (x1 - x0) >> 2;
                if (length > 0) {
                    colorStep = ((color1 - color0) * Pix3D.reciprocal15[length]) >> 15;
                } else {
                    colorStep = 0;
                }
            } else {
                return;
            }

            if (Pix3D.alpha === 0) {
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    length--;
                    if (length < 0) {
                        length = (x1 - x0) & 0x3;
                        if (length > 0) {
                            rgb = Pix3D.hslPal[color0 >> 8];
                            do {
                                dst[offset++] = rgb;
                                length--;
                            } while (length > 0);
                            return;
                        }
                        break;
                    }
                    rgb = Pix3D.hslPal[color0 >> 8];
                    color0 += colorStep;
                    dst[offset++] = rgb;
                    dst[offset++] = rgb;
                    dst[offset++] = rgb;
                    dst[offset++] = rgb;
                }
            } else {
                const alpha: number = Pix3D.alpha;
                const invAlpha: number = 256 - Pix3D.alpha;
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    length--;
                    if (length < 0) {
                        length = (x1 - x0) & 0x3;
                        if (length > 0) {
                            rgb = Pix3D.hslPal[color0 >> 8];
                            rgb = ((((rgb & 0xff00ff) * invAlpha) >> 8) & 0xff00ff) + ((((rgb & 0xff00) * invAlpha) >> 8) & 0xff00);
                            do {
                                dst[offset++] = rgb + ((((dst[offset] & 0xff00ff) * alpha) >> 8) & 0xff00ff) + ((((dst[offset] & 0xff00) * alpha) >> 8) & 0xff00);
                                length--;
                            } while (length > 0);
                        }
                        break;
                    }
                    rgb = Pix3D.hslPal[color0 >> 8];
                    color0 += colorStep;
                    rgb = ((((rgb & 0xff00ff) * invAlpha) >> 8) & 0xff00ff) + ((((rgb & 0xff00) * invAlpha) >> 8) & 0xff00);
                    dst[offset++] = rgb + ((((dst[offset] & 0xff00ff) * alpha) >> 8) & 0xff00ff) + ((((dst[offset] & 0xff00) * alpha) >> 8) & 0xff00);
                    dst[offset++] = rgb + ((((dst[offset] & 0xff00ff) * alpha) >> 8) & 0xff00ff) + ((((dst[offset] & 0xff00) * alpha) >> 8) & 0xff00);
                    dst[offset++] = rgb + ((((dst[offset] & 0xff00ff) * alpha) >> 8) & 0xff00ff) + ((((dst[offset] & 0xff00) * alpha) >> 8) & 0xff00);
                    dst[offset++] = rgb + ((((dst[offset] & 0xff00ff) * alpha) >> 8) & 0xff00ff) + ((((dst[offset] & 0xff00) * alpha) >> 8) & 0xff00);
                }
            }
        } else if (x0 < x1) {
            const colorStep: number = ((color1 - color0) / (x1 - x0)) | 0;
            if (Pix3D.clipX) {
                if (x1 > Pix2D.boundX) {
                    x1 = Pix2D.boundX;
                }
                if (x0 < 0) {
                    color0 -= x0 * colorStep;
                    x0 = 0;
                }
                if (x0 >= x1) {
                    return;
                }
            }
            offset += x0;
            length = x1 - x0;
            if (Pix3D.alpha === 0) {
                do {
                    dst[offset++] = Pix3D.hslPal[color0 >> 8];
                    color0 += colorStep;
                    length--;
                } while (length > 0);
            } else {
                const alpha: number = Pix3D.alpha;
                const invAlpha: number = 256 - Pix3D.alpha;
                do {
                    rgb = Pix3D.hslPal[color0 >> 8];
                    color0 += colorStep;
                    rgb = ((((rgb & 0xff00ff) * invAlpha) >> 8) & 0xff00ff) + ((((rgb & 0xff00) * invAlpha) >> 8) & 0xff00);
                    dst[offset++] = rgb + ((((dst[offset] & 0xff00ff) * alpha) >> 8) & 0xff00ff) + ((((dst[offset] & 0xff00) * alpha) >> 8) & 0xff00);
                    length--;
                } while (length > 0);
            }
        }
    }

    static fillTriangle(x0: number, x1: number, x2: number, y0: number, y1: number, y2: number, color: number): void {
        let xStepAB: number = 0;
        if (y1 !== y0) {
            xStepAB = (((x1 - x0) << 16) / (y1 - y0)) | 0;
        }
        let xStepBC: number = 0;
        if (y2 !== y1) {
            xStepBC = (((x2 - x1) << 16) / (y2 - y1)) | 0;
        }
        let xStepAC: number = 0;
        if (y2 !== y0) {
            xStepAC = (((x0 - x2) << 16) / (y0 - y2)) | 0;
        }
        if (y0 <= y1 && y0 <= y2) {
            if (y0 < Pix2D.bottom) {
                if (y1 > Pix2D.bottom) {
                    y1 = Pix2D.bottom;
                }
                if (y2 > Pix2D.bottom) {
                    y2 = Pix2D.bottom;
                }
                if (y1 < y2) {
                    x2 = x0 <<= 0x10;
                    if (y0 < 0) {
                        x2 -= xStepAC * y0;
                        x0 -= xStepAB * y0;
                        y0 = 0;
                    }
                    x1 <<= 0x10;
                    if (y1 < 0) {
                        x1 -= xStepBC * y1;
                        y1 = 0;
                    }
                    if ((y0 !== y1 && xStepAC < xStepAB) || (y0 === y1 && xStepAC > xStepBC)) {
                        y2 -= y1;
                        y1 -= y0;
                        y0 = this.lineOffset[y0];
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            y1--;
                            if (y1 < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    y2--;
                                    if (y2 < 0) {
                                        return;
                                    }
                                    this.drawScanline(x2 >> 16, x1 >> 16, Pix2D.pixels, y0, color);
                                    x2 += xStepAC;
                                    x1 += xStepBC;
                                    y0 += Pix2D.width2d;
                                }
                            }
                            this.drawScanline(x2 >> 16, x0 >> 16, Pix2D.pixels, y0, color);
                            x2 += xStepAC;
                            x0 += xStepAB;
                            y0 += Pix2D.width2d;
                        }
                    } else {
                        y2 -= y1;
                        y1 -= y0;
                        y0 = this.lineOffset[y0];
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            y1--;
                            if (y1 < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    y2--;
                                    if (y2 < 0) {
                                        return;
                                    }
                                    this.drawScanline(x1 >> 16, x2 >> 16, Pix2D.pixels, y0, color);
                                    x2 += xStepAC;
                                    x1 += xStepBC;
                                    y0 += Pix2D.width2d;
                                }
                            }
                            this.drawScanline(x0 >> 16, x2 >> 16, Pix2D.pixels, y0, color);
                            x2 += xStepAC;
                            x0 += xStepAB;
                            y0 += Pix2D.width2d;
                        }
                    }
                } else {
                    x1 = x0 <<= 0x10;
                    if (y0 < 0) {
                        x1 -= xStepAC * y0;
                        x0 -= xStepAB * y0;
                        y0 = 0;
                    }
                    x2 <<= 0x10;
                    if (y2 < 0) {
                        x2 -= xStepBC * y2;
                        y2 = 0;
                    }
                    if ((y0 !== y2 && xStepAC < xStepAB) || (y0 === y2 && xStepBC > xStepAB)) {
                        y1 -= y2;
                        y2 -= y0;
                        y0 = this.lineOffset[y0];
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            y2--;
                            if (y2 < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    y1--;
                                    if (y1 < 0) {
                                        return;
                                    }
                                    this.drawScanline(x2 >> 16, x0 >> 16, Pix2D.pixels, y0, color);
                                    x2 += xStepBC;
                                    x0 += xStepAB;
                                    y0 += Pix2D.width2d;
                                }
                            }
                            this.drawScanline(x1 >> 16, x0 >> 16, Pix2D.pixels, y0, color);
                            x1 += xStepAC;
                            x0 += xStepAB;
                            y0 += Pix2D.width2d;
                        }
                    } else {
                        y1 -= y2;
                        y2 -= y0;
                        y0 = this.lineOffset[y0];
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            y2--;
                            if (y2 < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    y1--;
                                    if (y1 < 0) {
                                        return;
                                    }
                                    this.drawScanline(x0 >> 16, x2 >> 16, Pix2D.pixels, y0, color);
                                    x2 += xStepBC;
                                    x0 += xStepAB;
                                    y0 += Pix2D.width2d;
                                }
                            }
                            this.drawScanline(x0 >> 16, x1 >> 16, Pix2D.pixels, y0, color);
                            x1 += xStepAC;
                            x0 += xStepAB;
                            y0 += Pix2D.width2d;
                        }
                    }
                }
            }
        } else if (y1 <= y2) {
            if (y1 < Pix2D.bottom) {
                if (y2 > Pix2D.bottom) {
                    y2 = Pix2D.bottom;
                }
                if (y0 > Pix2D.bottom) {
                    y0 = Pix2D.bottom;
                }
                if (y2 < y0) {
                    x0 = x1 <<= 0x10;
                    if (y1 < 0) {
                        x0 -= xStepAB * y1;
                        x1 -= xStepBC * y1;
                        y1 = 0;
                    }
                    x2 <<= 0x10;
                    if (y2 < 0) {
                        x2 -= xStepAC * y2;
                        y2 = 0;
                    }
                    if ((y1 !== y2 && xStepAB < xStepBC) || (y1 === y2 && xStepAB > xStepAC)) {
                        y0 -= y2;
                        y2 -= y1;
                        y1 = this.lineOffset[y1];
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            y2--;
                            if (y2 < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    y0--;
                                    if (y0 < 0) {
                                        return;
                                    }
                                    this.drawScanline(x0 >> 16, x2 >> 16, Pix2D.pixels, y1, color);
                                    x0 += xStepAB;
                                    x2 += xStepAC;
                                    y1 += Pix2D.width2d;
                                }
                            }
                            this.drawScanline(x0 >> 16, x1 >> 16, Pix2D.pixels, y1, color);
                            x0 += xStepAB;
                            x1 += xStepBC;
                            y1 += Pix2D.width2d;
                        }
                    } else {
                        y0 -= y2;
                        y2 -= y1;
                        y1 = this.lineOffset[y1];
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            y2--;
                            if (y2 < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    y0--;
                                    if (y0 < 0) {
                                        return;
                                    }
                                    this.drawScanline(x2 >> 16, x0 >> 16, Pix2D.pixels, y1, color);
                                    x0 += xStepAB;
                                    x2 += xStepAC;
                                    y1 += Pix2D.width2d;
                                }
                            }
                            this.drawScanline(x1 >> 16, x0 >> 16, Pix2D.pixels, y1, color);
                            x0 += xStepAB;
                            x1 += xStepBC;
                            y1 += Pix2D.width2d;
                        }
                    }
                } else {
                    x2 = x1 <<= 0x10;
                    if (y1 < 0) {
                        x2 -= xStepAB * y1;
                        x1 -= xStepBC * y1;
                        y1 = 0;
                    }
                    x0 <<= 0x10;
                    if (y0 < 0) {
                        x0 -= xStepAC * y0;
                        y0 = 0;
                    }
                    if (xStepAB < xStepBC) {
                        y2 -= y0;
                        y0 -= y1;
                        y1 = this.lineOffset[y1];
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            y0--;
                            if (y0 < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    y2--;
                                    if (y2 < 0) {
                                        return;
                                    }
                                    this.drawScanline(x0 >> 16, x1 >> 16, Pix2D.pixels, y1, color);
                                    x0 += xStepAC;
                                    x1 += xStepBC;
                                    y1 += Pix2D.width2d;
                                }
                            }
                            this.drawScanline(x2 >> 16, x1 >> 16, Pix2D.pixels, y1, color);
                            x2 += xStepAB;
                            x1 += xStepBC;
                            y1 += Pix2D.width2d;
                        }
                    } else {
                        y2 -= y0;
                        y0 -= y1;
                        y1 = this.lineOffset[y1];
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            y0--;
                            if (y0 < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    y2--;
                                    if (y2 < 0) {
                                        return;
                                    }
                                    this.drawScanline(x1 >> 16, x0 >> 16, Pix2D.pixels, y1, color);
                                    x0 += xStepAC;
                                    x1 += xStepBC;
                                    y1 += Pix2D.width2d;
                                }
                            }
                            this.drawScanline(x1 >> 16, x2 >> 16, Pix2D.pixels, y1, color);
                            x2 += xStepAB;
                            x1 += xStepBC;
                            y1 += Pix2D.width2d;
                        }
                    }
                }
            }
        } else if (y2 < Pix2D.bottom) {
            if (y0 > Pix2D.bottom) {
                y0 = Pix2D.bottom;
            }
            if (y1 > Pix2D.bottom) {
                y1 = Pix2D.bottom;
            }
            if (y0 < y1) {
                x1 = x2 <<= 0x10;
                if (y2 < 0) {
                    x1 -= xStepBC * y2;
                    x2 -= xStepAC * y2;
                    y2 = 0;
                }
                x0 <<= 0x10;
                if (y0 < 0) {
                    x0 -= xStepAB * y0;
                    y0 = 0;
                }
                if (xStepBC < xStepAC) {
                    y1 -= y0;
                    y0 -= y2;
                    y2 = this.lineOffset[y2];
                    // eslint-disable-next-line no-constant-condition
                    while (true) {
                        y0--;
                        if (y0 < 0) {
                            // eslint-disable-next-line no-constant-condition
                            while (true) {
                                y1--;
                                if (y1 < 0) {
                                    return;
                                }
                                this.drawScanline(x1 >> 16, x0 >> 16, Pix2D.pixels, y2, color);
                                x1 += xStepBC;
                                x0 += xStepAB;
                                y2 += Pix2D.width2d;
                            }
                        }
                        this.drawScanline(x1 >> 16, x2 >> 16, Pix2D.pixels, y2, color);
                        x1 += xStepBC;
                        x2 += xStepAC;
                        y2 += Pix2D.width2d;
                    }
                } else {
                    y1 -= y0;
                    y0 -= y2;
                    y2 = this.lineOffset[y2];
                    // eslint-disable-next-line no-constant-condition
                    while (true) {
                        y0--;
                        if (y0 < 0) {
                            // eslint-disable-next-line no-constant-condition
                            while (true) {
                                y1--;
                                if (y1 < 0) {
                                    return;
                                }
                                this.drawScanline(x0 >> 16, x1 >> 16, Pix2D.pixels, y2, color);
                                x1 += xStepBC;
                                x0 += xStepAB;
                                y2 += Pix2D.width2d;
                            }
                        }
                        this.drawScanline(x2 >> 16, x1 >> 16, Pix2D.pixels, y2, color);
                        x1 += xStepBC;
                        x2 += xStepAC;
                        y2 += Pix2D.width2d;
                    }
                }
            } else {
                x0 = x2 <<= 0x10;
                if (y2 < 0) {
                    x0 -= xStepBC * y2;
                    x2 -= xStepAC * y2;
                    y2 = 0;
                }
                x1 <<= 0x10;
                if (y1 < 0) {
                    x1 -= xStepAB * y1;
                    y1 = 0;
                }
                if (xStepBC < xStepAC) {
                    y0 -= y1;
                    y1 -= y2;
                    y2 = this.lineOffset[y2];
                    // eslint-disable-next-line no-constant-condition
                    while (true) {
                        y1--;
                        if (y1 < 0) {
                            // eslint-disable-next-line no-constant-condition
                            while (true) {
                                y0--;
                                if (y0 < 0) {
                                    return;
                                }
                                this.drawScanline(x1 >> 16, x2 >> 16, Pix2D.pixels, y2, color);
                                x1 += xStepAB;
                                x2 += xStepAC;
                                y2 += Pix2D.width2d;
                            }
                        }
                        this.drawScanline(x0 >> 16, x2 >> 16, Pix2D.pixels, y2, color);
                        x0 += xStepBC;
                        x2 += xStepAC;
                        y2 += Pix2D.width2d;
                    }
                } else {
                    y0 -= y1;
                    y1 -= y2;
                    y2 = this.lineOffset[y2];
                    // eslint-disable-next-line no-constant-condition
                    while (true) {
                        y1--;
                        if (y1 < 0) {
                            // eslint-disable-next-line no-constant-condition
                            while (true) {
                                y0--;
                                if (y0 < 0) {
                                    return;
                                }
                                this.drawScanline(x2 >> 16, x1 >> 16, Pix2D.pixels, y2, color);
                                x1 += xStepAB;
                                x2 += xStepAC;
                                y2 += Pix2D.width2d;
                            }
                        }
                        this.drawScanline(x2 >> 16, x0 >> 16, Pix2D.pixels, y2, color);
                        x0 += xStepBC;
                        x2 += xStepAC;
                        y2 += Pix2D.width2d;
                    }
                }
            }
        }
    }

    static fillTexturedTriangle(
        xA: number,
        xB: number,
        xC: number,
        yA: number,
        yB: number,
        yC: number,
        shadeA: number,
        shadeB: number,
        shadeC: number,
        originX: number,
        originY: number,
        originZ: number,
        txB: number,
        txC: number,
        tyB: number,
        tyC: number,
        tzB: number,
        tzC: number,
        texture: number
    ): void {
        const texels: Int32Array | null = this.getTexels(texture);
        this.opaque = !this.textureTranslucent[texture];

        const verticalX: number = originX - txB;
        const verticalY: number = originY - tyB;
        const verticalZ: number = originZ - tzB;

        const horizontalX: number = txC - originX;
        const horizontalY: number = tyC - originY;
        const horizontalZ: number = tzC - originZ;

        let u: number = (horizontalX * originY - horizontalY * originX) << 14;
        const uStride: number = (horizontalY * originZ - horizontalZ * originY) << 8;
        const uStepVertical: number = (horizontalZ * originX - horizontalX * originZ) << 5;

        let v: number = (verticalX * originY - verticalY * originX) << 14;
        const vStride: number = (verticalY * originZ - verticalZ * originY) << 8;
        const vStepVertical: number = (verticalZ * originX - verticalX * originZ) << 5;

        let w: number = (verticalY * horizontalX - verticalX * horizontalY) << 14;
        const wStride: number = (verticalZ * horizontalY - verticalY * horizontalZ) << 8;
        const wStepVertical: number = (verticalX * horizontalZ - verticalZ * horizontalX) << 5;

        let xStepAB: number = 0;
        let shadeStepAB: number = 0;
        if (yB !== yA) {
            xStepAB = (((xB - xA) << 16) / (yB - yA)) | 0;
            shadeStepAB = (((shadeB - shadeA) << 16) / (yB - yA)) | 0;
        }

        let xStepBC: number = 0;
        let shadeStepBC: number = 0;
        if (yC !== yB) {
            xStepBC = (((xC - xB) << 16) / (yC - yB)) | 0;
            shadeStepBC = (((shadeC - shadeB) << 16) / (yC - yB)) | 0;
        }

        let xStepAC: number = 0;
        let shadeStepAC: number = 0;
        if (yC !== yA) {
            xStepAC = (((xA - xC) << 16) / (yA - yC)) | 0;
            shadeStepAC = (((shadeA - shadeC) << 16) / (yA - yC)) | 0;
        }

        if (yA <= yB && yA <= yC) {
            if (yA < Pix2D.bottom) {
                if (yB > Pix2D.bottom) {
                    yB = Pix2D.bottom;
                }

                if (yC > Pix2D.bottom) {
                    yC = Pix2D.bottom;
                }

                if (yB < yC) {
                    xC = xA <<= 0x10;
                    shadeC = shadeA <<= 0x10;
                    if (yA < 0) {
                        xC -= xStepAC * yA;
                        xA -= xStepAB * yA;
                        shadeC -= shadeStepAC * yA;
                        shadeA -= shadeStepAB * yA;
                        yA = 0;
                    }
                    xB <<= 0x10;
                    shadeB <<= 0x10;
                    if (yB < 0) {
                        xB -= xStepBC * yB;
                        shadeB -= shadeStepBC * yB;
                        yB = 0;
                    }
                    const dy: number = yA - this.centerY;
                    u += uStepVertical * dy;
                    v += vStepVertical * dy;
                    w += wStepVertical * dy;
                    u |= 0;
                    v |= 0;
                    w |= 0;
                    if ((yA !== yB && xStepAC < xStepAB) || (yA === yB && xStepAC > xStepBC)) {
                        yC -= yB;
                        yB -= yA;
                        yA = this.lineOffset[yA];
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            yB--;
                            if (yB < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    yC--;
                                    if (yC < 0) {
                                        return;
                                    }
                                    this.drawTexturedScanline(xC >> 16, xB >> 16, Pix2D.pixels, yA, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeC >> 8, shadeB >> 8);
                                    xC += xStepAC;
                                    xB += xStepBC;
                                    shadeC += shadeStepAC;
                                    shadeB += shadeStepBC;
                                    yA += Pix2D.width2d;
                                    u += uStepVertical;
                                    v += vStepVertical;
                                    w += wStepVertical;
                                    u |= 0;
                                    v |= 0;
                                    w |= 0;
                                }
                            }
                            this.drawTexturedScanline(xC >> 16, xA >> 16, Pix2D.pixels, yA, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeC >> 8, shadeA >> 8);
                            xC += xStepAC;
                            xA += xStepAB;
                            shadeC += shadeStepAC;
                            shadeA += shadeStepAB;
                            yA += Pix2D.width2d;
                            u += uStepVertical;
                            v += vStepVertical;
                            w += wStepVertical;
                            u |= 0;
                            v |= 0;
                            w |= 0;
                        }
                    } else {
                        yC -= yB;
                        yB -= yA;
                        yA = this.lineOffset[yA];
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            yB--;
                            if (yB < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    yC--;
                                    if (yC < 0) {
                                        return;
                                    }
                                    this.drawTexturedScanline(xB >> 16, xC >> 16, Pix2D.pixels, yA, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeB >> 8, shadeC >> 8);
                                    xC += xStepAC;
                                    xB += xStepBC;
                                    shadeC += shadeStepAC;
                                    shadeB += shadeStepBC;
                                    yA += Pix2D.width2d;
                                    u += uStepVertical;
                                    v += vStepVertical;
                                    w += wStepVertical;
                                    u |= 0;
                                    v |= 0;
                                    w |= 0;
                                }
                            }
                            this.drawTexturedScanline(xA >> 16, xC >> 16, Pix2D.pixels, yA, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeA >> 8, shadeC >> 8);
                            xC += xStepAC;
                            xA += xStepAB;
                            shadeC += shadeStepAC;
                            shadeA += shadeStepAB;
                            yA += Pix2D.width2d;
                            u += uStepVertical;
                            v += vStepVertical;
                            w += wStepVertical;
                            u |= 0;
                            v |= 0;
                            w |= 0;
                        }
                    }
                } else {
                    xB = xA <<= 0x10;
                    shadeB = shadeA <<= 0x10;
                    if (yA < 0) {
                        xB -= xStepAC * yA;
                        xA -= xStepAB * yA;
                        shadeB -= shadeStepAC * yA;
                        shadeA -= shadeStepAB * yA;
                        yA = 0;
                    }
                    xC <<= 0x10;
                    shadeC <<= 0x10;
                    if (yC < 0) {
                        xC -= xStepBC * yC;
                        shadeC -= shadeStepBC * yC;
                        yC = 0;
                    }
                    const dy: number = yA - this.centerY;
                    u += uStepVertical * dy;
                    v += vStepVertical * dy;
                    w += wStepVertical * dy;
                    u |= 0;
                    v |= 0;
                    w |= 0;
                    if ((yA === yC || xStepAC >= xStepAB) && (yA !== yC || xStepBC <= xStepAB)) {
                        yB -= yC;
                        yC -= yA;
                        yA = this.lineOffset[yA];
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            yC--;
                            if (yC < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    yB--;
                                    if (yB < 0) {
                                        return;
                                    }
                                    this.drawTexturedScanline(xA >> 16, xC >> 16, Pix2D.pixels, yA, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeA >> 8, shadeC >> 8);
                                    xC += xStepBC;
                                    xA += xStepAB;
                                    shadeC += shadeStepBC;
                                    shadeA += shadeStepAB;
                                    yA += Pix2D.width2d;
                                    u += uStepVertical;
                                    v += vStepVertical;
                                    w += wStepVertical;
                                    u |= 0;
                                    v |= 0;
                                    w |= 0;
                                }
                            }
                            this.drawTexturedScanline(xA >> 16, xB >> 16, Pix2D.pixels, yA, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeA >> 8, shadeB >> 8);
                            xB += xStepAC;
                            xA += xStepAB;
                            shadeB += shadeStepAC;
                            shadeA += shadeStepAB;
                            yA += Pix2D.width2d;
                            u += uStepVertical;
                            v += vStepVertical;
                            w += wStepVertical;
                            u |= 0;
                            v |= 0;
                            w |= 0;
                        }
                    } else {
                        yB -= yC;
                        yC -= yA;
                        yA = this.lineOffset[yA];
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            yC--;
                            if (yC < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    yB--;
                                    if (yB < 0) {
                                        return;
                                    }
                                    this.drawTexturedScanline(xC >> 16, xA >> 16, Pix2D.pixels, yA, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeC >> 8, shadeA >> 8);
                                    xC += xStepBC;
                                    xA += xStepAB;
                                    shadeC += shadeStepBC;
                                    shadeA += shadeStepAB;
                                    yA += Pix2D.width2d;
                                    u += uStepVertical;
                                    v += vStepVertical;
                                    w += wStepVertical;
                                    u |= 0;
                                    v |= 0;
                                    w |= 0;
                                }
                            }
                            this.drawTexturedScanline(xB >> 16, xA >> 16, Pix2D.pixels, yA, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeB >> 8, shadeA >> 8);
                            xB += xStepAC;
                            xA += xStepAB;
                            shadeB += shadeStepAC;
                            shadeA += shadeStepAB;
                            yA += Pix2D.width2d;
                            u += uStepVertical;
                            v += vStepVertical;
                            w += wStepVertical;
                            u |= 0;
                            v |= 0;
                            w |= 0;
                        }
                    }
                }
            }
        } else if (yB <= yC) {
            if (yB < Pix2D.bottom) {
                if (yC > Pix2D.bottom) {
                    yC = Pix2D.bottom;
                }
                if (yA > Pix2D.bottom) {
                    yA = Pix2D.bottom;
                }
                if (yC < yA) {
                    xA = xB <<= 0x10;
                    shadeA = shadeB <<= 0x10;
                    if (yB < 0) {
                        xA -= xStepAB * yB;
                        xB -= xStepBC * yB;
                        shadeA -= shadeStepAB * yB;
                        shadeB -= shadeStepBC * yB;
                        yB = 0;
                    }
                    xC <<= 0x10;
                    shadeC <<= 0x10;
                    if (yC < 0) {
                        xC -= xStepAC * yC;
                        shadeC -= shadeStepAC * yC;
                        yC = 0;
                    }
                    const dy: number = yB - this.centerY;
                    u += uStepVertical * dy;
                    v += vStepVertical * dy;
                    w += wStepVertical * dy;
                    u |= 0;
                    v |= 0;
                    w |= 0;
                    if ((yB !== yC && xStepAB < xStepBC) || (yB === yC && xStepAB > xStepAC)) {
                        yA -= yC;
                        yC -= yB;
                        yB = this.lineOffset[yB];
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            yC--;
                            if (yC < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    yA--;
                                    if (yA < 0) {
                                        return;
                                    }
                                    this.drawTexturedScanline(xA >> 16, xC >> 16, Pix2D.pixels, yB, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeA >> 8, shadeC >> 8);
                                    xA += xStepAB;
                                    xC += xStepAC;
                                    shadeA += shadeStepAB;
                                    shadeC += shadeStepAC;
                                    yB += Pix2D.width2d;
                                    u += uStepVertical;
                                    v += vStepVertical;
                                    w += wStepVertical;
                                    u |= 0;
                                    v |= 0;
                                    w |= 0;
                                }
                            }
                            this.drawTexturedScanline(xA >> 16, xB >> 16, Pix2D.pixels, yB, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeA >> 8, shadeB >> 8);
                            xA += xStepAB;
                            xB += xStepBC;
                            shadeA += shadeStepAB;
                            shadeB += shadeStepBC;
                            yB += Pix2D.width2d;
                            u += uStepVertical;
                            v += vStepVertical;
                            w += wStepVertical;
                            u |= 0;
                            v |= 0;
                            w |= 0;
                        }
                    } else {
                        yA -= yC;
                        yC -= yB;
                        yB = this.lineOffset[yB];
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            yC--;
                            if (yC < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    yA--;
                                    if (yA < 0) {
                                        return;
                                    }
                                    this.drawTexturedScanline(xC >> 16, xA >> 16, Pix2D.pixels, yB, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeC >> 8, shadeA >> 8);
                                    xA += xStepAB;
                                    xC += xStepAC;
                                    shadeA += shadeStepAB;
                                    shadeC += shadeStepAC;
                                    yB += Pix2D.width2d;
                                    u += uStepVertical;
                                    v += vStepVertical;
                                    w += wStepVertical;
                                    u |= 0;
                                    v |= 0;
                                    w |= 0;
                                }
                            }
                            this.drawTexturedScanline(xB >> 16, xA >> 16, Pix2D.pixels, yB, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeB >> 8, shadeA >> 8);
                            xA += xStepAB;
                            xB += xStepBC;
                            shadeA += shadeStepAB;
                            shadeB += shadeStepBC;
                            yB += Pix2D.width2d;
                            u += uStepVertical;
                            v += vStepVertical;
                            w += wStepVertical;
                            u |= 0;
                            v |= 0;
                            w |= 0;
                        }
                    }
                } else {
                    xC = xB <<= 0x10;
                    shadeC = shadeB <<= 0x10;
                    if (yB < 0) {
                        xC -= xStepAB * yB;
                        xB -= xStepBC * yB;
                        shadeC -= shadeStepAB * yB;
                        shadeB -= shadeStepBC * yB;
                        yB = 0;
                    }
                    xA <<= 0x10;
                    shadeA <<= 0x10;
                    if (yA < 0) {
                        xA -= xStepAC * yA;
                        shadeA -= shadeStepAC * yA;
                        yA = 0;
                    }
                    const dy: number = yB - this.centerY;
                    u += uStepVertical * dy;
                    v += vStepVertical * dy;
                    w += wStepVertical * dy;
                    u |= 0;
                    v |= 0;
                    w |= 0;
                    yC -= yA;
                    yA -= yB;
                    yB = this.lineOffset[yB];
                    if (xStepAB < xStepBC) {
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            yA--;
                            if (yA < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    yC--;
                                    if (yC < 0) {
                                        return;
                                    }
                                    this.drawTexturedScanline(xA >> 16, xB >> 16, Pix2D.pixels, yB, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeA >> 8, shadeB >> 8);
                                    xA += xStepAC;
                                    xB += xStepBC;
                                    shadeA += shadeStepAC;
                                    shadeB += shadeStepBC;
                                    yB += Pix2D.width2d;
                                    u += uStepVertical;
                                    v += vStepVertical;
                                    w += wStepVertical;
                                    u |= 0;
                                    v |= 0;
                                    w |= 0;
                                }
                            }
                            this.drawTexturedScanline(xC >> 16, xB >> 16, Pix2D.pixels, yB, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeC >> 8, shadeB >> 8);
                            xC += xStepAB;
                            xB += xStepBC;
                            shadeC += shadeStepAB;
                            shadeB += shadeStepBC;
                            yB += Pix2D.width2d;
                            u += uStepVertical;
                            v += vStepVertical;
                            w += wStepVertical;
                            u |= 0;
                            v |= 0;
                            w |= 0;
                        }
                    } else {
                        // eslint-disable-next-line no-constant-condition
                        while (true) {
                            yA--;
                            if (yA < 0) {
                                // eslint-disable-next-line no-constant-condition
                                while (true) {
                                    yC--;
                                    if (yC < 0) {
                                        return;
                                    }
                                    this.drawTexturedScanline(xB >> 16, xA >> 16, Pix2D.pixels, yB, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeB >> 8, shadeA >> 8);
                                    xA += xStepAC;
                                    xB += xStepBC;
                                    shadeA += shadeStepAC;
                                    shadeB += shadeStepBC;
                                    yB += Pix2D.width2d;
                                    u += uStepVertical;
                                    v += vStepVertical;
                                    w += wStepVertical;
                                    u |= 0;
                                    v |= 0;
                                    w |= 0;
                                }
                            }
                            this.drawTexturedScanline(xB >> 16, xC >> 16, Pix2D.pixels, yB, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeB >> 8, shadeC >> 8);
                            xC += xStepAB;
                            xB += xStepBC;
                            shadeC += shadeStepAB;
                            shadeB += shadeStepBC;
                            yB += Pix2D.width2d;
                            u += uStepVertical;
                            v += vStepVertical;
                            w += wStepVertical;
                            u |= 0;
                            v |= 0;
                            w |= 0;
                        }
                    }
                }
            }
        } else if (yC < Pix2D.bottom) {
            if (yA > Pix2D.bottom) {
                yA = Pix2D.bottom;
            }
            if (yB > Pix2D.bottom) {
                yB = Pix2D.bottom;
            }
            if (yA < yB) {
                xB = xC <<= 0x10;
                shadeB = shadeC <<= 0x10;
                if (yC < 0) {
                    xB -= xStepBC * yC;
                    xC -= xStepAC * yC;
                    shadeB -= shadeStepBC * yC;
                    shadeC -= shadeStepAC * yC;
                    yC = 0;
                }
                xA <<= 0x10;
                shadeA <<= 0x10;
                if (yA < 0) {
                    xA -= xStepAB * yA;
                    shadeA -= shadeStepAB * yA;
                    yA = 0;
                }
                const dy: number = yC - this.centerY;
                u += uStepVertical * dy;
                v += vStepVertical * dy;
                w += wStepVertical * dy;
                u |= 0;
                v |= 0;
                w |= 0;
                yB -= yA;
                yA -= yC;
                yC = this.lineOffset[yC];
                if (xStepBC < xStepAC) {
                    // eslint-disable-next-line no-constant-condition
                    while (true) {
                        yA--;
                        if (yA < 0) {
                            // eslint-disable-next-line no-constant-condition
                            while (true) {
                                yB--;
                                if (yB < 0) {
                                    return;
                                }
                                this.drawTexturedScanline(xB >> 16, xA >> 16, Pix2D.pixels, yC, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeB >> 8, shadeA >> 8);
                                xB += xStepBC;
                                xA += xStepAB;
                                shadeB += shadeStepBC;
                                shadeA += shadeStepAB;
                                yC += Pix2D.width2d;
                                u += uStepVertical;
                                v += vStepVertical;
                                w += wStepVertical;
                                u |= 0;
                                v |= 0;
                                w |= 0;
                            }
                        }
                        this.drawTexturedScanline(xB >> 16, xC >> 16, Pix2D.pixels, yC, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeB >> 8, shadeC >> 8);
                        xB += xStepBC;
                        xC += xStepAC;
                        shadeB += shadeStepBC;
                        shadeC += shadeStepAC;
                        yC += Pix2D.width2d;
                        u += uStepVertical;
                        v += vStepVertical;
                        w += wStepVertical;
                        u |= 0;
                        v |= 0;
                        w |= 0;
                    }
                } else {
                    // eslint-disable-next-line no-constant-condition
                    while (true) {
                        yA--;
                        if (yA < 0) {
                            // eslint-disable-next-line no-constant-condition
                            while (true) {
                                yB--;
                                if (yB < 0) {
                                    return;
                                }
                                this.drawTexturedScanline(xA >> 16, xB >> 16, Pix2D.pixels, yC, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeA >> 8, shadeB >> 8);
                                xB += xStepBC;
                                xA += xStepAB;
                                shadeB += shadeStepBC;
                                shadeA += shadeStepAB;
                                yC += Pix2D.width2d;
                                u += uStepVertical;
                                v += vStepVertical;
                                w += wStepVertical;
                                u |= 0;
                                v |= 0;
                                w |= 0;
                            }
                        }
                        this.drawTexturedScanline(xC >> 16, xB >> 16, Pix2D.pixels, yC, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeC >> 8, shadeB >> 8);
                        xB += xStepBC;
                        xC += xStepAC;
                        shadeB += shadeStepBC;
                        shadeC += shadeStepAC;
                        yC += Pix2D.width2d;
                        u += uStepVertical;
                        v += vStepVertical;
                        w += wStepVertical;
                        u |= 0;
                        v |= 0;
                        w |= 0;
                    }
                }
            } else {
                xA = xC <<= 0x10;
                shadeA = shadeC <<= 0x10;
                if (yC < 0) {
                    xA -= xStepBC * yC;
                    xC -= xStepAC * yC;
                    shadeA -= shadeStepBC * yC;
                    shadeC -= shadeStepAC * yC;
                    yC = 0;
                }
                xB <<= 0x10;
                shadeB <<= 0x10;
                if (yB < 0) {
                    xB -= xStepAB * yB;
                    shadeB -= shadeStepAB * yB;
                    yB = 0;
                }
                const dy: number = yC - this.centerY;
                u += uStepVertical * dy;
                v += vStepVertical * dy;
                w += wStepVertical * dy;
                u |= 0;
                v |= 0;
                w |= 0;
                yA -= yB;
                yB -= yC;
                yC = this.lineOffset[yC];
                if (xStepBC < xStepAC) {
                    // eslint-disable-next-line no-constant-condition
                    while (true) {
                        yB--;
                        if (yB < 0) {
                            // eslint-disable-next-line no-constant-condition
                            while (true) {
                                yA--;
                                if (yA < 0) {
                                    return;
                                }
                                this.drawTexturedScanline(xB >> 16, xC >> 16, Pix2D.pixels, yC, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeB >> 8, shadeC >> 8);
                                xB += xStepAB;
                                xC += xStepAC;
                                shadeB += shadeStepAB;
                                shadeC += shadeStepAC;
                                yC += Pix2D.width2d;
                                u += uStepVertical;
                                v += vStepVertical;
                                w += wStepVertical;
                                u |= 0;
                                v |= 0;
                                w |= 0;
                            }
                        }
                        this.drawTexturedScanline(xA >> 16, xC >> 16, Pix2D.pixels, yC, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeA >> 8, shadeC >> 8);
                        xA += xStepBC;
                        xC += xStepAC;
                        shadeA += shadeStepBC;
                        shadeC += shadeStepAC;
                        yC += Pix2D.width2d;
                        u += uStepVertical;
                        v += vStepVertical;
                        w += wStepVertical;
                        u |= 0;
                        v |= 0;
                        w |= 0;
                    }
                } else {
                    // eslint-disable-next-line no-constant-condition
                    while (true) {
                        yB--;
                        if (yB < 0) {
                            // eslint-disable-next-line no-constant-condition
                            while (true) {
                                yA--;
                                if (yA < 0) {
                                    return;
                                }
                                this.drawTexturedScanline(xC >> 16, xB >> 16, Pix2D.pixels, yC, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeC >> 8, shadeB >> 8);
                                xB += xStepAB;
                                xC += xStepAC;
                                shadeB += shadeStepAB;
                                shadeC += shadeStepAC;
                                yC += Pix2D.width2d;
                                u += uStepVertical;
                                v += vStepVertical;
                                w += wStepVertical;
                                u |= 0;
                                v |= 0;
                                w |= 0;
                            }
                        }
                        this.drawTexturedScanline(xC >> 16, xA >> 16, Pix2D.pixels, yC, texels, 0, 0, u, v, w, uStride, vStride, wStride, shadeC >> 8, shadeA >> 8);
                        xA += xStepBC;
                        xC += xStepAC;
                        shadeA += shadeStepBC;
                        shadeC += shadeStepAC;
                        yC += Pix2D.width2d;
                        u += uStepVertical;
                        v += vStepVertical;
                        w += wStepVertical;
                        u |= 0;
                        v |= 0;
                        w |= 0;
                    }
                }
            }
        }
    }

    private static drawTexturedScanline(
        xA: number,
        xB: number,
        dst: Int32Array,
        offset: number,
        texels: Int32Array | null,
        curU: number,
        curV: number,
        u: number,
        v: number,
        w: number,
        uStride: number,
        vStride: number,
        wStride: number,
        shadeA: number,
        shadeB: number
    ): void {
        if (xA >= xB) {
            return;
        }

        let shadeStrides: number;
        let strides: number;
        if (this.clipX) {
            shadeStrides = ((shadeB - shadeA) / (xB - xA)) | 0;

            if (xB > Pix2D.boundX) {
                xB = Pix2D.boundX;
            }

            if (xA < 0) {
                shadeA -= xA * shadeStrides;
                xA = 0;
            }

            if (xA >= xB) {
                return;
            }

            strides = (xB - xA) >> 3;
            shadeStrides <<= 0xc;
        } else {
            if (xB - xA > 7) {
                strides = (xB - xA) >> 3;
                shadeStrides = ((shadeB - shadeA) * this.reciprocal15[strides]) >> 6;
            } else {
                strides = 0;
                shadeStrides = 0;
            }
        }

        shadeA <<= 0x9;
        offset += xA;

        let nextU: number;
        let nextV: number;
        let curW: number;
        let dx: number;
        let stepU: number;
        let stepV: number;
        let shadeShift: number;
        if (this.lowMemory && texels) {
            nextU = 0;
            nextV = 0;
            dx = xA - this.centerX;
            u = u + (uStride >> 3) * dx;
            v = v + (vStride >> 3) * dx;
            w = w + (wStride >> 3) * dx;
            u |= 0;
            v |= 0;
            w |= 0;
            curW = w >> 12;
            if (curW !== 0) {
                curU = (u / curW) | 0;
                curV = (v / curW) | 0;
                if (curU < 0) {
                    curU = 0;
                } else if (curU > 4032) {
                    curU = 4032;
                }
            }
            u = u + uStride;
            v = v + vStride;
            w = w + wStride;
            u |= 0;
            v |= 0;
            w |= 0;
            curW = w >> 12;
            if (curW !== 0) {
                nextU = (u / curW) | 0;
                nextV = (v / curW) | 0;
                if (nextU < 7) {
                    nextU = 7;
                } else if (nextU > 4032) {
                    nextU = 4032;
                }
            }
            stepU = (nextU - curU) >> 3;
            stepV = (nextV - curV) >> 3;
            curU += (shadeA >> 3) & 0xc0000;
            shadeShift = shadeA >> 23;
            if (this.opaque) {
                while (strides-- > 0) {
                    dst[offset++] = texels[(curV & 0xfc0) + (curU >> 6)] >>> shadeShift;
                    curU += stepU;
                    curV += stepV;
                    dst[offset++] = texels[(curV & 0xfc0) + (curU >> 6)] >>> shadeShift;
                    curU += stepU;
                    curV += stepV;
                    dst[offset++] = texels[(curV & 0xfc0) + (curU >> 6)] >>> shadeShift;
                    curU += stepU;
                    curV += stepV;
                    dst[offset++] = texels[(curV & 0xfc0) + (curU >> 6)] >>> shadeShift;
                    curU += stepU;
                    curV += stepV;
                    dst[offset++] = texels[(curV & 0xfc0) + (curU >> 6)] >>> shadeShift;
                    curU += stepU;
                    curV += stepV;
                    dst[offset++] = texels[(curV & 0xfc0) + (curU >> 6)] >>> shadeShift;
                    curU += stepU;
                    curV += stepV;
                    dst[offset++] = texels[(curV & 0xfc0) + (curU >> 6)] >>> shadeShift;
                    curU += stepU;
                    curV += stepV;
                    dst[offset++] = texels[(curV & 0xfc0) + (curU >> 6)] >>> shadeShift;
                    curU = nextU;
                    curV = nextV;
                    u += uStride;
                    v += vStride;
                    w += wStride;
                    curW = w >> 12;
                    if (curW !== 0) {
                        nextU = (u / curW) | 0;
                        nextV = (v / curW) | 0;
                        if (nextU < 7) {
                            nextU = 7;
                        } else if (nextU > 4032) {
                            nextU = 4032;
                        }
                    }
                    stepU = (nextU - curU) >> 3;
                    stepV = (nextV - curV) >> 3;
                    shadeA += shadeStrides;
                    curU += (shadeA >> 3) & 0xc0000;
                    shadeShift = shadeA >> 23;
                }
                strides = (xB - xA) & 0x7;
                while (strides-- > 0) {
                    dst[offset++] = texels[(curV & 0xfc0) + (curU >> 6)] >>> shadeShift;
                    curU += stepU;
                    curV += stepV;
                }
            } else {
                while (strides-- > 0) {
                    let rgb: number;
                    if ((rgb = texels[(curV & 0xfc0) + (curU >> 6)] >>> shadeShift) !== 0) {
                        dst[offset] = rgb;
                    }
                    offset = offset + 1;
                    curU += stepU;
                    curV += stepV;
                    if ((rgb = texels[(curV & 0xfc0) + (curU >> 6)] >>> shadeShift) !== 0) {
                        dst[offset] = rgb;
                    }
                    offset++;
                    curU += stepU;
                    curV += stepV;
                    if ((rgb = texels[(curV & 0xfc0) + (curU >> 6)] >>> shadeShift) !== 0) {
                        dst[offset] = rgb;
                    }
                    offset++;
                    curU += stepU;
                    curV += stepV;
                    if ((rgb = texels[(curV & 0xfc0) + (curU >> 6)] >>> shadeShift) !== 0) {
                        dst[offset] = rgb;
                    }
                    offset++;
                    curU += stepU;
                    curV += stepV;
                    if ((rgb = texels[(curV & 0xfc0) + (curU >> 6)] >>> shadeShift) !== 0) {
                        dst[offset] = rgb;
                    }
                    offset++;
                    curU += stepU;
                    curV += stepV;
                    if ((rgb = texels[(curV & 0xfc0) + (curU >> 6)] >>> shadeShift) !== 0) {
                        dst[offset] = rgb;
                    }
                    offset++;
                    curU += stepU;
                    curV += stepV;
                    if ((rgb = texels[(curV & 0xfc0) + (curU >> 6)] >>> shadeShift) !== 0) {
                        dst[offset] = rgb;
                    }
                    offset++;
                    curU += stepU;
                    curV += stepV;
                    if ((rgb = texels[(curV & 0xfc0) + (curU >> 6)] >>> shadeShift) !== 0) {
                        dst[offset] = rgb;
                    }
                    offset = offset + 1;
                    curU = nextU;
                    curV = nextV;
                    u += uStride;
                    v += vStride;
                    w += wStride;
                    u |= 0;
                    v |= 0;
                    w |= 0;
                    curW = w >> 12;
                    if (curW !== 0) {
                        nextU = (u / curW) | 0;
                        nextV = (v / curW) | 0;
                        if (nextU < 7) {
                            nextU = 7;
                        } else if (nextU > 4032) {
                            nextU = 4032;
                        }
                    }
                    stepU = (nextU - curU) >> 3;
                    stepV = (nextV - curV) >> 3;
                    shadeA += shadeStrides;
                    curU += (shadeA >> 3) & 0xc0000;
                    shadeShift = shadeA >> 23;
                }
                strides = (xB - xA) & 0x7;
                while (strides-- > 0) {
                    let rgb: number;
                    if ((rgb = texels[(curV & 0xfc0) + (curU >> 6)] >>> shadeShift) !== 0) {
                        dst[offset] = rgb;
                    }
                    offset++;
                    curU += stepU;
                    curV += stepV;
                }
            }
            return;
        }
        nextU = 0;
        nextV = 0;
        dx = xA - this.centerX;
        u = u + (uStride >> 3) * dx;
        v = v + (vStride >> 3) * dx;
        w = w + (wStride >> 3) * dx;
        u |= 0;
        v |= 0;
        w |= 0;
        curW = w >> 14;
        if (curW !== 0) {
            curU = (u / curW) | 0;
            curV = (v / curW) | 0;
            if (curU < 0) {
                curU = 0;
            } else if (curU > 16256) {
                curU = 16256;
            }
        }
        u = u + uStride;
        v = v + vStride;
        w = w + wStride;
        u |= 0;
        v |= 0;
        w |= 0;
        curW = w >> 14;
        if (curW !== 0) {
            nextU = (u / curW) | 0;
            nextV = (v / curW) | 0;
            if (nextU < 7) {
                nextU = 7;
            } else if (nextU > 16256) {
                nextU = 16256;
            }
        }
        stepU = (nextU - curU) >> 3;
        stepV = (nextV - curV) >> 3;
        curU += shadeA & 0x600000;
        shadeShift = shadeA >> 23;
        if (this.opaque && texels) {
            while (strides-- > 0) {
                dst[offset++] = texels[(curV & 0x3f80) + (curU >> 7)] >>> shadeShift;
                curU += stepU;
                curV += stepV;
                dst[offset++] = texels[(curV & 0x3f80) + (curU >> 7)] >>> shadeShift;
                curU += stepU;
                curV += stepV;
                dst[offset++] = texels[(curV & 0x3f80) + (curU >> 7)] >>> shadeShift;
                curU += stepU;
                curV += stepV;
                dst[offset++] = texels[(curV & 0x3f80) + (curU >> 7)] >>> shadeShift;
                curU += stepU;
                curV += stepV;
                dst[offset++] = texels[(curV & 0x3f80) + (curU >> 7)] >>> shadeShift;
                curU += stepU;
                curV += stepV;
                dst[offset++] = texels[(curV & 0x3f80) + (curU >> 7)] >>> shadeShift;
                curU += stepU;
                curV += stepV;
                dst[offset++] = texels[(curV & 0x3f80) + (curU >> 7)] >>> shadeShift;
                curU += stepU;
                curV += stepV;
                dst[offset++] = texels[(curV & 0x3f80) + (curU >> 7)] >>> shadeShift;
                curU = nextU;
                curV = nextV;
                u += uStride;
                v += vStride;
                w += wStride;
                u |= 0;
                v |= 0;
                w |= 0;
                curW = w >> 14;
                if (curW !== 0) {
                    nextU = (u / curW) | 0;
                    nextV = (v / curW) | 0;
                    if (nextU < 7) {
                        nextU = 7;
                    } else if (nextU > 16256) {
                        nextU = 16256;
                    }
                }
                stepU = (nextU - curU) >> 3;
                stepV = (nextV - curV) >> 3;
                shadeA += shadeStrides;
                curU += shadeA & 0x600000;
                shadeShift = shadeA >> 23;
            }
            strides = (xB - xA) & 0x7;
            while (strides-- > 0) {
                dst[offset++] = texels[(curV & 0x3f80) + (curU >> 7)] >>> shadeShift;
                curU += stepU;
                curV += stepV;
            }
            return;
        }

        while (strides-- > 0 && texels) {
            let rgb: number;
            if ((rgb = texels[(curV & 0x3f80) + (curU >> 7)] >>> shadeShift) !== 0) {
                dst[offset] = rgb;
            }
            offset = offset + 1;
            curU += stepU;
            curV += stepV;
            if ((rgb = texels[(curV & 0x3f80) + (curU >> 7)] >>> shadeShift) !== 0) {
                dst[offset] = rgb;
            }
            offset++;
            curU += stepU;
            curV += stepV;
            if ((rgb = texels[(curV & 0x3f80) + (curU >> 7)] >>> shadeShift) !== 0) {
                dst[offset] = rgb;
            }
            offset++;
            curU += stepU;
            curV += stepV;
            if ((rgb = texels[(curV & 0x3f80) + (curU >> 7)] >>> shadeShift) !== 0) {
                dst[offset] = rgb;
            }
            offset++;
            curU += stepU;
            curV += stepV;
            if ((rgb = texels[(curV & 0x3f80) + (curU >> 7)] >>> shadeShift) !== 0) {
                dst[offset] = rgb;
            }
            offset++;
            curU += stepU;
            curV += stepV;
            if ((rgb = texels[(curV & 0x3f80) + (curU >> 7)] >>> shadeShift) !== 0) {
                dst[offset] = rgb;
            }
            offset++;
            curU += stepU;
            curV += stepV;
            if ((rgb = texels[(curV & 0x3f80) + (curU >> 7)] >>> shadeShift) !== 0) {
                dst[offset] = rgb;
            }
            offset++;
            curU += stepU;
            curV += stepV;
            if ((rgb = texels[(curV & 0x3f80) + (curU >> 7)] >>> shadeShift) !== 0) {
                dst[offset] = rgb;
            }
            offset++;
            curU = nextU;
            curV = nextV;
            u += uStride;
            v += vStride;
            w += wStride;
            u |= 0;
            v |= 0;
            w |= 0;
            curW = w >> 14;
            if (curW !== 0) {
                nextU = (u / curW) | 0;
                nextV = (v / curW) | 0;
                if (nextU < 7) {
                    nextU = 7;
                } else if (nextU > 16256) {
                    nextU = 16256;
                }
            }
            stepU = (nextU - curU) >> 3;
            stepV = (nextV - curV) >> 3;
            shadeA += shadeStrides;
            curU += shadeA & 0x600000;
            shadeShift = shadeA >> 23;
        }
        strides = (xB - xA) & 0x7;
        while (strides-- > 0 && texels) {
            let rgb: number;
            if ((rgb = texels[(curV & 0x3f80) + (curU >> 7)] >>> shadeShift) !== 0) {
                dst[offset] = rgb;
            }
            offset++;
            curU += stepU;
            curV += stepV;
        }
    }

    private static drawScanline(x0: number, x1: number, dst: Int32Array, offset: number, rgb: number): void {
        if (this.clipX) {
            if (x1 > Pix2D.boundX) {
                x1 = Pix2D.boundX;
            }
            if (x0 < 0) {
                x0 = 0;
            }
        }

        if (x0 >= x1) {
            return;
        }

        offset += x0;
        let length: number = (x1 - x0) >> 2;

        if (this.alpha === 0) {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                length--;
                if (length < 0) {
                    length = (x1 - x0) & 0x3;
                    // eslint-disable-next-line no-constant-condition
                    while (true) {
                        length--;
                        if (length < 0) {
                            return;
                        }
                        dst[offset++] = rgb;
                    }
                }
                dst[offset++] = rgb;
                dst[offset++] = rgb;
                dst[offset++] = rgb;
                dst[offset++] = rgb;
            }
        }

        const alpha: number = this.alpha;
        const invAlpha: number = 256 - this.alpha;
        rgb = ((((rgb & 0xff00ff) * invAlpha) >> 8) & 0xff00ff) + ((((rgb & 0xff00) * invAlpha) >> 8) & 0xff00);

        // eslint-disable-next-line no-constant-condition
        while (true) {
            length--;
            if (length < 0) {
                length = (x1 - x0) & 0x3;
                // eslint-disable-next-line no-constant-condition
                while (true) {
                    length--;
                    if (length < 0) {
                        return;
                    }
                    dst[offset++] = rgb + ((((dst[offset] & 0xff00ff) * alpha) >> 8) & 0xff00ff) + ((((dst[offset] & 0xff00) * alpha) >> 8) & 0xff00);
                }
            }

            dst[offset++] = rgb + ((((dst[offset] & 0xff00ff) * alpha) >> 8) & 0xff00ff) + ((((dst[offset] & 0xff00) * alpha) >> 8) & 0xff00);
            dst[offset++] = rgb + ((((dst[offset] & 0xff00ff) * alpha) >> 8) & 0xff00ff) + ((((dst[offset] & 0xff00) * alpha) >> 8) & 0xff00);
            dst[offset++] = rgb + ((((dst[offset] & 0xff00ff) * alpha) >> 8) & 0xff00ff) + ((((dst[offset] & 0xff00) * alpha) >> 8) & 0xff00);
            dst[offset++] = rgb + ((((dst[offset] & 0xff00ff) * alpha) >> 8) & 0xff00ff) + ((((dst[offset] & 0xff00) * alpha) >> 8) & 0xff00);
        }
    }

    static pushTexture(id: number): void {
        if (this.activeTexels[id] && this.texelPool) {
            this.texelPool[this.poolSize++] = this.activeTexels[id];
            this.activeTexels[id] = null;
        }
    }

    private static getTexels(id: number): Int32Array | null {
        this.textureCycle[id] = this.cycle++;
        if (this.activeTexels[id]) {
            return this.activeTexels[id];
        }

        let texels: Int32Array | null;
        if (this.poolSize > 0 && this.texelPool) {
            texels = this.texelPool[--this.poolSize];
            this.texelPool[this.poolSize] = null;
        } else {
            let cycle: number = 0;
            let selected: number = -1;
            for (let t: number = 0; t < this.textureCount; t++) {
                if (this.activeTexels[t] && (this.textureCycle[t] < cycle || selected === -1)) {
                    cycle = this.textureCycle[t];
                    selected = t;
                }
            }
            texels = this.activeTexels[selected];
            this.activeTexels[selected] = null;
        }

        this.activeTexels[id] = texels;
        const texture: Pix8 | null = this.textures[id];
        const palette: Int32Array | null = this.texPal[id];

        if (!texels || !texture || !palette) {
            return null;
        }

        if (this.lowMemory) {
            this.textureTranslucent[id] = false;
            for (let i: number = 0; i < 4096; i++) {
                const rgb: number = (texels[i] = palette[texture.pixels[i]] & 0xf8f8ff);
                if (rgb === 0) {
                    this.textureTranslucent[id] = true;
                }
                texels[i + 4096] = (rgb - (rgb >>> 3)) & 0xf8f8ff;
                texels[i + 8192] = (rgb - (rgb >>> 2)) & 0xf8f8ff;
                texels[i + 12288] = (rgb - (rgb >>> 2) - (rgb >>> 3)) & 0xf8f8ff;
            }
        } else {
            if (texture.width2d === 64) {
                for (let y: number = 0; y < 128; y++) {
                    for (let x: number = 0; x < 128; x++) {
                        texels[x + ((y << 7) | 0)] = palette[texture.pixels[(x >> 1) + (((y >> 1) << 6) | 0)]];
                    }
                }
            } else {
                for (let i: number = 0; i < 16384; i++) {
                    texels[i] = palette[texture.pixels[i]];
                }
            }

            this.textureTranslucent[id] = false;
            for (let i: number = 0; i < 16384; i++) {
                texels[i] &= 0xf8f8ff;
                const rgb: number = texels[i];
                if (rgb === 0) {
                    this.textureTranslucent[id] = true;
                }
                texels[i + 16384] = (rgb - (rgb >>> 3)) & 0xf8f8ff;
                texels[i + 32768] = (rgb - (rgb >>> 2)) & 0xf8f8ff;
                texels[i + 49152] = (rgb - (rgb >>> 2) - (rgb >>> 3)) & 0xf8f8ff;
            }
        }

        return texels;
    }
}
