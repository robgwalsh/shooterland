import { Sequencer, WorkerSynthesizer } from 'spessasynth_lib';

export interface MidiMusicSources {
  /** Resolves a manifest path to a fetchable URL. */
  url(path: string): string;
  soundfont: string;
  synthWorker: string;
  tracks: Readonly<Record<string, string>>;
}

/**
 * Plays the game's MIDI tracks with a General MIDI sound bank, synthesised in
 * a Web Worker (spessasynth_lib). Everything heavy (worker script, ~8 MB
 * sound bank, MIDI files) is fetched on first use.
 */
export class MidiMusic {
  private synth: WorkerSynthesizer | null = null;
  private sequencer: Sequencer | null = null;
  private worker: Worker | null = null;
  private workerUrl: string | null = null;
  private setup: Promise<void> | null = null;
  private readonly midi = new Map<string, Promise<ArrayBuffer>>();
  private current: string | null = null;
  private wanted: string | null = null;
  private failed = false;

  constructor(
    private readonly context: AudioContext,
    private readonly output: AudioNode,
    private readonly sources: MidiMusicSources,
    private readonly signal: AbortSignal,
  ) {}

  private async fetchBuffer(path: string): Promise<ArrayBuffer> {
    const res = await fetch(this.sources.url(path), { signal: this.signal });
    if (!res.ok) throw new Error(`failed to load ${path}: HTTP ${res.status}`);
    return res.arrayBuffer();
  }

  private ensure(): Promise<void> {
    if (!this.setup) {
      this.setup = this.boot().catch((error: unknown) => {
        this.failed = true;
        if (!this.signal.aborted) console.warn('[shooterland] music disabled:', error);
      });
    }
    return this.setup;
  }

  private async boot(): Promise<void> {
    const [workerSource, soundfont] = await Promise.all([
      fetch(this.sources.url(this.sources.synthWorker), { signal: this.signal }).then((r) => {
        if (!r.ok) throw new Error(`failed to load synth worker: HTTP ${r.status}`);
        return r.text();
      }),
      this.fetchBuffer(this.sources.soundfont),
    ]);
    if (this.signal.aborted) return;
    this.workerUrl = URL.createObjectURL(new Blob([workerSource], { type: 'text/javascript' }));
    this.worker = new Worker(this.workerUrl);
    await WorkerSynthesizer.registerPlaybackWorklet(this.context);
    const synth = new WorkerSynthesizer(this.context, this.worker.postMessage.bind(this.worker));
    this.worker.onmessage = (e) => synth.handleWorkerMessage(e.data);
    // Route through our gain node instead of the context destination.
    synth.disconnect();
    synth.connect(this.output);
    await synth.soundBankManager.addSoundBank(soundfont, 'main');
    await synth.isReady;
    this.synth = synth;
    const seq = new Sequencer(synth, { skipToFirstNoteOn: true });
    seq.loopCount = -1; // -1 loops forever
    this.sequencer = seq;
  }

  /** Switches to `key` (a manifest music entry), or stops with null. Safe to call repeatedly. */
  play(key: string | null): void {
    this.wanted = key;
    if (this.failed) return;
    void this.ensure().then(() => this.apply());
  }

  private async apply(): Promise<void> {
    const seq = this.sequencer;
    if (!seq || this.failed) return;
    const key = this.wanted;
    if (key === this.current) return;
    if (key === null) {
      seq.pause();
      this.current = null;
      return;
    }
    const path = this.sources.tracks[key];
    if (!path) return;
    let p = this.midi.get(key);
    if (!p) {
      p = this.fetchBuffer(path);
      this.midi.set(key, p);
    }
    try {
      const binary = await p;
      if (this.wanted !== key || this.signal.aborted) return;
      seq.loadNewSongList([{ binary: binary.slice(0), fileName: key }]);
      seq.loopCount = -1;
      seq.play();
      this.current = key;
    } catch (error) {
      this.midi.delete(key);
      if (!this.signal.aborted) console.warn('[shooterland] could not play music:', error);
    }
  }

  destroy(): void {
    this.sequencer?.pause();
    this.synth?.disconnect();
    this.worker?.terminate();
    if (this.workerUrl) URL.revokeObjectURL(this.workerUrl);
    this.sequencer = null;
    this.synth = null;
    this.worker = null;
  }
}
