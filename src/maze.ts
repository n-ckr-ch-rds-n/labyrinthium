import type { GridSquare } from "./grid.square";
import type { GridLocation } from "./grid.location";
import { Direction } from "./direction";
import { SquareKind } from "./square.kind";
import type { MazeData } from "./maze.data";
import type { MovementService } from "./movement.service";
import type { DrawService } from "./draw.service";
import type { InitConfig } from "./init.config";

export class Maze {

    private startPosition: GridLocation;

    constructor(
        private config: InitConfig,
        private movementService: MovementService,
        private drawService: DrawService
    ) {
    }

    build(): MazeData {
        const layout = this.generateLayout();
        const layoutWithRoute = this.toLayoutWithRoute(layout);
        this.drawMaze(layoutWithRoute);
        return {
            startPosition: this.startPosition,
            layout: layoutWithRoute,
        };
    }

    private drawMaze(layout: GridSquare[][]) {
        for (const row of layout) {
            for (const square of row) {
                this.drawService.drawSquare(square)
            }
        }
    }

    private toLayoutWithRoute(layout: GridSquare[][]): GridSquare[][] {
        let totalSteps = this.toTotalSteps(layout);
        this.startPosition = this.toRandomPosition(layout);
        let position = this.startPosition;
        while (totalSteps >= 0) {
            const numberOfStepsToTake = this.toRandomNumberInRange(3, 8);
            const direction = this.generateDirection();
            for (let i = 0; i <= numberOfStepsToTake; i++) {
                const newPosition = this.movementService.toNewPosition(position, direction);
                if (this.positionValid(newPosition, layout)) {
                    position = newPosition;
                    layout[position.row][position.column].kind = SquareKind.Path;
                    totalSteps--;
                }
            }
        }
        layout[position.row][position.column].kind = SquareKind.End;
        layout[this.startPosition.row][this.startPosition.column].kind = SquareKind.Start;
        return layout;
    }

    private positionValid(position: GridLocation, layout: GridSquare[][]): boolean {
        return !!(layout[position.row] && layout[position.row][position.column]);
    }

   private generateDirection(): Direction {
        const directions = Object.values(Direction);
        return directions[this.toRandomNumberInRange(0, directions.length - 1)];
    }

    private generateLayout(): GridSquare[][] {
        return [...Array(this.config.numberOfRows)].map((a, i) => {
            const y = i * this.drawService.squareWidth;
            return [...Array(this.config.numberOfColumns)].map((a, i) => ({
                y, x: i * this.drawService.squareWidth,
                kind: this.toWallOrPath()
            }))
        });
    }

    private toWallOrPath() {
        const rnd = this.toRandomNumberInRange(1, 3);
        return rnd > 1 ? SquareKind.Wall : SquareKind.Path
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