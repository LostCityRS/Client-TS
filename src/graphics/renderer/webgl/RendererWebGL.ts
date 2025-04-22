import type TileOverlay from '#/dash3d/type/TileOverlay.ts';
import type TileUnderlay from '#/dash3d/type/TileUnderlay.ts';
import World3D from '#/dash3d/World3D.js';
import { canvas as cpuCanvas } from '#/graphics/Canvas.ts';
import type Model from '#/graphics/Model.ts';
import PixMap from '#/graphics/PixMap.js';
import { Renderer } from '#/graphics/renderer/Renderer.js';

import { Shader } from './Shader';
import { createProgram, ShaderProgram } from './ShaderProgram';

import { SHADER_CODE as pixMapFragShaderCode } from './shaders/fullscreen-pixmap.frag.glsl';
import { SHADER_CODE as pixMapVertShaderCode } from './shaders/fullscreen-pixmap.vert.glsl';
import { SHADER_CODE as textureFragShaderCode } from './shaders/fullscreen-texture.frag.glsl';
import { SHADER_CODE as textureVertShaderCode } from './shaders/fullscreen-texture.vert.glsl';
import { SHADER_CODE as mainFragShaderCode } from './shaders/main.frag.glsl';
import { SHADER_CODE as mainVertShaderCode } from './shaders/main.vert.glsl';

const INITIAL_TRIANGLES: number = 100000;

export class RendererWebGL extends Renderer {
    drawTileUnderlay(world: World3D, underlay: TileUnderlay, level: number, tileX: number, tileZ: number): boolean {
        return false;
    }

    drawTileOverlay(world: World3D, overlay: TileOverlay, tileX: number, tileZ: number): boolean {
        return false;
    }

    startDrawModel(model: Model, yaw: number, relativeX: number, relativeY: number, relativeZ: number, bitset: number): void {
    }

    endDrawModel(model: Model, yaw: number, relativeX: number, relativeY: number, relativeZ: number, bitset: number): void {
    }

    drawModelTriangle(model: Model, index: number): boolean {
        return false;
    }

    pixMapProgram!: ShaderProgram;
    textureProgram!: ShaderProgram;
    mainProgram!: ShaderProgram;

    viewportFramebuffer!: WebGLFramebuffer;
    viewportColorTarget!: WebGLTexture;

    texturesToDelete: WebGLTexture[] = [];

    isRenderingScene: boolean = false;

    gouraudTriangleData: Uint32Array = new Uint32Array(INITIAL_TRIANGLES * 4);
    gouraudTriangleDataView: DataView = new DataView(this.gouraudTriangleData.buffer);
    gouraudTriangleCount: number = 0;

    static init(container: HTMLElement, width: number, height: number): RendererWebGL {
        const canvas: HTMLCanvasElement = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.style.display = cpuCanvas.style.display;
        canvas.style.position = cpuCanvas.style.position;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.imageRendering = cpuCanvas.style.imageRendering;
        container.appendChild(canvas);

        const gl: WebGL2RenderingContext | null = canvas.getContext('webgl2', {
            preserveDrawingBuffer: true
        });
        if (!gl) {
            canvas.remove();
            throw new Error('WebGL2 is not supported.');
        }

        Renderer.resetRenderer();
        return new RendererWebGL(canvas, gl);
    }

    constructor(
        canvas: HTMLCanvasElement,
        readonly gl: WebGL2RenderingContext
    ) {
        super(canvas);
        this.init();
    }

    init(): void {
        this.gl.enable(this.gl.CULL_FACE);

        const pixMapVertShader: Shader = new Shader(this.gl, this.gl.VERTEX_SHADER, pixMapVertShaderCode);
        const pixMapFragShader: Shader = new Shader(this.gl, this.gl.FRAGMENT_SHADER, pixMapFragShaderCode);
        this.pixMapProgram = createProgram(this.gl, [pixMapVertShader, pixMapFragShader]);
        const textureVertShader: Shader = new Shader(this.gl, this.gl.VERTEX_SHADER, textureVertShaderCode);
        const textureFragShader: Shader = new Shader(this.gl, this.gl.FRAGMENT_SHADER, textureFragShaderCode);
        this.textureProgram = createProgram(this.gl, [textureVertShader, textureFragShader]);
        const mainVertShader: Shader = new Shader(this.gl, this.gl.VERTEX_SHADER, mainVertShaderCode);
        const mainFragShader: Shader = new Shader(this.gl, this.gl.FRAGMENT_SHADER, mainFragShaderCode);
        this.mainProgram = createProgram(this.gl, [mainVertShader, mainFragShader]);

        const viewportWidth: number = World3D.viewportRight;
        const viewportHeight: number = World3D.viewportBottom;

        this.viewportFramebuffer = this.gl.createFramebuffer()!;
        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.viewportFramebuffer);

        this.viewportColorTarget = this.gl.createTexture()!;
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.viewportColorTarget);
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, viewportWidth, viewportHeight, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

        this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.viewportColorTarget, 0);

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    override startFrame(): void {
        // this.gl.clearColor(0.2, 0, 0, 1);
        // this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }

    override endFrame(): void {
        for (const texture of this.texturesToDelete) {
            this.gl.deleteTexture(texture);
        }
        this.texturesToDelete.length = 0;
    }

    override updateTexture(id: number): void { }

    override setBrightness(brightness: number): void { }

    override renderPixMap(pixMap: PixMap, x: number, y: number): boolean {
        this.gl.viewport(x, this.canvas.height - y - pixMap.height2d, pixMap.width2d, pixMap.height2d);

        const viewportWidth: number = World3D.viewportRight;
        const viewportHeight: number = World3D.viewportBottom;

        if (pixMap.width2d === viewportWidth && pixMap.height2d === viewportHeight) {
            this.gl.bindTexture(this.gl.TEXTURE_2D, this.viewportColorTarget);
            this.textureProgram.use();
            this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
        }

        const pixels: Uint8Array = new Uint8Array(pixMap.pixels.buffer);

        const texture: WebGLTexture = this.gl.createTexture()!;
        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
        this.gl.texStorage2D(this.gl.TEXTURE_2D, 1, this.gl.RGBA8, pixMap.width2d, pixMap.height2d);
        this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, pixMap.width2d, pixMap.height2d, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);
        // this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, pixMap.width, pixMap.height, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, new Uint8Array(pixMap.pixels.buffer));

        this.pixMapProgram.use();
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);

        this.texturesToDelete.push(texture);

        return true;
    }

    override startRenderScene(): void {
        this.isRenderingScene = true;
        this.gouraudTriangleCount = 0;
    }

    override endRenderScene(): void {
        this.isRenderingScene = false;

        const viewportWidth: number = World3D.viewportRight;
        const viewportHeight: number = World3D.viewportBottom;

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.viewportFramebuffer);
        this.gl.viewport(0, 0, viewportWidth, viewportHeight);

        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        // console.log('Rendering scene', this.gouraudTriangleCount);

        if (this.gouraudTriangleCount > 0) {
            const texture: WebGLTexture = this.gl.createTexture()!;
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            this.gl.texStorage2D(this.gl.TEXTURE_2D, 1, this.gl.RGBA32UI, this.gouraudTriangleCount, 1);
            this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, this.gouraudTriangleCount, 1, this.gl.RGBA_INTEGER, this.gl.UNSIGNED_INT, this.gouraudTriangleData);

            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            this.mainProgram.use();
            this.gl.drawArrays(this.gl.TRIANGLES, 0, this.gouraudTriangleCount * 3);

            this.texturesToDelete.push(texture);
        }

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    override fillTriangle(x0: number, x1: number, x2: number, y0: number, y1: number, y2: number, color: number): boolean {
        if (!this.isRenderingScene) {
            return false;
        }
        return true;
    }

    override fillGouraudTriangle(xA: number, xB: number, xC: number, yA: number, yB: number, yC: number, colorA: number, colorB: number, colorC: number): boolean {
        if (!this.isRenderingScene) {
            return false;
        }

        let offset: number = this.gouraudTriangleCount * 4;

        if (offset >= this.gouraudTriangleData.length) {
            const newData: Uint32Array = new Uint32Array(this.gouraudTriangleData.length * 2);
            newData.set(this.gouraudTriangleData);
            this.gouraudTriangleData = newData;
            this.gouraudTriangleDataView = new DataView(this.gouraudTriangleData.buffer);
        }

        xA += 2048;
        xB += 2048;
        xC += 2048;
        yA += 2048;
        yB += 2048;
        yC += 2048;

        this.gouraudTriangleDataView.setUint32(offset++ * 4, (xA << 20) | (xB << 8) | (xC >> 4), true);
        this.gouraudTriangleDataView.setUint32(offset++ * 4, (yA << 20) | (yB << 8) | (xC & 0xf), true);
        this.gouraudTriangleDataView.setUint32(offset++ * 4, (yC << 16) | colorA, true);
        this.gouraudTriangleDataView.setUint32(offset++ * 4, (colorB << 16) | colorC, true);

        // this.gouraudTriangleData[offset++] = (xA << 20) | (xB << 8) | (xC >> 4);
        // this.gouraudTriangleData[offset++] = (yA << 20) | (yB << 8) | (xC & 0xf);
        // this.gouraudTriangleData[offset++] = (yC << 16) | colorA;
        // this.gouraudTriangleData[offset++] = (colorB << 16) | colorC;

        this.gouraudTriangleCount++;

        return true;
    }

    override fillTexturedTriangle(
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
    ): boolean {
        if (!this.isRenderingScene) {
            return false;
        }
        return true;
    }

    override destroy(): void { }
}
