import React from "react";
import Seo from "../components/Seo";
import { Callout, CheckList, FeatureCard, PageIntro, SectionHeading } from "../components/PageParts";

const workspaces = [
  { icon: "studio", title: "Channel Rack", description: "Program kick, snare, clap, hat, percussion, 808 and instrument patterns on a fast step sequencer." },
  { icon: "keyboard", title: "Piano Roll", description: "Draw notes, chords, melodies, basslines, velocities and note lengths on a pitched editing grid." },
  { icon: "workflow", title: "Playlist", description: "Arrange patterns into intros, verses, hooks, drops, bridges and complete song structures." },
  { icon: "mixer", title: "Mixer", description: "Balance tracks and shape them with filters, EQ, compression, saturation, chorus, delay and reverb." },
  { icon: "automation", title: "Automation", description: "Draw 64-step movement for volume, pan, cutoff, sends and four Synth Lab performance macros." },
  { icon: "download", title: "Master & Export", description: "Use master EQ, glue compression, clipping and a safe ceiling before rendering the arrangement to WAV." },
];

export default function StudioLandingPage() {
  return (
    <>
      <Seo path="/music" />
      <PageIntro
        eyebrow="Free browser DAW"
        title="Make hip-hop, trap and drill beats in a complete online music studio."
        description="MusicStudioLab connects drum sequencing, piano-roll composition, playlist arrangement, sound design, mixing, automation, mastering and offline WAV export in one browser project."
      />
      <section className="site-section site-section--tight">
        <div className="site-container">
          <SectionHeading
            eyebrow="Production workspaces"
            title="Move from the first drum pattern to a finished WAV without leaving the session."
            description="Every workspace edits the same tracks, patterns, instruments, routing and automation, so changes remain connected throughout the production process."
          />
          <div className="feature-grid feature-grid--three">
            {workspaces.map((item) => <FeatureCard key={item.title} {...item} />)}
          </div>
        </div>
      </section>
      <section className="site-section site-section--split">
        <div className="site-container split-layout">
          <div className="split-layout__copy">
            <span className="section-kicker">Built for modern beat production</span>
            <h2>Sequence drums quickly, then keep full control over the sound.</h2>
            <p>Start with 444 original WAV assets and 240 editable layered synthesizer patches, or initialize a clean instrument and design a new sound from oscillators, filters, envelopes, modulation and effects.</p>
            <CheckList items={[
              "Tuned 808s and original drum one-shots",
              "Three oscillators, sub, noise, FM and ring modulation",
              "Pattern sequencing and pitched note editing",
              "Track inserts, sends and master processing",
              "Local project saves and portable project files",
              "Offline WAV rendering with automation applied",
            ]} />
          </div>
          <div className="content-panel">
            <h2>Browser requirements</h2>
            <p>Use a current desktop browser with JavaScript and Web Audio enabled. Audio begins after a user action. MIDI note input depends on browser and device support.</p>
            <p>Large projects and offline renders require enough device memory. Save portable project files before clearing browser data or moving to another device.</p>
          </div>
        </div>
      </section>
      <Callout
        eyebrow="Open the workstation"
        title="Start a new beat with the full production interface."
        description="The interactive studio loads after this search-friendly overview and keeps all production tools inside the browser."
        primary="/music?launch=1"
        primaryLabel="Launch Music Studio"
        secondary="/workflow"
        secondaryLabel="Read the Workflow"
      />
    </>
  );
}
