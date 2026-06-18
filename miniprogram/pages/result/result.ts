/**
 * 游戏结果页 — 胜负揭晓 + 身份揭示
 */

Page({
  data: {
    winner: "",
    summary: "",
    players: [] as Array<{ name: string; role: string; team: string }>,
    gameId: "",
  },

  onLoad(options: Record<string, string>) {
    this.setData({ gameId: options.game_id || "" });

    // 从全局数据读取结果
    const app = getApp<IAppOption>();
    const result = (app.globalData as Record<string, unknown>).gameResult as {
      winner: string;
      summary: string;
      roles: Record<string, string>;
      players: Array<{ name: string; role: string; team: string }>;
    } | undefined;

    if (result) {
      const roleMap: Record<string, string> = {
        werewolf: "狼人",
        villager: "村民",
        seer: "预言家",
        witch: "女巫",
        merlin: "梅林",
        percival: "派西维尔",
        loyal_servant: "忠诚仆人",
        assassin: "刺客",
        morgana: "莫甘娜",
        mordred: "莫德雷德",
        oberon: "奥伯伦",
        minion: "莫德雷德的爪牙",
      };

      const players = result.players.map((p) => ({
        ...p,
        role: roleMap[p.role] || p.role,
        team: p.team || (result.roles?.[p.name] ? "" : ""),
      }));

      const winnerLabel = result.winner === "good" ? "正义" : "邪恶";
      this.setData({
        winner: `${winnerLabel}阵营`,
        summary: result.summary || "",
        players,
      });
    }
  },

  onPlayAgain() {
    // 返回首页重新选择游戏
    wx.reLaunch({ url: "/pages/index/index" });
  },

  onShareAppMessage() {
    return {
      title: `我在桌游助手里玩了一局${
        this.data.winner
      }获胜！快来一起玩吧～`,
      path: "/pages/index/index",
    };
  },
});
