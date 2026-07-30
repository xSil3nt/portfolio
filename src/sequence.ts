const SIGNAL = "#79f29b";
const PAPER = "#f1f5f2";
const INK = "#050706";

function clamp(value: number, minimum = 0, maximum = 1): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function phase(progress: number, start: number, end: number): number {
  return clamp((progress - start) / (end - start));
}

function smooth(value: number): number {
  const v = clamp(value);
  return v * v * (3 - 2 * v);
}

function mix(a: number, b: number, progress: number): number {
  return a + (b - a) * progress;
}

export class EngineeringSequence {
  private readonly context: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private progress = 0;
  private targetProgress = 0;
  private pointerX = 0;
  private pointerY = 0;
  private frame = 0;
  private visible = true;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2D canvas is unavailable");
    this.context = context;
    this.resize();
    window.addEventListener("resize", this.resize);
    window.addEventListener("pointermove", this.onPointerMove, { passive: true });
    document.addEventListener("visibilitychange", this.onVisibility);
    this.frame = requestAnimationFrame(this.render);
  }

  setProgress(progress: number): void {
    this.targetProgress = clamp(progress);
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("pointermove", this.onPointerMove);
    document.removeEventListener("visibilitychange", this.onVisibility);
  }

  private resize = (): void => {
    const bounds = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio, window.innerWidth < 900 ? 1.25 : 1.6);
    this.width = bounds.width;
    this.height = bounds.height;
    this.canvas.width = Math.max(1, Math.round(bounds.width * dpr));
    this.canvas.height = Math.max(1, Math.round(bounds.height * dpr));
    this.context.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  private onPointerMove = (event: PointerEvent): void => {
    this.pointerX = event.clientX / window.innerWidth - 0.5;
    this.pointerY = event.clientY / window.innerHeight - 0.5;
  };

  private onVisibility = (): void => {
    this.visible = document.visibilityState === "visible";
  };

  private render = (timestamp: number): void => {
    this.frame = requestAnimationFrame(this.render);
    if (!this.visible || this.width === 0 || this.height === 0) return;
    this.progress += (this.targetProgress - this.progress) * 0.095;
    this.draw(timestamp / 1000);
  };

  private draw(time: number): void {
    const ctx = this.context;
    const w = this.width;
    const h = this.height;
    const unit = Math.min(w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, w, h);

    const signalProgress = smooth(phase(this.progress, 0, 0.22));
    const signalExit = smooth(phase(this.progress, 0.16, 0.3));
    this.drawSignalStack(signalProgress, signalExit);

    const gridIn = smooth(phase(this.progress, 0.1, 0.28));
    const gridOut = 1 - smooth(phase(this.progress, 0.48, 0.64));
    this.drawGrid(gridIn * gridOut, time);

    const sensorIn = smooth(phase(this.progress, 0.12, 0.3));
    const sensorOut = 1 - smooth(phase(this.progress, 0.38, 0.56));
    this.drawSensor(sensorIn, sensorOut, time);

    const orbitIn = smooth(phase(this.progress, 0.3, 0.47));
    const orbitOut = 1 - smooth(phase(this.progress, 0.63, 0.78));
    this.drawOrbits(orbitIn, orbitOut, time);

    const systemIn = smooth(phase(this.progress, 0.54, 0.7));
    const systemOut = 1 - smooth(phase(this.progress, 0.83, 0.96));
    this.drawSystem(systemIn, systemOut, time);

    const fleetIn = smooth(phase(this.progress, 0.74, 0.9));
    this.drawFleet(fleetIn, time, unit);
  }

  private drawSignalStack(enter: number, exit: number): void {
    const ctx = this.context;
    const centerX = this.width * 0.5;
    const centerY = this.height * 0.5;
    const maximum = this.width * 0.56;
    ctx.save();
    ctx.strokeStyle = PAPER;
    ctx.globalAlpha = (1 - exit) * 0.48;
    ctx.lineWidth = 1;

    for (let index = 0; index < 11; index += 1) {
      const ratio = 1 - index / 10;
      const width = mix(maximum * ratio * ratio, 2, enter);
      const y = centerY + mix((index - 5) * 48, (index - 5) * 66, enter);
      ctx.beginPath();
      ctx.moveTo(centerX - width / 2, y);
      ctx.lineTo(centerX + width / 2, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawGrid(alpha: number, time: number): void {
    if (alpha <= 0) return;
    const ctx = this.context;
    const spacing = Math.max(28, this.width / 44);
    const centerX = this.width * (0.5 + this.pointerX * 0.025);
    const centerY = this.height * (0.52 + this.pointerY * 0.025);
    const radius = Math.min(this.width, this.height) * 0.54;
    ctx.save();

    for (let y = -spacing; y <= this.height + spacing; y += spacing) {
      for (let x = -spacing; x <= this.width + spacing; x += spacing) {
        const distance = Math.hypot(x - centerX, y - centerY);
        const falloff = clamp(1 - distance / radius);
        const pulse = 0.65 + Math.sin(time * 1.8 + x * 0.018 + y * 0.012) * 0.25;
        ctx.globalAlpha = alpha * (0.12 + falloff * 0.64) * pulse;
        ctx.fillStyle = distance < radius * 0.38 ? SIGNAL : PAPER;
        const size = 2 + falloff * 4;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }
    }
    ctx.restore();
  }

  private drawSensor(enter: number, exit: number, time: number): void {
    const alpha = enter * exit;
    if (alpha <= 0) return;
    const ctx = this.context;
    const shift = smooth(phase(this.progress, 0.24, 0.48));
    const centerX = mix(this.width * 0.5, this.width * 0.78, shift) + this.pointerX * 24;
    const centerY = mix(this.height * 0.52, this.height * 0.68, shift) + this.pointerY * 16;
    const radius = Math.min(this.width, this.height) * mix(0.03, 0.34, enter);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = SIGNAL;
    ctx.lineWidth = Math.max(2, this.width * 0.008);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, -Math.PI * 0.12, Math.PI * 1.75);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.globalAlpha = alpha * 0.45;
    for (let index = 0; index < 4; index += 1) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * (0.65 + index * 0.13) + Math.sin(time + index) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawOrbits(enter: number, exit: number, time: number): void {
    const alpha = enter * exit;
    if (alpha <= 0) return;
    const ctx = this.context;
    const radius = Math.min(this.width, this.height) * 0.34;
    const travel = smooth(phase(this.progress, 0.38, 0.7));
    const baseX = mix(this.width * 0.22, this.width * 0.56, travel);
    const centerY = this.height * 0.52;
    ctx.save();
    ctx.strokeStyle = "#3e718f";
    ctx.fillStyle = "#24475b";
    ctx.lineWidth = 3;
    ctx.globalAlpha = alpha * 0.9;

    for (let index = 0; index < 8; index += 1) {
      const offset = index * radius * mix(0.72, 0.24, travel);
      const x = baseX + offset + this.pointerX * 28;
      ctx.beginPath();
      ctx.arc(x, centerY, radius, 0, Math.PI * 2);
      if (index === 7) {
        ctx.globalAlpha = alpha * 0.78;
        ctx.fill();
      }
      ctx.globalAlpha = alpha * (0.45 + index * 0.045);
      ctx.stroke();

      const angle = time * 0.65 + index * 0.68;
      ctx.fillStyle = SIGNAL;
      ctx.beginPath();
      ctx.arc(x + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#24475b";
    }
    ctx.restore();
  }

  private drawSystem(enter: number, exit: number, time: number): void {
    const alpha = enter * exit;
    if (alpha <= 0) return;
    const ctx = this.context;
    const w = this.width;
    const h = this.height;
    const frameW = Math.min(w * 0.62, 1100);
    const frameH = Math.min(h * 0.58, 620);
    const left = (w - frameW) / 2;
    const top = (h - frameH) / 2;
    const nodes = [
      [0.12, 0.28],
      [0.36, 0.7],
      [0.62, 0.3],
      [0.86, 0.67],
    ];

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#da756f";
    ctx.lineWidth = 2;
    ctx.strokeRect(left, top, frameW, frameH);
    ctx.beginPath();
    ctx.moveTo(left + frameW / 2, top);
    ctx.lineTo(left + frameW / 2, top + frameH);
    ctx.moveTo(left, top + frameH / 2);
    ctx.lineTo(left + frameW, top + frameH / 2);
    ctx.stroke();

    nodes.forEach(([xRatio, yRatio], index) => {
      const x = left + frameW * xRatio;
      const y = top + frameH * yRatio;
      const radius = 28 + Math.sin(time * 1.7 + index) * 5;
      ctx.strokeStyle = index % 2 === 0 ? SIGNAL : "#da756f";
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
      if (index < nodes.length - 1) {
        const [nextX, nextY] = nodes[index + 1];
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(left + frameW * nextX, top + frameH * nextY);
        ctx.stroke();
      }
    });

    const packetProgress = (time * 0.18 + this.progress) % 1;
    ctx.fillStyle = PAPER;
    ctx.beginPath();
    ctx.arc(left + frameW * packetProgress, top + frameH * 0.5, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawFleet(enter: number, time: number, unit: number): void {
    if (enter <= 0) return;
    const ctx = this.context;
    const radius = mix(unit * 0.03, unit * 0.2, enter);
    const y = this.height * 0.54;
    const spacing = mix(0, this.width * 0.23, enter);
    const center = this.width * 0.5;
    const colors = [SIGNAL, "#70d6e8", PAPER];
    ctx.save();
    ctx.globalAlpha = enter;

    for (let index = 0; index < 3; index += 1) {
      const x = center + (index - 1) * spacing + this.pointerX * (index + 1) * 12;
      ctx.strokeStyle = colors[index];
      ctx.lineWidth = Math.max(2, radius * 0.035);
      ctx.beginPath();
      ctx.arc(x, y, radius * (0.9 + Math.sin(time + index) * 0.04), 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = enter * 0.18;
      ctx.fillStyle = colors[index];
      ctx.fill();
      ctx.globalAlpha = enter;
    }

    ctx.strokeStyle = SIGNAL;
    ctx.lineWidth = 1;
    ctx.globalAlpha = enter * 0.5;
    ctx.beginPath();
    ctx.moveTo(center - spacing, y);
    ctx.lineTo(center, y);
    ctx.lineTo(center + spacing, y);
    ctx.stroke();
    ctx.restore();
  }
}
