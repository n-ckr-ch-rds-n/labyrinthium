import type { MazeOptions } from "./maze.options";
import type { GridSquare } from "./grid.square";
import type { GridLocation } from "./grid.location";
import { Direction } from "./direction";
import { SquareKind } from "./square.kind";

export class Maze {

    private colourBySquareKind: Record<SquareKind, string> = {
        [SquareKind.Path]: 'white',
        [SquareKind.Wall]: 'green',
        [SquareKind.End]: 'yellow',
        [SquareKind.Start]: 'pink'
    }

    private _layout: GridSquare[][]
    private _startPosition: GridSquare;

    constructor(
        private gameContext: CanvasRenderingContext2D,
        private options: MazeOptions
    ) {
        this._layout = this.build();
    }

    get layout(): GridSquare[][] {
        return this._layout;
    }

    get startPosition() {
        return this._startPosition;
    }

    build(): GridSquare[][] {
        const layout = this.generateLayout();
        const layoutWithRoute = this.toLayoutWithRoute(layout);
        this.drawMaze(layoutWithRoute);
        return layoutWithRoute;
    }

    drawMaze(layout: GridSquare[][]) {
        for (const row of layout) {
            for (const square of row) {
                this.gameContext.fillStyle = this.colourBySquareKind[square.kind];
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

    toLayoutWithRoute(layout: GridSquare[][]): GridSquare[][] {
        let totalSteps = this.toTotalSteps(layout);
        const startPosition = this.toRandomPosition(layout);
        let position = startPosition;
        while (totalSteps >= 0) {
            const numberOfStepsToTake = this.toRandomNumberInRange(1, 5);
            const direction = this.generateDirection();
            for (let i = 0; i <= numberOfStepsToTake; i++) {
                const newPosition = this.toNewPosition(position, direction);
                if (this.positionValid(newPosition, layout)) {
                    position = newPosition;
                    layout[position.row][position.column].kind = SquareKind.Path;
                    totalSteps--;
                }
            }
        }
        layout[position.row][position.column].kind = SquareKind.End;
        layout[startPosition.row][startPosition.column].kind = SquareKind.Start;
        this._startPosition = layout[startPosition.row][startPosition.column];
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
                kind: this.toWallOrPath()
            }))
        });
    }

    private toWallOrPath() {
        const squareKinds = [SquareKind.Path, SquareKind.Wall, SquareKind.Wall];
        return squareKinds[this.toRandomNumberInRange(0, squareKinds.length - 1)];
    }

    private toRandomNumberInRange(min: number, max: number): number {
        return Math.floor(Math.random() * (max - min + 1) + min);
    }

    private toTotalSteps(layout: GridSquare[][]): number {
        return Math.floor(layout.length * layout[0].length / 3);
    }

    private toRandomPosition(layout: GridSquare[][]) {
       return {
            row: this.toRandomNumberInRange(0, layout.length - 1),
            column: this.toRandomNumberInRange(0, layout[0].length - 1)
        }
    }

}