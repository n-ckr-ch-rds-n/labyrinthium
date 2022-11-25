import type { CircleDimensions } from "./circle.dimensions";

export class Wanderer {

    private position: {centreX: number; centreY: number};
    private squareWidth: number;

    constructor(private gameContext: CanvasRenderingContext2D,
                private dimensions: CircleDimensions) {
        const {centreX, centreY} = this.dimensions;
        this.position = {centreX, centreY};
        this.squareWidth = this.dimensions.radius * 4;
        this.drawCircle({centreX, centreY});
    }

    moveDown() {
        this.clearSquare();
        this.position.centreY = this.position.centreY + this.squareWidth;
        this.drawCircle(this.position);
    }

    moveUp() {
        this.clearSquare();
        this.position.centreY = this.position.centreY - this.squareWidth;
        this.drawCircle(this.position);
    }

    moveRight() {
        this.clearSquare();
        this.position.centreX = this.position.centreX + this.squareWidth;
    }

    private drawCircle(request: {centreX: number; centreY: number}) {
        this.gameContext.beginPath();
        const {centreX, centreY} = request;
        this.gameContext.arc(centreX, centreY, this.dimensions.radius, 0, 3 * Math.PI);
        this.gameContext.stroke();
    }

    private clearSquare() {
        const squareRadius = this.dimensions.radius * 2;
        this.gameContext.clearRect(this.position.centreX - squareRadius, 
            this.position.centreY - squareRadius, 
            this.squareWidth, this.squareWidth)
    }
}