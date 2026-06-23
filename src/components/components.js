import React from "react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import {
    AppBar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Container,
    Divider,
    Drawer,
    FormControl,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Slider,
    Stack,
    TextField,
    Toolbar,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import {
    AddRounded,
    AlbumRounded,
    ArrowBackRounded,
    AutoAwesomeRounded,
    BlurOnRounded,
    ContentCopyRounded,
    ContentCutRounded,
    ContentPasteRounded,
    DeleteRounded,
    DownloadRounded,
    GraphicEqRounded,
    GridOnRounded,
    HomeRounded,
    LibraryMusicRounded,
    MenuRounded,
    PauseRounded,
    PianoRounded,
    PlayArrowRounded,
    RestartAltRounded,
    StopRounded,
    TuneRounded,
    UploadFileRounded,
    VolumeOffRounded,
    VolumeUpRounded,
    WavesRounded,
} from "@mui/icons-material";

const CHROMATIC_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function midiToFrequency(midi) {
    return Number((440 * Math.pow(2, (midi - 69) / 12)).toFixed(4));
}

function buildNoteOptions() {
    const notes = [];

    for (let midi = 12; midi <= 120; midi += 1) {
        const octave = Math.floor(midi / 12) - 1;
        const name = CHROMATIC_NOTES[midi % 12];

        notes.push({
            label: `${name}${octave}`,
            value: midiToFrequency(midi),
            midi,
            octave,
            name,
        });
    }

    return notes;
}

export const NOTE_OPTIONS = buildNoteOptions();
export const PIANO_ROLL_NOTES = [...NOTE_OPTIONS].reverse();

export const WAVEFORMS = ["sine", "square", "sawtooth", "triangle"];
export const SOUND_TYPES = ["synth", "drum", "bass", "pad", "soundscape", "fx"];
export const FILTER_TYPES = ["lowpass", "highpass", "bandpass", "notch", "allpass"];

export function GradientPage({ children }) {
    return (
        <Box
            sx={{
                minHeight: "100vh",
                color: "#f8fbff",
                background:
                    "radial-gradient(circle at top left, rgba(47,128,237,.35), transparent 30%), radial-gradient(circle at 80% 10%, rgba(155,81,224,.25), transparent 35%), linear-gradient(135deg, #050711 0%, #0a1020 45%, #050711 100%)",
            }}
        >
            {children}
        </Box>
    );
}

export function GlassCard({ children, sx = {}, ...props }) {
    return (
        <Card
            {...props}
            sx={{
                borderRadius: 5,
                border: "1px solid rgba(255,255,255,.1)",
                bgcolor: "rgba(255,255,255,.055)",
                color: "#fff",
                boxShadow: "0 24px 80px rgba(0,0,0,.35)",
                backdropFilter: "blur(20px)",
                ...sx,
            }}
        >
            {children}
        </Card>
    );
}

export function AppNavBar() {
    const location = useLocation();
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));
    const [open, setOpen] = React.useState(false);

    const navItems = [
        { label: "Home", path: "/", icon: <HomeRounded /> },
        { label: "Studio", path: "/music", icon: <GraphicEqRounded /> },
    ];

    const navButtons = (
        <Stack
            direction={isSmall ? "column" : "row"}
            spacing={1}
            sx={{ width: isSmall ? 260 : "auto", p: isSmall ? 2 : 0 }}
        >
            {navItems.map((item) => {
                const active = location.pathname === item.path;

                return (
                    <Button
                        key={item.path}
                        component={RouterLink}
                        to={item.path}
                        onClick={() => setOpen(false)}
                        startIcon={item.icon}
                        variant={active ? "contained" : "text"}
                        sx={{
                            justifyContent: "flex-start",
                            borderRadius: 999,
                            color: active ? "#06101f" : "rgba(255,255,255,.82)",
                            bgcolor: active ? "#9ee8ff" : "transparent",
                            "&:hover": {
                                bgcolor: active ? "#9ee8ff" : "rgba(255,255,255,.08)",
                            },
                        }}
                    >
                        {item.label}
                    </Button>
                );
            })}
        </Stack>
    );

    return (
        <>
            <AppBar
                position="sticky"
                elevation={0}
                sx={{
                    borderBottom: "1px solid rgba(255,255,255,.1)",
                    bgcolor: "rgba(5,7,17,.75)",
                    backdropFilter: "blur(18px)",
                }}
            >
                <Toolbar sx={{ minHeight: 76 }}>
                    <Stack
                        component={RouterLink}
                        to="/"
                        direction="row"
                        spacing={1.5}
                        alignItems="center"
                        sx={{
                            textDecoration: "none",
                            color: "inherit",
                            flexGrow: 1,
                        }}
                    >
                        <Box
                            sx={{
                                width: 42,
                                height: 42,
                                borderRadius: "16px",
                                display: "grid",
                                placeItems: "center",
                                background: "linear-gradient(135deg, #9ee8ff, #b38cff)",
                                color: "#07101f",
                            }}
                        >
                            <AlbumRounded />
                        </Box>

                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 950, lineHeight: 1 }}>
                                AudioMaster Studio
                            </Typography>
                            <Typography variant="caption" sx={{ color: "rgba(255,255,255,.58)" }}>
                                Sound Designer · Piano Roll · Mixer · Playlist
                            </Typography>
                        </Box>
                    </Stack>

                    {isSmall ? (
                        <IconButton onClick={() => setOpen(true)} sx={{ color: "#fff" }}>
                            <MenuRounded />
                        </IconButton>
                    ) : (
                        navButtons
                    )}
                </Toolbar>
            </AppBar>

            <Drawer
                anchor="right"
                open={open}
                onClose={() => setOpen(false)}
                PaperProps={{
                    sx: {
                        bgcolor: "#08101f",
                        color: "#fff",
                        borderLeft: "1px solid rgba(255,255,255,.1)",
                    },
                }}
            >
                {navButtons}
            </Drawer>
        </>
    );
}

export function BackHomeButton() {
    return (
        <Button
            component={RouterLink}
            to="/"
            startIcon={<ArrowBackRounded />}
            sx={{
                color: "rgba(255,255,255,.78)",
                borderRadius: 999,
                mb: 2,
            }}
        >
            Back Home
        </Button>
    );
}

export function SectionHeader({ eyebrow, title, description }) {
    return (
        <Stack spacing={1.5} sx={{ mb: 4 }}>
            {eyebrow && (
                <Chip
                    label={eyebrow}
                    sx={{
                        width: "fit-content",
                        color: "#9ee8ff",
                        bgcolor: "rgba(158,232,255,.09)",
                        border: "1px solid rgba(158,232,255,.18)",
                    }}
                />
            )}

            <Typography
                variant="h3"
                sx={{
                    fontWeight: 950,
                    letterSpacing: "-.045em",
                    fontSize: { xs: "2.2rem", md: "3.2rem" },
                }}
            >
                {title}
            </Typography>

            {description && (
                <Typography
                    sx={{
                        color: "rgba(255,255,255,.65)",
                        maxWidth: 900,
                        lineHeight: 1.8,
                    }}
                >
                    {description}
                </Typography>
            )}
        </Stack>
    );
}

export function PageHero({ eyebrow, title, description, primaryLabel, primaryTo, chips = [] }) {
    return (
        <Container maxWidth="xl" sx={{ py: { xs: 6, md: 10 } }}>
            <Stack direction={{ xs: "column", lg: "row" }} spacing={5} alignItems="center">
                <Box sx={{ flex: 1 }}>
                    <Chip
                        icon={<AutoAwesomeRounded />}
                        label={eyebrow}
                        sx={{
                            mb: 3,
                            color: "#dff7ff",
                            border: "1px solid rgba(158,232,255,.3)",
                            bgcolor: "rgba(158,232,255,.08)",
                        }}
                    />

                    <Typography
                        variant="h1"
                        sx={{
                            fontWeight: 950,
                            letterSpacing: "-.07em",
                            fontSize: {
                                xs: "3rem",
                                sm: "4.5rem",
                                md: "6rem",
                            },
                            lineHeight: 0.9,
                            maxWidth: 980,
                        }}
                    >
                        {title}
                    </Typography>

                    <Typography
                        variant="h6"
                        sx={{
                            mt: 3,
                            color: "rgba(255,255,255,.72)",
                            lineHeight: 1.7,
                            maxWidth: 820,
                        }}
                    >
                        {description}
                    </Typography>

                    <Button
                        component={RouterLink}
                        to={primaryTo}
                        size="large"
                        variant="contained"
                        startIcon={<PlayArrowRounded />}
                        sx={{
                            ...primaryPillSx,
                            mt: 4,
                            minHeight: 48,
                            px: 3,
                        }}
                    >
                        {primaryLabel}
                    </Button>

                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 4 }}>
                        {chips.map((chip) => (
                            <Chip
                                key={chip}
                                label={chip}
                                sx={{
                                    color: "rgba(255,255,255,.82)",
                                    bgcolor: "rgba(255,255,255,.08)",
                                    border: "1px solid rgba(255,255,255,.08)",
                                }}
                            />
                        ))}
                    </Stack>
                </Box>

                <GlassCard sx={{ flex: 0.9, width: "100%" }}>
                    <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
                        <StudioPreview />
                    </CardContent>
                </GlassCard>
            </Stack>
        </Container>
    );
}

export function StudioPreview() {
    return (
        <Stack spacing={3}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Stack direction="row" spacing={1}>
                    <Box sx={dot("#ff5f57")} />
                    <Box sx={dot("#febc2e")} />
                    <Box sx={dot("#28c840")} />
                </Stack>

                <Chip
                    size="small"
                    icon={<PianoRounded />}
                    label="Piano Roll Pattern Mixer"
                    sx={{
                        color: "#9ee8ff",
                        bgcolor: "rgba(158,232,255,.1)",
                    }}
                />
            </Stack>

            <Box
                sx={{
                    p: 2,
                    borderRadius: 4,
                    bgcolor: "rgba(255,255,255,.04)",
                    border: "1px solid rgba(255,255,255,.08)",
                }}
            >
                <Stack spacing={1.4}>
                    <Typography sx={{ fontWeight: 950 }}>Sound Designer</Typography>
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {["Saw Bass", "Glass Pad", "Noise Sweep", "Dream Lead"].map((name) => (
                            <Chip
                                key={name}
                                label={name}
                                sx={{
                                    color: "#fff",
                                    bgcolor: "rgba(158,232,255,.11)",
                                    border: "1px solid rgba(158,232,255,.18)",
                                }}
                            />
                        ))}
                    </Stack>
                </Stack>
            </Box>

            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "72px repeat(16, 1fr)",
                    gap: 0.7,
                    overflowX: "auto",
                }}
            >
                <Box />

                {Array.from({ length: 16 }).map((_, index) => (
                    <Typography
                        key={index}
                        variant="caption"
                        sx={{
                            color: index % 4 === 0 ? "#9ee8ff" : "rgba(255,255,255,.4)",
                            textAlign: "center",
                            fontWeight: index % 4 === 0 ? 900 : 500,
                        }}
                    >
                        {index + 1}
                    </Typography>
                ))}

                {["C5", "B4", "A4", "G4", "F4", "E4", "D4", "C4"].map((row, rowIndex) => (
                    <React.Fragment key={row}>
                        <Box
                            sx={{
                                p: 0.7,
                                borderRadius: 1.5,
                                bgcolor: row.includes("#")
                                    ? "rgba(255,255,255,.04)"
                                    : "rgba(255,255,255,.08)",
                                border: "1px solid rgba(255,255,255,.08)",
                            }}
                        >
                            <Typography variant="caption" sx={{ fontWeight: 900 }}>
                                {row}
                            </Typography>
                        </Box>

                        {Array.from({ length: 16 }).map((_, colIndex) => {
                            const active =
                                rowIndex === 1
                                    ? colIndex >= 2 && colIndex <= 4
                                    : rowIndex === 3
                                        ? colIndex >= 5 && colIndex <= 8
                                        : rowIndex === 5
                                            ? colIndex >= 10 && colIndex <= 13
                                            : false;

                            return (
                                <Box
                                    key={`${row}-${colIndex}`}
                                    sx={{
                                        height: 24,
                                        borderRadius: 1.5,
                                        border: "1px solid rgba(255,255,255,.08)",
                                        bgcolor: active
                                            ? "rgba(158,232,255,.28)"
                                            : "rgba(255,255,255,.035)",
                                    }}
                                />
                            );
                        })}
                    </React.Fragment>
                ))}
            </Box>
        </Stack>
    );
}

function dot(color) {
    return {
        width: 12,
        height: 12,
        borderRadius: "50%",
        bgcolor: color,
    };
}

export function StudioTransport({ bpm, onBpmChange, onExportWav, onExportMp3 }) {
    return (
        <GlassCard>
            <CardContent sx={{ p: 2 }}>
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={2}
                    alignItems={{ xs: "stretch", md: "center" }}
                    justifyContent="space-between"
                >
                    <Stack spacing={0.4}>
                        <Typography sx={{ fontWeight: 950 }}>Studio Transport</Typography>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,.56)" }}>
                            Global tempo and final export controls.
                        </Typography>
                    </Stack>

                    <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        alignItems={{ xs: "stretch", sm: "center" }}
                    >
                        <TextField
                            size="small"
                            label="BPM"
                            type="number"
                            value={bpm}
                            onChange={(event) => onBpmChange(Number(event.target.value))}
                            inputProps={{ min: 40, max: 240 }}
                            sx={darkTextFieldSx}
                        />

                        <Button
                            onClick={onExportWav}
                            variant="outlined"
                            startIcon={<DownloadRounded />}
                            sx={outlinePillSx}
                        >
                            Export WAV
                        </Button>

                        <Button
                            onClick={onExportMp3}
                            variant="outlined"
                            startIcon={<DownloadRounded />}
                            sx={outlinePillSx}
                        >
                            Export MP3
                        </Button>
                    </Stack>
                </Stack>
            </CardContent>
        </GlassCard>
    );
}

export function SoundDesigner({
                                  sounds,
                                  mixerChannels,
                                  selectedSoundId,
                                  soundPlaying,
                                  activeSoundId,
                                  selectedSoundDurationSeconds,
                                  secondsPerBar,
                                  onSelectSound,
                                  onCreateSound,
                                  onDeleteSound,
                                  onDuplicateSound,
                                  onPlaySound,
                                  onPauseSound,
                                  onStopSound,
                                  onSoundChange,
                                  onEnvelopeChange,
                                  onFilterChange,
                                  onFxChange,
                                  onLayerChange,
                                  onAddLayer,
                                  onDeleteLayer,
                              }) {
    const selectedSound = sounds.find((sound) => sound.id === selectedSoundId) || sounds[0];
    const selectedIsPlaying = soundPlaying && activeSoundId === selectedSound?.id;

    return (
        <GlassCard>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack
                    direction={{ xs: "column", xl: "row" }}
                    spacing={2}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", xl: "center" }}
                    sx={{ mb: 2 }}
                >
                    <Stack direction="row" spacing={1.4} alignItems="center">
                        <Box sx={sectionIconSx}>
                            <BlurOnRounded />
                        </Box>

                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 950 }}>
                                Sound Designer
                            </Typography>
                            <Typography variant="caption" sx={{ color: "rgba(255,255,255,.56)" }}>
                                Design oscillator sounds and audition them before drawing notes.
                            </Typography>
                        </Box>
                    </Stack>

                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1}
                        alignItems={{ xs: "stretch", md: "center" }}
                        justifyContent="flex-end"
                        useFlexGap
                        flexWrap="wrap"
                    >
                        <Button
                            onClick={() =>
                                selectedIsPlaying
                                    ? onPauseSound(selectedSound)
                                    : onPlaySound(selectedSound)
                            }
                            disabled={!selectedSound}
                            variant="contained"
                            startIcon={selectedIsPlaying ? <PauseRounded /> : <PlayArrowRounded />}
                            sx={primaryPillSx}
                        >
                            {selectedIsPlaying ? "Pause Sound" : "Play Sound"}
                        </Button>

                        <Button
                            onClick={onStopSound}
                            disabled={!soundPlaying}
                            variant="outlined"
                            startIcon={<StopRounded />}
                            sx={outlinePillSx}
                        >
                            Stop Sound
                        </Button>

                        <Button
                            onClick={onCreateSound}
                            variant="contained"
                            startIcon={<AddRounded />}
                            sx={primaryPillSx}
                        >
                            New Sound
                        </Button>

                        <Button
                            onClick={() => onDuplicateSound(selectedSound?.id)}
                            disabled={!selectedSound}
                            variant="outlined"
                            startIcon={<ContentCopyRounded />}
                            sx={outlinePillSx}
                        >
                            Duplicate
                        </Button>

                        <Button
                            onClick={() => onDeleteSound(selectedSound?.id)}
                            disabled={!selectedSound || sounds.length <= 1}
                            variant="outlined"
                            startIcon={<DeleteRounded />}
                            sx={outlinePillSx}
                        >
                            Delete
                        </Button>
                    </Stack>
                </Stack>

                {selectedSound && (
                    <TimingSummary
                        title="Selected Sound Timing"
                        items={[
                            {
                                label: "Estimated Sound Length",
                                value: `${formatSeconds(selectedSoundDurationSeconds)} · ${formatBars(
                                    secondsToBars(selectedSoundDurationSeconds, secondsPerBar)
                                )}`,
                            },
                            {
                                label: "Oscillators",
                                value: `${selectedSound.layers.length} layer(s)`,
                            },
                            {
                                label: "Mixer Route",
                                value: getMixerName(mixerChannels, selectedSound.mixerChannelId),
                            },
                        ]}
                    />
                )}

                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={12} lg={3}>
                        <Box
                            sx={{
                                p: 1,
                                borderRadius: 4,
                                bgcolor: "rgba(255,255,255,.04)",
                                border: "1px solid rgba(255,255,255,.08)",
                                maxHeight: 560,
                                overflowY: "auto",
                            }}
                        >
                            <Stack spacing={1}>
                                {sounds.map((sound) => {
                                    const selected = sound.id === selectedSound?.id;
                                    const playingThisSound = soundPlaying && activeSoundId === sound.id;

                                    return (
                                        <Button
                                            key={sound.id}
                                            onClick={() => onSelectSound(sound.id)}
                                            sx={{
                                                justifyContent: "flex-start",
                                                textAlign: "left",
                                                borderRadius: 3,
                                                p: 1.2,
                                                color: selected ? "#06101f" : "#fff",
                                                bgcolor: selected
                                                    ? "#9ee8ff"
                                                    : playingThisSound
                                                        ? "rgba(179,140,255,.25)"
                                                        : "rgba(255,255,255,.045)",
                                                "&:hover": {
                                                    bgcolor: selected
                                                        ? "#9ee8ff"
                                                        : "rgba(255,255,255,.08)",
                                                },
                                            }}
                                        >
                                            <Stack spacing={0.2}>
                                                <Typography variant="caption" sx={{ fontWeight: 950 }}>
                                                    {playingThisSound ? "▶ " : ""}
                                                    {sound.name}
                                                </Typography>
                                                <Typography variant="caption" sx={{ opacity: 0.72 }}>
                                                    {sound.type} · {sound.layers.length} osc ·{" "}
                                                    {getMixerName(mixerChannels, sound.mixerChannelId)}
                                                </Typography>
                                            </Stack>
                                        </Button>
                                    );
                                })}
                            </Stack>
                        </Box>
                    </Grid>

                    {selectedSound && (
                        <>
                            <Grid item xs={12} lg={3}>
                                <DesignerSection title="Core">
                                    <TextField
                                        size="small"
                                        label="Sound Name"
                                        value={selectedSound.name}
                                        onChange={(event) =>
                                            onSoundChange(selectedSound.id, "name", event.target.value)
                                        }
                                        sx={darkTextFieldSx}
                                    />

                                    <FormControl size="small" fullWidth sx={darkSelectSx}>
                                        <InputLabel>Sound Type</InputLabel>
                                        <Select
                                            label="Sound Type"
                                            value={selectedSound.type}
                                            onChange={(event) =>
                                                onSoundChange(selectedSound.id, "type", event.target.value)
                                            }
                                        >
                                            {SOUND_TYPES.map((type) => (
                                                <MenuItem key={type} value={type}>
                                                    {type}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <FormControl size="small" fullWidth sx={darkSelectSx}>
                                        <InputLabel>Mixer Route</InputLabel>
                                        <Select
                                            label="Mixer Route"
                                            value={selectedSound.mixerChannelId}
                                            onChange={(event) =>
                                                onSoundChange(
                                                    selectedSound.id,
                                                    "mixerChannelId",
                                                    event.target.value
                                                )
                                            }
                                        >
                                            {mixerChannels.map((channel) => (
                                                <MenuItem key={channel.id} value={channel.id}>
                                                    {channel.name}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <TinySlider
                                        label="Master Gain"
                                        value={selectedSound.masterGain}
                                        min={0}
                                        max={1.4}
                                        step={0.01}
                                        onChange={(value) =>
                                            onSoundChange(selectedSound.id, "masterGain", value)
                                        }
                                    />

                                    <TinySlider
                                        label="Noise Layer"
                                        value={selectedSound.noiseLevel}
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        onChange={(value) =>
                                            onSoundChange(selectedSound.id, "noiseLevel", value)
                                        }
                                    />
                                </DesignerSection>
                            </Grid>

                            <Grid item xs={12} lg={3}>
                                <DesignerSection title="Envelope + Filter">
                                    <TinySlider
                                        label="Attack"
                                        value={selectedSound.envelope.attack}
                                        min={0.001}
                                        max={3}
                                        step={0.001}
                                        onChange={(value) =>
                                            onEnvelopeChange(selectedSound.id, "attack", value)
                                        }
                                    />

                                    <TinySlider
                                        label="Decay"
                                        value={selectedSound.envelope.decay}
                                        min={0.001}
                                        max={3}
                                        step={0.001}
                                        onChange={(value) =>
                                            onEnvelopeChange(selectedSound.id, "decay", value)
                                        }
                                    />

                                    <TinySlider
                                        label="Sustain"
                                        value={selectedSound.envelope.sustain}
                                        min={0.001}
                                        max={1}
                                        step={0.001}
                                        onChange={(value) =>
                                            onEnvelopeChange(selectedSound.id, "sustain", value)
                                        }
                                    />

                                    <TinySlider
                                        label="Release"
                                        value={selectedSound.envelope.release}
                                        min={0.02}
                                        max={6}
                                        step={0.01}
                                        onChange={(value) =>
                                            onEnvelopeChange(selectedSound.id, "release", value)
                                        }
                                    />

                                    <FormControl size="small" fullWidth sx={darkSelectSx}>
                                        <InputLabel>Filter</InputLabel>
                                        <Select
                                            label="Filter"
                                            value={selectedSound.filter.type}
                                            onChange={(event) =>
                                                onFilterChange(selectedSound.id, "type", event.target.value)
                                            }
                                        >
                                            {FILTER_TYPES.map((type) => (
                                                <MenuItem key={type} value={type}>
                                                    {type}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    <TinySlider
                                        label="Cutoff"
                                        value={selectedSound.filter.cutoff}
                                        min={80}
                                        max={18000}
                                        step={10}
                                        onChange={(value) =>
                                            onFilterChange(selectedSound.id, "cutoff", value)
                                        }
                                    />

                                    <TinySlider
                                        label="Resonance"
                                        value={selectedSound.filter.q}
                                        min={0.1}
                                        max={20}
                                        step={0.1}
                                        onChange={(value) =>
                                            onFilterChange(selectedSound.id, "q", value)
                                        }
                                    />
                                </DesignerSection>
                            </Grid>

                            <Grid item xs={12} lg={3}>
                                <DesignerSection title="FX + Oscillators">
                                    <TinySlider
                                        label="Delay Time"
                                        value={selectedSound.fx.delayTime}
                                        min={0}
                                        max={1.5}
                                        step={0.01}
                                        onChange={(value) =>
                                            onFxChange(selectedSound.id, "delayTime", value)
                                        }
                                    />

                                    <TinySlider
                                        label="Delay Feedback"
                                        value={selectedSound.fx.delayFeedback}
                                        min={0}
                                        max={0.9}
                                        step={0.01}
                                        onChange={(value) =>
                                            onFxChange(selectedSound.id, "delayFeedback", value)
                                        }
                                    />

                                    <TinySlider
                                        label="Delay Mix"
                                        value={selectedSound.fx.delayMix}
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        onChange={(value) =>
                                            onFxChange(selectedSound.id, "delayMix", value)
                                        }
                                    />

                                    <TinySlider
                                        label="Reverb Mix"
                                        value={selectedSound.fx.reverbMix}
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        onChange={(value) =>
                                            onFxChange(selectedSound.id, "reverbMix", value)
                                        }
                                    />

                                    <Button
                                        onClick={() => onAddLayer(selectedSound.id)}
                                        variant="outlined"
                                        startIcon={<AddRounded />}
                                        sx={outlinePillSx}
                                    >
                                        Add Oscillator
                                    </Button>

                                    <Stack spacing={1}>
                                        {selectedSound.layers.map((layer, index) => (
                                            <OscLayerEditor
                                                key={layer.id}
                                                layer={layer}
                                                index={index}
                                                canDelete={selectedSound.layers.length > 1}
                                                onChange={(field, value) =>
                                                    onLayerChange(
                                                        selectedSound.id,
                                                        layer.id,
                                                        field,
                                                        value
                                                    )
                                                }
                                                onDelete={() =>
                                                    onDeleteLayer(selectedSound.id, layer.id)
                                                }
                                            />
                                        ))}
                                    </Stack>
                                </DesignerSection>
                            </Grid>
                        </>
                    )}
                </Grid>
            </CardContent>
        </GlassCard>
    );
}

function DesignerSection({ title, children }) {
    return (
        <Box
            sx={{
                height: "100%",
                p: 2,
                borderRadius: 4,
                bgcolor: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.08)",
            }}
        >
            <Stack spacing={1.5}>
                <Typography sx={{ fontWeight: 950 }}>{title}</Typography>
                {children}
            </Stack>
        </Box>
    );
}

function OscLayerEditor({ layer, index, canDelete, onChange, onDelete }) {
    return (
        <Box
            sx={{
                p: 1.2,
                borderRadius: 3,
                bgcolor: "rgba(255,255,255,.045)",
                border: "1px solid rgba(255,255,255,.08)",
            }}
        >
            <Stack spacing={1}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" sx={{ fontWeight: 950 }}>
                        Oscillator {index + 1}
                    </Typography>

                    <IconButton
                        size="small"
                        disabled={!canDelete}
                        onClick={onDelete}
                        sx={{ color: "#fff" }}
                    >
                        <DeleteRounded fontSize="inherit" />
                    </IconButton>
                </Stack>

                <FormControl size="small" fullWidth sx={darkSelectSx}>
                    <InputLabel>Waveform</InputLabel>
                    <Select
                        label="Waveform"
                        value={layer.waveform}
                        onChange={(event) => onChange("waveform", event.target.value)}
                    >
                        {WAVEFORMS.map((wave) => (
                            <MenuItem key={wave} value={wave}>
                                {wave}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <TinySlider
                    label="Layer Gain"
                    value={layer.gain}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(value) => onChange("gain", value)}
                />

                <TinySlider
                    label="Detune"
                    value={layer.detune}
                    min={-1200}
                    max={1200}
                    step={1}
                    onChange={(value) => onChange("detune", value)}
                />

                <TinySlider
                    label="Octave"
                    value={layer.octave}
                    min={-2}
                    max={2}
                    step={1}
                    onChange={(value) => onChange("octave", value)}
                />
            </Stack>
        </Box>
    );
}

export function PatternMixer({
                                 pattern,
                                 sounds,
                                 mixerChannels,
                                 selectedPianoSoundId,
                                 selectedPianoNoteId,
                                 noteLengthSteps,
                                 patternPlaying,
                                 currentPatternStep,
                                 patternSteps,
                                 stepsPerBar,
                                 onPlayPattern,
                                 onPausePattern,
                                 onStopPattern,
                                 onSelectedPianoSoundChange,
                                 onNoteLengthStepsChange,
                                 onAddPianoNote,
                                 onSelectPianoNote,
                                 onDeletePianoNote,
                                 onResizeSelectedNote,
                                 onMoveSelectedNote,
                                 onClearPattern,
                                 onRasterizePattern,
                             }) {
    const selectedSound = sounds.find((sound) => sound.id === selectedPianoSoundId) || sounds[0];
    const selectedNote = pattern.notes.find((note) => note.id === selectedPianoNoteId);

    return (
        <GlassCard>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack
                    direction={{ xs: "column", xl: "row" }}
                    spacing={2}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", xl: "center" }}
                    sx={{ mb: 2 }}
                >
                    <Stack direction="row" spacing={1.4} alignItems="center">
                        <Box sx={sectionIconSx}>
                            <PianoRounded />
                        </Box>

                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 950 }}>
                                Piano Roll Pattern Mixer
                            </Typography>

                            <Typography
                                variant="caption"
                                sx={{ color: "rgba(255,255,255,.56)" }}
                            >
                                Choose a sound, choose note length, then click the piano roll to draw notes from C0 to C9.
                            </Typography>
                        </Box>
                    </Stack>

                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1}
                        alignItems={{ xs: "stretch", md: "center" }}
                        justifyContent="flex-end"
                        useFlexGap
                        flexWrap="wrap"
                    >
                        <Button
                            onClick={patternPlaying ? onPausePattern : onPlayPattern}
                            variant="contained"
                            startIcon={patternPlaying ? <PauseRounded /> : <PlayArrowRounded />}
                            sx={primaryPillSx}
                        >
                            {patternPlaying ? "Pause Pattern" : "Play Pattern"}
                        </Button>

                        <Button
                            onClick={onStopPattern}
                            variant="outlined"
                            startIcon={<StopRounded />}
                            sx={outlinePillSx}
                        >
                            Stop Pattern
                        </Button>

                        <Button
                            onClick={onRasterizePattern}
                            variant="contained"
                            startIcon={<WavesRounded />}
                            sx={primaryPillSx}
                        >
                            Rasterize
                        </Button>

                        <Button
                            onClick={onClearPattern}
                            variant="outlined"
                            startIcon={<RestartAltRounded />}
                            sx={outlinePillSx}
                        >
                            Clear
                        </Button>
                    </Stack>
                </Stack>

                <Box
                    sx={{
                        p: 1.4,
                        borderRadius: 3,
                        bgcolor: "rgba(255,255,255,.045)",
                        border: "1px solid rgba(255,255,255,.08)",
                        mb: 2,
                    }}
                >
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1.5}
                        alignItems={{ xs: "stretch", md: "center" }}
                        useFlexGap
                        flexWrap="wrap"
                    >
                        <FormControl size="small" sx={{ minWidth: 220, ...darkSelectSx }}>
                            <InputLabel>Draw Sound</InputLabel>
                            <Select
                                label="Draw Sound"
                                value={selectedSound?.id || ""}
                                onChange={(event) => onSelectedPianoSoundChange(event.target.value)}
                            >
                                {sounds.map((sound) => (
                                    <MenuItem key={sound.id} value={sound.id}>
                                        {sound.name} · {sound.type}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ minWidth: 180, ...darkSelectSx }}>
                            <InputLabel>Note Length</InputLabel>
                            <Select
                                label="Note Length"
                                value={noteLengthSteps}
                                onChange={(event) => onNoteLengthStepsChange(Number(event.target.value))}
                            >
                                <MenuItem value={1}>1 step · 1/16 note</MenuItem>
                                <MenuItem value={2}>2 steps · 1/8 note</MenuItem>
                                <MenuItem value={4}>4 steps · 1 beat</MenuItem>
                                <MenuItem value={8}>8 steps · 2 beats</MenuItem>
                                <MenuItem value={16}>16 steps · 1 bar</MenuItem>
                                <MenuItem value={32}>32 steps · 2 bars</MenuItem>
                            </Select>
                        </FormControl>

                        <Chip
                            label={`${pattern.notes.length} notes drawn`}
                            sx={{
                                color: "#9ee8ff",
                                bgcolor: "rgba(158,232,255,.09)",
                                border: "1px solid rgba(158,232,255,.18)",
                            }}
                        />

                        <Chip
                            label={`Timeline: ${patternSteps / stepsPerBar} bars`}
                            sx={{
                                color: "#fff",
                                bgcolor: "rgba(255,255,255,.08)",
                                border: "1px solid rgba(255,255,255,.1)",
                            }}
                        />

                        {selectedNote && (
                            <>
                                <Divider
                                    flexItem
                                    orientation="vertical"
                                    sx={{
                                        display: { xs: "none", md: "block" },
                                        borderColor: "rgba(255,255,255,.12)",
                                    }}
                                />

                                <Button
                                    size="small"
                                    onClick={() => onResizeSelectedNote(-1)}
                                    sx={miniButtonSx}
                                >
                                    Shorten
                                </Button>

                                <Button
                                    size="small"
                                    onClick={() => onResizeSelectedNote(1)}
                                    sx={miniButtonSx}
                                >
                                    Lengthen
                                </Button>

                                <Button
                                    size="small"
                                    onClick={() => onMoveSelectedNote(-1)}
                                    sx={miniButtonSx}
                                >
                                    Move Left
                                </Button>

                                <Button
                                    size="small"
                                    onClick={() => onMoveSelectedNote(1)}
                                    sx={miniButtonSx}
                                >
                                    Move Right
                                </Button>

                                <Button
                                    size="small"
                                    onClick={() => onDeletePianoNote(selectedNote.id)}
                                    startIcon={<DeleteRounded />}
                                    sx={miniButtonSx}
                                >
                                    Delete Note
                                </Button>
                            </>
                        )}
                    </Stack>

                    {selectedNote && (
                        <Typography
                            variant="caption"
                            display="block"
                            sx={{ color: "rgba(255,255,255,.58)", mt: 1 }}
                        >
                            Selected note: {frequencyToNoteLabel(selectedNote.note)} · starts step{" "}
                            {selectedNote.startStep + 1} · length {selectedNote.lengthSteps} step(s) ·{" "}
                            {getSoundName(sounds, selectedNote.soundId)}
                        </Typography>
                    )}
                </Box>

                <Box sx={{ overflow: "auto", maxHeight: 620, borderRadius: 3 }}>
                    <Box
                        sx={{
                            minWidth: 1500,
                            display: "grid",
                            gridTemplateColumns: "82px 1fr",
                            gap: 0.8,
                        }}
                    >
                        <Box />

                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: `repeat(${patternSteps}, minmax(28px, 1fr))`,
                                gap: 0.45,
                                position: "sticky",
                                top: 0,
                                zIndex: 5,
                                bgcolor: "rgba(5,7,17,.92)",
                                pb: 0.6,
                            }}
                        >
                            {Array.from({ length: patternSteps }).map((_, stepIndex) => {
                                const bar = Math.floor(stepIndex / stepsPerBar) + 1;
                                const beatStep = stepIndex % stepsPerBar;

                                return (
                                    <Box
                                        key={`step-label-${stepIndex}`}
                                        sx={{
                                            height: 26,
                                            borderRadius: 1,
                                            display: "grid",
                                            placeItems: "center",
                                            bgcolor:
                                                currentPatternStep === stepIndex
                                                    ? "rgba(158,232,255,.28)"
                                                    : beatStep === 0
                                                        ? "rgba(158,232,255,.12)"
                                                        : beatStep % 4 === 0
                                                            ? "rgba(255,255,255,.075)"
                                                            : "rgba(255,255,255,.035)",
                                            border:
                                                beatStep === 0
                                                    ? "1px solid rgba(158,232,255,.26)"
                                                    : "1px solid rgba(255,255,255,.06)",
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontSize: ".62rem",
                                                color:
                                                    beatStep === 0
                                                        ? "#9ee8ff"
                                                        : "rgba(255,255,255,.48)",
                                                fontWeight: beatStep === 0 ? 950 : 700,
                                            }}
                                        >
                                            {beatStep === 0 ? `B${bar}` : stepIndex + 1}
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Box>

                        {PIANO_ROLL_NOTES.map((pianoNote) => {
                            const isSharp = pianoNote.name.includes("#");
                            const rowNotes = pattern.notes.filter(
                                (note) => Math.abs(note.note - pianoNote.value) < 0.0001
                            );

                            return (
                                <React.Fragment key={pianoNote.label}>
                                    <Box
                                        sx={{
                                            height: 30,
                                            px: 1,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            borderRadius: 1.5,
                                            bgcolor: isSharp
                                                ? "rgba(0,0,0,.38)"
                                                : "rgba(255,255,255,.075)",
                                            border: "1px solid rgba(255,255,255,.07)",
                                            position: "sticky",
                                            left: 0,
                                            zIndex: 4,
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            sx={{
                                                fontWeight: 950,
                                                color: isSharp ? "#b38cff" : "#fff",
                                            }}
                                        >
                                            {pianoNote.label}
                                        </Typography>
                                    </Box>

                                    <Box
                                        sx={{
                                            height: 30,
                                            display: "grid",
                                            gridTemplateColumns: `repeat(${patternSteps}, minmax(28px, 1fr))`,
                                            gap: 0.45,
                                            position: "relative",
                                        }}
                                    >
                                        {Array.from({ length: patternSteps }).map((_, stepIndex) => {
                                            const beatStep = stepIndex % stepsPerBar;

                                            return (
                                                <Box
                                                    key={`${pianoNote.label}-cell-${stepIndex}`}
                                                    onClick={() =>
                                                        onAddPianoNote({
                                                            soundId: selectedSound?.id,
                                                            note: pianoNote.value,
                                                            startStep: stepIndex,
                                                            lengthSteps: noteLengthSteps,
                                                        })
                                                    }
                                                    sx={{
                                                        borderRadius: 1,
                                                        cursor: "crosshair",
                                                        bgcolor:
                                                            currentPatternStep === stepIndex
                                                                ? "rgba(158,232,255,.18)"
                                                                : isSharp
                                                                    ? "rgba(0,0,0,.18)"
                                                                    : "rgba(255,255,255,.028)",
                                                        border:
                                                            beatStep === 0
                                                                ? "1px solid rgba(158,232,255,.18)"
                                                                : beatStep % 4 === 0
                                                                    ? "1px solid rgba(255,255,255,.1)"
                                                                    : "1px solid rgba(255,255,255,.045)",
                                                        "&:hover": {
                                                            bgcolor: "rgba(158,232,255,.16)",
                                                        },
                                                    }}
                                                />
                                            );
                                        })}

                                        {rowNotes.map((note) => {
                                            const startColumn = Math.min(
                                                patternSteps,
                                                Math.max(1, note.startStep + 1)
                                            );
                                            const span = Math.max(
                                                1,
                                                Math.min(
                                                    patternSteps - note.startStep,
                                                    note.lengthSteps || 1
                                                )
                                            );
                                            const selected = selectedPianoNoteId === note.id;

                                            return (
                                                <Box
                                                    key={note.id}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        onSelectPianoNote(note.id);
                                                    }}
                                                    sx={{
                                                        gridColumn: `${startColumn} / span ${span}`,
                                                        gridRow: 1,
                                                        zIndex: 3,
                                                        height: 28,
                                                        borderRadius: 1.3,
                                                        px: 0.8,
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                        cursor: "pointer",
                                                        overflow: "hidden",
                                                        bgcolor: selected
                                                            ? "#9ee8ff"
                                                            : getSoundColor(note.soundId, sounds),
                                                        color: selected ? "#06101f" : "#fff",
                                                        border: selected
                                                            ? "1px solid #fff"
                                                            : "1px solid rgba(255,255,255,.18)",
                                                        boxShadow: selected
                                                            ? "0 0 0 2px rgba(158,232,255,.25)"
                                                            : "none",
                                                    }}
                                                >
                                                    <Typography
                                                        variant="caption"
                                                        noWrap
                                                        sx={{
                                                            fontSize: ".62rem",
                                                            fontWeight: 950,
                                                        }}
                                                    >
                                                        {getSoundName(sounds, note.soundId)}
                                                    </Typography>

                                                    <Typography
                                                        variant="caption"
                                                        sx={{
                                                            fontSize: ".58rem",
                                                            opacity: 0.75,
                                                            ml: 0.8,
                                                        }}
                                                    >
                                                        {note.lengthSteps}
                                                    </Typography>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </React.Fragment>
                            );
                        })}
                    </Box>
                </Box>
            </CardContent>
        </GlassCard>
    );
}

export function TrackMixer({
                               mixerChannels,
                               selectedMixerChannelId,
                               onSelectMixerChannel,
                               onMixerChange,
                               onAddMixerChannel,
                           }) {
    const selectedChannel =
        mixerChannels.find((channel) => channel.id === selectedMixerChannelId) ||
        mixerChannels[0];

    return (
        <GlassCard>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack
                    direction={{ xs: "column", lg: "row" }}
                    spacing={2}
                    justifyContent="space-between"
                    sx={{ mb: 2 }}
                >
                    <Stack direction="row" spacing={1} alignItems="center">
                        <TuneRounded sx={{ color: "#9ee8ff" }} />
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 950 }}>
                                Track Mixer
                            </Typography>
                            <Typography variant="caption" sx={{ color: "rgba(255,255,255,.56)" }}>
                                Mixer inserts control volume, pan, filter, resonance, mute, solo, and FX wet mix.
                            </Typography>
                        </Box>
                    </Stack>

                    <Button
                        onClick={onAddMixerChannel}
                        variant="outlined"
                        startIcon={<AddRounded />}
                        sx={outlinePillSx}
                    >
                        Add Mixer Track
                    </Button>
                </Stack>

                <Grid container spacing={2}>
                    <Grid item xs={12} xl={8}>
                        <Box sx={{ overflowX: "auto", pb: 1 }}>
                            <Stack direction="row" spacing={1.2} sx={{ minWidth: 920 }}>
                                {mixerChannels.map((channel) => (
                                    <MixerChannelStrip
                                        key={channel.id}
                                        channel={channel}
                                        selected={channel.id === selectedMixerChannelId}
                                        onSelect={() => onSelectMixerChannel(channel.id)}
                                        onChange={(field, value) =>
                                            onMixerChange(channel.id, field, value)
                                        }
                                    />
                                ))}
                            </Stack>
                        </Box>
                    </Grid>

                    <Grid item xs={12} xl={4}>
                        <MixerInspector
                            channel={selectedChannel}
                            onChange={(field, value) =>
                                onMixerChange(selectedChannel.id, field, value)
                            }
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </GlassCard>
    );
}

function MixerChannelStrip({ channel, selected, onSelect, onChange }) {
    const meterHeight = Math.max(10, Math.round(channel.volume * 85));

    return (
        <Box
            onClick={onSelect}
            sx={{
                width: 106,
                flex: "0 0 106px",
                p: 1.2,
                borderRadius: 3,
                cursor: "pointer",
                bgcolor: selected ? "rgba(158,232,255,.16)" : "rgba(255,255,255,.045)",
                border: selected
                    ? "1px solid rgba(158,232,255,.5)"
                    : "1px solid rgba(255,255,255,.08)",
            }}
        >
            <Stack spacing={1.1} alignItems="stretch">
                <Typography
                    variant="caption"
                    noWrap
                    sx={{
                        fontWeight: 950,
                        color: channel.id === "master" ? "#9ee8ff" : "#fff",
                    }}
                >
                    {channel.name}
                </Typography>

                <Box
                    sx={{
                        height: 110,
                        borderRadius: 2,
                        bgcolor: "rgba(0,0,0,.22)",
                        border: "1px solid rgba(255,255,255,.08)",
                        display: "flex",
                        alignItems: "flex-end",
                        p: 0.7,
                    }}
                >
                    <Box
                        sx={{
                            width: "100%",
                            height: `${meterHeight}%`,
                            borderRadius: 1.5,
                            bgcolor: channel.muted
                                ? "rgba(255,120,120,.5)"
                                : "linear-gradient(180deg, #fff176, #9ee8ff 55%, #54e180)",
                        }}
                    />
                </Box>

                <TinySlider
                    label="Vol"
                    value={channel.volume}
                    min={0}
                    max={1.2}
                    step={0.01}
                    onChange={(value) => onChange("volume", value)}
                />

                <TinySlider
                    label="Pan"
                    value={channel.pan}
                    min={-1}
                    max={1}
                    step={0.01}
                    onChange={(value) => onChange("pan", value)}
                />

                <Stack direction="row" spacing={0.7}>
                    <Tooltip title="Mute">
                        <IconButton
                            size="small"
                            onClick={(event) => {
                                event.stopPropagation();
                                onChange("muted", !channel.muted);
                            }}
                            sx={{
                                color: channel.muted ? "#06101f" : "#fff",
                                bgcolor: channel.muted ? "#ffb4b4" : "rgba(255,255,255,.06)",
                            }}
                        >
                            <VolumeOffRounded fontSize="inherit" />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Solo">
                        <IconButton
                            size="small"
                            disabled={channel.id === "master"}
                            onClick={(event) => {
                                event.stopPropagation();
                                onChange("solo", !channel.solo);
                            }}
                            sx={{
                                color: channel.solo ? "#06101f" : "#fff",
                                bgcolor: channel.solo ? "#9ee8ff" : "rgba(255,255,255,.06)",
                            }}
                        >
                            <VolumeUpRounded fontSize="inherit" />
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>
        </Box>
    );
}

function MixerInspector({ channel, onChange }) {
    if (!channel) return null;

    return (
        <Box
            sx={{
                height: "100%",
                p: 2,
                borderRadius: 4,
                bgcolor: "rgba(255,255,255,.045)",
                border: "1px solid rgba(255,255,255,.08)",
            }}
        >
            <Stack spacing={2}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <GraphicEqRounded sx={{ color: "#9ee8ff" }} />
                    <Box>
                        <Typography sx={{ fontWeight: 950 }}>Track Inspector</Typography>
                        <Typography variant="caption" sx={{ color: "rgba(255,255,255,.54)" }}>
                            {channel.name}
                        </Typography>
                    </Box>
                </Stack>

                <TextField
                    size="small"
                    label="Mixer Name"
                    value={channel.name}
                    onChange={(event) => onChange("name", event.target.value)}
                    sx={darkTextFieldSx}
                />

                <FormControl size="small" fullWidth sx={darkSelectSx}>
                    <InputLabel>Filter Type</InputLabel>
                    <Select
                        label="Filter Type"
                        value={channel.filterType}
                        onChange={(event) => onChange("filterType", event.target.value)}
                    >
                        {FILTER_TYPES.map((type) => (
                            <MenuItem key={type} value={type}>
                                {type}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <TinySlider
                    label="Filter Cutoff"
                    value={channel.cutoff}
                    min={80}
                    max={18000}
                    step={10}
                    onChange={(value) => onChange("cutoff", value)}
                />

                <TinySlider
                    label="Resonance / Q"
                    value={channel.q}
                    min={0.1}
                    max={18}
                    step={0.1}
                    onChange={(value) => onChange("q", value)}
                />

                <TinySlider
                    label="FX Wet Mix"
                    value={channel.fxWet}
                    min={0}
                    max={1}
                    step={0.01}
                    onChange={(value) => onChange("fxWet", value)}
                />
            </Stack>
        </Box>
    );
}

export function PlaylistMixer({
                                  lanes,
                                  clips,
                                  mixerChannels,
                                  selectedLaneId,
                                  selectedClipId,
                                  clipboardClip,
                                  playlistPlaying,
                                  secondsPerBar,
                                  onPlayPlaylist,
                                  onStopPlaylist,
                                  onSelectLane,
                                  onSelectClip,
                                  onLaneChange,
                                  onAddLane,
                                  onDuplicateLane,
                                  onUploadFiles,
                                  onRasterizePattern,
                                  onPreviewClip,
                                  onMoveClip,
                                  onCopyClip,
                                  onCutClip,
                                  onPasteClip,
                                  onDuplicateClip,
                                  onDeleteClip,
                                  onTrimClipStart,
                                  onTrimClipEnd,
                              }) {
    const selectedLane = lanes.find((lane) => lane.id === selectedLaneId);
    const selectedClip = clips.find((clip) => clip.id === selectedClipId);

    return (
        <GlassCard>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
                <Stack
                    direction={{ xs: "column", xl: "row" }}
                    spacing={2}
                    justifyContent="space-between"
                    alignItems={{ xs: "stretch", xl: "center" }}
                    sx={{ mb: 2 }}
                >
                    <Stack direction="row" spacing={1.4} alignItems="center">
                        <Box sx={sectionIconSx}>
                            <GridOnRounded />
                        </Box>

                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 950 }}>
                                Playlist Mixer
                            </Typography>

                            <Typography
                                variant="caption"
                                sx={{ color: "rgba(255,255,255,.56)" }}
                            >
                                Arrange rasterized piano-roll patterns and audio files on the song timeline.
                            </Typography>
                        </Box>
                    </Stack>

                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1}
                        alignItems={{ xs: "stretch", md: "center" }}
                        justifyContent="flex-end"
                        useFlexGap
                        flexWrap="wrap"
                    >
                        <Button
                            onClick={onPlayPlaylist}
                            variant="contained"
                            startIcon={<PlayArrowRounded />}
                            sx={{
                                ...primaryPillSx,
                                bgcolor: playlistPlaying ? "#b38cff" : "#9ee8ff",
                            }}
                        >
                            {playlistPlaying ? "Playlist Playing" : "Play Playlist"}
                        </Button>

                        <Button
                            onClick={onStopPlaylist}
                            variant="outlined"
                            startIcon={<StopRounded />}
                            sx={outlinePillSx}
                        >
                            Stop Playlist
                        </Button>

                        <Button
                            component="label"
                            variant="outlined"
                            startIcon={<UploadFileRounded />}
                            sx={outlinePillSx}
                        >
                            Upload Audio
                            <input
                                hidden
                                type="file"
                                multiple
                                accept="audio/*"
                                onChange={(event) => onUploadFiles(event.target.files)}
                            />
                        </Button>

                        <Button
                            onClick={onRasterizePattern}
                            variant="contained"
                            startIcon={<WavesRounded />}
                            sx={primaryPillSx}
                        >
                            Rasterize Pattern
                        </Button>

                        <Button
                            onClick={onAddLane}
                            variant="outlined"
                            startIcon={<AddRounded />}
                            sx={outlinePillSx}
                        >
                            Add Track
                        </Button>

                        <Button
                            onClick={() => onDuplicateLane(selectedLaneId)}
                            variant="outlined"
                            startIcon={<ContentCopyRounded />}
                            sx={outlinePillSx}
                            disabled={!selectedLane}
                        >
                            Copy Track
                        </Button>
                    </Stack>
                </Stack>

                <PlaylistToolsBar
                    selectedClip={selectedClip}
                    clipboardClip={clipboardClip}
                    secondsPerBar={secondsPerBar}
                    onCopyClip={onCopyClip}
                    onCutClip={onCutClip}
                    onPasteClip={onPasteClip}
                    onDuplicateClip={onDuplicateClip}
                    onDeleteClip={onDeleteClip}
                    onTrimClipStart={onTrimClipStart}
                    onTrimClipEnd={onTrimClipEnd}
                />

                {selectedLane && (
                    <Box
                        sx={{
                            mt: 2,
                            p: 1.3,
                            borderRadius: 3,
                            bgcolor: "rgba(255,255,255,.045)",
                            border: "1px solid rgba(255,255,255,.08)",
                        }}
                    >
                        <Stack
                            direction={{ xs: "column", md: "row" }}
                            spacing={1.5}
                            alignItems={{ xs: "stretch", md: "center" }}
                        >
                            <TextField
                                size="small"
                                label="Selected Playlist Track"
                                value={selectedLane.name}
                                onChange={(event) =>
                                    onLaneChange(selectedLane.id, "name", event.target.value)
                                }
                                sx={darkTextFieldSx}
                            />

                            <FormControl size="small" sx={{ minWidth: 180, ...darkSelectSx }}>
                                <InputLabel>Route to Mixer</InputLabel>
                                <Select
                                    label="Route to Mixer"
                                    value={selectedLane.mixerChannelId}
                                    onChange={(event) =>
                                        onLaneChange(
                                            selectedLane.id,
                                            "mixerChannelId",
                                            event.target.value
                                        )
                                    }
                                >
                                    {mixerChannels.map((channel) => (
                                        <MenuItem key={channel.id} value={channel.id}>
                                            {channel.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <Typography variant="caption" sx={{ color: "rgba(255,255,255,.52)" }}>
                                1 bar = {formatSeconds(secondsPerBar)} at the current BPM.
                            </Typography>
                        </Stack>
                    </Box>
                )}

                <Box sx={{ overflowX: "auto", mt: 2, pb: 1 }}>
                    <Box
                        sx={{
                            minWidth: 1240,
                            display: "grid",
                            gridTemplateColumns: "190px 1fr",
                            gap: 0.8,
                        }}
                    >
                        <Box />

                        <Box
                            sx={{
                                display: "grid",
                                gridTemplateColumns: "repeat(16, 1fr)",
                                gap: 0.8,
                            }}
                        >
                            {Array.from({ length: 16 }).map((_, index) => (
                                <Box key={index} sx={{ textAlign: "center" }}>
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color:
                                                index % 4 === 0
                                                    ? "#9ee8ff"
                                                    : "rgba(255,255,255,.4)",
                                            fontWeight: index % 4 === 0 ? 950 : 600,
                                        }}
                                    >
                                        Bar {index + 1}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>

                        {lanes.map((lane) => {
                            const laneClips = clips.filter((clip) => clip.laneId === lane.id);
                            const active = selectedLaneId === lane.id;

                            return (
                                <React.Fragment key={lane.id}>
                                    <Box
                                        onClick={() => onSelectLane(lane.id)}
                                        sx={{
                                            cursor: "pointer",
                                            p: 1,
                                            minHeight: 88,
                                            borderRadius: 2,
                                            bgcolor: active
                                                ? "rgba(158,232,255,.18)"
                                                : "rgba(255,255,255,.055)",
                                            border: active
                                                ? "1px solid rgba(158,232,255,.45)"
                                                : "1px solid rgba(255,255,255,.08)",
                                        }}
                                    >
                                        <Typography variant="caption" sx={{ fontWeight: 950 }}>
                                            {lane.name}
                                        </Typography>

                                        <Typography
                                            variant="caption"
                                            display="block"
                                            sx={{ color: "rgba(255,255,255,.45)" }}
                                        >
                                            {getMixerName(mixerChannels, lane.mixerChannelId)}
                                        </Typography>
                                    </Box>

                                    <Box
                                        onClick={() => onSelectLane(lane.id)}
                                        sx={{
                                            minHeight: 88,
                                            borderRadius: 2,
                                            p: 0.8,
                                            display: "grid",
                                            gridTemplateColumns: "repeat(16, 1fr)",
                                            gap: 0.8,
                                            position: "relative",
                                            bgcolor: "rgba(255,255,255,.025)",
                                            border: "1px solid rgba(255,255,255,.08)",
                                        }}
                                    >
                                        {Array.from({ length: 16 }).map((_, barIndex) => (
                                            <Box
                                                key={`${lane.id}-bar-bg-${barIndex}`}
                                                sx={{
                                                    gridColumn: `${barIndex + 1} / span 1`,
                                                    gridRow: 1,
                                                    minHeight: 72,
                                                    borderRadius: 1.5,
                                                    bgcolor:
                                                        barIndex % 4 === 0
                                                            ? "rgba(158,232,255,.045)"
                                                            : "rgba(255,255,255,.025)",
                                                    border:
                                                        barIndex % 4 === 0
                                                            ? "1px solid rgba(158,232,255,.18)"
                                                            : "1px solid rgba(255,255,255,.05)",
                                                }}
                                            />
                                        ))}

                                        {laneClips.map((clip) => {
                                            const timing = getClipTiming(clip, secondsPerBar);
                                            const startColumn = Math.min(
                                                16,
                                                Math.max(1, Math.round(clip.startBar) + 1)
                                            );
                                            const span = Math.max(
                                                1,
                                                Math.min(16 - startColumn + 1, Math.ceil(timing.playableBars))
                                            );
                                            const selected = clip.id === selectedClipId;

                                            return (
                                                <Box
                                                    key={clip.id}
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        onSelectLane(lane.id);
                                                        onSelectClip(clip.id);
                                                    }}
                                                    sx={{
                                                        gridColumn: `${startColumn} / span ${span}`,
                                                        gridRow: 1,
                                                        zIndex: 2,
                                                        minHeight: 72,
                                                        borderRadius: 2,
                                                        p: 1,
                                                        cursor: "pointer",
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        justifyContent: "space-between",
                                                        overflow: "hidden",
                                                        bgcolor: selected
                                                            ? "rgba(255,255,255,.26)"
                                                            : clip.sourceType === "pattern"
                                                                ? "rgba(179,140,255,.34)"
                                                                : "rgba(255,180,235,.28)",
                                                        border: selected
                                                            ? "1px solid #fff"
                                                            : "1px solid rgba(255,255,255,.16)",
                                                    }}
                                                >
                                                    <Box>
                                                        <Typography
                                                            variant="caption"
                                                            noWrap
                                                            sx={{ fontWeight: 950, display: "block" }}
                                                        >
                                                            {clip.name}
                                                        </Typography>

                                                        <Typography
                                                            variant="caption"
                                                            display="block"
                                                            sx={{
                                                                color: "rgba(255,255,255,.72)",
                                                                fontSize: ".68rem",
                                                            }}
                                                        >
                                                            {formatBars(timing.playableBars)} ·{" "}
                                                            {formatSeconds(timing.playableSeconds)}
                                                        </Typography>
                                                    </Box>

                                                    <Stack direction="row" spacing={0.5} alignItems="center">
                                                        <Tooltip title="Preview">
                                                            <IconButton
                                                                size="small"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    onPreviewClip(clip);
                                                                }}
                                                                sx={{ color: "#fff", p: 0.2 }}
                                                            >
                                                                <PlayArrowRounded fontSize="inherit" />
                                                            </IconButton>
                                                        </Tooltip>

                                                        <Tooltip title="Move left">
                                                            <IconButton
                                                                size="small"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    onMoveClip(clip.id, -1);
                                                                }}
                                                                sx={{ color: "#fff", p: 0.2 }}
                                                            >
                                                                <ArrowBackRounded fontSize="inherit" />
                                                            </IconButton>
                                                        </Tooltip>

                                                        <Tooltip title="Move right">
                                                            <IconButton
                                                                size="small"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    onMoveClip(clip.id, 1);
                                                                }}
                                                                sx={{ color: "#fff", p: 0.2 }}
                                                            >
                                                                <AddRounded fontSize="inherit" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Stack>
                                                </Box>
                                            );
                                        })}
                                    </Box>
                                </React.Fragment>
                            );
                        })}
                    </Box>
                </Box>
            </CardContent>
        </GlassCard>
    );
}

function PlaylistToolsBar({
                              selectedClip,
                              clipboardClip,
                              secondsPerBar,
                              onCopyClip,
                              onCutClip,
                              onPasteClip,
                              onDuplicateClip,
                              onDeleteClip,
                              onTrimClipStart,
                              onTrimClipEnd,
                          }) {
    const timing = selectedClip ? getClipTiming(selectedClip, secondsPerBar) : null;

    return (
        <Box
            sx={{
                p: 1,
                borderRadius: 3,
                bgcolor: "rgba(255,255,255,.045)",
                border: "1px solid rgba(255,255,255,.08)",
            }}
        >
            <Stack spacing={1.2}>
                <Stack
                    direction={{ xs: "column", md: "row" }}
                    spacing={1}
                    alignItems={{ xs: "stretch", md: "center" }}
                    justifyContent="space-between"
                >
                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <Button
                            onClick={onCopyClip}
                            disabled={!selectedClip}
                            size="small"
                            startIcon={<ContentCopyRounded />}
                            sx={miniButtonSx}
                        >
                            Copy
                        </Button>

                        <Button
                            onClick={onCutClip}
                            disabled={!selectedClip}
                            size="small"
                            startIcon={<ContentCutRounded />}
                            sx={miniButtonSx}
                        >
                            Cut
                        </Button>

                        <Button
                            onClick={onPasteClip}
                            disabled={!clipboardClip}
                            size="small"
                            startIcon={<ContentPasteRounded />}
                            sx={miniButtonSx}
                        >
                            Paste
                        </Button>

                        <Button
                            onClick={onDuplicateClip}
                            disabled={!selectedClip}
                            size="small"
                            startIcon={<ContentCopyRounded />}
                            sx={miniButtonSx}
                        >
                            Duplicate
                        </Button>

                        <Button
                            onClick={onDeleteClip}
                            disabled={!selectedClip}
                            size="small"
                            startIcon={<DeleteRounded />}
                            sx={miniButtonSx}
                        >
                            Delete
                        </Button>
                    </Stack>

                    <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        <Button
                            onClick={() => onTrimClipStart(0.1)}
                            disabled={!selectedClip}
                            size="small"
                            sx={miniButtonSx}
                        >
                            Trim Start +
                        </Button>

                        <Button
                            onClick={() => onTrimClipStart(-0.1)}
                            disabled={!selectedClip}
                            size="small"
                            sx={miniButtonSx}
                        >
                            Trim Start -
                        </Button>

                        <Button
                            onClick={() => onTrimClipEnd(0.1)}
                            disabled={!selectedClip}
                            size="small"
                            sx={miniButtonSx}
                        >
                            Trim End +
                        </Button>

                        <Button
                            onClick={() => onTrimClipEnd(-0.1)}
                            disabled={!selectedClip}
                            size="small"
                            sx={miniButtonSx}
                        >
                            Trim End -
                        </Button>
                    </Stack>
                </Stack>

                {timing ? (
                    <TimingSummary
                        title={`Selected Clip: ${selectedClip.name}`}
                        items={[
                            {
                                label: "Full Clip Length",
                                value: `${formatSeconds(timing.fullSeconds)} · ${formatBars(timing.fullBars)}`,
                            },
                            {
                                label: "Playable After Trim",
                                value: `${formatSeconds(timing.playableSeconds)} · ${formatBars(timing.playableBars)}`,
                            },
                            {
                                label: "Trim Start",
                                value: `${formatSeconds(timing.trimStart)} · ${formatBars(timing.trimStartBars)}`,
                            },
                            {
                                label: "Trim End",
                                value: `${formatSeconds(timing.trimEnd)} · ${formatBars(timing.trimEndBars)}`,
                            },
                            {
                                label: "Timeline Range",
                                value: `Starts bar ${(selectedClip.startBar + 1).toFixed(0)} · Ends near bar ${(
                                    selectedClip.startBar +
                                    timing.playableBars +
                                    1
                                ).toFixed(2)}`,
                            },
                        ]}
                    />
                ) : (
                    <Typography variant="caption" sx={{ color: "rgba(255,255,255,.52)" }}>
                        Select a playlist clip to see full length, playable length, trim start, trim end, and bar values.
                    </Typography>
                )}
            </Stack>
        </Box>
    );
}

function TimingSummary({ title, items }) {
    return (
        <Box
            sx={{
                p: 1.2,
                borderRadius: 3,
                bgcolor: "rgba(0,0,0,.18)",
                border: "1px solid rgba(255,255,255,.08)",
            }}
        >
            <Typography variant="caption" sx={{ color: "#9ee8ff", fontWeight: 950 }}>
                {title}
            </Typography>

            <Grid container spacing={1} sx={{ mt: 0.4 }}>
                {items.map((item) => (
                    <Grid item xs={12} sm={6} lg={item.label === "Timeline Range" ? 4 : 2} key={item.label}>
                        <Box
                            sx={{
                                p: 1,
                                borderRadius: 2,
                                bgcolor: "rgba(255,255,255,.04)",
                                border: "1px solid rgba(255,255,255,.06)",
                                minHeight: 52,
                            }}
                        >
                            <Typography
                                variant="caption"
                                display="block"
                                sx={{ color: "rgba(255,255,255,.48)" }}
                            >
                                {item.label}
                            </Typography>
                            <Typography variant="caption" sx={{ fontWeight: 900 }}>
                                {item.value}
                            </Typography>
                        </Box>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
}

export function StatusCard({ status }) {
    return (
        <GlassCard>
            <CardContent sx={{ p: 2.2 }}>
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <Box
                        sx={{
                            width: 46,
                            height: 46,
                            borderRadius: 3,
                            display: "grid",
                            placeItems: "center",
                            bgcolor: "rgba(158,232,255,.12)",
                            color: "#9ee8ff",
                        }}
                    >
                        <AlbumRounded />
                    </Box>

                    <Box>
                        <Typography sx={{ fontWeight: 950 }}>Current Status</Typography>
                        <Typography
                            variant="caption"
                            sx={{
                                color: "rgba(255,255,255,.58)",
                                lineHeight: 1.5,
                            }}
                        >
                            {status}
                        </Typography>
                    </Box>
                </Stack>
            </CardContent>
        </GlassCard>
    );
}

export function InfoCard({ icon, title, description }) {
    return (
        <GlassCard sx={{ height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
                <Stack spacing={1.5}>
                    <Box
                        sx={{
                            width: 52,
                            height: 52,
                            borderRadius: 3,
                            display: "grid",
                            placeItems: "center",
                            bgcolor: "#9ee8ff",
                            color: "#06101f",
                        }}
                    >
                        {icon}
                    </Box>

                    <Typography variant="h6" sx={{ fontWeight: 950 }}>
                        {title}
                    </Typography>

                    <Typography sx={{ color: "rgba(255,255,255,.64)", lineHeight: 1.7 }}>
                        {description}
                    </Typography>
                </Stack>
            </CardContent>
        </GlassCard>
    );
}

function TinySlider({ label, value, min, max, step, onChange }) {
    return (
        <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.2 }}>
                <Typography variant="caption" sx={{ color: "rgba(255,255,255,.68)" }}>
                    {label}
                </Typography>

                <Typography variant="caption" sx={{ color: "rgba(255,255,255,.44)" }}>
                    {typeof value === "number" ? value.toFixed(value < 5 ? 2 : 0) : value}
                </Typography>
            </Stack>

            <Slider
                size="small"
                value={value}
                min={min}
                max={max}
                step={step}
                onChange={(_, next) => onChange(next)}
                sx={{
                    color: "#9ee8ff",
                    py: 0.4,
                }}
            />
        </Box>
    );
}

export function frequencyToNoteLabel(freq) {
    const match = NOTE_OPTIONS.find(
        (note) => Math.abs(Number(note.value) - Number(freq)) < 0.001
    );

    return match ? match.label : `${Math.round(freq)}Hz`;
}

export function getMixerName(mixerChannels, mixerChannelId) {
    return mixerChannels.find((channel) => channel.id === mixerChannelId)?.name || "Master";
}

function getSoundName(sounds, soundId) {
    return sounds.find((sound) => sound.id === soundId)?.name || "Sound";
}

function getSoundColor(soundId, sounds) {
    const sound = sounds.find((item) => item.id === soundId);

    if (!sound) return "rgba(158,232,255,.36)";

    if (sound.type === "drum") return "rgba(158,232,255,.42)";
    if (sound.type === "bass") return "rgba(84,225,128,.35)";
    if (sound.type === "pad" || sound.type === "soundscape") return "rgba(179,140,255,.42)";
    if (sound.type === "fx") return "rgba(255,241,118,.35)";

    return "rgba(255,180,235,.38)";
}

export function getClipTiming(clip, secondsPerBar) {
    const fullSeconds = clip?.buffer?.duration || 0;
    const trimStart = clip?.trimStart || 0;
    const trimEnd = clip?.trimEnd || 0;
    const playableSeconds = Math.max(0.05, fullSeconds - trimStart - trimEnd);

    return {
        fullSeconds,
        fullBars: secondsToBars(fullSeconds, secondsPerBar),
        playableSeconds,
        playableBars: secondsToBars(playableSeconds, secondsPerBar),
        trimStart,
        trimStartBars: secondsToBars(trimStart, secondsPerBar),
        trimEnd,
        trimEndBars: secondsToBars(trimEnd, secondsPerBar),
    };
}

export function secondsToBars(seconds, secondsPerBar) {
    if (!secondsPerBar || secondsPerBar <= 0) return 0;
    return seconds / secondsPerBar;
}

export function formatSeconds(value) {
    return `${Number(value || 0).toFixed(2)}s`;
}

export function formatBars(value) {
    return `${Number(value || 0).toFixed(2)} bars`;
}

const sectionIconSx = {
    width: 44,
    height: 44,
    borderRadius: 3,
    display: "grid",
    placeItems: "center",
    color: "#06101f",
    bgcolor: "#9ee8ff",
    flex: "0 0 auto",
};

export const primaryPillSx = {
    borderRadius: 999,
    bgcolor: "#9ee8ff",
    color: "#06101f",
    fontWeight: 950,
    minHeight: 40,
    px: 2,
    whiteSpace: "nowrap",
    "&:hover": {
        bgcolor: "#78dcff",
    },
};

export const outlinePillSx = {
    borderRadius: 999,
    color: "#fff",
    borderColor: "rgba(255,255,255,.18)",
    minHeight: 40,
    px: 2,
    whiteSpace: "nowrap",
    "&:hover": {
        borderColor: "rgba(158,232,255,.5)",
        bgcolor: "rgba(158,232,255,.08)",
    },
};

export const miniButtonSx = {
    borderRadius: 999,
    color: "#fff",
    border: "1px solid rgba(255,255,255,.14)",
    bgcolor: "rgba(255,255,255,.04)",
    minHeight: 34,
    px: 1.4,
    whiteSpace: "nowrap",
    "&:hover": {
        bgcolor: "rgba(158,232,255,.1)",
        borderColor: "rgba(158,232,255,.36)",
    },
};

export const darkTextFieldSx = {
    minWidth: 120,
    "& .MuiInputBase-root": {
        color: "#fff",
        borderRadius: 3,
    },
    "& .MuiInputLabel-root": {
        color: "rgba(255,255,255,.62)",
    },
    "& .MuiOutlinedInput-notchedOutline": {
        borderColor: "rgba(255,255,255,.16)",
    },
    "&:hover .MuiOutlinedInput-notchedOutline": {
        borderColor: "rgba(255,255,255,.28)",
    },
};

export const darkSelectSx = {
    "& .MuiInputBase-root": {
        color: "#fff",
        borderRadius: 3,
    },
    "& .MuiInputLabel-root": {
        color: "rgba(255,255,255,.62)",
    },
    "& .MuiOutlinedInput-notchedOutline": {
        borderColor: "rgba(255,255,255,.16)",
    },
    "& .MuiSvgIcon-root": {
        color: "#fff",
    },
};