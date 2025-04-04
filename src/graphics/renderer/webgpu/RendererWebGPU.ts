import type TileOverlay from '#/dash3d/type/TileOverlay.ts';
import type TileUnderlay from '#/dash3d/type/TileUnderlay.ts';
import World3D from '#/dash3d/World3D.js';
import { canvas as cpuCanvas } from '#/graphics/Canvas.js';
import type Model from '#/graphics/Model.ts';
import Pix3D from '#/graphics/Pix3D.js';
import PixMap from '#/graphics/PixMap.js';
import { Renderer } from '#/graphics/renderer/Renderer.js';

import { SHADER_CODE as computeRasterizerShaderCode } from './shaders/compute-rasterizer.wgsl';
import { SHADER_CODE as fullscreenPixelsShaderCode } from './shaders/fullscreen-pixels.wgsl';
import { SHADER_CODE as fullscreenPixMapShaderCode } from './shaders/fullscreen-pixmap.wgsl';
import { SHADER_CODE as fullscreenTextureShaderCode } from './shaders/fullscreen-texture.wgsl';
import { SHADER_CODE as fullscreenVertexShaderCode } from './shaders/fullscreen-vertex.wgsl';

const INITIAL_TRIANGLES: number = 65536;

const TEXTURE_COUNT: number = 50;

const TEXTURE_SIZE: number = 128;
const TEXTURE_PIXEL_COUNT: number = TEXTURE_SIZE * TEXTURE_SIZE;

const PALETTE_BYTES: number = 65536 * 4;
const TEXTURES_TRANSLUCENT_BYTES: number = TEXTURE_COUNT * 4;
const TEXTURES_BYTES: number = TEXTURE_COUNT * TEXTURE_PIXEL_COUNT * 4 * 4;

interface QueuedRenderPixMapCommand {
    pixMap: PixMap;
    x: number;
    y: number;
}

export class RendererWebGPU extends Renderer {
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

    device: GPUDevice;
    context: GPUCanvasContext;

    defaultSampler!: GPUSampler;
    samplerTextureGroupLayout!: GPUBindGroupLayout;
    frameTexture!: GPUTexture;
    frameBindGroup!: GPUBindGroup;

    uniformBuffer!: GPUBuffer;

    pixelBuffer!: GPUBuffer;
    depthBuffer!: GPUBuffer;

    // Lookup tables
    lutsBuffer!: GPUBuffer;

    // Rasterizer
    rasterizerShaderModule!: GPUShaderModule;
    rasterizerBindGroupLayout!: GPUBindGroupLayout;
    triangleDataBindGroupLayout!: GPUBindGroupLayout;
    rasterizerBindGroup!: GPUBindGroup;

    // Compute pipelines
    clearPipeline!: GPUComputePipeline;
    // Depth
    renderFlatDepthPipeline!: GPUComputePipeline;
    renderGouraudDepthPipeline!: GPUComputePipeline;
    renderTexturedDepthPipeline!: GPUComputePipeline;
    // Color
    renderFlatPipeline!: GPUComputePipeline;
    renderGouraudPipeline!: GPUComputePipeline;
    renderTexturedPipeline!: GPUComputePipeline;
    renderAlphaPipeline!: GPUComputePipeline;

    fullscreenVertexShaderModule!: GPUShaderModule;
    pixMapShaderModule!: GPUShaderModule;
    pixMapPipeline!: GPURenderPipeline;
    textureShaderModule!: GPUShaderModule;
    frameTexturePipeline!: GPURenderPipeline;

    pixelBufferShaderModule!: GPUShaderModule;
    pixelBufferPipeline!: GPURenderPipeline;
    pixelBufferBindGroup!: GPUBindGroup;

    frameRenderPassDescriptor!: GPURenderPassDescriptor;
    renderPassDescriptor!: GPURenderPassDescriptor;

    flatTriangleDataBuffer: GPUBuffer | undefined;
    gouraudTriangleDataBuffer: GPUBuffer | undefined;
    texturedTriangleDataBuffer: GPUBuffer | undefined;
    alphaTriangleDataBuffer: GPUBuffer | undefined;

    encoder!: GPUCommandEncoder;
    mainPass!: GPURenderPassEncoder;

    isRenderingFrame: boolean = false;

    isRenderingScene: boolean = false;

    queuedRenderPixMapCommands: QueuedRenderPixMapCommand[] = [];

    triangleCount: number = 0;

    flatTriangleData: Uint32Array = new Uint32Array(INITIAL_TRIANGLES * 8);
    flatTriangleCount: number = 0;

    gouraudTriangleData: Uint32Array = new Uint32Array(INITIAL_TRIANGLES * 10);
    gouraudTriangleCount: number = 0;

    texturedTriangleData: Uint32Array = new Uint32Array(INITIAL_TRIANGLES * 20);
    texturedTriangleCount: number = 0;

    alphaTriangleData: Uint32Array = new Uint32Array(INITIAL_TRIANGLES * 10);
    alphaTriangleCount: number = 0;

    texturesToDelete: GPUTexture[] = [];

    texturesUsed: boolean[] = new Array(TEXTURE_COUNT).fill(false);

    textureStagingBuffers: GPUBuffer[] = [];

    frameCount: number = 0;

    static hasWebGPUSupport(): boolean {
        return 'gpu' in navigator;
    }

    static async init(container: HTMLElement, width: number, height: number): Promise<RendererWebGPU | undefined> {
        if (!RendererWebGPU.hasWebGPUSupport()) {
          throw Error('WebGPU is not supported.');
        }

        const adapter: GPUAdapter | null = await navigator.gpu.requestAdapter();
        if (!adapter) {
          throw Error('Request for WebGPU adapter failed.');
        }

        const device: GPUDevice | undefined = await adapter.requestDevice();
        if (!device) {
            throw new Error('Request for WebGPU device failed.');
        }

        const canvas: HTMLCanvasElement = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.style.display = cpuCanvas.style.display;
        canvas.style.position = cpuCanvas.style.position;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.imageRendering = cpuCanvas.style.imageRendering;
        container.appendChild(canvas);

        const context: GPUCanvasContext | null = canvas.getContext('webgpu');
        if (!context) {
            canvas.remove();
            throw new Error('WebGPU context could not be created.');
        }

        const presentationFormat: GPUTextureFormat = navigator.gpu.getPreferredCanvasFormat();
        context.configure({
            device,
            format: presentationFormat
        });

        Renderer.resetRenderer();
        return new RendererWebGPU(canvas, device, context);
    }

    constructor(canvas: HTMLCanvasElement, device: GPUDevice, context: GPUCanvasContext) {
        super(canvas);
        this.device = device;
        this.context = context;
        this.init();
    }

    init(): void {
        const viewportWidth: number = World3D.viewportRight;
        const viewportHeight: number = World3D.viewportBottom;

        this.defaultSampler = this.device.createSampler();
        this.samplerTextureGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.FRAGMENT,
                    sampler: { type: 'filtering' }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.FRAGMENT,
                    texture: { sampleType: 'float' }
                }
            ]
        });

        this.frameTexture = this.device.createTexture({
            size: { width: this.canvas.width, height: this.canvas.height },
            format: 'rgba8unorm',
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
        });
        this.frameBindGroup = this.device.createBindGroup({
            layout: this.samplerTextureGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: this.defaultSampler
                },
                {
                    binding: 1,
                    resource: this.frameTexture.createView()
                }
            ]
        });

        this.device.queue.copyExternalImageToTexture({ source: cpuCanvas }, { texture: this.frameTexture }, { width: this.canvas.width, height: this.canvas.height });

        this.uniformBuffer = this.device.createBuffer({
            size: 2 * 4,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.device.queue.writeBuffer(this.uniformBuffer, 0, new Float32Array([viewportWidth, viewportHeight]));

        this.pixelBuffer = this.device.createBuffer({
            size: viewportWidth * viewportHeight * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.depthBuffer = this.device.createBuffer({
            size: viewportWidth * viewportHeight * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        this.lutsBuffer = this.device.createBuffer({
            size: PALETTE_BYTES + TEXTURES_TRANSLUCENT_BYTES + TEXTURES_BYTES,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        this.updatePalette();
        this.updateTextures();

        this.rasterizerShaderModule = this.device.createShaderModule({
            label: 'rasterizer shaders',
            code: computeRasterizerShaderCode
        });

        this.rasterizerBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage' }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'storage' }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'read-only-storage' }
                }
            ]
        });

        this.triangleDataBindGroupLayout = this.device.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: { type: 'read-only-storage' }
                }
            ]
        });

        this.rasterizerBindGroup = this.device.createBindGroup({
            layout: this.rasterizerBindGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.pixelBuffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.depthBuffer
                    }
                },
                {
                    binding: 2,
                    resource: {
                        buffer: this.lutsBuffer
                    }
                }
            ]
        });

        this.clearPipeline = this.device.createComputePipeline({
            label: 'clear pixels pipeline',
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.rasterizerBindGroupLayout] }),
            compute: {
                module: this.rasterizerShaderModule,
                entryPoint: 'clear'
            }
        });

        // depth
        this.renderFlatDepthPipeline = this.device.createComputePipeline({
            label: 'render flat depth pipeline',
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.rasterizerBindGroupLayout, this.triangleDataBindGroupLayout] }),
            compute: {
                module: this.rasterizerShaderModule,
                entryPoint: 'renderFlatDepth'
            }
        });
        this.renderGouraudDepthPipeline = this.device.createComputePipeline({
            label: 'render gouraud depth pipeline',
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.rasterizerBindGroupLayout, this.triangleDataBindGroupLayout] }),
            compute: {
                module: this.rasterizerShaderModule,
                entryPoint: 'renderGouraudDepth'
            }
        });
        this.renderTexturedDepthPipeline = this.device.createComputePipeline({
            label: 'render textured depth pipeline',
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.rasterizerBindGroupLayout, this.triangleDataBindGroupLayout] }),
            compute: {
                module: this.rasterizerShaderModule,
                entryPoint: 'renderTexturedDepth'
            }
        });

        // color
        this.renderFlatPipeline = this.device.createComputePipeline({
            label: 'render flat pipeline',
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.rasterizerBindGroupLayout, this.triangleDataBindGroupLayout] }),
            compute: {
                module: this.rasterizerShaderModule,
                entryPoint: 'renderFlat'
            }
        });
        this.renderGouraudPipeline = this.device.createComputePipeline({
            label: 'render gouraud pipeline',
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.rasterizerBindGroupLayout, this.triangleDataBindGroupLayout] }),
            compute: {
                module: this.rasterizerShaderModule,
                entryPoint: 'renderGouraud'
            }
        });
        this.renderTexturedPipeline = this.device.createComputePipeline({
            label: 'render textured pipeline',
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.rasterizerBindGroupLayout, this.triangleDataBindGroupLayout] }),
            compute: {
                module: this.rasterizerShaderModule,
                entryPoint: 'renderTextured'
            }
        });
        this.renderAlphaPipeline = this.device.createComputePipeline({
            label: 'render alpha pipeline',
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.rasterizerBindGroupLayout, this.triangleDataBindGroupLayout] }),
            compute: {
                module: this.rasterizerShaderModule,
                entryPoint: 'renderAlpha'
            }
        });

        this.fullscreenVertexShaderModule = this.device.createShaderModule({
            label: 'fullscreen vertex shader',
            code: fullscreenVertexShaderCode
        });
        this.pixMapShaderModule = this.device.createShaderModule({
            label: 'pixmap shader',
            code: fullscreenPixMapShaderCode
        });
        this.pixMapPipeline = this.device.createRenderPipeline({
            label: 'pixmap pipeline',
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.samplerTextureGroupLayout] }),
            vertex: {
                module: this.fullscreenVertexShaderModule
            },
            fragment: {
                module: this.pixMapShaderModule,
                targets: [{ format: 'rgba8unorm' }]
            }
        });
        this.textureShaderModule = this.device.createShaderModule({
            label: 'texture shader',
            code: fullscreenTextureShaderCode
        });
        this.frameTexturePipeline = this.device.createRenderPipeline({
            label: 'frame texture pipeline',
            layout: this.device.createPipelineLayout({ bindGroupLayouts: [this.samplerTextureGroupLayout] }),
            vertex: {
                module: this.fullscreenVertexShaderModule
            },
            fragment: {
                module: this.textureShaderModule,
                targets: [{ format: navigator.gpu.getPreferredCanvasFormat() }]
            }
        });

        this.pixelBufferShaderModule = this.device.createShaderModule({
            label: 'pixel buffer shader',
            code: fullscreenPixelsShaderCode
        });

        this.pixelBufferPipeline = this.device.createRenderPipeline({
            label: 'pixel buffer pipeline',
            layout: 'auto',
            vertex: {
                module: this.fullscreenVertexShaderModule
            },
            fragment: {
                module: this.pixelBufferShaderModule,
                targets: [{ format: 'rgba8unorm' }]
            }
        });

        this.pixelBufferBindGroup = this.device.createBindGroup({
            layout: this.pixelBufferPipeline.getBindGroupLayout(0),
            entries: [
                {
                    binding: 0,
                    resource: {
                        buffer: this.uniformBuffer
                    }
                },
                {
                    binding: 1,
                    resource: {
                        buffer: this.pixelBuffer
                    }
                }
            ]
        });

        this.frameRenderPassDescriptor = {
            label: 'frame render pass',
            colorAttachments: [
                {
                    view: this.context.getCurrentTexture().createView(),
                    clearValue: {
                        r: 0.0,
                        g: 0.0,
                        b: 0.0,
                        a: 1.0
                    },
                    loadOp: 'load',
                    storeOp: 'store'
                }
            ]
        };
        this.renderPassDescriptor = {
            label: 'main render pass',
            colorAttachments: [
                {
                    view: this.frameTexture.createView(),
                    clearValue: {
                        r: 0.0,
                        g: 0.0,
                        b: 0.0,
                        a: 1.0
                    },
                    loadOp: 'load',
                    storeOp: 'store'
                }
            ]
        };
    }

    override resize(width: number, height: number): void {
        super.resize(width, height);
    }

    override startFrame(): void {
        this.isRenderingFrame = true;

        this.texturesUsed.fill(false);

        this.encoder = this.device.createCommandEncoder({
            label: 'render command encoder'
        });
        this.mainPass = this.encoder.beginRenderPass(this.renderPassDescriptor);

        for (const command of this.queuedRenderPixMapCommands) {
            this.renderPixMap(command.pixMap, command.x, command.y);
        }
        this.queuedRenderPixMapCommands.length = 0;
    }

    override endFrame(): void {
        if (!this.isRenderingFrame) {
            return;
        }
        this.isRenderingFrame = false;

        this.mainPass.end();

        for (const colorAttachment of this.frameRenderPassDescriptor.colorAttachments) {
            colorAttachment!.view = this.context.getCurrentTexture().createView();
        }

        const framePass: GPURenderPassEncoder = this.encoder.beginRenderPass(this.frameRenderPassDescriptor);
        framePass.setViewport(0, 0, this.canvas.width, this.canvas.height, 0, 1);
        framePass.setPipeline(this.frameTexturePipeline);
        framePass.setBindGroup(0, this.frameBindGroup);
        framePass.draw(3);
        framePass.end();

        const commandBuffer: GPUCommandBuffer = this.encoder.finish();

        this.device.queue.submit([commandBuffer]);

        for (const texture of this.texturesToDelete) {
            texture.destroy();
        }
        this.texturesToDelete.length = 0;
    }

    updatePalette(): void {
        this.device.queue.writeBuffer(this.lutsBuffer, 0, Pix3D.hslPal);
    }

    updateTextures(): void {
        for (let i: number = 0; i < TEXTURE_COUNT; i++) {
            this.updateTexture(i, false);
        }
        const texturesTranslucentData: Uint32Array = new Uint32Array(TEXTURES_TRANSLUCENT_BYTES);
        for (let i: number = 0; i < TEXTURE_COUNT; i++) {
            texturesTranslucentData[i] = Pix3D.textureTranslucent[i] ? 1 : 0;
        }
        this.device.queue.writeBuffer(this.lutsBuffer, PALETTE_BYTES, texturesTranslucentData);
    }

    override updateTexture(id: number, stage: boolean = true): void {
        const texels: Int32Array | null = Pix3D.getTexels(id);
        if (!texels) {
            return;
        }
        const textureBytes: number = TEXTURE_PIXEL_COUNT * 4 * 4;
        const lutsOffset: number = PALETTE_BYTES + TEXTURES_TRANSLUCENT_BYTES + id * textureBytes;
        if (stage) {
            let stagingBuffer: GPUBuffer;
            if (this.textureStagingBuffers.length > 0) {
                stagingBuffer = this.textureStagingBuffers.pop()!;
            } else {
                stagingBuffer = this.device.createBuffer({
                    size: textureBytes,
                    usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.MAP_WRITE,
                    mappedAtCreation: true
                });
            }

            new Uint32Array(stagingBuffer.getMappedRange()).set(texels);

            stagingBuffer.unmap();

            const encoder: GPUCommandEncoder = this.device.createCommandEncoder();
            encoder.copyBufferToBuffer(stagingBuffer, 0, this.lutsBuffer, lutsOffset, textureBytes);
            this.device.queue.submit([encoder.finish()]);

            stagingBuffer.mapAsync(GPUMapMode.WRITE).then((): void => {
                this.textureStagingBuffers.push(stagingBuffer);
            });
        } else {
            this.device.queue.writeBuffer(this.lutsBuffer, lutsOffset, texels);
        }
    }

    override setBrightness(brightness: number): void {
        this.updatePalette();
    }

    override renderPixMap(pixMap: PixMap, x: number, y: number): boolean {
        if (!this.isRenderingFrame) {
            // Login screen flames are rendered outside of the frame loop
            this.queuedRenderPixMapCommands.push({ pixMap, x, y });
            return true;
        }

        const viewportWidth: number = World3D.viewportRight;
        const viewportHeight: number = World3D.viewportBottom;

        if (pixMap.width2d === viewportWidth && pixMap.height2d === viewportHeight) {
            this.mainPass.setViewport(x, y, viewportWidth, viewportHeight, 0, 1);

            this.mainPass.setPipeline(this.pixelBufferPipeline);
            this.mainPass.setBindGroup(0, this.pixelBufferBindGroup);
            this.mainPass.draw(3);
        }

        const texture: GPUTexture = this.device.createTexture({
            size: { width: pixMap.width2d, height: pixMap.height2d },
            format: 'rgba8unorm',
            usage: GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING
        });
        this.device.queue.writeTexture({ texture }, pixMap.pixels, { bytesPerRow: pixMap.width2d * 4 }, { width: pixMap.width2d, height: pixMap.height2d });

        const bindGroup: GPUBindGroup = this.device.createBindGroup({
            layout: this.samplerTextureGroupLayout,
            entries: [
                {
                    binding: 0,
                    resource: this.defaultSampler
                },
                {
                    binding: 1,
                    resource: texture.createView()
                }
            ]
        });

        this.mainPass.setViewport(x, y, pixMap.width2d, pixMap.height2d, 0, 1);
        this.mainPass.setPipeline(this.pixMapPipeline);
        this.mainPass.setBindGroup(0, bindGroup);
        this.mainPass.draw(3);

        this.texturesToDelete.push(texture);

        return true;
    }

    override startRenderScene(): void {
        this.isRenderingScene = true;
        this.triangleCount = 0;
        this.flatTriangleCount = 0;
        this.texturedTriangleCount = 0;
        this.gouraudTriangleCount = 0;
        this.alphaTriangleCount = 0;
    }

    override endRenderScene(): void {
        this.isRenderingScene = false;
        this.renderScene();
    }

    renderScene(): void {
        const viewportWidth: number = World3D.viewportRight;
        const viewportHeight: number = World3D.viewportBottom;

        let flatTriangleDataBuffer: GPUBuffer | undefined = this.flatTriangleDataBuffer;
        if (flatTriangleDataBuffer) {
            flatTriangleDataBuffer.destroy();
            this.flatTriangleDataBuffer = undefined;
        }
        let gouraudTriangleDataBuffer: GPUBuffer | undefined = this.gouraudTriangleDataBuffer;
        if (gouraudTriangleDataBuffer) {
            gouraudTriangleDataBuffer.destroy();
            this.gouraudTriangleDataBuffer = undefined;
        }
        let texturedTriangleDataBuffer: GPUBuffer | undefined = this.texturedTriangleDataBuffer;
        if (texturedTriangleDataBuffer) {
            texturedTriangleDataBuffer.destroy();
            this.texturedTriangleDataBuffer = undefined;
        }
        let alphaTriangleDataBuffer: GPUBuffer | undefined = this.alphaTriangleDataBuffer;
        if (alphaTriangleDataBuffer) {
            alphaTriangleDataBuffer.destroy();
            this.alphaTriangleDataBuffer = undefined;
        }

        let flatTriangleDataBindGroup: GPUBindGroup | undefined;
        if (this.flatTriangleCount > 0) {
            flatTriangleDataBuffer = this.device.createBuffer({
                size: this.flatTriangleCount * 8 * 4,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            this.flatTriangleDataBuffer = flatTriangleDataBuffer;
            this.device.queue.writeBuffer(flatTriangleDataBuffer, 0, this.flatTriangleData.subarray(0, this.flatTriangleCount * 8));

            flatTriangleDataBindGroup = this.device.createBindGroup({
                layout: this.triangleDataBindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer: flatTriangleDataBuffer
                        }
                    }
                ]
            });
        }
        let gouraudTriangleDataBindGroup: GPUBindGroup | undefined;
        if (this.gouraudTriangleCount > 0) {
            gouraudTriangleDataBuffer = this.device.createBuffer({
                size: this.gouraudTriangleCount * 10 * 4,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            this.gouraudTriangleDataBuffer = gouraudTriangleDataBuffer;
            this.device.queue.writeBuffer(gouraudTriangleDataBuffer, 0, this.gouraudTriangleData.subarray(0, this.gouraudTriangleCount * 10));

            gouraudTriangleDataBindGroup = this.device.createBindGroup({
                layout: this.triangleDataBindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer: gouraudTriangleDataBuffer
                        }
                    }
                ]
            });
        }
        let texturedTriangleDataBindGroup: GPUBindGroup | undefined;
        if (this.texturedTriangleCount > 0) {
            texturedTriangleDataBuffer = this.device.createBuffer({
                size: this.texturedTriangleCount * 20 * 4,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            this.texturedTriangleDataBuffer = texturedTriangleDataBuffer;
            this.device.queue.writeBuffer(this.texturedTriangleDataBuffer, 0, this.texturedTriangleData.subarray(0, this.texturedTriangleCount * 20));

            texturedTriangleDataBindGroup = this.device.createBindGroup({
                layout: this.triangleDataBindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer: texturedTriangleDataBuffer
                        }
                    }
                ]
            });
        }
        let alphaTriangleDataBindGroup: GPUBindGroup | undefined;
        if (this.alphaTriangleCount > 0) {
            alphaTriangleDataBuffer = this.device.createBuffer({
                size: this.alphaTriangleCount * 10 * 4,
                usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            });
            this.alphaTriangleDataBuffer = alphaTriangleDataBuffer;
            this.device.queue.writeBuffer(alphaTriangleDataBuffer, 0, this.alphaTriangleData.subarray(0, this.alphaTriangleCount * 10));

            alphaTriangleDataBindGroup = this.device.createBindGroup({
                layout: this.triangleDataBindGroupLayout,
                entries: [
                    {
                        binding: 0,
                        resource: {
                            buffer: alphaTriangleDataBuffer
                        }
                    }
                ]
            });
        }

        const encoder: GPUCommandEncoder = this.device.createCommandEncoder({
            label: 'render scene command encoder'
        });

        const computePass: GPUComputePassEncoder = encoder.beginComputePass();

        computePass.setPipeline(this.clearPipeline);
        computePass.setBindGroup(0, this.rasterizerBindGroup);
        computePass.dispatchWorkgroups(Math.ceil((viewportWidth * viewportHeight) / 256));

        // render depth
        if (this.flatTriangleCount > 0 && flatTriangleDataBindGroup) {
            computePass.setPipeline(this.renderFlatDepthPipeline);
            computePass.setBindGroup(0, this.rasterizerBindGroup);
            computePass.setBindGroup(1, flatTriangleDataBindGroup);
            computePass.dispatchWorkgroups(this.flatTriangleCount);
        }
        if (this.gouraudTriangleCount > 0 && gouraudTriangleDataBindGroup) {
            computePass.setPipeline(this.renderGouraudDepthPipeline);
            computePass.setBindGroup(0, this.rasterizerBindGroup);
            computePass.setBindGroup(1, gouraudTriangleDataBindGroup);
            computePass.dispatchWorkgroups(this.gouraudTriangleCount);
        }
        if (this.texturedTriangleCount > 0 && texturedTriangleDataBindGroup) {
            computePass.setPipeline(this.renderTexturedDepthPipeline);
            computePass.setBindGroup(0, this.rasterizerBindGroup);
            computePass.setBindGroup(1, texturedTriangleDataBindGroup);
            computePass.dispatchWorkgroups(this.texturedTriangleCount);
        }

        // render color
        if (this.flatTriangleCount > 0 && flatTriangleDataBindGroup) {
            computePass.setPipeline(this.renderFlatPipeline);
            computePass.setBindGroup(0, this.rasterizerBindGroup);
            computePass.setBindGroup(1, flatTriangleDataBindGroup);
            computePass.dispatchWorkgroups(this.flatTriangleCount);
        }
        if (this.gouraudTriangleCount > 0 && gouraudTriangleDataBindGroup) {
            computePass.setPipeline(this.renderGouraudPipeline);
            computePass.setBindGroup(0, this.rasterizerBindGroup);
            computePass.setBindGroup(1, gouraudTriangleDataBindGroup);
            computePass.dispatchWorkgroups(this.gouraudTriangleCount);
        }
        if (this.texturedTriangleCount > 0 && texturedTriangleDataBindGroup) {
            computePass.setPipeline(this.renderTexturedPipeline);
            computePass.setBindGroup(0, this.rasterizerBindGroup);
            computePass.setBindGroup(1, texturedTriangleDataBindGroup);
            computePass.dispatchWorkgroups(this.texturedTriangleCount);
        }
        if (this.alphaTriangleCount > 0 && alphaTriangleDataBindGroup) {
            computePass.setPipeline(this.renderAlphaPipeline);
            computePass.setBindGroup(0, this.rasterizerBindGroup);
            computePass.setBindGroup(1, alphaTriangleDataBindGroup);
            computePass.dispatchWorkgroups(1);
        }

        computePass.end();

        const commandBuffer: GPUCommandBuffer = encoder.finish();
        this.device.queue.submit([commandBuffer]);
    }

    override fillTriangle(x0: number, x1: number, x2: number, y0: number, y1: number, y2: number, color: number): boolean {
        if (!this.isRenderingScene) {
            return false;
        }
        const triangleIndex: number = this.triangleCount++;
        if (Pix3D.alpha !== 0) {
            let offset: number = this.alphaTriangleCount * 10;

            if (offset >= this.alphaTriangleData.length) {
                const newData: Uint32Array = new Uint32Array(this.alphaTriangleData.length * 2);
                newData.set(this.alphaTriangleData);
                this.alphaTriangleData = newData;
            }

            this.alphaTriangleData[offset++] = (1 << 31) | (Pix3D.alpha << 23) | triangleIndex;
            this.alphaTriangleData[offset++] = x0;
            this.alphaTriangleData[offset++] = x1;
            this.alphaTriangleData[offset++] = x2;
            this.alphaTriangleData[offset++] = y0;
            this.alphaTriangleData[offset++] = y1;
            this.alphaTriangleData[offset++] = y2;
            this.alphaTriangleData[offset++] = color;

            this.alphaTriangleCount++;
        } else {
            let offset: number = this.flatTriangleCount * 8;

            if (offset >= this.flatTriangleData.length) {
                const newData: Uint32Array = new Uint32Array(this.flatTriangleData.length * 2);
                newData.set(this.flatTriangleData);
                this.flatTriangleData = newData;
            }

            this.flatTriangleData[offset++] = triangleIndex;
            this.flatTriangleData[offset++] = x0;
            this.flatTriangleData[offset++] = x1;
            this.flatTriangleData[offset++] = x2;
            this.flatTriangleData[offset++] = y0;
            this.flatTriangleData[offset++] = y1;
            this.flatTriangleData[offset++] = y2;
            this.flatTriangleData[offset++] = color;

            this.flatTriangleCount++;
        }
        return true;
    }

    override fillGouraudTriangle(xA: number, xB: number, xC: number, yA: number, yB: number, yC: number, colorA: number, colorB: number, colorC: number): boolean {
        if (!this.isRenderingScene) {
            return false;
        }
        const triangleIndex: number = this.triangleCount++;
        if (Pix3D.alpha !== 0) {
            let offset: number = this.alphaTriangleCount * 10;

            if (offset >= this.alphaTriangleData.length) {
                const newData: Uint32Array = new Uint32Array(this.alphaTriangleData.length * 2);
                newData.set(this.alphaTriangleData);
                this.alphaTriangleData = newData;
            }

            this.alphaTriangleData[offset++] = (Pix3D.alpha << 23) | triangleIndex;
            this.alphaTriangleData[offset++] = xA;
            this.alphaTriangleData[offset++] = xB;
            this.alphaTriangleData[offset++] = xC;
            this.alphaTriangleData[offset++] = yA;
            this.alphaTriangleData[offset++] = yB;
            this.alphaTriangleData[offset++] = yC;
            this.alphaTriangleData[offset++] = colorA;
            this.alphaTriangleData[offset++] = colorB;
            this.alphaTriangleData[offset++] = colorC;

            this.alphaTriangleCount++;
        } else {
            let offset: number = this.gouraudTriangleCount * 10;

            if (offset >= this.gouraudTriangleData.length) {
                const newData: Uint32Array = new Uint32Array(this.gouraudTriangleData.length * 2);
                newData.set(this.gouraudTriangleData);
                this.gouraudTriangleData = newData;
            }

            this.gouraudTriangleData[offset++] = triangleIndex;
            this.gouraudTriangleData[offset++] = xA;
            this.gouraudTriangleData[offset++] = xB;
            this.gouraudTriangleData[offset++] = xC;
            this.gouraudTriangleData[offset++] = yA;
            this.gouraudTriangleData[offset++] = yB;
            this.gouraudTriangleData[offset++] = yC;
            this.gouraudTriangleData[offset++] = colorA;
            this.gouraudTriangleData[offset++] = colorB;
            this.gouraudTriangleData[offset++] = colorC;

            this.gouraudTriangleCount++;
        }
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

        // Flag texture as used for animated textures
        if (!this.texturesUsed[texture]) {
            Pix3D.textureCycle[texture] = Pix3D.cycle++;
            this.texturesUsed[texture] = true;
        }

        const triangleIndex: number = this.triangleCount++;

        let offset: number = this.texturedTriangleCount * 20;

        if (offset >= this.texturedTriangleData.length) {
            const newData: Uint32Array = new Uint32Array(this.texturedTriangleData.length * 2);
            newData.set(this.texturedTriangleData);
            this.texturedTriangleData = newData;
        }

        this.texturedTriangleData[offset++] = triangleIndex;
        this.texturedTriangleData[offset++] = xA;
        this.texturedTriangleData[offset++] = xB;
        this.texturedTriangleData[offset++] = xC;
        this.texturedTriangleData[offset++] = yA;
        this.texturedTriangleData[offset++] = yB;
        this.texturedTriangleData[offset++] = yC;
        this.texturedTriangleData[offset++] = shadeA;
        this.texturedTriangleData[offset++] = shadeB;
        this.texturedTriangleData[offset++] = shadeC;
        this.texturedTriangleData[offset++] = originX;
        this.texturedTriangleData[offset++] = originY;
        this.texturedTriangleData[offset++] = originZ;
        this.texturedTriangleData[offset++] = txB;
        this.texturedTriangleData[offset++] = txC;
        this.texturedTriangleData[offset++] = tyB;
        this.texturedTriangleData[offset++] = tyC;
        this.texturedTriangleData[offset++] = tzB;
        this.texturedTriangleData[offset++] = tzC;
        this.texturedTriangleData[offset++] = texture;

        this.texturedTriangleCount++;
        return true;
    }

    override destroy(): void {
        this.device.destroy();
    }
}
