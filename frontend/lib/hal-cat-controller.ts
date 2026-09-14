export type CatMood = "idle" | "privacy" | "success";
type Motion = CatMood | "walk" | "sit";
type LottieAnimation = {
  loop: boolean;
  playSegments: (frames: [number, number], force: boolean) => void;
  goToAndStop: (frame: number, isFrame: boolean) => void;
  play: () => void;
  pause: () => void;
  destroy: () => void;
  addEventListener: (name: string, callback: () => void) => void;
};
type LottiePlayer = { loadAnimation: (options: Record<string, unknown>) => LottieAnimation };
declare global { interface Window { lottie?: LottiePlayer } }

const SEGMENTS: Record<Motion, [number, number]> = {
  idle: [0, 240], walk: [240, 264], sit: [264, 282], privacy: [282, 342], success: [342, 402],
};
let playerPromise: Promise<LottiePlayer> | undefined;
function loadPlayer(url: string): Promise<LottiePlayer> {
  if (window.lottie) return Promise.resolve(window.lottie);
  if (!playerPromise) {
    playerPromise = new Promise<LottiePlayer>((resolve, reject) => {
      const script = document.createElement("script");
      const fail = () => { script.remove(); playerPromise = undefined; reject(new Error("Lottie could not load")); };
      script.src = url; script.async = true;
      script.onload = () => window.lottie ? resolve(window.lottie) : fail();
      script.onerror = fail;
      document.head.append(script);
    });
  }
  return playerPromise;
}

/** Owns only the decorative cat. Authentication is always handled by the form. */
export function createHalCat(stage: HTMLElement, sprite: HTMLElement, options: {
  assetBase?: string;
  data?: unknown;
  onReady?: () => void;
  onError?: () => void;
} = {}) {
  const base = options.assetBase ?? "/animations/hal-cat/";
  const abort = new AbortController();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const mount = document.createElement("div");
  mount.className = "hal-cat-lottie";
  sprite.append(mount);
  let animation: LottieAnimation | undefined;
  let destroyed = false, ready = false, paused = false, visible = true;
  let mood: CatMood = "idle", motion: Motion = "idle";
  let x = 0, target = 0, limit = 0, direction = 1, lastTime = 0, raf = 0;
  let lastPointerAt = 0, stageCenter = 0;
  const canMove = () => ready && !destroyed && !paused && !reducedMotion.matches && visible && !document.hidden;
  const drawPosition = () => {
    sprite.style.transform = `translate3d(${x.toFixed(2)}px,0,0) scaleX(${direction})`;
  };
  function play(next: Motion, force = false) {
    if (!animation || !ready || (!force && motion === next)) return;
    motion = next; stage.dataset.catState = next;
    animation.loop = next === "idle" || next === "walk";
    animation.playSegments(SEGMENTS[next], true);
    if (!canMove()) {
      // Static frames retain the current meaning, including closed eyes and success.
      animation.goToAndStop(next === "privacy" ? 12 : next === "success" ? 22 : 0, true);
    }
  }
  function stopFrame() { if (raf) cancelAnimationFrame(raf); raf = 0; lastTime = 0; }
  function schedule() { if (!raf && canMove()) raf = requestAnimationFrame(tick); }
  function tick(time: number) {
    raf = 0;
    if (!canMove()) return;
    const dt = lastTime ? Math.min((time - lastTime) / 1000, .05) : 1 / 60;
    lastTime = time;
    if (mood === "idle") {
      const distance = target - x;
      if (Math.abs(distance) > 3 && time - lastPointerAt < 1800) {
        direction = distance > 0 ? 1 : -1;
        const speed = Math.min(170, Math.max(42, Math.abs(distance) * 4.5));
        x += Math.sign(distance) * Math.min(Math.abs(distance), speed * dt);
        play("walk"); drawPosition();
        schedule();
      } else {
        target = x;
        if (motion === "walk") play("sit");
        lastTime = 0;
      }
    }
  }
  const pointerMove = (event: PointerEvent) => {
    if (!canMove() || !finePointer.matches || event.pointerType === "touch" || mood !== "idle") return;
    target = Math.max(-limit, Math.min(limit, event.clientX - stageCenter));
    lastPointerAt = performance.now(); schedule();
  };
  const pointerLeave = () => { target = x; if (motion === "walk") play("sit"); stopFrame(); };
  function measure() {
    const rect = stage.getBoundingClientRect();
    stageCenter = rect.left + rect.width / 2;
    limit = Math.max(0, (rect.width - sprite.offsetWidth) / 2 + 25);
    x = Math.max(-limit, Math.min(limit, x)); target = Math.max(-limit, Math.min(limit, target));
    drawPosition();
  }
  function syncPlayback() {
    stopFrame(); target = x;
    if (!ready || !animation) return;
    if (document.hidden || !visible) { animation.pause(); return; }
    play(mood, true);
  }
  const observer = new ResizeObserver(measure);
  observer.observe(stage);
  const intersection = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? true; syncPlayback();
  });
  intersection.observe(stage);
  window.addEventListener("pointermove", pointerMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", pointerLeave);
  window.addEventListener("scroll", measure, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  document.addEventListener("visibilitychange", syncPlayback);
  reducedMotion.addEventListener("change", syncPlayback);

  Promise.all([
    loadPlayer(base + "lottie.min.js"),
    options.data ? Promise.resolve(options.data) : fetch(base + "hal-cinema-cat.json", { signal: abort.signal }).then(response => {
      if (!response.ok) throw new Error("Cat animation could not load");
      return response.json();
    }),
  ]).then(([player, data]) => {
    if (destroyed) return;
    animation = player.loadAnimation({container:mount,renderer:"svg",loop:true,autoplay:false,animationData:data,rendererSettings:{preserveAspectRatio:"xMidYMid meet",hideOnTransparent:true}});
    animation.addEventListener("DOMLoaded", () => {
      if (destroyed) return;
      ready = true; measure(); syncPlayback(); options.onReady?.();
    });
    animation.addEventListener("data_failed", () => { if (!destroyed) options.onError?.(); });
    animation.addEventListener("complete", () => {
      if (motion === "sit" && mood === "idle" && canMove()) play("idle");
    });
  }).catch(() => { if (!destroyed) options.onError?.(); });

  return {
    setMood(next: CatMood) {
      if (mood === next) return;
      mood = next; target = x; stopFrame();
      if (next === "success") { x = 0; target = 0; direction = 1; drawPosition(); }
      play(next, true);
    },
    setPaused(value: boolean) { paused = value; syncPlayback(); },
    destroy() {
      destroyed = true; abort.abort(); stopFrame(); observer.disconnect(); intersection.disconnect();
      window.removeEventListener("pointermove", pointerMove);
      document.documentElement.removeEventListener("pointerleave", pointerLeave);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", syncPlayback);
      reducedMotion.removeEventListener("change", syncPlayback);
      animation?.destroy(); mount.remove();
    },
  };
}
