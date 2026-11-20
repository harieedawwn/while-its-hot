/**
 * GPU time of the frame via EXT_disjoint_timer_query_webgl2 (absent on many phones: `ms` stays null).
 * begin()/end() wrap the frame's draw calls; results arrive 1-3 frames later and are smoothed.
 */
export class GpuTimer {
  private ext: { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null;
  private pending: WebGLQuery[] = [];
  private live: WebGLQuery | null = null;
  ms: number | null = null;
  constructor(private gl: WebGL2RenderingContext) {
    this.ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as GpuTimer['ext'];
  }
  get supported(): boolean { return !!this.ext; }
  begin(): void {
    if (!this.ext || this.live || this.pending.length > 4) return;
    const q = this.gl.createQuery();
    if (!q) return;
    this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, q); this.live = q;
  }
  end(): void {
    if (!this.ext || !this.live) return;
    this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
    this.pending.push(this.live); this.live = null;
    const gl = this.gl;
    while (this.pending.length) {
      const q = this.pending[0];
      if (!gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE)) break;
      this.pending.shift();
      if (!gl.getParameter(this.ext.GPU_DISJOINT_EXT)) {
        const v = (gl.getQueryParameter(q, gl.QUERY_RESULT) as number) / 1e6;
        this.ms = this.ms === null ? v : this.ms + (v - this.ms) * 0.1;
      }
      gl.deleteQuery(q);
    }
  }
}
