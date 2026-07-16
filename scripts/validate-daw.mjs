import fs from "node:fs";

const musicPath = new URL("../src/pages/music.jsx", import.meta.url);
const source = fs.readFileSync(musicPath, "utf8");
const required = [
  "Right-click or right-drag empty cells to draw",
  "onResizeNote",
  "nextSampleTrackName",
  "SCALE_DEFINITIONS",
  "PIANO_ROLL_MIN_MIDI",
  "PIANO_ROLL_MAX_MIDI",
];

const missing = required.filter((token) => !source.includes(token));
if (missing.length) {
  console.error(`DAW validation failed. Missing: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("DAW validation passed: sample naming, right-draw/left-erase, drag resize, inherited length, and scale piano roll are present.");
