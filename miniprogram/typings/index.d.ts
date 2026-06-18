/** 全局类型声明 */

/** 全局类型声明 */

interface IAppOption {
  globalData: {
    serverUrl: string;
    apiUrl: string;
    gameResult?: {
      winner: string;
      summary: string;
      roles: Record<string, string>;
      players: Array<{ name: string; role: string; team: string }>;
    };
  };
}
