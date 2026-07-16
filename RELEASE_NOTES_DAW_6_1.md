# MusicStudioLab DAW 6.1

## Added

- Archive samples begin with track names `Samples`, `Samples 2`, `Samples 3`, and so on.
- The original Archive sample name/filename remains visible as the source label.
- Full piano-roll range from C0 through C9.
- Root-note dropdown and scale dropdown.
- Chromatic, Major, Natural Minor, Harmonic Minor, Melodic Minor, Major Pentatonic, Minor Pentatonic, Blues, Dorian, and Mixolydian views.
- Right-click and right-drag note drawing.
- Left-click note erasing.
- Left-drag horizontal note resizing.
- Resized note length automatically becomes the next note-placement length.
- Old 32-step saved projects migrate automatically into pitched note events.
- Note-event playback uses each note's pitch and length.

## Build verification

The release passed:

```bash
npm run check
```

The command validates the requested DAW controls and completes a Vite production build.
