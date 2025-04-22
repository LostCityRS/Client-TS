import { UNPACK_COLOR888 } from './commons.wgsl';

export const SHADER_CODE: string = `
struct PixelBuffer {
  data: array<u32>,
};

struct Uniforms {
  screenWidth: f32,
  screenHeight: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var<storage, read> pixelBuffer: PixelBuffer;

${UNPACK_COLOR888}

@fragment
fn frag_main(@location(0) TexCoord: vec2f) -> @location(0) vec4f {
  let coord = floor(vec2f(TexCoord.x * uniforms.screenWidth, TexCoord.y * uniforms.screenHeight));
  let index = u32(coord.y * uniforms.screenWidth + coord.x);

  let finalColor = vec4f(unpackColor888(pixelBuffer.data[index]), 1.0);
  return finalColor;
}

`;
