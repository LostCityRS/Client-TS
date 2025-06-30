import AnimBase from "#/graphics/AnimBase.js";
import AnimFrame from "#/graphics/AnimFrame.js";
import Packet from '#/io/Packet.js';

export default class AnimSet {
  static convertFromData(baseId: number, fileData: Uint8Array) {
    const footer = new Packet(fileData);
    footer.pos = fileData.length - 8;
    const metaDataSize = footer.g2();
    const flagSize = footer.g2();
    const valuesSize = footer.g2();
    const delaysSize = footer.g2();

    const metaData = new Packet(fileData);
    metaData.pos = 0;
    const frameCount = metaData.g2();

    const flagData = new Packet(fileData);
    flagData.pos = metaData.pos + metaDataSize;

    const valueData = new Packet(fileData);
    valueData.pos = flagData.pos + flagSize;

    const delayData = new Packet(fileData);
    delayData.pos = valueData.pos + valuesSize;

    const animBaseData = new Packet(fileData);
    animBaseData.pos = delayData.pos + delaysSize;

    const animBase = AnimBase.convertFromData377(baseId, animBaseData);

    const tempGroups = new Array<number>(500);
    const tempX = new Array<number>(500);
    const tempY = new Array<number>(500);
    const tempZ = new Array<number>(500);

    for (let i = 0; i < frameCount; i++) {
      const frameIndex = metaData.g2();

      const animFrame = new AnimFrame();
      
      animFrame.id = frameIndex;
      animFrame.frameDelay = delayData.g1(); 
      animFrame.base = animBase;

      const transformGroupCount = metaData.g1();
      let lastGroup = -1;
      let tempIndex = 0;

      for (let j = 0; j < transformGroupCount; j++) {
        const transformFlags = flagData.g1();

        if (transformFlags > 0) {
          if (animBase.animTypes![j] !== 0) {
            for (let k = j - 1; k > lastGroup; k--) {
              if (animBase.animTypes![k] === 0) {
                tempGroups[tempIndex] = k;
                tempX[tempIndex] = 0;
                tempY[tempIndex] = 0;
                tempZ[tempIndex] = 0;
                tempIndex++;
                break;
              }
            }
          }

          tempGroups[tempIndex] = j;
          let defaultValue = 0;
          if (animBase.animTypes![tempGroups[tempIndex]] === 3) {
            defaultValue = 128;
          }

          if ((transformFlags & 0x1) == 0) {
            tempX[tempIndex] = defaultValue;
          } else {
            tempX[tempIndex] = valueData.gsmart();
          }

          if ((transformFlags & 0x2) == 0) {
            tempY[tempIndex] = defaultValue;
          } else {
            tempY[tempIndex] = valueData.gsmart();
          }

          if ((transformFlags & 0x4) == 0) {
            tempZ[tempIndex] = defaultValue;
          } else {
            tempZ[tempIndex] = valueData.gsmart();
          }

          lastGroup = j;
          tempIndex++;
        }
      }

      animFrame.frameLength = tempIndex;
      animFrame.bases = new Int32Array(tempIndex);
      animFrame.x = new Int32Array(tempIndex);
      animFrame.y = new Int32Array(tempIndex);
      animFrame.z = new Int32Array(tempIndex);

      for (let l = 0; l < tempIndex; l++) {
        animFrame.bases[l] = tempGroups[l];
        animFrame.x[l] = tempX[l];
        animFrame.y[l] = tempY[l];
        animFrame.z[l] = tempZ[l];
      }
      AnimFrame.instances[frameIndex] = animFrame;
    }
  }
}