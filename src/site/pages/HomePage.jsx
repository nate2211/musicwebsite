import React from "react";
import Seo from "../components/Seo";
import { Callout, FeatureCard, FaqSection, Hero, PrimaryButton, ProductPreview, SectionHeading, Stat, CheckList } from "../components/PageParts";
import SiteIcon from "../components/SiteIcon";
import { HOME_FAQS } from "../seo/metadata";

const workflow = [
  { icon: "sounds", title: "Choose or design a sound", description: "Start from original local samples or build a patch from oscillators, noise, FM, ring modulation and custom harmonics." },
  { icon: "keyboard", title: "Sequence musical ideas", description: "Program drums in the channel rack or draw melodies, chords and basslines across a full piano-roll grid." },
  { icon: "workflow", title: "Arrange a complete record", description: "Turn patterns into song sections, duplicate ideas, build drops and transitions, and shape a complete timeline." },
  { icon: "mixer", title: "Mix and automate movement", description: "Route tracks through channel effects, sends, EQ, compression, stereo tools, mastering and 64-step automation lanes." },
];

export default function HomePage() {
  return (
    <>
      <Seo path="/" />
      <Hero
        eyebrow="Browser music production workstation"
        title={<>Make hip-hop beats online. Design every sound. <span className="gradient-text">Finish the record.</span></>}
        description="MusicStudioLab combines an original factory sound library, a deep three-oscillator synthesizer, sequencing, arrangement, mixing, automation, mastering, and offline WAV rendering in one focused browser studio."
        actions={<><PrimaryButton to="/music">Launch Production Studio</PrimaryButton><PrimaryButton to="/synth-lab" secondary icon="synth">Explore Synth Lab</PrimaryButton></>}
      >
        <ProductPreview />
      </Hero>

      <section className="site-section site-section--stats">
        <div className="site-container stats-grid">
          <Stat value="332" label="Original WAV assets" description="Drums, 808s, loops, textures, transitions and impulse responses" />
          <Stat value="168" label="Factory synth patches" description="Leads, pads, keys, basses, plucks, bells, motion and experimental sounds" />
          <Stat value="7" label="Production workspaces" description="Rack, piano roll, playlist, mixer, sound design, automation and mastering" />
          <Stat value="64" label="Automation steps" description="Draw movement for levels, pan, cutoff, sends and performance macros" />
        </div>
      </section>

      <section className="site-section">
        <div className="site-container">
          <SectionHeading eyebrow="One connected workflow" title="More than a beat pad. A full song-building environment." description="Move from a blank session to a rendered master without switching tools. Every workspace shares the same project state, tracks, routing, sounds and automation." align="center" />
          <div className="feature-grid feature-grid--four">
            {workflow.map((item) => <FeatureCard key={item.title} {...item} />)}
          </div>
        </div>
      </section>

      <section className="site-section site-section--split">
        <div className="site-container split-layout">
          <div className="split-layout__copy">
            <span className="section-kicker">Enterprise sound creation</span>
            <h2>A synthesizer designed for custom hip-hop sounds.</h2>
            <p>Layer three oscillators with a dedicated sub and noise source, then add modulation, dual filters, envelopes, unison, stereo processing, macros and original user presets.</p>
            <CheckList items={[
              "Custom harmonic waveform construction",
              "FM and ring-modulation routing",
              "Dual LFOs with tempo-synced destinations",
              "Nine-voice unison, detune, drift and spread",
              "Patch randomization, mutation, import and export",
              "The same patch engine for live playback and offline rendering",
            ]} />
            <PrimaryButton to="/synth-lab" secondary icon="synth">View Synth Architecture</PrimaryButton>
          </div>
          <div className="synth-stack-visual">
            <div className="synth-stack-visual__screen">
              <span>HARMONIC MORPH</span><strong>Clouded Bell Keys</strong>
              <div className="mini-spectrum">{Array.from({ length: 38 }, (_, index) => <i key={index} style={{ height: `${14 + Math.abs(Math.sin(index * .58)) * 72}%` }} />)}</div>
            </div>
            <div className="synth-stack-visual__modules">
              {['Oscillators','Filters','Envelopes','Modulation','Voice','Effects'].map((label, index) => <div key={label}><span><SiteIcon name={index < 2 ? 'synth' : index === 5 ? 'mixer' : 'automation'} size={18} /></span><strong>{label}</strong><small>{['3 + sub + noise','Dual multimode','Amp · filter · pitch','2 LFOs · macros','Unison · glide','Chorus · delay · reverb'][index]}</small></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="site-section">
        <div className="site-container">
          <SectionHeading eyebrow="Studio modules" title="Focused workspaces for every production decision." description="The website now uses the same polished product system as the connected Lab network while the production interface remains dense, fast and purpose-built." />
          <div className="feature-grid feature-grid--three">
            <FeatureCard icon="studio" meta="Sequencing" title="Channel Rack" description="Program drums and instrument patterns with velocity, per-step playback position and track controls." to="/workflow" />
            <FeatureCard icon="keyboard" meta="Composition" title="Piano Roll" description="Draw, resize, move and preview notes across a practical keyboard range for melodies, chords and 808 slides." to="/workflow" />
            <FeatureCard icon="workflow" meta="Arrangement" title="Playlist" description="Build intros, verses, hooks, drops, bridges and transitions on a complete song timeline." to="/workflow" />
            <FeatureCard icon="mixer" meta="Processing" title="Mixer" description="Balance channels with EQ, dynamics, drive, chorus, delay, convolution reverb, sends and stereo control." to="/workflow" />
            <FeatureCard icon="automation" meta="Movement" title="Automation" description="Draw repeatable parameter changes for volume, pan, filter cutoff, effect sends and synth macros." to="/workflow" />
            <FeatureCard icon="download" meta="Delivery" title="Master & Export" description="Apply master EQ, glue compression, clipping and output ceiling before offline WAV rendering." to="/workflow" />
          </div>
        </div>
      </section>

      <FaqSection items={HOME_FAQS} />

      <Callout title="Start a new session with sounds ready to shape." description="Open the production studio, choose a factory kit or synthesizer patch, and turn the first pattern into a complete arrangement." secondary="/sounds" secondaryLabel="Browse Sound Library" />
    </>
  );
}
