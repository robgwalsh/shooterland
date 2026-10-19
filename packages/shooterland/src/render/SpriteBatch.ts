import { VIRTUAL_HEIGHT, VIRTUAL_WIDTH } from '../core/constants';
import type { Texture } from './Texture';

const VERTEX_SRC = `#version 300 es
precision highp float;
layout(location = 0) in vec2 a_pos;
layout(location = 1) in vec2 a_uv;
layout(location = 2) in vec4 a_color;
uniform vec2 u_virtualSize;
out vec2 v_uv;
out vec4 v_color;
void main() {
  vec2 clip = vec2(a_pos.x / u_virtualSize.x * 2.0 - 1.0, 1.0 - a_pos.y / u_virtualSize.y * 2.0);
  gl_Position = vec4(clip, 0.0, 1.0);
  v_uv = a_uv;
  v_color = a_color;
}`;

const FRAGMENT_SRC = `#version 300 es
precision mediump float;
uniform sampler2D u_tex;
in vec2 v_uv;
in vec4 v_color;
out vec4 fragColor;
void main() {
  fragColor = texture(u_tex, v_uv) * v_color;
}`;

const FLOATS_PER_VERTEX = 8; // x y u v r g b a
const MAX_QUADS = 4096;

function compile(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('could not create shader');
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`shader compile failed: ${log}`);
  }
  return shader;
}

/**
 * Batches textured quads in virtual (800x600) coordinates into as few draw
 * calls as possible: one per texture change or buffer overflow.
 */
export class SpriteBatch {
  private readonly program: WebGLProgram;
  private readonly vao: WebGLVertexArrayObject;
  private readonly vbo: WebGLBuffer;
  private readonly vertices = new Float32Array(MAX_QUADS * 4 * FLOATS_PER_VERTEX);
  private quadCount = 0;
  private current: Texture | null = null;
  drawCalls = 0;

  constructor(private readonly gl: WebGL2RenderingContext) {
    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
    const program = gl.createProgram();
    if (!program) throw new Error('could not create program');
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`program link failed: ${gl.getProgramInfoLog(program)}`);
    }
    this.program = program;

    const vao = gl.createVertexArray();
    const vbo = gl.createBuffer();
    const ibo = gl.createBuffer();
    if (!vao || !vbo || !ibo) throw new Error('could not create buffers');
    this.vao = vao;
    this.vbo = vbo;

    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices.byteLength, gl.DYNAMIC_DRAW);
    const stride = FLOATS_PER_VERTEX * 4;
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, stride, 8);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 16);

    const indices = new Uint16Array(MAX_QUADS * 6);
    for (let q = 0, v = 0; q < MAX_QUADS; q++, v += 4) {
      indices.set([v, v + 1, v + 2, v, v + 2, v + 3], q * 6);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
  }

  begin(): void {
    const { gl } = this;
    gl.useProgram(this.program);
    gl.uniform2f(
      gl.getUniformLocation(this.program, 'u_virtualSize'),
      VIRTUAL_WIDTH,
      VIRTUAL_HEIGHT,
    );
    gl.uniform1i(gl.getUniformLocation(this.program, 'u_tex'), 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(this.vao);
    this.drawCalls = 0;
    this.quadCount = 0;
    this.current = null;
  }

  /**
   * Queues one quad. Source rect in texture pixels, destination in virtual pixels.
   * Colour components are 0..1 and multiply the texture (alpha included).
   */
  draw(
    tex: Texture,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
    r = 1,
    g = 1,
    b = 1,
    a = 1,
  ): void {
    if (this.current !== tex || this.quadCount === MAX_QUADS) {
      this.flush();
      this.current = tex;
    }
    const u0 = sx / tex.width;
    const v0 = sy / tex.height;
    const u1 = (sx + sw) / tex.width;
    const v1 = (sy + sh) / tex.height;
    const o = this.quadCount * 4 * FLOATS_PER_VERTEX;
    const v = this.vertices;
    // top-left, top-right, bottom-right, bottom-left
    v[o] = dx;
    v[o + 1] = dy;
    v[o + 2] = u0;
    v[o + 3] = v0;
    v[o + 4] = r;
    v[o + 5] = g;
    v[o + 6] = b;
    v[o + 7] = a;
    v[o + 8] = dx + dw;
    v[o + 9] = dy;
    v[o + 10] = u1;
    v[o + 11] = v0;
    v[o + 12] = r;
    v[o + 13] = g;
    v[o + 14] = b;
    v[o + 15] = a;
    v[o + 16] = dx + dw;
    v[o + 17] = dy + dh;
    v[o + 18] = u1;
    v[o + 19] = v1;
    v[o + 20] = r;
    v[o + 21] = g;
    v[o + 22] = b;
    v[o + 23] = a;
    v[o + 24] = dx;
    v[o + 25] = dy + dh;
    v[o + 26] = u0;
    v[o + 27] = v1;
    v[o + 28] = r;
    v[o + 29] = g;
    v[o + 30] = b;
    v[o + 31] = a;
    this.quadCount++;
  }

  flush(): void {
    if (this.quadCount === 0 || !this.current) return;
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.current.handle);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.vertices, 0, this.quadCount * 4 * FLOATS_PER_VERTEX);
    gl.drawElements(gl.TRIANGLES, this.quadCount * 6, gl.UNSIGNED_SHORT, 0);
    this.drawCalls++;
    this.quadCount = 0;
  }

  end(): void {
    this.flush();
    this.gl.bindVertexArray(null);
  }

  destroy(): void {
    const { gl } = this;
    gl.deleteVertexArray(this.vao);
    gl.deleteBuffer(this.vbo);
    gl.deleteProgram(this.program);
  }
}
