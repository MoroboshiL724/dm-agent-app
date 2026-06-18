/** 游戏相关类型 */

/** 游戏类型元信息 */
interface GameTypeInfo {
  game_id: string;
  name: string;
  min_players: number;
  max_players: number;
  icon?: string;
  description?: string;
}

/** 玩家 */
interface PlayerInfo {
  player_id: string;
  name: string;
  is_alive: boolean;
  is_connected: boolean;
  is_ready?: boolean;
  is_host?: boolean;
}

/** 游戏阶段 */
interface PhaseInfo {
  phase_id: string;
  name: string;
  remaining_seconds?: number;
}

/** 来自服务端的公开状态 */
interface PublicGameState {
  phase: PhaseInfo;
  round_number: number;
  players: PlayerInfo[];
  alive_count: number;
}

/** 来自服务端的私有状态（仅该玩家可见） */
interface PrivateGameState {
  role: string;
  team?: string;
  teammates?: string[];
  available_actions: ActionSchema[];
  phase_data: Record<string, unknown>;
}

/** 可选动作 */
interface ActionSchema {
  action_type: string;
  label: string;
  params_schema?: Record<string, unknown>;
  target_required?: boolean;
  valid_targets?: string[];
}
