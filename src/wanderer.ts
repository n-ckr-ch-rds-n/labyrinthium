import type { CircleDimensions } from "./circle.dimensions";
import type { Position } from "./position";

export class Wanderer {

    private position: Position;
    private squareWidth: number;

    constructor(private gameContext: CanvasRenderingContext2D,
                private dimensions: CircleDimensions) {
        const {centreX, centreY} = this.dimensions;
        this.position = {centreX, centreY};
        this.squareWidth = this.dimensions.radius * 4;
        this.drawCircle({centreX, centreY});
    }

    moveDown() {
        this.move({
            ...this.position,
            centreY: this.position.centreY + this.squareWidth
        });
    }

    moveUp() {
        this.move({
            ...this.position,
            centreY: this.position.centreY - this.squareWidth
        });
    }

    moveRight() {
        this.move({
            ...this.position,
            centreX: this.position.centreX + this.squareWidth,
        });
    }


    moveLeft() {
        this.move({
            ...this.position,
            centreX: this.position.centreX - this.squareWidth,
        });
    }

    private move(position: Position) {
        this.clearSquare();
        this.drawCircle(position);
        this.position = position;
    }

    private drawCircle(position: Position) {
        this.gameContext.beginPath();
        const {centreX, centreY} = position;
        this.gameContext.arc(centreX, centreY, this.dimensions.radius, 0, 3 * Math.PI);
        this.gameContext.stroke();
    }

    private clearSquare() {
        const squareRadius = this.dimensions.radius * 2;
        this.gameContext.clearRect(this.position.centreX - squareRadius, 
            this.position.centreY - squareRadius, 
            this.squareWidth, this.squareWidth);
        // this.gameContext.beginPath();
        // this.gameContext.rect(this.position.centreX - squareRadius, 
        //     this.position.centreY - squareRadius, 
        //     this.squareWidth, this.squareWidth);
        //     this.gameContext.stroke();
    }
}