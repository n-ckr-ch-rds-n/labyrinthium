import type { CircleDimensions } from "./circle.dimensions";

export class Wanderer {
    constructor(private gameContext: CanvasRenderingContext2D,
                private dimensions: CircleDimensions) {
        this.gameContext.beginPath();
        this.gameContext.arc(
            100,75,50,0*Math.PI,1.5*Math.PI
        );
        this.gameContext.stroke();
    }
}