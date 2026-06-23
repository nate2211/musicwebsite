import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Box, Button, CardContent, Container, Grid, Stack, Typography } from "@mui/material";
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
    primaryPillSx,
} from "../components/components";

export default function Home() {
    return (
        <GradientPage>
            <AppNavBar />

            <PageHero
                eyebrow="WebAudio Sound Design DAW"
                title="Design sounds, sequence patterns, mix tracks, arrange songs, and export audio."
                description="AudioMaster Studio now includes a real WebAudio sound designer. Create new oscillator sounds, delete sounds, layer waveforms, shape ADSR envelopes, build soundscapes, add filters, delay, reverb, gain, route sounds into mixer inserts, sequence patterns, rasterize to the playlist, and export WAV or MP3."
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
                    "Pattern Mixer",
                    "Track Mixer",
                    "Playlist Export",
                ]}
            />

            <Container maxWidth="xl" sx={{ pb: 8 }}>
                <SectionHeader
                    eyebrow="Full Production Flow"
                    title="A browser DAW built around real WebAudio synthesis."
                    description="This version adds a sound design engine before the pattern and playlist system. Sounds are no longer fixed rows — users can create, duplicate, delete, and customize them."
                />

                <Grid container spacing={2.5}>
                    <Grid item xs={12} md={6} lg={4}>
                        <InfoCard
                            icon={<BlurOnRounded />}
                            title="Sound Designer"
                            description="Create custom synths, drums, basses, pads, FX, and soundscapes using oscillator layers, detune, octave, gain, noise, and routing."
                        />
                    </Grid>

                    <Grid item xs={12} md={6} lg={4}>
                        <InfoCard
                            icon={<PianoRounded />}
                            title="Pattern Mixer"
                            description="Every created sound becomes a pattern row so users can sequence melodies, drum hits, basslines, pads, and FX sweeps."
                        />
                    </Grid>

                    <Grid item xs={12} md={6} lg={4}>
                        <InfoCard
                            icon={<TuneRounded />}
                            title="Track Mixer"
                            description="Route sounds and playlist tracks through mixer inserts with volume, pan, filters, resonance, mute, solo, and FX wet mix."
                        />
                    </Grid>

                    <Grid item xs={12} md={6} lg={4}>
                        <InfoCard
                            icon={<WavesRounded />}
                            title="Rasterize Patterns"
                            description="Turn live patterns into rendered audio clips that can be arranged, copied, cut, trimmed, and exported."
                        />
                    </Grid>

                    <Grid item xs={12} md={6} lg={4}>
                        <InfoCard
                            icon={<AudioFileRounded />}
                            title="Audio Playlist"
                            description="Upload audio, place clips into playlist tracks, route clips to mixer inserts, and build the full song arrangement."
                        />
                    </Grid>

                    <Grid item xs={12} md={6} lg={4}>
                        <InfoCard
                            icon={<ContentCutRounded />}
                            title="Clip Editing"
                            description="Use copy, cut, paste, duplicate, delete, move, and trim controls on playlist clips."
                        />
                    </Grid>
                </Grid>
            </Container>

            <Container maxWidth="xl" sx={{ pb: 10 }}>
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
                                    Create a new sound, design its oscillator layers, set its envelope,
                                    add filters and FX, sequence it in the pattern mixer, rasterize it
                                    to the playlist, and export the final song.
                                </Typography>
                            </Box>

                            <Button
                                component={RouterLink}
                                to="/music"
                                variant="contained"
                                size="large"
                                startIcon={<GraphicEqRounded />}
                                sx={primaryPillSx}
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
                    <Typography sx={{ color: "rgba(255,255,255,.58)" }}>
                        AudioMaster Studio — WebAudio Sound Designer, Pattern Mixer, Track Mixer,
                        Playlist Mixer, WAV export, and MP3 export.
                    </Typography>
                </Container>
            </Box>
        </GradientPage>
    );
}