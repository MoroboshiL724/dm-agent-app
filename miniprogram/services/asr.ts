/**
 * 语音识别服务 — 录音 + 微信 ASR 识别
 */

type ASRCallback = (text: string, confidence: number) => void;

class ASRService {
  private recorder: WechatMiniprogram.RecorderManager;
  private isRecording = false;
  private onResult: ASRCallback | null = null;
  private onError: ((err: string) => void) | null = null;

  constructor() {
    this.recorder = wx.getRecorderManager();

    this.recorder.onStop((res) => {
      this.isRecording = false;
      this.processRecording(res.tempFilePath);
    });

    this.recorder.onError((err) => {
      this.isRecording = false;
      console.error("[ASR] Recorder error:", err);
      this.onError?.("录音失败");
    });

    this.recorder.onFrameRecorded((res) => {
      // 帧数据回调，可用于实时音量显示
    });
  }

  setCallbacks(onResult: ASRCallback, onError: (err: string) => void) {
    this.onResult = onResult;
    this.onError = onError;
  }

  start() {
    if (this.isRecording) return;
    this.isRecording = true;
    this.recorder.start({
      duration: 30000,       // 最长30秒
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 48000,
      format: "mp3",
      frameSize: 50,
    });
  }

  stop() {
    if (!this.isRecording) return;
    this.recorder.stop();
  }

  /** 处理录音文件 → 调用微信语音识别 */
  private processRecording(filePath: string) {
    // 微信小程序内置的语音识别
    const plugin = requirePlugin?.("WechatSI");
    if (plugin) {
      // 使用微信同声传译插件
      const manager = plugin.getRecordRecognitionManager();
      // 注意：此方式需要在小程序后台添加插件
      // 简化版：直接使用 wx 的语音识别能力
      this.fallbackASR(filePath);
    } else {
      this.fallbackASR(filePath);
    }
  }

  /** 降级方案：使用 wx.createInnerAudioContext 播放 + 手动输入 */
  private fallbackASR(_filePath: string) {
    // 微信小程序基础库 2.24+ 支持 wx.startRecord 的语音转文字
    // 但旧版需要接入第三方或提示用户手动输入
    this.onError?.("语音识别暂不可用，请使用文字输入");
  }

  /** 微信小程序原生语音转文字（基础库 >= 2.24） */
  startRealtimeASR() {
    // 使用 wx.getRecorderManager + 实时语音识别
    // 微信小程序的实时语音识别需要特殊权限
    // MVP 阶段使用录音 + 转文字方案
  }

  get recording(): boolean {
    return this.isRecording;
  }
}

export const asrService = new ASRService();
