/**
 * 桌游助手 — App 入口
 */

import config from "./config";

App<IAppOption>({
  globalData: {
    serverUrl: config.serverUrl,
    apiUrl: config.apiUrl,
  },
  onLaunch() {
    console.log("[dm-agent] App launched");
  },
});
