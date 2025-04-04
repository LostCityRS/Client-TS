import { WebGLResource } from './WebGLResource';

export class Shader extends WebGLResource {
    readonly shader: WebGLShader;

    constructor(ctx: WebGL2RenderingContext, type: number, source: string) {
        super(ctx);

        const shader: WebGLShader = ctx.createShader(type)!;

        ctx.shaderSource(shader, source);

        ctx.compileShader(shader);

        const success: number = ctx.getShaderParameter(shader, ctx.COMPILE_STATUS);

        if (!success) {
            const log: string | null = ctx.getShaderInfoLog(shader);

            ctx.deleteShader(shader);

            throw Error(`Failed to compile WebGL shader:\n${log}`);
        }

        this.shader = shader;
    }

    override delete(): void {
        this.ctx.deleteShader(this.shader);
    }
}
