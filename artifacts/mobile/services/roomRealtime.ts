import { getRealtimeUrl, normalizeMovies, normalizeRoom, Movie, Room } from "@/services/api";

type RealtimeStatus = "connecting" | "connected" | "disconnected";

interface RoomRealtimeOptions {
  roomCode: string;
  onRoom: (room: Room) => void;
  onMatch: (movie: Movie) => void;
  onStatus?: (status: RealtimeStatus) => void;
  onError?: (message: string) => void;
}

export interface RoomRealtimeConnection {
  close: () => void;
}

function normalizeRealtimeMovie(data: any): Movie | null {
  if (!data) return null;
  return normalizeMovies([data])[0] ?? null;
}

function getMessageType(data: any): string {
  return String(data?.type ?? data?.event ?? "").toLowerCase();
}

export function connectRoomRealtime({
  roomCode,
  onRoom,
  onMatch,
  onStatus,
  onError,
}: RoomRealtimeOptions): RoomRealtimeConnection {
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closedByClient = false;
  let reconnectAttempts = 0;

  const clearReconnectTimer = () => {
    if (!reconnectTimer) return;
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  };

  const scheduleReconnect = () => {
    if (closedByClient) return;
    reconnectAttempts += 1;
    const delay = Math.min(1000 * reconnectAttempts, 5000);
    onStatus?.("disconnected");
    clearReconnectTimer();
    reconnectTimer = setTimeout(open, delay);
  };

  const handleMessage = (event: WebSocketMessageEvent) => {
    let data: any;

    try {
      data = JSON.parse(String(event.data));
    } catch {
      return;
    }

    const type = getMessageType(data);
    const payload = data?.payload ?? data;
    const roomPayload = data?.room ?? payload?.room;
    const matchPayload =
      data?.match ??
      data?.matchedMovie ??
      payload?.match ??
      payload?.matchedMovie ??
      roomPayload?.matchedMovie;

    if (roomPayload || type.includes("room")) {
      try {
        const updatedRoom = normalizeRoom(roomPayload ?? payload);
        onRoom(updatedRoom);
        if (updatedRoom.matchedMovie) onMatch(updatedRoom.matchedMovie);
      } catch {
        onError?.("Received an invalid room update.");
      }
    }

    if (matchPayload || type.includes("match")) {
      const match = normalizeRealtimeMovie(matchPayload);
      if (match) onMatch(match);
    }
  };

  function open() {
    if (closedByClient) return;

    onStatus?.("connecting");
    socket = new WebSocket(getRealtimeUrl(`/rooms/${encodeURIComponent(roomCode)}/ws`));

    socket.onopen = () => {
      reconnectAttempts = 0;
      onStatus?.("connected");
    };
    socket.onmessage = handleMessage;
    socket.onerror = () => {
      // Native platforms can emit transient WebSocket errors while the app is
      // backgrounded or resuming. The close handler below reconnects silently.
    };
    socket.onclose = scheduleReconnect;
  }

  open();

  return {
    close() {
      closedByClient = true;
      clearReconnectTimer();
      socket?.close();
      socket = null;
    },
  };
}
