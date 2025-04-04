export const canvasContainer: HTMLElement = document.getElementById('game')!;
export const canvasOverlay: HTMLElement = document.getElementById('canvas-overlay')!;

export const canvas: HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement;
export const canvas2d: CanvasRenderingContext2D = canvas.getContext('2d', { willReadFrequently: true })!;

export const jpegCanvas: HTMLCanvasElement = document.createElement('canvas');
export const jpegImg: HTMLImageElement = document.createElement('img');
export const jpeg2d: CanvasRenderingContext2D = jpegCanvas.getContext('2d', { willReadFrequently: true })!;
