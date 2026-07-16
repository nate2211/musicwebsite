# MusicStudioLab DAW 6.2 release notes

## Piano-roll workflow

- Expanded the active enterprise piano roll from the former limited range to the complete C0–C9 keyboard.
- Added root-note and scale selectors directly to the piano-roll toolbar.
- Added Chromatic, Major, Natural Minor, Harmonic Minor, Melodic Minor, Major Pentatonic, Minor Pentatonic, Blues, Dorian, Phrygian, Lydian, Mixolydian, and Locrian choices.
- Added a scale-fold mode that fills the complete roll with only notes belonging to the chosen scale.
- Added an all-notes mode that keeps the full chromatic keyboard visible while highlighting scale membership.
- Right-click or right-drag empty cells to place notes.
- Left-click an existing note to erase it.
- Left-drag an existing note horizontally to resize it.
- A resized duration is inherited by the next notes placed.
- Added horizontal and vertical piano-roll zoom controls.
- Added note-count, visible-key, selected-scale, and inherited-length status readouts.

## Sampler naming

- The first newly added sampler track is named `Samples`.
- Additional sampler tracks are named `Samples 2`, `Samples 3`, and so on.
- Converting an instrument track to a sample track through the browser also receives the next available Samples name.
- Existing named drum tracks such as Kick, Snare, and Closed Hat keep their names when changing samples.

## Expanded original factory library

- Increased the bundled, procedurally generated, royalty-free WAV library from 332 to 444 assets.
- Increased source factory audio from roughly 117 MiB to approximately 154.4 MiB.
- Expanded kicks, snares, claps, hats, percussion, tuned 808s, transitions, textures, drum loops, melody loops, wavetables, and convolution impulses.
- Updated the deterministic generator, manifest, website statistics, SEO copy, documentation, and validators to match the expanded library.

## Packaging

- Version bumped to 6.2.0.
- The package continues to exclude `node_modules`, Git history, and IDE metadata.
- The distributable includes complete source, the expanded factory library, validation scripts, documentation, lockfile, and tested prerendered production output.
