<script lang="ts">
    import { onMount } from "svelte";
    import type { InitConfig } from "./init.config";
    import { Labyrinthium } from "./labyrinthium";

    export let config: InitConfig;

    const startGame = (config: InitConfig) => {
        const canvasElement = document.getElementById("game-area") as HTMLCanvasElement;
        const gameContext = canvasElement.getContext("2d");
        const labyrinthium = new Labyrinthium(gameContext, config);
        labyrinthium.init().subscribe(state => console.log(state));  
    }

    onMount(() => startGame(config))

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