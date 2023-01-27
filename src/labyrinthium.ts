import { MovementService } from "./movement.service";
import { DrawService } from "./draw.service";    
import type { InitConfig } from "./init.config";
import { Maze } from "./maze";
import { Wanderer } from "./wanderer";
import { fromEvent, Observable, throttleTime, filter, map, Subscription, Subject } from 'rxjs';
import { ControlKey } from "./control.key";
import { Direction } from "./direction";
import type { GameState } from "./game.state";

export class Labyrinthium {

    private keyEventObservable: Observable<ControlKey>;
    private controlSubscription: Subscription;

    private directionByKey: Record<ControlKey, Direction> = {
        [ControlKey.ArrowDown]: Direction.South,
        [ControlKey.ArrowLeft]: Direction.West,
        [ControlKey.ArrowRight]: Direction.East,
        [ControlKey.ArrowUp]: Direction.North
    }
    
    constructor(private gameContext: CanvasRenderingContext2D,
        private config: InitConfig) {}

    init() {
        const movementService = new MovementService();
        const drawService = new DrawService(this.gameContext, this.config.squareWidth);
        const maze = new Maze(this.config, movementService, drawService);
        const mazeData = maze.build();
        const gameState = new Subject<GameState>();
        const wanderer = new Wanderer(mazeData, movementService, drawService, gameState);
        this.initialiseControls(wanderer);
        return gameState;
    }

    destroy() {
        if (this.controlSubscription) {
            this.controlSubscription.unsubscribe();
        }
    }

    private initialiseControls(wanderer: Wanderer) {
        this.keyEventObservable = this.generateObservable();
        this.controlSubscription = this.toKeySubscription(wanderer);
    }

    private generateObservable(): Observable<ControlKey> {
        return this.keyEventObservable || fromEvent(document, 'keydown').pipe(
            throttleTime(100),
            filter((e: KeyboardEvent) => Object.values(ControlKey).includes(e.code as ControlKey)),
            map((e: KeyboardEvent) => e.code as ControlKey)
        );
    }

    private toKeySubscription(wanderer: Wanderer): Subscription {
        this.destroy();
        return this.keyEventObservable.subscribe((key: ControlKey) => {
            wanderer.moveWanderer(this.directionByKey[key]);
        })
    }
}