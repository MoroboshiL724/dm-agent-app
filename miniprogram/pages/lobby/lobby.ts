/**
 * 房间页面 — 创建/加入游戏，等待玩家就绪
 */

import { createGame, joinGame, fetchGameInfo, fetchGameByRoom } from "../../services/api";
import { gameWs } from "../../services/websocket";

Page({
  _pollTimer: 0 as number,

  data: {
    mode: "create" as "create" | "join",  // 创建或加入
    gameType: "",
    gameId: "",
    roomCode: "",
    playerName: "",
    players: [] as Array<{ player_id: string; name: string; is_alive: boolean; is_connected: boolean }>,
    isHost: false,
    myPlayerId: "",
    wsToken: "",
    canStart: false,
    minPlayers: 0,
    maxPlayers: 0,
    joining: false,
  },

  onLoad(options: Record<string, string>) {
    const mode = options.mode || "";
    const gameType = options.game_type || "";
    const roomCode = options.room_code || "";
    // 从首页传入的人数配置（作为初始默认值）
    const minPlayers = parseInt(options.min_players || "0", 10);
    const maxPlayers = parseInt(options.max_players || "0", 10);

    if (mode === "join") {
      // 通过房间号加入
      this.setData({ mode: "join", roomCode });
    } else {
      // 创建房间 — 先用首页传入的人数，后续轮询会覆盖
      this.setData({
        mode: "create",
        gameType,
        minPlayers: minPlayers || 4,
        maxPlayers: maxPlayers || 99,
      });
      this.doCreateGame(gameType);
    }
  },

  onUnload() {
    this.stopPolling();
    gameWs.offAll();
  },

  /* ═══════ 创建游戏 ═══════ */

  async doCreateGame(gameType: string) {
    try {
      wx.showLoading({ title: "创建房间..." });
      const res = await createGame(gameType);
      wx.hideLoading();
      this.setData({ gameId: res.game_id, roomCode: res.room_code, isHost: true });
      this.startPolling();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: "创建失败", icon: "none" });
      wx.navigateBack();
    }
  },

  /* ═══════ 加入游戏 ═══════ */

  onInputRoomCode(e: WechatMiniprogram.Input) {
    this.setData({ roomCode: e.detail.value.toUpperCase() });
  },

  onInputName(e: WechatMiniprogram.Input) {
    this.setData({ playerName: e.detail.value });
  },

  onInputPlayerName(e: WechatMiniprogram.Input) {
    this.setData({ playerName: e.detail.value });
  },

  async doJoinGame() {
    const { roomCode, playerName } = this.data;
    if (!roomCode || !playerName) {
      wx.showToast({ title: "请输入房间号和昵称", icon: "none" });
      return;
    }
    if (this.data.joining) return;
    this.setData({ joining: true });

    try {
      wx.showLoading({ title: "查找房间..." });

      // 1. 通过房间号查询 game_id
      const info = await fetchGameByRoom(roomCode);
      const gameId = info.game_id;

      // 2. 加入游戏
      wx.showLoading({ title: "加入中..." });
      const res = await joinGame(gameId, playerName);
      wx.hideLoading();

      this.setData({
        gameId: res.game_id,
        myPlayerId: res.player_id,
        wsToken: res.ws_token,
        gameType: info.game_type,
        joining: false,
      });
      this.goToGame();
    } catch (err) {
      wx.hideLoading();
      this.setData({ joining: false });
      const msg = (err as Error).message || "";
      if (msg.includes("404") || msg.includes("Room not found")) {
        wx.showToast({ title: "房间不存在", icon: "none" });
      } else {
        wx.showToast({ title: "加入失败，请重试", icon: "none" });
      }
    }
  },

  /* ═══════ 轮询房间状态 ═══════ */

  startPolling() {
    this._pollTimer = setInterval(() => {
      this.pollGameState();
    }, 2000) as unknown as number;
    this.pollGameState(); // 立即执行一次
  },

  async pollGameState() {
    if (!this.data.gameId) return;
    try {
      const info = await fetchGameInfo(this.data.gameId);
      const playerCount = info.players.length;
      // 优先用 API 返回值，没有就用当前值（已从首页传入）
      const min = info.min_players || this.data.minPlayers || 4;
      const max = info.max_players || this.data.maxPlayers || 99;
      this.setData({
        players: info.players,
        minPlayers: min,
        maxPlayers: max,
        canStart: playerCount >= min && playerCount <= max,
      });
    } catch (err) {
      // 房间可能已过期
    }
  },

  stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
    }
  },

  /* ═══════ 开始游戏 ═══════ */

  onStartGame() {
    gameWs.on("connected", () => {
      wx.navigateTo({
        url: `/pages/game/game?game_id=${this.data.gameId}&player_id=${this.data.myPlayerId}&token=${this.data.wsToken}`,
      });
    });

    // 先进入游戏页面，再通过 WS 接收开始信号
    this.goToGame();
  },

  goToGame() {
    const { gameId, myPlayerId, wsToken } = this.data;
    wx.navigateTo({
      url: `/pages/game/game?game_id=${gameId}&player_id=${myPlayerId}&token=${wsToken}`,
    });
  },

  onCopyRoomCode() {
    wx.setClipboardData({
      data: this.data.roomCode,
      success: () => wx.showToast({ title: "房间号已复制，分享给朋友" }),
    });
  },
});
