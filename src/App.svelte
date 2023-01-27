<script lang="ts">  
    import { onMount } from "svelte";
    import Game from "./Game.svelte";
    import type { InitConfig } from "./init.config";
	import RangeSlider from "svelte-range-slider-pips";

	let initConfig: InitConfig;
	let complexity = [150];

	const setupGame = () => {
		const header = document.getElementById('header');
		const numberOfColumns = complexity[0];
		const gameAreaHeight = window.innerHeight - header.offsetHeight - 50;
		const squareWidth = Math.floor(header.offsetWidth / numberOfColumns);
		const numberOfRows = Math.floor(gameAreaHeight / squareWidth);
		initConfig = {
			squareWidth,
			canvasHeight: squareWidth * numberOfRows,
			canvasWidth: squareWidth * numberOfColumns,
			numberOfColumns,
			numberOfRows
		}
	}

	onMount(() => setupGame())

</script>

<main>
	<div id="header">
		<h1>LABYRINTHIUM</h1>
		<div class="slider-container">
			<RangeSlider min={50} max={300} 
			bind:values={complexity}
			on:change={setupGame}/>
		</div>
	</div>
	<div id="game-container">
		{#if initConfig}
			{#key initConfig}
				<Game config={initConfig} on:end={setupGame}></Game>
			{/key}
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

	.slider-container {
		display: flex;
		justify-content: center;
		margin-bottom: 20px;
	}

</style>