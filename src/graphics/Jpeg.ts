import { jpeg2d, jpegCanvas, jpegImg } from '#/graphics/Canvas.js';
import { toBlobPart } from '#/util/blob.js';

export async function decodeJpeg(data: Uint8Array): Promise<ImageData> {
    if (data[0] !== 0xff) {
        // fix invalid JPEG header
        data[0] = 0xff;
    }

    URL.revokeObjectURL(jpegImg.src); // Remove previous decoded jpeg.
    jpegImg.src = URL.createObjectURL(new Blob([toBlobPart(data)], { type: 'image/jpeg' }));

    // wait for img to load
    await new Promise<void>((resolve): (() => void) => (jpegImg.onload = (): void => resolve()));

    // Clear the canvas before drawing
    jpeg2d.clearRect(0, 0, jpegCanvas.width, jpegCanvas.height);

    const width: number = jpegImg.naturalWidth;
    const height: number = jpegImg.naturalHeight;
    jpegCanvas.width = width;
    jpegCanvas.height = height;

    // Draw the image
    jpeg2d.drawImage(jpegImg, 0, 0);
    return jpeg2d.getImageData(0, 0, width, height);
}
