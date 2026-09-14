import { decideCatAction, decisionDelay, walkCooldown, type CatAction, type CatClip, type CatDirection, type CatMood } from "./login-cat-behavior";

const BASE = "/images/UI/login/cat-actions/";
const actionFor = (clip: CatClip): CatAction => {
  if (clip === "start" || clip === "walk") return "walk";
  if (clip === "stretch" || clip === "success" || clip === "error") return clip;
  return "idle";
};

/** Decorative playback only. Authentication never waits for media playback. */
export function createLoginCat(stage: HTMLElement, sprite: HTMLElement, facing: HTMLElement, videos: HTMLVideoElement[]) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  let destroyed = false, failed = false, visible = true;
  let mood: CatMood = "idle", clip: CatClip | null = null;
  let active: HTMLVideoElement | undefined;
  let generation = 0, loading = false, frame = 0, lastTime = 0;
  let x = 0, target = 0, limit = 0, direction: CatDirection = 1;
  let walkAllowedAt = performance.now() + 6000;
  let timer = 0, deadline = 0, remaining = 0;
  let task: (() => void) | null = null;
  const canAnimate = () => !destroyed && !failed && !reduced.matches && visible && !document.hidden;
  const canWander = () => canAnimate() && mood !== "busy" && mood !== "success";
  const isWalking = () => clip === "start" || clip === "walk";

  function state(action: CatAction, activity: string) {
    stage.dataset.catState = action;
    stage.dataset.catActivity = activity;
  }
  function draw() {
    sprite.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    facing.style.transform = `scaleX(${direction})`;
    stage.dataset.catDirection = direction === 1 ? "right" : "left";
  }
  function stopFrame() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; lastTime = 0;
  }
  function clearTask() {
    if (timer) window.clearTimeout(timer);
    timer = 0; task = null; remaining = 0;
  }
  function resumeTask() {
    if (timer || !task || !canAnimate()) return;
    deadline = performance.now() + remaining;
    timer = window.setTimeout(() => {
      timer = 0; remaining = 0;
      if (!canAnimate()) return;
      const run = task; task = null; run?.();
    }, remaining);
  }
  function queueTask(run: () => void, delay: number) {
    clearTask(); task = run; remaining = delay; resumeTask();
  }
  function rest() {
    stopFrame();
    // Rest the legs, not the video. A wait decision keeps this loop at its current time.
    if (clip !== "idle") playClip("idle");
    else resumeVideo();
    if (mood !== "busy" && mood !== "success") queueTask(decide, decisionDelay());
  }
  function decide() {
    if (!canWander()) return;
    if (loading) { queueTask(decide, decisionDelay()); return; }
    const next = decideCatAction({ now: performance.now(), walkAllowedAt, x, limit, direction });
    if (next.kind === "wait") { rest(); return; }
    if (next.kind === "idle") { playClip(next.clip); return; }
    // This is the only place direction can change, and it runs while seated.
    const turning = direction !== next.direction;
    direction = next.direction; target = next.target; draw();
    state("idle", turning ? "turn" : "idle");
    queueTask(() => playClip("stretch"), turning ? 420 : 250);
  }
  function settle() {
    target = x;
    walkAllowedAt = performance.now() + walkCooldown();
    playClip("settle");
  }
  function tick(time: number) {
    frame = 0;
    if (!canAnimate() || !isWalking() || loading || !active || active.paused || active.readyState < 3) return;
    const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
    lastTime = time;
    const distance = target - x;
    // Match travel to this small on-screen cat. Never rotate or re-target mid-stride.
    x += direction * Math.min(Math.abs(distance), 34 * dt);
    x = Math.max(-limit, Math.min(limit, x)); draw();
    if (Math.abs(target - x) < 0.5) { settle(); return; }
    frame = requestAnimationFrame(tick);
  }
  function finishClip() {
    if (!canAnimate()) return;
    if (clip === "stretch") { if (Math.abs(target - x) < 1) settle(); else playClip("start"); }
    else if (clip === "start") playClip("walk");
    else if (clip === "error") playClip("look");
    else rest();
  }
  function unavailable() {
    failed = true; loading = false; clearTask(); stopFrame();
    videos.forEach(video => video.pause());
    sprite.classList.remove("is-ready");
    state(mood === "success" ? "success" : mood === "error" ? "error" : "idle", "poster");
  }
  function resumeVideo() {
    if (!active || loading || !clip || !canAnimate()) return;
    if (active.ended) { finishClip(); return; }
    const token = generation;
    active.play().then(() => {
      if (token !== generation || !canAnimate()) return;
      if (isWalking() && !frame) frame = requestAnimationFrame(tick);
    }).catch((error: DOMException) => {
      if (token === generation && !destroyed && error.name !== "AbortError") unavailable();
    });
  }
  function playClip(next: CatClip) {
    clearTask(); stopFrame();
    const token = ++generation;
    const outgoing = active;
    clip = next; loading = true;
    state(actionFor(next), next);
    if (failed) { unavailable(); return; }
    // Keep an existing idle loop moving while the next clip loads.
    const incoming = videos.find(video => video !== active)!;
    incoming.pause(); incoming.classList.remove("is-active");
    incoming.loop = next === "walk" || next === "idle";
    incoming.onloadeddata = () => {
      if (destroyed || token !== generation) return;
      videos.forEach(video => video.classList.toggle("is-active", video === incoming));
      active = incoming; loading = false;
      outgoing?.pause();
      sprite.classList.add("is-ready");
      resumeVideo();
    };
    incoming.onended = () => { if (token === generation && !destroyed) finishClip(); };
    incoming.onwaiting = () => { if (token === generation) stopFrame(); };
    incoming.onplaying = () => {
      if (token === generation && canAnimate() && isWalking() && !frame) frame = requestAnimationFrame(tick);
    };
    incoming.onerror = () => { if (token === generation && !destroyed) unavailable(); };
    incoming.src = `${BASE}${next}.webm`;
    incoming.load();
  }
  function syncPlayback() {
    stopFrame();
    if (!canAnimate()) {
      active?.pause();
      if (timer) { remaining = Math.max(0, deadline - performance.now()); window.clearTimeout(timer); timer = 0; }
      return;
    }
    resumeVideo(); resumeTask();
  }
  function measure() {
    const stageWidth = stage.clientWidth, spriteWidth = sprite.offsetWidth;
    // The body pivot is 44% across the source; seated turns keep the same position.
    sprite.style.left = `${stageWidth / 2 - spriteWidth * 0.44}px`;
    limit = Math.max(0, stageWidth / 2 - spriteWidth * 0.56 - 8);
    x = Math.max(-limit, Math.min(limit, x)); target = Math.max(-limit, Math.min(limit, target));
    draw();
    if (isWalking() && Math.abs(target - x) < 0.5) settle();
  }
  const resize = new ResizeObserver(measure);
  resize.observe(stage); resize.observe(sprite);
  const intersection = new IntersectionObserver(entries => {
    visible = entries[0]?.isIntersecting ?? true; syncPlayback();
  });
  intersection.observe(stage);
  document.addEventListener("visibilitychange", syncPlayback);
  reduced.addEventListener("change", syncPlayback);
  measure(); playClip("look");

  return {
    setMood(next: CatMood) {
      if (mood === next) return;
      mood = next;
      if (next === "success" || next === "error") {
        target = x; walkAllowedAt = performance.now() + walkCooldown();
        playClip(next);
      } else if (next === "busy") {
        clearTask();
        // Authentication stops new trips, but the seated cat stays alive.
        if (isWalking() || clip === "stretch") settle();
        else rest();
      } else { rest(); syncPlayback(); }
    },
    destroy() {
      destroyed = true; generation++; clearTask(); stopFrame();
      resize.disconnect(); intersection.disconnect();
      document.removeEventListener("visibilitychange", syncPlayback);
      reduced.removeEventListener("change", syncPlayback);
      videos.forEach(video => {
        video.onloadeddata = null; video.onended = null; video.onerror = null;
        video.onwaiting = null; video.onplaying = null;
        video.pause(); video.removeAttribute("src"); video.load();
      });
    },
  };
}
