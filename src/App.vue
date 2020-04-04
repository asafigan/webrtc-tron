<template>
  <div id="app">
    <Game :key="main"/>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Game from './components/Game.vue';

export default Vue.extend({
  name: 'App',
  components: {
    Game
  }
});
</script>

<style>
body {
  margin: 0;
  width: 100vw;
  height: 100vh;
  display: grid;
  justify-content: center;
  align-items: center;
}
</style>
