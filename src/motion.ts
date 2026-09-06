import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import "./motion.css";

gsap.registerPlugin(ScrollTrigger);

export function initMotion(): void {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const progress = document.createElement("div");
  progress.className = "reading-progress";
  progress.setAttribute("aria-hidden", "true");
  document.body.append(progress);
  gsap.to(progress, {
    scaleX: 1,
    ease: "none",
    scrollTrigger: { start: 0, end: "max", scrub: 0.25 },
  });

  for (const selector of [
    ".work-intro h2, .archive__header h2, .about__body h2, .contact h2",
    ".archive-row, .skills > div, .about__copy > p, .contact__actions",
  ]) {
    ScrollTrigger.batch(selector, {
      start: "top 94%",
      once: true,
      onEnter: (elements) => gsap.fromTo(elements, { y: 48, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.85, stagger: 0.09, ease: "power3.out", clearProps: "transform,opacity",
      }),
    });
  }

  const experiments = document.querySelector<HTMLElement>(".experiments");
  const list = experiments?.querySelector("ul");
  if (experiments && list) {
    const track = document.createElement("div");
    track.className = "experiment-track";
    const copy = list.cloneNode(true) as HTMLElement;
    copy.removeAttribute("aria-label");
    copy.setAttribute("aria-hidden", "true");
    copy.inert = true;
    list.before(track);
    track.append(list, copy);
    experiments.classList.add("experiments--moving");
    const observer = new IntersectionObserver(([entry]) => {
      experiments.classList.toggle("is-visible", entry.isIntersecting);
    });
    observer.observe(experiments);
    window.addEventListener("pagehide", () => observer.disconnect(), { once: true });
  }

  const media = gsap.matchMedia();
  media.add("(hover: hover) and (pointer: fine)", () => {
    const cursor = document.createElement("div");
    cursor.className = "motion-cursor";
    cursor.setAttribute("aria-hidden", "true");
    cursor.innerHTML = "<span></span>";
    document.body.append(cursor);
    const x = gsap.quickTo(cursor, "x", { duration: 0.22, ease: "power3.out" });
    const y = gsap.quickTo(cursor, "y", { duration: 0.22, ease: "power3.out" });
    const move = (event: PointerEvent) => {
      x(event.clientX);
      y(event.clientY);
      cursor.classList.add("is-visible");
    };
    const over = (event: PointerEvent) => {
      const link = (event.target as Element).closest("a, button");
      cursor.classList.toggle("is-active", Boolean(link));
    };
    const hide = () => cursor.classList.remove("is-visible");
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    document.documentElement.addEventListener("pointerleave", hide);
    window.addEventListener("blur", hide);

    const cleanups: Array<() => void> = [];
    document.querySelectorAll<HTMLElement>(".round-link, .contact__email, .po-back, .brand__mark").forEach((element) => {
      const toX = gsap.quickTo(element, "x", { duration: 0.4, ease: "power3.out" });
      const toY = gsap.quickTo(element, "y", { duration: 0.4, ease: "power3.out" });
      let bounds: DOMRect;
      const enter = () => { bounds = element.getBoundingClientRect(); };
      const drift = (event: PointerEvent) => {
        if (!bounds) enter();
        toX(gsap.utils.clamp(-12, 12, (event.clientX - bounds.left - bounds.width / 2) * 0.12));
        toY(gsap.utils.clamp(-8, 8, (event.clientY - bounds.top - bounds.height / 2) * 0.12));
      };
      const reset = () => { toX(0); toY(0); };
      element.addEventListener("pointerenter", enter);
      element.addEventListener("pointermove", drift);
      element.addEventListener("pointerleave", reset);
      cleanups.push(() => {
        element.removeEventListener("pointerenter", enter);
        element.removeEventListener("pointermove", drift);
        element.removeEventListener("pointerleave", reset);
      });
    });

    document.querySelectorAll<HTMLElement>(".po-card, .swot-card").forEach((card) => {
      card.classList.add("motion-card");
      let bounds: DOMRect;
      let frame = 0;
      let clientX = 0;
      let clientY = 0;
      const enter = () => { bounds = card.getBoundingClientRect(); };
      const light = (event: PointerEvent) => {
        clientX = event.clientX;
        clientY = event.clientY;
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          if (!bounds) enter();
          card.style.setProperty("--light-x", `${clientX - bounds.left}px`);
          card.style.setProperty("--light-y", `${clientY - bounds.top}px`);
        });
      };
      const leave = () => { cancelAnimationFrame(frame); frame = 0; };
      card.addEventListener("pointerenter", enter);
      card.addEventListener("pointermove", light);
      card.addEventListener("pointerleave", leave);
      cleanups.push(() => {
        leave();
        card.classList.remove("motion-card");
        card.removeEventListener("pointerenter", enter);
        card.removeEventListener("pointermove", light);
        card.removeEventListener("pointerleave", leave);
      });
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      document.documentElement.removeEventListener("pointerleave", hide);
      window.removeEventListener("blur", hide);
      cursor.remove();
    };
  });

  if (!location.hash) {
    const curtain = document.createElement("div");
    curtain.className = "entrance-curtain";
    curtain.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 6; index++) curtain.append(document.createElement("i"));
    document.body.append(curtain);
    gsap.to(curtain.children, {
      scaleY: 0, duration: 0.8, stagger: 0.045, ease: "power4.inOut", onComplete: () => curtain.remove(),
    });
  }

  window.addEventListener("pagehide", () => media.revert(), { once: true });
}
