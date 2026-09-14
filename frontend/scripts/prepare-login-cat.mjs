// Run from frontend: node scripts/prepare-login-cat.mjs (requires ffmpeg).
// Frame ranges are from the supplied 24 fps video, not generated movement.
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const source = path.join(root, "public/images/UI/login/cat-login-transparent.webm");
const output = path.join(root, "public/images/UI/login/cat-actions");
mkdirSync(output, { recursive: true });
const clips = {
  idle: [148, 196],
  look: [0, 60], groom: [60, 148], tail: [148, 202],
  stretch: [202, 288], start: [288, 312], walk: [312, 344],
  settle: [344, 426], rest: [426, 492],
  success: [492, 520], error: [520, 549],
};
function run(args) {
  const result = spawnSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: "inherit" });
  if (result.status !== 0) throw new Error("Could not prepare cat video");
}
for (const [name, [start, end]] of Object.entries(clips)) {
  if (process.argv[2] && process.argv[2] !== name) continue;
  // Three source frames crop the ears. Keep the timing by holding intact adjacent frames.
  const repair = name === "success" ? ",select='not(between(n,10,12))',fps=24" : "";
  const trim = `trim=start_frame=${start}:end_frame=${end},setpts=PTS-STARTPTS`;
  // Forward/reverse makes the small ear/tail movement return to the same pose without a held frame.
  const filter = name === "idle"
    ? `${trim},split[forward][back];[back]reverse[reverse];[forward][reverse]concat=n=2:v=1:a=0,scale=768:432:flags=lanczos,format=yuva420p`
    : `${trim}${repair},scale=768:432:flags=lanczos,format=yuva420p`;
  run(["-c:v", "libvpx-vp9", "-i", source, name === "idle" ? "-filter_complex" : "-vf", filter,
    "-an", "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "24", "-auto-alt-ref", "0", "-row-mt", "1", "-cpu-used", "4", "-threads", "4", path.join(output, `${name}.webm`)]);
}
if (!process.argv[2]) run(["-c:v", "libvpx-vp9", "-i", source, "-vf", "scale=768:432:flags=lanczos,format=rgba", "-frames:v", "1", path.join(output, "poster.png")]);
writeFileSync(path.join(output, "segments.json"), JSON.stringify({ fps: 24, source: "../cat-login-transparent.webm", clips,
  loops: { idle: "forward then reverse; 4 seconds, continuous seated ear/tail motion" },
  repairs: { success: { omittedRelativeFrames: [10, 11, 12], method: "hold adjacent complete frames at 24 fps" } },
}, null, 2) + "\n");
console.log(`Prepared ${process.argv[2] || 'all transparent clips and poster'}`);
