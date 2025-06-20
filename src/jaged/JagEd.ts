import GameShell from '#/client/GameShell.ts';
import AnimBase from '#/graphics/AnimBase.ts';
import AnimFrame from '#/graphics/AnimFrame.ts';
import Model from '#/graphics/Model.ts';
import Pix2D from '#/graphics/Pix2D.ts';
import Pix3D from '#/graphics/Pix3D.ts';
import type Pix8 from '#/graphics/Pix8.ts';
import Jagfile from '#/io/Jagfile.ts';
import FileLoader from '#/jaged/FileLoader.ts';
import { downloadUrl, sleep } from '#/util/JsUtil.ts';
import ColorConversion from '#/jaged/ColorConversion.ts';

const LocShapeSuffixMap = {
    _1: 0,
    _2: 1,
    _3: 2,
    _4: 3,
    _q: 4,
    _w: 5,
    _r: 6,
    _e: 7,
    _t: 8,
    _5: 9,
    _8: 10,
    _9: 11,
    _a: 12,
    _s: 13,
    _d: 14,
    _f: 15,
    _g: 16,
    _h: 17,
    _z: 18,
    _x: 19,
    _c: 20,
    _v: 21,
    _0: 22,
};

const orderedLocShapeSuffixStrings: string[] = [];
const tempSuffixMapForOrdering: { [key: number]: string } = {};
for (const key in LocShapeSuffixMap) {
    tempSuffixMapForOrdering[
        LocShapeSuffixMap[key as keyof typeof LocShapeSuffixMap]
    ] = key;
}
for (let i = 0; i <= 22; i++) {
    if (tempSuffixMapForOrdering[i]) {
        orderedLocShapeSuffixStrings.push(tempSuffixMapForOrdering[i]);
    }
}

function applyFilterToList(
    listElement: HTMLElement,
    searchTerm: string,
    itemSelector: string,
    initialEmptyListHTML: string,
    noResultsText: string
) {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const items = listElement.querySelectorAll(itemSelector);
    let visibleCount = 0;

    items.forEach((item) => {
        const textContent = item.textContent || "";
        if (textContent.toLowerCase().includes(lowerSearchTerm)) {
            (item as HTMLElement).style.display = "";
            visibleCount++;
        } else {
            (item as HTMLElement).style.display = "none";
        }
    });

    let messageElement = listElement.querySelector(
        ".list-message"
    ) as HTMLElement;

    if (!messageElement) {
        messageElement = document.createElement("div");
        messageElement.className = itemSelector.startsWith(".model-item")
            ? "model-item list-message"
            : "label-item list-message";

        const firstDataItem = listElement.querySelector(itemSelector);
        if (firstDataItem) {
            listElement.insertBefore(messageElement, firstDataItem);
        } else {
            listElement.appendChild(messageElement);
        }
    }

    messageElement.style.display = "block";

    if (items.length === 0) {
        messageElement.innerHTML = initialEmptyListHTML;
    } else if (visibleCount === 0 && searchTerm) {
        messageElement.innerHTML = `<span>${noResultsText} for "${searchTerm}"</span>`;
    } else if (visibleCount === 0 && !searchTerm && items.length > 0) {
        messageElement.innerHTML = initialEmptyListHTML;
    } else {
        messageElement.style.display = "none";
    }
}

export class JagEd extends GameShell {
    container: HTMLElement | null;
    loader: FileLoader;
    currentAnimation: {
        modelRef: any;
        seqId: string | null;
        seqData: any;
        frameIndex: number;
        timerId: NodeJS.Timeout | null;
    };
    activeTransformEditor: {
        element: HTMLElement | null;
        animFrame: any;
        transformIndex: number;
        parentElement: HTMLElement | null;
    };
    activeNewTransformForm: {
        baseGroupSelect: HTMLSelectElement | null;
        xInput: HTMLInputElement | null;
        yInput: HTMLInputElement | null;
        zInput: HTMLInputElement | null;
        affectedInfoDiv: HTMLElement | null;
    };
    currentSelectedAnimFrameInstance: any;
    loopSequenceCheckbox: HTMLInputElement | null;
    modelSearchInput: HTMLInputElement;
    seqSearchInput: HTMLInputElement;
    exportModelButton: HTMLButtonElement | null;
    changeFaceLabels: HTMLInputElement | null;
    changeVertexLabels: HTMLInputElement | null;

    sceneDelta: number = 0;
    textureBuffer: Int8Array = new Int8Array(16384);

    builtModel: Model | null = null;
    selectedModel: string | null = null;

    moveSpeed: number = 5;
    rotationSpeed: number = 2;
    yaw: number = 0;
    pitch: number = 0;
    eyeX: number = 0;
    eyeY: number = 0;
    eyeZ: number = -420;
    isDragging: boolean = false;
    lastMouseX: number = 0;
    lastMouseY: number = 0;

    private isVertexEditMode: boolean = false;
    private isDraggingVertex: boolean = false;
    private selectedVertex: number = -1;
    private vertexDragStartViewZ: number = 0;
    private vertexDragStartModelPos: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
    private vertexDragStartScreenPos: { x: number; y: number } = { x: 0, y: 0 };

    private highlightedFaces: Set<number> = new Set();
    private highlightedVertices: Set<number> = new Set();

    private showVertexNumbers: boolean = false;

    constructor() {
        super(true);

        this.container = document.getElementById("container");
        this.loader = new FileLoader();
        this.currentAnimation = {
            modelRef: null,
            seqId: null,
            seqData: null,
            frameIndex: 0,
            timerId: null,
        };
        this.activeTransformEditor = {
            element: null,
            animFrame: null,
            transformIndex: -1,
            parentElement: null,
        };
        this.activeNewTransformForm = {
            baseGroupSelect: null,
            xInput: null,
            yInput: null,
            zInput: null,
            affectedInfoDiv: null,
        };
        this.currentSelectedAnimFrameInstance = null;
        this.loopSequenceCheckbox = null;
        this.changeFaceLabels = null;
        this.changeVertexLabels = null;
        this.modelSearchInput = document.getElementById(
            "model-search"
        ) as HTMLInputElement;
        this.seqSearchInput = document.getElementById(
            "seq-search"
        ) as HTMLInputElement;
        this.exportModelButton = null;
        this.setupUI();
        this.setupFaceLabelUI();
        this.setupVertexLabelUI();
        this.initializeFaceLabelPanel();
        this.initializeVertexLabelPanel();
        this.initializeSeqListPanel();
        this.initializeAnimFrameListPanel();
        this.initializeAnimFrameDetailsPanel();
        this.setupSeqAndAnimFrameEventHandlers();
        this.modelSearchInput.addEventListener("input", () =>
            this.filterModelList()
        );
        this.seqSearchInput.addEventListener("input", () => this.filterSeqList());
        this.setupMouseHandlers();

        Pix3D.lowMemory = false;

        this.run();
    }

    private toggleVertexEditMode(): void {
        const editToggle = document.getElementById("edit-toggle") as HTMLButtonElement;
        if (!editToggle) return;
        
        this.isVertexEditMode = !this.isVertexEditMode;
        
        if (this.isVertexEditMode) {
            editToggle.textContent = "Disable Vertex Editing";
            editToggle.classList.add("active");
            this.enableVertexEditMode();
        } else {
            editToggle.textContent = "Enable Vertex Editing";
            editToggle.classList.remove("active");
            this.disableVertexEditMode();
        }
        
        this.updateVertexLabelUIState();
    }

    private enableVertexEditMode(): void {
        const canvasElement = document.getElementById('canvas') as HTMLCanvasElement;
        if (canvasElement) {
            canvasElement.classList.add('vertex-edit');
        }
    }

    private disableVertexEditMode(): void {
        this.isDraggingVertex = false;
        this.selectedVertex = -1;
        const canvasElement = document.getElementById('canvas') as HTMLCanvasElement;
        if (canvasElement) {
            canvasElement.classList.remove('vertex-edit');
        }
        this.clearVertexHighlights();
        document.querySelectorAll("#vertex-label-list .label-item").forEach((el) => el.classList.remove("selected", "highlighted-vertex"));
        document.querySelectorAll("#vertex-label-panel .label-control-btn").forEach((el) => el.classList.remove("active"));
    }

    private pickVertex(mouseX: number, mouseY: number): number {
        if (!this.builtModel || !Model.vertexScreenX || !Model.vertexScreenY) {
            return -1;
        }
        
        const pickRadius = 8;
        let closestVertex = -1;
        let closestDistance = pickRadius * pickRadius;
        
        for (let v = 0; v < this.builtModel.vertexCount; v++) {
            const screenX = Model.vertexScreenX[v];
            const screenY = Model.vertexScreenY[v];
            
            if (screenX === -5000) continue;
            
            const dx = mouseX - screenX;
            const dy = mouseY - screenY;
            const distanceSqr = dx * dx + dy * dy;
            
            if (distanceSqr < closestDistance) {
                closestDistance = distanceSqr;
                closestVertex = v;
            }
        }
        
        return closestVertex;
    }

    dragVertex(mouseX: number, mouseY: number) {
        if (this.selectedVertex < 0 || !this.builtModel) {
            return;
        }

        if (this.vertexDragStartViewZ < 50) {
            return;
        }

        const startScreenX = this.vertexDragStartScreenPos.x;
        const startScreenY = this.vertexDragStartScreenPos.y;
        
        const screenDeltaX = mouseX - startScreenX;
        const screenDeltaY = mouseY - startScreenY;
        const deltaViewX = (screenDeltaX * this.vertexDragStartViewZ) / 512.0;
        const deltaViewY = (screenDeltaY * this.vertexDragStartViewZ) / 512.0;

        const deltaModel = this.viewVectorToModelVector(deltaViewX, deltaViewY, 0);

        const newModelX = Math.round(this.vertexDragStartModelPos.x + deltaModel.x);
        const newModelY = Math.round(this.vertexDragStartModelPos.y + deltaModel.y);
        const newModelZ = Math.round(this.vertexDragStartModelPos.z + deltaModel.z);

        if (newModelX !== this.builtModel.vertexX[this.selectedVertex] ||
            newModelY !== this.builtModel.vertexY[this.selectedVertex] ||
            newModelZ !== this.builtModel.vertexZ[this.selectedVertex]) {
            this.builtModel.vertexX[this.selectedVertex] = newModelX;
            this.builtModel.vertexY[this.selectedVertex] = newModelY;
            this.builtModel.vertexZ[this.selectedVertex] = newModelZ;
            this.sceneDelta++;
        }
    }

    viewVectorToModelVector(vecX: number, vecY: number, vecZ: number): {x: number, y: number, z: number} {
        const f_sinEyePitch = Pix3D.sin[this.pitch] / 65536;
        const f_cosEyePitch = Pix3D.cos[this.pitch] / 65536;
        const f_sinEyeYaw = Pix3D.sin[this.yaw] / 65536;
        const f_cosEyeYaw = Pix3D.cos[this.yaw] / 65536;

        const intermediateY = vecY * f_cosEyePitch + vecZ * f_sinEyePitch;
        const intermediateZ = vecZ * f_cosEyePitch - vecY * f_sinEyePitch;

        const modelX = vecX * f_cosEyeYaw - intermediateZ * f_sinEyeYaw;
        const modelY = intermediateY;
        const modelZ = vecX * f_sinEyeYaw + intermediateZ * f_cosEyeYaw;

        return { x: modelX, y: modelY, z: modelZ };
    }

    private drawVertexHighlights(): void {
        if (!this.builtModel || !Model.vertexScreenX || !Model.vertexScreenY) {
            return;
        }
        
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (this.isVertexEditMode) {
            if (this.highlightedVertices.size > 0) {
                ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
                this.highlightedVertices.forEach(vertexIndex => {
                    if (vertexIndex < this.builtModel!.vertexCount) {
                        const screenX = Model.vertexScreenX![vertexIndex];
                        const screenY = Model.vertexScreenY![vertexIndex];
                        
                        if (screenX > -5000 && screenY > -5000) {
                            ctx.beginPath();
                            ctx.arc(screenX, screenY, 3, 0, 2 * Math.PI);
                            ctx.fill();
                        }
                    }
                });
            } else {
                ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
                for (let v = 0; v < this.builtModel.vertexCount; v++) {
                    const screenX = Model.vertexScreenX[v];
                    const screenY = Model.vertexScreenY[v];
                    
                    if (screenX > -5000 && screenY > -5000) {
                        ctx.beginPath();
                        ctx.arc(screenX, screenY, 3, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }
            }
        }
        if (this.highlightedVertices.size > 0) {
            ctx.fillStyle = 'rgba(0, 204, 102, 0.9)';
            this.highlightedVertices.forEach(vertexIndex => {
                if (this.builtModel && Model.vertexScreenX && Model.vertexScreenY && vertexIndex < this.builtModel.vertexCount) {
                    const screenX = Model.vertexScreenX[vertexIndex];
                    const screenY = Model.vertexScreenY[vertexIndex];
                    
                    if (screenX > -5000 && screenY > -5000) {
                        ctx.beginPath();
                        ctx.arc(screenX, screenY, 5, 0, 2 * Math.PI);
                        ctx.fill();
                    }
                }
            });
        }
        if (this.showVertexNumbers) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = '11px Arial';
            ctx.textAlign = 'center';
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.lineWidth = 2;
            
            for (let v = 0; v < this.builtModel.vertexCount; v++) {
                const screenX = Model.vertexScreenX[v];
                const screenY = Model.vertexScreenY[v];
                
                if (screenX > -5000 && screenY > -5000) {
                    const text = v.toString();
                    const textY = screenY - 10;
                    ctx.strokeText(text, screenX, textY);
                    ctx.fillText(text, screenX, textY);
                }
            }
        }
    }

    private setupMouseHandlers(): void {
        const canvasElement = document.getElementById('canvas') as HTMLCanvasElement;
        if (canvasElement) {
            canvasElement.addEventListener('mousedown', (e: MouseEvent) => this.handleMouseDown(e));
            canvasElement.addEventListener('mouseup', (e: MouseEvent) => this.handleMouseUp(e));
            canvasElement.addEventListener('mousemove', (e: MouseEvent) => this.handleMouseMove(e));
        }
    }

    async load(): Promise<void> {
        const textures: Jagfile = await this.loadArchive('textures', 'textures', 30);

        await this.showProgress(80, 'Unpacking textures');
        Pix3D.unpackTextures(textures);
        Pix3D.setBrightness(0.8);
        Pix3D.initPool(20);

        this.drawArea?.bind();
    }

    async draw(): Promise<void> {
        Model.checkHoverFace = true;
        Model.pickedCount = 0;
        Model.mouseX = this.mouseX;
        Model.mouseY = this.mouseY;

        Pix2D.clear(0x3F3F3F);
        this.updateTextures(Pix3D.cycle);

        if (this.builtModel) {
            const sinEyePitch = Pix3D.sin[this.pitch];
            const cosEyePitch = Pix3D.cos[this.pitch];
            const sinEyeYaw = Pix3D.sin[this.yaw];
            const cosEyeYaw = Pix3D.cos[this.yaw];

            const relativeX = -this.eyeX;
            const relativeY = -this.eyeY;
            const relativeZ = -this.eyeZ;
            
            this.builtModel.draw(0, sinEyePitch, cosEyePitch, sinEyeYaw, cosEyeYaw, relativeX, relativeY, relativeZ, 0);
        }

        this.drawArea?.draw(0, 0);
        
        if (this.isVertexEditMode || this.showVertexNumbers || this.highlightedVertices.size > 0) {
            this.drawVertexHighlights();
        }
    }

    async refresh(): Promise<void> {
    }

    async update(): Promise<void> {
        this.sceneDelta++;
        this.handleMovement();
    }

    handleMouseDown(e: MouseEvent): void {
        const canvasElement = e.target as HTMLCanvasElement;
        const rect = canvasElement.getBoundingClientRect();
        const scaleX = canvasElement.width / rect.width;
        const scaleY = canvasElement.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX | 0;
        const mouseY = (e.clientY - rect.top) * scaleY | 0;
        
        if (this.isVertexEditMode && e.button === 0) {
            const pickedVertex = this.pickVertex(mouseX, mouseY);
            if (pickedVertex >= 0) {
                this.selectedVertex = pickedVertex;
                this.isDraggingVertex = true;
                
                if (Model.vertexViewSpaceZ) {
                    this.vertexDragStartViewZ = Model.vertexViewSpaceZ[pickedVertex];
                }
                
                if (this.builtModel) {
                    this.vertexDragStartModelPos.x = this.builtModel.vertexX[pickedVertex];
                    this.vertexDragStartModelPos.y = this.builtModel.vertexY[pickedVertex];
                    this.vertexDragStartModelPos.z = this.builtModel.vertexZ[pickedVertex];
                }
                
                if (Model.vertexScreenX && Model.vertexScreenY) {
                    this.vertexDragStartScreenPos.x = Model.vertexScreenX[pickedVertex];
                    this.vertexDragStartScreenPos.y = Model.vertexScreenY[pickedVertex];
                }
                
                e.preventDefault();
                return;
            }
        } else if (e.button === 0) {
            if (this.builtModel && this.builtModel.pickedFace >= 0) {
                this.displayFaceInfo(this.builtModel, this.builtModel.pickedFace);
            } else {
                this.hideFaceInfo();
            }
        } else if (e.button === 2) {
            this.isDragging = true;
            this.lastMouseX = mouseX;
            this.lastMouseY = mouseY;
            const canvasElement2 = document.getElementById("canvas");
            if (canvasElement2) {
                canvasElement2.style.cursor = "grabbing";
            }
        }
    }

    private handleMouseUp(e: MouseEvent): void {
        if (this.isVertexEditMode && e.button === 0 && this.isDraggingVertex && !this.isSequenceRunning()) {
            this.isDraggingVertex = false;
            this.selectedVertex = -1;
            e.preventDefault();
            if (this.builtModel) {
                this.builtModel.saveCurrentVerticesAsOriginal();
            }
            return;
        }
        if (e.button === 2) {
            this.isDragging = false;
            const canvasElement = document.getElementById('canvas') as HTMLCanvasElement;
            if (canvasElement) {
                canvasElement.style.cursor = 'default';
            }
        }
    }
    private handleMouseMove(e: MouseEvent): void {
        const canvasElement = e.target as HTMLCanvasElement;
        const rect = canvasElement.getBoundingClientRect();
        const scaleX = canvasElement.width / rect.width;
        const scaleY = canvasElement.height / rect.height;
        const mouseX = (e.clientX - rect.left) * scaleX | 0;
        const mouseY = (e.clientY - rect.top) * scaleY | 0;
        
        if (this.isVertexEditMode && this.isDraggingVertex) {
            this.dragVertex(mouseX, mouseY);
            e.preventDefault();
            return;
        }

        if (this.isDragging) {
            const deltaX: number = mouseX - this.lastMouseX;
            const deltaY: number = mouseY - this.lastMouseY;
            this.yaw += deltaX * this.rotationSpeed;
            this.pitch += deltaY * this.rotationSpeed;
            this.yaw = (this.yaw % 2048 + 2048) % 2048;
            this.pitch = (this.pitch % 2048 + 2048) % 2048;
            this.lastMouseX = mouseX;
            this.lastMouseY = mouseY;
        }
    }

    displayFaceInfo(model: any, faceIndex: number): void {
        const faceInfoPanel = document.getElementById('face-info') as HTMLElement | null;
        const faceDetails = document.getElementById('face-details') as HTMLElement | null;
        
        if (!faceInfoPanel || !faceDetails || !model) {
            return;
        }
        
        let html: string = '';
        
        html += `<div class="face-detail"><strong>Face Index:</strong> ${faceIndex}</div>`;
        
        if (model.faceVertexA && model.faceVertexB && model.faceVertexC) {
            const vertexA: number = model.faceVertexA[faceIndex];
            const vertexB: number = model.faceVertexB[faceIndex];
            const vertexC: number = model.faceVertexC[faceIndex];
            html += `<div class="face-detail"><strong>Vertices:</strong> ${vertexA}, ${vertexB}, ${vertexC}</div>`;
        }
        
        let colorOrTextureInfo: string = "";
        const textureId: number | undefined = model.faceTextures?.[faceIndex];
        if (textureId !== undefined && textureId !== -1) {
            const textureDisplayID: string = `ID: ${textureId}`;
            colorOrTextureInfo = `<div class="face-detail"><strong>Texture:</strong> ${textureDisplayID}</div>`;
        } else {
            let colorValue: number | undefined = undefined;
            let colorHex: string = "#ffffff";
            if (model.originalFaceColor && model.originalFaceColor[faceIndex] !== undefined) {
                colorValue = model.originalFaceColor[faceIndex];
            }
            if (colorValue !== undefined && Pix3D.hslPal && Pix3D.hslPal[colorValue] !== undefined) {
                const paletteColor: number = Pix3D.hslPal[colorValue];
                const colorRgb = {
                    r: (paletteColor >> 16) & 0xff,
                    g: (paletteColor >> 8) & 0xff,
                    b: paletteColor & 0xff,
                };
                colorHex = `#${colorRgb.r.toString(16).padStart(2, "0")}${colorRgb.g.toString(16).padStart(2, "0")}${colorRgb.b.toString(16).padStart(2, "0")}`;
                const faceColorForHsl: number | undefined = model.originalFaceColor?.[faceIndex];
                if (faceColorForHsl !== undefined) {
                    colorOrTextureInfo = `
                        <div class="face-detail">
                            <strong>Source Color For Recol:</strong> ${ColorConversion.reverseHsl(faceColorForHsl)[0]}
                            <span class="color-swatch" style="background-color: ${colorHex}"></span>
                        </div>`;
                } else {
                    colorOrTextureInfo = `<div class="face-detail"><strong>Source Color For Recol:</strong> N/A (Invalid index for HSL)</div>`;
                }
            } else {
                colorOrTextureInfo = `<div class="face-detail"><strong>Source Color For Recol:</strong> N/A</div>`;
            }
        }
        
        html += colorOrTextureInfo;
        
        if (model.facePriority && model.facePriority[faceIndex] !== undefined) {
            html += `<div class="face-detail"><strong>Priority:</strong> ${model.facePriority[faceIndex]}</div>`;
        }
        
        if (model.faceAlpha && model.faceAlpha[faceIndex] !== undefined) {
            html += `<div class="face-detail"><strong>Alpha:</strong> ${model.faceAlpha[faceIndex]}</div>`;
        }
        
        if (model.faceLabel && model.faceLabel[faceIndex] !== undefined) {
            html += `<div class="face-detail"><strong>Label:</strong> ${model.faceLabel[faceIndex]}</div>`;
        }
        
        faceDetails.innerHTML = html;
        faceInfoPanel.style.display = 'block';
    }

    hideFaceInfo(): void {
        const faceInfoPanel = document.getElementById('face-info') as HTMLElement | null;
        if (faceInfoPanel) {
            faceInfoPanel.style.display = 'none';
        }
    }

    handleMovement(): void {
        if (this.actionKey[87] || this.actionKey[119]) {
            this.eyeY -= this.moveSpeed;
        }
        
        if (this.actionKey[83] || this.actionKey[115]) {
            this.eyeY += this.moveSpeed;
        }
        
        if (this.actionKey[65] || this.actionKey[97]) {
            this.eyeX -= this.moveSpeed;
        }
        
        if (this.actionKey[68] || this.actionKey[100]) {
            this.eyeX += this.moveSpeed;
        }
        
        if (this.actionKey[81] || this.actionKey[113]) {
            this.eyeZ -= this.moveSpeed;
        }
        
        if (this.actionKey[69] || this.actionKey[101]) {
            this.eyeZ += this.moveSpeed;
        }
    }

    async showProgress(progress: number, message: string): Promise<void> {
        console.log(`${progress}%: ${message}`);
        await super.showProgress(progress, message);
    }

    // ----

    private async loadArchive(filename: string, displayName: string, progress: number): Promise<Jagfile> {
        let retry: number = 5;
        let data: Uint8Array | null = null;

        while (!data) {
            await this.showProgress(progress, `Requesting ${displayName}`);

            try {
                data = await downloadUrl(`/${filename}`);
            } catch (e) {
                data = null;

                for (let i: number = retry; i > 0; i--) {
                    await this.showProgress(progress, `Error loading - Will retry in ${i} secs.`);
                    await sleep(1000);
                }

                retry *= 2;
                if (retry > 60) {
                    retry = 60;
                }
            }
        }

        return new Jagfile(data);
    }

    updateTextures(cycle: number) {
        if (Pix3D.textureCycle[17] >= cycle) {
            const texture: Pix8 | null = Pix3D.textures[17];
            if (!texture) {
                return;
            }

            const bottom: number = texture.width2d * texture.height2d - 1;
            const adjustment: number = texture.width2d * this.sceneDelta * 2;

            const src: Int8Array = texture.pixels;
            const dst: Int8Array = this.textureBuffer;
            for (let i: number = 0; i <= bottom; i++) {
                dst[i] = src[(i - adjustment) & bottom];
            }

            texture.pixels = dst;
            this.textureBuffer = src;
            Pix3D.pushTexture(17);
        }

        if (Pix3D.textureCycle[24] >= cycle) {
            const texture: Pix8 | null = Pix3D.textures[24];
            if (!texture) {
                return;
            }

            const bottom: number = texture.width2d * texture.height2d - 1;
            const adjustment: number = texture.width2d * this.sceneDelta * 2;

            const src: Int8Array = texture.pixels;
            const dst: Int8Array = this.textureBuffer;
            for (let i: number = 0; i <= bottom; i++) {
                dst[i] = src[(i - adjustment) & bottom];
            }

            texture.pixels = dst;
            this.textureBuffer = src;
            Pix3D.pushTexture(24);
        }
    }

    filterModelList() {
        const modelList = document.getElementById("model-list")!;
        const searchTerm = this.modelSearchInput.value;
        const viewModeSelect = document.getElementById(
            "view-mode-select"
        ) as HTMLSelectElement;
        const selectedMode = viewModeSelect.value;

        let noItemsMsgHTML = `<span>No .ob2 models loaded</span>`;
        if (selectedMode === "npcs") {
            noItemsMsgHTML = `<span>No NPCs loaded</span>`;
        } else if (selectedMode === "objects") {
            noItemsMsgHTML = `<span>No Objects (.obj) loaded</span>`;
        } else if (selectedMode === "locations") {
            noItemsMsgHTML = `<span>No Locations (.loc) loaded</span>`;
        }

        applyFilterToList(
            modelList,
            searchTerm,
            ".model-item:not(.list-message)",
            noItemsMsgHTML,
            selectedMode === "models"
                ? "No models found"
                : selectedMode === "npcs"
                    ? "No NPCs found"
                    : selectedMode === "objects"
                        ? "No Objects found"
                        : selectedMode === "locations"
                            ? "No Locations found"
                            : "No items found"
        );
    }

    filterSeqList() {
        const list = document.getElementById("seq-list")!;
        const searchTerm = this.seqSearchInput.value;
        applyFilterToList(
            list,
            searchTerm,
            ".label-item:not(.list-message)",
            `<span>No SEQs available</span>`,
            "No sequences found"
        );
    }

    initializeAnimFrameDetailsPanel() {
        const panel = document.getElementById("animframe-details-panel")!;
        const clearDetailsBtn = document.getElementById(
            "clear-details"
        ) as HTMLButtonElement;
        const detailsContent = document.getElementById(
            "animframe-details-content"
        )!;
        const addTransformBtn = document.getElementById(
            "add-new-transform-btn"
        ) as HTMLButtonElement;
        const deleteTransformBtn = document.getElementById(
            "delete-transform-btn"
        ) as HTMLButtonElement;

        panel.style.display = "block";

        detailsContent.innerHTML =
            '<div class="label-item no-labels"><span style="color: #888; font-style: italic;">Select an animation frame to view details.</span></div>';
        clearDetailsBtn.disabled = true;
        addTransformBtn.disabled = true;
        deleteTransformBtn.disabled = true;

        clearDetailsBtn.addEventListener("click", () => {
            if (clearDetailsBtn.disabled) return;
            this.hideNewTransformForm();
            this.clearTransformEditor();
            this.currentSelectedAnimFrameInstance = null;
            this.updateExportFrameButtonState();
            clearDetailsBtn.disabled = true;
            const addTransformBtn = document.getElementById(
                "add-new-transform-btn"
            ) as HTMLButtonElement;
            if (addTransformBtn) addTransformBtn.disabled = true;

            const detailsContent = document.getElementById(
                "animframe-details-content"
            )!;
            detailsContent.querySelectorAll(".transform-group").forEach((el) => {
                (el as HTMLElement).style.backgroundColor = "#2a2a2a";
            });
        });

        addTransformBtn.addEventListener("click", () => {
            if (addTransformBtn.disabled) return;
            this.showNewTransformForm();
        });

        deleteTransformBtn.addEventListener("click", () => {
            if (deleteTransformBtn.disabled) return;
            this.handleDeleteSelectedTransform();
        });
    }

    clearTransformEditor() {
        if (this.activeTransformEditor.element && this.activeTransformEditor.element.parentNode) {
            this.activeTransformEditor.element.parentNode.removeChild(this.activeTransformEditor.element);
        }
        
        if (this.activeTransformEditor.parentElement) {
            this.activeTransformEditor.parentElement.style.backgroundColor = "#2a2a2a";
        }
        
        this.activeTransformEditor.element = null;
        this.activeTransformEditor.animFrame = null;
        this.activeTransformEditor.transformIndex = -1;
        this.activeTransformEditor.parentElement = null;

        const deleteTransformBtn = document.getElementById("delete-transform-btn") as HTMLButtonElement;
        if (deleteTransformBtn) deleteTransformBtn.disabled = true;

        this.clearTransformHighlights();
    }

    showTransformEditor(animFrame: any, transformIndex: number, parentElement: HTMLElement) {
        this.clearTransformEditor();
        
        document.querySelectorAll('.transform-editor').forEach(editor => {
            if (editor.parentNode) {
                editor.parentNode.removeChild(editor);
            }
        });
        
        const deleteTransformBtn = document.getElementById("delete-transform-btn") as HTMLButtonElement;
        const editorDiv = document.createElement("div");
        editorDiv.className = "transform-editor";

        const animBase = animFrame.base;
        let transformTypeName = `Unknown: ${transformIndex}`;
        let transformType = -1;

        if (
            animBase &&
            animBase.animTypes &&
            animFrame.bases &&
            transformIndex < animFrame.bases.length &&
            animFrame.bases[transformIndex] < animBase.animTypes.length
        ) {
            const baseIndexForThisTransform = animFrame.bases[transformIndex];
            transformType = animBase.animTypes[baseIndexForThisTransform];
            transformTypeName = this.getTransformTypeName(transformType);
        }

        editorDiv.innerHTML = `<h4>Edit Transform ${transformIndex + 1} (${transformTypeName})</h4>`;

        const currentValues = {
            x: animFrame.x && transformIndex < animFrame.x.length ? animFrame.x[transformIndex] : 0,
            y: animFrame.y && transformIndex < animFrame.y.length ? animFrame.y[transformIndex] : 0,
            z: animFrame.z && transformIndex < animFrame.z.length ? animFrame.z[transformIndex] : 0,
        };

        const useSliders = transformType === 2 || transformType === 5;
        const maxValue = useSliders ? 255 : undefined;

        ["x", "y", "z"].forEach((axis) => {
            const axisDiv = document.createElement("div");
            const label = document.createElement("label");
            label.textContent = `${axis.toUpperCase()}:`;
            
            if (useSliders) {
                axisDiv.style.display = "flex";
                axisDiv.style.alignItems = "center";
                axisDiv.style.marginBottom = "6px";
                
                const sliderElement = document.createElement("input");
                sliderElement.type = "range";
                sliderElement.className = "transform-slider";
                sliderElement.min = "0";
                sliderElement.max = maxValue!.toString();
                sliderElement.value = Math.max(0, Math.min(maxValue!, currentValues[axis as keyof typeof currentValues])).toString();
                
                const valueDisplay = document.createElement("span");
                valueDisplay.className = "slider-value-display";
                valueDisplay.textContent = sliderElement.value;

                const updateValue = () => {
                    const newValue = parseInt(sliderElement.value, 10);
                    valueDisplay.textContent = newValue.toString();
                    
                    if (!isNaN(newValue)) {
                        if (animFrame[axis] && transformIndex < animFrame[axis].length) {
                            animFrame[axis][transformIndex] = newValue;
                            animFrame.isModified = true;
                        } else {
                            console.warn(`Attempted to update transform out of bounds: axis ${axis}, index ${transformIndex}`);
                        }
                        this.refreshActiveAnimFrameDisplay();
                    }
                };
                
                sliderElement.addEventListener("input", updateValue);
                sliderElement.addEventListener("change", updateValue);
                
                axisDiv.appendChild(label);
                axisDiv.appendChild(sliderElement);
                axisDiv.appendChild(valueDisplay);
            } else {
                const inputElement = document.createElement("input");
                inputElement.type = "number";
                inputElement.value = currentValues[axis as keyof typeof currentValues].toString();
                
                inputElement.addEventListener("input", () => {
                    const newValue = parseInt(inputElement.value, 10);
                    if (!isNaN(newValue)) {
                        if (animFrame[axis] && transformIndex < animFrame[axis].length) {
                            animFrame[axis][transformIndex] = newValue;
                            animFrame.isModified = true;
                        } else {
                            console.warn(`Attempted to update transform out of bounds: axis ${axis}, index ${transformIndex}`);
                        }
                        this.refreshActiveAnimFrameDisplay();
                    }
                });

                axisDiv.appendChild(label);
                axisDiv.appendChild(inputElement);
            }
            editorDiv.appendChild(axisDiv);
        });

        this.activeTransformEditor = {
            element: editorDiv,
            animFrame: animFrame,
            transformIndex: transformIndex,
            parentElement: parentElement,
        };

        parentElement.parentNode!.insertBefore(editorDiv, parentElement.nextSibling);

        deleteTransformBtn.disabled = false;
    }

    refreshActiveAnimFrameDisplay() {
        if (
            this.currentSelectedAnimFrameInstance &&
            this.currentSelectedAnimFrameInstance.id !== undefined
        ) {
            this.displaySingleAnimFrame(this.currentSelectedAnimFrameInstance.id);
        }
    }

    initializeSeqListPanel() {
        const seqListPanel = document.getElementById("seq-list-panel")!;
        this.loopSequenceCheckbox = document.getElementById(
            "loop-sequence-checkbox"
        ) as HTMLInputElement;

        seqListPanel.style.display = "block";
        this.filterSeqList();

        (document.getElementById("start-seq") as HTMLButtonElement).disabled = true;
        (document.getElementById("clear-seq") as HTMLButtonElement).disabled = true;
        this.loopSequenceCheckbox.disabled = true;
    }

    getTransformTypeName(type: number) {
        switch (type) {
            case 0:
                return "Set Pivot";
            case 1:
                return "Translate";
            case 2:
                return "Rotate";
            case 3:
                return "Scale";
            case 5:
                return "Alpha (Faces)";
            default:
                return `Unknown (${type})`;
        }
    }

    initializeAnimFrameListPanel() {
        const animFrameListPanel = document.getElementById("animframe-list-panel")!;
        const animFrameList = document.getElementById("animframe-list")!;
        const clearFramesBtn = document.getElementById(
            "clear-frames"
        ) as HTMLButtonElement;
        const exportFramesBtn = document.getElementById(
            "export-frame-btn"
        ) as HTMLButtonElement;

        animFrameListPanel.style.display = "block";
        animFrameList.innerHTML =
            '<div class="label-item no-labels"><span style="color: #888; font-style: italic;">Select a SEQ to view frames</span></div>';

        exportFramesBtn.disabled = true;
        clearFramesBtn.disabled = true;

        clearFramesBtn.addEventListener("click", () => {
            if (clearFramesBtn.disabled) return;

            if (this.builtModel) {
                this.builtModel.resetToOriginal();
            }

            this.currentSelectedAnimFrameInstance = null;
            this.updateAnimFrameDetailsUI(null);
            document
                .querySelectorAll("#animframe-list .label-item.selected")
                .forEach((el) => el.classList.remove("selected"));
        });

        exportFramesBtn.addEventListener("click", () => {
            if (exportFramesBtn.disabled) return;
            this.handleExportAnimFrame();
        });
    }

    setupSeqAndAnimFrameEventHandlers() {
        const startSeqBtn = document.getElementById(
            "start-seq"
        ) as HTMLButtonElement;
        const clearSeqBtn = document.getElementById(
            "clear-seq"
        ) as HTMLButtonElement;

        startSeqBtn.addEventListener("click", () => this.handleStartSequence());
        clearSeqBtn.addEventListener("click", () => this.handleClearSequence());
    }

    setupUI() {
        const fileInput = document.getElementById("file-input") as HTMLInputElement;
        const status = document.getElementById("status")!;
        const vertexToggle = document.getElementById(
            "vertex-toggle"
        ) as HTMLButtonElement;
        const wireframeToggle = document.getElementById(
            "wireframe-toggle"
        ) as HTMLButtonElement;
        const editToggle = document.getElementById(
            "edit-toggle"
        ) as HTMLButtonElement;
        const viewModeSelect = document.getElementById(
            "view-mode-select"
        ) as HTMLSelectElement;
        this.exportModelButton = document.getElementById(
            "export-model-button"
        ) as HTMLButtonElement;

        fileInput.addEventListener("change", async (e) => {
            const target = e.target as HTMLInputElement;
            if (!target.files || target.files.length === 0) return;

            await this.showProgress(50, "Loading files...");

            try {
                await this.loader.loadContentFiles(target.files);
                this.updateModelListUI();
                this.updateSeqListUI();
                status.textContent = `Found ${this.loader.getAvailableModels().length} .ob2 files`;
            } catch (error: any) {
                console.error("Error processing files:", error);
                status.textContent = `Error: ${error.message}`;
            }
        });

        vertexToggle.addEventListener("click", () => {
            this.showVertexNumbers = !this.showVertexNumbers;
            vertexToggle.textContent = this.showVertexNumbers
                ? "Hide Vertex Numbers"
                : "Show Vertex Numbers";
            vertexToggle.classList.toggle("active", this.showVertexNumbers);
            
            this.sceneDelta++;
        });

        wireframeToggle.addEventListener("click", () => {
        const isActive = wireframeToggle.classList.contains("active");
        const newState = !isActive;
        
        wireframeToggle.textContent = newState ? "Hide Wireframe" : "Show Wireframe";
        wireframeToggle.classList.toggle("active", newState);
        
        if (this.builtModel) {
            this.builtModel.wireFrame = newState;
        }
        });

        editToggle.addEventListener("click", () => {
            this.toggleVertexEditMode();
        });

        viewModeSelect.addEventListener("change", () => {
            this.updateModelListUI();
            this.updateExportButtonState();
            this.updateLabelsEditBoxes();
        });

        this.exportModelButton.addEventListener("click", () =>
            this.handleExportModel()
        );
        this.updateExportButtonState();
    }

    updateLabelsEditBoxes() {
        const viewModeSelect = document.getElementById("view-mode-select") as HTMLSelectElement;
        const selectedMode = viewModeSelect.value;

        const isNpcMode = selectedMode === "npcs";

        if (this.changeVertexLabels) {
        this.changeVertexLabels.disabled = isNpcMode;
        this.changeVertexLabels.checked = isNpcMode ? false : this.changeVertexLabels.checked;
        }

        if (this.changeFaceLabels) {
        this.changeFaceLabels.disabled = isNpcMode;
        this.changeFaceLabels.checked = isNpcMode ? false : this.changeFaceLabels.checked;
        }
    }

    updateExportButtonState() {
        if (this.exportModelButton) {
            this.exportModelButton.disabled = !this.builtModel;
        }
    }

    initializeFaceLabelPanel() {
        const labelPanel = document.getElementById("label-panel")!;
        const labelList = document.getElementById("label-list")!;
        labelPanel.style.display = "block";
        labelList.innerHTML =
            '<div class="label-item no-labels"><span style="color: #888; font-style: italic;">No model loaded</span></div>';
        (document.getElementById("clear-labels") as HTMLButtonElement).disabled =
            true;
        this.changeFaceLabels = document.getElementById("change-face-labels") as HTMLInputElement;
        this.changeFaceLabels?.addEventListener("change", () => {
            const selectedModel = this.selectedModel;
            if (selectedModel) {
                this.updateFaceLabelUI(selectedModel);
            }
            this.updateLabelsEditBoxes();
        })
    }

    initializeVertexLabelPanel() {
        const panel = document.getElementById("vertex-label-panel")!;
        const list = document.getElementById("vertex-label-list")!;
        panel.style.display = "block";
        list.innerHTML =
            '<div class="label-item no-labels"><span style="color: #888; font-style: italic;">No model loaded</span></div>';
        (
            document.getElementById("clear-vertex-labels") as HTMLButtonElement
        ).disabled = true;
        this.changeVertexLabels = document.getElementById("change-vertex-labels") as HTMLInputElement;
        this.changeVertexLabels?.addEventListener("change", () => {
            const selectedModel = this.selectedModel;
            if (selectedModel) {
                this.updateVertexLabelUI(selectedModel);
            }
            this.updateLabelsEditBoxes();
        })
    }

    buildRemappedFaceArray(model: Model, map: Record<number, number>): Int32Array {
        const out = new Int32Array(model.faceCount).fill(0);

        if (model.labelFaces) {
        model.labelFaces.forEach((faces, grp) => {
            if (!faces) return;
            const target = map[grp] ?? grp;
            for (let i = 0; i < faces.length; i++) out[faces[i]] = target;
        });
        }

        return out;
    }

    buildRemappedVertexArray(model: Model, map: Record<number, number>): Int32Array {
        const out = new Int32Array(model.vertexCount).fill(0);

        if (model.labelVertices) {
        model.labelVertices.forEach((verts, grp) => {
            if (!verts) return;
            const target = map[grp] ?? grp;
            for (let i = 0; i < verts.length; i++) out[verts[i]] = target;
        });
        }

        return out;
    }

    applyCustomFaceLabels(model: Model) {
        const mapping: Record<number, number> = {};
        const labelItems = document.querySelectorAll("#label-list .label-item");

        labelItems.forEach((item) => {
        const labelText = item.querySelector("span")?.textContent;
        const input = item.querySelector("input") as HTMLInputElement;

        if (!labelText || !input) return;

        const match = labelText.match(/Label\s+(\d+)/);
        if (!match) return;

        const originalId = parseInt(match[1]);
        const newId = parseInt(input.value);

        if (!isNaN(newId) && newId !== originalId) {
            mapping[originalId] = newId;
        }
        });

        model.faceLabelForExport = this.buildRemappedFaceArray(model, mapping);
        model.hadOriginalFaceLabels = true;
    }


    applyCustomVertexLabels(model: Model) {
        const mapping: Record<number, number> = {};
        const labelItems = document.querySelectorAll("#vertex-label-list .label-item");

        labelItems.forEach((item) => {
        const labelText = item.querySelector("span")?.textContent;
        const input = item.querySelector("input") as HTMLInputElement;

        if (!labelText || !input) return;

        const match = labelText.match(/Label\s+(\d+)/);
        if (!match) return;

        const originalId = parseInt(match[1]);
        const newId = parseInt(input.value);

        if (!isNaN(newId) && newId !== originalId) {
            mapping[originalId] = newId;
        }
        });

        model.vertexLabelForExport = this.buildRemappedVertexArray(model, mapping);
        model.hadOriginalVertexLabels = true;
    }

    async updateModelListUI() {
        const modelList = document.getElementById("model-list")!;
        const viewModeSelect = document.getElementById(
            "view-mode-select"
        ) as HTMLSelectElement;
        const selectedMode = viewModeSelect.value;

        modelList.innerHTML = "";
        this.handleClearSequence();

        if (selectedMode === "models") {
            const availableModels = this.loader.getAvailableModels();
            let first = true;
            for (const modelId of availableModels) {
                const item = document.createElement("div");
                item.className = "model-item";
                item.textContent = modelId;
                item.addEventListener("click", async () => {
                    item.classList.add("loading");
                    item.textContent = `${modelId} (loading...)`;
                    try {
                        this.builtModel = await this.loader.loadModel(modelId);
                        this.builtModel.calculateBoundsCylinder();
                        this.builtModel.calculateNormals(64, 850, -30, -50, -30, true);
                        document.querySelectorAll(".model-item").forEach((el) => {
                            el.classList.remove("selected", "loading");
                            const originalId = el
                                .textContent!.replace(" (loading...)", "")
                                .replace(" (error)", "");
                            el.textContent = originalId;
                        });
                        item.classList.add("selected");
                        item.textContent = modelId;
                        this.showModel(modelId);
                        this.updateFaceLabelUI(modelId);
                        this.updateVertexLabelUI(modelId);
                        this.handleClearSequence();
                        this.updateAnimationButtonStates();
                        this.updateExportButtonState();
                        this.resetWireframeButtonState();
                        this.setupModelHighlighting();
                    } catch (error) {
                        item.classList.remove("loading");
                        item.textContent = `${modelId} (error)`;
                        item.classList.add("error");
                        setTimeout(() => {
                            item.classList.remove("error");
                            item.textContent = modelId;
                        }, 3000);
                        this.updateExportButtonState();
                    }
                });
                modelList.appendChild(item);
                if (first && availableModels.length > 0) {
                    setTimeout(async () => {
                        try {
                            this.builtModel = await this.loader.loadModel(modelId);
                            item.classList.add("selected");
                            this.showModel(modelId);
                            this.updateFaceLabelUI(modelId);
                            this.updateVertexLabelUI(modelId);
                            this.handleClearSequence();
                            this.updateAnimationButtonStates();
                            this.updateExportButtonState();
                        } catch (error) {
                            console.error(`Auto-load failed for ${modelId}: ${error}`);
                        }
                    }, 100);
                    first = false;
                }
            }
        } else if (selectedMode === "npcs") {
            const availableNpcs = this.loader.getAllNpcs();
            for (const npcId of availableNpcs) {
                const npcData = this.loader.getNpcData(npcId);
                const item = document.createElement("div");
                item.className = "model-item npc-item";
                const displayName = npcData?.name || npcId;
                item.innerHTML = `<div class="npc-name">${displayName}</div><div class="npc-id">${npcId}</div>${npcData?.models
                    ? `<div class="npc-models">${npcData.models.length} model(s)</div>`
                    : ""
                    }`;
                item.addEventListener("click", async () => {
                    item.classList.add("loading");
                    const originalContent = item.innerHTML;
                    item.innerHTML = `${originalContent} <div style="color: #888; font-size: 10px; margin-top: 2px;">Loading...</div>`;
                    try {
                        const combinedModel = await this.loader.loadNpcModels(npcId);
                        const npcModelId = `npc_${npcId}`;
                        this.builtModel = combinedModel;
                        this.builtModel.calculateBoundsCylinder();
                        this.builtModel.calculateNormals(64, 850, -30, -50, -30, true);
                        document
                            .querySelectorAll(".model-item")
                            .forEach((el) => el.classList.remove("selected", "loading"));
                        item.classList.add("selected");
                        item.innerHTML = originalContent;
                        this.showModel(npcModelId);
                        this.updateFaceLabelUI(npcModelId);
                        this.updateVertexLabelUI(npcModelId);
                        this.handleClearSequence();
                        this.updateAnimationButtonStates();
                        this.updateExportButtonState();
                        this.resetWireframeButtonState();
                        this.setupModelHighlighting();
                    } catch (error: any) {
                        console.error(`Error loading object ${npcId}:`, error);
                        item.classList.remove("loading");
                        item.innerHTML = `${originalContent} <div style="color: #ff6666; font-size: 10px; margin-top: 2px;">Error: ${error.message.substring(
                            0,
                            30
                        )}...</div>`;
                        item.classList.add("error");
                        setTimeout(() => {
                            item.classList.remove("error");
                            item.innerHTML = originalContent;
                        }, 5000);
                        this.updateExportButtonState();
                    }
                });
                modelList.appendChild(item);
            }
        } else if (selectedMode === "objects") {
            const availableObjs = this.loader.getAllObjs();
            for (const objId of availableObjs) {
                const objData = this.loader.getObjData(objId);
                const item = document.createElement("div");
                item.className = "model-item obj-item";
                const displayName = objData?.name || objId;
                item.innerHTML = `<div class="obj-name">${displayName}</div><div class="obj-id">${objId}</div>${objData?.model
                    ? `<div class="obj-model-name">Model: ${objData.model}</div>`
                    : ""
                    }`;

                item.addEventListener("click", async () => {
                    item.classList.add("loading");
                    const originalContent = item.innerHTML;
                    item.innerHTML = `${originalContent} <div style="color: #888; font-size: 10px; margin-top: 2px;">Loading...</div>`;

                    if (!objData?.model) {
                        item.classList.remove("loading");
                        item.innerHTML = `${originalContent} <div style="color: #ffcc00; font-size: 10px; margin-top: 2px;">No model defined</div>`;
                        setTimeout(() => {
                            item.innerHTML = originalContent;
                        }, 3000);
                        this.updateExportButtonState();
                        return;
                    }

                    try {
                        const baseModelName = objData.model;
                        let foundModelId = null;

                        for (const [fullPathKey] of this.loader.availableFiles.entries()) {
                            const parts = fullPathKey.split("/");
                            const actualModelNamePart = parts[parts.length - 1];
                            if (actualModelNamePart === baseModelName) {
                                foundModelId = fullPathKey;
                                break;
                            }
                        }

                        if (!foundModelId) {
                            throw new Error(
                                `Model file not found for object: ${baseModelName}`
                            );
                        }

                        const model = await this.loader.loadModel(foundModelId);
                        const clonedModel = model.clone();

                        if (objData.recols) {
                            for (const key in objData.recols) {
                                const [source, dest] = objData.recols[key];
                                clonedModel.recolor(source, dest);
                            }
                        }

                        clonedModel.createLabelReferences();
                        clonedModel.calculateBoundsCylinder();
                        clonedModel.calculateNormals(64, 850, -30, -50, -30, true);
                        clonedModel.saveCurrentVerticesAsOriginal();

                        const objectModelId = `obj_${objId}_${foundModelId.replace(
                            /\//g,
                            "_"
                        )}`;
                        this.builtModel = clonedModel;

                        document
                            .querySelectorAll(".model-item")
                            .forEach((el) => el.classList.remove("selected", "loading"));
                        item.classList.add("selected");
                        item.innerHTML = originalContent;
                        this.showModel(objectModelId);
                        this.updateFaceLabelUI(objectModelId);
                        this.updateVertexLabelUI(objectModelId);
                        this.handleClearSequence();
                        this.updateAnimationButtonStates();
                        this.updateExportButtonState();
                        this.resetWireframeButtonState();
                        this.setupModelHighlighting();
                    } catch (error: any) {
                        console.error(`Error loading object ${objId}:`, error);
                        item.classList.remove("loading");
                        item.innerHTML = `${originalContent} <div style="color: #ff6666; font-size: 10px; margin-top: 2px;">Error: ${error.message.substring(
                            0,
                            30
                        )}...</div>`;
                        item.classList.add("error");
                        setTimeout(() => {
                            item.classList.remove("error");
                            item.innerHTML = originalContent;
                        }, 5000);
                        this.updateExportButtonState();
                    }
                });
                modelList.appendChild(item);
            }
        } else if (selectedMode === "locations") {
            const availableLocs = this.loader.getAllLocs();
            for (const locId of availableLocs) {
                const locData = this.loader.getLocData(locId);
                const item = document.createElement("div");
                item.className = "model-item loc-item";
                const displayName = locData?.name || locId;
                item.innerHTML = `<div class="loc-name">${displayName}</div><div class="loc-id">${locId}</div>${locData?.model
                    ? `<div class="loc-model-name">Model: ${locData.model}</div>`
                    : ""
                    }`;

                item.addEventListener("click", async () => {
                    item.classList.add("loading");
                    const originalContent = item.innerHTML;
                    item.innerHTML = `${originalContent} <div style="color: #888; font-size: 10px; margin-top: 2px;">Loading...</div>`;

                    if (!locData?.model) {
                        item.classList.remove("loading");
                        item.innerHTML = `${originalContent} <div style="color: #ffcc00; font-size: 10px; margin-top: 2px;">No model defined</div>`;
                        setTimeout(() => {
                            item.innerHTML = originalContent;
                        }, 3000);
                        this.updateExportButtonState();
                        return;
                    }

                    try {
                        const baseNameFromConfig = locData.model;
                        let foundModelId = null;
                        let triedNamesForErrorMsg: string[] = [];

                        const attemptLoadStrategy = async (nameToTry: string) => {
                            triedNamesForErrorMsg.push(nameToTry);
                            for (const [
                                fullPathKey,
                            ] of this.loader.availableFiles.entries()) {
                                const parts = fullPathKey.split("/");
                                const actualModelNamePart = parts[parts.length - 1];
                                if (actualModelNamePart === nameToTry) {
                                    return fullPathKey;
                                }
                            }
                            return null;
                        };

                        let actualBaseName = baseNameFromConfig;
                        const knownSuffixKeys = Object.keys(LocShapeSuffixMap);
                        for (const knownSuffix of knownSuffixKeys) {
                            if (baseNameFromConfig.endsWith(knownSuffix)) {
                                actualBaseName = baseNameFromConfig.substring(
                                    0,
                                    baseNameFromConfig.length - knownSuffix.length
                                );
                                break;
                            }
                        }

                        foundModelId = await attemptLoadStrategy(baseNameFromConfig);

                        if (!foundModelId) {
                            const nameWith_8 = actualBaseName + "_8";
                            if (
                                baseNameFromConfig !== nameWith_8 ||
                                actualBaseName === baseNameFromConfig
                            ) {
                                if (!triedNamesForErrorMsg.includes(nameWith_8)) {
                                    foundModelId = await attemptLoadStrategy(nameWith_8);
                                }
                            }
                        }

                        if (!foundModelId) {
                            for (const suffix of orderedLocShapeSuffixStrings) {
                                const nameWithSuffix = actualBaseName + suffix;
                                if (!triedNamesForErrorMsg.includes(nameWithSuffix)) {
                                    foundModelId = await attemptLoadStrategy(nameWithSuffix);
                                    if (foundModelId) break;
                                }
                            }
                        }

                        if (!foundModelId) {
                            let errorIntro = `No suitable model variant found for location base '${baseNameFromConfig}'`;
                            if (actualBaseName !== baseNameFromConfig) {
                                errorIntro += ` (derived base: '${actualBaseName}')`;
                            }
                            throw new Error(
                                `${errorIntro}. Tried: ${[
                                    ...new Set(triedNamesForErrorMsg),
                                ].join(", ")}.`
                            );
                        }

                        const model = await this.loader.loadModel(foundModelId);
                        const clonedModel = model.clone();

                        if (locData.recols) {
                            for (const key in locData.recols) {
                                const [source, dest] = locData.recols[key];
                                clonedModel.recolor(source, dest);
                            }
                        }
                        if (locData.retexs) {
                            for (const key in locData.retexs) {
                                const [sourceTexName, destTexName] = locData.retexs[key];
                                if (sourceTexName && destTexName) {
                                    const sourceTexId =
                                        this.loader.getTextureIdByName(sourceTexName);
                                    const destTexId = this.loader.getTextureIdByName(destTexName);
                                    if (sourceTexId && destTexId) {
                                        clonedModel.recolor(sourceTexId, destTexId);
                                    }
                                }
                            }
                        }

                        if (
                            locData.resizex !== 128 ||
                            locData.resizey !== 128 ||
                            locData.resizez !== 128
                        ) {
                            clonedModel.scale(
                                locData.resizex,
                                locData.resizey,
                                locData.resizez
                            );
                        }

                        clonedModel.createLabelReferences();
                        clonedModel.calculateBoundsCylinder();
                        clonedModel.calculateNormals(
                            locData.ambient + 64,
                            locData.contrast * 5 + 768,
                            -50,
                            -10,
                            -50,
                            !locData.sharelight
                        );
                        clonedModel.saveCurrentVerticesAsOriginal();
                        const locationModelId = `loc_${locId}_${foundModelId.replace(
                            /\//g,
                            "_"
                        )}`;
                        this.builtModel = clonedModel;
                        document
                            .querySelectorAll(".model-item")
                            .forEach((el) => el.classList.remove("selected", "loading"));
                        item.classList.add("selected");
                        item.innerHTML = originalContent;
                        this.showModel(locationModelId);
                        this.updateFaceLabelUI(locationModelId);
                        this.updateVertexLabelUI(locationModelId);
                        this.handleClearSequence();
                        this.updateAnimationButtonStates();
                        this.updateExportButtonState();
                        this.resetWireframeButtonState();
                        this.setupModelHighlighting();
                    } catch (error: any) {
                        console.error(`Error loading location ${locId}:`, error);
                        item.classList.remove("loading");
                        item.innerHTML = `${originalContent} <div style="color: #ff6666; font-size: 10px; margin-top: 2px;">Error: ${error.message.substring(
                            0,
                            30
                        )}...</div>`;
                        item.classList.add("error");
                        setTimeout(() => {
                            item.classList.remove("error");
                            item.innerHTML = originalContent;
                        }, 5000);
                        this.updateExportButtonState();
                    }
                });
                modelList.appendChild(item);
            }
        }
        this.filterModelList();
        this.updateAnimationButtonStates();
        this.updateExportButtonState();
    }

    private resetWireframeButtonState(): void {
        const wireframeToggle = document.getElementById("wireframe-toggle") as HTMLButtonElement;
        if (wireframeToggle) {
            wireframeToggle.classList.remove("active");
            wireframeToggle.textContent = "Show Wireframe";
        }
    }

    updateExportFrameButtonState() {
        const exportBtn = document.getElementById(
            "export-frame-btn"
        ) as HTMLButtonElement;
        if (exportBtn) {
            exportBtn.disabled =
                !this.currentSelectedAnimFrameInstance ||
                this.currentSelectedAnimFrameInstance.id === undefined;
        }
    }

    async handleExportAnimFrame() {
        if (
            !this.currentSelectedAnimFrameInstance ||
            this.currentSelectedAnimFrameInstance.id === undefined
        ) {
            alert(
                "No animation frame selected to export, or the selected frame is invalid."
            );
            this.updateExportFrameButtonState();
            return;
        }

        const animFrameInstance = this.currentSelectedAnimFrameInstance;

        try {
            const frameDataBytes = animFrameInstance.exportToFrame();

            if (!frameDataBytes) {
                console.error(
                    `AnimFrame ${animFrameInstance.id}: exportToFrame() returned null. This might happen if animFrame.base is missing or other critical data is unavailable.`
                );
                alert(
                    `Failed to export frame ${animFrameInstance.id}: Frame data could not be generated. Check console for details.`
                );
                this.updateExportFrameButtonState();
                return;
            }

            const blob = new Blob([frameDataBytes], {
                type: "application/octet-stream",
            });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);

            let filename;
            if (animFrameInstance.originalFileName) {
                filename = animFrameInstance.originalFileName;
            } else if (animFrameInstance.originalPath) {
                const pathParts = animFrameInstance.originalPath.split("/");
                filename = pathParts[pathParts.length - 1];
            } else {
                filename = `animframe_${animFrameInstance.id}.frame`;
            }

            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            const status = document.getElementById("status")!;
            if (status) {
                status.textContent = `Frame "${filename}" exported successfully.`;
                setTimeout(() => {
                }, 3000);
            }
        } catch (error: any) {
            console.error(
                `Error exporting AnimFrame ${animFrameInstance.id}:`,
                error
            );
            alert(`Failed to export frame ${animFrameInstance.id}: ${error.message}`);
        }
        this.updateExportFrameButtonState();
    }

    async handleExportModel() {
        const currentSelectedModel = this.selectedModel;

        if (!currentSelectedModel) {
            alert("No model selected to export.");
            this.updateExportButtonState();
            return;
        }

        const modelInstance = this.builtModel;
        if (!modelInstance) {
            alert("Selected model instance not found.");
            this.updateExportButtonState();
            return;
        }

        if (this.changeFaceLabels?.checked && modelInstance) {
        this.applyCustomFaceLabels(modelInstance);
        }
        if (this.changeVertexLabels?.checked && modelInstance) {
        this.applyCustomVertexLabels(modelInstance);
        }

        try {
            modelInstance.saveCurrentVerticesAsOriginal();
            if (modelInstance.partMapping && modelInstance.partMapping.isNpcModel) {
                const partExports = modelInstance.exportNpcParts();

                if (partExports && partExports.size > 0) {
                    let exportCount = 0;
                    for (const [partIndex, partData] of partExports) {
                        const part = modelInstance.partMapping.parts[partIndex];
                        const filename = `${part.originalModelName}.ob2`;

                        const blob = new Blob([partData], {
                            type: "application/octet-stream",
                        });
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(blob);
                        link.download = filename;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        URL.revokeObjectURL(link.href);

                        exportCount++;
                    }

                    const status = document.getElementById("status")!;
                    if (status) {
                        const selectedItem = document.querySelector(
                            "#model-list .model-item.selected"
                        );
                        let npcName = "NPC";
                        if (selectedItem && selectedItem.classList.contains("npc-item")) {
                            const npcIdElement = selectedItem.querySelector(".npc-id");
                            if (npcIdElement) {
                                npcName = `NPC ${npcIdElement.textContent}`;
                            }
                        }
                        status.textContent = `${npcName} exported as ${exportCount} parts with original names.`;
                        setTimeout(() => {
                            const numModels = this.loader.getAvailableModels()?.length || 0;
                            status.textContent = `Found ${numModels} .ob2 files`;
                        }, 3000);
                    }
                } else {
                    throw new Error(
                        "Failed to export NPC parts - no part data available"
                    );
                }
            } else {
                const ob2Data = modelInstance.exportToOb2();

                const blob = new Blob([ob2Data], { type: "application/octet-stream" });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);

                let filename = "exported_model.ob2";
                const selectedItem = document.querySelector(
                    "#model-list .model-item.selected"
                );
                if (selectedItem) {
                    if (selectedItem.classList.contains("obj-item")) {
                        const objModelElement =
                            selectedItem.querySelector(".obj-model-name");
                        if (objModelElement && objModelElement.textContent) {
                            const modelText = objModelElement.textContent;
                            const modelName = modelText.replace("Model: ", "");
                            filename = `${modelName}.ob2`;
                        }
                    } else if (selectedItem.classList.contains("loc-item")) {
                        const locModelElement =
                            selectedItem.querySelector(".loc-model-name");
                        if (locModelElement && locModelElement.textContent) {
                            const modelText = locModelElement.textContent;
                            const modelName = modelText.replace("Model: ", "");
                            filename = `${modelName}.ob2`;
                        }
                    } else if (currentSelectedModel) {
                        const originalFile =
                            this.loader.availableFiles.get(currentSelectedModel);
                        if (originalFile && originalFile.name) {
                            filename = originalFile.name;
                        } else {
                            filename = `${currentSelectedModel.split("/").pop() || "exported_model"
                                }.ob2`;
                        }
                    }
                }

                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);

                const status = document.getElementById("status")!;
                if (status) {
                    status.textContent = `Model "${filename}" exported.`;
                    setTimeout(() => {
                        const numModels = this.loader.getAvailableModels()?.length || 0;
                        status.textContent = `Found ${numModels} .ob2 files`;
                    }, 3000);
                }
            }
        } catch (error: any) {
            console.error("Error exporting model:", error);
            alert("Failed to export model: " + error.message);
        }
        this.updateExportButtonState();
    }

    updateAnimationButtonStates() {
        const startSeqBtn = document.getElementById(
            "start-seq"
        ) as HTMLButtonElement;
        const clearSeqBtn = document.getElementById(
            "clear-seq"
        ) as HTMLButtonElement;

        const modelInstanceExists = !!this.builtModel;

        const selectedSeqItem = document.querySelector(
            "#seq-list .label-item.selected"
        );
        const canStart =
            modelInstanceExists && selectedSeqItem && !this.currentAnimation.timerId;
        const isPlaying = !!this.currentAnimation.timerId;

        if (startSeqBtn) startSeqBtn.disabled = !canStart;
        if (clearSeqBtn) clearSeqBtn.disabled = !isPlaying;
        if (this.loopSequenceCheckbox)
            this.loopSequenceCheckbox.disabled =
                !modelInstanceExists || !selectedSeqItem;
    }

    handleStartSequence() {
        if (this.currentAnimation.timerId) {
            this.handleClearSequence();
        }

        if (!this.selectedModel) {
            this.updateAnimationButtonStates();
            return;
        }

        if (!this.builtModel) {
            this.updateAnimationButtonStates();
            return;
        }

        const selectedSeqItem = document.querySelector("#seq-list .label-item.selected");
        if (!selectedSeqItem) {
            this.updateAnimationButtonStates();
            return;
        }

        const seqId = selectedSeqItem.textContent!;
        const seqData = this.loader.getSeqData(seqId);

        if (!seqData || !seqData.frameIds || seqData.frameIds.length === 0) {
            this.updateAnimationButtonStates();
            return;
        }

        this.currentAnimation.modelRef = this.builtModel;
        this.currentAnimation.seqId = seqId;
        this.currentAnimation.seqData = seqData;
        this.currentAnimation.frameIndex = 0;

        this.animateNextFrame();
        this.updateAnimationButtonStates();
    }

    animateNextFrame() {
        if (!this.currentAnimation.modelRef || !this.currentAnimation.seqData) {
            this.handleClearSequence();
            return;
        }

        const model = this.currentAnimation.modelRef;
        const seq = this.currentAnimation.seqData;
        let frameIndex = this.currentAnimation.frameIndex;

        const frameIds = seq.frameIds || [];
        const totalFrames = frameIds.length;

        if (totalFrames === 0) {
            this.handleClearSequence();
            return;
        }

        if (frameIndex >= totalFrames) {
            const loopCheckbox = this.loopSequenceCheckbox;
            if (loopCheckbox && loopCheckbox.checked) {
                frameIndex = 0;
            } else if (
                seq.replayoff !== undefined &&
                seq.replayoff !== -1 &&
                frameIndex >= seq.replayoff
            ) {
                this.handleClearSequence();
                return;
            } else if (seq.replayoff === undefined || seq.replayoff === -1) {
                if (seq.replayoff !== -1) {
                    this.handleClearSequence();
                    return;
                }
                frameIndex = 0;
            } else {
                frameIndex = 0;
            }
        }

        const frameName = frameIds[frameIndex];
        let numericFrameId = -1;

        if (frameName !== undefined && frameName !== null) {
            const parts = String(frameName).split("_");
            const numericIdStr =
                parts.length > 1 ? parts[parts.length - 1] : parts[0];
            numericFrameId = parseInt(numericIdStr, 10);
            if (isNaN(numericFrameId)) numericFrameId = -1;
        }

        if (numericFrameId !== -1) {
            model.resetToOriginal();
            model.applyTransform(numericFrameId);
        }

        this.currentAnimation.frameIndex = frameIndex + 1;

        let finalDelayTicks = 2;
        const delayValues = seq.delayValues || [];
        if (delayValues[frameIndex] !== undefined) {
            if (delayValues[frameIndex] === 0) {
                if (
                    numericFrameId !== -1 &&
                    AnimFrame.instances &&
                    AnimFrame.instances[numericFrameId]
                ) {
                    const animFrameForDefaultDelay = AnimFrame.instances[numericFrameId];
                    if (
                        animFrameForDefaultDelay &&
                        animFrameForDefaultDelay.frameDelay > 0
                    ) {
                        finalDelayTicks = animFrameForDefaultDelay.frameDelay;
                    } else {
                        finalDelayTicks = 1;
                    }
                } else {
                    finalDelayTicks = 1;
                }
            } else {
                finalDelayTicks = delayValues[frameIndex];
            }
        } else if (
            numericFrameId !== -1 &&
            AnimFrame.instances &&
            AnimFrame.instances[numericFrameId]
        ) {
            const animFrameForDefaultDelay = AnimFrame.instances[numericFrameId];
            if (animFrameForDefaultDelay && animFrameForDefaultDelay.frameDelay > 0) {
                finalDelayTicks = animFrameForDefaultDelay.frameDelay;
            } else if (
                animFrameForDefaultDelay &&
                animFrameForDefaultDelay.frameDelay === 0
            ) {
                finalDelayTicks = 1;
            }
        }

        this.currentAnimation.timerId = setTimeout(
            () => this.animateNextFrame(),
            finalDelayTicks * 20
        );
    }

    handleClearSequence() {
        if (this.currentAnimation.timerId) {
            clearTimeout(this.currentAnimation.timerId);
        }
        if (this.currentAnimation.modelRef) {
            this.currentAnimation.modelRef.resetToOriginal();
        }

        this.currentAnimation = {
            modelRef: null,
            seqId: null,
            seqData: null,
            frameIndex: 0,
            timerId: null,
        };

        document
            .querySelectorAll("#seq-list .label-item.selected")
            .forEach((el) => el.classList.remove("selected"));
        this.updateAnimFrameListUI(null);
        this.updateAnimationButtonStates();
    }

    updateSeqListUI() {
        const seqList = document.getElementById("seq-list")!;
        seqList.innerHTML = "";

        const availableSeqs = this.loader.getAllSeqs();

        availableSeqs.forEach((seqId) => {
            const item = document.createElement("div");
            item.className = "label-item";
            item.textContent = seqId;
            item.addEventListener("click", () => {
                if (this.currentAnimation.timerId) {
                    clearTimeout(this.currentAnimation.timerId);
                }
                if (this.currentAnimation.modelRef) {
                    if (this.currentAnimation.timerId) {
                        this.currentAnimation.modelRef.resetToOriginal();
                    }
                }
                this.currentAnimation = {
                    modelRef: null,
                    seqId: null,
                    seqData: null,
                    frameIndex: 0,
                    timerId: null,
                };

                document
                    .querySelectorAll("#seq-list .label-item")
                    .forEach((el) => el.classList.remove("selected"));
                item.classList.add("selected");

                this.updateAnimFrameListUI(seqId);

                this.updateAnimationButtonStates();
            });
            seqList.appendChild(item);
        });
        this.filterSeqList();
        this.updateAnimationButtonStates();
    }

    updateAnimFrameListUI(seqId: string | null) {
        const animFrameList = document.getElementById("animframe-list")!;
        animFrameList.innerHTML = "";
        this.currentSelectedAnimFrameInstance = null;
        this.clearTransformEditor();
        this.updateAnimFrameDetailsUI(null);

        if (!seqId) {
            animFrameList.innerHTML =
                '<div class="label-item no-labels"><span style="color: #888; font-style: italic;">Select a SEQ to view frames</span></div>';
            (document.getElementById("clear-frames") as HTMLButtonElement).disabled =
                true;
            (
                document.getElementById("export-frame-btn") as HTMLButtonElement
            ).disabled = true;
            return;
        }

        const seqData = this.loader.getSeqData(seqId);
        if (!seqData || (!seqData.frameIds && !seqData.iframeIds)) {
            animFrameList.innerHTML = `<div class="label-item no-labels"><span style="color: #888; font-style: italic;">No frame data for ${seqId}</span></div>`;
            return;
        }

        const frameIds = seqData.frameIds || [];
        const iframeIds = seqData.iframeIds || [];
        const delayValues = seqData.delayValues || [];
        const maxLength = Math.max(
            frameIds.length,
            iframeIds.length,
            delayValues.length
        );

        if (maxLength === 0) {
            animFrameList.innerHTML = `<div class="label-item no-labels"><span style="color: #888; font-style: italic;">SEQ ${seqId} has no frames defined</span></div>`;
            return;
        }
        (document.getElementById("clear-frames") as HTMLButtonElement).disabled =
            false;
        (
            document.getElementById("export-frame-btn") as HTMLButtonElement
        ).disabled = true;

        for (let i = 0; i < maxLength; i++) {
            const frameName = frameIds[i];
            const iframeName = iframeIds[i];
            const delay = delayValues[i];

            const processFrame = (name: any, type: string) => {
                if (name !== undefined && name !== null) {
                    const item = document.createElement("div");
                    item.className = "label-item";
                    let contentText = `${i + 1}: ${name}`;
                    if (delay !== undefined && type === "Frame") {
                        contentText += ` (Delay: ${delay})`;
                    } else if (delay !== undefined && type === "iFrame" && !frameName) {
                        contentText += ` (Delay: ${delay})`;
                    }
                    item.textContent = contentText;

                    let animFrameInstance = null;
                    let numericId = null;
                    try {
                        const parts = String(name).split("_");
                        const numericIdStr =
                            parts.length > 1 ? parts[parts.length - 1] : parts[0];
                        numericId = parseInt(numericIdStr, 10);

                        if (
                            !isNaN(numericId) &&
                            AnimFrame.instances &&
                            AnimFrame.instances[numericId]
                        ) {
                            animFrameInstance = AnimFrame.instances[numericId];

                            if (animFrameInstance.id === undefined)
                                animFrameInstance.id = numericId;
                        }
                    } catch (e) {
                        console.warn(`Could not parse or find AnimFrame for: ${name}`, e);
                    }

                    if (animFrameInstance) {
                        item.addEventListener("click", () => {
                            const clickedItem = item;

                            document
                                .querySelectorAll("#animframe-list .label-item")
                                .forEach((el) => el.classList.remove("selected"));

                            clickedItem.classList.add("selected");

                            this.currentSelectedAnimFrameInstance = animFrameInstance;

                            this.updateAnimFrameDetailsUI(animFrameInstance);

                            if (animFrameInstance && animFrameInstance.id !== undefined) {
                                this.displaySingleAnimFrame(animFrameInstance.id);

                                document
                                    .querySelectorAll("#animframe-list .label-item")
                                    .forEach((el) => el.classList.remove("selected"));
                                clickedItem.classList.add("selected");
                            }
                        });
                    } else {
                        item.style.cursor = "not-allowed";
                        item.title = "Animation frame data not found";
                    }
                    animFrameList.appendChild(item);
                }
            };

            processFrame(frameName, "Frame");
            processFrame(iframeName, "iFrame");

            if (
                (frameName === undefined || frameName === null) &&
                (iframeName === undefined || iframeName === null) &&
                delay !== undefined
            ) {
                const item = document.createElement("div");
                item.className = "label-item";
                item.innerHTML = `Step ${i + 1}: (Empty) (Delay: ${delay})`;
                animFrameList.appendChild(item);
            }
        }
        if (animFrameList.children.length === 0) {
            animFrameList.innerHTML = `<div class="label-item no-labels"><span style="color: #888; font-style: italic;">No displayable frames in ${seqId}</span></div>`;
            (document.getElementById("clear-frames") as HTMLButtonElement).disabled =
                true;
            (
                document.getElementById("export-frame-btn") as HTMLButtonElement
            ).disabled = true;
        }
    }

    displaySingleAnimFrame(frameNumericId: number) {
        if (frameNumericId === -1 || isNaN(frameNumericId)) {
            console.warn("Invalid frame ID provided for single frame display.");
            this.updateAnimationButtonStates();
            return;
        }

        if (this.currentAnimation.timerId) {
            clearTimeout(this.currentAnimation.timerId);
        }

        this.currentAnimation = {
            modelRef: this.currentAnimation.modelRef,
            seqId: null,
            seqData: null,
            frameIndex: 0,
            timerId: null,
        };

        const selectedModelId = this.selectedModel;
        if (!selectedModelId) {
            this.updateAnimationButtonStates();
            return;
        }

        if (!this.builtModel) {
            this.updateAnimationButtonStates();
            return;
        }

        this.currentAnimation.modelRef = this.builtModel;

        this.builtModel.resetToOriginal();
        this.builtModel.applyTransform(frameNumericId);
        this.updateAnimationButtonStates();
    }

    handleTransformOperationClick(animFrame: AnimFrame, transformIndexInFrame: number) {
        if (!this.selectedModel) return;
        if (!this.builtModel) return;

        const animBase = animFrame.base;
        if (
            !animBase ||
            !animFrame.bases ||
            !animBase.animLabels ||
            !animBase.animTypes ||
            transformIndexInFrame >= animFrame.bases.length
        ) {
            console.warn(
                "Cannot highlight: AnimFrame or AnimBase data incomplete or index out of bounds."
            );
            this.clearTransformHighlights();
            return;
        }

        const baseGroupIndex = animFrame.bases[transformIndexInFrame];
        
        if (baseGroupIndex >= animBase.animLabels.length || baseGroupIndex >= animBase.animTypes.length) {
            console.warn(
                `Base group index ${baseGroupIndex} is out of bounds for highlighting.`
            );
            this.clearTransformHighlights();
            return;
        }

        this.highlightAffectedModelParts(animBase, baseGroupIndex);
    }

    private highlightTransformFaces(affectedLabels: Uint8Array): void {
        if (!this.builtModel || !this.builtModel.labelFaces) return;

        const allFaceIndicesToHighlight = new Set<number>();
        
        for (let i = 0; i < affectedLabels.length; i++) {
            const faceGroupLabel = affectedLabels[i];
            if (this.builtModel.labelFaces[faceGroupLabel]) {
                const facesInGroup = this.builtModel.labelFaces[faceGroupLabel];
                for (let j = 0; j < facesInGroup.length; j++) {
                    allFaceIndicesToHighlight.add(facesInGroup[j]);
                }
            }
        }

        if (allFaceIndicesToHighlight.size > 0) {
            this.highlightedFaces = allFaceIndicesToHighlight;
            this.setupModelHighlighting();
            this.builtModel.applyFaceHighlighting();
            this.sceneDelta++;
        }
    }

    private highlightTransformVertices(affectedLabels: Uint8Array): void {
        if (!this.builtModel || !this.builtModel.labelVertices) return;

        const allVertexIndicesToHighlight = new Set<number>();
        
        for (let i = 0; i < affectedLabels.length; i++) {
            const vertexGroupLabel = affectedLabels[i];
            if (this.builtModel.labelVertices[vertexGroupLabel]) {
                const verticesInGroup = this.builtModel.labelVertices[vertexGroupLabel];
                for (let j = 0; j < verticesInGroup.length; j++) {
                    allVertexIndicesToHighlight.add(verticesInGroup[j]);
                }
            }
        }

        if (allVertexIndicesToHighlight.size > 0) {
            this.highlightedVertices = allVertexIndicesToHighlight;
            this.sceneDelta++;
        }
    }

    private clearTransformHighlights(): void {
        this.clearFaceHighlights();
        this.clearVertexHighlights();
    }

    updateAnimFrameDetailsUI(animFrame: AnimFrame | null) {
        const detailsContent = document.getElementById(
            "animframe-details-content"
        )!;
        const clearDetailsBtn = document.getElementById(
            "clear-details"
        ) as HTMLButtonElement;
        const addTransformBtn = document.getElementById(
            "add-new-transform-btn"
        ) as HTMLButtonElement;

        this.clearTransformEditor();
        this.updateExportFrameButtonState();

        if (
            animFrame &&
            animFrame.base &&
            animFrame.base.animTypes &&
            animFrame.base.animLabels
        ) {
            if (addTransformBtn) addTransformBtn.disabled = false;
        } else {
            if (addTransformBtn) addTransformBtn.disabled = true;
            this.hideNewTransformForm();
        }

        if (!animFrame) {
            detailsContent.innerHTML =
                '<div class="label-item no-labels"><span style="color: #888; font-style: italic;">Select an animation frame or frame data missing.</span></div>';
            if (clearDetailsBtn) clearDetailsBtn.disabled = true;
            return;
        }
        if (clearDetailsBtn) clearDetailsBtn.disabled = false;

        let html = `<div class="detail-item"><span class="detail-label">Frame ID:</span> ${animFrame.id !== undefined ? animFrame.id : "N/A"
            }</div>`;
        html += `<div class="detail-item"><span class="detail-label">Frame Delay:</span> ${animFrame.frameDelay} ticks</div>`;
        const animBase = animFrame.base;

        if (animBase) {
            html += `<div class="detail-item"><span class="detail-label">Base Anim Groups:</span> ${animBase.animLength}</div>`;
        } else {
            html += `<div class="detail-item"><span class="detail-label">Base Info:</span> AnimBase object not found on this frame.</div>`;
        }

        const transformCount = animFrame.frameLength;
        html += `<div class="detail-item"><span class="detail-label">Transforms in this Frame:</span> ${transformCount}</div>`;

        if (
            transformCount > 0 &&
            animBase &&
            animFrame.bases &&
            animFrame.x &&
            animFrame.y &&
            animFrame.z &&
            animBase.animTypes &&
            animBase.animLabels
        ) {
            html += `<div class="detail-item" style="margin-top: 8px;"><span class="detail-label">Frame Transforms List:</span></div>`;
            for (let i = 0; i < transformCount; i++) {
                if (
                    i >= animFrame.bases.length ||
                    i >= animFrame.x.length ||
                    i >= animFrame.y.length ||
                    i >= animFrame.z.length
                ) {
                    console.warn(
                        `Data inconsistency in AnimFrame ${animFrame.id} at transform index ${i}. frameLength: ${transformCount}, but array lengths differ.`
                    );
                    continue;
                }
                const baseIndexForThisTransform = animFrame.bases[i];
                if (
                    baseIndexForThisTransform === undefined ||
                    baseIndexForThisTransform >= animBase.animTypes.length ||
                    baseIndexForThisTransform >= animBase.animLabels.length
                ) {
                    console.warn(
                        `Invalid baseIndexForThisTransform (${baseIndexForThisTransform}) in AnimFrame ${animFrame.id
                        } at transform index ${i}. Max base group index: ${animBase.animTypes.length - 1
                        }`
                    );
                    html += `<div class="transform-group" data-transform-index="${i}" style="padding: 6px; margin-bottom: 6px; border: 1px solid #cc0000; border-radius: 4px; background-color: #4a2a2a;">`;
                    html += `<div style="font-weight: bold; color: #ffaaaa;">${i + 1
                        }: Error - Invalid Base Group Index ${baseIndexForThisTransform}</div>`;
                    html += `</div>`;
                    continue;
                }

                const transformType = animBase.animTypes[baseIndexForThisTransform];
                const transformTypeName = this.getTransformTypeName(transformType);
                const tX = animFrame.x[i];
                const tY = animFrame.y[i];
                const tZ = animFrame.z[i];

                html += `<div class="transform-group" data-transform-index="${i}"
                             style="cursor: pointer; padding: 6px; margin-bottom: 6px; border: 1px solid #444; border-radius: 4px; background-color: #2a2a2a;">`;
                html += `<div style="font-weight: bold;">${i + 1
                    } (targets Base Group ${baseIndexForThisTransform}): ${transformTypeName}</div>`;
                html += `<div>Values: (X: ${tX}, Y: ${tY}, Z: ${tZ})</div>`;

                const affectedModelGroupLabels =
                    animBase.animLabels[baseIndexForThisTransform];
                if (affectedModelGroupLabels && affectedModelGroupLabels.length > 0) {
                    html += `<div>Affects Model ${transformType === 5 ? "Face" : "Vertex"
                        } Labels: <ul>`;
                    for (let j = 0; j < affectedModelGroupLabels.length; j++) {
                        html += `<li>Label ${affectedModelGroupLabels[j]}</li>`;
                    }
                    html += `</ul></div>`;
                } else {
                    html += `<div>Affects Model ${transformType === 5 ? "Face" : "Vertex"
                        } Labels: None specified for Base Group ${baseIndexForThisTransform}</div>`;
                }
                html += `</div>`;
            }
        } else if (transformCount > 0) {
            html += `<div class="detail-item"><span class="detail-label">Transforms:</span> (Data for individual transforms might be incomplete or AnimBase info missing)</div>`;
        }

        detailsContent.innerHTML = html;

        detailsContent.querySelectorAll(".transform-group").forEach((el) => {
            el.addEventListener("click", (event) => {
                const clickedElement = event.currentTarget as HTMLElement;
                if (clickedElement.style.borderColor === "rgb(204, 0, 0)") {
                    console.warn(
                        "Clicked on an error-state transform group. Editor not shown."
                    );
                    return;
                }

                detailsContent
                    .querySelectorAll(".transform-group")
                    .forEach(
                        (tg) => ((tg as HTMLElement).style.backgroundColor = "#2a2a2a")
                    );

                clickedElement.style.backgroundColor = "#0055A4";

                const transformIndex = parseInt(
                    clickedElement.dataset.transformIndex!,
                    10
                );
                if (!isNaN(transformIndex)) {
                    this.showTransformEditor(animFrame, transformIndex, clickedElement);
                    this.handleTransformOperationClick(animFrame, transformIndex);

                    const deleteTransformBtn = document.getElementById(
                        "delete-transform-btn"
                    ) as HTMLButtonElement;
                    deleteTransformBtn.disabled = false;
                    clearDetailsBtn.disabled = false;
                }
            });
        });
    }

    private isSequenceRunning(): boolean {
        return this.currentAnimation.timerId !== null && 
            this.currentAnimation.modelRef !== null;
    }

    showNewTransformForm() {
        const formContainer = document.getElementById("new-transform-form-container")!;
        if (
            !this.currentSelectedAnimFrameInstance ||
            !this.currentSelectedAnimFrameInstance.base
        ) {
            console.warn(
                "Cannot show new Transform form: No valid AnimFrame or AnimBase selected."
            );
            this.hideNewTransformForm();
            return;
        }

        const animFrame = this.currentSelectedAnimFrameInstance;
        const animBase = animFrame.base;

        formContainer.innerHTML = `
            <h4>Add New Transform</h4>
            <div>
                <label for="new-transform-base-group-select">Target AnimBase Group:</label>
                <select id="new-transform-base-group-select"></select>
                <div id="affected-labels-info" style="font-size: 10px; color: #aaa; margin-top: 4px;">Select a base group to see affected model labels.</div>
            </div>
            <div id="new-transform-inputs-container">
                <div>
                    <label for="new-transform-x">X Value:</label>
                    <input type="number" id="new-transform-x" value="0">
                </div>
                <div>
                    <label for="new-transform-y">Y Value:</label>
                    <input type="number" id="new-transform-y" value="0">
                </div>
                <div>
                    <label for="new-transform-z">Z Value:</label>
                    <input type="number" id="new-transform-z" value="0">
                </div>
            </div>
            <div class="form-action-buttons" style="margin-top: 10px;">
                <button id="cancel-add-transform-btn" class="label-control-btn">Cancel</button>
                <button id="confirm-add-transform-btn" class="label-control-btn active" style="background-color: #0066cc; margin-left: 5px;">Confirm Add</button>
            </div>
        `;

        this.activeNewTransformForm.baseGroupSelect = document.getElementById(
            "new-transform-base-group-select"
        ) as HTMLSelectElement;
        this.activeNewTransformForm.xInput = document.getElementById(
            "new-transform-x"
        ) as HTMLInputElement;
        this.activeNewTransformForm.yInput = document.getElementById(
            "new-transform-y"
        ) as HTMLInputElement;
        this.activeNewTransformForm.zInput = document.getElementById(
            "new-transform-z"
        ) as HTMLInputElement;
        this.activeNewTransformForm.affectedInfoDiv = document.getElementById(
            "affected-labels-info"
        ) as HTMLElement;

        const updateInputTypes = (transformType: number) => {
            const container = document.getElementById("new-transform-inputs-container")!;
            const useSliders = transformType === 2 || transformType === 5;
            const maxValue = useSliders ? 255 : undefined;
            
            if (useSliders) {
                container.innerHTML = `
                    <div style="display: flex; align-items: center; margin-bottom: 6px;">
                        <label style="width: 30px;">X:</label>
                        <input type="range" id="new-transform-x" class="transform-slider" min="0" max="255" value="0">
                        <span class="slider-value-display">0</span>
                    </div>
                    <div style="display: flex; align-items: center; margin-bottom: 6px;">
                        <label style="width: 30px;">Y:</label>
                        <input type="range" id="new-transform-y" class="transform-slider" min="0" max="255" value="0">
                        <span class="slider-value-display">0</span>
                    </div>
                    <div style="display: flex; align-items: center; margin-bottom: 6px;">
                        <label style="width: 30px;">Z:</label>
                        <input type="range" id="new-transform-z" class="transform-slider" min="0" max="255" value="0">
                        <span class="slider-value-display">0</span>
                    </div>
                `;

                ["x", "y", "z"].forEach(axis => {
                    const slider = document.getElementById(`new-transform-${axis}`) as HTMLInputElement;
                    const display = slider.nextElementSibling as HTMLSpanElement;
                    
                    const updateDisplay = () => {
                        display.textContent = slider.value;
                    };
                    
                    slider.addEventListener("input", updateDisplay);
                    slider.addEventListener("change", updateDisplay);
                });
            } else {
                container.innerHTML = `
                    <div>
                        <label for="new-transform-x">X Value:</label>
                        <input type="number" id="new-transform-x" value="0">
                    </div>
                    <div>
                        <label for="new-transform-y">Y Value:</label>
                        <input type="number" id="new-transform-y" value="0">
                    </div>
                    <div>
                        <label for="new-transform-z">Z Value:</label>
                        <input type="number" id="new-transform-z" value="0">
                    </div>
                `;
            }

            this.activeNewTransformForm.xInput = document.getElementById("new-transform-x") as HTMLInputElement;
            this.activeNewTransformForm.yInput = document.getElementById("new-transform-y") as HTMLInputElement;
            this.activeNewTransformForm.zInput = document.getElementById("new-transform-z") as HTMLInputElement;
        };

        if (
            animBase.animLength > 0 &&
            animBase.animTypes &&
            this.activeNewTransformForm.baseGroupSelect
        ) {
            for (let i = 0; i < animBase.animLength; i++) {
                const option = document.createElement("option");
                option.value = i.toString();
                option.textContent = `Group ${i}: ${this.getTransformTypeName(
                    animBase.animTypes[i]
                )}`;
                this.activeNewTransformForm.baseGroupSelect.appendChild(option);
            }
        } else if (this.activeNewTransformForm.affectedInfoDiv) {
            this.activeNewTransformForm.affectedInfoDiv.textContent =
                "AnimBase has no defined groups.";
        }

        if (this.activeNewTransformForm.baseGroupSelect) {
            this.activeNewTransformForm.baseGroupSelect.addEventListener(
                "change",
                (e) => {
                    const selectedGroupIndex = parseInt(
                        (e.target as HTMLSelectElement).value,
                        10
                    );
                    this.updateAffectedLabelsInfo(animBase, selectedGroupIndex);
                    this.highlightAffectedModelParts(animBase, selectedGroupIndex);

                    const transformType = animBase.animTypes[selectedGroupIndex];

                    updateInputTypes(transformType);

                    if (
                        this.activeNewTransformForm.xInput &&
                        this.activeNewTransformForm.yInput &&
                        this.activeNewTransformForm.zInput
                    ) {
                        if (transformType === 3) {
                            this.activeNewTransformForm.xInput.value = "128";
                            this.activeNewTransformForm.yInput.value = "128";
                            this.activeNewTransformForm.zInput.value = "128";
                        } else {
                            this.activeNewTransformForm.xInput.value = "0";
                            this.activeNewTransformForm.yInput.value = "0";
                            this.activeNewTransformForm.zInput.value = "0";
                        }

                        if (transformType === 2 || transformType === 5) {
                            document.querySelectorAll("#new-transform-inputs-container .slider-value-display").forEach((display, index) => {
                                const values = ["0", "0", "0"];
                                if (transformType === 3) {
                                    values[0] = values[1] = values[2] = "128";
                                }
                                (display as HTMLSpanElement).textContent = values[index];
                            });
                        }
                    }
                }
            );

            if (this.activeNewTransformForm.baseGroupSelect.options.length > 0) {
                this.activeNewTransformForm.baseGroupSelect.dispatchEvent(
                    new Event("change")
                );
            }
        }

        (
            document.getElementById("confirm-add-transform-btn") as HTMLButtonElement
        ).addEventListener("click", () => this.handleConfirmAddNewTransform());
        (
            document.getElementById("cancel-add-transform-btn") as HTMLButtonElement
        ).addEventListener("click", () => this.hideNewTransformForm());

        formContainer.style.display = "block";
    }

    hideNewTransformForm() {
        const formContainer = document.getElementById("new-transform-form-container")!;
        formContainer.style.display = "none";
        formContainer.innerHTML = "";
        
        this.clearTransformHighlights();
        
        this.activeNewTransformForm = {
            baseGroupSelect: null,
            xInput: null,
            yInput: null,
            zInput: null,
            affectedInfoDiv: null,
        };
    }

    handleDeleteSelectedTransform() {
        if (
            !this.activeTransformEditor ||
            !this.activeTransformEditor.animFrame ||
            this.activeTransformEditor.transformIndex === -1
        ) {
            console.warn("No transform selected for deletion, or editor not active.");
            alert("No transform is currently selected for deletion.");
            return;
        }

        const animFrame = this.activeTransformEditor.animFrame;
        const transformIndex = this.activeTransformEditor.transformIndex;

        if (
            !confirm(
                `Are you sure you want to delete Transform ${transformIndex + 1
                } (from list) from frame ${animFrame.id}?`
            )
        ) {
            return;
        }

        const success = animFrame.deleteTransform(transformIndex);

        if (success) {
            this.clearTransformEditor();
            this.updateAnimFrameDetailsUI(animFrame);

            if (animFrame.id !== undefined) {
                this.displaySingleAnimFrame(animFrame.id);
            } else {
                console.warn(
                    "AnimFrame ID is undefined, cannot refresh 3D model view after deletion. Resetting model."
                );
                const selectedModelId = this.selectedModel;
                if (selectedModelId) {
                    if (this.builtModel) {
                        this.builtModel.resetToOriginal();
                    }
                }
            }
        } else {
            alert(
                `Failed to delete transform ${transformIndex + 1
                }. Check console for errors or data inconsistencies.`
            );
        }
    }

    updateAffectedLabelsInfo(animBase: AnimBase, baseGroupIndex: number) {
        if (
            !animBase ||
            !animBase.animLabels ||
            !animBase.animTypes ||
            !this.activeNewTransformForm.affectedInfoDiv ||
            baseGroupIndex >= animBase.animLabels.length ||
            baseGroupIndex >= animBase.animTypes.length
        )
            return;

        const affectedModelGroupLabels = animBase.animLabels[baseGroupIndex];
        const transformType = animBase.animTypes[baseGroupIndex];
        let infoText = `Affects Model ${transformType === 5 ? "Face" : "Vertex"
            } Label(s): `;

        if (affectedModelGroupLabels && affectedModelGroupLabels.length > 0) {
            infoText += Array.from(affectedModelGroupLabels).join(", ");
        } else {
            infoText += `None specified for Base Group ${baseGroupIndex}.`;
        }
        this.activeNewTransformForm.affectedInfoDiv.textContent = infoText;
    }

    highlightAffectedModelParts(animBase: AnimBase, baseGroupIndex: number) {
        if (!this.builtModel) return;

        if (
            !animBase ||
            !animBase.animLabels ||
            !animBase.animTypes ||
            baseGroupIndex >= animBase.animLabels.length ||
            baseGroupIndex >= animBase.animTypes.length
        ) {
            console.warn(
                "Cannot highlight: AnimBase data incomplete or index out of bounds for highlighting."
            );
            this.clearTransformHighlights();
            return;
        }

        const transformType = animBase.animTypes[baseGroupIndex];
        const affectedModelLabels = animBase.animLabels[baseGroupIndex];

        this.clearTransformHighlights();

        if (!affectedModelLabels || affectedModelLabels.length === 0) {
            return;
        }

        if (transformType === 5) {
            this.highlightTransformFaces(affectedModelLabels);
        } else {
            this.highlightTransformVertices(affectedModelLabels);
        }
    }

    handleConfirmAddNewTransform() {
        if (
            !this.currentSelectedAnimFrameInstance ||
            !this.activeNewTransformForm.baseGroupSelect ||
            !this.activeNewTransformForm.xInput ||
            !this.activeNewTransformForm.yInput ||
            !this.activeNewTransformForm.zInput
        ) {
            console.error("Cannot add Transform: Form or AnimFrame not ready.");
            return;
        }

        const animFrame = this.currentSelectedAnimFrameInstance;
        const baseGroupIndex = parseInt(
            this.activeNewTransformForm.baseGroupSelect.value,
            10
        );
        const transformX = parseInt(this.activeNewTransformForm.xInput.value, 10);
        const transformY = parseInt(this.activeNewTransformForm.yInput.value, 10);
        const transformZ = parseInt(this.activeNewTransformForm.zInput.value, 10);

        if (
            isNaN(baseGroupIndex) ||
            isNaN(transformX) ||
            isNaN(transformY) ||
            isNaN(transformZ)
        ) {
            alert(
                "Invalid input values for the new Transform. Ensure all are numbers."
            );
            return;
        }

        animFrame.addTransform(baseGroupIndex, transformX, transformY, transformZ);

        this.hideNewTransformForm();
        this.updateAnimFrameDetailsUI(animFrame);
        if (animFrame.id !== undefined) {
            this.displaySingleAnimFrame(animFrame.id);
        }
    }

    updateFaceLabelUI(modelId: string): void {
        const labelList = document.getElementById("label-list") as HTMLElement;
        labelList.innerHTML = "";
        
        const clearBtn = document.getElementById("clear-labels") as HTMLButtonElement;
        const modelIsLoaded = !!modelId && !!this.builtModel;
        if (clearBtn) clearBtn.disabled = !modelIsLoaded;

        if (!this.builtModel || !this.builtModel.labelFaces) {
            labelList.innerHTML =
                '<div class="label-item no-labels"><span style="color: #888; font-style: italic;">No face labels available</span></div>';
            return;
        }

        this.builtModel.labelFaces.forEach((faceIndices, labelId) => {
            if (faceIndices && faceIndices.length > 0) {
                const item = document.createElement("div");
                item.className = "label-item";
                item.innerHTML = `<span>Label ${labelId}</span><span class="label-count">${faceIndices.length} faces</span>`;

                const input = document.createElement("input");
                input.type = "text";
                input.value = labelId.toString();
                input.className = "label-edit-input";
                input.style.marginLeft = "8px";
                input.style.width = "40px";
                input.disabled = !this.changeFaceLabels?.checked

                item.appendChild(input);

                item.addEventListener("click", () => {
                    document
                        .querySelectorAll("#label-list .label-item")
                        .forEach((el) => el.classList.remove("selected", "highlighted-face"));
                    item.classList.add("highlighted-face");
                    this.highlightFaceLabel(labelId);
                });
                labelList.appendChild(item);
            }
        });

        if (labelList.children.length === 0) {
            labelList.innerHTML =
                '<div class="label-item no-labels"><span style="color: #888; font-style: italic;">No face labels available</span></div>';
        }
    }

    updateVertexLabelUI(modelId: string): void {
        const list = document.getElementById("vertex-label-list") as HTMLElement;
        list.innerHTML = "";
        
        this.updateVertexLabelUIState();

        if (!this.builtModel || !this.builtModel.labelVertices) {
            list.innerHTML =
                '<div class="label-item no-labels"><span style="color: #888; font-style: italic;">No vertex labels available</span></div>';
            return;
        }

        this.builtModel.labelVertices.forEach((vertexIndices, labelId) => {
            if (vertexIndices && vertexIndices.length > 0) {
                const item = document.createElement("div");
                item.className = "label-item";
                item.innerHTML = `<span>Label ${labelId}</span><span class="label-count">${vertexIndices.length} vertices</span>`;

                const input = document.createElement("input");
                input.type = "text";
                input.value = labelId.toString();
                input.className = "label-edit-input";
                input.style.marginLeft = "8px";
                input.style.width = "40px";
                input.disabled = !this.changeVertexLabels?.checked;

                item.appendChild(input);
                
                item.addEventListener("click", () => {
                    document
                        .querySelectorAll("#vertex-label-list .label-item")
                        .forEach((el) =>
                            el.classList.remove("selected", "highlighted-vertex")
                        );
                    item.classList.add("highlighted-vertex");
                    this.highlightVertexLabel(labelId);
                });
                list.appendChild(item);
            }
        });

        if (list.children.length === 0) {
            list.innerHTML =
                '<div class="label-item no-labels"><span style="color: #888; font-style: italic;">No vertex labels available</span></div>';
        }
    }

    private highlightFaceLabel(labelId: number): void {
        if (!this.builtModel || !this.builtModel.labelFaces || !this.builtModel.labelFaces[labelId]) {
            return;
        }

        this.clearFaceHighlights();

        const faceIndices = this.builtModel.labelFaces[labelId];
        if (!faceIndices) return;

        this.highlightedFaces = new Set(faceIndices);
        this.setupModelHighlighting();
        this.builtModel.applyFaceHighlighting();
        this.sceneDelta++;
    }

    private setupModelHighlighting(): void {
        if (this.builtModel) {
            this.builtModel.isHighlightedFace = (faceIndex: number) => {
                return this.highlightedFaces.has(faceIndex);
            };
        }
    }

    private highlightVertexLabel(labelId: number): void {
        if (!this.builtModel || !this.builtModel.labelVertices || !this.builtModel.labelVertices[labelId]) {
            return;
        }

        this.clearVertexHighlights();

        const vertexIndices = this.builtModel.labelVertices[labelId];
        if (!vertexIndices) return;

        this.highlightedVertices = new Set(vertexIndices);

        this.sceneDelta++;
    }

    private clearFaceHighlights(): void {
        if (this.builtModel) {
            this.builtModel.restoreFaceColors();
        }
        this.highlightedFaces = new Set();
        this.sceneDelta++;
    }

    private clearVertexHighlights(): void {
        this.highlightedVertices = new Set();
        this.sceneDelta++;
    }

    updateVertexLabelUIState() {
        const clearBtn = document.getElementById(
            "clear-vertex-labels"
        ) as HTMLButtonElement;
        const modelLoaded = !!this.selectedModel;
        const editModeActive = this.isVertexEditMode;

        clearBtn.disabled = !modelLoaded || !editModeActive;
    }

    setupFaceLabelUI() {
        const clearLabelsBtn = document.getElementById("clear-labels") as HTMLButtonElement;

        clearLabelsBtn.addEventListener("click", () => {
            if (clearLabelsBtn.disabled) return;
            
            this.clearFaceHighlights();
            
            document
                .querySelectorAll("#label-list .label-item")
                .forEach((el) => el.classList.remove("selected", "highlighted-face"));
            document
                .querySelectorAll("#label-panel .label-control-btn")
                .forEach((el) => el.classList.remove("active"));
        });
    }

    setupVertexLabelUI() {
        const clearBtn = document.getElementById("clear-vertex-labels") as HTMLButtonElement;

        clearBtn.addEventListener("click", () => {
            if (clearBtn.disabled) return;
            
            this.clearVertexHighlights();
            
            document
                .querySelectorAll("#vertex-label-list .label-item")
                .forEach((el) => el.classList.remove("selected", "highlighted-vertex"));
            document
                .querySelectorAll("#vertex-label-panel .label-control-btn")
                .forEach((el) => el.classList.remove("active"));
        });
    }

    showModel(modelId: string) {
        this.eyeX = 0;
        this.eyeY = 0;
        this.eyeZ = -420;
        this.yaw = 0;
        this.pitch = 0;
        this.selectedModel = modelId;
    }

    // ----

    getTitleScreenState(): number {
        throw new Error('Method not implemented.');
    }

    isChatBackInputOpen(): boolean {
        throw new Error('Method not implemented.');
    }

    isShowSocialInput(): boolean {
        throw new Error('Method not implemented.');
    }

    getChatInterfaceId(): number {
        throw new Error('Method not implemented.');
    }

    getViewportInterfaceId(): number {
        throw new Error('Method not implemented.');
    }

    getReportAbuseInterfaceId(): number {
        throw new Error('Method not implemented.');
    }
}
