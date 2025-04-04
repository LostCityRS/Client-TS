export const SHADER_CODE: string = `
#version 300 es

out vec2 v_texCoord;

const vec2 vertices[3] = vec2[3](
    vec2(-1, -1), 
    vec2( 3, -1), 
    vec2(-1,  3)
);

void main() {
    gl_Position = vec4(vertices[gl_VertexID], 0.0, 1.0);
    v_texCoord = gl_Position.xy * 0.5 + 0.5;
}
`.trim();
