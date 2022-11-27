import type { MazeOptions } from "./maze.options";
import type { GridSquare } from "./grid.square";
import type { GridLocation } from "./grid.location";

export class Maze {

    constructor(private gameContext: CanvasRenderingContext2D,
        private options: MazeOptions) {}

    build() {
        const layout = this.generateLayout();
        const route = this.toRoute(layout);
        for (const row of route) {
            for (const square of row) {
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

    toRoute(layout: GridSquare[][]): GridSquare[][] {
        const routeLength = Math.floor(layout.length * layout[0].length / 3);
        let routeSquare: GridLocation = {
            row: layout.length - 1,
            column: 0
        };
        for (let i = 0; i <= routeLength; i ++) {
            layout[routeSquare.row][routeSquare.column].fillStyle = 'white';
            routeSquare = this.toRouteNext(layout, routeSquare);
        }
        return layout;
    } 

    toRouteNext(layout: GridSquare[][], currentLocation: GridLocation): GridLocation {
        const options: GridLocation[] = [
            {...currentLocation, row: currentLocation.row + 1},
            {...currentLocation, row: currentLocation.row - 1},
            {...currentLocation, column: currentLocation.column + 1},
            {...currentLocation, column: currentLocation.column - 1}
        ].filter(o => layout[o.row] && layout[o.row][o.column]);
        const optionIndex = this.toRandomIndex(0, options.length - 1);
        return options[optionIndex];
    }

    private generateLayout(): GridSquare[][] {
        return [...Array(this.options.numberOfRows)].map((a, i) => {
            const y = i * this.options.squareWidth;
            return [...Array(this.options.numberOfColumns)].map((a, i) => ({
                y, x: i * this.options.squareWidth,
                fillStyle: 'green'
            }))
        });
    }

    private toRandomIndex(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

}