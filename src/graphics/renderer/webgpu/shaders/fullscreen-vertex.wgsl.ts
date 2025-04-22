export const SHADER_CODE: string = `
struct VertexOutput {
  @builtin(position) Position: vec4f,
  @location(0) TexCoord: vec2f,
};

@vertex
fn vert_main(@builtin(vertex_index) VertexIndex: u32) -> VertexOutput {
  var pos = array(
    vec2f(-1,  3),
    vec2f( 3, -1),
    vec2f(-1, -1),
  );

  var output: VertexOutput;
  output.Position = vec4f(pos[VertexIndex], 0.0, 1.0);
  output.TexCoord = pos[VertexIndex] * 0.5 + 0.5;
  output.TexCoord.y = 1.0 - output.TexCoord.y;
  return output;
}
`;
