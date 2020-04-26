<template>
  <canvas ref="canvas"/>
</template>

<script lang="ts">
import Vue from 'vue';
import { connectToRoom, session, connection } from '../webrtc/connectToRoom'
import { CombinedVueInstance } from 'vue/types/vue';

enum Direction {
  up = -1,
  down = 1,
  left = 2,
  right = -2,
}

interface State {
  worldDemensions: {
    width: number;
    height: number;
  };
  players: Player[];
  ended: boolean;
}

interface Player {
  color: string;
  alive: boolean;
  direction: Direction;
  body: {
    x: number;
    y: number;
  }[];
}

const controls: {[key in string]?: Direction} = {
  ArrowUp: Direction.up,
  ArrowDown: Direction.down,
  ArrowLeft: Direction.left,
  ArrowRight: Direction.right,
}

const size = 10

export default Vue.extend({
  name: 'Game',
  data(): {
    context: CanvasRenderingContext2D | null;
    key: null | string;
    keyboardListener: null | ((e: KeyboardEvent) => void);
    requestFrame: null | number;
    session: null | session;
    direction: null | Direction;
  } {
    return {
      context: null,
      key: null,
      keyboardListener: null,
      requestFrame: null,
      session: null,
      direction: null
    }
  },
  async mounted() {
    const canvas: HTMLCanvasElement = this.$refs["canvas"] as HTMLCanvasElement
    canvas.height = 510
    canvas.width = 510
    const c = canvas.getContext("2d")
    if (!c) {
      throw new Error("no context")
    }

    const context: CanvasRenderingContext2D = c
    context.textAlign = "center"
    context.textBaseline = "middle"
    context.font = "200px Helvetica"
    context.strokeStyle = "#fff"
    context.lineWidth = 10

    this.session = await connectToRoom('room2')
    if (this.session.isServer) {
      const session = this.session
      let state = startingState()

      session.client.onmessage = (e) => {
        const direction = parseInt(JSON.parse(e.data))
        const otherPlayer = state.players[1]
        if (direction !== -otherPlayer.direction) {
          otherPlayer.direction = direction
        }
      }

      this.keyboardListener = (e: KeyboardEvent) => {
        debugger
        if (state.ended) {
          if (e.key === " ") {
            state = startingState()
          }
        }
        const direction = controls[e.key];
        const thisPlayer = state.players[0]
        if (direction && direction !== -thisPlayer.direction) {
            thisPlayer.direction = direction
        }
      }

      const gameLoop = () => {
        updateState(state)
        session.client.send(JSON.stringify(state))
        render(state, context)
        this.requestFrame = requestAnimationFrame(gameLoop)
      }

      gameLoop()
    } else {
      const session = this.session
      this.keyboardListener = (e: KeyboardEvent) => {
        // for (const player of state.players) {
        //   const direction = player.controls?.[e.key];
        //   if (direction && direction !== -player.direction) {
        //     player.direction = direction
        //   }
        // }

        // if (state.ended) {
        //   if (e.key === " ") {
        //     state = startingState()
        //   }
        // }
        const direction = controls[e.key];
        if (direction) {
          session.server.send(direction.toString())
        }
      }
      this.session.server.onmessage = (e) => {
        const parsedState = JSON.parse(e.data)
        render(parsedState, context)
      }
    }

    function startingState(): State {
      return {
        worldDemensions: {
          width: canvas.width / size,
          height: canvas.height / size,
        },
        players: [
          {
            color: "#fcba03",
            direction: Direction.right,
            alive: true,
            body: [{
              x: 4,
              y: Math.floor(canvas.width / size / 2),
            }]
          },
          {
            color: "#00d5ff",
            direction: Direction.left,
            alive: true,
            body: [{
              x: Math.floor(canvas.width / size) - 5,
              y: Math.floor(canvas.height / size / 2),
            }]
          },
        ],
        ended: false
      }
    }

    window.addEventListener('keydown', this.keyboardListener)

    function render(state: State, context: CanvasRenderingContext2D) {
      context.fillStyle = "#000"
      context.fillRect(0, 0, context.canvas.width, context.canvas.height)
      for (const player of state.players) {
        context.fillStyle = player.color
        for (const segment of player.body) {
          context.fillRect(segment.x * size, segment.y * size, size, size)
        }
      }

      if (state.ended) {
        const winner = state.players.find(x => x.alive)

        if (winner) {
          context.fillStyle = winner.color
          context.strokeText("WIN", canvas.width / 2, canvas.height / 2)
          context.fillText("WIN", canvas.width / 2, canvas.height / 2)
        } else {
          context.fillStyle = "#000"
          context.strokeText("TIE", canvas.width / 2, canvas.height / 2)
          context.fillText("TIE", canvas.width / 2, canvas.height / 2)
        }
      }
    }

    function movePlayer(player: Player) {
      const head = player.body[0]
      if (player.direction === Direction.down) {
        player.body.unshift({
          x: head.x,
          y: head.y + 1,
        })
      } else if (player.direction === Direction.up) {
        player.body.unshift({
          x: head.x,
          y: head.y - 1,
        })
      } else if (player.direction === Direction.right) {
        player.body.unshift({
          x: head.x + 1,
          y: head.y,
        })
      } else if (player.direction === Direction.left) {
        player.body.unshift({
          x: head.x - 1,
          y: head.y,
        })
      }
    }

    function collidePlayer(player: Player, state: State) {
      const head = player.body[0]

      if (
        head.x < 0 ||
        head.x >= state.worldDemensions.width ||
        head.y < 0 ||
        head.y >= state.worldDemensions.height
      ) {
        player.alive = false
        return
      }

      const segments = state.players.flatMap(x => {
        if (x === player) {
          return x.body.slice(1)
        }

        return x.body
      })

      for (const segment of segments) {
        if (head.x === segment.x && head.y === segment.y) {
          player.alive = false
          return
        }
      }
    }

    function updateState(state: State) {
      if (!state.ended) {
        for (const player of state.players) {
          movePlayer(player)
        }

        for (const player of state.players) {
          collidePlayer(player, state)
        }

        if (state.players.filter(x => x.alive).length < 2) {
          state.ended = true
        }
      }
    }
  },
  beforeDestroy() {
    if (this.requestFrame) {
      cancelAnimationFrame(this.requestFrame)
    }

    if (this.keyboardListener) {
      window.removeEventListener("keydown", this.keyboardListener)
    }
  },
});
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
</style>
