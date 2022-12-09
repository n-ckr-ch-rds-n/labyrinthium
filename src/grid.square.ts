import type { SquareKind } from "./square.kind";

export interface GridSquare {
    x: number;
    y: number;
    kind: SquareKind;
}
