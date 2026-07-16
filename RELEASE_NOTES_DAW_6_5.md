# MusicStudioLab Enterprise DAW 6.5 release notes

## Piano-roll mouse controls

- Left-clicking an empty piano-roll cell creates a note using the current velocity and inherited note length.
- Holding the left mouse button and dragging across cells paints additional notes.
- Left-dragging an existing note resizes it; the completed length becomes the default for the next notes.
- A normal left click on an existing note previews it and no longer deletes it.
- Right-clicking an existing note erases it immediately.
- Holding the right mouse button and dragging across notes erases continuously.
- Right-clicking or right-dragging over an occupied grid position also removes the note covering that position.
- The browser context menu remains suppressed only inside the piano-roll editor.

## Selected-scale ghost notes

- Added visible scale ghost notes across beat positions in every row belonging to the current selected scale.
- Ghost notes update immediately when either the root selector or scale selector changes.
- Root-note ghosts use a brighter solid treatment; the remaining scale tones use a softer dashed treatment.
- The keyboard labels identify the scale root and the other active scale tones.
- The summary bar lists the exact tones in the selected scale, such as `C · D# · F · G · G#` for C minor.
- Ghost notes remain useful in **All notes** mode by distinguishing in-scale rows from chromatic out-of-scale rows.
- A new **Scale ghosts** control can hide the visual guides without changing the selected scale or fold mode.
- The rendered piano grid exposes the active root and scale as data attributes for validation and UI testing.

## Existing features retained

- Automatic piano-roll mounting whenever any sampler or synth track is selected.
- C0–C9 editing, root/scale selection, scale folding, horizontal/vertical zoom, and inherited note duration.
- Sampler pattern migration, chromatic sample playback, note-length scheduling, and offline WAV rendering.
- Sample-derived track names, duplicate suffixes, manual-title preservation, and one-click sample-track creation.
- 444 original factory WAV assets, 168 instrument patches, production `dist`, SSR/prerender output, and SEO validation.

## Packaging

- Version bumped to 6.5.0.
- Release archive split into sequential parts no larger than 150 MiB.
- `assemble-and-build-6.5.sh` reconstructs the archive, verifies all checksums, installs locked dependencies, and runs the complete validation/build pipeline.
