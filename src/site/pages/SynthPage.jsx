import React from "react";
import Seo from "../components/Seo";
import { Callout, CheckList, FeatureCard, Hero, PrimaryButton, SectionHeading, WaveVisual } from "../components/PageParts";

const modules = [
  { icon: "synth", title: "Three main oscillators", description: "Blend sine, triangle, saw, square and custom harmonic waveforms with octave, semitone, fine tune, phase, level and pan." },
  { icon: "sounds", title: "Sub and colored noise", description: "Add a dedicated sub layer plus white, pink, brown or blue noise for weight, air, attack, percussion and texture." },
  { icon: "automation", title: "FM and ring modulation", description: "Build metallic bells, aggressive basses, digital plucks and unstable motion with controllable oscillator interaction." },
  { icon: "mixer", title: "Dual filter architecture", description: "Route multimode filters in serial or parallel with cutoff, resonance, drive, key tracking and envelope depth." },
  { icon: "workflow", title: "Deep modulation", description: "Use amp, filter and pitch envelopes, two syncable LFOs, velocity response, macros and performance controls." },
  { icon: "studio", title: "Voice and stereo engine", description: "Shape mono or polyphonic voices with glide, legato, unison, detune, analog drift and stereo spread." },
];

export default function SynthPage() {
  return (
    <>
      <Seo path="/synth-lab" />
      <Hero eyebrow="Advanced synthesizer and patch design" title={<>Create custom sounds from <span className="gradient-text">waveform to master.</span></>} description="The Synth Lab is a full instrument-design environment for basses, leads, pads, bells, keys, plucks, textures and experimental sounds. Every control is connected to live playback and offline project rendering." actions={<><PrimaryButton to="/music?view=sound" icon="synth">Open Synth Lab Workspace</PrimaryButton><PrimaryButton to="/sounds" secondary icon="sounds">Browse 168 Patches</PrimaryButton></>}>
        <WaveVisual />
      </Hero>
      <section className="site-section site-section--stats">
        <div className="site-container synth-spec-row">
          {['3 oscillators','4 noise colors','2 multimode filters','3 envelopes','2 tempo LFOs','4 performance macros','9-voice unison','168 factory patches'].map((item) => <span key={item}>{item}</span>)}
        </div>
      </section>
      <section className="site-section">
        <div className="site-container">
          <SectionHeading eyebrow="Signal architecture" title="A complete instrument engine instead of a preset-only player." description="Start from an initialized patch, mutate an existing sound, randomize a new direction, or import a user patch. The editor exposes the controls needed to create distinct sounds rather than only browse them." align="center" />
          <div className="feature-grid feature-grid--three">{modules.map((item) => <FeatureCard key={item.title} {...item} />)}</div>
        </div>
      </section>
      <section className="site-section site-section--split">
        <div className="site-container split-layout split-layout--reverse">
          <div className="patch-browser-visual">
            <div className="patch-browser-visual__header"><strong>Factory Patch Browser</strong><span>168 original instruments</span></div>
            <div className="patch-browser-visual__filters"><span className="is-active">All</span><span>Bass</span><span>Lead</span><span>Keys</span><span>Pad</span><span>Pluck</span></div>
            <div className="patch-browser-visual__grid">{['Night Shift 808','Chrome Bell','Velvet Keys','Airline Pad','Neon Glass Lead','Dust Pluck','Wide Choir','Motion Texture'].map((name, index) => <div key={name} className={index === 4 ? 'is-selected' : ''}><span>{['Bass','Bell','Keys','Pad','Lead','Pluck','Vocal','Texture'][index]}</span><strong>{name}</strong><small>{['Sub · Drive · Mono','FM · Metallic','Warm · Wide','Slow · Evolving','Bright · Unison','Short · Digital','Formant · Space','Motion · Noise'][index]}</small></div>)}</div>
          </div>
          <div className="split-layout__copy">
            <span className="section-kicker">Patch workflow</span>
            <h2>Build, audition, mutate, save and move on without losing flow.</h2>
            <p>Patch management is built into the instrument. Create variations, keep custom banks inside the project, and move sounds between sessions with JSON import and export.</p>
            <CheckList items={[
              "Initialize a clean patch for sound design",
              "Randomize or mutate controlled parameter ranges",
              "Save custom project presets with unique names",
              "Import and export portable patch files",
              "Preview from an on-screen keyboard or MIDI controller",
              "Automate macro movement from the arrangement",
            ]} />
          </div>
        </div>
      </section>
      <Callout eyebrow="Design your signature sound" title="Open the Synth Lab and create a patch that belongs to your production." description="Start with a blank instrument, build the waveform, shape movement, add space, save the preset, and sequence it immediately." primary="/music?view=sound" primaryLabel="Launch Synth Lab" secondary="/help#synth" secondaryLabel="Read Synth Guide" />
    </>
  );
}
