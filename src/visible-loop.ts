/** Runs a canvas only while its content is on screen and the tab is visible. */
export class VisibleLoop {
  private frame = 0;
  private previousTime = 0;
  private disposed = false;
  private readonly visible = new Set<Element>();
  private readonly observer: IntersectionObserver;

  constructor(targets: Element[], private readonly draw: (time: number, delta: number) => void) {
    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) this.visible.add(entry.target);
        else this.visible.delete(entry.target);
      }
      this.sync();
    });
    targets.forEach((target) => this.observer.observe(target));
    document.addEventListener("visibilitychange", this.sync);
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    document.removeEventListener("visibilitychange", this.sync);
  }

  private sync = (): void => {
    if (this.disposed) return;
    if (document.hidden || this.visible.size === 0) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
      this.previousTime = 0;
    } else if (!this.frame) {
      this.frame = requestAnimationFrame(this.tick);
    }
  };

  private tick = (time: number): void => {
    const delta = this.previousTime ? Math.min(64, Math.max(0, time - this.previousTime)) : 1000 / 60;
    this.previousTime = time;
    this.draw(time, delta);
    this.frame = requestAnimationFrame(this.tick);
  };
}
