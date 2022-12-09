import type { MazeOptions } from "./maze.options";
import type { GridSquare } from "./grid.square";
import type { GridLocation } from "./grid.location";
import { Direction } from "./direction";

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
        let totalSteps = this.toTotalSteps(layout);
        let position: GridLocation = {
            row: layout.length - 1,
            column: 0
        };
        while (totalSteps >= 0) {
            const numberOfStepsToTake = this.toRandomNumberInRange(1, 5);
            const direction = this.generateDirection();
            console.log(direction);
            for (let i = 0; i <= numberOfStepsToTake; i++) {
                layout[position.row][position.column].fillStyle = 'white';
                const newPosition = this.toNewPosition(position, direction);
                if (this.positionValid(newPosition, layout)) {
                    position = newPosition;
                    totalSteps--;
                }
                console.log(position);
            }
        }
        return layout;
    }

    positionValid(position: GridLocation, layout: GridSquare[][]): boolean {
        return !!(layout[position.row] && layout[position.row][position.column]);
    }

    generateDirection(): Direction {
        const directions = Object.values(Direction);
        return directions[this.toRandomNumberInRange(0, directions.length - 1)];
    }

    toNewPosition(currentPosition: GridLocation, direction: Direction): GridLocation {
        const newPositionByDirection: Record<Direction, GridLocation> = {
            [Direction.North]: {...currentPosition, row: currentPosition.row - 1},
            [Direction.South]: {...currentPosition, row: currentPosition.row + 1},
            [Direction.East]: {...currentPosition, column: currentPosition.column + 1},
            [Direction.West]: {...currentPosition, column: currentPosition.column - 1}
        }
        return newPositionByDirection[direction];
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

    private toRandomNumberInRange(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    private toTotalSteps(layout: GridSquare[][]): number {
        return Math.floor(layout.length * layout[0].length / 3);
    }

}