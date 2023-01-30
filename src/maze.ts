import type { GridSquare } from "./grid.square";
import type { GridLocation } from "./grid.location";
import { Direction } from "./direction";
import { SquareKind } from "./square.kind";
import type { MazeData } from "./maze.data";
import type { MovementService } from "./movement.service";
import type { DrawService } from "./draw.service";
import type { InitConfig } from "./init.config";
import { Utils } from "./utils";

export class Maze {

    constructor(
        private config: InitConfig,
        private movementService: MovementService,
        private drawService: DrawService
    ) {
    }

    build(): MazeData {
        const rawLayout = this.generateLayout();
        const startPosition = this.toRandomPosition(rawLayout);
        const layout = this.toLayoutWithRoute(rawLayout, startPosition);
        this.drawMaze(layout);
        return {
            startPosition,
            layout
        };
    }

    private drawMaze(layout: GridSquare[][]) {
        for (const row of layout) {
            for (const square of row) {
                this.drawService.drawSquare(square)
            }
        }
    }

    private toLayoutWithRoute(layout: GridSquare[][], startPosition: GridLocation): GridSquare[][] {
        let totalSteps = this.toTotalSteps(layout);
        let position = startPosition;
        while (totalSteps >= 0) {
            const numberOfStepsToTake = Utils.toRandomNumberInRange(3, 8);
            const direction = this.generateDirection();
            for (let i = 0; i <= numberOfStepsToTake; i++) {
                const newPosition = this.movementService.toNewPosition(position, direction);
                if (this.movementService.positionValid(newPosition, layout)) {
                    position = newPosition;
                    layout[position.row][position.column].kind = SquareKind.Path;
                    totalSteps--;
                }
            }
        }
        layout[position.row][position.column].kind = SquareKind.End;
        layout[startPosition.row][startPosition.column].kind = SquareKind.Start;
        return layout;
    }

   private generateDirection(): Direction {
        const directions = Object.values(Direction);
        return directions[Utils.toRandomNumberInRange(0, directions.length - 1)];
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
        const rnd = Utils.toRandomNumberInRange(1, 3);
        return rnd > 1 ? SquareKind.Wall : SquareKind.Path
    }

    private toTotalSteps(layout: GridSquare[][]): number {
        return Math.floor(layout.length * layout[0].length / 3);
    }

    private toRandomPosition(layout: GridSquare[][]) {
       return {
            row: Utils.toRandomNumberInRange(0, layout.length - 1),
            column: Utils.toRandomNumberInRange(0, layout[0].length - 1)
        }
    }

}