import type { GridSquare } from "./grid.square";
import { SquareKind } from "./square.kind";

export class DrawService {

    private colourBySquareKind: Record<SquareKind, string> = {
        [SquareKind.Path]: 'black',
        [SquareKind.Wall]: 'green',
        [SquareKind.End]: 'orange',
        [SquareKind.Start]: 'white',
        [SquareKind.Wanderer]: 'blue'
    }

    constructor(private gameContext: CanvasRenderingContext2D,
        private _squareWidth: number) {}

        get squareWidth() {
            return this._squareWidth;
        }

        drawSquare(square: GridSquare) {
            this.gameContext.fillStyle = this.colourBySquareKind[square.kind];
            this.gameContext.fillRect(
                square.x,
                square.y,
                this.squareWidth,
                this.squareWidth);        
        }
}