const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

function requestedUnison(source, patch, qualityCap) {
  const requested = Math.max(1, Math.round(source?.sourceKind === "layer"
    ? (source?.unison || 1)
    : (patch?.unison || 1)));
  return Math.min(qualityCap, requested);
}

/**
 * Estimates the expensive AudioNode footprint before a voice is created.
 * This allows the scheduler to reject excess notes before oscillators, LFOs,
 * filters, convolution sends, and panners are allocated.
 */
export function estimateSynthVoiceCost(preset, midi = 60, quality = "balanced") {
  if (!preset) return 2;
  const qualityCap = quality === "economy" ? 3 : quality === "studio" ? 7 : 5;
  const registerCap = midi >= 112 ? 1 : midi >= 100 ? 2 : midi >= 88 ? 4 : qualityCap;
  const cap = Math.max(1, Math.min(qualityCap, registerCap));
  const sources = [
    { ...(preset.oscA || {}), sourceKind: "core" },
    { ...(preset.oscB || {}), sourceKind: "core" },
    { ...(preset.oscC || {}), sourceKind: "core" },
    ...((preset.layers || []).map((layer) => ({ ...layer, sourceKind: "layer" }))),
  ];
  let oscillatorNodes = 0;
  let modulationNodes = 0;
  sources.forEach((source) => {
    if (!source?.enabled || Number(source.level || 0) <= 0) return;
    const voices = Math.min(cap, requestedUnison(source, preset, cap));
    oscillatorNodes += voices;
    if (source.sourceKind === "layer" && Number(source.motion || 0) > 0.001) modulationNodes += voices;
  });
  if (preset.sub?.enabled && Number(preset.sub.level || 0) > 0) oscillatorNodes += 1;
  if (preset.noise?.enabled && Number(preset.noise.level || 0) > 0) modulationNodes += 1;
  if (preset.textureLayer?.enabled && Number(preset.textureLayer.level || 0) > 0) {
    modulationNodes += Number(preset.textureLayer.motion || 0) > 0.001 ? 2 : 1;
  }
  if (preset.fm?.enabled && Number(preset.fm.amount || 0) > 0) modulationNodes += 1;
  if (preset.ring?.enabled && Number(preset.ring.amount || 0) > 0) modulationNodes += 1;
  if (preset.lfo1?.enabled && Math.abs(Number(preset.lfo1.amount || 0)) > 0.0001) modulationNodes += 1;
  if (preset.lfo2?.enabled && Math.abs(Number(preset.lfo2.amount || 0)) > 0.0001) modulationNodes += 1;
  if (Math.abs(Number(preset.pitchLfoDepth || 0)) > 0.0001) modulationNodes += 1;
  return clamp(1 + oscillatorNodes + Math.ceil(modulationNodes * 0.45), 1, 28);
}

export function candidatePriority(candidate) {
  const velocity = clamp(candidate?.velocity ?? candidate?.note?.velocity ?? 0.8, 0.01, 1);
  const midi = Number(candidate?.midi ?? candidate?.note?.midi ?? 60);
  const duration = clamp(candidate?.duration ?? candidate?.note?.duration ?? 1, 0.05, 256);
  const selectedBoost = candidate?.selectedTrack ? 0.16 : 0;
  const soloBoost = candidate?.solo ? 0.12 : 0;
  const samplerBoost = candidate?.kind === "sample-step" ? 0.1 : 0;
  const anchorBoost = candidate?.anchor === "low" || candidate?.anchor === "high" ? 0.18 : 0;
  const registerBalance = midi < 48 ? 0.07 : midi > 84 ? 0.055 : 0;
  const sustainPenalty = Math.min(0.16, Math.max(0, duration - 8) * 0.004);
  return velocity + selectedBoost + soloBoost + samplerBoost + anchorBoost + registerBalance - sustainPenalty;
}

function decorateTrackAnchors(candidates) {
  const pitched = candidates.filter((candidate) => Number.isFinite(Number(candidate.midi)));
  if (!pitched.length) return candidates;
  const ordered = [...pitched].sort((a, b) => Number(a.midi) - Number(b.midi));
  const low = ordered[0];
  const high = ordered.at(-1);
  return candidates.map((candidate) => ({
    ...candidate,
    anchor: candidate === low ? "low" : candidate === high ? "high" : candidate.anchor,
  }));
}

function dedupeTrackCandidates(candidates) {
  const unique = new Map();
  candidates.forEach((candidate, index) => {
    const midi = Number(candidate.midi ?? candidate.note?.midi ?? -1);
    const slice = Number.isInteger(candidate.note?.sliceIndex) ? candidate.note.sliceIndex : -1;
    const kind = candidate.kind || "voice";
    const key = `${kind}:${midi}:${slice}:${Number(candidate.note?.duration || candidate.duration || 1)}`;
    const current = unique.get(key);
    if (!current || candidatePriority(candidate) > candidatePriority(current)) {
      unique.set(key, { ...candidate, _sourceIndex: index });
    }
  });
  return decorateTrackAnchors([...unique.values()]);
}

/**
 * Fair, deterministic multitrack admission. It reserves a useful voice for
 * every active track, then fills the remaining budget round-robin. This avoids
 * one dense piano track starving drums or another instrument, while ensuring
 * the scheduler never allocates AudioNodes beyond the realtime budget.
 */
export function planMultitrackStep(candidates = [], options = {}) {
  const globalVoiceBudget = Math.max(1, Math.floor(Number(options.globalVoiceBudget || 48)));
  const globalCostBudget = Math.max(1, Number(options.globalCostBudget || 180));
  const perTrackVoiceBudget = Math.max(1, Math.floor(Number(options.perTrackVoiceBudget || 16)));
  const perTrackCostBudget = Math.max(1, Number(options.perTrackCostBudget || 64));
  const activeVoiceCount = Math.max(0, Number(options.activeVoiceCount || 0));
  const activeVoiceCost = Math.max(0, Number(options.activeVoiceCost || 0));
  const perRoleVoiceBudget = Math.max(1, Math.floor(Number(options.perRoleVoiceBudget || globalVoiceBudget)));
  const perRoleCostBudget = Math.max(1, Number(options.perRoleCostBudget || globalCostBudget));
  const remainingVoices = Math.max(0, globalVoiceBudget - activeVoiceCount);
  const remainingCost = Math.max(0, globalCostBudget - activeVoiceCost);
  if (!candidates.length || remainingVoices <= 0 || remainingCost <= 0) return [];

  const grouped = new Map();
  candidates.forEach((candidate) => {
    if (!candidate?.trackId) return;
    const bucket = grouped.get(candidate.trackId) || [];
    bucket.push(candidate);
    grouped.set(candidate.trackId, bucket);
  });

  const tracks = [...grouped.entries()].map(([trackId, raw]) => {
    const activeCount = Math.max(0, Number(options.activeByTrack?.get?.(trackId)?.count || 0));
    const activeCost = Math.max(0, Number(options.activeByTrack?.get?.(trackId)?.cost || 0));
    const queue = dedupeTrackCandidates(raw)
      .sort((a, b) => candidatePriority(b) - candidatePriority(a) || Number(a._sourceIndex || 0) - Number(b._sourceIndex || 0));
    return {
      trackId,
      queue,
      admitted: 0,
      cost: 0,
      activeCount,
      activeCost,
      role: queue[0]?.role || "samples",
      trackPriority: Math.max(...queue.map(candidatePriority), 0),
    };
  }).sort((a, b) => b.trackPriority - a.trackPriority || a.trackId.localeCompare(b.trackId));

  const selected = [];
  let usedCost = 0;
  const roleUsage = new Map();
  const initialRoleUsage = new Map();
  options.activeByRole?.forEach?.((stats, role) => {
    initialRoleUsage.set(role, { count: Number(stats?.count || 0), cost: Number(stats?.cost || 0) });
  });
  const canAdmit = (track, candidate) => {
    const cost = Math.max(1, Number(candidate.cost || 1));
    if (selected.length >= remainingVoices) return false;
    if (usedCost + cost > remainingCost) return false;
    if (track.activeCount + track.admitted >= perTrackVoiceBudget) return false;
    if (track.activeCost + track.cost + cost > perTrackCostBudget) return false;
    const role = candidate.role || track.role || "samples";
    const activeRole = initialRoleUsage.get(role) || { count: 0, cost: 0 };
    const pendingRole = roleUsage.get(role) || { count: 0, cost: 0 };
    if (activeRole.count + pendingRole.count >= perRoleVoiceBudget) return false;
    if (activeRole.cost + pendingRole.cost + cost > perRoleCostBudget) return false;
    return true;
  };
  const admit = (track, candidate) => {
    const cost = Math.max(1, Number(candidate.cost || 1));
    selected.push({ ...candidate, cost, priority: candidatePriority(candidate) });
    track.admitted += 1;
    track.cost += cost;
    usedCost += cost;
    const role = candidate.role || track.role || "samples";
    const pendingRole = roleUsage.get(role) || { count: 0, cost: 0 };
    roleUsage.set(role, { count: pendingRole.count + 1, cost: pendingRole.cost + cost });
  };

  // First pass reserves one voice per active musical role when possible.
  const reservedTracks = new Set();
  const byRole = new Map();
  tracks.forEach((track) => {
    const bucket = byRole.get(track.role) || [];
    bucket.push(track);
    byRole.set(track.role, bucket);
  });
  for (const roleTracks of byRole.values()) {
    const track = roleTracks[0];
    while (track?.queue.length) {
      const candidate = track.queue.shift();
      if (canAdmit(track, candidate)) {
        admit(track, candidate);
        reservedTracks.add(track.trackId);
        break;
      }
    }
  }

  // Second pass reserves one voice per remaining active track when possible.
  tracks.forEach((track) => {
    if (reservedTracks.has(track.trackId)) return;
    while (track.queue.length) {
      const candidate = track.queue.shift();
      if (canAdmit(track, candidate)) {
        admit(track, candidate);
        break;
      }
    }
  });

  // Remaining voices are allocated fairly rather than track-by-track.
  let progress = true;
  while (progress && selected.length < remainingVoices && usedCost < remainingCost) {
    progress = false;
    for (const track of tracks) {
      while (track.queue.length) {
        const candidate = track.queue.shift();
        if (!canAdmit(track, candidate)) continue;
        admit(track, candidate);
        progress = true;
        break;
      }
      if (selected.length >= remainingVoices || usedCost >= remainingCost) break;
    }
  }

  const perTrackCounts = new Map();
  selected.forEach((candidate) => {
    perTrackCounts.set(candidate.trackId, (perTrackCounts.get(candidate.trackId) || 0) + 1);
  });
  return selected.map((candidate, index) => ({
    ...candidate,
    trackStackSize: perTrackCounts.get(candidate.trackId) || 1,
    globalStackSize: selected.length,
    startOffset: selected.length < 8 ? 0 : Math.min(0.0022, index * 0.000045),
  }));
}

export function multitrackHeadroom(newVoices = 1, activeVoices = 0, activeTracks = 1) {
  const density = Math.max(0, Number(newVoices) - 3) * 0.07
    + Math.max(0, Number(activeVoices)) * 0.016
    + Math.max(0, Number(activeTracks) - 2) * 0.06;
  return clamp(1 / Math.sqrt(1 + density), 0.28, 1);
}
