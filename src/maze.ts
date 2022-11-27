import type { MazeOptions } from "./maze.options";
import type { GridSquare } from "./grid.square";
import type { Route } from "./route";
import type { GridLocation } from "./grid.location";

export class Maze {

    constructor(private gameContext: CanvasRenderingContext2D,
        private options: MazeOptions) {}

    build() {
        const layout = this.generateLayout();
        const route = this.toRoute(layout);
        console.log(route);
        for (const row of route) {
            for (const square of row) {
                console.log(square);
                this.gameContext.fillStyle = square.fillStyle;
                const {squareWidth} = this.options;
                this.gameContext.fillRect(
                    square.x,
                    square.y,
                    squareWidth,
                    squareWidth
                    );
            }
        }
    }

    toRoute(layout): Route[][] {
        const shadedSquares = layout.map(row => row
            .map(square => ({...square, fillStyle: 'green'})));
        const initRow = layout.length - 1;
        const initCol = 0;
        const startPosition = layout[layout.length - 1][0];
        const nextPositionOptions = []
        return shadedSquares;
    }

    toRouteNext(layout: GridSquare[][], currentLocation: GridLocation): GridLocation {
        const options: GridLocation[] = [
            {...currentLocation, row: currentLocation.row + 1},
            {...currentLocation, row: currentLocation.row = 1},
            {...currentLocation, column: currentLocation.column + 1},
            {...currentLocation, column: currentLocation.column + 1}
        ].filter(o => !!layout[o.row][o.column]);
        const optionIndex = Math.floor(Math.random() * (options.length - 0 + 1) + 0);
        return options[optionIndex];
    }

    private generateLayout(): GridSquare[][] {
        return [...Array(this.options.numberOfRows)].map((a, i) => {
            const y = i * this.options.squareWidth;
            return [...Array(this.options.numberOfColumns)].map((a, i) => ({
                y, x: i * this.options.squareWidth
            }))
        });
    }

}