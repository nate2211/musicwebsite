import { INSTRUMENT_PRESETS } from "./instrumentPresets";
import { normalizeSynthPatch } from "../audio/synthDefaults";

export function getAllPresets(project) {
  return [...INSTRUMENT_PRESETS, ...(project?.customPresets || [])];
}

export function resolveTrackPreset(project, track) {
  const preset = getAllPresets(project).find((entry) => entry.id === track?.presetId)
    || INSTRUMENT_PRESETS[0];
  return normalizeSynthPatch({ ...preset, ...(track?.synth || {}) });
}

export function makeCustomPreset(name, patch, source = "User") {
  return {
    ...normalizeSynthPatch(patch),
    id: `user-preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: name?.trim() || "Untitled Patch",
    category: "User",
    description: "Custom patch created in MusicStudioLab Synth Lab.",
    author: source,
    tags: ["user", "custom", "original"],
    createdAt: new Date().toISOString(),
  };
}
