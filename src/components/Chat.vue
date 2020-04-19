<template>
  <div class="content">
    <div class="messages">
      <div v-for="(message, index) in messages" v-bind:key="index">
        {{message.author}}: {{message.text}}
      </div>
    </div>
    <form class="footer" onsubmit="return false;">
      <input type="text" v-model="inputText">
      <button v-on:click="sendMessage" type="submit">Send</button>
    </form>
  </div>
</template>

<script lang="ts">
import Vue from 'vue'
import {connectToRoom, session, connection} from '../webrtc/connectToRoom'

export default Vue.extend({
  name: 'Chat',
  data() {
    return {
      messages: [] as {text: string, author: string}[],
      inputText: "",
      session: null as null | session,
      connection: null as null | connection,
      name: "b0b0"
    }
  },
  async mounted() {
    this.session = await connectToRoom('room')

    if (this.session.isServer) {
      this.connection = this.session.client
    } else {
      this.connection = this.session.server
    }

    this.connection.onmessage = (e) => {
      this.messages.push(JSON.parse(e.data))
    }
  },
  methods: {
    sendMessage() {
      const message = {
        text: this.inputText,
        author: this.name
      }
      this.connection?.send(JSON.stringify(message))
      this.messages.push(message)
      this.inputText = ''
    },
  }
})
</script>
