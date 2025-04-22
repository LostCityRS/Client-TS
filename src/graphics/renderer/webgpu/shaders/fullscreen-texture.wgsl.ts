export const SHADER_CODE: string = `
@group(0) @binding(0) var textureSampler: sampler;
@group(0) @binding(1) var texture: texture_2d<f32>;

@fragment
fn frag_main(@location(0) TexCoord: vec2f) -> @location(0) vec4f {
  var color = textureSample(texture, textureSampler, TexCoord);
  return color;
}
`;
