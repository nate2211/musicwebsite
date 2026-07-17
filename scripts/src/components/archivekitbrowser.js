// src/components/ArchiveKitBrowser.js
//
// Drop-in Archive.org drum-kit browser for AudioMasterLab.
// It searches safe Archive audio collections, fetches item metadata,
// categorizes one-shot drum/percussion files, builds a folder hierarchy,
// previews samples, and sends selected sounds back to the Music soundboard.

import React from "react";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Collapse,
    Divider,
    FormControlLabel,
    Grid,
    IconButton,
    LinearProgress,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import {
    AudiotrackRounded,
    FolderOpenRounded,
    FolderRounded,
    KeyboardArrowDownRounded,
    KeyboardArrowRightRounded,
    PlaylistAddRounded,
    RestartAltRounded,
    SearchRounded,
    StopRounded,
    PlayArrowRounded,
} from "@mui/icons-material";

const ARCHIVE_PROXY_URL = "https://scrapewebsite.pages.dev/api/archiveproxy";
const ARCHIVE_KIT_PROXY_STORAGE_KEY = "audiomasterlab.archiveKit.useProxy.v1";
const ARCHIVE_KIT_COLLECTIONS_STORAGE_KEY = "audiomasterlab.archiveKit.collections.v1";

const AUDIO_EXTENSIONS = [
    ".mp3",
    ".wav",
    ".aif",
    ".aiff",
    ".m4a",
    ".ogg",
    ".oga",
    ".opus",
    ".flac",
    ".aac",
    ".webm",
];

const SKIP_FILE_TERMS = [
    "__ia_thumb",
    "spectrogram",
    "waveform",
    "cover",
    "folder",
    "thumb",
    "image",
    "png",
    "jpg",
    "jpeg",
    "gif",
    "torrent",
    "sqlite",
    "metadata",
    "_files.xml",
];

const DRUM_CATEGORY_RULES = [
    {
        id: "kicks",
        label: "Kicks",
        keywords: ["kick", "bd", "bassdrum", "bass drum", "808", "subkick", "sub kick"],
    },
    {
        id: "snares",
        label: "Snares",
        keywords: ["snare", "sd", "rimshot", "rim shot", "rim"],
    },
    {
        id: "claps",
        label: "Claps",
        keywords: ["clap", "claps"],
    },
    {
        id: "closed-hats",
        label: "Closed Hats",
        keywords: ["closedhat", "closed hat", "chh", "hhc", "hat closed", "cl hat"],
    },
    {
        id: "open-hats",
        label: "Open Hats",
        keywords: ["openhat", "open hat", "ohh", "hho", "hat open", "op hat"],
    },
    {
        id: "hats",
        label: "Hats",
        keywords: ["hihat", "hi hat", "hi-hat", "hat", "hh"],
    },
    {
        id: "cymbals",
        label: "Cymbals",
        keywords: ["crash", "ride", "cymbal", "splash", "china"],
    },
    {
        id: "toms",
        label: "Toms",
        keywords: ["tom", "floor tom", "rack tom"],
    },
    {
        id: "percussion",
        label: "Percussion",
        keywords: [
            "perc",
            "percussion",
            "shaker",
            "tamb",
            "tambourine",
            "bongo",
            "conga",
            "clave",
            "cowbell",
            "woodblock",
            "triangle",
            "maraca",
            "guiro",
            "snap",
        ],
    },
    {
        id: "loops",
        label: "Loops",
        keywords: ["loop", "break", "breakbeat", "groove", "beat", "drumloop", "drum loop"],
    },
    {
        id: "fx",
        label: "FX",
        keywords: ["fx", "impact", "riser", "sweep", "fill", "transition", "hit"],
    },
];

const SAFE_COLLECTIONS = [
    {
        id: "opensource_audio",
        label: "Open Source Audio",
    },
    {
        id: "netlabels",
        label: "Netlabels",
    },
    {
        id: "freemusicarchive",
        label: "Free Music Archive",
    },
    {
        id: "audio_music",
        label: "Music, Arts & Culture",
    },
    {
        id: "folksoundomy",
        label: "Folksonomy Audio",
    },
    {
        id: "samplepacks",
        label: "Sample Packs",
    },
];

const DEFAULT_COLLECTIONS = ["opensource_audio", "netlabels", "freemusicarchive", "audio_music"];

function createId(prefix = "archive-kit") {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeText(value) {
    return String(value || "")
        .replace(/[_\-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function searchableText(value) {
    return normalizeText(value).toLowerCase();
}

function cleanNameFromFile(fileName = "") {
    const last = String(fileName).split("/").pop() || fileName;
    const withoutExtension = last.replace(/\.[a-z0-9]+$/i, "");
    return normalizeText(decodeSafe(withoutExtension)) || "Archive sample";
}

function decodeSafe(value) {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

function encodeArchivePath(path = "") {
    return String(path)
        .split("/")
        .map((part) => encodeURIComponent(part))
        .join("/");
}

function isAudioFile(name = "") {
    const lower = String(name || "").toLowerCase().split("?")[0].split("#")[0];
    return AUDIO_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function shouldSkipFile(name = "") {
    const lower = String(name || "").toLowerCase();
    return SKIP_FILE_TERMS.some((term) => lower.includes(term));
}

function formatSize(value) {
    const bytes = Number(value);

    if (!Number.isFinite(bytes) || bytes <= 0) return "";

    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));

    return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function secondsFromArchiveLength(length) {
    if (!length) return null;

    const raw = String(length).trim();

    if (/^\d+(\.\d+)?$/.test(raw)) {
        return Number(raw);
    }

    const parts = raw.split(":").map(Number);

    if (parts.some((part) => !Number.isFinite(part))) return null;

    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    }

    return null;
}

function formatLength(length) {
    const seconds = secondsFromArchiveLength(length);

    if (!Number.isFinite(seconds)) return "";

    if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;

    const minutes = Math.floor(seconds / 60);
    const rest = Math.round(seconds % 60)
        .toString()
        .padStart(2, "0");

    return `${minutes}:${rest}`;
}

function categorizeDrumSample(fileName = "") {
    const text = searchableText(fileName);

    for (const category of DRUM_CATEGORY_RULES) {
        if (category.keywords.some((keyword) => text.includes(keyword))) {
            return category;
        }
    }

    return {
        id: "uncategorized",
        label: "Uncategorized",
        keywords: [],
    };
}

function categorySortIndex(categoryId) {
    const index = DRUM_CATEGORY_RULES.findIndex((category) => category.id === categoryId);
    return index === -1 ? DRUM_CATEGORY_RULES.length + 1 : index;
}

function buildArchiveDownloadUrl(identifier, fileName) {
    return `https://archive.org/download/${encodeURIComponent(identifier)}/${encodeArchivePath(fileName)}`;
}

function buildArchiveDetailsUrl(identifier) {
    return `https://archive.org/details/${encodeURIComponent(identifier)}`;
}

function canProxyUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === "https:" && /(^|\.)archive\.org$/i.test(parsed.hostname);
    } catch {
        return false;
    }
}

function buildProxyUrl(url, useProxy) {
    if (!useProxy || !canProxyUrl(url)) return url;
    return `${ARCHIVE_PROXY_URL}?url=${encodeURIComponent(url)}`;
}

function readBooleanStorage(key, fallback = false) {
    if (typeof window === "undefined") return fallback;

    try {
        const value = window.localStorage.getItem(key);
        if (value === null) return fallback;
        return value === "true";
    } catch {
        return fallback;
    }
}

function writeBooleanStorage(key, value) {
    if (typeof window === "undefined") return;

    try {
        window.localStorage.setItem(key, value ? "true" : "false");
    } catch {
        // Storage can be blocked in private mode.
    }
}

function readCollectionsStorage() {
    if (typeof window === "undefined") return DEFAULT_COLLECTIONS;

    try {
        const raw = window.localStorage.getItem(ARCHIVE_KIT_COLLECTIONS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : null;

        if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_COLLECTIONS;

        return parsed.filter((id) => SAFE_COLLECTIONS.some((collection) => collection.id === id));
    } catch {
        return DEFAULT_COLLECTIONS;
    }
}

function writeCollectionsStorage(collectionIds) {
    if (typeof window === "undefined") return;

    try {
        window.localStorage.setItem(ARCHIVE_KIT_COLLECTIONS_STORAGE_KEY, JSON.stringify(collectionIds));
    } catch {
        // Ignore.
    }
}

function makeArchiveQuery(userQuery, selectedCollections, includeLoops) {
    const cleanUserQuery = normalizeText(userQuery)
        .replace(/[^\w\s"'-]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 100);

    const collectionClause = selectedCollections.length
        ? `(${selectedCollections.map((collection) => `collection:${collection}`).join(" OR ")})`
        : "(collection:opensource_audio OR collection:netlabels OR collection:freemusicarchive OR collection:audio_music)";

    const drumTerms = [
        '"drum kit"',
        '"drum samples"',
        '"sample pack"',
        '"one shot"',
        "oneshot",
        "kick",
        "snare",
        "hihat",
        "hi-hat",
        "percussion",
        "808",
        "breakbeat",
    ];

    if (includeLoops) {
        drumTerms.push("loop", "drumloop", "break");
    }

    const drumClause = [
        `title:(${drumTerms.join(" OR ")})`,
        `subject:(${drumTerms.join(" OR ")})`,
        `description:(${drumTerms.join(" OR ")})`,
    ].join(" OR ");

    const userClause = cleanUserQuery
        ? `(title:"${cleanUserQuery}" OR subject:"${cleanUserQuery}" OR description:"${cleanUserQuery}" OR creator:"${cleanUserQuery}")`
        : "";

    return [
        "mediatype:audio",
        collectionClause,
        `(${drumClause})`,
        userClause,
    ]
        .filter(Boolean)
        .join(" AND ");
}

function buildAdvancedSearchUrl({ query, selectedCollections, includeLoops }) {
    const params = new URLSearchParams();

    params.set("q", makeArchiveQuery(query, selectedCollections, includeLoops));
    params.set("rows", "36");
    params.set("page", "1");
    params.set("output", "json");
    params.set("sort[]", "downloads desc");

    [
        "identifier",
        "title",
        "creator",
        "collection",
        "downloads",
        "description",
        "subject",
        "licenseurl",
        "date",
    ].forEach((field) => params.append("fl[]", field));

    return `https://archive.org/advancedsearch.php?${params.toString()}`;
}

async function fetchJson(url, { signal, useProxy = false } = {}) {
    const response = await fetch(buildProxyUrl(url, useProxy), {
        signal,
        headers: {
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`Archive request failed with HTTP ${response.status}`);
    }

    return response.json();
}

function dedupeSamples(samples) {
    const seen = new Set();
    const next = [];

    for (const sample of samples) {
        const key = `${sample.archiveIdentifier}/${sample.fileName}`.toLowerCase();

        if (seen.has(key)) continue;

        seen.add(key);
        next.push(sample);
    }

    return next;
}

function extractSamplesFromMetadata(item, metadata, options) {
    const files = Array.isArray(metadata?.files) ? metadata.files : [];
    const title = metadata?.metadata?.title || item.title || item.identifier || "Archive kit";
    const creator = metadata?.metadata?.creator || item.creator || "";
    const identifier = metadata?.metadata?.identifier || item.identifier;
    const detailsUrl = buildArchiveDetailsUrl(identifier);

    return files
        .filter((file) => file?.name)
        .filter((file) => isAudioFile(file.name))
        .filter((file) => !shouldSkipFile(file.name))
        .filter((file) => {
            const seconds = secondsFromArchiveLength(file.length);
            if (!Number.isFinite(seconds)) return true;
            if (options.includeLoops) return seconds <= 120;
            return seconds <= 35;
        })
        .map((file) => {
            const category = categorizeDrumSample(file.name);
            const directUrl = buildArchiveDownloadUrl(identifier, file.name);

            return {
                id: createId("archive-sample"),
                name: cleanNameFromFile(file.name),
                type: "sample",
                category: category.id,
                categoryLabel: category.label,
                fileName: file.name,
                format: file.format || "",
                size: file.size || "",
                length: file.length || "",
                url: buildProxyUrl(directUrl, options.useProxy),
                directUrl,
                proxied: Boolean(options.useProxy),
                archiveIdentifier: identifier,
                archiveTitle: title,
                archiveCreator: Array.isArray(creator) ? creator.join(", ") : creator,
                archiveDetailsUrl: detailsUrl,
                source: "Archive.org",
            };
        });
}

function buildHierarchy(samples) {
    const categories = new Map();

    for (const sample of samples) {
        const categoryId = sample.category || "uncategorized";
        const categoryLabel = sample.categoryLabel || "Uncategorized";

        if (!categories.has(categoryId)) {
            categories.set(categoryId, {
                id: categoryId,
                label: categoryLabel,
                items: new Map(),
                count: 0,
            });
        }

        const category = categories.get(categoryId);
        const kitKey = sample.archiveIdentifier || "unknown-kit";

        if (!category.items.has(kitKey)) {
            category.items.set(kitKey, {
                id: kitKey,
                title: sample.archiveTitle || kitKey,
                creator: sample.archiveCreator || "",
                detailsUrl: sample.archiveDetailsUrl || "",
                samples: [],
            });
        }

        category.items.get(kitKey).samples.push(sample);
        category.count += 1;
    }

    return [...categories.values()]
        .sort((a, b) => categorySortIndex(a.id) - categorySortIndex(b.id) || a.label.localeCompare(b.label))
        .map((category) => ({
            ...category,
            items: [...category.items.values()].sort((a, b) => a.title.localeCompare(b.title)),
        }));
}

function getSampleSubtitle(sample) {
    return [
        sample.categoryLabel,
        sample.format,
        formatLength(sample.length),
        formatSize(sample.size),
        sample.proxied ? "Proxy" : "Direct",
    ]
        .filter(Boolean)
        .join(" • ");
}

export default function ArchiveKitBrowser({
                                              onAddSample,
                                              onAddManySamples,
                                              maxSamplesPerSearch = 240,
                                              compact = false,
                                          }) {
    const abortRef = React.useRef(null);
    const previewAudioRef = React.useRef(null);

    const [query, setQuery] = React.useState("drum kit one shot sample pack");
    const [selectedCollections, setSelectedCollections] = React.useState(readCollectionsStorage);
    const [useProxy, setUseProxy] = React.useState(() => readBooleanStorage(ARCHIVE_KIT_PROXY_STORAGE_KEY, true));
    const [includeLoops, setIncludeLoops] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [progress, setProgress] = React.useState({ done: 0, total: 0 });
    const [status, setStatus] = React.useState("Search Archive.org for drum kits and sample packs.");
    const [error, setError] = React.useState("");
    const [samples, setSamples] = React.useState([]);
    const [expandedCategories, setExpandedCategories] = React.useState(() => new Set(["kicks", "snares", "hats"]));
    const [expandedItems, setExpandedItems] = React.useState(() => new Set());
    const [playingId, setPlayingId] = React.useState(null);

    React.useEffect(() => {
        writeBooleanStorage(ARCHIVE_KIT_PROXY_STORAGE_KEY, useProxy);
    }, [useProxy]);

    React.useEffect(() => {
        writeCollectionsStorage(selectedCollections);
    }, [selectedCollections]);

    React.useEffect(() => {
        return () => {
            if (abortRef.current) abortRef.current.abort();

            if (previewAudioRef.current) {
                previewAudioRef.current.pause();
                previewAudioRef.current.src = "";
            }
        };
    }, []);

    const hierarchy = React.useMemo(() => buildHierarchy(samples), [samples]);

    const categoryCounts = React.useMemo(() => {
        const counts = new Map();

        for (const sample of samples) {
            counts.set(sample.categoryLabel, (counts.get(sample.categoryLabel) || 0) + 1);
        }

        return [...counts.entries()].sort((a, b) => b[1] - a[1]);
    }, [samples]);

    const toggleCollection = React.useCallback((collectionId) => {
        setSelectedCollections((current) => {
            if (current.includes(collectionId)) {
                const next = current.filter((id) => id !== collectionId);
                return next.length ? next : current;
            }

            return [...current, collectionId];
        });
    }, []);

    const toggleCategory = React.useCallback((categoryId) => {
        setExpandedCategories((current) => {
            const next = new Set(current);
            if (next.has(categoryId)) next.delete(categoryId);
            else next.add(categoryId);
            return next;
        });
    }, []);

    const toggleItem = React.useCallback((itemId) => {
        setExpandedItems((current) => {
            const next = new Set(current);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
        });
    }, []);

    const stopPreview = React.useCallback(() => {
        if (previewAudioRef.current) {
            previewAudioRef.current.pause();
            previewAudioRef.current.currentTime = 0;
        }

        setPlayingId(null);
    }, []);

    const previewSample = React.useCallback(
        async (sample) => {
            try {
                if (playingId === sample.id) {
                    stopPreview();
                    return;
                }

                stopPreview();

                const audio = new Audio(sample.url);
                previewAudioRef.current = audio;
                audio.crossOrigin = "anonymous";
                audio.preload = "auto";
                audio.onended = () => setPlayingId(null);
                audio.onerror = () => {
                    setPlayingId(null);
                    setError(
                        "Preview failed. Turn on proxy mode or add the sample to the soundboard and try playback from the studio."
                    );
                };

                setPlayingId(sample.id);
                await audio.play();
            } catch (previewError) {
                setPlayingId(null);
                setError(previewError?.message || "Preview failed.");
            }
        },
        [playingId, stopPreview]
    );

    const addSingleSample = React.useCallback(
        (sample) => {
            if (typeof onAddSample === "function") {
                onAddSample(sample);
                setStatus(`Added ${sample.name} to the Music soundboard.`);
            }
        },
        [onAddSample]
    );

    const addCategory = React.useCallback(
        (category) => {
            const list = category.items.flatMap((item) => item.samples);

            if (typeof onAddManySamples === "function") {
                onAddManySamples(list);
            } else if (typeof onAddSample === "function") {
                list.slice(0, 32).forEach(onAddSample);
            }

            setStatus(`Added ${Math.min(list.length, 32)} ${category.label.toLowerCase()} sample(s) to the soundboard.`);
        },
        [onAddManySamples, onAddSample]
    );

    const addKit = React.useCallback(
        (item) => {
            if (typeof onAddManySamples === "function") {
                onAddManySamples(item.samples);
            } else if (typeof onAddSample === "function") {
                item.samples.slice(0, 32).forEach(onAddSample);
            }

            setStatus(`Added ${Math.min(item.samples.length, 32)} sample(s) from ${item.title}.`);
        },
        [onAddManySamples, onAddSample]
    );

    const runSearch = React.useCallback(async () => {
        if (abortRef.current) {
            abortRef.current.abort();
        }

        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError("");
        setSamples([]);
        setProgress({ done: 0, total: 0 });
        setStatus("Searching Archive.org collections for drum-kit candidates...");

        try {
            const searchUrl = buildAdvancedSearchUrl({
                query,
                selectedCollections,
                includeLoops,
            });

            const searchData = await fetchJson(searchUrl, {
                signal: controller.signal,
                useProxy: false,
            });

            const docs = Array.isArray(searchData?.response?.docs) ? searchData.response.docs : [];
            const candidates = docs.slice(0, 18);

            setProgress({ done: 0, total: candidates.length });
            setStatus(`Found ${docs.length} candidate item(s). Reading file metadata...`);

            const gathered = [];

            for (let index = 0; index < candidates.length; index += 1) {
                if (controller.signal.aborted) throw new DOMException("Aborted", "AbortError");

                const item = candidates[index];
                const metadataUrl = `https://archive.org/metadata/${encodeURIComponent(item.identifier)}`;

                try {
                    const metadata = await fetchJson(metadataUrl, {
                        signal: controller.signal,
                        useProxy: false,
                    });

                    const itemSamples = extractSamplesFromMetadata(item, metadata, {
                        useProxy,
                        includeLoops,
                    });

                    gathered.push(...itemSamples);
                    setSamples(dedupeSamples(gathered).slice(0, maxSamplesPerSearch));
                } catch {
                    // Some Archive items have bad metadata or temporary fetch failures.
                    // Continue so one broken item does not kill the whole kit search.
                }

                setProgress({ done: index + 1, total: candidates.length });
            }

            const finalSamples = dedupeSamples(gathered).slice(0, maxSamplesPerSearch);
            setSamples(finalSamples);

            if (finalSamples.length) {
                const firstThree = buildHierarchy(finalSamples)
                    .slice(0, 3)
                    .map((category) => `${category.label}: ${category.count}`)
                    .join(" · ");

                setStatus(`Built Archive kit hierarchy with ${finalSamples.length} sample(s). ${firstThree}`);
            } else {
                setStatus(
                    "No usable one-shot drum files were found. Try a broader query like “909 drum kit”, “808 sample pack”, or enable loops."
                );
            }
        } catch (searchError) {
            if (searchError?.name === "AbortError") {
                setStatus("Archive kit search stopped.");
            } else {
                setError(searchError?.message || "Archive kit search failed.");
                setStatus("Search failed. Try proxy mode, fewer collections, or a simpler query.");
            }
        } finally {
            setLoading(false);
        }
    }, [includeLoops, maxSamplesPerSearch, query, selectedCollections, useProxy]);

    const resetSearch = React.useCallback(() => {
        stopPreview();

        if (abortRef.current) {
            abortRef.current.abort();
        }

        setSamples([]);
        setError("");
        setStatus("Search reset. Enter a kit style and run a new Archive search.");
        setProgress({ done: 0, total: 0 });
    }, [stopPreview]);

    return (
        <Card
            sx={{
                borderRadius: 5,
                border: "1px solid rgba(255,255,255,.1)",
                bgcolor: "rgba(255,255,255,.055)",
                color: "#fff",
                boxShadow: compact ? "none" : "0 24px 80px rgba(0,0,0,.28)",
                backdropFilter: "blur(20px)",
            }}
        >
            <CardContent sx={{ p: { xs: 2, md: compact ? 2 : 3 } }}>
                <Stack spacing={2.2}>
                    <Stack
                        direction={{ xs: "column", lg: "row" }}
                        spacing={2}
                        alignItems={{ xs: "stretch", lg: "center" }}
                        justifyContent="space-between"
                    >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box
                                sx={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 3,
                                    display: "grid",
                                    placeItems: "center",
                                    color: "#06101f",
                                    bgcolor: "#9ee8ff",
                                }}
                            >
                                <FolderOpenRounded />
                            </Box>

                            <Box>
                                <Typography variant="h6" sx={{ fontWeight: 950 }}>
                                    Archive Drum Kit Builder
                                </Typography>
                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,.58)" }}>
                                    Search Archive.org, categorize samples, and add them to the soundboard.
                                </Typography>
                            </Box>
                        </Stack>

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                            <Button
                                onClick={runSearch}
                                disabled={loading}
                                variant="contained"
                                startIcon={loading ? <CircularProgress size={18} /> : <SearchRounded />}
                                sx={primaryPillSx}
                            >
                                {loading ? "Building Kit..." : "Search Kits"}
                            </Button>

                            <Button
                                onClick={resetSearch}
                                disabled={loading && progress.done === 0}
                                variant="outlined"
                                startIcon={<RestartAltRounded />}
                                sx={outlinePillSx}
                            >
                                Reset
                            </Button>
                        </Stack>
                    </Stack>

                    <Grid container spacing={1.5}>
                        <Grid item xs={12} md={7}>
                            <TextField
                                fullWidth
                                size="small"
                                label="Kit search"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder='Try "808 drum kit", "909 one shots", "lofi percussion", "breakbeat samples"'
                                onKeyDown={(event) => {
                                    if (event.key === "Enter" && !loading) runSearch();
                                }}
                                sx={darkTextFieldSx}
                            />
                        </Grid>

                        <Grid item xs={12} md={5}>
                            <Stack
                                direction={{ xs: "column", sm: "row" }}
                                spacing={1}
                                alignItems={{ xs: "stretch", sm: "center" }}
                                sx={{ minHeight: "100%" }}
                            >
                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={useProxy}
                                            onChange={(event) => setUseProxy(event.target.checked)}
                                        />
                                    }
                                    label="Proxy sample URLs"
                                    sx={{ color: "rgba(255,255,255,.72)" }}
                                />

                                <FormControlLabel
                                    control={
                                        <Switch
                                            checked={includeLoops}
                                            onChange={(event) => setIncludeLoops(event.target.checked)}
                                        />
                                    }
                                    label="Include loops"
                                    sx={{ color: "rgba(255,255,255,.72)" }}
                                />
                            </Stack>
                        </Grid>
                    </Grid>

                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {SAFE_COLLECTIONS.map((collection) => {
                            const selected = selectedCollections.includes(collection.id);

                            return (
                                <Chip
                                    key={collection.id}
                                    clickable
                                    onClick={() => toggleCollection(collection.id)}
                                    label={collection.label}
                                    variant={selected ? "filled" : "outlined"}
                                    sx={{
                                        color: selected ? "#06101f" : "rgba(255,255,255,.78)",
                                        bgcolor: selected ? "#9ee8ff" : "rgba(255,255,255,.04)",
                                        borderColor: "rgba(255,255,255,.14)",
                                        fontWeight: 800,
                                    }}
                                />
                            );
                        })}
                    </Stack>

                    {loading && (
                        <Box>
                            <LinearProgress
                                variant={progress.total ? "determinate" : "indeterminate"}
                                value={progress.total ? (progress.done / progress.total) * 100 : undefined}
                                sx={{
                                    height: 8,
                                    borderRadius: 99,
                                    bgcolor: "rgba(255,255,255,.08)",
                                }}
                            />
                            <Typography variant="caption" sx={{ color: "rgba(255,255,255,.56)" }}>
                                {progress.total ? `${progress.done}/${progress.total} Archive items scanned` : "Searching..."}
                            </Typography>
                        </Box>
                    )}

                    {error && (
                        <Alert severity="warning" sx={{ bgcolor: "rgba(255,193,7,.1)", color: "#fff" }}>
                            {error}
                        </Alert>
                    )}

                    <Alert severity="info" sx={{ bgcolor: "rgba(158,232,255,.08)", color: "#fff" }}>
                        {status}
                    </Alert>

                    {!!categoryCounts.length && (
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                            {categoryCounts.map(([label, count]) => (
                                <Chip
                                    key={label}
                                    label={`${label}: ${count}`}
                                    sx={{
                                        color: "#dff7ff",
                                        bgcolor: "rgba(158,232,255,.09)",
                                        border: "1px solid rgba(158,232,255,.18)",
                                    }}
                                />
                            ))}
                        </Stack>
                    )}

                    <Divider sx={{ borderColor: "rgba(255,255,255,.1)" }} />

                    {!samples.length && !loading ? (
                        <Box
                            sx={{
                                p: 3,
                                borderRadius: 4,
                                border: "1px dashed rgba(255,255,255,.18)",
                                bgcolor: "rgba(255,255,255,.035)",
                                textAlign: "center",
                            }}
                        >
                            <Typography sx={{ fontWeight: 950 }}>No kit hierarchy yet</Typography>
                            <Typography sx={{ color: "rgba(255,255,255,.58)", mt: 0.8 }}>
                                Run a search and this area will become a categorized folder tree.
                            </Typography>
                        </Box>
                    ) : (
                        <Stack spacing={1.2}>
                            {hierarchy.map((category) => {
                                const categoryOpen = expandedCategories.has(category.id);

                                return (
                                    <Box
                                        key={category.id}
                                        sx={{
                                            borderRadius: 4,
                                            border: "1px solid rgba(255,255,255,.1)",
                                            bgcolor: "rgba(255,255,255,.04)",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            spacing={1}
                                            sx={{ p: 1 }}
                                        >
                                            <IconButton
                                                size="small"
                                                onClick={() => toggleCategory(category.id)}
                                                sx={{ color: "#fff" }}
                                            >
                                                {categoryOpen ? <KeyboardArrowDownRounded /> : <KeyboardArrowRightRounded />}
                                            </IconButton>

                                            <FolderRounded sx={{ color: "#9ee8ff" }} />

                                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                                <Typography sx={{ fontWeight: 950 }}>
                                                    {category.label}
                                                </Typography>
                                                <Typography variant="caption" sx={{ color: "rgba(255,255,255,.56)" }}>
                                                    {category.count} sample(s) · {category.items.length} Archive item(s)
                                                </Typography>
                                            </Box>

                                            <Button
                                                size="small"
                                                onClick={() => addCategory(category)}
                                                startIcon={<PlaylistAddRounded />}
                                                sx={outlinePillSx}
                                            >
                                                Add Category
                                            </Button>
                                        </Stack>

                                        <Collapse in={categoryOpen} timeout="auto" unmountOnExit>
                                            <Divider sx={{ borderColor: "rgba(255,255,255,.08)" }} />

                                            <Stack spacing={1} sx={{ p: 1 }}>
                                                {category.items.map((item) => {
                                                    const itemOpen = expandedItems.has(item.id);

                                                    return (
                                                        <Box
                                                            key={`${category.id}-${item.id}`}
                                                            sx={{
                                                                borderRadius: 3,
                                                                border: "1px solid rgba(255,255,255,.08)",
                                                                bgcolor: "rgba(0,0,0,.15)",
                                                                overflow: "hidden",
                                                            }}
                                                        >
                                                            <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 1 }}>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={() => toggleItem(item.id)}
                                                                    sx={{ color: "#fff" }}
                                                                >
                                                                    {itemOpen ? <KeyboardArrowDownRounded /> : <KeyboardArrowRightRounded />}
                                                                </IconButton>

                                                                <AudiotrackRounded sx={{ color: "rgba(255,255,255,.75)" }} />

                                                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                                                    <Typography noWrap sx={{ fontWeight: 900 }}>
                                                                        {item.title}
                                                                    </Typography>
                                                                    <Typography noWrap variant="caption" sx={{ color: "rgba(255,255,255,.52)" }}>
                                                                        {[
                                                                            item.creator,
                                                                            `${item.samples.length} sample(s)`,
                                                                            item.detailsUrl ? "Archive source" : "",
                                                                        ]
                                                                            .filter(Boolean)
                                                                            .join(" • ")}
                                                                    </Typography>
                                                                </Box>

                                                                <Button
                                                                    size="small"
                                                                    onClick={() => addKit(item)}
                                                                    startIcon={<PlaylistAddRounded />}
                                                                    sx={outlinePillSx}
                                                                >
                                                                    Add Kit
                                                                </Button>
                                                            </Stack>

                                                            <Collapse in={itemOpen} timeout="auto" unmountOnExit>
                                                                <Divider sx={{ borderColor: "rgba(255,255,255,.08)" }} />

                                                                <Grid container spacing={1} sx={{ p: 1 }}>
                                                                    {item.samples.map((sample) => {
                                                                        const isPlaying = playingId === sample.id;

                                                                        return (
                                                                            <Grid item xs={12} sm={6} lg={4} key={sample.id}>
                                                                                <Box
                                                                                    sx={{
                                                                                        p: 1,
                                                                                        borderRadius: 3,
                                                                                        border: "1px solid rgba(255,255,255,.08)",
                                                                                        bgcolor: isPlaying
                                                                                            ? "rgba(158,232,255,.12)"
                                                                                            : "rgba(255,255,255,.035)",
                                                                                    }}
                                                                                >
                                                                                    <Stack spacing={1}>
                                                                                        <Typography noWrap sx={{ fontWeight: 900 }}>
                                                                                            {sample.name}
                                                                                        </Typography>

                                                                                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,.52)" }}>
                                                                                            {getSampleSubtitle(sample)}
                                                                                        </Typography>

                                                                                        <Stack direction="row" spacing={1}>
                                                                                            <Tooltip title={isPlaying ? "Stop preview" : "Preview sample"}>
                                                                                                <IconButton
                                                                                                    size="small"
                                                                                                    onClick={() => previewSample(sample)}
                                                                                                    sx={{
                                                                                                        color: isPlaying ? "#06101f" : "#fff",
                                                                                                        bgcolor: isPlaying ? "#9ee8ff" : "rgba(255,255,255,.08)",
                                                                                                        "&:hover": {
                                                                                                            bgcolor: isPlaying
                                                                                                                ? "#9ee8ff"
                                                                                                                : "rgba(255,255,255,.14)",
                                                                                                        },
                                                                                                    }}
                                                                                                >
                                                                                                    {isPlaying ? <StopRounded /> : <PlayArrowRounded />}
                                                                                                </IconButton>
                                                                                            </Tooltip>

                                                                                            <Button
                                                                                                size="small"
                                                                                                fullWidth
                                                                                                onClick={() => addSingleSample(sample)}
                                                                                                startIcon={<PlaylistAddRounded />}
                                                                                                variant="contained"
                                                                                                sx={primaryPillSx}
                                                                                            >
                                                                                                Add Pad
                                                                                            </Button>
                                                                                        </Stack>
                                                                                    </Stack>
                                                                                </Box>
                                                                            </Grid>
                                                                        );
                                                                    })}
                                                                </Grid>
                                                            </Collapse>
                                                        </Box>
                                                    );
                                                })}
                                            </Stack>
                                        </Collapse>
                                    </Box>
                                );
                            })}
                        </Stack>
                    )}
                </Stack>
            </CardContent>
        </Card>
    );
}

const primaryPillSx = {
    borderRadius: 999,
    bgcolor: "#9ee8ff",
    color: "#06101f",
    fontWeight: 950,
    "&:hover": {
        bgcolor: "#7edfff",
    },
};

const outlinePillSx = {
    borderRadius: 999,
    color: "rgba(255,255,255,.84)",
    borderColor: "rgba(255,255,255,.18)",
    fontWeight: 850,
    "&:hover": {
        borderColor: "rgba(158,232,255,.5)",
        bgcolor: "rgba(158,232,255,.08)",
    },
};

const darkTextFieldSx = {
    "& .MuiInputLabel-root": {
        color: "rgba(255,255,255,.58)",
    },
    "& .MuiOutlinedInput-root": {
        color: "#fff",
        borderRadius: 3,
        bgcolor: "rgba(255,255,255,.055)",
        "& fieldset": {
            borderColor: "rgba(255,255,255,.14)",
        },
        "&:hover fieldset": {
            borderColor: "rgba(158,232,255,.35)",
        },
        "&.Mui-focused fieldset": {
            borderColor: "#9ee8ff",
        },
    },
    "& input::placeholder": {
        color: "rgba(255,255,255,.42)",
        opacity: 1,
    },
};
