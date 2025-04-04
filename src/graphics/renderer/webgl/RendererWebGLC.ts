import { mat4, vec3 } from 'gl-matrix';

import Ground from '#/dash3d/type/Ground.js';
import TileOverlay from '#/dash3d/type/TileOverlay.js';
import TileUnderlay from '#/dash3d/type/TileUnderlay.js';
import World3D from '#/dash3d/World3D';

import { canvas as cpuCanvas } from '#/graphics/Canvas.ts';
import Pix3D from '#/graphics/Pix3D.js';
import Model from '#/graphics/Model.js';
import PixMap from '#/graphics/PixMap.js';
import { Renderer } from '#/graphics/renderer/Renderer.ts';

import { Shader } from './Shader';
import { createProgram, ShaderProgram } from './ShaderProgram';

export type Context = WebGL2RenderingContext;

const clamp = (num: number, min: number, max: number): number => Math.min(Math.max(num, min), max);

function packFloat11(v: number): number {
    return 1024 - Math.round(v / (1 / 64));
}

class VertexDataBuffer {
    static readonly STRIDE: number = 12;

    data: Uint8Array;
    view: DataView;

    pos: number = 0;

    constructor(initialVertexCount: number) {
        this.data = new Uint8Array(initialVertexCount * VertexDataBuffer.STRIDE);
        this.view = new DataView(this.data.buffer, this.data.byteOffset, this.data.byteLength);
    }

    growIfRequired(vertexCount: number): void {
        const byteLengthRequired: number = this.pos + vertexCount * VertexDataBuffer.STRIDE;
        if (this.data.byteLength < byteLengthRequired) {
            const newData: Uint8Array = new Uint8Array(byteLengthRequired * 2);
            newData.set(this.data);
            this.data = newData;
            this.view = new DataView(this.data.buffer, this.data.byteOffset, this.data.byteLength);
        }
    }

    addVertex(x: number, y: number, z: number, hsl: number, alpha: number, textureId: number, texCoordU: number, texCoordV: number): number {
        this.growIfRequired(1);
        const index: number = this.pos / VertexDataBuffer.STRIDE;

        const xPos: number = clamp(x + 0x20000, 0, 0x3ffff); // 18 bit
        const yPos: number = clamp(-y + 0x800, 0, 0xfff); // 12 bit
        const zPos: number = clamp(z + 0x20000, 0, 0x3ffff); // 18 bit

        const isTextured: boolean = textureId !== -1;
        const isTexturedBit: number = isTextured ? 1 : 0;

        let hslPacked: number = hsl & 0xffff; // 16 bit
        if (isTextured) {
            hslPacked &= 0x7f;
            hslPacked |= textureId << 7;
        }

        const uPacked: number = clamp(packFloat11(texCoordU), 0, 0x7ff);
        const vPacked: number = clamp(packFloat11(texCoordV), 0, 0x7ff);

        const v0: number = (isTexturedBit << 30) | (yPos << 18) | xPos;
        const v1: number = ((hslPacked >> 2) << 18) | zPos;
        const v2: number = ((hslPacked & 0x3) << 30) | (alpha << 22) | (uPacked << 11) | vPacked;

        this.view.setUint32(this.pos, v0, true);
        this.view.setUint32(this.pos + 4, v1, true);
        this.view.setUint32(this.pos + 8, v2, true);

        this.pos += VertexDataBuffer.STRIDE;
        return index;
    }

    addData(data: Uint8Array): void {
        this.growIfRequired(data.length / VertexDataBuffer.STRIDE);
        this.data.set(data, this.pos);
        this.pos += data.length;
    }
}

class IndexDataBuffer {
    indices: Int32Array;

    pos: number = 0;

    constructor(initialIndexCount: number) {
        this.indices = new Int32Array(initialIndexCount);
    }

    growIfRequired(indexCount: number): void {
        const lengthRequired: number = this.pos + indexCount;
        if (this.indices.length < lengthRequired) {
            const newIndices: Int32Array = new Int32Array(lengthRequired * 2);
            newIndices.set(this.indices);
            this.indices = newIndices;
        }
    }

    addIndices(...indices: number[]): void {
        this.growIfRequired(indices.length);
        for (const index of indices) {
            this.indices[this.pos++] = index;
        }
    }
}

class DrawCommands {
    positions: Int32Array;
    yaws: Int32Array;
    offsets: Int32Array;
    counts: Int32Array;

    count: number = 0;

    constructor(count: number) {
        this.positions = new Int32Array(count * 3);
        this.yaws = new Int32Array(count);
        this.offsets = new Int32Array(count);
        this.counts = new Int32Array(count);
    }

    reset(): void {
        this.count = 0;
    }

    reduce(): void {
        const originalCount: number = this.count;

        for (let i: number = 0; i < originalCount; i++) {
            const x: number = this.positions[i * 3];
            const y: number = this.positions[i * 3 + 1];
            const z: number = this.positions[i * 3 + 2];
            const yaw: number = this.yaws[i];
            const offset: number = this.offsets[i];
            const count: number = this.counts[i];

            if (count === 0) {
                continue;
            }

            for (let j: number = i + 1; j < originalCount; j++) {
                if (this.positions[j * 3] === x && this.positions[j * 3 + 1] === y && this.positions[j * 3 + 2] === z && this.yaws[j] === yaw && offset + this.counts[i] === this.offsets[j]) {
                    this.counts[i] += this.counts[j];
                    this.counts[j] = 0;
                } else {
                    break;
                }
            }
        }
    }

    addCommand(x: number, y: number, z: number, yaw: number, offset: number, count: number): void {
        if (count === 0) {
            return;
        }
        if (this.count >= this.yaws.length) {
            const newPositions: Int32Array = new Int32Array(this.count * 3 * 2);
            const newYaws: Int32Array = new Int32Array(this.count * 2);
            const newOffsets: Int32Array = new Int32Array(this.count * 2);
            const newCounts: Int32Array = new Int32Array(this.count * 2);
            newPositions.set(this.positions);
            newYaws.set(this.yaws);
            newOffsets.set(this.offsets);
            newCounts.set(this.counts);
            this.positions = newPositions;
            this.yaws = newYaws;
            this.offsets = newOffsets;
            this.counts = newCounts;
        }
        this.positions[this.count * 3] = x;
        this.positions[this.count * 3 + 1] = y;
        this.positions[this.count * 3 + 2] = z;
        this.yaws[this.count] = yaw;
        this.offsets[this.count] = offset;
        this.counts[this.count] = count;
        this.count++;
    }
}

interface PixMapTexture {
    lastFrameUsed: number;
    texture: WebGLTexture;
}

interface CachedVertexData {
    frame: number;
    data: Uint8Array;
}

const frameVertSource: string = `
#version 300 es

out vec2 v_texCoord;

const vec2 vertices[3] = vec2[3](
    vec2(-1,-1), 
    vec2(3,-1), 
    vec2(-1, 3)
);

void main() {
    gl_Position = vec4(vertices[gl_VertexID], 0.0, 1.0);
    v_texCoord = gl_Position.xy * 0.5 + 0.5;
}
`.trim();
const frameFragSource: string = `
#version 300 es

precision highp float;

uniform highp sampler2D u_frame;

in vec2 v_texCoord;

out vec4 fragColor;

void main() {
    fragColor = texture(u_frame, v_texCoord);
}
`.trim();

const pixMapVertSource: string = `
#version 300 es

out vec2 v_texCoord;

const vec2 vertices[3] = vec2[3](
    vec2(-1,-1), 
    vec2(3,-1), 
    vec2(-1, 3)
);

void main() {
    gl_Position = vec4(vertices[gl_VertexID], 0.0, 1.0);
    v_texCoord = gl_Position.xy * 0.5 + 0.5;
    // flip y
    v_texCoord.y = 1.0 - v_texCoord.y;
}
`.trim();
const pixMapFragSource: string = `
#version 300 es

precision highp float;

uniform highp sampler2D u_frame;

in vec2 v_texCoord;

out vec4 fragColor;

void main() {
    fragColor = texture(u_frame, v_texCoord).bgra;
    fragColor.a = fragColor == vec4(1.0) ? 0.0 : 1.0;
}
`.trim();

// https://stackoverflow.com/a/17309861
const hslToRgbGlsl: string = `
vec3 hslToRgb(int hsl, float brightness) {
    const float onethird = 1.0 / 3.0;
    const float twothird = 2.0 / 3.0;
    const float rcpsixth = 6.0;

    float hue = float(hsl >> 10) / 64.0 + 0.0078125;
    float sat = float((hsl >> 7) & 0x7) / 8.0 + 0.0625;
    float lum = (float(hsl & 0x7f) / 128.0);

    vec3 xt = vec3(
        rcpsixth * (hue - twothird),
        0.0,
        rcpsixth * (1.0 - hue)
    );

    if (hue < twothird) {
        xt.r = 0.0;
        xt.g = rcpsixth * (twothird - hue);
        xt.b = rcpsixth * (hue      - onethird);
    }

    if (hue < onethird) {
        xt.r = rcpsixth * (onethird - hue);
        xt.g = rcpsixth * hue;
        xt.b = 0.0;
    }

    xt = min( xt, 1.0 );

    float sat2   =  2.0 * sat;
    float satinv =  1.0 - sat;
    float luminv =  1.0 - lum;
    float lum2m1 = (2.0 * lum) - 1.0;
    vec3  ct     = (sat2 * xt) + satinv;

    vec3 rgb;
    if (lum >= 0.5)
         rgb = (luminv * ct) + lum2m1;
    else rgb =  lum    * ct;

    return pow(rgb, vec3(brightness));
}
`;

const mainVertSource: string = `
#version 300 es

#ifdef GL_NV_shader_noperspective_interpolation
#extension GL_NV_shader_noperspective_interpolation : require
#endif

#define TEXTURE_ANIM_UNIT (1.0f / 128.0f)

uniform float u_time;
uniform float u_brightness;
uniform mat4 u_viewProjectionMatrix;

uniform float u_angle;
uniform vec3 u_translation;

layout(location = 0) in uvec3 a_packed;

#ifdef GL_NV_shader_noperspective_interpolation
noperspective centroid out float v_hsl;
#else
out float v_hsl;
#endif
out vec4 v_color;
out vec3 v_texCoord;

${hslToRgbGlsl}

float unpackFloat11(uint v) {
    return 16.0 - float(v) / 64.0;
}

struct Vertex {
    ivec3 position;
    int hsl;
    float alpha;
    int textureId;
    vec2 texCoord;
};

Vertex decodeVertex(uint v0, uint v1, uint v2) {
    Vertex vertex;

    int isTextured = int(v0 >> 30u);

    vertex.position.x = int(v0 & 0x3ffffu) - 0x20000;
    vertex.position.y = -(int((v0 >> 18u) & 0xfffu) - 0x800);
    vertex.position.z = int(v1 & 0x3ffffu) - 0x20000;

    int hslPacked = int(v1 >> 18u) << 2 | int(v2 >> 30u);
    int textureId = ((hslPacked >> 7) + 1);

    vertex.hsl = hslPacked * (1 - isTextured) + (hslPacked & 0x7f) * isTextured;
    vertex.alpha = float((v2 >> 22u) & 0xffu) / 255.0;

    vertex.textureId = textureId * isTextured;

    vertex.texCoord.x = unpackFloat11(uint(v2 >> 11u) & 0x7ffu);
    vertex.texCoord.y = unpackFloat11(uint(v2 & 0x7ffu));

    return vertex;
}

mat4 rotationY( in float angle ) {
    return mat4(cos(angle),		0,		sin(angle),	0,
                         0,		1.0,			 0,	0,
                -sin(angle),	0,		cos(angle),	0,
                        0, 		0,				0,	1);
}

void main() {
    Vertex vertex = decodeVertex(a_packed.x, a_packed.y, a_packed.z);

    gl_Position = rotationY(u_angle) * vec4(vec3(vertex.position), 1.0);
    gl_Position.xyz += u_translation;
    gl_Position = u_viewProjectionMatrix * gl_Position;
    int textureId = vertex.textureId - 1;
    if (textureId >= 0) {
        v_color.r = float(vertex.hsl) / 127.0;
    } else {
        v_color = vec4(hslToRgb(vertex.hsl, u_brightness), vertex.alpha);
    }
    v_hsl = float(vertex.hsl);
    v_texCoord = vec3(vertex.texCoord, float(textureId + 1));
    // scrolling textures
    if (textureId == 17 || textureId == 24) {
        v_texCoord.y += u_time / 0.02 * -2.0 * TEXTURE_ANIM_UNIT;
    }
}
`.trim();
const mainFragSource: string = `
#version 300 es

#ifdef GL_NV_shader_noperspective_interpolation
#extension GL_NV_shader_noperspective_interpolation : require
#endif

precision highp float;

uniform float u_brightness;

uniform highp sampler2DArray u_textures;

#ifdef GL_NV_shader_noperspective_interpolation
noperspective centroid in float v_hsl;
#endif
in vec4 v_color;
in vec3 v_texCoord;

out vec4 fragColor;

${hslToRgbGlsl}

vec3 getShadedColor(int rgb, int shadowFactor) {
    int shadowFactors[4] = int[](
        rgb & 0xf8f8ff,
        (rgb - (rgb >> 3)) & 0xf8f8ff,
        (rgb - (rgb >> 2)) & 0xf8f8ff,
        (rgb - (rgb >> 2) - (rgb >> 3)) & 0xf8f8ff
    );
    rgb = shadowFactors[shadowFactor % 4] >> (shadowFactor / 4);

    return vec3(float((rgb >> 16) & 0xff) / 255.0, float((rgb >> 8) & 0xff) / 255.0, float(rgb & 0xff) / 255.0);
}

void main() {
    if (v_texCoord.z > 0.0) {
        // emulate texture color shading
        vec4 texColor = texture(u_textures, v_texCoord).bgra;
        int rgb = int(texColor.r * 255.0) << 16 | int(texColor.g * 255.0) << 8 | int(texColor.b * 255.0);
        int shadowFactor = int(floor(v_color.r / 0.125));

        fragColor.rgb = getShadedColor(rgb, shadowFactor);
        fragColor.a = texColor.a;
    } else {
        #ifdef GL_NV_shader_noperspective_interpolation
            fragColor.rgb = hslToRgb(int(v_hsl), u_brightness);
        #else
            // emulate color banding
            fragColor.rgb = round(v_color.rgb * 64.0) / 64.0;
        #endif
        fragColor.a = v_color.a;
    }
}
`.trim();

const PI: number = Math.PI;
const TAU: number = PI * 2;
const RS_TO_RADIANS: number = TAU / 2048.0;

const FRUSTUM_SCALE: number = 25.0 / 256.0;
const DEFAULT_ZOOM: number = 512;

const NEAR: number = 50;
const FAR: number = 3500;

interface WEBGL_provoking_vertex {
    FIRST_VERTEX_CONVENTION_WEBGL: number;
    LAST_VERTEX_CONVENTION_WEBGL: number;
    provokingVertexWEBGL(mode: number): void;
}

function optimizeAssumingFlatsHaveSameFirstAndLastData(gl: WebGL2RenderingContext): void {
    const epv: WEBGL_provoking_vertex = gl.getExtension('WEBGL_provoking_vertex');
    if (epv) {
        epv.provokingVertexWEBGL(epv.FIRST_VERTEX_CONVENTION_WEBGL);
    }
}

// TODO: try using a separate buffer for static models to reduce bandwidth
export class RendererWebGLC extends Renderer {
    updateTexture(id: number): void {
    }

    fillTriangle(x0: number, x1: number, x2: number, y0: number, y1: number, y2: number, color: number): boolean {
        return false;
    }

    fillGouraudTriangle(xA: number, xB: number, xC: number, yA: number, yB: number, yC: number, colorA: number, colorB: number, colorC: number): boolean {
        return false;
    }

    fillTexturedTriangle(xA: number, xB: number, xC: number, yA: number, yB: number, yC: number, shadeA: number, shadeB: number, shadeC: number, originX: number, originY: number, originZ: number, txB: number, txC: number, tyB: number, tyC: number, tzB: number, tzC: number, texture: number): boolean {
        return false;
    }

    destroy(): void {
        delete RendererWebGLC.viewportFramebuffer;
        RendererWebGLC.textureArray = null;
    }

    frame: number = 0;

    pixMapTextures: Map<PixMap, PixMapTexture> = new Map();

    drawCommands: DrawCommands = new DrawCommands(1024);

    static frameProgram: ShaderProgram;
    static frameLoc: WebGLUniformLocation;

    static pixMapProgram: ShaderProgram;
    static pixMapLoc: WebGLUniformLocation;

    static mainProgram: ShaderProgram;
    static timeLoc: WebGLUniformLocation;
    static brightnessLoc: WebGLUniformLocation;
    static viewProjectionMatrixLoc: WebGLUniformLocation;
    static angleLoc: WebGLUniformLocation;
    static translationLoc: WebGLUniformLocation;
    static texturesLoc: WebGLUniformLocation;
    static packedAttrLoc: number;

    static areaViewport: PixMap;
    static viewportWidth: number;
    static viewportHeight: number;
    static viewportFramebuffer?: WebGLFramebuffer;
    static viewportColorTexture: WebGLTexture;
    static viewportDepthBuffer: WebGLRenderbuffer;

    isDrawingScene: boolean = false;

    static textureArray: WebGLTexture | null;

    brightness: number = 0.9;

    cameraPos: vec3 = vec3.create();
    static cameraYaw: number = 0;
    static cameraPitch: number = 0;

    projectionMatrix: mat4 = mat4.create();
    cameraMatrix: mat4 = mat4.create();
    viewMatrix: mat4 = mat4.create();
    viewProjectionMatrix: mat4 = mat4.create();

    vertexDataBuffer: VertexDataBuffer = new VertexDataBuffer(1024);
    indexDataBuffer: IndexDataBuffer = new IndexDataBuffer(1024 * 2);

    static vertexArray: WebGLVertexArrayObject;

    static vertexBuffer: WebGLBuffer | null;
    static indexBuffer: WebGLBuffer | null;

    static modelStartIndex: number = 0;
    static modelElementOffset: number = 0;

    static modelStartIndexMap: Map<Model, number> = new Map();
    static modelVertexDataCache: Map<Model, CachedVertexData> = new Map();
    static modelsToCache: Set<Model> = new Set();

    static init(container: HTMLElement, width: number, height: number): RendererWebGLC {
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
        return new RendererWebGLC(canvas, gl);
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

        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

        optimizeAssumingFlatsHaveSameFirstAndLastData(this.gl);

        this.gl.getExtension('NV_shader_noperspective_interpolation');

        const frameVertShader: Shader = new Shader(this.gl, this.gl.VERTEX_SHADER, frameVertSource);
        const frameFragShader: Shader = new Shader(this.gl, this.gl.FRAGMENT_SHADER, frameFragSource);
        RendererWebGLC.frameProgram = createProgram(this.gl, [frameVertShader, frameFragShader]);
        RendererWebGLC.frameLoc = this.gl.getUniformLocation(RendererWebGLC.frameProgram.program, 'u_frame')!;

        const pixMapVertShader: Shader = new Shader(this.gl, this.gl.VERTEX_SHADER, pixMapVertSource);
        const pixMapFragShader: Shader = new Shader(this.gl, this.gl.FRAGMENT_SHADER, pixMapFragSource);
        RendererWebGLC.pixMapProgram = createProgram(this.gl, [pixMapVertShader, pixMapFragShader]);
        RendererWebGLC.pixMapLoc = this.gl.getUniformLocation(RendererWebGLC.pixMapProgram.program, 'u_frame')!;

        const mainVertShader: Shader = new Shader(this.gl, this.gl.VERTEX_SHADER, mainVertSource);
        const mainFragShader: Shader = new Shader(this.gl, this.gl.FRAGMENT_SHADER, mainFragSource);
        RendererWebGLC.mainProgram = createProgram(this.gl, [mainVertShader, mainFragShader]);
        RendererWebGLC.timeLoc = this.gl.getUniformLocation(RendererWebGLC.mainProgram.program, 'u_time')!;
        RendererWebGLC.brightnessLoc = this.gl.getUniformLocation(RendererWebGLC.mainProgram.program, 'u_brightness')!;
        RendererWebGLC.viewProjectionMatrixLoc = this.gl.getUniformLocation(RendererWebGLC.mainProgram.program, 'u_viewProjectionMatrix')!;
        RendererWebGLC.angleLoc = this.gl.getUniformLocation(RendererWebGLC.mainProgram.program, 'u_angle')!;
        RendererWebGLC.translationLoc = this.gl.getUniformLocation(RendererWebGLC.mainProgram.program, 'u_translation')!;
        RendererWebGLC.texturesLoc = this.gl.getUniformLocation(RendererWebGLC.mainProgram.program, 'u_textures')!;
        RendererWebGLC.packedAttrLoc = this.gl.getAttribLocation(RendererWebGLC.mainProgram.program, 'a_packed');

        const vertexArray: WebGLVertexArrayObject = this.gl.createVertexArray()!;
        this.gl.bindVertexArray(vertexArray);
        this.gl.enableVertexAttribArray(RendererWebGLC.packedAttrLoc);
        RendererWebGLC.vertexArray = vertexArray;
        this.gl.bindVertexArray(null);
    }

    setBrightness(brightness: number): void {
        this.brightness = brightness;
        this.initTextureArray(true);
    }

    initTextureArray(force: boolean = false): void {
        if (RendererWebGLC.textureArray && !force) {
            return;
        }
        if (RendererWebGLC.textureArray) {
            this.gl.deleteTexture(RendererWebGLC.textureArray);
        }
        const textureSize: number = 128;
        const pixelCount: number = textureSize * textureSize;

        const textureCount: number = Pix3D.textureCount;
        const textureArrayLayers: number = textureCount + 1;

        const textureArray: WebGLTexture = this.gl.createTexture()!;
        this.gl.bindTexture(this.gl.TEXTURE_2D_ARRAY, textureArray);
        this.gl.texParameteri(this.gl.TEXTURE_2D_ARRAY, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
        this.gl.texParameteri(this.gl.TEXTURE_2D_ARRAY, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

        this.gl.texParameteri(this.gl.TEXTURE_2D_ARRAY, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);

        const pixels: Int32Array = new Int32Array(textureArrayLayers * pixelCount);
        // White texture
        pixels.fill(0xffffffff, 0, pixelCount);

        for (let t: number = 0; t < textureCount; t++) {
            const texels: Int32Array | null = Pix3D.getTexels(t);
            if (!texels) {
                continue;
            }
            for (let i: number = 0; i < pixelCount; i++) {
                let rgb: number = texels[i];
                if (rgb !== 0) {
                    rgb |= 0xff000000;
                }
                pixels[(t + 1) * pixelCount + i] = rgb;
            }
        }

        this.gl.texImage3D(this.gl.TEXTURE_2D_ARRAY, 0, this.gl.RGBA, textureSize, textureSize, textureArrayLayers, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, new Uint8Array(pixels.buffer));

        RendererWebGLC.textureArray = textureArray;
    }

    startFrame(): void {
        this.frame++;
        this.drawCommands.count = 0;
        RendererWebGLC.modelStartIndexMap.clear();
        this.gl.viewport(0, 0, this.gl.canvas.width, this.gl.canvas.height);
        this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        // this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }

    setFrustumProjectionMatrix(matrix: mat4, offsetX: number, offsetY: number, centerX: number, centerY: number, width: number, height: number, yaw: number, pitch: number, zoom: number): mat4 {
        const left: number = ((offsetX - centerX) << 9) / zoom;
        const right: number = ((offsetX + width - centerX) << 9) / zoom;
        const top: number = ((offsetY - centerY) << 9) / zoom;
        const bottom: number = ((offsetY + height - centerY) << 9) / zoom;

        mat4.identity(matrix);
        mat4.frustum(matrix, left * FRUSTUM_SCALE, right * FRUSTUM_SCALE, -bottom * FRUSTUM_SCALE, -top * FRUSTUM_SCALE, NEAR, FAR);

        mat4.rotateX(matrix, matrix, PI);
        if (pitch !== 0) {
            mat4.rotateX(matrix, matrix, pitch * RS_TO_RADIANS);
        }
        if (yaw !== 0) {
            mat4.rotateY(matrix, matrix, yaw * RS_TO_RADIANS);
        }

        return matrix;
    }

    setCameraMatrix(matrix: mat4, pos: vec3): mat4 {
        mat4.identity(matrix);
        mat4.translate(matrix, matrix, pos);
        return matrix;
    }

    renderPixMap(pixMap: PixMap, x: number, y: number): boolean {
        let pixMapTexture: PixMapTexture | undefined = this.pixMapTextures.get(pixMap);
        if (!pixMapTexture) {
            // console.log("Creating texture for pixMap", x, y, pixMap.width, pixMap.height);
            const texture: WebGLTexture = this.gl.createTexture()!;
            this.gl.bindTexture(this.gl.TEXTURE_2D, texture);
            this.gl.texStorage2D(this.gl.TEXTURE_2D, 1, this.gl.RGBA8, pixMap.width2d, pixMap.height2d);
            pixMapTexture = {
                lastFrameUsed: this.frame,
                texture: texture
            };
            this.pixMapTextures.set(pixMap, pixMapTexture);
        } else {
            pixMapTexture.lastFrameUsed = this.frame;
        }

        // Render scene framebuffer
        if (pixMap === RendererWebGLC.areaViewport) {
            this.drawTexture(RendererWebGLC.viewportColorTexture, x, y, pixMap.width2d, pixMap.height2d);

            // Draw right side 1 pixel border
            this.drawTexture(null, x + pixMap.width2d - 1, y, 1, pixMap.height2d);
        }

        const pixels: Uint8Array = new Uint8Array(pixMap.pixels.buffer);

        this.gl.bindTexture(this.gl.TEXTURE_2D, pixMapTexture.texture);

        this.gl.texSubImage2D(this.gl.TEXTURE_2D, 0, 0, 0, pixMap.width2d, pixMap.height2d, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pixels);

        this.drawPixMapTexture(pixMapTexture.texture, x, y, pixMap.width2d, pixMap.height2d);

        return true;
    }

    private drawTexture(texture: WebGLTexture | null, x: number, y: number, width: number, height: number): void {
        RendererWebGLC.frameProgram.use();

        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

        this.gl.viewport(x, this.gl.canvas.height - y - height, width, height);
        // this.gl.uniform1i(Renderer.frameLoc, 0);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
    }

    private drawPixMapTexture(texture: WebGLTexture, x: number, y: number, width: number, height: number): void {
        RendererWebGLC.pixMapProgram.use();

        this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

        this.gl.viewport(x, this.gl.canvas.height - y - height, width, height);

        this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
    }

    startRenderScene(): void {
        this.isDrawingScene = true;
        this.vertexDataBuffer.pos = 0;
        this.indexDataBuffer.pos = 0;
        this.initTextureArray();
    }

    endRenderScene(): void {
        this.isDrawingScene = false;

        // Render scene
        const pixMap: PixMap = RendererWebGLC.areaViewport;
        const viewportWidth: number = pixMap.width2d;
        const viewportHeight: number = pixMap.height2d;
        if (RendererWebGLC.viewportFramebuffer === undefined || RendererWebGLC.viewportWidth !== viewportWidth || RendererWebGLC.viewportHeight !== viewportHeight) {
            if (RendererWebGLC.viewportFramebuffer !== undefined) {
                this.gl.deleteFramebuffer(RendererWebGLC.viewportFramebuffer);
                this.gl.deleteTexture(RendererWebGLC.viewportColorTexture);
                this.gl.deleteRenderbuffer(RendererWebGLC.viewportDepthBuffer);
            }
            // console.log("Creating viewport framebuffer", x, y, pixMap.width, pixMap.height);
            RendererWebGLC.viewportFramebuffer = this.gl.createFramebuffer()!;
            RendererWebGLC.viewportWidth = viewportWidth;
            RendererWebGLC.viewportHeight = viewportHeight;
            const colorTexture: WebGLTexture = (RendererWebGLC.viewportColorTexture = this.gl.createTexture()!);
            this.gl.bindTexture(this.gl.TEXTURE_2D, colorTexture);
            this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, viewportWidth, viewportHeight, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
            this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

            const depthBuffer: WebGLRenderbuffer = (RendererWebGLC.viewportDepthBuffer = this.gl.createRenderbuffer()!);
            this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, depthBuffer);
            this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, viewportWidth, viewportHeight);

            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, RendererWebGLC.viewportFramebuffer);

            this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, colorTexture, 0);
            this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, depthBuffer);
        } else {
            this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, RendererWebGLC.viewportFramebuffer);
        }

        // this.gl.enable(this.gl.DEPTH_TEST);

        const centerX: number = Pix3D.centerX;
        const centerY: number = Pix3D.centerY;

        this.gl.viewport(0, 0, viewportWidth, viewportHeight);

        this.gl.clearColor(0.0, 0, 0, 1);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        RendererWebGLC.mainProgram.use();

        this.gl.uniform1f(RendererWebGLC.timeLoc, performance.now() / 1000);
        this.gl.uniform1f(RendererWebGLC.brightnessLoc, this.brightness);

        this.cameraPos[0] = World3D.eyeX;
        this.cameraPos[1] = World3D.eyeY;
        this.cameraPos[2] = World3D.eyeZ;
        const yaw: number = RendererWebGLC.cameraYaw;
        const pitch: number = RendererWebGLC.cameraPitch;
        const zoom: number = DEFAULT_ZOOM;
        this.setFrustumProjectionMatrix(this.projectionMatrix, 0, 0, centerX, centerY, viewportWidth, viewportHeight, yaw, pitch, zoom);
        this.setCameraMatrix(this.cameraMatrix, this.cameraPos);
        mat4.invert(this.viewMatrix, this.cameraMatrix);
        mat4.multiply(this.viewProjectionMatrix, this.projectionMatrix, this.viewMatrix);

        this.gl.uniformMatrix4fv(RendererWebGLC.viewProjectionMatrixLoc, false, this.viewProjectionMatrix);

        if (RendererWebGLC.vertexBuffer) {
            this.gl.deleteBuffer(RendererWebGLC.vertexBuffer);
            RendererWebGLC.vertexBuffer = null;
        }
        if (RendererWebGLC.indexBuffer) {
            this.gl.deleteBuffer(RendererWebGLC.indexBuffer);
            RendererWebGLC.indexBuffer = null;
        }

        const vertexDataBuffer: VertexDataBuffer = this.vertexDataBuffer;
        const indexDataBuffer: IndexDataBuffer = this.indexDataBuffer;

        const vertexCount: number = vertexDataBuffer.pos / VertexDataBuffer.STRIDE;
        const elementCount: number = indexDataBuffer.pos;

        if (elementCount > 0) {
            this.gl.bindTexture(this.gl.TEXTURE_2D_ARRAY, RendererWebGLC.textureArray);

            this.gl.bindVertexArray(RendererWebGLC.vertexArray);

            RendererWebGLC.vertexBuffer = this.gl.createBuffer()!;
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, RendererWebGLC.vertexBuffer);
            this.gl.bufferData(this.gl.ARRAY_BUFFER, vertexDataBuffer.data, this.gl.STATIC_DRAW, 0, vertexDataBuffer.pos);

            // console.log("Uploading", vertexCount, "vertices and", elementCount, "elements");

            this.gl.vertexAttribIPointer(RendererWebGLC.packedAttrLoc, 3, this.gl.UNSIGNED_INT, VertexDataBuffer.STRIDE, 0);
            // this.gl.vertexAttribPointer(Renderer.packedAttrLoc, 3, this.gl.UNSIGNED_INT, false, 0, 0);

            RendererWebGLC.indexBuffer = this.gl.createBuffer()!;
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, RendererWebGLC.indexBuffer);
            this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indexDataBuffer.indices, this.gl.STATIC_DRAW, 0, indexDataBuffer.pos);

            const position: Float32Array = new Float32Array(3);

            let drawCount: number = 0;
            const drawCommands: DrawCommands = this.drawCommands;
            drawCommands.reduce();
            for (let i: number = 0; i < drawCommands.count; i++) {
                const offset: number = drawCommands.offsets[i];
                const count: number = drawCommands.counts[i];
                if (count === 0) {
                    continue;
                }
                const angle: number = ((2048 - drawCommands.yaws[i]) & 0x7ff) * RS_TO_RADIANS;
                position[0] = drawCommands.positions[i * 3];
                position[1] = drawCommands.positions[i * 3 + 1];
                position[2] = drawCommands.positions[i * 3 + 2];
                this.gl.uniform1f(RendererWebGLC.angleLoc, angle);
                this.gl.uniform3fv(RendererWebGLC.translationLoc, position);
                this.gl.drawElements(this.gl.TRIANGLES, count, this.gl.UNSIGNED_INT, offset * 4);
                drawCount++;
            }

            this.gl.bindVertexArray(null);
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, null);
            this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, null);
        }

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    }

    drawTileUnderlay(world: World3D, underlay: TileUnderlay, level: number, tileX: number, tileZ: number): boolean {
        if (underlay.southwestColor === 12345678 && underlay.northeastColor === 12345678) {
            return true;
        }
        const x0: number = tileX << 7;
        const x1: number = (tileX + 1) << 7;
        const z0: number = tileZ << 7;
        const z1: number = (tileZ + 1) << 7;

        const y00: number = world.levelHeightmaps[level][tileX][tileZ];
        const y10: number = world.levelHeightmaps[level][tileX + 1][tileZ];
        const y11: number = world.levelHeightmaps[level][tileX + 1][tileZ + 1];
        const y01: number = world.levelHeightmaps[level][tileX][tileZ + 1];

        const vertexDataBuffer: VertexDataBuffer = this.vertexDataBuffer;
        const indexDataBuffer: IndexDataBuffer = this.indexDataBuffer;

        const textureId: number = underlay.textureId;
        const texCoordU00: number = 0;
        const texCoordV00: number = 0;
        const texCoordU10: number = 1;
        const texCoordV10: number = 0;
        const texCoordU11: number = 1;
        const texCoordV11: number = 1;
        const texCoordU01: number = 0;
        const texCoordV01: number = 1;

        const elementOffset: number = indexDataBuffer.pos;

        // Software renderer has wrong texture coordinates
        if (underlay.northeastColor !== 12345678) {
            if (underlay.flat) {
                const index11: number = vertexDataBuffer.addVertex(x1, y11, z1, underlay.northeastColor, 0xff, textureId, texCoordU11, texCoordV11);
                const index01: number = vertexDataBuffer.addVertex(x0, y01, z1, underlay.northwestColor, 0xff, textureId, texCoordU01, texCoordV01);
                const index10: number = vertexDataBuffer.addVertex(x1, y10, z0, underlay.southeastColor, 0xff, textureId, texCoordU10, texCoordV10);
                indexDataBuffer.addIndices(index11, index01, index10);
            } else {
                const index11: number = vertexDataBuffer.addVertex(x1, y11, z1, underlay.northeastColor, 0xff, textureId, texCoordU00, texCoordV00);
                const index01: number = vertexDataBuffer.addVertex(x0, y01, z1, underlay.northwestColor, 0xff, textureId, texCoordU10, texCoordV10);
                const index10: number = vertexDataBuffer.addVertex(x1, y10, z0, underlay.southeastColor, 0xff, textureId, texCoordU01, texCoordV01);
                indexDataBuffer.addIndices(index11, index01, index10);
            }
        }
        if (underlay.southwestColor !== 12345678) {
            const index00: number = vertexDataBuffer.addVertex(x0, y00, z0, underlay.southwestColor, 0xff, textureId, texCoordU00, texCoordV00);
            const index10: number = vertexDataBuffer.addVertex(x1, y10, z0, underlay.southeastColor, 0xff, textureId, texCoordU10, texCoordV10);
            const index01: number = vertexDataBuffer.addVertex(x0, y01, z1, underlay.northwestColor, 0xff, textureId, texCoordU01, texCoordV01);
            indexDataBuffer.addIndices(index00, index10, index01);
        }

        this.drawCommands.addCommand(0, 0, 0, 0, elementOffset, indexDataBuffer.pos - elementOffset);

        return true;
    }

    tmpOverlayU: Float32Array = new Float32Array(6);
    tmpOverlayV: Float32Array = new Float32Array(6);

    drawTileOverlay(world: World3D, overlay: TileOverlay, tileX: number, tileZ: number): boolean {
        const vertexDataBuffer: VertexDataBuffer = this.vertexDataBuffer;
        const indexDataBuffer: IndexDataBuffer = this.indexDataBuffer;

        const offsetX: number = tileX << 7;
        const offsetZ: number = tileZ << 7;

        const elementOffset: number = indexDataBuffer.pos;

        const vertexCount: number = overlay.vertexX.length;
        const triangleCount: number = overlay.triangleVertexA.length;

        if (overlay.triangleTextureIds) {
            for (let i: number = 0; i < vertexCount; i++) {
                const x: number = overlay.vertexX[i] - offsetX;
                const z: number = overlay.vertexZ[i] - offsetZ;

                this.tmpOverlayU[i] = x / 128.0;
                this.tmpOverlayV[i] = z / 128.0;
            }
        }

        for (let i: number = 0; i < triangleCount; i++) {
            const a: number = overlay.triangleVertexA[i];
            const b: number = overlay.triangleVertexB[i];
            const c: number = overlay.triangleVertexC[i];

            const xa: number = overlay.vertexX[a];
            const ya: number = overlay.vertexY[a];
            const za: number = overlay.vertexZ[a];

            const xb: number = overlay.vertexX[b];
            const yb: number = overlay.vertexY[b];
            const zb: number = overlay.vertexZ[b];

            const xc: number = overlay.vertexX[c];
            const yc: number = overlay.vertexY[c];
            const zc: number = overlay.vertexZ[c];

            const colorA: number = overlay.triangleColorA[i];
            const colorB: number = overlay.triangleColorB[i];
            const colorC: number = overlay.triangleColorC[i];

            const textureId: number = overlay.triangleTextureIds?.[i] ?? -1;
            if (textureId === -1 && colorA === 12345678) {
                continue;
            }

            if (overlay.flat) {
                const indexA: number = vertexDataBuffer.addVertex(xa, ya, za, colorA, 0xff, textureId, this.tmpOverlayU[a], this.tmpOverlayV[a]);
                const indexB: number = vertexDataBuffer.addVertex(xb, yb, zb, colorB, 0xff, textureId, this.tmpOverlayU[b], this.tmpOverlayV[b]);
                const indexC: number = vertexDataBuffer.addVertex(xc, yc, zc, colorC, 0xff, textureId, this.tmpOverlayU[c], this.tmpOverlayV[c]);

                indexDataBuffer.addIndices(indexA, indexB, indexC);
            } else {
                const indexA: number = vertexDataBuffer.addVertex(xa, ya, za, colorA, 0xff, textureId, this.tmpOverlayU[0], this.tmpOverlayV[0]);
                const indexB: number = vertexDataBuffer.addVertex(xb, yb, zb, colorB, 0xff, textureId, this.tmpOverlayU[1], this.tmpOverlayV[1]);
                const indexC: number = vertexDataBuffer.addVertex(xc, yc, zc, colorC, 0xff, textureId, this.tmpOverlayU[3], this.tmpOverlayV[3]);

                indexDataBuffer.addIndices(indexA, indexB, indexC);
            }
        }

        this.drawCommands.addCommand(0, 0, 0, 0, elementOffset, indexDataBuffer.pos - elementOffset);

        return true;
    }

    cacheModelVertexData(model: Model, resetData: boolean): void {
        if (RendererWebGLC.modelVertexDataCache.has(model)) {
            return;
        }

        const vertexDataBuffer: VertexDataBuffer = this.vertexDataBuffer;
        const startPos: number = vertexDataBuffer.pos;
        this.addModelVertexData(vertexDataBuffer, model);
        const endPos: number = vertexDataBuffer.pos;
        if (resetData) {
            vertexDataBuffer.pos = startPos;
        }
        const length: number = endPos - startPos;
        if (length > 0) {
            const data: Uint8Array = vertexDataBuffer.data.slice(startPos, endPos);
            RendererWebGLC.modelVertexDataCache.set(model, { frame: this.frame, data });
        }
    }

    static onSceneLoaded(world: World3D | null): void {
        if (!world) {
            return;
        }

        // Cache model vertex data
        RendererWebGLC.modelVertexDataCache.clear();
        RendererWebGLC.modelsToCache.clear();

        for (let level: number = 0; level < world.maxLevel; level++) {
            for (let x: number = 0; x < world.maxTileX; x++) {
                for (let z: number = 0; z < world.maxTileZ; z++) {
                    const tile: Ground | null = world.levelTiles[level][x][z];
                    RendererWebGLC.cacheTile(tile);
                }
            }
        }
    }

    static cacheTile(tile: Ground | null): void {
        if (!tile) {
            return;
        }
        if (tile.bridge) {
            this.cacheTile(tile.bridge);
        }
        const wallModelA: Model | null | undefined = tile.wall?.modelA;
        const wallModelB: Model | null | undefined = tile.wall?.modelB;
        const wallDecModel: Model | null | undefined = tile.wallDecoration?.model;
        const groundDecModel: Model | null | undefined = tile.groundDecoration?.model;
        if (wallModelA) {
            this.modelsToCache.add(wallModelA);
            // Renderer.cacheModelVertexData(wallModelA);
        }
        if (wallModelB) {
            this.modelsToCache.add(wallModelB);
            // Renderer.cacheModelVertexData(wallModelB);
        }
        if (wallDecModel) {
            this.modelsToCache.add(wallDecModel);
            // Renderer.cacheModelVertexData(wallDecModel);
        }
        if (groundDecModel) {
            this.modelsToCache.add(groundDecModel);
            // Renderer.cacheModelVertexData(groundDecModel);
        }
        for (const loc of tile.locs) {
            if (!loc) {
                continue;
            }
            const model: Model | null = loc.model;
            if (!model) {
                continue;
            }
            this.modelsToCache.add(model);
            // Renderer.cacheModelVertexData(model);
        }
    }

    static onSceneReset(world: World3D): void {
        RendererWebGLC.modelStartIndexMap.clear();
        RendererWebGLC.modelVertexDataCache.clear();
        RendererWebGLC.modelsToCache.clear();
    }

    addModelVertexData(vertexDataBuffer: VertexDataBuffer, model: Model): void {
        const triangleColorsA: Int32Array | null = model.faceColorA;
        const triangleColorsB: Int32Array | null = model.faceColorB;
        const triangleColorsC: Int32Array | null = model.faceColorC;

        if (!triangleColorsA || !triangleColorsB || !triangleColorsC) {
            return;
        }

        const verticesX: Int32Array = model.vertexX;
        const verticesY: Int32Array = model.vertexY;
        const verticesZ: Int32Array = model.vertexZ;

        const triangleA: Int32Array = model.faceVertexA;
        const triangleB: Int32Array = model.faceVertexB;
        const triangleC: Int32Array = model.faceVertexC;

        const triangleColors: Int32Array | null = model.faceColor;

        const triangleAlphas: Int32Array | null = model.faceAlpha;

        const triangleInfos: Int32Array | null = model.faceInfo;

        const textureMappingP: Int32Array = model.texturedVertexA;
        const textureMappingM: Int32Array = model.texturedVertexB;
        const textureMappingN: Int32Array = model.texturedVertexC;

        const triangleCount: number = model.faceCount;
        for (let t: number = 0; t < triangleCount; t++) {
            const a: number = triangleA[t];
            const b: number = triangleB[t];
            const c: number = triangleC[t];

            const xa: number = verticesX[a];
            const ya: number = verticesY[a];
            const za: number = verticesZ[a];

            const xb: number = verticesX[b];
            const yb: number = verticesY[b];
            const zb: number = verticesZ[b];

            const xc: number = verticesX[c];
            const yc: number = verticesY[c];
            const zc: number = verticesZ[c];

            const colorA: number = triangleColorsA[t];
            let colorB: number = triangleColorsB[t];
            let colorC: number = triangleColorsC[t];

            let alpha: number = 0xff;
            if (triangleAlphas) {
                alpha = 0xff - triangleAlphas[t];
            }

            let info: number = 0;
            if (triangleInfos) {
                info = triangleInfos[t];
            }

            const type: number = info & 0x3;

            // Flat shading
            if (type === 1 || type === 3) {
                colorC = colorB = colorA;
            }

            let textureId: number = -1;

            let u0: number = 0.0;
            let v0: number = 0.0;
            let u1: number = 0.0;
            let v1: number = 0.0;
            let u2: number = 0.0;
            let v2: number = 0.0;

            // Textured
            if ((type === 2 || type === 3) && triangleColors) {
                textureId = triangleColors[t];

                const texCoord: number = info >> 2;
                const p: number = textureMappingP[texCoord];
                const m: number = textureMappingM[texCoord];
                const n: number = textureMappingN[texCoord];

                const vx: number = verticesX[p];
                const vy: number = verticesY[p];
                const vz: number = verticesZ[p];

                const f_882_: number = verticesX[m] - vx;
                const f_883_: number = verticesY[m] - vy;
                const f_884_: number = verticesZ[m] - vz;
                const f_885_: number = verticesX[n] - vx;
                const f_886_: number = verticesY[n] - vy;
                const f_887_: number = verticesZ[n] - vz;
                const f_888_: number = verticesX[a] - vx;
                const f_889_: number = verticesY[a] - vy;
                const f_890_: number = verticesZ[a] - vz;
                const f_891_: number = verticesX[b] - vx;
                const f_892_: number = verticesY[b] - vy;
                const f_893_: number = verticesZ[b] - vz;
                const f_894_: number = verticesX[c] - vx;
                const f_895_: number = verticesY[c] - vy;
                const f_896_: number = verticesZ[c] - vz;

                const f_897_: number = f_883_ * f_887_ - f_884_ * f_886_;
                const f_898_: number = f_884_ * f_885_ - f_882_ * f_887_;
                const f_899_: number = f_882_ * f_886_ - f_883_ * f_885_;
                let f_900_: number = f_886_ * f_899_ - f_887_ * f_898_;
                let f_901_: number = f_887_ * f_897_ - f_885_ * f_899_;
                let f_902_: number = f_885_ * f_898_ - f_886_ * f_897_;
                let f_903_: number = 1.0 / (f_900_ * f_882_ + f_901_ * f_883_ + f_902_ * f_884_);

                u0 = (f_900_ * f_888_ + f_901_ * f_889_ + f_902_ * f_890_) * f_903_;
                u1 = (f_900_ * f_891_ + f_901_ * f_892_ + f_902_ * f_893_) * f_903_;
                u2 = (f_900_ * f_894_ + f_901_ * f_895_ + f_902_ * f_896_) * f_903_;

                f_900_ = f_883_ * f_899_ - f_884_ * f_898_;
                f_901_ = f_884_ * f_897_ - f_882_ * f_899_;
                f_902_ = f_882_ * f_898_ - f_883_ * f_897_;
                f_903_ = 1.0 / (f_900_ * f_885_ + f_901_ * f_886_ + f_902_ * f_887_);

                v0 = (f_900_ * f_888_ + f_901_ * f_889_ + f_902_ * f_890_) * f_903_;
                v1 = (f_900_ * f_891_ + f_901_ * f_892_ + f_902_ * f_893_) * f_903_;
                v2 = (f_900_ * f_894_ + f_901_ * f_895_ + f_902_ * f_896_) * f_903_;
            }

            vertexDataBuffer.addVertex(xa, ya, za, colorA, alpha, textureId, u0, v0);
            vertexDataBuffer.addVertex(xb, yb, zb, colorB, alpha, textureId, u1, v1);
            vertexDataBuffer.addVertex(xc, yc, zc, colorC, alpha, textureId, u2, v2);
        }
    }

    startDrawModel(model: Model, yaw: number, relativeX: number, relativeY: number, relativeZ: number, bitset: number): void {
        if (!this.isDrawingScene) {
            return;
        }
        const vertexDataBuffer: VertexDataBuffer = this.vertexDataBuffer;
        const indexDataBuffer: IndexDataBuffer = this.indexDataBuffer;

        const modelStartIndex: number | undefined = RendererWebGLC.modelStartIndexMap.get(model);
        if (modelStartIndex !== undefined) {
            RendererWebGLC.modelStartIndex = modelStartIndex;
            RendererWebGLC.modelElementOffset = indexDataBuffer.pos;
            return;
        }

        const triangleColorsA: Int32Array | null = model.faceColorA;
        const triangleColorsB: Int32Array | null = model.faceColorB;
        const triangleColorsC: Int32Array | null = model.faceColorC;

        if (!triangleColorsA || !triangleColorsB || !triangleColorsC) {
            return;
        }

        const vertexDataStartPos: number = vertexDataBuffer.pos;
        RendererWebGLC.modelStartIndex = vertexDataStartPos / VertexDataBuffer.STRIDE;
        RendererWebGLC.modelElementOffset = indexDataBuffer.pos;

        RendererWebGLC.modelStartIndexMap.set(model, RendererWebGLC.modelStartIndex);

        const cachedVertexData: CachedVertexData | undefined = RendererWebGLC.modelVertexDataCache.get(model);
        if (cachedVertexData) {
            vertexDataBuffer.addData(cachedVertexData.data);
            return;
        }

        if (RendererWebGLC.modelsToCache.has(model)) {
            this.cacheModelVertexData(model, false);
        } else {
            this.addModelVertexData(vertexDataBuffer, model);
        }
    }

    endDrawModel(model: Model, yaw: number, relativeX: number, relativeY: number, relativeZ: number, bitset: number): void {
        if (!this.isDrawingScene) {
            return;
        }

        const elementCount: number = this.indexDataBuffer.pos - RendererWebGLC.modelElementOffset;

        if (elementCount > 0) {
            const x: number = relativeX + World3D.eyeX;
            const y: number = relativeY + World3D.eyeY;
            const z: number = relativeZ + World3D.eyeZ;

            this.drawCommands.addCommand(x, y, z, yaw, RendererWebGLC.modelElementOffset, elementCount);
        }
    }

    drawModelTriangle(model: Model, index: number): boolean {
        if (!this.isDrawingScene) {
            return false;
        }

        // if (Renderer.modelsToCache.has(model)) {
        //     return true;
        // }

        const startIndex: number = RendererWebGLC.modelStartIndex + index * 3;

        this.indexDataBuffer.addIndices(startIndex, startIndex + 1, startIndex + 2);

        return true;
    }

    endFrame(): void {
        for (const [pixMap, pixMapTexture] of this.pixMapTextures) {
            if (this.frame - pixMapTexture.lastFrameUsed > 5) {
                this.gl.deleteTexture(pixMapTexture.texture);
                this.pixMapTextures.delete(pixMap);
            }
        }
    }
}
