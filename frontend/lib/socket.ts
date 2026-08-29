import { io, type Socket } from "socket.io-client"
import { getBackendUrl } from "@/lib/api"

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getBackendUrl(), {
      transports: ["websocket", "polling"],
      autoConnect: false,
    })
  }
  return socket
}

/** Connects (if needed) and resolves once a socket id is available. */
export function connectSocket(): Promise<Socket> {
  const s = getSocket()

  if (s.connected && s.id) {
    return Promise.resolve(s)
  }

  return new Promise((resolve, reject) => {
    const onConnect = () => {
      s.off("connect_error", onError)
      resolve(s)
    }
    const onError = (err: Error) => {
      s.off("connect", onConnect)
      reject(err)
    }

    s.once("connect", onConnect)
    s.once("connect_error", onError)

    if (!s.connected) {
      s.connect()
    } else {
      onConnect()
    }
  })
}
