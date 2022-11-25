import type { MazeOptions } from "./maze.options";

export class Maze {

    constructor(private gameContext: CanvasRenderingContext2D,
        private options: MazeOptions) {}

    build() {
        const layout = [...Array(this.options.numberOfRows)].map((a, i) => {
            const y = i * this.options.squareWidth;
            return [...Array(this.options.numberOfColumns)].map((a, i) => ({
                y, x: i * this.options.squareWidth
            }))
        });
        for (const row of layout) {
            for (const square of row) {
                this.gameContext.fillStyle = 'green';
                const {squareWidth} = this.options;
                this.gameContext.fillRect(square.x, square.y, squareWidth, squareWidth);
            }
        }
    }

}