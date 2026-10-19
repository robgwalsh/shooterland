import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface AudioOutput {
  sounds: Record<string, string>;
  music: Record<string, string>;
}

/**
 * Sound effects are copied as-is (browsers decode 8/16-bit PCM WAV natively)
 * and MIDI files are copied for in-browser synthesis. Names are lowercased.
 * `maptheme.mid` and `world7.mid` are byte-identical to `titlescreen.mid` and
 * `world6.mid` but keep their own entries so the music table reads naturally.
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
  return { sounds, music };
}
