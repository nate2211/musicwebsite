# MusicStudioLab Enterprise DAW 6.3 release notes

## Sample-derived track titles

- New sample tracks now use the selected sample's real display name instead of `Samples`, `Samples 2`, and similar placeholders.
- Added a dedicated **＋** button beside every factory sample to create a new track with that sample already assigned.
- The browser footer's **+ Sample track** action creates a track from the first visible sample and uses its title.
- Automatically named sample tracks follow the sample title when another sample is assigned.
- Duplicate sample titles receive `(2)`, `(3)`, and later suffixes to keep track titles unique.
- Manually edited track titles are marked as user-owned and are not overwritten by later sample changes.
- Existing named drum tracks such as Kick, Snare, Closed Hat, and Perc keep their names when samples are replaced.

## Piano-roll workflow retained

- Full C0–C9 piano roll.
- Root-note and scale selectors with chromatic and modal scale choices.
- Scale-fold and all-notes modes.
- Right-click/right-drag note painting.
- Left-click erase and left-drag note resizing.
- Inherited note duration and horizontal/vertical zoom.

## Factory content retained

- 444 original, procedurally generated WAV assets.
- Approximately 154.4 MiB of source factory audio.
- 168 original synthesizer patches across 14 categories.
- Complete client build, SSR build, prerendered routes, documentation, generators, and validation scripts.

## Split release packaging

- Version bumped to 6.3.0.
- The release ZIP is split into sequential parts no larger than 150 MiB.
- `assemble-and-build.sh` reconstructs the archive, verifies SHA-256, extracts it, runs `npm ci`, and executes `npm run check`.
- `node_modules`, Git history, IDE metadata, and temporary files remain excluded.
