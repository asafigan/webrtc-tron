<template>
  <div id="app">
    <!-- <Game :key="main"/> -->
    <Chat/>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
// import Game from './components/Game.vue';
import Chat from './components/Chat.vue'

export default Vue.extend({
  name: 'App',
  components: {
    // Game,
    Chat,
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
