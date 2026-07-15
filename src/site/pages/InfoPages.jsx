import React from "react";
import Seo from "../components/Seo";
import { Callout, ContentPanel, FaqSection, PageIntro } from "../components/PageParts";
import { HELP_FAQS } from "../seo/metadata";

function ArticlePage({ seoTitle, path, eyebrow, title, description, children, callout }) {
  return (
    <>
      <Seo path={path} />
      <PageIntro eyebrow={eyebrow} title={title} description={description} />
      <section className="site-section site-section--tight">
        <div className="site-container article-layout">{children}</div>
      </section>
      {callout}
    </>
  );
}

export function HelpPage() {
  return (
    <ArticlePage seoTitle="Help Center" path="/help" eyebrow="Help center" title="Learn the studio without losing production flow." description="Use these guides to start audio, create a project, work with sounds and synthesizers, sequence patterns, arrange songs, mix, automate, save and export.">
      <aside className="article-nav">
        {[
          ["getting-started", "Getting started"], ["browser", "Browser and audio"], ["sequencing", "Sequencing"], ["synth", "Synth Lab"], ["mixer", "Mixer and effects"], ["projects", "Projects and export"], ["troubleshooting", "Troubleshooting"],
        ].map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
      </aside>
      <div className="article-content">
        <ContentPanel id="getting-started" title="Getting started">
          <p>Open the Studio and allow the browser to create an audio context when you press play or preview a sound. Choose a factory sample or instrument patch, select a track, and begin with the Channel Rack or Piano Roll.</p>
          <ol><li>Set the project BPM and swing.</li><li>Choose a factory kit, sample, or synthesizer preset.</li><li>Program a short pattern and press Space to play or pause.</li><li>Move to the Playlist to build song sections.</li><li>Use the Mixer and Automation workspaces before rendering.</li></ol>
        </ContentPanel>
        <ContentPanel id="browser" title="Browser and audio permissions">
          <p>Modern browsers usually require a user gesture before audio can start. Press a preview or transport button once to initialize playback. Keep the tab active during large offline renders and avoid private-browsing modes when you want projects to remain in local storage.</p>
          <div className="notice-card"><strong>Recommended environment</strong><p>Use a current Chromium, Firefox, or Safari release with Web Audio enabled. MIDI input depends on browser support and device permission.</p></div>
        </ContentPanel>
        <ContentPanel id="sequencing" title="Channel Rack, Piano Roll and Playlist">
          <p>The Channel Rack is best for fast step patterns. The Piano Roll is best for pitched material, sustained notes, chord voicings and detailed rhythm. The Playlist is where patterns become complete sections and arrangements.</p>
          <ul><li>Use track velocity and mixer gain as separate controls.</li><li>Preview notes before drawing a full melodic phrase.</li><li>Duplicate patterns, then edit the duplicate to create variation.</li><li>Leave arrangement space for intros, vocal sections, breaks and transitions.</li></ul>
        </ContentPanel>
        <ContentPanel id="synth" title="Synth Lab">
          <p>Select a synthesizer track, open Sound Design, and choose a factory patch or initialize a clean instrument. Build the oscillator balance first, then shape envelopes and filters before adding modulation or effects.</p>
          <ul><li>Keep the sub oscillator mono and controlled for bass patches.</li><li>Use FM amounts carefully because small changes can create large tonal differences.</li><li>Assign macro controls to musical changes you want to automate.</li><li>Save custom presets before making destructive randomization changes.</li></ul>
        </ContentPanel>
        <ContentPanel id="mixer" title="Mixer, effects and automation">
          <p>Balance volume and pan before processing. Use filters and EQ to create space, compression for controlled dynamics, saturation for harmonics, and time effects through sends when several tracks should share the same space.</p>
          <p>The Automation workspace can control channel volume, pan, cutoff, delay send, reverb send and four Synth Lab macros over a 64-step lane.</p>
        </ContentPanel>
        <ContentPanel id="projects" title="Projects, local storage and export">
          <p>Projects save to browser storage and can also be exported as portable project files. Audio assets remain referenced from the bundled factory library. Use Export WAV to render the arrangement with the same synthesis, routing, automation and mastering path used during playback.</p>
        </ContentPanel>
        <ContentPanel id="troubleshooting" title="Troubleshooting">
          <h3>No audio</h3><p>Press a preview or play button, confirm the tab is not muted, and check the operating-system output device.</p>
          <h3>Factory library did not load</h3><p>Run the app through the Vite development server or a deployed web server. Opening index.html directly from the file system prevents fetch requests from loading the manifest correctly.</p>
          <h3>npm install fails</h3><p>Use the included public-registry lockfile and Windows clean-install script. Close active Node processes if Windows reports that files under node_modules are locked.</p>
          <h3>Render fails</h3><p>Reduce the project length, close memory-heavy tabs, and try again in a current desktop browser.</p>
        </ContentPanel>
        <FaqSection items={HELP_FAQS} title="MusicStudioLab troubleshooting questions" eyebrow="Quick troubleshooting" />
      </div>
    </ArticlePage>
  );
}

export function AboutPage() {
  return (
    <ArticlePage seoTitle="About MusicStudioLab" path="/about" eyebrow="About the product" title="A browser-first studio for original sound and music creation." description="MusicStudioLab is built to make deep sound design and structured beat production available in a focused web application without hiding the controls that shape the result." callout={<Callout title="Explore the complete studio instead of reading a feature list." description="Open a project, audition the original factory library, load a patch, program a pattern and hear the connected workflow directly." />}>
      <div className="article-content article-content--wide">
        <ContentPanel title="Why MusicStudioLab exists"><p>Many browser music tools are either minimal toys or fixed loop players. MusicStudioLab takes a different direction: expose a real signal path, meaningful instrument parameters, sequencer workspaces, routing, automation, mastering and export while keeping the interface understandable.</p></ContentPanel>
        <div className="value-grid">
          <div><strong>Browser-first</strong><p>The studio uses Web Audio for playback, synthesis, effects and offline rendering.</p></div>
          <div><strong>Original content</strong><p>The bundled factory sounds and presets are intended as editable starting points for new work.</p></div>
          <div><strong>Project-focused</strong><p>Sequencing, arrangement, mixing, automation and mastering share one project model.</p></div>
          <div><strong>Transparent controls</strong><p>The interface exposes the parameters that change the sound instead of hiding them behind one-button presets.</p></div>
        </div>
        <ContentPanel title="Connected Lab network"><p>MusicStudioLab is part of a browser-tool family that also includes AudioMasterLab for audio editing, ImageMasterLab for image workflows, and SuiteOfficeLab for office and file utilities. The shared dark visual system and straightforward navigation make the products feel related while each tool remains specialized.</p></ContentPanel>
        <ContentPanel title="Responsible use"><p>Use the application with audio you created, recorded, licensed, received permission to use, or that is otherwise lawful for your intended workflow. Users remain responsible for the rights associated with imported media and exported projects.</p></ContentPanel>
      </div>
    </ArticlePage>
  );
}

export function ContactPage() {
  const [sent, setSent] = React.useState(false);
  return (
    <ArticlePage seoTitle="Contact & Support" path="/contact" eyebrow="Contact and support" title="Send product feedback, report a bug, or ask a policy question." description="Contact MusicStudioLab about browser compatibility, accessibility, project behavior, factory content, privacy, copyright, or general product feedback.">
      <div className="contact-grid">
        <div className="contact-details">
          <ContentPanel title="Support topics"><ul><li>Audio playback or export problems</li><li>Browser and MIDI compatibility</li><li>Project saving or importing</li><li>Accessibility feedback</li><li>Privacy or copyright questions</li><li>General feature feedback</li></ul></ContentPanel>
          <div className="contact-direct"><strong>Direct email</strong><a href="mailto:support@musicstudiolab.com">support@musicstudiolab.com</a><small>Include your browser, operating system, and the steps that reproduce a technical issue.</small></div>
        </div>
        <form className="contact-form" onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          const subject = encodeURIComponent(`[MusicStudioLab ${data.get("topic")}] Support request from ${data.get("name")}`);
          const body = encodeURIComponent(`Name: ${data.get("name")}\nEmail: ${data.get("email")}\nTopic: ${data.get("topic")}\n\n${data.get("message")}`);
          setSent(true);
          window.location.href = `mailto:support@musicstudiolab.com?subject=${subject}&body=${body}`;
        }}>
          <label><span>Name</span><input required name="name" autoComplete="name" placeholder="Your name" /></label>
          <label><span>Email</span><input required name="email" type="email" autoComplete="email" placeholder="you@example.com" /></label>
          <label><span>Topic</span><select name="topic"><option>Technical support</option><option>Product feedback</option><option>Accessibility</option><option>Privacy</option><option>Copyright</option><option>Other</option></select></label>
          <label><span>Message</span><textarea required name="message" rows="8" placeholder="Describe the question or issue in detail." /></label>
          <button className="button button--primary" type="submit">Prepare support request</button>
          {sent && <p className="form-success">Your email application should open with the support request prepared. Send it to complete the request.</p>}
        </form>
      </div>
    </ArticlePage>
  );
}

export function PrivacyPage() {
  return (
    <ArticlePage seoTitle="Privacy Policy" path="/privacy" eyebrow="Privacy policy" title="How browser data and project information are handled." description="This policy explains local project storage, browser audio processing, imported files, analytics, advertising, third-party links and user choices in MusicStudioLab.">
      <div className="article-content article-content--wide legal-copy">
        <p className="policy-date">Effective date: July 15, 2026</p>
        <ContentPanel title="Browser processing"><p>MusicStudioLab is designed to perform core synthesis, sequencing, effects and compatible audio rendering in the browser. Imported files and generated project data are processed locally for these workflows unless a clearly identified external service is used.</p></ContentPanel>
        <ContentPanel title="Local storage"><p>The application may use browser local storage to save project state, custom synthesizer presets, interface preferences and recent project information. This information remains associated with the browser profile until the user clears site data or removes saved projects.</p></ContentPanel>
        <ContentPanel title="Imported audio"><p>Audio files selected by the user are accessed to provide preview, sequencing, processing and export functions. Users should not import confidential material on shared devices and should confirm they have permission to process the selected media.</p></ContentPanel>
        <ContentPanel title="Analytics and advertising"><p>A deployed version may use analytics or advertising services. Those providers may use cookies, local identifiers or similar technologies subject to their own policies and available consent controls. The application should present disclosures and consent controls when required.</p></ContentPanel>
        <ContentPanel title="Third-party links"><p>The website links to other Lab products and external resources. Visiting those websites is governed by their own privacy practices.</p></ContentPanel>
        <ContentPanel title="User choices"><ul><li>Clear saved projects from the project dialog.</li><li>Clear MusicStudioLab site data in browser settings.</li><li>Block microphone, MIDI or storage permissions in browser settings.</li><li>Use the contact page for privacy questions.</li></ul></ContentPanel>
        <ContentPanel title="Policy changes"><p>This policy may be updated as the product, hosting, analytics, advertising or support workflows change. The effective date should be revised when material changes are published.</p></ContentPanel>
      </div>
    </ArticlePage>
  );
}

export function TermsPage() {
  return (
    <ArticlePage seoTitle="Terms of Use" path="/terms" eyebrow="Terms of use" title="Rules for using MusicStudioLab and its browser tools." description="These terms cover acceptable use, user content, intellectual property, availability, exports, third-party services, disclaimers and limitations for MusicStudioLab.">
      <div className="article-content article-content--wide legal-copy">
        <p className="policy-date">Effective date: July 15, 2026</p>
        <ContentPanel title="Acceptance"><p>By using MusicStudioLab, you agree to use the site and software lawfully and in accordance with these terms. Do not use the application where doing so would violate applicable law, contractual restrictions or third-party rights.</p></ContentPanel>
        <ContentPanel title="User content and rights"><p>You are responsible for audio, project files, names, text and other material you import or create. You must have the rights or permission needed for your intended processing, distribution and commercial use.</p></ContentPanel>
        <ContentPanel title="Acceptable use"><ul><li>Do not use the service to infringe copyright or other rights.</li><li>Do not attempt to disrupt, overload, probe or compromise the site.</li><li>Do not misrepresent ownership of factory content or third-party media.</li><li>Do not rely on the service as the only copy of important project data.</li></ul></ContentPanel>
        <ContentPanel title="Factory content"><p>Bundled original sounds and presets are provided for use inside music and sound-design projects, subject to the included factory-content license. Do not redistribute the raw factory library as a competing sample pack or standalone asset collection.</p></ContentPanel>
        <ContentPanel title="Availability and changes"><p>The site may change, add or remove functions, and may experience interruptions caused by browsers, devices, hosting, network conditions or third-party services.</p></ContentPanel>
        <ContentPanel title="No warranty"><p>The software is provided on an as-available basis without a promise that every browser, audio device, codec, project or export will work without error. Review rendered files before relying on them for publication or delivery.</p></ContentPanel>
        <ContentPanel title="Limitation and backups"><p>Keep independent copies of important project files and exported audio. To the extent allowed by law, the project is not responsible for lost browser storage, lost files, interrupted sessions or indirect damages arising from use of the application.</p></ContentPanel>
      </div>
    </ArticlePage>
  );
}

export function CopyrightPage() {
  return (
    <ArticlePage seoTitle="Copyright Policy" path="/copyright" eyebrow="Copyright policy" title="Create with audio you own or are authorized to use." description="This policy explains permitted media, user responsibility, factory-content restrictions and how to report a copyright concern related to MusicStudioLab.">
      <div className="article-content article-content--wide legal-copy">
        <ContentPanel title="Permitted workflows"><p>MusicStudioLab is intended for original recordings, original compositions, licensed sounds, commissioned material, public-domain media, Creative Commons material used according to its license, and other content the user is authorized to process.</p></ContentPanel>
        <ContentPanel title="User responsibility"><p>Uploading, editing, arranging or exporting media does not grant rights in that media. Users are responsible for determining whether their source material, samples, compositions, performances and final exports can be used as intended.</p></ContentPanel>
        <ContentPanel title="Factory library"><p>The included factory sounds and presets are original project assets governed by the included factory-content license. They may be used as part of musical works and sound-design projects, but the raw files and preset collection may not be repackaged or redistributed as a standalone library.</p></ContentPanel>
        <ContentPanel title="Reporting a concern"><p>Send a detailed notice to <a href="mailto:support@musicstudiolab.com">support@musicstudiolab.com</a> identifying the protected work, the specific material or page at issue, your contact information, and a good-faith explanation of the concern.</p></ContentPanel>
        <ContentPanel title="Response"><p>Credible notices may be reviewed, and relevant hosted material may be restricted or removed while the concern is evaluated. False or misleading notices may create legal consequences.</p></ContentPanel>
      </div>
    </ArticlePage>
  );
}

export function NotFoundPage() {
  return (
    <>
      <Seo path="/404" noIndex />
      <section className="not-found"><div><span>404</span><h1>This page is outside the arrangement.</h1><p>Return to the home page or open the production studio.</p><div><a className="button button--primary" href="/">Return Home</a><a className="button button--secondary" href="/music">Open Studio</a></div></div></section>
    </>
  );
}
