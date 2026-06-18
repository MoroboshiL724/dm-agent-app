/**
 * 游戏主页面 — 核心玩法界面
 * 管理：WS 连接、阶段流转、语音输入、手动操作、身份显示、投票
 */

import { gameWs } from "../../services/websocket";
import { asrService } from "../../services/asr";

Page({
  data: {
    gameId: "",
    playerId: "",

    // 公开状态
    phaseName: "准备中",
    roundNumber: 0,
    players: [] as Array<{ player_id: string; name: string; is_alive: boolean; is_connected: boolean }>,
    aliveCount: 0,

    // 私有状态
    myRole: "",
    myTeam: "",
    teammates: [] as string[],
    availableActions: [] as ActionSchema[],

    // 公告
    announcements: [] as string[],

    // 语音
    isRecording: false,
    inputMode: "voice" as "voice" | "manual",
    manualText: "",

    // 投票
    showVotePanel: false,
    voteTargets: [] as string[],

    // 连接状态
    isConnected: false,
    isReconnecting: false,
    connectionError: "",

    // 角色卡
    showRoleCard: false,
  },

  onLoad(options: Record<string, string>) {
    const gameId = options.game_id || "";
    const playerId = options.player_id || "";
    const wsToken = options.token || "";
    this.setData({ gameId, playerId });
    this.connectGame(gameId, playerId, wsToken);
    this.setupASR();
  },

  onUnload() {
    gameWs.offAll();
    gameWs.disconnect();
  },

  /* ═══════════ WebSocket ═══════════ */

  connectGame(gameId: string, playerId: string, token: string) {
    const app = getApp<IAppOption>();
    const wsUrl = `${app.globalData.serverUrl}/ws/game/${gameId}?player_id=${playerId}&token=${token}`;

    // 注册消息处理器
    gameWs.on("connected", () => {
      this.setData({ isConnected: true, isReconnecting: false, connectionError: "" });
      gameWs.send("player_ready", {});
    });

    gameWs.on("phase_change", (p) => this.onPhaseChange(p));
    gameWs.on("public_state", (p) => this.onPublicState(p));
    gameWs.on("private_state", (p) => this.onPrivateState(p));
    gameWs.on("announcement", (p) => this.onAnnouncement(p));
    gameWs.on("action_request", (p) => this.onActionRequest(p));
    gameWs.on("vote_result", (p) => this.onVoteResult(p));
    gameWs.on("game_over", (p) => this.onGameOver(p));
    gameWs.on("error", (p) => this.onServerError(p));
    gameWs.on("private_message", (p) => this.onPrivateMessage(p));
    gameWs.on("disconnected", () => this.setData({ isConnected: false }));
    gameWs.on("reconnecting", (p) => {
      this.setData({ isReconnecting: true, connectionError: `重连中 (第${p.attempt}次)...` });
    });
    gameWs.on("reconnect_failed", () => {
      this.setData({ isReconnecting: false, connectionError: "连接失败，请退出重试" });
    });

    gameWs.connect(wsUrl);
  },

  /* ═══════════ 消息处理 ═══════════ */

  onPhaseChange(payload: Record<string, unknown>) {
    const publicState = (payload.public_state || {}) as Record<string, unknown>;
    const privateState = (payload.private_state || {}) as Record<string, unknown>;
    const anns = (payload.announcements || []) as string[];

    const phaseName = (payload.to_phase as string) || this.data.phaseName;

    this.setData({
      phaseName,
      roundNumber: (publicState.round_number as number) || this.data.roundNumber,
      announcements: [...this.data.announcements, ...anns].slice(-20), // 最近20条
      myRole: (privateState.role as string) || this.data.myRole,
      myTeam: (privateState.team as string) || this.data.myTeam,
      teammates: (privateState.teammates as string[]) || [],
      availableActions: (privateState.available_actions as ActionSchema[]) || [],
      showVotePanel: false,
    });

    // 语音播报新公告
    anns.forEach((text) => this.speak(text));
  },

  onPublicState(payload: Record<string, unknown>) {
    const players = (payload.players || []) as Array<{
      player_id: string; name: string; is_alive: boolean; is_connected: boolean;
    }>;
    this.setData({
      players,
      aliveCount: players.filter((p) => p.is_alive).length,
    });
  },

  onPrivateState(payload: Record<string, unknown>) {
    this.setData({
      myRole: (payload.role as string) || this.data.myRole,
      myTeam: (payload.team as string) || this.data.myTeam,
      teammates: (payload.teammates as string[]) || [],
    });
  },

  onAnnouncement(payload: Record<string, unknown>) {
    const text = (payload.text as string) || "";
    if (text) {
      this.setData({
        announcements: [...this.data.announcements, text].slice(-20),
      });
      this.speak(text);
    }
  },

  onActionRequest(payload: Record<string, unknown>) {
    this.setData({
      availableActions: (payload.actions as ActionSchema[]) || [],
    });
  },

  onVoteResult(payload: Record<string, unknown>) {
    const eliminated = payload.eliminated_player as string || "";
    const text = eliminated ? `${eliminated} 被放逐出局` : "本轮无人被放逐";
    this.setData({
      announcements: [...this.data.announcements, text].slice(-20),
      showVotePanel: false,
    });
  },

  onGameOver(payload: Record<string, unknown>) {
    const winner = payload.winner as string;
    const summary = payload.summary as string;
    const roles = payload.roles as Record<string, string>;
    // 存储结果到全局，让 result 页面读取
    const app = getApp<IAppOption>();
    (app.globalData as Record<string, unknown>).gameResult = {
      winner, summary, roles,
      players: this.data.players.map((p) => ({
        name: p.name,
        role: roles?.[p.player_id] || "?",
        team: "", // 由后端决定
      })),
    };
    wx.redirectTo({ url: `/pages/result/result?game_id=${this.data.gameId}` });
  },

  onPrivateMessage(payload: Record<string, unknown>) {
    const text = (payload.text as string) || "";
    if (text) {
      // 在公告区显示 AI 反馈
      this.setData({
        announcements: [...this.data.announcements, `🤖 ${text}`].slice(-20),
      });
      this.speak(text);
    }
  },

  onServerError(payload: Record<string, unknown>) {
    wx.showToast({
      title: (payload.message as string) || "服务端错误",
      icon: "none",
    });
  },

  /* ═══════════ 语音播报 (TTS) ═══════════ */

  speak(_text: string) {
    // MVP: 使用微信内置 TTS 或者不读（玩家自己看屏幕）
    // 后续接入 mimo-v2-tts 或 CosyVoice
  },

  /* ═══════════ 语音输入 ═══════════ */

  setupASR() {
    asrService.setCallbacks(
      (text) => {
        // 语音识别成功 → 发送到服务器
        gameWs.send("voice_input", { text });
      },
      (err) => {
        wx.showToast({ title: err, icon: "none" });
      },
    );
  },

  onVoiceButtonTouchStart() {
    asrService.start();
    this.setData({ isRecording: true });
  },

  onVoiceButtonTouchEnd() {
    asrService.stop();
    this.setData({ isRecording: false });
  },

  /* ═══════════ 手动输入 ═══════════ */

  onToggleInputMode() {
    this.setData({
      inputMode: this.data.inputMode === "voice" ? "manual" : "voice",
    });
  },

  onManualInput(e: WechatMiniprogram.Input) {
    this.setData({ manualText: e.detail.value });
  },

  onSendManual() {
    const text = this.data.manualText.trim();
    if (!text) return;
    gameWs.send("voice_input", { text }); // 复用 LLM 解析通道
    this.setData({ manualText: "" });
  },

  /* ═══════════ 快捷动作 ═══════════ */

  _pendingAction: "",  // 暂存需要选目标的动作类型

  onActionTap(e: WechatMiniprogram.TouchEvent) {
    // dataset 来自 WXML data-action，类型为 any
    const action = e.currentTarget.dataset.action as Record<string, unknown>;
    if (!action) return;

    const actionType = action.action_type as string;
    const needTarget = action.need_target as boolean | undefined;
    const validTargets = action.valid_targets as string[] | undefined;

    if (needTarget && validTargets && validTargets.length > 0) {
      this.setData({
        showVotePanel: true,
        voteTargets: validTargets,
      });
      this._pendingAction = actionType;
    } else {
      gameWs.send("manual_action", { action: actionType, params: {} });
    }
  },

  onVoteTargetTap(e: WechatMiniprogram.TouchEvent) {
    const targetId = e.currentTarget.dataset.targetId as string;
    gameWs.send("manual_action", { action: this._pendingAction, target_id: targetId, params: {} });
    this.setData({ showVotePanel: false });
    this._pendingAction = "";
  },

  onCancelVote() {
    this.setData({ showVotePanel: false });
  },

  /* ═══════════ 角色卡 ═══════════ */

  onToggleRoleCard() {
    this.setData({ showRoleCard: !this.data.showRoleCard });
    // 3秒后自动隐藏
    if (this.data.showRoleCard) {
      setTimeout(() => {
        this.setData({ showRoleCard: false });
      }, 3000);
    }
  },

  /* ═══════════ 退出 ═══════════ */

  onLeaveGame() {
    wx.showModal({
      title: "退出游戏",
      content: "确定要退出当前游戏吗？",
      success: (res) => {
        if (res.confirm) {
          wx.navigateBack({ delta: 2 });
        }
      },
    });
  },
});
