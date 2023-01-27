<script lang="ts">
    import type { Subscription } from "rxjs";
    import { onDestroy, onMount } from "svelte";
    import type { InitConfig } from "./init.config";
    import { Labyrinthium } from "./labyrinthium";
	import { createEventDispatcher } from 'svelte';

    export let config: InitConfig;

    let labyrinthium: Labyrinthium;
    let gameStateSubscription: Subscription;

    const dispatch = createEventDispatcher();

    onMount(() => {
        const canvasElement = document.getElementById("game-area") as HTMLCanvasElement;
        const gameContext = canvasElement.getContext("2d");
        labyrinthium = new Labyrinthium(gameContext, config);
        gameStateSubscription = labyrinthium.init().subscribe(() => dispatch('end'));
    })

    onDestroy(() => {
        gameStateSubscription.unsubscribe();
        labyrinthium.destroy();
    })

</script>

<div class="game-container">
    <canvas id="game-area" 
        width={config.canvasWidth}
        height={config.canvasHeight}>
    </canvas>
</div>

<style>
    .game-container {
        display: flex;
        justify-content: center;
    }

    #game-area {
        border: 2px solid black;
    }
</style>