const DB_NAME = "musicstudiolab-user-audio-v1";
const STORE_NAME = "audio-files";

const makeId = () => `user-sample-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser does not support local sample storage."));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open the local sample library."));
  });
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Local sample-library request failed."));
  });
}

async function decodeMetadata(blob) {
  const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
  if (!Context) return { duration: 0, channels: 0, sampleRate: 0 };
  const context = new Context({ latencyHint: "playback" });
  try {
    const buffer = await context.decodeAudioData((await blob.arrayBuffer()).slice(0));
    return {
      duration: Number(buffer.duration.toFixed(3)),
      channels: buffer.numberOfChannels,
      sampleRate: buffer.sampleRate,
    };
  } finally {
    await context.close().catch(() => {});
  }
}

function recordToSample(record) {
  return {
    id: record.id,
    name: record.name,
    category: record.category || "User Samples",
    subtype: record.subtype || "Imported Audio",
    duration: record.duration || 0,
    bpm: record.bpm || null,
    rootNote: record.rootNote || null,
    tags: record.tags || ["user", "imported", "local"],
    url: URL.createObjectURL(record.blob),
    storageKey: record.id,
    user: true,
    mimeType: record.mimeType || record.blob?.type || "audio/wav",
    size: record.size || record.blob?.size || 0,
    channels: record.channels || 0,
    sampleRate: record.sampleRate || 0,
    createdAt: record.createdAt,
  };
}

export async function importUserAudioFiles(files, options = {}) {
  const accepted = [...(files || [])].filter((file) => file && (file.type.startsWith("audio/") || /\.(wav|mp3|ogg|m4a|aac|flac|webm)$/i.test(file.name)));
  if (!accepted.length) throw new Error("Choose one or more supported audio files.");
  const db = await openDatabase();
  const imported = [];
  try {
    for (const file of accepted) {
      const metadata = await decodeMetadata(file);
      const id = makeId();
      const record = {
        id,
        name: file.name.replace(/\.[^.]+$/, "") || "Imported Sample",
        category: options.category || "User Samples",
        subtype: options.subtype || (options.drums ? "User Drums" : "Imported Audio"),
        duration: metadata.duration,
        channels: metadata.channels,
        sampleRate: metadata.sampleRate,
        bpm: options.bpm || null,
        rootNote: options.rootNote || null,
        tags: ["user", "imported", options.drums ? "drum" : "sample"],
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        createdAt: new Date().toISOString(),
        blob: file,
      };
      const transaction = db.transaction(STORE_NAME, "readwrite");
      await requestToPromise(transaction.objectStore(STORE_NAME).put(record));
      imported.push(recordToSample(record));
    }
  } finally {
    db.close();
  }
  return imported;
}

export async function saveRenderedUserSample(blob, metadata = {}) {
  const db = await openDatabase();
  try {
    const decoded = await decodeMetadata(blob);
    const id = makeId();
    const record = {
      id,
      name: metadata.name || "Rasterized Sample",
      category: metadata.category || "User Samples",
      subtype: metadata.subtype || "Rasterized Loop",
      duration: decoded.duration,
      channels: decoded.channels,
      sampleRate: decoded.sampleRate,
      bpm: metadata.bpm || null,
      rootNote: metadata.rootNote || null,
      tags: ["user", "rasterized", "loop"],
      mimeType: blob.type || "audio/wav",
      size: blob.size,
      createdAt: new Date().toISOString(),
      blob,
    };
    const transaction = db.transaction(STORE_NAME, "readwrite");
    await requestToPromise(transaction.objectStore(STORE_NAME).put(record));
    return recordToSample(record);
  } finally {
    db.close();
  }
}

export async function loadUserSamples() {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const records = await requestToPromise(transaction.objectStore(STORE_NAME).getAll());
    return records.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).map(recordToSample);
  } finally {
    db.close();
  }
}

export async function removeUserSample(sampleId) {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    await requestToPromise(transaction.objectStore(STORE_NAME).delete(sampleId));
  } finally {
    db.close();
  }
}

export function mergeSampleCatalog(factorySamples = [], userSamples = [], projectSamples = []) {
  const byId = new Map();
  [...factorySamples, ...projectSamples.filter((sample) => !sample.user), ...userSamples].forEach((sample) => {
    if (sample?.id) byId.set(sample.id, sample);
  });
  return [...byId.values()];
}
