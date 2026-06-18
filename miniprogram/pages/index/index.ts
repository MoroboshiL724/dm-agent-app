/**
 * 首页 — 游戏选择列表 + 加入房间
 */

import { fetchGameTypes } from "../../services/api";

Page({
  data: {
    gameTypes: [] as GameTypeInfo[],
    loading: true,
    error: "",
    showJoinInput: false,
    joinRoomCode: "",
  },

  onShow() {
    // 每次进入首页刷新游戏列表
    if (this.data.gameTypes.length === 0) {
      this.loadGameTypes();
    }
  },

  async loadGameTypes() {
    this.setData({ loading: true, error: "" });
    try {
      const res = await fetchGameTypes();
      this.setData({ gameTypes: res.games, loading: false });
    } catch (err) {
      this.setData({
        error: "加载失败，请下拉刷新",
        loading: false,
        // 离线模式：显示默认游戏列表
        gameTypes: [
          { game_id: "werewolf", name: "狼人杀", min_players: 4, max_players: 12, icon: "🐺" },
          { game_id: "avalon", name: "阿瓦隆", min_players: 5, max_players: 10, icon: "🗡️" },
        ],
      });
    }
  },

  onPullDownRefresh() {
    this.loadGameTypes().then(() => wx.stopPullDownRefresh());
  },

  /** 选择游戏 → 进入创建/加入页面 */
  onGameSelect(e: WechatMiniprogram.TouchEvent) {
    const gameId = e.currentTarget.dataset.gameId as string;
    wx.navigateTo({ url: `/pages/lobby/lobby?game_type=${gameId}` });
  },

  /** 显示加入房间输入 */
  onShowJoinInput() {
    this.setData({ showJoinInput: !this.data.showJoinInput });
  },

  onInputRoomCode(e: WechatMiniprogram.Input) {
    this.setData({ joinRoomCode: e.detail.value.toUpperCase() });
  },

  /** 通过房间号加入 */
  async onJoinByCode() {
    const code = this.data.joinRoomCode.trim();
    if (!code) {
      wx.showToast({ title: "请输入房间号", icon: "none" });
      return;
    }
    // 跳转到 lobby 加入模式
    wx.navigateTo({ url: `/pages/lobby/lobby?mode=join&room_code=${code}` });
  },
});
