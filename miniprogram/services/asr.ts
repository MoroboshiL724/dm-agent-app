/**
 * 语音识别服务 — 使用微信同声传译插件进行实时语音转文字
 *
 * 注意：模拟器中插件可能不可用，需在真机上测试语音功能。
 * 模拟器中会提示使用文字输入。
 */

type ASRCallback = (text: string, confidence: number) => void;

class ASRService {
  private recognitionManager: any = null;
  private isRecording = false;
  private onResult: ASRCallback | null = null;
  private onError: ((err: string) => void) | null = null;

  constructor() {
    this.initPlugin();
  }

  /** 初始化微信同声传译插件 */
  private initPlugin() {
    try {
      const plugin = requirePlugin("WechatSI");
      if (plugin && plugin.getRecordRecognitionManager) {
        const manager = plugin.getRecordRecognitionManager();
        this.recognitionManager = manager;

        manager.onRecognize((res: { result: string }) => {
          // 实时识别中（可展示部分结果）
          console.log("[ASR] Partial:", res.result);
        });

        manager.onStop((res: { result: string }) => {
          this.isRecording = false;
          const text = (res.result || "").trim();
          if (text) {
            this.onResult?.(text, 1.0);
          } else {
            this.onError?.("未识别到语音内容，请重试");
          }
        });

        manager.onError((err: { msg?: string; retcode?: number }) => {
          this.isRecording = false;
          console.error("[ASR] Error:", err);
          this.onError?.("语音识别失败，请使用文字输入");
        });

        console.log("[ASR] WechatSI plugin ready");
      }
    } catch (e) {
      console.warn("[ASR] WechatSI plugin not available:", e);
    }
  }

  setCallbacks(onResult: ASRCallback, onError: (err: string) => void) {
    this.onResult = onResult;
    this.onError = onError;
  }

  start() {
    if (this.isRecording) return;
    if (!this.recognitionManager) {
      this.onError?.("语音识别暂不可用，请使用文字输入");
      return;
    }
    this.isRecording = true;
    this.recognitionManager.start({
      duration: 30000, // 最长 30 秒
      lang: "zh_CN",
    });
  }

  stop() {
    if (!this.isRecording) return;
    this.recognitionManager.stop();
  }

  get recording(): boolean {
    return this.isRecording;
  }
}

export const asrService = new ASRService();
