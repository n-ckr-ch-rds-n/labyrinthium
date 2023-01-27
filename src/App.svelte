<script lang="ts">  
    import { onMount } from "svelte";
    import Game from "./Game.svelte";
    import type { InitConfig } from "./init.config";
	import RangeSlider from "svelte-range-slider-pips";

	let initConfig: InitConfig;

	onMount(() => {
		const complexity = 100;
		const header = document.getElementById('header');
		const gameAreaHeight = window.innerHeight - header.offsetHeight;
		const squareWidth = Math.floor(header.offsetWidth / complexity);
		const numberOfRows = Math.floor(gameAreaHeight / squareWidth);
		initConfig = {
			squareWidth,
			canvasHeight: squareWidth * numberOfRows,
			canvasWidth: squareWidth * complexity,
			numberOfColumns: complexity,
			numberOfRows
		}
	})
</script>

<main>
	<h1 id="header">LABYRINTHIUM</h1>
	<RangeSlider values={[50]} />
	<div id="game-container">
		{#if initConfig}
			<Game config={initConfig}></Game>
		{/if}
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