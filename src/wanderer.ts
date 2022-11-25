export class Wanderer {
    constructor(private gameContext: CanvasRenderingContext2D) {
        this.gameContext.beginPath();
        this.gameContext.arc(100, 100, 70, 0, 2 * Math.PI);
        this.gameContext.stroke();
    }
}