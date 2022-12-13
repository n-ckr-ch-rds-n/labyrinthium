import { SquareKind } from "./square.kind";

export const colourBySquareKind: Record<SquareKind, string> = {
    [SquareKind.Path]: 'black',
    [SquareKind.Wall]: 'green',
    [SquareKind.End]: 'orange',
    [SquareKind.Start]: 'pink'
}