/**
 * 纯 Web Audio API 圣诞主题音效与八音盒 BGM 引擎
 * 零外部音频依赖，支持：
 * - 蓄力连续升调滑音
 * - 弹跳与普通落地
 * - 连续 Perfect 演奏《Jingle Bells》旋律音符
 * - 留声机彩蛋演奏《We Wish You a Merry Christmas》欢快片段
 * - 神秘礼盒、圣诞树亮灯、雪人欢呼、壁炉温暖、雪橇铃铛、护盾救援、坠落音效
 * - 可开关的轻柔圣诞八音盒背景音乐
 */

// 音符频率表 (Hz)
const NOTE: Record<string, number> = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
  C6: 1046.50, D6: 1174.66, E6: 1318.51,
};

// 连击 Perfect 演奏 Jingle Bells 副歌旋律
const JINGLE_BELLS_COMBO = [
  NOTE.E5, NOTE.E5, NOTE.E5,
  NOTE.E5, NOTE.E5, NOTE.E5,
  NOTE.E5, NOTE.G5, NOTE.C5, NOTE.D5, NOTE.E5,
  NOTE.F5, NOTE.F5, NOTE.F5, NOTE.F5,
  NOTE.F5, NOTE.E5, NOTE.E5, NOTE.E5,
  NOTE.E5, NOTE.D5, NOTE.D5, NOTE.E5, NOTE.D5, NOTE.G5,
];

// 温馨圣诞八音盒循环背景音轨 (音符 + 拍数)
const BGM_MELODY: Array<{ freq: number; bass?: number; beats: number }> = [
  // Jingle Bells 轻柔八音盒变奏
  { freq: NOTE.E5, bass: NOTE.C4, beats: 1 },
  { freq: NOTE.E5, beats: 1 },
  { freq: NOTE.E5, bass: NOTE.G4, beats: 2 },
  { freq: NOTE.E5, bass: NOTE.C4, beats: 1 },
  { freq: NOTE.E5, beats: 1 },
  { freq: NOTE.E5, bass: NOTE.G4, beats: 2 },
  { freq: NOTE.E5, bass: NOTE.C4, beats: 1 },
  { freq: NOTE.G5, beats: 1 },
  { freq: NOTE.C5, bass: NOTE.E4, beats: 1.5 },
  { freq: NOTE.D5, beats: 0.5 },
  { freq: NOTE.E5, bass: NOTE.C4, beats: 4 },
  { freq: NOTE.F5, bass: NOTE.F4, beats: 1 },
  { freq: NOTE.F5, beats: 1 },
  { freq: NOTE.F5, bass: NOTE.A4, beats: 1.5 },
  { freq: NOTE.F5, beats: 0.5 },
  { freq: NOTE.F5, bass: NOTE.C4, beats: 1 },
  { freq: NOTE.E5, beats: 1 },
  { freq: NOTE.E5, bass: NOTE.G4, beats: 1 },
  { freq: NOTE.E5, beats: 1 },
  { freq: NOTE.E5, bass: NOTE.D4, beats: 1 },
  { freq: NOTE.D5, beats: 1 },
  { freq: NOTE.D5, bass: NOTE.G4, beats: 1 },
  { freq: NOTE.E5, beats: 1 },
  { freq: NOTE.D5, bass: NOTE.G4, beats: 2 },
  { freq: NOTE.G5, bass: NOTE.B4, beats: 2 },
];

export class AudioManager {
  private ctx: AudioContext | null = null;
  private sfxEnabled = true;
  private bgmEnabled = true;

  private chargeOsc: OscillatorNode | null = null;
  private chargeSubOsc: OscillatorNode | null = null;
  private chargeGain: GainNode | null = null;

  private bgmTimer: number | null = null;
  private bgmIndex = 0;

  public unlock(): void {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.bgmEnabled && this.bgmTimer === null) {
      this.startBgm();
    }
  }

  public setSfxEnabled(enabled: boolean): void {
    this.sfxEnabled = enabled;
    if (!enabled) this.stopCharge();
  }

  public isSfxEnabled(): boolean {
    return this.sfxEnabled;
  }

  public setBgmEnabled(enabled: boolean): void {
    this.bgmEnabled = enabled;
    if (enabled) {
      this.unlock();
      this.startBgm();
    } else {
      this.stopBgm();
    }
  }

  public isBgmEnabled(): boolean {
    return this.bgmEnabled;
  }

  private startBgm(): void {
    if (!this.ctx || !this.bgmEnabled || this.bgmTimer !== null) return;
    const tempoMs = 285; // 一拍约 285ms，轻柔舒缓的八音盒节拍

    const scheduleNext = () => {
      if (!this.bgmEnabled || !this.ctx) {
        this.bgmTimer = null;
        return;
      }
      if (this.ctx.state === 'running') {
        const step = BGM_MELODY[this.bgmIndex];
        this.playMusicBoxTone(step.freq, 0.042, step.beats * 0.28);
        if (step.bass) {
          this.playMusicBoxTone(step.bass, 0.022, step.beats * 0.35, 'triangle');
        }
        this.bgmIndex = (this.bgmIndex + 1) % BGM_MELODY.length;
        this.bgmTimer = window.setTimeout(scheduleNext, step.beats * tempoMs);
      } else {
        this.bgmTimer = window.setTimeout(scheduleNext, 350);
      }
    };

    scheduleNext();
  }

  private stopBgm(): void {
    if (this.bgmTimer !== null) {
      clearTimeout(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  private playMusicBoxTone(
    freq: number,
    volume: number,
    duration: number,
    type: OscillatorType = 'sine'
  ): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const harmonic = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    // 柔和泛音模拟八音盒金属拨片质感
    harmonic.type = 'sine';
    harmonic.frequency.setValueAtTime(freq * 2, now);

    const hGain = this.ctx.createGain();
    hGain.gain.setValueAtTime(volume * 0.22, now);
    hGain.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(0.25, duration));

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration + 0.25);

    osc.connect(gain);
    harmonic.connect(hGain);
    hGain.connect(this.ctx.destination);
    gain.connect(this.ctx.destination);

    osc.start(now);
    harmonic.start(now);
    osc.stop(now + duration + 0.3);
    harmonic.stop(now + duration + 0.3);
  }

  /** 开始蓄力持续上升音 */
  public startCharge(): void {
    if (!this.sfxEnabled) return;
    this.unlock();
    if (!this.ctx) return;
    this.stopCharge();

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const sub = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);

    sub.type = 'triangle';
    sub.frequency.setValueAtTime(440, now);

    const subGain = this.ctx.createGain();
    subGain.gain.setValueAtTime(0.2, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.08);

    osc.connect(gain);
    sub.connect(subGain);
    subGain.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    sub.start(now);

    this.chargeOsc = osc;
    this.chargeSubOsc = sub;
    this.chargeGain = gain;
  }

  /** 蓄力中更新音高 (ratio: 0 ~ 1) */
  public updateCharge(ratio: number): void {
    if (!this.ctx || !this.chargeOsc || !this.chargeSubOsc) return;
    const clamped = Math.max(0, Math.min(1, ratio));
    const freq = 220 + clamped * 440; // 220Hz -> 660Hz
    const now = this.ctx.currentTime;
    this.chargeOsc.frequency.setTargetAtTime(freq, now, 0.025);
    this.chargeSubOsc.frequency.setTargetAtTime(freq * 1.5, now, 0.025);
  }

  /** 停止蓄力音 */
  public stopCharge(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.chargeGain) {
      try {
        this.chargeGain.gain.cancelScheduledValues(now);
        this.chargeGain.gain.setTargetAtTime(0.0001, now, 0.02);
      } catch {
        // ignore
      }
    }
    const osc = this.chargeOsc;
    const sub = this.chargeSubOsc;
    this.chargeOsc = null;
    this.chargeSubOsc = null;
    this.chargeGain = null;

    if (osc) {
      setTimeout(() => {
        try { osc.stop(); osc.disconnect(); } catch { /* ignore */ }
      }, 90);
    }
    if (sub) {
      setTimeout(() => {
        try { sub.stop(); sub.disconnect(); } catch { /* ignore */ }
      }, 90);
    }
  }

  /** 起跳弹跳声 */
  public playJump(): void {
    this.stopCharge();
    if (!this.sfxEnabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.14);

    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  /** 普通落地声（温暖木质雪地轻响） */
  public playLand(): void {
    if (!this.sfxEnabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(115, now + 0.11);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  /** 精准命中中心：按连击数演奏 Jingle Bells 音符！ */
  public playPerfect(combo: number): void {
    if (!this.sfxEnabled || !this.ctx) return;
    const idx = Math.max(0, combo - 1) % JINGLE_BELLS_COMBO.length;
    const freq = JINGLE_BELLS_COMBO[idx];

    this.playBellChime(freq, 0.15, 0.55);
    // 高连击加一层晶莹八度星光和声
    if (combo >= 2) {
      this.playBellChime(freq * 1.5, 0.06, 0.42);
    }
  }

  private playBellChime(freq: number, volume: number, duration: number, delaySec = 0): void {
    if (!this.ctx) return;
    const start = this.ctx.currentTime + delaySec;
    const osc = this.ctx.createOscillator();
    const overtone = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);

    overtone.type = 'triangle';
    overtone.frequency.setValueAtTime(freq * 2.0, start);

    const oGain = this.ctx.createGain();
    oGain.gain.setValueAtTime(volume * 0.35, start);
    oGain.gain.exponentialRampToValueAtTime(0.0001, start + duration * 0.65);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gain);
    overtone.connect(oGain);
    oGain.connect(this.ctx.destination);
    gain.connect(this.ctx.destination);

    osc.start(start);
    overtone.start(start);
    osc.stop(start + duration + 0.05);
    overtone.stop(start + duration + 0.05);
  }

  /** 彩蛋触发通用惊喜琶音 */
  public playEggFanfare(): void {
    if (!this.sfxEnabled || !this.ctx) return;
    const notes = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6];
    notes.forEach((n, i) => {
      this.playBellChime(n, 0.13, 0.5, i * 0.075);
    });
  }

  /** 留声机彩蛋专属：We Wish You a Merry Christmas 欢快旋律 */
  public playGramophoneMelody(): void {
    if (!this.sfxEnabled || !this.ctx) return;
    const seq: Array<[number, number]> = [
      [NOTE.G4, 0.0],
      [NOTE.C5, 0.18],
      [NOTE.C5, 0.36],
      [NOTE.D5, 0.48],
      [NOTE.C5, 0.60],
      [NOTE.B4, 0.72],
      [NOTE.A4, 0.84],
      [NOTE.A4, 1.02],
      [NOTE.A4, 1.20],
      [NOTE.D5, 1.38],
      [NOTE.D5, 1.56],
      [NOTE.E5, 1.68],
      [NOTE.D5, 1.80],
      [NOTE.C5, 1.92],
      [NOTE.B4, 2.04],
      [NOTE.G4, 2.22],
      [NOTE.G5, 2.40],
    ];
    seq.forEach(([freq, delay]) => {
      this.playBellChime(freq, 0.11, 0.36, delay);
    });
  }

  /** 雪橇飞过夜空铃铛声（清脆高频雪橇铃 + 闪耀星尘） */
  public playSleighBells(): void {
    if (!this.sfxEnabled || !this.ctx) return;
    const shimmerNotes = [1567.98, 2093.0, 2637.02, 2093.0, 1567.98, 2637.02, 3135.96];
    shimmerNotes.forEach((f, i) => {
      this.playBellChime(f, 0.055, 0.25, i * 0.09);
    });
    // 叠加欢快的 Ho-Ho-Ho 暖低音跃动
    [NOTE.G4, NOTE.B4, NOTE.D5].forEach((f, i) => {
      this.playBellChime(f, 0.11, 0.35, 0.12 + i * 0.18);
    });
  }

  /** 圣诞护盾救回魔法音效 */
  public playShieldSave(): void {
    if (!this.sfxEnabled || !this.ctx) return;
    const harp = [NOTE.G4, NOTE.B4, NOTE.D5, NOTE.G5, NOTE.B5, NOTE.D6];
    harp.forEach((f, i) => {
      this.playBellChime(f, 0.12, 0.45, i * 0.05);
    });
  }

  /** 掉入雪夜的滑稽下滑音 */
  public playFall(): void {
    this.stopCharge();
    if (!this.sfxEnabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.45);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }
}
