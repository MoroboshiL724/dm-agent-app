/**
 * TTS 语音播放服务 — 调用后端 Edge-TTS 合成语音并播放
 */

class TTSService {
  private audio: WechatMiniprogram.InnerAudioContext | null = null;
  private ttsUrl = "";
  private queue: string[] = [];
  private isPlaying = false;

  /** 设置 TTS 接口地址 */
  setTtsUrl(apiUrl: string) {
    this.ttsUrl = apiUrl + "/voice/tts";
  }

  /** 播放文字语音（自动排队，避免重叠） */
  speak(text: string, voice: string = "zh-CN-XiaoxiaoNeural") {
    if (!text || !text.trim()) return;
    if (!this.ttsUrl) {
      console.warn("[TTS] URL not configured");
      return;
    }

    // 截断过长文本（TTS 不适合超长文本）
    const shortText = text.length > 100 ? text.slice(0, 100) + "..." : text;

    this.queue.push(shortText);
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  private playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const text = this.queue.shift()!;
    const url = `${this.ttsUrl}?text=${encodeURIComponent(text)}&voice=zh-CN-XiaoxiaoNeural`;

    this.audio = wx.createInnerAudioContext();
    this.audio.src = url;
    this.audio.obeyMuteSwitch = false; // 手机静音时也播放（游戏语音需要）

    this.audio.onEnded(() => {
      this.audio?.destroy();
      this.audio = null;
      this.playNext(); // 播放下一个
    });

    this.audio.onError((err) => {
      console.error("[TTS] Playback error:", err);
      this.audio?.destroy();
      this.audio = null;
      this.playNext(); // 跳过失败的继续播
    });

    this.audio.play();
  }

  /** 停止所有播放并清空队列 */
  stopAll() {
    this.queue = [];
    if (this.audio) {
      this.audio.stop();
      this.audio.destroy();
      this.audio = null;
    }
    this.isPlaying = false;
  }
}

export const ttsService = new TTSService();
