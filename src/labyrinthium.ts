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
        this.initialiseControls(wanderer);
    }

    private initialiseControls(wanderer: Wanderer) {
        document.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowDown') {
                wanderer.moveDown();
            }
            if (e.code === 'ArrowUp') {
                wanderer.moveUp();
            }
            if (e.code === 'ArrowRight') {
                wanderer.moveRight();
            }
            if (e.code === 'ArrowLeft') {
                wanderer.moveLeft();
            }
        })
    }
}