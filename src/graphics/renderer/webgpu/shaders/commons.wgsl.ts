export const UNPACK_COLOR888: string = `
fn unpackColor888(rgb: u32) -> vec3f {
  let r = f32((rgb >> 16) & 0xff) / 255.0;
  let g = f32((rgb >> 8) & 0xff) / 255.0;
  let b = f32(rgb & 0xff) / 255.0;
  return vec3f(r, g, b);
}
`;
