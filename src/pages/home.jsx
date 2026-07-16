import React from "react";
import { Link as RouterLink } from "react-router-dom";
import {
    Box,
    Button,
    CardContent,
    Container,
    Grid,
    Stack,
    Typography,
} from "@mui/material";
import {
    AudioFileRounded,
    BlurOnRounded,
    ContentCutRounded,
    GraphicEqRounded,
    PianoRounded,
    TuneRounded,
    WavesRounded,
} from "@mui/icons-material";
import {
    AppNavBar,
    GlassCard,
    GradientPage,
    InfoCard,
    PageHero,
    SectionHeader,
} from "../components/components.jsx";
import Seo from "../components/seo.jsx";

export default function Home() {
    return (
        <GradientPage>
            <Seo
                title="Browser Music Studio"
                path="/"
                description="MusicStudioLab is a browser-based WebAudio music studio for sound design, oscillator synthesis, piano-roll sequencing, playlist arranging, mixer routing, audio effects, and WAV or MP3 export."
                keywords="MusicStudioLab, browser music studio, WebAudio API, online DAW, sound designer, oscillator synth, piano roll, pattern mixer, playlist mixer, audio effects, reverb, delay, WAV export, MP3 export"
                structuredData={{
                    "@context": "https://schema.org",
                    "@type": "WebApplication",
                    name: "MusicStudioLab",
                    url: "https://musicstudiolab.com/",
                    applicationCategory: "MultimediaApplication",
                    operatingSystem: "Web Browser",
                    description:
                        "MusicStudioLab is a browser-based WebAudio music studio for sound design, oscillator synthesis, piano-roll sequencing, playlist arranging, mixer routing, effects, and audio exporting.",
                    offers: {
                        "@type": "Offer",
                        price: "0",
                        priceCurrency: "USD",
                    },
                    featureList: [
                        "WebAudio sound designer",
                        "Oscillator layers",
                        "Waveform selection",
                        "ADSR envelopes",
                        "Piano-roll sequencing",
                        "Pattern mixer",
                        "Track mixer",
                        "Playlist arranger",
                        "Audio clip editing",
                        "Delay and reverb effects",
                        "WAV export",
                        "MP3 export",
                    ],
                }}
            />

            <AppNavBar />

            <PageHero
                eyebrow="WebAudio Music Studio"
                title="Design sounds, draw piano-roll notes, arrange songs, and export audio."
                description="MusicStudioLab gives you a browser-based studio for building music from the sound up. Create oscillator sounds, layer waveforms, shape envelopes, add filters and effects, draw notes in the piano roll, rasterize patterns into clips, arrange the playlist, and prepare your final export."
                primaryLabel="Open Studio"
                primaryTo="/music"
                chips={[
                    "Sound Designer",
                    "Oscillator Layers",
                    "Waveforms",
                    "ADSR Envelopes",
                    "Filters",
                    "Delay",
                    "Reverb",
                    "Piano Roll",
                    "Track Mixer",
                    "Playlist",
                    "WAV Export",
                    "MP3 Export",
                ]}
            />

            <Container maxWidth="xl" sx={{ pb: { xs: 6, md: 8 } }}>
                <SectionHeader
                    eyebrow="Full Production Flow"
                    title="A browser DAW built around real WebAudio synthesis."
                    description="Start by designing a sound, then sequence it, mix it, arrange it, and export it. Sounds are not fixed presets — users can create, duplicate, delete, and customize synths, drums, basses, pads, FX, and soundscapes."
                />

                <Grid container spacing={2.5}>
                    <Grid item xs={12} md={6} lg={4}>
                        <InfoCard
                            icon={<BlurOnRounded />}
                            title="Sound Designer"
                            description="Create custom synths, drums, basses, pads, FX, and soundscapes using oscillator layers, waveform selection, detune, octave, gain, noise, and mixer routing."
                        />
                    </Grid>

                    <Grid item xs={12} md={6} lg={4}>
                        <InfoCard
                            icon={<PianoRounded />}
                            title="Advanced Piano Roll"
                            description="Draw notes from C0 through C9, choose the starting note length, place consecutive notes on the same key, select notes, move notes, resize notes, duplicate notes, and delete notes manually."
                        />
                    </Grid>

                    <Grid item xs={12} md={6} lg={4}>
                        <InfoCard
                            icon={<TuneRounded />}
                            title="Track Mixer"
                            description="Route sounds and playlist clips through mixer channels with volume, pan, filters, resonance, mute, solo, and wet-effect controls."
                        />
                    </Grid>

                    <Grid item xs={12} md={6} lg={4}>
                        <InfoCard
                            icon={<WavesRounded />}
                            title="Rasterize Patterns"
                            description="Turn piano-roll patterns into playlist clips so you can arrange ideas into a full song structure."
                        />
                    </Grid>

                    <Grid item xs={12} md={6} lg={4}>
                        <InfoCard
                            icon={<AudioFileRounded />}
                            title="Audio Playlist"
                            description="Upload audio files, place clips onto playlist tracks, route clips to mixer channels, preview clips, and build the final arrangement."
                        />
                    </Grid>

                    <Grid item xs={12} md={6} lg={4}>
                        <InfoCard
                            icon={<ContentCutRounded />}
                            title="Clip Editing"
                            description="Use copy, cut, paste, duplicate, delete, move, trim-start, and trim-end controls to shape playlist clips."
                        />
                    </Grid>
                </Grid>
            </Container>

            <Container maxWidth="xl" sx={{ pb: { xs: 8, md: 10 } }}>
                <GlassCard>
                    <CardContent sx={{ p: { xs: 3, md: 5 } }}>
                        <Stack
                            direction={{ xs: "column", lg: "row" }}
                            spacing={3}
                            alignItems={{ xs: "flex-start", lg: "center" }}
                            justifyContent="space-between"
                        >
                            <Box>
                                <Typography
                                    variant="h3"
                                    sx={{
                                        fontWeight: 950,
                                        letterSpacing: "-.045em",
                                        mb: 1.5,
                                        fontSize: { xs: "2rem", md: "3rem" },
                                    }}
                                >
                                    Start with sound creation, then build the song.
                                </Typography>

                                <Typography
                                    sx={{
                                        color: "rgba(255,255,255,.66)",
                                        lineHeight: 1.8,
                                        maxWidth: 820,
                                    }}
                                >
                                    Create a new sound, design its oscillator layers, set its
                                    envelope, add filters and effects, draw notes in the piano
                                    roll, rasterize the pattern to the playlist, arrange clips,
                                    mix the tracks, and export the final audio.
                                </Typography>
                            </Box>

                            <Button
                                component={RouterLink}
                                to="/music"
                                variant="contained"
                                size="large"
                                startIcon={<GraphicEqRounded />}
                                sx={homePrimaryButtonSx}
                            >
                                Launch Studio
                            </Button>
                        </Stack>
                    </CardContent>
                </GlassCard>
            </Container>

            <Box
                component="footer"
                sx={{
                    borderTop: "1px solid rgba(255,255,255,.1)",
                    py: 4,
                }}
            >
                <Container maxWidth="xl">
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1.5}
                        justifyContent="space-between"
                        alignItems={{ xs: "flex-start", md: "center" }}
                    >
                        <Typography sx={{ color: "rgba(255,255,255,.58)" }}>
                            MusicStudioLab — WebAudio Sound Designer, Piano Roll,
                            Track Mixer, Playlist Mixer, WAV export, and MP3 export.
                        </Typography>

                        <Button
                            component={RouterLink}
                            to="/music"
                            size="small"
                            sx={{
                                color: "#9ee8ff",
                                borderRadius: 999,
                                fontWeight: 900,
                            }}
                        >
                            Open Studio
                        </Button>
                    </Stack>
                </Container>
            </Box>
        </GradientPage>
    );
}

const homePrimaryButtonSx = {
    borderRadius: 999,
    color: "#06101f",
    bgcolor: "#9ee8ff",
    fontWeight: 950,
    px: 3,
    minHeight: 48,
    boxShadow: "0 18px 45px rgba(158,232,255,.22)",
    "&:hover": {
        bgcolor: "#c7f4ff",
        boxShadow: "0 20px 55px rgba(158,232,255,.28)",
    },
};