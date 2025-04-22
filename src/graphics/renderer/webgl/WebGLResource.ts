export abstract class WebGLResource {
    constructor(readonly ctx: WebGL2RenderingContext) { }

    abstract delete(): void;
}
