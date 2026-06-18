/**
 * 服务器配置 — 部署时修改此文件
 *
 * 开发环境 (localhost):
 *   修改 serverUrl 为 "ws://localhost:8000"
 *   修改 apiUrl   为 "http://localhost:8000/api/v1"
 *
 * 生产环境 (云服务器):
 *   修改 serverUrl 为 "wss://your-domain.com"
 *   修改 apiUrl   为 "https://your-domain.com/api/v1"
 *
 * 注意：微信小程序要求生产环境必须使用 HTTPS/WSS
 */

const config = {
  /** WebSocket 地址 */
  serverUrl: "wss://gnixuhz.cn",

  /** REST API 地址 */
  apiUrl: "https://gnixuhz.cn/api/v1",
};

export default config;
