<script lang="ts">
    import { Wanderer } from "./wanderer";
	import { Maze } from "./maze";

	const complexity = 100;
	const gameArea: HTMLCanvasElement = document.createElement('canvas');
	const squareWidth = Math.floor(window.innerWidth / complexity);
	gameArea.width = squareWidth * complexity;
	const numberOfRows = Math.floor(window.innerHeight / squareWidth);
    gameArea.height = squareWidth * numberOfRows;
	const container = document.createElement('main');
	container.style.cssText += 'display:flex;justify-content:center;';
	gameArea.style.cssText += 'border: 2px solid black;';
	container.appendChild(gameArea);
	document.body.insertBefore(container, document.body.childNodes[0]);
    const gameContext: CanvasRenderingContext2D = gameArea.getContext("2d");

	const maze = new Maze(gameContext, {
		squareWidth,
		numberOfColumns: complexity,
		numberOfRows
	});
	// maze.build();
	const wanderer = new Wanderer(gameContext, {
		centreX: 100,
		centreY: 100,
		radius: 35
	}, maze);
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
