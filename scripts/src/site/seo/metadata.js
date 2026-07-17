export const SITE_NAME = "MusicStudioLab";
export const SITE_URL = "https://musicstudiolab.com";
export const SITE_LOCALE = "en_US";
export const SITE_LANGUAGE = "en-US";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og/musicstudiolab-online-beat-maker.png`;
export const LAST_MODIFIED = "2026-07-15";

export const FEATURE_LIST = [
  "Channel rack step sequencer",
  "Piano roll for melodies, chords and basslines",
  "Playlist arrangement timeline",
  "Layered hybrid synthesizer with three core oscillators, dual spectral layers, FM and ring modulation",
  "Original 808, drum, loop, texture and transition library",
  "Mixer with EQ, compression, saturation, chorus, delay and reverb",
  "64-step automation lanes",
  "Mastering controls and offline WAV export",
  "Local project saving and portable project files",
  "Browser MIDI note preview where supported",
];

export const HOME_FAQS = [
  {
    question: "Can I make hip-hop, trap and drill beats in MusicStudioLab?",
    answer: "Yes. MusicStudioLab combines a channel rack, piano roll, playlist, mixer, automation, tuned 808s, drum sounds and editable synthesizer patches for hip-hop, trap, drill and melodic production workflows.",
  },
  {
    question: "Is MusicStudioLab an online DAW or only a loop maker?",
    answer: "It is a browser-based digital audio workstation. You can design sounds, sequence notes and drums, arrange song sections, mix channels, automate parameters, master the project and render WAV audio rather than only combining fixed loops.",
  },
  {
    question: "Does MusicStudioLab process music in the browser?",
    answer: "Core synthesis, sequencing, effects, project editing and compatible offline WAV rendering run in the browser through Web Audio. Browser support and available device memory can affect large projects.",
  },
  {
    question: "Can I create and save custom synthesizer sounds?",
    answer: "Yes. The Synth Lab includes three core oscillators, two independent spectral layers, a procedural texture bed, sub and noise sources, custom harmonics, FM, ring modulation, dual filters, envelopes, LFOs, per-layer unison, effects and performance macros. Custom patches can be saved, imported and exported.",
  },
  {
    question: "Can I export a finished beat as a WAV file?",
    answer: "Yes. The offline renderer applies the project arrangement, instruments, samples, automation, mixer processing and mastering path to create a WAV file for review or continued production.",
  },
];

export const HELP_FAQS = [
  {
    question: "Why does the studio have no sound when I first open it?",
    answer: "Modern browsers require a click, tap or key action before starting audio. Press a sound preview or the transport play button, then confirm that the browser tab and operating-system output device are not muted.",
  },
  {
    question: "Why did the factory sound library fail to load?",
    answer: "Run MusicStudioLab through the Vite development server or a deployed web server. Opening index.html directly from the file system blocks the fetch request used to load the sound manifest.",
  },
  {
    question: "Where are projects saved?",
    answer: "Saved projects and custom presets are stored in the current browser profile. Export a portable project file and keep independent backups before clearing browser data or moving to another device.",
  },
  {
    question: "Which browsers work best for music production?",
    answer: "Use a current desktop version of Chrome, Edge, Firefox or Safari with Web Audio enabled. MIDI availability and some audio behavior vary by browser and device.",
  },
  {
    question: "How can I fix an npm install EPERM error on Windows?",
    answer: "Close running Node and Vite processes, remove the incomplete node_modules directory, and run the included npm run install:windows command. The project lockfile points to the public npm registry.",
  },
];

const route = (title, description, image, label, extra = {}) => ({
  title,
  description,
  image: `${SITE_URL}/og/${image}`,
  label,
  index: true,
  ...extra,
});

export const SEO_ROUTES = {
  "/": route(
    "Online Beat Maker & Browser DAW | MusicStudioLab",
    "Make hip-hop, trap and drill beats online with a browser DAW featuring a synth, 808s, drum sequencer, piano roll, mixer, automation and WAV export.",
    "musicstudiolab-online-beat-maker.png",
    "Home",
    { schema: "software", faqs: HOME_FAQS },
  ),
  "/music": route(
    "Free Online Music Studio for Hip-Hop Beats | MusicStudioLab",
    "Open a free online music studio with a channel rack, piano roll, playlist, mixer, automation, mastering, original sounds and offline WAV rendering.",
    "musicstudiolab-browser-daw.png",
    "Production Studio",
    { schema: "software" },
  ),
  "/synth-lab": route(
    "Online Synthesizer & Sound Design Lab | MusicStudioLab",
    "Design custom basses, leads, pads, keys and 808 sounds with core oscillators, dual spectral layers, textures, FM, filters, envelopes, LFOs, unison and effects.",
    "musicstudiolab-online-synthesizer.png",
    "Synth Lab",
    { schema: "software" },
  ),
  "/sounds": route(
    "Original 808s, Drum Sounds & Synth Presets | MusicStudioLab",
    "Explore 444 original WAV sounds and 240 soft, warm layered synth presets, including 808s, drums, loops, textures, transitions and impulses.",
    "musicstudiolab-808-drum-sounds.png",
    "Factory Sounds",
  ),
  "/workflow": route(
    "How to Make Hip-Hop Beats Online | MusicStudioLab",
    "Follow a practical hip-hop beat workflow from sound selection and drum sequencing through melodies, arrangement, mixing, automation, mastering and WAV export.",
    "musicstudiolab-hip-hop-workflow.png",
    "Production Workflow",
    { schema: "article" },
  ),
  "/help": route(
    "MusicStudioLab Help: Beat Maker, Synth & Export Guides",
    "Learn how to start audio, sequence drums, use the piano roll, design synth patches, mix, automate, save projects, troubleshoot and export WAV files.",
    "musicstudiolab-help-guide.png",
    "Help Center",
    { schema: "help", faqs: HELP_FAQS },
  ),
  "/about": route(
    "About MusicStudioLab | Browser Music Production Tools",
    "Learn why MusicStudioLab was built, how its browser audio workstation works, what original factory content it includes and how it fits the Lab tool network.",
    "musicstudiolab-online-beat-maker.png",
    "About",
    { schema: "organization" },
  ),
  "/contact": route(
    "Contact MusicStudioLab Support",
    "Contact MusicStudioLab about audio playback, WAV export, browser or MIDI compatibility, projects, accessibility, privacy, copyright and product feedback.",
    "musicstudiolab-help-guide.png",
    "Contact",
    { schema: "contact" },
  ),
  "/privacy": route(
    "MusicStudioLab Privacy Policy",
    "Read how MusicStudioLab handles browser audio processing, local project storage, imported files, permissions, analytics, advertising and user choices.",
    "musicstudiolab-online-beat-maker.png",
    "Privacy Policy",
  ),
  "/terms": route(
    "MusicStudioLab Terms of Use",
    "Review the rules for using MusicStudioLab, including user content, factory sounds, acceptable use, project backups, availability and warranty limitations.",
    "musicstudiolab-online-beat-maker.png",
    "Terms of Use",
  ),
  "/copyright": route(
    "MusicStudioLab Copyright Policy",
    "Learn which audio may be processed, how factory sounds can be used, user copyright responsibilities and how to report a copyright concern.",
    "musicstudiolab-online-beat-maker.png",
    "Copyright Policy",
  ),
  "/404": {
    title: "Page Not Found | MusicStudioLab",
    description: "The requested MusicStudioLab page could not be found.",
    image: DEFAULT_OG_IMAGE,
    label: "Page Not Found",
    index: false,
  },
};

export function normalizeSeoPath(value = "/") {
  const path = String(value).split(/[?#]/)[0] || "/";
  if (path === "/studio") return "/music";
  if (path === "/index.html") return "/";
  return path === "/" ? "/" : path.replace(/\/+$/, "");
}

export function getSeoForPath(value = "/") {
  const path = normalizeSeoPath(value);
  return { path, ...(SEO_ROUTES[path] || SEO_ROUTES["/404"]) };
}

function breadcrumbSchema(path, label) {
  if (path === "/") return null;
  return {
    "@type": "BreadcrumbList",
    "@id": `${SITE_URL}${path}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: label, item: `${SITE_URL}${path}` },
    ],
  };
}

function softwareSchema(path, data) {
  return {
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software`,
    name: SITE_NAME,
    alternateName: "MusicStudioLab Browser DAW",
    url: `${SITE_URL}${path === "/" ? "/" : path}`,
    image: data.image,
    screenshot: data.image,
    description: data.description,
    applicationCategory: "MultimediaApplication",
    applicationSubCategory: "Digital audio workstation",
    operatingSystem: "Any operating system with a modern web browser",
    browserRequirements: "Requires JavaScript and Web Audio API support",
    softwareVersion: "8.8.0",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD", availability: "https://schema.org/InStock" },
    featureList: FEATURE_LIST,
    softwareHelp: `${SITE_URL}/help`,
    creator: { "@id": `${SITE_URL}/#organization` },
    potentialAction: { "@type": "UseAction", target: `${SITE_URL}/music` },
  };
}

export function buildStructuredData(value = "/") {
  const data = getSeoForPath(value);
  const url = `${SITE_URL}${data.path === "/" ? "/" : data.path}`;
  const graph = [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: `${SITE_URL}/`,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo512.png`, width: 512, height: 512 },
      email: "support@musicstudiolab.com",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: `${SITE_URL}/`,
      name: SITE_NAME,
      description: SEO_ROUTES["/"].description,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: SITE_LANGUAGE,
    },
    {
      "@type": data.path === "/contact" ? "ContactPage" : "WebPage",
      "@id": `${url}#webpage`,
      url,
      name: data.title,
      description: data.description,
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#software` },
      primaryImageOfPage: { "@type": "ImageObject", url: data.image, width: 1200, height: 630 },
      breadcrumb: data.path === "/" ? undefined : { "@id": `${url}#breadcrumb` },
      dateModified: LAST_MODIFIED,
      inLanguage: SITE_LANGUAGE,
    },
  ];

  const breadcrumb = breadcrumbSchema(data.path, data.label);
  if (breadcrumb) graph.push(breadcrumb);
  if (data.schema === "software") graph.push(softwareSchema(data.path, data));
  if (data.schema === "article") {
    graph.push({
      "@type": "TechArticle",
      "@id": `${url}#article`,
      headline: data.title.replace(` | ${SITE_NAME}`, ""),
      description: data.description,
      image: data.image,
      datePublished: "2026-07-15",
      dateModified: LAST_MODIFIED,
      author: { "@id": `${SITE_URL}/#organization` },
      publisher: { "@id": `${SITE_URL}/#organization` },
      mainEntityOfPage: { "@id": `${url}#webpage` },
      inLanguage: SITE_LANGUAGE,
    });
  }
  if (data.faqs?.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: data.faqs.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph.filter(Boolean) };
}
