export const SHADER_CODE: string = `
#version 300 es

precision highp float;

uniform highp sampler2D u_frame;

in vec2 v_texCoord;

out vec4 fragColor;

void main() {
    fragColor = texture(u_frame, v_texCoord);
}
`.trim();
