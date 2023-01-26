import { MovementService } from "./movement.service";
import { DrawService } from "./draw.service";    
import type { InitConfig } from "./init.config";
import { Maze } from "./maze";
import { Wanderer } from "./wanderer";

export class Labyrinthium {
    constructor(private gameContext: CanvasRenderingContext2D,
        private config: InitConfig) {}

    init() {
        const movementService = new MovementService();
        const drawService = new DrawService(this.gameContext, this.config.squareWidth);
        const maze = new Maze(this.config, movementService, drawService);
        const mazeData = maze.build();
        const wanderer = new Wanderer(mazeData, movementService, drawService);
    }
}