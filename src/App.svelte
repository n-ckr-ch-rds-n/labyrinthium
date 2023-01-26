<script lang="ts">  
    import Game from "./Game.svelte";
    import type { InitConfig } from "./init.config";

	const complexity = 300;
	const squareWidth = Math.floor(window.innerWidth / complexity);
	const numberOfRows = Math.floor(window.innerHeight / squareWidth);
	const initConfig: InitConfig = {
		squareWidth,
		canvasHeight: squareWidth * numberOfRows,
		canvasWidth: squareWidth * complexity,
		numberOfColumns: complexity,
		numberOfRows
	}
</script>

<main>
	<h1 class="header">LABYRINTHIUM</h1>
	<div class="game-container">
		<Game config={initConfig}></Game>
	</div>
</main>

<style>

@font-face {
    font-family: "Arcade";
    src: url("../assets/ARCADECLASSIC.TTF");
}

main {
	background-color: black;
	height: 100%;
}

h1 {
	text-align: center;
	font-family: 'Arcade';
	color: green;
	font-size: 5em;
	margin: 0;
}

</style>