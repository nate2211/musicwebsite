# MusicStudioLab Enterprise DAW 6.4 release notes

## Selected-track piano-roll rendering

- Selecting any track in the left track list now selects it and immediately opens the Piano Roll workspace.
- The piano-roll component is keyed to the selected track ID, so switching tracks remounts the editor with the correct notes and scroll position.
- Added a selected-track banner that shows the track name, track color, instrument/sampler mode, and assigned sample title.
- Added selected-track status to the bottom status bar.
- Project loading repairs stale or missing selected-track IDs automatically.

## Sampler tracks now render in the piano roll

- Removed the previous synth-only piano-roll restriction that showed an empty state for Kick, Snare, Hat, Perc, and sample tracks.
- Opening a sampler track converts its active step pattern into visible middle-C piano-roll notes without losing the original pattern data.
- Right-click drawing, left-click erasing, and left-drag resizing work on sampler tracks as well as synthesizer tracks.
- Sampler notes play chromatically across C0–C9 by changing sample playback pitch relative to middle C.
- Sampler note length now controls the scheduled sample-gate duration in realtime playback and offline WAV export.
- Editing the Channel Rack returns a sampler to step mode; opening its Piano Roll restores a visible note representation.

## Existing DAW 6.3 features retained

- Sample-derived track titles with duplicate suffixes and manual-title preservation.
- Full C0–C9 scale-fold piano roll and modal scale selector.
- 444 original factory WAV assets and 168 instrument patches.
- Vite client build, SSR build, prerendered routes, SEO validation, source generators, and production documentation.

## Packaging

- Version bumped to 6.4.0.
- Release ZIP split into sequential parts no larger than 150 MiB.
- `assemble-and-build.sh` reconstructs and verifies the ZIP, installs locked dependencies, and runs the complete validation/build pipeline.
