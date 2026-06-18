/**
 * WebSocket 客户端 — 管理双向实时通信 + 事件分发
 */

type MessageHandler = (payload: Record<string, unknown>) => void;

class GameWebSocket {
  private socket: WechatMiniprogram.SocketTask | null = null;
  private url = "";
  private reconnectTimer = 0;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private handlers: Map<string, MessageHandler[]> = new Map();

  connect(url: string) {
    this.url = url;
    this.socket = wx.connectSocket({ url });
    this.socket.onOpen(() => this.onOpen());
    this.socket.onMessage((msg) => this.onMessage(msg));
    this.socket.onClose(() => this.onClose());
    this.socket.onError((err) => console.error("[WS] Error:", err));
  }

  /** 注册消息处理器 */
  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  /** 移除消息处理器 */
  off(type: string, handler?: MessageHandler) {
    if (!handler) {
      this.handlers.delete(type);
      return;
    }
    const list = this.handlers.get(type);
    if (list) {
      const idx = list.indexOf(handler);
      if (idx >= 0) list.splice(idx, 1);
    }
  }

  /** 移除所有处理器 */
  offAll() {
    this.handlers.clear();
  }

  private onOpen() {
    console.log("[WS] Connected");
    this.reconnectAttempts = 0;
    this.emit("connected", {});
  }

  private onMessage(msg: { data: string | ArrayBuffer }) {
    try {
      const data = typeof msg.data === "string" ? JSON.parse(msg.data) : msg.data;
      const type = (data as Record<string, unknown>).type as string;
      const payload = ((data as Record<string, unknown>).payload || {}) as Record<string, unknown>;

      if (type === "pong") return; // 心跳忽略

      console.log("[WS] <-", type);
      this.emit(type, payload);

      // 同时触发通配符 "*" 处理器（如果需要全局监听）
      this.emit("*", { type, ...payload });
    } catch (e) {
      console.error("[WS] Parse error:", e);
    }
  }

  private onClose() {
    console.log("[WS] Disconnected");
    this.emit("disconnected", {});
    this.tryReconnect();
  }

  private tryReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit("reconnect_failed", {});
      return;
    }
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
    this.reconnectAttempts++;
    this.emit("reconnecting", { attempt: this.reconnectAttempts, delay });
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.url);
    }, delay) as unknown as number;
  }

  private emit(type: string, payload: Record<string, unknown>) {
    const list = this.handlers.get(type);
    if (list) {
      list.forEach((fn) => {
        try { fn(payload); } catch (e) { console.error("[WS] Handler error:", e); }
      });
    }
  }

  send(type: string, payload: Record<string, unknown> = {}) {
    if (!this.socket) {
      console.warn("[WS] Not connected");
      return;
    }
    const msg = JSON.stringify({ type, payload });
    console.log("[WS] ->", type);
    this.socket.send({ data: msg });
  }

  /** 发送心跳 */
  private startHeartbeat() {
    setInterval(() => {
      this.send("ping", {});
    }, 30000);
  }

  disconnect() {
    clearTimeout(this.reconnectTimer);
    if (this.socket) {
      this.socket.close({});
      this.socket = null;
    }
  }

  get isConnected(): boolean {
    return this.socket !== null;
  }
}

export const gameWs = new GameWebSocket();
