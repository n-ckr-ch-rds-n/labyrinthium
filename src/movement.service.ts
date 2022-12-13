import { Direction } from './direction';
import type { GridLocation } from './grid.location';

export class MovementService {

    private newPositionByDirection: Record<Direction, (currentPosition: GridLocation) => GridLocation> = {
        [Direction.North]: (currentPosition) => ({...currentPosition, row: currentPosition.row - 1}),
        [Direction.South]: (currentPosition) => ({...currentPosition, row: currentPosition.row + 1}),
        [Direction.East]: (currentPosition) => ({...currentPosition, column: currentPosition.column + 1}),
        [Direction.West]: (currentPosition) => ({...currentPosition, column: currentPosition.column - 1})
    }

    toNewPosition(currentPosition: GridLocation, direction: Direction): GridLocation {
        return this.newPositionByDirection[direction](currentPosition);
    }
    
}