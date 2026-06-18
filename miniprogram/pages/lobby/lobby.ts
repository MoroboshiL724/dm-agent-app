/**
 * 房间页面 — 创建/加入游戏，等待玩家就绪
 * 注意：lobby 只负责 REST 轮询，WebSocket 由 game 页面统一管理
 */

import { createGame, joinGame, fetchGameInfo, fetchGameByRoom } from "../../services/api";

Page({
  _pollTimer: 0 as number,

  data: {
    mode: "create" as "create" | "join",
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
    roomReady: false,
  },

  onLoad(options: Record<string, string>) {
    const mode = options.mode || "";
    const gameType = options.game_type || "";
    const roomCode = options.room_code || "";
    const minPlayers = parseInt(options.min_players || "0", 10);
    const maxPlayers = parseInt(options.max_players || "0", 10);

    if (mode === "join") {
      this.setData({ mode: "join", roomCode });
    } else {
      this.setData({
        mode: "create",
        gameType,
        minPlayers: minPlayers || 4,
        maxPlayers: maxPlayers || 99,
        roomReady: false,
      });
    }
  },

  onUnload() {
    this.stopPolling();
  },

  /* ═══════ 创建并加入 ═══════ */

  onInputPlayerName(e: WechatMiniprogram.Input) {
    this.setData({ playerName: e.detail.value });
  },

  async doCreateAndJoin() {
    const { gameType, playerName } = this.data;
    if (!playerName.trim()) {
      wx.showToast({ title: "请输入你的昵称", icon: "none" });
      return;
    }
    if (this.data.joining) return;
    this.setData({ joining: true });

    try {
      // 1. 创建房间
      wx.showLoading({ title: "创建房间..." });
      const { game_id, room_code } = await createGame(gameType);
      wx.hideLoading();

      // 2. 房主自己加入
      wx.showLoading({ title: "加入中..." });
      const { player_id, ws_token } = await joinGame(game_id, playerName.trim());
      wx.hideLoading();

      this.setData({
        gameId: game_id,
        roomCode: room_code,
        myPlayerId: player_id,
        wsToken: ws_token,
        isHost: true,
        joining: false,
        roomReady: true,
      });

      // 3. 开始轮询玩家列表
      this.startPolling();
    } catch (err) {
      wx.hideLoading();
      this.setData({ joining: false });
      wx.showToast({ title: "创建失败，请重试", icon: "none" });
    }
  },

  /* ═══════ 加入房间（通过房间号） ═══════ */

  onInputRoomCode(e: WechatMiniprogram.Input) {
    this.setData({ roomCode: e.detail.value.toUpperCase() });
  },

  onInputName(e: WechatMiniprogram.Input) {
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
      const info = await fetchGameByRoom(roomCode);
      const gameId = info.game_id;

      wx.showLoading({ title: "加入中..." });
      const res = await joinGame(gameId, playerName.trim());
      wx.hideLoading();

      this.setData({
        gameId: res.game_id,
        myPlayerId: res.player_id,
        wsToken: res.ws_token,
        gameType: info.game_type,
        roomReady: true,
        minPlayers: info.min_players || this.data.minPlayers || 4,
        maxPlayers: info.max_players || this.data.maxPlayers || 99,
        joining: false,
      });

      // 直接进入游戏页面（由 game 页面连 WS）
      this.goToGame();
    } catch (err) {
      wx.hideLoading();
      this.setData({ joining: false });
      const msg = (err as Error).message || "";
      if (msg.includes("404") || msg.includes("Room")) {
        wx.showToast({ title: "房间不存在", icon: "none" });
      } else {
        wx.showToast({ title: "加入失败，请重试", icon: "none" });
      }
    }
  },

  /* ═══════ 轮询房间状态 ═══════ */

  startPolling() {
    this.pollGameState();
    this._pollTimer = setInterval(() => {
      this.pollGameState();
    }, 2000) as unknown as number;
  },

  async pollGameState() {
    if (!this.data.gameId) return;
    try {
      const info = await fetchGameInfo(this.data.gameId);
      const playerCount = info.players.length;
      const min = info.min_players || this.data.minPlayers || 4;
      const max = info.max_players || this.data.maxPlayers || 99;
      this.setData({
        players: info.players,
        minPlayers: min,
        maxPlayers: max,
        canStart: playerCount >= min && playerCount <= max,
      });
    } catch (err) {
      // 房间过期
    }
  },

  stopPolling() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = 0;
    }
  },

  /* ═══════ 开始游戏 ═══════ */

  onStartGame() {
    const { gameId, myPlayerId, wsToken } = this.data;
    this.stopPolling();
    wx.navigateTo({
      url: `/pages/game/game?game_id=${gameId}&player_id=${myPlayerId}&token=${wsToken}&action=start`,
    });
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
