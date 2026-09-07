import { GameRoom } from './GameRoom.js'
export { GameRoom }

export default {
  async fetch(request, env) {
    const roomId = new URL(request.url).searchParams.get('room') || 'default'
    const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(roomId))
    return stub.fetch(request)
  },
}
