/** Incremental 32-bit FNV-1a, enough to fingerprint simulation state in tests. */
export class Fnv1a {
  private h = 0x811c9dc5;

  byte(b: number): this {
    this.h ^= b & 0xff;
    this.h = Math.imul(this.h, 0x01000193) >>> 0;
    return this;
  }

  int(v: number): this {
    const n = v | 0;
    return this.byte(n)
      .byte(n >>> 8)
      .byte(n >>> 16)
      .byte(n >>> 24);
  }

  bytes(arr: ArrayLike<number>): this {
    for (let i = 0; i < arr.length; i++) this.byte(arr[i] ?? 0);
    return this;
  }

  string(s: string): this {
    for (let i = 0; i < s.length; i++) this.int(s.charCodeAt(i));
    return this;
  }

  hex(): string {
    return this.h.toString(16).padStart(8, '0');
  }
}
