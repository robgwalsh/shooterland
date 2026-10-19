/**
 * Web Worker half of the MIDI synthesizer. Built by tsdown into a single
 * classic script (assets/music/synth-worker.js) that the engine loads
 * through a blob URL, so consumers need no bundler configuration.
 */
import { WorkerSynthesizerCore } from 'spessasynth_lib';

// The DOM lib types `self` as a Window; inside a worker it is the worker scope.
const scope = self as unknown as {
  onmessage: ((e: MessageEvent) => void) | null;
  postMessage: Worker['postMessage'];
};

let core: WorkerSynthesizerCore | null = null;

scope.onmessage = (e: MessageEvent): void => {
  const port = e.ports[0];
  if (port) {
    core = new WorkerSynthesizerCore(e.data, port, scope.postMessage.bind(scope));
  } else {
    void core?.handleMessage(e.data);
  }
};
