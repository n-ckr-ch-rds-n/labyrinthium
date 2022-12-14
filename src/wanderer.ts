import type { MazeData } from "./maze.data";
import type { GridLocation } from "./grid.location";
import type { GridSquare } from "./grid.square";
import type { MovementService } from "./movement.service";
import { Direction } from "./direction";
import { SquareKind } from "./square.kind";
import type { DrawService } from "./draw.service";

export class Wanderer {

    private location: GridLocation;

    constructor(private maze: MazeData,
                private movementService: MovementService,
                private drawService: DrawService) {
        this.location = {...this.maze.startPosition};
        const startSquare: GridSquare = this.maze.layout[this.location.row][this.location.column];
        this.drawWanderer(startSquare.x, startSquare.y);
    }

    drawWanderer(x: number, y: number) {
        this.drawService.drawSquare({x, y, kind: SquareKind.Wanderer});
    }

    moveDown() {
        const newPosition = this.movementService.toNewPosition(this.location, Direction.South)
        this.moveWanderer(newPosition);
    }

    moveUp() {
        const newPosition = this.movementService.toNewPosition(this.location, Direction.North)
        this.moveWanderer(newPosition);
    }

    moveRight() {
        const newPosition = this.movementService.toNewPosition(this.location, Direction.East)
        this.moveWanderer(newPosition);
    }


    moveLeft() {
        const newPosition = this.movementService.toNewPosition(this.location, Direction.West);
        this.moveWanderer(newPosition);
    }

    private clearSquare(oldPosition: GridLocation) {
        const squareToClear = this.maze.layout[oldPosition.row][oldPosition.column];
        this.drawService.drawSquare(squareToClear);
    }

    private newPositionValid(newPosition: GridLocation) {
        return this.maze.layout[newPosition.row]
            && this.maze.layout[newPosition.row][newPosition.column]
            && [SquareKind.Path, SquareKind.Start, SquareKind.End].includes(this.maze.layout[newPosition.row][newPosition.column].kind)
    }

    private moveWanderer(newPosition: GridLocation) {
        if (this.newPositionValid(newPosition)) {
            this.clearSquare(this.location);
            const newSquare = this.maze.layout[newPosition.row][newPosition.column];
            this.drawWanderer(newSquare.x, newSquare.y);
            this.location = newPosition;
        }
    }
}