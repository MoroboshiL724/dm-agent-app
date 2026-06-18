/** WebSocket 消息协议类型 */

type ClientMessageType = "voice_input" | "manual_action" | "player_ready" | "ping";
type ServerMessageType =
  | "connected"
  | "private_state"
  | "public_state"
  | "announcement"
  | "private_message"
  | "action_request"
  | "phase_change"
  | "vote_result"
  | "game_over"
  | "error"
  | "pong";

/** 客户端 → 服务端 */
interface ClientMessage {
  type: ClientMessageType;
  payload: VoiceInputPayload | ManualActionPayload | PlayerReadyPayload | PingPayload;
}

interface VoiceInputPayload {
  text: string;
  confidence?: number;
}

interface ManualActionPayload {
  action: string;
  params: Record<string, unknown>;
}

interface PlayerReadyPayload {}

interface PingPayload {}

/** 服务端 → 客户端 */
interface ServerMessage {
  type: ServerMessageType;
  payload: Record<string, unknown>;
  timestamp?: number;
}
