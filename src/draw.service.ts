import type { GridSquare } from "./grid.square";
import { SquareKind } from "./square.kind";

export class DrawService {

    private colourBySquareKind: Record<SquareKind, string> = {
        [SquareKind.Path]: 'black',
        [SquareKind.Wall]: 'green',
        [SquareKind.End]: 'orange',
        [SquareKind.Start]: 'pink',
        [SquareKind.Wanderer]: 'pink'
    }

    constructor(private gameContext: CanvasRenderingContext2D,
        private squareWidth: number) {}

        drawSquare(square: GridSquare) {
            this.gameContext.fillStyle = this.colourBySquareKind[square.kind];
            this.gameContext.fillRect(
                square.x,
                square.y,
                this.squareWidth,
                this.squareWidth);        
        }
}