/**
 * 소리 엔진 (Web Audio). 음원 파일 없이 코드로 소리를 만듭니다.
 * - 배경음악: 느린 화음 패드 + 가끔 울리는 맑은 음 + 장면·시간대별 환경음(바람, 풀벌레, 새)
 * - 효과음: 종이비행기 슝, 파쇄기, 지우개, 풍선 팡, 간식 띵, 칭호 팡파르 등
 * - 브라우저 정책상 사용자가 화면을 한 번 눌러야 소리가 남 (그 전에는 대기)
 * - 탭이 가려지면 멈춰서 배터리를 아낌
 */
import { getSettings, subscribeSettings } from '../hooks/settingsStore'
import type { SceneId } from '../data/scenes'
import type { TimeName } from '../data/timeOfDay'

export type SfxName =
  | 'tap'
  | 'door'
  | 'snack'
  | 'title'
  | 'lap'
  | 'airplane'
  | 'shredder'
  | 'eraser'
  | 'balloon'
  | 'stick'
  | 'react'
  | 'cloud'
  | 'greet'
  | 'soft'

// D 장조 느낌의 잔잔한 화음 (Hz). 각 화음 8초
const CHORDS: number[][] = [
  [146.83, 220.0, 277.18, 329.63], // Dmaj9 느낌
  [123.47, 185.0, 246.94, 293.66], // Bm7
  [98.0, 196.0, 246.94, 293.66], // Gmaj7
  [110.0, 164.81, 220.0, 277.18], // Aadd9
]
const PENTA = [587.33, 659.25, 739.99, 880.0, 987.77, 1174.66, 1318.51]
const CHORD_SEC = 8

class AudioEngine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private bgmBus!: GainNode
  private sfxBus!: GainNode
  private reverb!: ConvolverNode
  private reverbIn!: GainNode
  private delay!: DelayNode
  private noise!: AudioBuffer
  private padFilter!: BiquadFilterNode
  private scheduler: number | null = null
  private nextChordAt = 0
  private chordIndex = 0
  private nextPluckAt = 0
  private nextAmbientAt = 0
  private scene: SceneId = 'playground'
  private time: TimeName = 'evening'
  private windGain: GainNode | null = null
  private unlocked = false

  constructor() {
    if (typeof window === 'undefined') return
    // 첫 터치/클릭 때 소리 장치를 깨움
    const unlock = () => {
      this.unlocked = true
      this.apply()
    }
    window.addEventListener('pointerdown', unlock, { capture: true })
    window.addEventListener('keydown', unlock, { capture: true })
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return
      if (document.visibilityState === 'hidden') void this.ctx.suspend()
      else if (this.wantsSound()) void this.ctx.resume()
    })
    subscribeSettings(() => this.apply())
  }

  private wantsSound() {
    const s = getSettings()
    return s.bgm || s.sfx
  }

  private init() {
    if (this.ctx) return this.ctx
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AC()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0.9
    this.master.connect(ctx.destination)

    // 공간감: 코드로 만든 잔향 (짧게 사라지는 잡음)
    this.reverb = ctx.createConvolver()
    const len = Math.floor(ctx.sampleRate * 3)
    const ir = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch)
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6)
    }
    this.reverb.buffer = ir
    this.reverbIn = ctx.createGain()
    this.reverbIn.gain.value = 0.55
    this.reverbIn.connect(this.reverb)
    this.reverb.connect(this.master)

    // 맑은 음에 쓰는 메아리
    this.delay = ctx.createDelay(1.5)
    this.delay.delayTime.value = 0.42
    const fb = ctx.createGain()
    fb.gain.value = 0.32
    this.delay.connect(fb)
    fb.connect(this.delay)
    this.delay.connect(this.reverbIn)

    this.bgmBus = ctx.createGain()
    this.bgmBus.gain.value = 0
    this.bgmBus.connect(this.master)
    this.bgmBus.connect(this.reverbIn)
    this.sfxBus = ctx.createGain()
    this.sfxBus.gain.value = 0
    this.sfxBus.connect(this.master)
    const sfxVerb = ctx.createGain()
    sfxVerb.gain.value = 0.25
    this.sfxBus.connect(sfxVerb)
    sfxVerb.connect(this.reverbIn)

    // 패드가 지나가는 부드러운 필터 (천천히 열렸다 닫힘)
    this.padFilter = ctx.createBiquadFilter()
    this.padFilter.type = 'lowpass'
    this.padFilter.frequency.value = 900
    this.padFilter.Q.value = 0.5
    this.padFilter.connect(this.bgmBus)
    const lfo = ctx.createOscillator()
    const lfoGain = ctx.createGain()
    lfo.frequency.value = 0.05
    lfoGain.gain.value = 350
    lfo.connect(lfoGain)
    lfoGain.connect(this.padFilter.frequency)
    lfo.start()

    // 환경음용 잡음 (2초 반복)
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const n = this.noise.getChannelData(0)
    let last = 0
    for (let i = 0; i < n.length; i++) {
      // 분홍 잡음 비슷하게 (부드러운 쉬익)
      last = 0.97 * last + 0.03 * (Math.random() * 2 - 1)
      n[i] = last * 6
    }
    return ctx
  }

  /** 설정에 맞춰 켜고 끄기 */
  private apply() {
    const s = getSettings()
    if (!this.unlocked || !this.wantsSound()) {
      if (this.ctx) {
        this.ramp(this.bgmBus.gain, 0, 0.8)
        this.ramp(this.sfxBus.gain, 0, 0.2)
        if (!this.wantsSound()) window.setTimeout(() => !this.wantsSound() && this.ctx?.suspend(), 900)
      }
      this.stopScheduler()
      return
    }
    const ctx = this.init()
    if (ctx.state !== 'running' && document.visibilityState !== 'hidden') void ctx.resume()
    this.ramp(this.bgmBus.gain, s.bgm ? 0.22 * s.bgmVolume : 0, 1.6)
    this.ramp(this.sfxBus.gain, s.sfx ? 0.5 * s.sfxVolume : 0, 0.2)
    if (s.bgm) this.startScheduler()
    else this.stopScheduler()
  }

  private ramp(p: AudioParam, v: number, sec: number) {
    if (!this.ctx) return
    const t = this.ctx.currentTime
    p.cancelScheduledValues(t)
    p.setValueAtTime(p.value, t)
    p.linearRampToValueAtTime(v, t + sec)
  }

  // ---------- 배경음악 ----------
  private startScheduler() {
    if (this.scheduler !== null || !this.ctx) return
    const now = this.ctx.currentTime
    this.nextChordAt = now + 0.1
    this.nextPluckAt = now + 3
    this.nextAmbientAt = now + 1
    this.updateWind()
    this.scheduler = window.setInterval(() => this.tick(), 250)
  }
  private stopScheduler() {
    if (this.scheduler !== null) window.clearInterval(this.scheduler)
    this.scheduler = null
    if (this.windGain) this.ramp(this.windGain.gain, 0, 1.5)
  }

  private tick() {
    const ctx = this.ctx
    if (!ctx || ctx.state !== 'running') return
    const ahead = ctx.currentTime + 0.5
    if (this.nextChordAt < ahead) {
      this.playChord(CHORDS[this.chordIndex % CHORDS.length], this.nextChordAt)
      this.chordIndex++
      this.nextChordAt += CHORD_SEC
    }
    if (this.nextPluckAt < ahead) {
      // 실내는 조금 더 드물게
      const note = PENTA[Math.floor(Math.random() * PENTA.length)] / (this.scene === 'playground' ? 1 : 2)
      this.pluck(note, this.nextPluckAt, 0.05)
      if (Math.random() < 0.35) this.pluck(note * 1.5, this.nextPluckAt + 0.21, 0.03)
      this.nextPluckAt += 2.5 + Math.random() * (this.scene === 'playground' ? 3 : 5)
    }
    if (this.nextAmbientAt < ahead) {
      this.ambient(this.nextAmbientAt)
      this.nextAmbientAt += 1.2 + Math.random() * 2.5
    }
  }

  private playChord(freqs: number[], at: number) {
    const ctx = this.ctx!
    const warm = this.scene === 'playground' ? 1 : 0.8
    freqs.forEach((f, i) => {
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, at)
      g.gain.linearRampToValueAtTime(0.09 / (1 + i * 0.25), at + 3)
      g.gain.setValueAtTime(0.09 / (1 + i * 0.25), at + CHORD_SEC - 1)
      g.gain.linearRampToValueAtTime(0, at + CHORD_SEC + 3)
      g.connect(this.padFilter)
      for (const [type, detune] of [
        ['sine', -6],
        ['triangle', 7],
      ] as const) {
        const o = ctx.createOscillator()
        o.type = type
        o.frequency.value = f * warm
        o.detune.value = detune
        o.connect(g)
        o.start(at)
        o.stop(at + CHORD_SEC + 3.2)
      }
    })
  }

  private pluck(freq: number, at: number, vol: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = freq
    g.gain.setValueAtTime(0, at)
    g.gain.linearRampToValueAtTime(vol, at + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, at + 2.6)
    o.connect(g)
    g.connect(this.bgmBus)
    g.connect(this.delay)
    o.start(at)
    o.stop(at + 2.7)
  }

  /** 장면·시간대별 환경음 한 번 (풀벌레, 새) */
  private ambient(at: number) {
    if (this.scene !== 'playground') return
    const ctx = this.ctx!
    if (this.time === 'night' || this.time === 'evening') {
      // 풀벌레: 높은 음을 빠르게 떨기
      if (this.time === 'evening' && Math.random() < 0.6) return
      const o = ctx.createOscillator()
      const am = ctx.createOscillator()
      const amG = ctx.createGain()
      const g = ctx.createGain()
      o.frequency.value = 4200 + Math.random() * 900
      am.frequency.value = 28 + Math.random() * 10
      amG.gain.value = 0.5
      am.connect(amG)
      amG.connect(g.gain)
      const dur = 0.4 + Math.random() * 0.6
      g.gain.setValueAtTime(0, at)
      g.gain.linearRampToValueAtTime(0.012, at + 0.05)
      g.gain.linearRampToValueAtTime(0, at + dur)
      o.connect(g)
      g.connect(this.bgmBus)
      o.start(at)
      am.start(at)
      o.stop(at + dur + 0.05)
      am.stop(at + dur + 0.05)
    } else if (Math.random() < 0.5) {
      // 낮·오전: 짧은 새소리 (빠르게 오르내리는 음)
      for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) {
        const t = at + k * 0.13
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        const base = 2400 + Math.random() * 1200
        o.frequency.setValueAtTime(base, t)
        o.frequency.exponentialRampToValueAtTime(base * 1.5, t + 0.06)
        o.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.1)
        g.gain.setValueAtTime(0, t)
        g.gain.linearRampToValueAtTime(0.015, t + 0.02)
        g.gain.linearRampToValueAtTime(0, t + 0.11)
        o.connect(g)
        g.connect(this.bgmBus)
        o.start(t)
        o.stop(t + 0.12)
      }
    }
  }

  /** 운동장 저녁·밤에는 은은한 바람 소리 */
  private updateWind() {
    const ctx = this.ctx
    if (!ctx) return
    if (!this.windGain) {
      const src = ctx.createBufferSource()
      src.buffer = this.noise
      src.loop = true
      const bp = ctx.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 500
      bp.Q.value = 0.7
      const lfo = ctx.createOscillator()
      const lg = ctx.createGain()
      lfo.frequency.value = 0.08
      lg.gain.value = 250
      lfo.connect(lg)
      lg.connect(bp.frequency)
      this.windGain = ctx.createGain()
      this.windGain.gain.value = 0
      src.connect(bp)
      bp.connect(this.windGain)
      this.windGain.connect(this.bgmBus)
      src.start()
      lfo.start()
    }
    const on = getSettings().bgm && this.scene === 'playground'
    const level = this.time === 'day' || this.time === 'morning' ? 0.05 : 0.09
    this.ramp(this.windGain.gain, on ? level : 0, 2)
  }

  /** 장면이나 시간대가 바뀌면 분위기를 맞춤 */
  setMood(scene: SceneId, time: TimeName) {
    this.scene = scene
    this.time = time
    if (this.ctx && this.scheduler !== null) this.updateWind()
  }

  // ---------- 효과음 ----------
  play(name: SfxName) {
    const s = getSettings()
    if (!s.sfx || !this.unlocked) return
    const ctx = this.init()
    if (ctx.state !== 'running') void ctx.resume()
    const t = ctx.currentTime + 0.02
    const tone = (f: number, at: number, dur: number, vol = 0.3, type: OscillatorType = 'sine', toF?: number) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = type
      o.frequency.setValueAtTime(f, at)
      if (toF) o.frequency.exponentialRampToValueAtTime(toF, at + dur)
      g.gain.setValueAtTime(0, at)
      g.gain.linearRampToValueAtTime(vol, at + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, at + dur)
      o.connect(g)
      g.connect(this.sfxBus)
      o.start(at)
      o.stop(at + dur + 0.02)
    }
    const noise = (at: number, dur: number, vol: number, f1: number, f2: number, q = 1, type: BiquadFilterType = 'bandpass') => {
      const src = ctx.createBufferSource()
      src.buffer = this.noise
      const f = ctx.createBiquadFilter()
      f.type = type
      f.Q.value = q
      f.frequency.setValueAtTime(f1, at)
      f.frequency.exponentialRampToValueAtTime(f2, at + dur)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, at)
      g.gain.linearRampToValueAtTime(vol, at + dur * 0.25)
      g.gain.linearRampToValueAtTime(0, at + dur)
      src.connect(f)
      f.connect(g)
      g.connect(this.sfxBus)
      src.start(at, Math.random())
      src.stop(at + dur + 0.02)
    }
    switch (name) {
      case 'tap':
        tone(880, t, 0.08, 0.15, 'sine', 660)
        break
      case 'soft':
        tone(440, t, 0.15, 0.15, 'sine', 330)
        break
      case 'door':
        noise(t, 0.08, 0.5, 300, 200, 2, 'lowpass')
        noise(t + 0.16, 0.08, 0.45, 300, 200, 2, 'lowpass')
        tone(659.25, t + 0.35, 0.9, 0.12)
        tone(987.77, t + 0.45, 0.9, 0.1)
        break
      case 'snack':
        tone(1318.5, t, 0.7, 0.2)
        tone(1760, t + 0.08, 0.8, 0.15)
        break
      case 'title':
        ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * 0.12, 0.7, 0.18, 'triangle'))
        break
      case 'lap':
        tone(783.99, t, 0.4, 0.16, 'triangle')
        tone(1174.66, t + 0.14, 0.6, 0.16, 'triangle')
        break
      case 'airplane':
        noise(t, 1.0, 0.35, 400, 2400, 1.5)
        break
      case 'shredder':
        for (let k = 0; k < 6; k++) tone(85 + Math.random() * 10, t + k * 0.09, 0.09, 0.12, 'sawtooth')
        noise(t, 0.6, 0.18, 2000, 1200, 0.8)
        break
      case 'eraser':
        for (let k = 0; k < 3; k++) noise(t + k * 0.16, 0.14, 0.3, 2800, 1800, 1.2)
        break
      case 'balloon':
        tone(200, t, 0.55, 0.06, 'sine', 520)
        noise(t + 0.55, 0.09, 0.7, 3000, 1500, 0.6, 'highpass')
        for (let k = 0; k < 5; k++) tone(1800 + Math.random() * 1600, t + 0.6 + k * 0.05, 0.25, 0.06)
        break
      case 'stick':
        noise(t, 0.05, 0.4, 900, 600, 1.5)
        tone(523.25, t + 0.05, 0.25, 0.14, 'triangle')
        break
      case 'react':
        tone(660, t, 0.12, 0.14, 'sine', 990)
        break
      case 'cloud':
        noise(t, 1.4, 0.12, 600, 1600, 0.8)
        ;[1174.66, 1318.51, 1567.98, 1760, 2349.32].forEach((f, i) => tone(f, t + 0.2 + i * 0.18, 1.2, 0.07))
        break
      case 'greet':
        tone(587.33, t, 0.5, 0.14)
        tone(880, t + 0.16, 0.7, 0.12)
        break
    }
  }
}

/** 앱 전체가 쓰는 소리 엔진 */
export const audio = new AudioEngine()
