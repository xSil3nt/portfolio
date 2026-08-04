import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "./styles.css";
import "./po-attainment.css";

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const compactLayout = window.matchMedia("(max-width: 980px)").matches;
const documentRoot = document.documentElement;
documentRoot.classList.add("js-ready");

class PONetwork {
  private readonly context: CanvasRenderingContext2D;
  private readonly resizeObserver: ResizeObserver;
  private progress = 0;
  private width = 0;
  private height = 0;
  private pixelRatio = 1;
  private animationFrame = 0;
  private startTime = performance.now();

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) throw new Error("2D canvas is unavailable");
    this.context = context;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    this.draw = this.draw.bind(this);
    this.animationFrame = requestAnimationFrame(this.draw);
  }

  setProgress(progress: number): void {
    this.progress = Math.min(1, Math.max(0, progress));
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
  }

  private resize(): void {
    const bounds = this.canvas.getBoundingClientRect();
    this.pixelRatio = Math.min(window.devicePixelRatio, 2);
    this.width = bounds.width;
    this.height = bounds.height;
    this.canvas.width = Math.max(1, Math.round(bounds.width * this.pixelRatio));
    this.canvas.height = Math.max(1, Math.round(bounds.height * this.pixelRatio));
    this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
  }

  private draw(time: number): void {
    const context = this.context;
    const width = this.width;
    const height = this.height;
    context.clearRect(0, 0, width, height);
    if (width === 0 || height === 0) {
      this.animationFrame = requestAnimationFrame(this.draw);
      return;
    }

    const seconds = (time - this.startTime) * 0.001;
    const elapsed = seconds * 0.08;
    const takeoverRaw = gsap.utils.clamp(0, 1, (this.progress - 0.5) / 0.42);
    const takeover = takeoverRaw * takeoverRaw * (3 - 2 * takeoverRaw);
    const startingCentreX = width * (width < 800 ? 0.58 : 0.73);
    const centreX = gsap.utils.interpolate(startingCentreX, width * 0.5, takeover);
    const centreY = height * 0.5;
    const startingRadius = Math.min(Math.min(width, height) * 0.32, 310);
    const finalRadius = Math.min(Math.min(width, height) * 0.43, 430);
    const radiusX = gsap.utils.interpolate(startingRadius, finalRadius, takeover);
    const radiusY = radiusX;
    const formationProgress = gsap.utils.clamp(0, 1, this.progress / 0.42);
    const edgeProgress = gsap.utils.clamp(0, 1, (this.progress - 0.2) / 0.64);
    const activeFloat = edgeProgress * 12;
    const active = Math.min(11, Math.floor(Math.min(activeFloat, 11.999)));
    const completion = gsap.utils.clamp(0, 1, (this.progress - 0.86) / 0.14);
    const pulse = 0.5 + Math.sin(seconds * 4.5) * 0.5;
    const nodes: Array<{ x: number; y: number; alpha: number; reveal: number }> = [];

    context.save();

    context.save();
    context.translate(centreX, centreY);
    context.rotate(elapsed * 0.28);
    [0.58, 0.79, 1].forEach((scale, index) => {
      context.setLineDash(index === 1 ? [3, 9] : []);
      context.strokeStyle = `rgba(128, 168, 196, ${0.055 + completion * 0.05})`;
      context.lineWidth = 1;
      context.beginPath();
      context.ellipse(0, 0, radiusX * scale, radiusY * scale, 0, 0, Math.PI * 2);
      context.stroke();
    });
    context.setLineDash([]);
    context.restore();

    for (let index = 0; index < 12; index += 1) {
      const delay = (index / 12) * 0.16;
      const rawReveal = gsap.utils.clamp(0, 1, (formationProgress - delay) / 0.72);
      const reveal = rawReveal * rawReveal * (3 - 2 * rawReveal);
      const backOut = 1 + 1.35 * Math.pow(rawReveal - 1, 3) + 0.35 * Math.pow(rawReveal - 1, 2);
      const finalAngle = -Math.PI / 2 + (index / 12) * Math.PI * 2 + elapsed + completion * 0.12;
      const clusterAngle = finalAngle - Math.PI * 1.3 + elapsed * 2.4 + index * 0.035;
      const angle = gsap.utils.interpolate(clusterAngle, finalAngle, reveal);
      const nodeRadiusX = gsap.utils.interpolate(radiusX * 0.1, radiusX, backOut);
      const nodeRadiusY = gsap.utils.interpolate(radiusY * 0.1, radiusY, backOut);
      nodes.push({
        x: centreX + Math.cos(angle) * nodeRadiusX,
        y: centreY + Math.sin(angle) * nodeRadiusY,
        alpha: 0.25 + reveal * 0.75,
        reveal,
      });
    }

    nodes.forEach((node) => {
      if (node.reveal <= 0.04 || node.reveal >= 0.98) return;
      const trailAlpha = Math.sin(node.reveal * Math.PI) * 0.34;
      context.strokeStyle = `rgba(121, 242, 155, ${trailAlpha})`;
      context.lineWidth = 1.2;
      context.shadowColor = "rgba(121, 242, 155, 0.65)";
      context.shadowBlur = 8;
      context.beginPath();
      context.moveTo(
        gsap.utils.interpolate(centreX, node.x, 0.58),
        gsap.utils.interpolate(centreY, node.y, 0.58),
      );
      context.lineTo(node.x, node.y);
      context.stroke();
      context.shadowBlur = 0;
    });

    if (completion > 0) {
      const fill = context.createRadialGradient(centreX, centreY, 0, centreX, centreY, radiusX);
      fill.addColorStop(0, `rgba(121, 242, 155, ${0.16 * completion})`);
      fill.addColorStop(0.65, `rgba(64, 139, 92, ${0.07 * completion})`);
      fill.addColorStop(1, "rgba(121, 242, 155, 0)");
      context.beginPath();
      nodes.forEach((node, index) => {
        if (index === 0) context.moveTo(node.x, node.y);
        else context.lineTo(node.x, node.y);
      });
      context.closePath();
      context.fillStyle = fill;
      context.fill();

      const innerNodes = nodes.map((node) => ({
        x: gsap.utils.interpolate(centreX, node.x, 0.48),
        y: gsap.utils.interpolate(centreY, node.y, 0.48),
      }));
      context.strokeStyle = `rgba(121, 242, 155, ${0.1 + completion * 0.16})`;
      context.lineWidth = 1;
      context.beginPath();
      innerNodes.forEach((node, index) => {
        if (index === 0) context.moveTo(node.x, node.y);
        else context.lineTo(node.x, node.y);
      });
      context.closePath();
      context.stroke();

      nodes.forEach((node, index) => {
        if (index % 2 !== 0) return;
        const inner = innerNodes[index];
        context.strokeStyle = `rgba(128, 168, 196, ${0.08 + completion * 0.1})`;
        context.beginPath();
        context.moveTo(node.x, node.y);
        context.lineTo(inner.x, inner.y);
        context.stroke();
      });

      const core = context.createRadialGradient(centreX, centreY, 0, centreX, centreY, radiusX * 0.24);
      core.addColorStop(0, `rgba(177, 255, 196, ${completion * (0.18 + pulse * 0.08)})`);
      core.addColorStop(0.32, `rgba(121, 242, 155, ${completion * 0.08})`);
      core.addColorStop(1, "rgba(121, 242, 155, 0)");
      context.fillStyle = core;
      context.beginPath();
      context.arc(centreX, centreY, radiusX * 0.24, 0, Math.PI * 2);
      context.fill();

      context.save();
      context.translate(centreX, centreY);
      for (let ring = 0; ring < 3; ring += 1) {
        const ringRadius = radiusX * (0.17 + ring * 0.105);
        const segments = 6 + ring * 2;
        const rotation = seconds * (ring % 2 === 0 ? 0.12 : -0.09) + ring * 0.7;
        context.strokeStyle = `rgba(121, 242, 155, ${completion * (0.12 + ring * 0.035)})`;
        context.lineWidth = ring === 0 ? 1.6 : 1;
        for (let segment = 0; segment < segments; segment += 1) {
          const start = rotation + (segment / segments) * Math.PI * 2;
          const length = (Math.PI * 2 / segments) * 0.58;
          context.beginPath();
          context.arc(0, 0, ringRadius, start, start + length);
          context.stroke();
        }
      }
      context.restore();

      nodes.forEach((node, index) => {
        const angle = Math.atan2(node.y - centreY, node.x - centreX);
        const rayRadius = radiusX * (1.22 + (index % 3) * 0.12);
        const endX = centreX + Math.cos(angle) * rayRadius;
        const endY = centreY + Math.sin(angle) * rayRadius;
        const ray = context.createLinearGradient(node.x, node.y, endX, endY);
        ray.addColorStop(0, `rgba(121, 242, 155, ${completion * 0.2})`);
        ray.addColorStop(1, "rgba(121, 242, 155, 0)");
        context.strokeStyle = ray;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(node.x, node.y);
        context.lineTo(endX, endY);
        context.stroke();

        const packetPosition = (seconds * 0.16 + index * 0.083) % 1;
        const packetX = gsap.utils.interpolate(node.x, endX, packetPosition);
        const packetY = gsap.utils.interpolate(node.y, endY, packetPosition);
        context.fillStyle = `rgba(196, 255, 212, ${completion * (1 - packetPosition) * 0.55})`;
        context.beginPath();
        context.arc(packetX, packetY, 1.5, 0, Math.PI * 2);
        context.fill();
      });

      for (let particle = 0; particle < 36; particle += 1) {
        const direction = particle % 2 === 0 ? 1 : -1;
        const angle = (particle / 36) * Math.PI * 2 + seconds * 0.018 * direction;
        const orbit = radiusX * (1.08 + (particle % 7) * 0.075);
        const drift = Math.sin(seconds * 0.6 + particle * 1.7) * 6;
        const x = centreX + Math.cos(angle) * (orbit + drift);
        const y = centreY + Math.sin(angle) * (orbit + drift);
        const particleAlpha = completion * (0.06 + (particle % 4) * 0.025);
        context.fillStyle = `rgba(181, 255, 200, ${particleAlpha})`;
        context.beginPath();
        context.arc(x, y, 0.7 + (particle % 3) * 0.35, 0, Math.PI * 2);
        context.fill();
      }
    }

    context.globalCompositeOperation = "lighter";

    nodes.forEach((node, index) => {
      const next = nodes[(index + 1) % nodes.length];
      context.strokeStyle = `rgba(128, 168, 196, ${0.045 + Math.min(node.alpha, next.alpha) * 0.09})`;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(node.x, node.y);
      context.lineTo(next.x, next.y);
      context.stroke();
    });

    nodes.forEach((node, index) => {
      const next = nodes[(index + 1) % nodes.length];
      const segmentProgress = gsap.utils.clamp(0, 1, activeFloat - index);
      if (segmentProgress <= 0) return;
      const endX = gsap.utils.interpolate(node.x, next.x, segmentProgress);
      const endY = gsap.utils.interpolate(node.y, next.y, segmentProgress);
      const lineGradient = context.createLinearGradient(node.x, node.y, endX, endY);
      lineGradient.addColorStop(0, `rgba(121, 242, 155, ${0.35 + node.alpha * 0.45})`);
      lineGradient.addColorStop(1, `rgba(196, 255, 212, ${0.7 + pulse * 0.25})`);
      context.strokeStyle = lineGradient;
      context.lineWidth = completion > 0.95 ? 2.2 : 1.4;
      context.shadowColor = "rgba(121, 242, 155, 0.85)";
      context.shadowBlur = 9 + completion * 14;
      context.beginPath();
      context.moveTo(node.x, node.y);
      context.lineTo(endX, endY);
      context.stroke();
      context.shadowBlur = 0;

      if (index % 2 === 0) {
        const chord = nodes[(index + 4) % nodes.length];
        const chordStage = gsap.utils.clamp(0, 1, (this.progress - 0.64) / 0.24);
        const chordProgress = gsap.utils.clamp(0, 1, chordStage * 6 - index / 2);
        const chordX = gsap.utils.interpolate(node.x, chord.x, chordProgress);
        const chordY = gsap.utils.interpolate(node.y, chord.y, chordProgress);
        context.strokeStyle = `rgba(128, 168, 196, ${0.12 + chordProgress * 0.22})`;
        context.lineWidth = 1;
        context.beginPath();
        context.moveTo(node.x, node.y);
        context.lineTo(chordX, chordY);
        context.stroke();
      }

      if (index % 3 === 0) {
        const spokeStage = gsap.utils.clamp(0, 1, (this.progress - 0.7) / 0.18);
        const spokeProgress = gsap.utils.clamp(0, 1, spokeStage * 4 - index / 3);
        context.strokeStyle = `rgba(121, 242, 155, ${spokeProgress * 0.12})`;
        context.beginPath();
        context.moveTo(centreX, centreY);
        context.lineTo(
          gsap.utils.interpolate(centreX, node.x, spokeProgress),
          gsap.utils.interpolate(centreY, node.y, spokeProgress),
        );
        context.stroke();
      }
    });

    nodes.forEach((node, index) => {
      const isActive = edgeProgress > 0 && index === active;
      const isComplete = activeFloat >= index + 1;
      const size = isActive && completion < 0.98 ? 11 + pulse * 5 : isComplete ? 7 : 5;
      context.shadowColor = "rgba(121, 242, 155, 0.9)";
      context.shadowBlur = isActive || completion > 0.95 ? 10 + pulse * 8 : 3;
      context.fillStyle = isActive || isComplete ? "#79f29b" : `rgba(182, 255, 201, ${node.alpha})`;
      context.fillRect(node.x - size / 2, node.y - size / 2, size, size);
      context.shadowBlur = 0;
    });

    const labelExit = 1 - gsap.utils.clamp(0, 1, (this.progress - 0.76) / 0.14) * 0.72;
    if (labelExit > 0) {
      nodes.forEach((node, index) => {
        const activation = gsap.utils.clamp(0, 1, (activeFloat - index) * 2.5);
        if (activation <= 0) return;
        const isActive = edgeProgress < 0.995 && index === active;
        const directionX = (node.x - centreX) / Math.max(radiusX, 1);
        const directionY = (node.y - centreY) / Math.max(radiusY, 1);
        const alpha = activation * labelExit * (isActive ? 0.92 : 0.42);
        context.save();
        context.fillStyle = `rgba(209, 255, 221, ${alpha})`;
        context.font = "500 10px IBM Plex Mono, monospace";
        context.letterSpacing = "1px";
        context.textAlign = directionX < -0.15 ? "right" : directionX > 0.15 ? "left" : "center";
        context.textBaseline = directionY < -0.2 ? "bottom" : "top";
        context.fillText(
          `PO${index + 1}`,
          node.x + directionX * 18,
          node.y + directionY * 16,
        );
        context.restore();
      });
    }

    if (edgeProgress > 0 && completion < 0.98) {
      const current = nodes[active];
      const next = nodes[(active + 1) % nodes.length];
      const segmentProgress = gsap.utils.clamp(0, 1, activeFloat - active);
      const trackerX = gsap.utils.interpolate(current.x, next.x, segmentProgress);
      const trackerY = gsap.utils.interpolate(current.y, next.y, segmentProgress);
      context.beginPath();
      context.arc(trackerX, trackerY, 13 + pulse * 7, 0, Math.PI * 2);
      context.strokeStyle = `rgba(121, 242, 155, ${0.18 + pulse * 0.35})`;
      context.stroke();
    } else if (completion >= 0.98) {
      for (let spark = 0; spark < 6; spark += 1) {
        const position = (seconds * 0.85 + spark * 2) % 12;
        const index = Math.floor(position);
        const amount = position - index;
        const from = nodes[index];
        const to = nodes[(index + 1) % nodes.length];
        const x = gsap.utils.interpolate(from.x, to.x, amount);
        const y = gsap.utils.interpolate(from.y, to.y, amount);
        context.beginPath();
        context.arc(x, y, 2.5 + pulse * 1.5, 0, Math.PI * 2);
        context.fillStyle = "rgba(226, 255, 233, 0.95)";
        context.shadowColor = "rgba(121, 242, 155, 1)";
        context.shadowBlur = 18;
        context.fill();
      }

      for (let packet = 0; packet < 6; packet += 1) {
        const from = nodes[packet * 2];
        const to = nodes[(packet * 2 + 4) % nodes.length];
        const amount = (seconds * 0.28 + packet * 0.17) % 1;
        const x = gsap.utils.interpolate(from.x, to.x, amount);
        const y = gsap.utils.interpolate(from.y, to.y, amount);
        context.fillStyle = `rgba(128, 168, 196, ${0.35 + pulse * 0.25})`;
        context.beginPath();
        context.arc(x, y, 1.8, 0, Math.PI * 2);
        context.fill();
      }
      context.shadowBlur = 0;
    }

    context.globalCompositeOperation = "source-over";
    context.restore();

    this.animationFrame = requestAnimationFrame(this.draw);
  }
}

function initMenu(lenis: Lenis | null): void {
  const button = document.querySelector<HTMLButtonElement>(".menu-toggle");
  const menu = document.querySelector<HTMLElement>(".mobile-nav");
  if (!button || !menu) return;

  const close = () => {
    button.setAttribute("aria-expanded", "false");
    button.textContent = "Menu";
    menu.hidden = true;
    document.body.classList.remove("menu-open");
    lenis?.start();
  };

  button.addEventListener("click", () => {
    const open = button.getAttribute("aria-expanded") === "true";
    if (open) {
      close();
      return;
    }
    button.setAttribute("aria-expanded", "true");
    button.textContent = "Close";
    menu.hidden = false;
    document.body.classList.add("menu-open");
    lenis?.stop();
  });

  menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
}

function initCursor(): void {
  if (window.matchMedia("(pointer: coarse)").matches || reducedMotion) return;
  const cursor = document.querySelector<HTMLElement>("[data-cursor]");
  const label = cursor?.querySelector<HTMLElement>("span");
  if (!cursor || !label) return;

  const x = gsap.quickTo(cursor, "x", { duration: 0.18, ease: "power3" });
  const y = gsap.quickTo(cursor, "y", { duration: 0.18, ease: "power3" });
  window.addEventListener("pointermove", (event) => {
    x(event.clientX);
    y(event.clientY);
    cursor.style.opacity = "1";
  });

  document.querySelectorAll<HTMLElement>("a, button").forEach((element) => {
    element.addEventListener("pointerenter", () => {
      cursor.classList.add("is-active");
      label.textContent = "OPEN";
    });
    element.addEventListener("pointerleave", () => {
      cursor.classList.remove("is-active");
      label.textContent = "";
    });
  });
}

function init(): void {
  const lenis = reducedMotion ? null : new Lenis({
    anchors: { offset: -72 },
    duration: 1.05,
    smoothWheel: true,
    syncTouch: false,
  });

  if (lenis) {
    lenis.on("scroll", ScrollTrigger.update);
    const update = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);
    window.addEventListener("pagehide", () => gsap.ticker.remove(update), { once: true });
  }

  let network: PONetwork | null = null;
  const canvas = document.querySelector<HTMLCanvasElement>("[data-po-canvas]");
  if (canvas && !reducedMotion) network = new PONetwork(canvas);

  if (!compactLayout && !reducedMotion) {
    const heroTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: "[data-po-hero]",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.65,
        onUpdate: (self) => {
          network?.setProgress(self.progress);
        },
        onLeave: () => gsap.to(".site-header", { yPercent: 0, duration: 0.4 }),
        onEnterBack: () => gsap.to(".site-header", { yPercent: -120, duration: 0.3 }),
        onLeaveBack: () => gsap.to(".site-header", { yPercent: 0, duration: 0.4 }),
      },
    });

    heroTimeline
      .to(".site-header", { yPercent: -120, duration: 0.14, ease: "power2.in" }, 0.08)
      .to(".po-hero__copy", { xPercent: -12, yPercent: -65, scale: 0.72, opacity: 0, duration: 0.45 }, 0.12)
      .to(".po-hero__index, .po-scroll", { opacity: 0, duration: 0.2 }, 0.08)
      .to(".po-hero__sticky", { "--po-shade": 0, duration: 0.42, ease: "none" }, 0.38)
      .to(".po-hero__canvas", { scale: 1.04, duration: 0.7, ease: "power2.inOut" }, 0.2);
  } else {
    network?.setProgress(1);
  }

  if (reducedMotion) {
    gsap.set(".po-reveal", { opacity: 1, y: 0 });
  } else {
    document.querySelectorAll<HTMLElement>(".po-reveal").forEach((element) => {
      gsap.to(element, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: "power3.out",
        scrollTrigger: {
          trigger: element,
          start: "top 88%",
          once: true,
        },
      });
    });
  }

  const header = document.querySelector<HTMLElement>("[data-header]");
  ScrollTrigger.create({
    start: 50,
    end: "max",
    onToggle: (self) => header?.classList.toggle("is-scrolled", self.isActive),
  });

  initMenu(lenis);
  initCursor();
  window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
  window.addEventListener("pagehide", () => {
    network?.dispose();
    lenis?.destroy();
  }, { once: true });
}

init();
