# MusicStudioLab Enterprise DAW 6.8 release notes

## Synthesizers in the track list

- Added an **Add synthesizer** preset selector directly above the project track list.
- Every factory or user patch can be created as an independent synth track.
- Presets can also be added with the **＋** control in the preset browser.
- New synth tracks inherit the selected preset name, category color, patch ID, piano-roll selection, and a playable arrangement clip.
- Duplicate preset names receive safe numbered suffixes without overwriting existing track names.
- Synth and sampler tracks display clear `SYN` and `SMP` engine badges.

## Multi-track selection and mute workflow

- Added a dedicated selection checkbox to every track.
- Added **Select all** and **Clear selection** commands.
- Added **Mute selected tracks** and **Unmute selected tracks**.
- Added **Mute all tracks** and **Unmute all tracks**.
- Individual Mute and Solo controls remain available on every track.
- The track-list header displays total, selected, and muted track counts.
- Track selection is saved with the project and repaired safely when imported tracks are missing.

## Track-management dropdown

The new **Manage tracks…** dropdown includes:

- Select all tracks
- Clear selection
- Mute selected tracks
- Unmute selected tracks
- Mute all tracks
- Unmute all tracks
- Delete selected tracks
- Delete all tracks

Bulk deletion removes associated playlist clips and automation lanes, then repairs the active track and piano-roll selection. Destructive commands include a confirmation step in the UI.

## Expanded layered synthesizer engine

- Increased the original factory patch bank from 168 to **240 editable presets**.
- Expanded the bank from 14 to **20 instrument categories**.
- Added Atmosphere, Cinematic, Hybrid, Choir, World, and Motion categories.
- Added two independent spectral layers to the existing three-oscillator, sub, and noise architecture.
- Added per-layer waveform, octave, semitone, fine tuning, gain, pan, unison, detune, stereo spread, onset delay, and motion controls.
- Added a procedural stereo texture bed with independent level, filtering, motion, and source character.
- Added original cinematic, choir, bowed, glass, air, shimmer, formant, and spectral harmonic sources.
- Added a dedicated **Layer Engine** page in Synth Lab for editing the new sources.
- Updated mutation, randomization, interpolation, preset import/export, realtime playback, and offline rendering to understand layered patches.
- All factory patches remain original, locally editable starting points rather than copies of third-party preset content.

## Existing DAW features retained

- Selected-track C0–C9 piano roll
- Left-click drawing and right-click erasing
- Note edge stretching and center movement
- Marquee and multi-note transforms
- FL-style selected-scale highlighting and ghost notes
- One-to-sixteen-bar piano-roll patterns
- Whole-roll fills, flip, reflect, translate, and scale tools
- Sampler, playlist, mixer, automation, mastering, MIDI preview, local autosave, portable projects, and offline WAV rendering

## Validation

DAW 6.8 passed factory-content validation, reducer-level track-management tests, rendered UI checks, layered-preset checks, realtime-engine checks, Vite client build, SSR build, prerendering for 11 indexable routes plus `404.html`, and SEO validation.
