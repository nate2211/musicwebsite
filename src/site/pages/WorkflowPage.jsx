import React from "react";
import Seo from "../components/Seo";
import { Callout, PageIntro } from "../components/PageParts";
import SiteIcon from "../components/SiteIcon";

const steps = [
  { number: "01", icon: "sounds", title: "Set the palette", copy: "Choose a kit, assign tuned drums and 808s, or load a synthesizer patch. Keep the initial selection small enough that each sound has a clear role.", tips: ["Preview before assigning", "Tune the 808 to the project key", "Save a custom synth variation"] },
  { number: "02", icon: "studio", title: "Build the core pattern", copy: "Program the kick, snare, clap, hats and percussion in the channel rack. Use velocity and swing to create movement before adding more layers.", tips: ["Start with four or eight bars", "Leave space for the vocal", "Use contrast between hat patterns"] },
  { number: "03", icon: "keyboard", title: "Compose melody and bass", copy: "Open the piano roll for chords, melody, counter melody and bass movement. Preview notes against the drum pattern and keep register separation clear.", tips: ["Use note length for articulation", "Layer only where the hook needs impact", "Check bass notes against the kick"] },
  { number: "04", icon: "workflow", title: "Arrange song sections", copy: "Move patterns into the playlist, create intros, verses, hooks, drops and bridges, then add transition effects and controlled variation.", tips: ["Remove elements to create energy", "Use automation before adding clutter", "Mark major sections clearly"] },
  { number: "05", icon: "mixer", title: "Mix for clarity and impact", copy: "Set track levels first, then use filters, EQ, compression, saturation, stereo width and sends only where they solve a clear problem.", tips: ["Gain stage before processing", "Keep sub information centered", "Reference at lower listening levels"] },
  { number: "06", icon: "automation", title: "Automate movement", copy: "Draw changes for channel level, pan, cutoff, delay, reverb and Synth Lab macros to make sections evolve without adding unnecessary tracks.", tips: ["Use small changes first", "Automate transitions into hooks", "Check loop boundaries"] },
  { number: "07", icon: "download", title: "Master and render", copy: "Apply gentle master EQ, glue compression, clipping and a safe output ceiling. Render the same project engine to a WAV file for review or continued work.", tips: ["Avoid over-compression", "Leave headroom before the master", "Compare exported and live playback"] },
];

export default function WorkflowPage() {
  return (
    <>
      <Seo path="/workflow" />
      <PageIntro eyebrow="Production guide" title="A practical path from the first sound to the final WAV." description="The workstation is organized around a repeatable production flow. Each step has a focused workspace, but the project remains connected so you can move backward and refine decisions at any time." />
      <section className="site-section site-section--tight">
        <div className="site-container workflow-timeline">
          {steps.map((step) => (
            <article className="workflow-step" key={step.number}>
              <div className="workflow-step__number">{step.number}</div>
              <div className="workflow-step__icon"><SiteIcon name={step.icon} size={24} /></div>
              <div className="workflow-step__copy"><h2>{step.title}</h2><p>{step.copy}</p></div>
              <ul>{step.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul>
            </article>
          ))}
        </div>
      </section>
      <Callout title="Use the workflow inside one connected production session." description="Create a project, save it locally, reopen it later, export a portable project file, and render the finished arrangement as WAV audio." />
    </>
  );
}
