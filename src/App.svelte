<script lang="ts">
    import { Wanderer } from "./wanderer";


	const gameArea: HTMLCanvasElement = document.createElement('canvas');
	gameArea.width = window.innerWidth;
    gameArea.height = window.innerHeight;
	document.body.insertBefore(gameArea, document.body.childNodes[0]);

    const gameContext: CanvasRenderingContext2D = gameArea.getContext("2d");
	const wanderer = new Wanderer(gameContext, {
		centreX: 100,
		centreY: 100,
		radius: 35
	});
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

</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 240px;
		margin: 0 auto;
	}

	h1 {
		color: #ff3e00;
		text-transform: uppercase;
		font-size: 4em;
		font-weight: 100;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>