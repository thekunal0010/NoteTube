import { io, type Socket } from "socket.io-client"
import { getBackendUrl } from "@/lib/api"

let socket: Socket | null = null

/** How long to wait for the socket.io handshake before giving up. */
const CONNECT_TIMEOUT_MS = 8000

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getBackendUrl(), {
      transports: ["websocket", "polling"],
      autoConnect: false,
    })
  }
  return socket
}

/** Connects (if needed) and resolves once a socket id is available.
 *
 * Rejects after CONNECT_TIMEOUT_MS if the handshake neither succeeds nor
 * errors. A backend that accepts the TCP connection but never completes the
 * handshake (a wedged or half-dead server) fires neither `connect` nor
 * `connect_error`, which would otherwise leave this promise pending forever
 * and hang the caller on its loading state with no way out.
 */
export function connectSocket(): Promise<Socket> {
  const s = getSocket()

  if (s.connected && s.id) {
    return Promise.resolve(s)
  }

  return new Promise((resolve, reject) => {
    let settled = false

    const cleanup = () => {
      clearTimeout(timer)
      s.off("connect", onConnect)
      s.off("connect_error", onError)
    }

    const onConnect = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve(s)
    }

    const onError = (err: Error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(err)
    }

    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      reject(new Error("Timed out connecting to the server"))
    }, CONNECT_TIMEOUT_MS)

    s.once("connect", onConnect)
    s.once("connect_error", onError)

    if (!s.connected) {
      s.connect()
    } else {
      onConnect()
    }
  })
}
