import { Direction } from './direction';
import type { GridLocation } from './grid.location';
import type { GridSquare } from './grid.square';
import { SquareKind } from './square.kind';

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

    positionValid(position: GridLocation, layout: GridSquare[][]): boolean {
        return !!(layout[position.row] && layout[position.row][position.column]);
    }

    newPositionValid(position: GridLocation, layout: GridSquare[][]): boolean {
        return this.positionValid(position, layout) && this.positionFree(position, layout);
    }

    private positionFree(position: GridLocation, layout: GridSquare[][]): boolean {
        return [SquareKind.Path, SquareKind.Start, SquareKind.End]
            .includes(layout[position.row][position.column].kind)
    }

}