import { Shader } from './Shader';
import { WebGLResource } from './WebGLResource';

export function createProgram(ctx: WebGL2RenderingContext, shaders: Iterable<Shader>): ShaderProgram {
    const program: ShaderProgram = new ShaderProgram(ctx);

    for (const shader of shaders) {
        program.attach(shader);
    }

    program.link();

    for (const shader of shaders) {
        shader.delete();
    }

    return program;
}

export class ShaderProgram extends WebGLResource {
    readonly program: WebGLProgram;

    constructor(ctx: WebGL2RenderingContext) {
        super(ctx);

        this.program = ctx.createProgram()!;
    }

    attach(shader: Shader): void {
        this.ctx.attachShader(this.program, shader.shader);
    }

    link(): void {
        const ctx: WebGL2RenderingContext = this.ctx;

        ctx.linkProgram(this.program);

        const success: number = ctx.getProgramParameter(this.program, ctx.LINK_STATUS);

        if (!success) {
            const log: string | null = ctx.getProgramInfoLog(this.program);

            this.delete();

            throw new Error(`Failed to link shader program: ${log}`);
        }
    }

    use(): void {
        this.ctx.useProgram(this.program);
    }

    override delete(): void {
        this.ctx.deleteProgram(this.program);
    }
}
