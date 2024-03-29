import type { MazeData } from "./maze.data";
import type { GridLocation } from "./grid.location";
import type { GridSquare } from "./grid.square";
import type { MovementService } from "./movement.service";
import type { Direction } from "./direction";
import { SquareKind } from "./square.kind";
import type { DrawService } from "./draw.service";
import type { Subject } from "rxjs";
import { GameState } from "./game.state";

export class Wanderer {

    private location: GridLocation;

    constructor(private maze: MazeData,
                private movementService: MovementService,
                private drawService: DrawService,
                private gameState: Subject<GameState>) {
        this.location = {...this.maze.startPosition};
        const startSquare: GridSquare = this.maze.layout[this.location.row][this.location.column];
        this.drawWanderer(startSquare.x, startSquare.y);
    }

    moveWanderer(direction: Direction) {
        const newPosition = this.movementService.toNewPosition(this.location, direction);
        if (this.movementService.newPositionValid(newPosition, this.maze.layout)) {
            this.clearSquare(this.location);
            const newSquare = this.maze.layout[newPosition.row][newPosition.column];
            this.drawWanderer(newSquare.x, newSquare.y);
            this.location = newPosition;
            if (newSquare.kind === SquareKind.End) {
                this.gameState.next(GameState.End);
            }
        }
    }

    private drawWanderer(x: number, y: number) {
        this.drawService.drawSquare({x, y, kind: SquareKind.Wanderer});
    }

    private clearSquare(oldPosition: GridLocation) {
        const squareToClear = this.maze.layout[oldPosition.row][oldPosition.column];
        this.drawService.drawSquare(squareToClear);
    }

}