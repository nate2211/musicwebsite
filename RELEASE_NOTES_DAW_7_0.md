# MusicStudioLab Enterprise DAW 7.0

## Warm Digital factory voicing

The complete 240-preset factory library now passes through a non-destructive Warm Digital voicing profile. Preset IDs, names, categories, layers, and original patch architecture remain intact, while brittle or overly aggressive settings are controlled automatically.

- Saw oscillators are blended into the warmer custom `warmSaw` source where appropriate.
- Secondary square sources can use the smoother digital harmonic source.
- Excessive oscillator and spectral-layer levels are gain balanced.
- Filter cutoff is constrained by instrument category instead of leaving every patch fully open.
- Resonance is limited to musical values.
- Bit reduction is capped at 3.5% for factory presets.
- Saturation remains present but controlled.
- Noise and procedural texture beds are reduced when they would mask the instrument.
- Attacks and releases are smoothed by category, especially for keys, pads, choirs, atmospheres, and cinematic instruments.
- Warm, digital, and smooth tags are exposed in the preset browser.

## Local sample, drum, and preset uploads

- Upload multiple audio samples from the browser panel.
- Upload multiple drum files and create one named sampler track per file.
- Drag local audio files onto the browser to create tracks immediately.
- Add local audio tracks directly from the track sidebar.
- Supported browser-decodable formats include WAV, MP3, OGG, M4A, AAC, FLAC, and WebM.
- Imported audio is saved in IndexedDB rather than embedded into project JSON.
- Reloading the app restores the local sample library and reconnects project tracks by stable sample ID.
- Import JSON MusicStudioLab patches individually or in preset arrays.

## Dedicated Sample Lab

- Added a separate Sample Lab workspace beside Synth Lab.
- Decode and display the selected sample waveform.
- Display source name, duration, format, and storage source.
- Edit non-destructive trim start and end points.
- Enable a loop region with independent loop start and end controls.
- Sustained piano-roll notes repeat the selected loop region until the note ends.
- Add slice cuts by clicking the waveform.
- Drag slice handles to retime cuts without recreating the whole sample.
- Right-click a slice handle to remove it.
- Create 2, 4, 8, 12, 16, 24, or 32 even slices.
- Preview slices from responsive slice pads.
- Map slices from C4 upward.

## Rasterization and slice patterns

- Rasterize the selected trim or loop range to a new WAV file.
- Save the rendered WAV into the persistent local sample library.
- Automatically create and select a new sampler track for the rasterized result.
- Generate piano-roll slice patterns in forward, reverse, bounce, or randomized order.
- Configure slice spacing and generated note length.
- Generated patterns fill the complete current 1–16 bar piano-roll pattern.
- Realtime playback and offline WAV rendering both resolve each note's slice index.
- Slice keys play at their original sample pitch; vertical movement in the piano roll transposes relative to the assigned slice key.

## Compatibility

All DAW 6.9 functionality remains, including draggable knobs, persistent master volume, direct synth-track creation, multi-track mute and deletion, the full piano-roll editor, FL-style scale guides, automation, mixer, playlist, and offline mastering.
