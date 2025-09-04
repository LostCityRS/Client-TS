export default class QuickGround {
    readonly southwestColor: number;
    readonly southeastColor: number;
    readonly northeastColor: number;
    readonly northwestColor: number;
    readonly textureId: number;
    readonly colour: number;
    readonly flat: boolean;

    constructor(southwestColor: number, southeastColor: number, northeastColor: number, northwestColor: number, textureId: number, color: number, flat: boolean) {
        this.southwestColor = southwestColor;
        this.southeastColor = southeastColor;
        this.northeastColor = northeastColor;
        this.northwestColor = northwestColor;
        this.textureId = textureId;
        this.colour = color;
        this.flat = flat;
    }
}
