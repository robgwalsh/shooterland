import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const VENDOR = join(dirname(fileURLToPath(import.meta.url)), '../vendor');

export interface AudioOutput {
  sounds: Record<string, string>;
  music: Record<string, string>;
  soundfont: string;
  synthWorker: string;
}

/**
 * Sound effects are copied as-is (browsers decode 8/16-bit PCM WAV natively)
 * and MIDI files are copied for in-browser synthesis. Names are lowercased.
 * `maptheme.mid` and `world7.mid` are byte-identical to `titlescreen.mid` and
 * `world6.mid` but keep their own entries so the music table reads naturally.
 * The General MIDI sound bank (GeneralUser GS by S. Christian Collins, SF3
 * build from the SpessaSynth project) ships from vendor/ with its licence.
 */
export function convertAudio(
  legacyDir: string,
  outDir: string,
  log: (s: string) => void,
): AudioOutput {
  const src = join(legacyDir, 'sounds');
  mkdirSync(join(outDir, 'sfx'), { recursive: true });
  mkdirSync(join(outDir, 'music'), { recursive: true });
  const sounds: Record<string, string> = {};
  const music: Record<string, string> = {};
  for (const file of readdirSync(src)) {
    const lower = file.toLowerCase();
    if (lower === 'world3 old.mid' || lower === 'music.mp3') continue; // unreferenced by the exe
    const key = lower.replace(/\.(wav|mid)$/, '');
    if (lower.endsWith('.wav')) {
      const rel = `sfx/${key}.wav`;
      copyFileSync(join(src, file), join(outDir, rel));
      sounds[key] = rel;
      log(rel);
    } else if (lower.endsWith('.mid')) {
      const rel = `music/${key}.mid`;
      copyFileSync(join(src, file), join(outDir, rel));
      music[key] = rel;
      log(rel);
    }
  }

  const soundfont = 'music/GeneralUserGS.sf3';
  copyFileSync(join(VENDOR, 'GeneralUserGS.sf3'), join(outDir, soundfont));
  copyFileSync(
    join(VENDOR, 'GeneralUserGS-LICENSE.txt'),
    join(outDir, 'music/GeneralUserGS-LICENSE.txt'),
  );
  log(`${soundfont} (+ licence)`);

  // The synth worker is built by the package (tsdown) into assets/music; the
  // pipeline only carries it across regenerations.
  const synthWorker = 'music/synth-worker.js';
  if (!existsSync(join(outDir, synthWorker))) {
    log(`${synthWorker} missing: run the package build to generate it`);
  }
  return { sounds, music, soundfont, synthWorker };
}
