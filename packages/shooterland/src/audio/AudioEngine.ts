import type { AssetManifest } from '../assets/manifest';
import { MidiMusic } from './MidiMusic';

/** What scenes talk to. `NullAudio` is used when audio is disabled. */
export interface GameAudio {
  /** Must be called from inside a user gesture to satisfy autoplay policies. */
  unlock(): void;
  /** Plays a sound effect by manifest key ('shoot', 'thingyhit', 'combo', 'bomb', 'pop'). */
  sfx(name: string): void;
  /** Switches the looping music track by manifest key, or stops it with null. */
  music(key: string | null): void;
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;
  suspend(): void;
  resume(): void;
  destroy(): void;
}

export class NullAudio implements GameAudio {
  unlock(): void {}
  sfx(_name: string): void {}
  music(_key: string | null): void {}
  setMuted(_muted: boolean): void {}
  setVolume(_volume: number): void {}
  suspend(): void {}
  resume(): void {}
  destroy(): void {}
}

/**
 * WebAudio implementation: sound effects from the legacy WAVs, music from the
 * legacy MIDIs through the worker synthesizer. The AudioContext is created on
 * the first user gesture; sounds requested before that are dropped.
 */
export class WebAudioEngine implements GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicPlayer: MidiMusic | null = null;
  private readonly wavBytes = new Map<string, Promise<ArrayBuffer>>();
  private readonly buffers = new Map<string, Promise<AudioBuffer | null>>();
  private muted: boolean;
  private volume = 1;
  private wantedMusic: string | null = null;
  private suspended = false;

  constructor(
    private readonly manifest: AssetManifest,
    private readonly url: (path: string) => string,
    private readonly signal: AbortSignal,
    options: { muted?: boolean | undefined } = {},
  ) {
    this.muted = options.muted ?? false;
    // Fetch the WAV bytes right away (they are small); decoding waits for the context.
    for (const [name, path] of Object.entries(manifest.sounds)) {
      this.wavBytes.set(
        name,
        fetch(url(path), { signal }).then((r) => {
          if (!r.ok) throw new Error(`failed to load ${path}: HTTP ${r.status}`);
          return r.arrayBuffer();
        }),
      );
    }
    for (const p of this.wavBytes.values()) p.catch(() => {});
  }

  unlock(): void {
    if (this.signal.aborted) return;
    if (!this.context) {
      try {
        const Ctx = globalThis.AudioContext;
        if (!Ctx) return;
        const context = new Ctx({ sampleRate: 44100 });
        const master = context.createGain();
        const sfxGain = context.createGain();
        const musicGain = context.createGain();
        sfxGain.connect(master);
        musicGain.connect(master);
        master.connect(context.destination);
        musicGain.gain.value = 0.6;
        this.context = context;
        this.master = master;
        this.sfxGain = sfxGain;
        this.applyGain();
        this.musicPlayer = new MidiMusic(
          context,
          musicGain,
          {
            url: this.url,
            soundfont: this.manifest.soundfont,
            synthWorker: this.manifest.synthWorker,
            tracks: this.manifest.music,
          },
          this.signal,
        );
        if (this.wantedMusic) this.musicPlayer.play(this.wantedMusic);
      } catch (error) {
        console.warn('[shooterland] audio unavailable:', error);
        return;
      }
    }
    if (this.context.state === 'suspended' && !this.suspended) void this.context.resume();
  }

  private applyGain(): void {
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
  }

  private decode(name: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(name);
    if (!p) {
      const bytes = this.wavBytes.get(name);
      const context = this.context;
      p =
        bytes && context
          ? bytes.then((b) => context.decodeAudioData(b.slice(0))).catch(() => null)
          : Promise.resolve(null);
      this.buffers.set(name, p);
    }
    return p;
  }

  sfx(name: string): void {
    const context = this.context;
    const out = this.sfxGain;
    if (!context || !out || this.muted || this.suspended) return;
    void this.decode(name).then((buffer) => {
      if (!buffer || this.signal.aborted) return;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(out);
      source.start();
    });
  }

  music(key: string | null): void {
    this.wantedMusic = key;
    this.musicPlayer?.play(key);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyGain();
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.applyGain();
  }

  suspend(): void {
    this.suspended = true;
    void this.context?.suspend();
  }

  resume(): void {
    this.suspended = false;
    if (this.context?.state === 'suspended') void this.context.resume();
  }

  destroy(): void {
    this.musicPlayer?.destroy();
    this.musicPlayer = null;
    void this.context?.close();
    this.context = null;
  }
}
