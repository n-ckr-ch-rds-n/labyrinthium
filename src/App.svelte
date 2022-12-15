<script lang="ts">
    import { Wanderer } from "./wanderer";
	import { Maze } from "./maze";
    import { MovementService } from "./movement.service";
    import { DrawService } from "./draw.service";    

	const complexity = 300;
	const gameArea: HTMLCanvasElement = document.createElement('canvas');
	const squareWidth = Math.floor(window.innerWidth / complexity);
	gameArea.width = squareWidth * complexity;
	const numberOfRows = Math.floor(window.innerHeight / squareWidth);
    gameArea.height = squareWidth * numberOfRows;
	const container = document.createElement('div');
	container.style.cssText += 'display:flex;justify-content:center;';
	gameArea.style.cssText += 'border: 2px solid black;';
	container.appendChild(gameArea);
	document.body.insertBefore(container, document.body.childNodes[0]);
    const gameContext: CanvasRenderingContext2D = gameArea.getContext("2d");
	const movementService = new MovementService();
	const drawService = new DrawService(gameContext, squareWidth);

	const maze = new Maze({
		numberOfColumns: complexity,
		numberOfRows,
	}, movementService, drawService);
	const mazeData = maze.build();
	const wanderer = new Wanderer(mazeData, movementService, drawService);
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
</script>

<main>
	<h1 class="header">HELLO THERE</h1>
</main>

<style>

@font-face {
        font-family: "Arcade";
        src: url("../assets/ARCADECLASSIC.TTF");
    }

	h1 {
		font-family: 'Arcade';
	}
</style>