export class WebGLUnavailableError extends Error {
  constructor() {
    super('WebGL2 is not available in this browser or context.');
    this.name = 'WebGLUnavailableError';
  }
}

/** Acquires a WebGL2 context tuned for 2D sprite rendering. Throws if unavailable. */
export function createGLContext(canvas: HTMLCanvasElement): WebGL2RenderingContext {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: 'low-power',
  });
  if (!gl) throw new WebGLUnavailableError();
  return gl;
}
