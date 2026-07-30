import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "./styles.css";
import { SceneController, type SceneId } from "./scene";
import { EngineeringSequence } from "./sequence";

gsap.registerPlugin(ScrollTrigger);

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const compactLayout = window.matchMedia("(max-width: 980px)").matches;
const documentRoot = document.documentElement;
documentRoot.classList.add("js-ready");

function initBoot(): Promise<void> {
  const boot = document.querySelector<HTMLElement>("[data-boot]");
  const line = document.querySelector<HTMLElement>("[data-boot-line]");
  const count = document.querySelector<HTMLElement>("[data-boot-count]");
  const text = document.querySelector<HTMLElement>("[data-boot-text]");
  const hasBooted = sessionStorage.getItem("shazin-booted") === "true";

  if (!boot || !line || !count || !text || reducedMotion || hasBooted) {
    return Promise.resolve();
  }

  documentRoot.classList.add("boot-active");
  sessionStorage.setItem("shazin-booted", "true");

  return new Promise((resolve) => {
    const state = { value: 0 };
    const timeline = gsap.timeline({
      onComplete: () => {
        documentRoot.classList.remove("boot-active");
        resolve();
      },
    });

    timeline
      .to(line, { scaleX: 1, duration: 0.9, ease: "power3.inOut" })
      .to(
        state,
        {
          value: 100,
          duration: 0.9,
          ease: "power2.inOut",
          onUpdate: () => {
            count.textContent = Math.round(state.value).toString().padStart(2, "0");
            if (state.value > 70) text.textContent = "SYSTEMS ONLINE";
          },
        },
        0,
      )
      .to(boot, { yPercent: -100, duration: 0.7, ease: "power4.inOut", delay: 0.15 });
  });
}

function splitWords(): HTMLElement[] {
  const heading = document.querySelector<HTMLElement>("[data-split]");
  if (!heading) return [];
  const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);

  nodes.forEach((node) => {
    if (!node.textContent?.trim()) return;
    const fragment = document.createDocumentFragment();
    const words = node.textContent.split(/(\s+)/);
    words.forEach((word) => {
      if (/^\s+$/.test(word)) {
        fragment.append(word);
      } else {
        const span = document.createElement("span");
        span.className = "word";
        span.textContent = word;
        fragment.append(span);
      }
    });
    node.replaceWith(fragment);
  });
  return [...heading.querySelectorAll<HTMLElement>(".word")];
}

function initHero(words: HTMLElement[]): void {
  gsap
    .timeline({ defaults: { ease: "power4.out" } })
    .fromTo(words, { yPercent: 110, opacity: 0, rotate: 3 }, {
      yPercent: 0,
      opacity: 1,
      rotate: 0,
      duration: 1.15,
      stagger: 0.055,
    })
    .to(".reveal", { opacity: 1, y: 0, duration: 0.8, stagger: 0.1 }, "-=0.65");
}

function initScroll(
  scene: SceneController | null,
  sequence: EngineeringSequence | null,
  heroWords: HTMLElement[],
): Lenis | null {
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

  if (compactLayout || reducedMotion) {
    document.querySelectorAll<HTMLElement>(".reveal").forEach((element) => {
      ScrollTrigger.create({
        trigger: element,
        start: "top 88%",
        once: true,
        onEnter: () => gsap.to(element, { opacity: 1, y: 0, duration: 0.75, ease: "power3.out" }),
      });
    });
  } else {
    const heroSignals = [...document.querySelectorAll<HTMLElement>(".hero__signals i")];
    const heroTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: ".hero",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.75,
        onEnter: () => scene?.setScene("hero"),
        onEnterBack: () => scene?.setScene("hero"),
        onUpdate: (self) => scene?.setProgress(self.progress),
      },
    });

    heroTimeline
      .to(".site-header", { yPercent: -120, duration: 0.16, ease: "power2.in" }, 0.06)
      .to(".hero__foot", { y: 100, opacity: 0, duration: 0.22, ease: "power2.in" }, 0)
      .to(".hero__index, .hero__readout, .kicker", {
        opacity: 0,
        duration: 0.16,
        ease: "none",
      }, 0.04)
      .to(heroWords, {
        x: (index) => ((index % 3) - 1) * window.innerWidth * 0.42,
        y: (index) => -window.innerHeight * (0.42 + (index % 4) * 0.08),
        rotate: (index) => (index % 2 === 0 ? -16 : 16),
        scale: 0.45,
        opacity: 0,
        duration: 0.4,
        stagger: 0.014,
        ease: "power3.in",
      }, 0.08)
      .to(heroSignals, {
        scaleX: 0.012,
        y: (index) => (index - 4) * -62,
        opacity: (index) => 0.72 - Math.abs(index - 4) * 0.07,
        duration: 0.5,
        stagger: 0.012,
        ease: "power3.inOut",
      }, 0.15)
      .to(heroSignals, {
        scaleY: 0.05,
        opacity: 0,
        duration: 0.24,
        ease: "power2.in",
      }, 0.72);

    const statements = [...document.querySelectorAll<HTMLElement>("[data-motion-statement]")];
    const sequenceReadout = document.querySelector<HTMLElement>("[data-sequence-readout]");
    const readouts = ["REGISTER 0x00", "PACKET / QUEUED", "STATE / RESOLVED", "FLEET / ACTIVE"];
    const motionTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: "[data-motion-story]",
        start: "top top",
        end: "bottom bottom",
        scrub: 0.55,
        onEnter: () => gsap.to(".site-header", { yPercent: -120, duration: 0.3 }),
        onEnterBack: () => gsap.to(".site-header", { yPercent: -120, duration: 0.3 }),
        onLeave: () => gsap.to(".site-header", { yPercent: 0, duration: 0.45, ease: "power3.out" }),
        onLeaveBack: () => gsap.to(".site-header", { yPercent: 0, duration: 0.45, ease: "power3.out" }),
        onUpdate: (self) => {
          sequence?.setProgress(self.progress);
          const stage = Math.min(3, Math.floor(self.progress * 4));
          if (sequenceReadout) sequenceReadout.textContent = readouts[stage];
        },
      },
    });

    statements.forEach((statement, index) => {
      const start = index * 1.08;
      motionTimeline
        .fromTo(statement, {
          autoAlpha: 0,
          y: 120,
          scale: 0.78,
          rotate: index % 2 === 0 ? -3 : 3,
        }, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          rotate: 0,
          duration: 0.32,
          ease: "power4.out",
        }, start)
        .to(statement, {
          autoAlpha: 0,
          y: -130,
          scale: 1.12,
          rotate: index % 2 === 0 ? 2 : -2,
          duration: 0.3,
          ease: "power3.in",
        }, start + 0.66);
    });

    document.querySelectorAll<HTMLElement>("[data-project]").forEach((project) => {
      const sceneId = project.dataset.scene as SceneId;
      const beats = [...project.querySelectorAll<HTMLElement>("[data-beat]")];
      const progressLabel = project.querySelector<HTMLElement>("[data-project-progress]");
      const title = project.querySelector<HTMLElement>(".case-study__title");
      const sticky = project.querySelector<HTMLElement>(".case-study__sticky");
      const motionField = document.createElement("div");
      motionField.className = "case-study__motion-field";
      motionField.setAttribute("aria-hidden", "true");
      for (let index = 0; index < 7; index += 1) motionField.append(document.createElement("i"));
      const scan = document.createElement("span");
      motionField.append(scan);
      sticky?.prepend(motionField);
      const rings = [...motionField.querySelectorAll<HTMLElement>("i")];
      let activeBeat = -1;

      const activateBeat = (index: number) => {
        if (index === activeBeat) return;
        activeBeat = index;
        beats.forEach((beat, beatIndex) => {
          const active = beatIndex === index;
          beat.classList.toggle("is-active", active);
          gsap.to(beat, {
            autoAlpha: active ? 1 : 0,
            y: active ? 0 : active ? 0 : beatIndex < index ? -32 : 32,
            duration: 0.45,
            ease: "power2.out",
            overwrite: true,
          });
        });
        if (progressLabel) progressLabel.textContent = `${String(index + 1).padStart(2, "0")} / 03`;
      };

      ScrollTrigger.create({
        trigger: project,
        start: "top top",
        end: "bottom bottom",
        onEnter: () => scene?.setScene(sceneId),
        onEnterBack: () => scene?.setScene(sceneId),
        onUpdate: (self) => {
          scene?.setProgress(self.progress);
          activateBeat(Math.min(beats.length - 1, Math.floor(self.progress * beats.length)));
          if (title) {
            gsap.set(title, {
              yPercent: self.progress * -16,
              xPercent: self.progress * -4,
              scale: 1 - self.progress * 0.08,
              opacity: 1 - self.progress * 0.36,
            });
          }
          rings.forEach((ring, index) => {
            gsap.set(ring, {
              xPercent: -95 + self.progress * (130 + index * 13),
              yPercent: Math.sin(self.progress * Math.PI * 2 + index) * 14,
              scale: 0.75 + self.progress * 0.55 + index * 0.045,
              rotate: self.progress * (index % 2 === 0 ? 85 : -85),
            });
          });
          gsap.set(scan, { y: self.progress * window.innerHeight });
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

  const sections = [...document.querySelectorAll<HTMLElement>("#work, #about, #contact")];
  const navLinks = [...document.querySelectorAll<HTMLAnchorElement>(".nav a[href^='#']")];
  sections.forEach((section) => {
    ScrollTrigger.create({
      trigger: section,
      start: "top center",
      end: "bottom center",
      onToggle: (self) => {
        if (!self.isActive) return;
        navLinks.forEach((link) => link.toggleAttribute("aria-current", link.hash === `#${section.id}`));
      },
    });
  });

  return lenis;
}

function initCursor(): void {
  if (window.matchMedia("(pointer: coarse)").matches || reducedMotion) return;
  const cursor = document.querySelector<HTMLElement>("[data-cursor]");
  const label = cursor?.querySelector<HTMLElement>("span");
  if (!cursor || !label) return;

  const x = gsap.quickTo(cursor, "x", { duration: 0.18, ease: "power3" });
  const y = gsap.quickTo(cursor, "y", { duration: 0.18, ease: "power3" });
  const coordinate = document.querySelector<HTMLElement>("[data-hero-coord]");

  window.addEventListener("pointermove", (event) => {
    x(event.clientX);
    y(event.clientY);
    cursor.style.opacity = "1";
    if (coordinate) {
      coordinate.textContent = `X ${((event.clientX / innerWidth) * 100).toFixed(2)} / Y ${(
        (event.clientY / innerHeight) *
        100
      ).toFixed(2)}`;
    }
  });

  document.querySelectorAll<HTMLElement>("[data-cursor-label], a, button").forEach((element) => {
    element.addEventListener("pointerenter", () => {
      cursor.classList.add("is-active");
      label.textContent = element.dataset.cursorLabel ?? "OPEN";
    });
    element.addEventListener("pointerleave", () => {
      cursor.classList.remove("is-active");
      label.textContent = "";
    });
  });
}

function initMagneticLinks(): void {
  if (window.matchMedia("(pointer: coarse)").matches || reducedMotion) return;
  document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((element) => {
    element.addEventListener("pointermove", (event) => {
      const bounds = element.getBoundingClientRect();
      gsap.to(element, {
        x: (event.clientX - bounds.left - bounds.width / 2) * 0.14,
        y: (event.clientY - bounds.top - bounds.height / 2) * 0.14,
        duration: 0.3,
        ease: "power2.out",
      });
    });
    element.addEventListener("pointerleave", () => {
      gsap.to(element, { x: 0, y: 0, duration: 0.55, ease: "elastic.out(1, 0.35)" });
    });
  });
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
    } else {
      button.setAttribute("aria-expanded", "true");
      button.textContent = "Close";
      menu.hidden = false;
      document.body.classList.add("menu-open");
      lenis?.stop();
    }
  });

  menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", close));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
}

async function init(): Promise<void> {
  const boot = initBoot();
  let scene: SceneController | null = null;
  let sequence: EngineeringSequence | null = null;
  if (!reducedMotion) {
    const canvas = document.querySelector<HTMLCanvasElement>("[data-world]");
    if (canvas) {
      try {
        scene = new SceneController(canvas);
      } catch {
        canvas.hidden = true;
        documentRoot.classList.add("webgl-fallback");
      }
    }
    const sequenceCanvas = document.querySelector<HTMLCanvasElement>("[data-engineering-sequence]");
    if (sequenceCanvas) {
      try {
        sequence = new EngineeringSequence(sequenceCanvas);
      } catch {
        sequenceCanvas.hidden = true;
      }
    }
  }

  const heroWords = splitWords();
  const lenis = initScroll(scene, sequence, heroWords);
  initCursor();
  initMagneticLinks();
  initMenu(lenis);
  await boot;
  initHero(heroWords);

  window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
  window.addEventListener("pagehide", () => {
    scene?.dispose();
    sequence?.dispose();
    lenis?.destroy();
  }, { once: true });
}

void init();
