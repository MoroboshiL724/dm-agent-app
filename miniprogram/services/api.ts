/**
 * REST API 客户端封装
 */

const app = getApp<IAppOption>();

interface ApiResponse<T> {
  data: T;
  statusCode: number;
}

function request<T>(method: "GET" | "POST" | "DELETE", path: string, body?: Record<string, unknown>): Promise<T> {
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.apiUrl}${path}`,
      method,
      data: body,
      header: { "Content-Type": "application/json" },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data as T);
        } else {
          reject(new Error((res.data as { detail?: string })?.detail || `请求失败 (${res.statusCode})`));
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || "网络错误"));
      },
    });
  });
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>("GET", path);
}

export function apiPost<T>(path: string, data?: Record<string, unknown>): Promise<T> {
  return request<T>("POST", path, data);
}

/** 获取游戏类型列表 */
export function fetchGameTypes(): Promise<{ games: GameTypeInfo[] }> {
  return apiGet<{ games: GameTypeInfo[] }>("/games/types");
}

/** 创建游戏 */
export function createGame(gameType: string): Promise<{ game_id: string; room_code: string; ws_path: string }> {
  return apiPost("/games", { game_type: gameType });
}

/** 获取游戏信息 */
export function fetchGameInfo(gameId: string): Promise<{
  game_id: string; game_type: string; status: string;
  players: Array<{ player_id: string; name: string; is_alive: boolean; is_connected: boolean }>;
  room_code: string;
}> {
  return apiGet(`/games/${gameId}`);
}

/** 加入游戏 */
export function joinGame(gameId: string, playerName: string): Promise<{
  player_id: string; game_id: string; ws_token: string;
}> {
  return apiPost(`/games/${gameId}/join`, { player_name: playerName });
}

/** 通过房间号查询游戏信息 */
export function fetchGameByRoom(roomCode: string): Promise<{
  game_id: string; game_type: string; status: string;
  players: Array<{ player_id: string; name: string; is_alive: boolean; is_connected: boolean }>;
  room_code: string;
}> {
  return apiGet(`/games/by-room/${roomCode}`);
}
