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
    this.loadGameTypes();
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
          { game_id: "testgame", name: "功能测试", min_players: 1, max_players: 1, icon: "🧪" },
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
    // 从已加载的游戏列表中查找人数配置
    const game = this.data.gameTypes.find(g => g.game_id === gameId);
    const minP = game?.min_players ?? 4;
    const maxP = game?.max_players ?? 12;
    wx.navigateTo({ url: `/pages/lobby/lobby?game_type=${gameId}&min_players=${minP}&max_players=${maxP}` });
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
