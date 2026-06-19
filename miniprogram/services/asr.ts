/**
 * 语音识别服务 — 录音 → 上传后端 STT → 返回文字
 *
 * 个人主体小程序无法使用微信同声传译插件，改用自建后端 Whisper 识别。
 */

type ASRCallback = (text: string, confidence: number) => void;

class ASRService {
  private recorder: WechatMiniprogram.RecorderManager;
  private isRecording = false;
  private onResult: ASRCallback | null = null;
  private onError: ((err: string) => void) | null = null;
  private sttUrl = "";

  constructor() {
    this.recorder = wx.getRecorderManager();
    this.recorder.onStop((res) => this.onRecordStop(res));
    this.recorder.onError((err) => {
      this.isRecording = false;
      console.error("[ASR] Recorder error:", err);
      this.onError?.("录音失败，请重试");
    });
  }

  setCallbacks(onResult: ASRCallback, onError: (err: string) => void) {
    this.onResult = onResult;
    this.onError = onError;
  }

  /** 设置 STT 接口地址 */
  setSttUrl(apiUrl: string) {
    this.sttUrl = apiUrl + "/voice/stt";
  }

  start() {
    if (this.isRecording) return;
    this.isRecording = true;
    this.recorder.start({
      duration: 30000, // 最长 30 秒
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

  /** 录音结束 → 上传后端识别 */
  private onRecordStop(res: WechatMiniprogram.RecorderManagerOnStopCallbackResult) {
    this.isRecording = false;
    const filePath = res.tempFilePath;

    if (!filePath) {
      this.onError?.("录音文件获取失败");
      return;
    }

    wx.showLoading({ title: "识别中..." });

    wx.uploadFile({
      url: this.sttUrl,
      filePath,
      name: "file",
      success: (uploadRes) => {
        wx.hideLoading();
        try {
          const data = JSON.parse(uploadRes.data);
          const text = (data.text || "").trim();
          if (text) {
            this.onResult?.(text, 1.0);
          } else {
            this.onError?.("未识别到语音内容，请重试");
          }
        } catch {
          this.onError?.("语音识别解析失败");
        }
      },
      fail: (err) => {
        wx.hideLoading();
        console.error("[ASR] Upload failed:", err);
        this.onError?.("网络错误，请检查网络后重试");
      },
    });
  }

  get recording(): boolean {
    return this.isRecording;
  }
}

export const asrService = new ASRService();
