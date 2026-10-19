export type TextureFilter = 'nearest' | 'linear';

/** A GL texture plus its pixel size. Sprite rects are given in these pixels. */
export class Texture {
  constructor(
    readonly gl: WebGL2RenderingContext,
    readonly handle: WebGLTexture,
    readonly width: number,
    readonly height: number,
  ) {}

  static fromImage(
    gl: WebGL2RenderingContext,
    source: TexImageSource,
    width: number,
    height: number,
    filter: TextureFilter = 'nearest',
  ): Texture {
    const handle = gl.createTexture();
    if (!handle) throw new Error('could not create texture');
    gl.bindTexture(gl.TEXTURE_2D, handle);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    const f = filter === 'nearest' ? gl.NEAREST : gl.LINEAR;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return new Texture(gl, handle, width, height);
  }

  /** A 1x1 opaque white texture used for solid rectangles. */
  static white(gl: WebGL2RenderingContext): Texture {
    const handle = gl.createTexture();
    if (!handle) throw new Error('could not create texture');
    gl.bindTexture(gl.TEXTURE_2D, handle);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 255]),
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return new Texture(gl, handle, 1, 1);
  }

  destroy(): void {
    this.gl.deleteTexture(this.handle);
  }
}
