// @ts-ignore
const ScaleDrone = window?.ScaleDrone as any
const key = 'mOjAWneOSfRVGp7V'
const configuration = {
  iceServers:
  [{
    urls: ['stun:stun.l.google.com:19302']
  }]
};

export type connection = RTCDataChannel

export type session = {
  isServer: true,
  client: connection,
} | {
  isServer: false,
  server: connection,
}

export async function connectToRoom(roomName: string): Promise<session> {
  roomName = `observable-${roomName}`
  const drone = new ScaleDrone(key)
  await new Promise((resolve, reject) => {
    drone.on('open', (error: any) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })

  console.log('drone opened')
  console.log(roomName)

  const room = drone.subscribe(roomName)

  room.on('open', (error: any) => {
    if (error) {
      console.error(error)
    } else {
      console.log('room opened')
    }
  })

  const members = await new Promise<any[]>((resolve) => {
    room.on('members', resolve)
  })

  console.log({members})

  if (members.length == 2) {
    return {
      isServer: true,
      client: await createConnection(true),
    }
  }

  return {
    isServer: false,
    server: await createConnection(false),
  }

  function createConnection(isServer: boolean): Promise<connection> {
    const connection = new RTCPeerConnection(configuration)

    connection.onicecandidate = e => {
      if (e.candidate) {
        sendSignalingMessage({
          candidate: e.candidate
        })
      }
    }

    let dataChannelPromise: Promise<connection>

    if (isServer) {
      connection.onnegotiationneeded = async () => {
        const description = await connection.createOffer()
        console.log('created offer')
        await connection.setLocalDescription(description)
        console.log('created local description')
        await sendSignalingMessage({
          sdp: connection.localDescription
        })
        console.log('sent local description')
      }

      dataChannelPromise = new Promise((resolve) => {
        const channel = connection.createDataChannel('data')
        channel.onopen = () => {
          if (channel.readyState === 'open') {
            resolve(channel)
          }
        }
      })
    } else {
      dataChannelPromise = new Promise(resolve => {
        connection.ondatachannel = (e) => {
          e.channel.onopen = () => {
            if (e.channel.readyState == 'open') {
              resolve(e.channel)
            }
          }
        }
      })
    }

    // start signaling
    room.on('data', async (message: any, client: any) => {
      if (client.id === drone.clientId) {
        return
      }

      if (message.sdp) {
        await connection.setRemoteDescription(new RTCSessionDescription(message.sdp))
        if (connection.remoteDescription?.type === "offer") {
          const description = await connection.createAnswer()
          await connection.setLocalDescription(description)
          await sendSignalingMessage({
            sdp: connection.localDescription
          })
        }
      } else if (message.candidate) {
        await connection.addIceCandidate(new RTCIceCandidate(message.candidate))
      }
    })

    return dataChannelPromise
  }

  function sendSignalingMessage(message: any) {
    drone.publish({
      room: roomName, message
    })
  }
}
