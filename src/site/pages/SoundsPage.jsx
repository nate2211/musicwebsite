import React from "react";
import Seo from "../components/Seo";
import { Callout, FeatureCard, PageIntro, SectionHeading } from "../components/PageParts";

const sampleGroups = [
  { icon: "sounds", title: "Tuned 808 collection", meta: "36 WAV files", description: "Key-labeled sub basses with varied decay, harmonics and body for trap, drill, melodic rap and modern hip-hop." },
  { icon: "studio", title: "Drum one-shots", meta: "132 WAV files", description: "Original kicks, claps, snares, closed hats, open hats and percussion with multiple envelopes and tonal characters." },
  { icon: "workflow", title: "Rhythm and melody loops", meta: "56 WAV files", description: "Song-starting rhythmic and melodic material designed to be layered, chopped, processed and rearranged." },
  { icon: "automation", title: "Textures and transitions", meta: "48 WAV files", description: "Atmospheres, noise beds, impacts, risers, sweeps and transition material for depth and arrangement movement." },
  { icon: "synth", title: "Wavetables and impulses", meta: "60 WAV files", description: "Source waveforms for synthesis experiments and impulse responses for browser convolution reverb spaces." },
  { icon: "keyboard", title: "Instrument patches", meta: "168 presets", description: "Original bass, lead, keys, pluck, pad, bell, vocal, motion and experimental synthesizer starting points." },
];

export default function SoundsPage() {
  return (
    <>
      <Seo path="/sounds" />
      <PageIntro eyebrow="Original factory content" title="A production library made to be edited, layered and transformed." description="The project includes local sounds and instrument patches so a new session starts with practical material immediately. The content is designed as a foundation for original production—not a locked loop player." />
      <section className="site-section site-section--tight">
        <div className="site-container">
          <div className="sound-summary-card">
            <div><span>Factory WAV assets</span><strong>332</strong><small>Approximately 116.6 MiB of local source audio</small></div>
            <div><span>Editable synth patches</span><strong>168</strong><small>Fourteen categories with full parameter access</small></div>
            <div><span>Offline ready</span><strong>100%</strong><small>Bundled under public/sounds for local playback</small></div>
          </div>
        </div>
      </section>
      <section className="site-section">
        <div className="site-container">
          <SectionHeading eyebrow="Library categories" title="Purpose-built material for modern beat production." description="Use the browser panel to preview sounds, assign samples to tracks, apply kits, load synthesizer presets and keep working without leaving the session." />
          <div className="feature-grid feature-grid--three">{sampleGroups.map((group) => <FeatureCard key={group.title} {...group} />)}</div>
        </div>
      </section>
      <section className="site-section site-section--dark-panel">
        <div className="site-container">
          <SectionHeading eyebrow="Sound browser" title="Search, filter, preview and assign sounds directly to the selected track." description="The library is organized for fast production decisions. Factory samples remain separate from instrument presets, and custom user patches are stored alongside the project." align="center" />
          <div className="library-browser-demo">
            <div className="library-browser-demo__sidebar">
              {['All sounds','808','Kicks','Snares','Claps','Closed hats','Open hats','Loops','Textures','Transitions'].map((name,index) => <button key={name} className={index === 1 ? 'is-active' : ''}>{name}<span>{[332,36,24,20,20,24,16,56,24,24][index]}</span></button>)}
            </div>
            <div className="library-browser-demo__results">
              <div className="library-search">Search factory content <span>⌘ K</span></div>
              {['808_01_C.wav','808_02_C#.wav','808_03_D.wav','808_04_D#.wav','808_05_E.wav','808_06_F.wav','808_07_F#.wav','808_08_G.wav'].map((name,index) => <div key={name} className={index === 3 ? 'is-selected' : ''}><button aria-label={`Preview ${name}`}>▶</button><span><strong>{name}</strong><small>Tuned 808 · Original WAV</small></span><em>{['1.20','1.32','1.44','1.56','1.68','1.80','1.92','1.20'][index]}s</em><button>Assign</button></div>)}
            </div>
          </div>
        </div>
      </section>
      <Callout title="Turn a factory sound into your own instrument." description="Assign a sample, tune it, shape its envelope, route it through the mixer, automate effects, or layer it with a custom synthesizer patch." primary="/music" primaryLabel="Open Sound Browser" secondary="/synth-lab" secondaryLabel="Design a Synth Patch" />
    </>
  );
}
