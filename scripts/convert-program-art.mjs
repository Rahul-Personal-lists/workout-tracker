import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

// Maps each new library program id to its source hero photo, given as a path
// relative to the project root (images/ is the original batch, images-2/ the
// dedicated follow-ups). Output: public/program-art/<id>.jpg, resized to 750px
// wide @ q80 to match the existing 4 heroes (~50KB JPGs, not the source PNGs).
const MAP = {
  "full-body-2x": "images/5.png", // heavy deadlift — strength foundation
  "home-db-full-body": "images/1.png", // dumbbell row
  "bodyweight-foundations": "images/4.png", // bar dips
  "home-fat-loss-circuit": "images/3.png", // battle ropes — conditioning
  "lean-recomp-4d": "images/2.png", // cable machine
  "push-pull-4d": "images/10.png", // bent-over barbell row
  "ppl-5d": "images/6.png", // overhead press
  "lean-athlete-5d": "images/7.png", // pull-ups
  "ppl-6d": "images/9.png", // back squat
  "push-pull-6d": "images/8.png", // dumbbell row
  // Dedicated photos (images-2/), one per program that previously reused a
  // source shot — chosen distinct within each "N Days a Week" section.
  "upper-lower-2x": "images-2/14.png", // incline barbell bench press
  "full-body-strength-2x": "images-2/15.png", // barbell front squat / clean
  "lean-circuit-2x": "images-2/12.png", // jump rope
  "upper-lower-fitness-4d": "images-2/17.png", // lat pulldown
  "total-fitness-5d": "images-2/16.png", // kettlebell swing
  "lean-ppl-6d": "images-2/11.png", // air bike
  "total-fitness-6d": "images-2/13.png", // cable crossover / fly
};

const outDir = join(process.cwd(), "public", "program-art");
mkdirSync(outDir, { recursive: true });

for (const [id, rel] of Object.entries(MAP)) {
  const src = join(process.cwd(), rel);
  const out = join(outDir, `${id}.jpg`);
  await sharp(src)
    .resize({ width: 750, withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(out);
  console.log(`${rel} -> program-art/${id}.jpg`);
}
console.log("done");
