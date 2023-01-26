<script lang="ts">
    import { onMount } from "svelte";

    export let canvasWidth: number;
    export let canvasHeight: number;

    onMount(() => {
        const canvasElement = document.getElementById("gameArea") as HTMLCanvasElement;
        const gameContext = canvasElement.getContext("2d");
    })

</script>

<div id="game-container">
    <canvas id="gameArea" width={canvasWidth} height={canvasHeight}></canvas>
</div>

<style>
    #game-container {
        display: flex;
        justify-content: center;
    }
</style>