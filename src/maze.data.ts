import type { GridLocation } from "./grid.location";
import type { GridSquare } from "./grid.square";

export interface MazeData {
    layout: GridSquare[][];
    startPosition: GridLocation;
}
