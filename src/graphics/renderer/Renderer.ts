import type TileOverlay from '#/dash3d/type/TileOverlay.ts';
import type TileUnderlay from '#/dash3d/type/TileUnderlay.ts';
import type World3D from '#/dash3d/World3D.ts';
import type Model from '#/graphics/Model.ts';
import PixMap from '#/graphics/PixMap.js';

export abstract class Renderer {
    static renderer: Renderer | undefined;

    constructor(readonly canvas: HTMLCanvasElement) {}

    static resetRenderer(): void {
        if (Renderer.renderer) {
            Renderer.renderer.destroy();
            Renderer.renderer.canvas.remove();
            Renderer.renderer = undefined;
        }
    }

    static resize(width: number, height: number): void {
        Renderer.renderer?.resize(width, height);
    }

    static startFrame(): void {
        Renderer.renderer?.startFrame();
    }

    static endFrame(): void {
        Renderer.renderer?.endFrame();
    }

    static updateTexture(id: number): void {
        Renderer.renderer?.updateTexture(id);
    }

    static setBrightness(brightness: number): void {
        Renderer.renderer?.setBrightness(brightness);
    }

    static renderPixMap(pixmap: PixMap, x: number, y: number): boolean {
        if (Renderer.renderer) {
            return Renderer.renderer.renderPixMap(pixmap, x, y);
        }
        return false;
    }

    static getSceneClearColor(): number {
        if (Renderer.renderer) {
            return -1;
        }
        return 0;
    }

    static startRenderScene(): void {
        Renderer.renderer?.startRenderScene();
    }

    static endRenderScene(): void {
        Renderer.renderer?.endRenderScene();
    }

    static fillTriangle(x0: number, x1: number, x2: number, y0: number, y1: number, y2: number, color: number): boolean {
        if (Renderer.renderer) {
            return Renderer.renderer.fillTriangle(x0, x1, x2, y0, y1, y2, color);
        }
        return false;
    };

    static fillGouraudTriangle(xA: number, xB: number, xC: number, yA: number, yB: number, yC: number, colorA: number, colorB: number, colorC: number): boolean {
        if (Renderer.renderer) {
            return Renderer.renderer.fillGouraudTriangle(xA, xB, xC, yA, yB, yC, colorA, colorB, colorC);
        }
        return false;
    };

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
    ): boolean {
        if (Renderer.renderer) {
            return Renderer.renderer.fillTexturedTriangle(xA, xB, xC, yA, yB, yC, shadeA, shadeB, shadeC, originX, originY, originZ, txB, txC, tyB, tyC, tzB, tzC, texture);
        }
        return false;
    };

    static drawTileUnderlay(world: World3D, underlay: TileUnderlay, level: number, tileX: number, tileZ: number): boolean {
        if (Renderer.renderer) {
            return Renderer.renderer.drawTileUnderlay(world, underlay, level, tileX, tileZ);
        }
        return false;
    }

    static drawTileOverlay(world: World3D, overlay: TileOverlay, tileX: number, tileZ: number): boolean {
        if (Renderer.renderer) {
            return Renderer.renderer.drawTileOverlay(world, overlay, tileX, tileZ);
        }
        return false;
    }

    static startDrawModel(model: Model, yaw: number, relativeX: number, relativeY: number, relativeZ: number, bitset: number): void {
        if (Renderer.renderer) {
            Renderer.renderer.startDrawModel(model, yaw, relativeX, relativeY, relativeZ, bitset);
        }
    }

    static endDrawModel(model: Model, yaw: number, relativeX: number, relativeY: number, relativeZ: number, bitset: number): void {
        if (Renderer.renderer) {
            Renderer.renderer.endDrawModel(model, yaw, relativeX, relativeY, relativeZ, bitset);
        }
    }

    static drawModelTriangle(model: Model, index: number): boolean {
        if (Renderer.renderer) {
            return Renderer.renderer.drawModelTriangle(model, index);
        }
        return false;
    }

    resize(width: number, height: number): void {
        this.canvas.width = width;
        this.canvas.height = height;
    }

    abstract startFrame(): void;

    abstract endFrame(): void;

    abstract updateTexture(id: number): void;

    abstract setBrightness(brightness: number): void;

    abstract renderPixMap(pixMap: PixMap, x: number, y: number): boolean;

    abstract startRenderScene(): void;

    abstract endRenderScene(): void;

    abstract fillTriangle(x0: number, x1: number, x2: number, y0: number, y1: number, y2: number, color: number): boolean;

    abstract fillGouraudTriangle(xA: number, xB: number, xC: number, yA: number, yB: number, yC: number, colorA: number, colorB: number, colorC: number): boolean;

    abstract fillTexturedTriangle(
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
    ): boolean;

    abstract destroy(): void;

    abstract drawTileUnderlay(world: World3D, underlay: TileUnderlay, level: number, tileX: number, tileZ: number): boolean;
    abstract drawTileOverlay(world: World3D, overlay: TileOverlay, tileX: number, tileZ: number): boolean;

    abstract startDrawModel(model: Model, yaw: number, relativeX: number, relativeY: number, relativeZ: number, bitset: number): void;
    abstract endDrawModel(model: Model, yaw: number, relativeX: number, relativeY: number, relativeZ: number, bitset: number): void;
    abstract drawModelTriangle(model: Model, index: number): boolean;
}
