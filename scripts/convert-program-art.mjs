import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// Maps each new library program id to its source hero photo in images/<n>.png.
// Output: public/program-art/<id>.jpg, resized to 750px wide @ q80 to match the
// existing 4 heroes (~50KB JPGs, not the ~400KB source PNGs).
const MAP = {
  "full-body-2x": 5, // heavy deadlift — strength foundation
  "home-db-full-body": 1, // dumbbell row
  "bodyweight-foundations": 4, // bar dips
  "home-fat-loss-circuit": 3, // battle ropes — conditioning
  "lean-recomp-4d": 2, // cable machine
  "push-pull-4d": 10, // bent-over barbell row
  "ppl-5d": 6, // overhead press
  "lean-athlete-5d": 7, // pull-ups
  "ppl-6d": 9, // back squat
  "push-pull-6d": 8, // dumbbell row
  // 2-day section, added later — reuse source shots (distinct from full-body-2x's
  // deadlift) until dedicated photos arrive; swap the number + re-run to reassign.
  "upper-lower-2x": 6, // overhead press
  "full-body-strength-2x": 9, // back squat
  // Goal-coverage fillers (each day-section gets all 3 goals). Reused source
  // shots, chosen distinct within each section.
  "lean-circuit-2x": 3, // battle ropes
  "upper-lower-fitness-4d": 1, // dumbbell row
  "total-fitness-5d": 5, // deadlift
  "lean-ppl-6d": 3, // battle ropes
  "total-fitness-6d": 4, // bar dips
};

const outDir = join(process.cwd(), "public", "program-art");
mkdirSync(outDir, { recursive: true });

for (const [id, n] of Object.entries(MAP)) {
  const src = join(process.cwd(), "images", `${n}.png`);
  const out = join(outDir, `${id}.jpg`);
  await sharp(src)
    .resize({ width: 750, withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(out);
  console.log(`${n}.png -> program-art/${id}.jpg`);
}
console.log("done");
