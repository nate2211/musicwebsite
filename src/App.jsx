import React from "react";
import { SiteLayout, SiteNavbar } from "./site/components/SiteChrome";
import Seo from "./site/components/Seo";
import { getRoutePath, getSearchParams, useLocationPath } from "./site/router";
import HomePage from "./site/pages/HomePage";
import SynthPage from "./site/pages/SynthPage";
import SoundsPage from "./site/pages/SoundsPage";
import WorkflowPage from "./site/pages/WorkflowPage";
import StudioLandingPage from "./site/pages/StudioLandingPage";
import {
  AboutPage,
  ContactPage,
  CopyrightPage,
  HelpPage,
  NotFoundPage,
  PrivacyPage,
  TermsPage,
} from "./site/pages/InfoPages";
import "./site/Site.css";

const StudioPage = React.lazy(() => import("./studio/StudioPage"));

function StudioLoading() {
  return (
    <div className="studio-loading" role="status" aria-live="polite">
      <div className="studio-loading__mark" aria-hidden="true"><i /><i /><i /></div>
      <strong>Loading MusicStudioLab</strong>
      <span>Preparing the audio engine, instruments and production workspaces…</span>
    </div>
  );
}

function StudioRoute({ location }) {
  const initialView = getSearchParams(location).get("view") || undefined;
  React.useEffect(() => {
    document.body.classList.add("studio-body");
    return () => document.body.classList.remove("studio-body");
  }, []);

  return (
    <div className="studio-route">
      <Seo path="/music" />
      <SiteNavbar compact />
      <h1 className="sr-only">Online music studio for hip-hop, trap and drill beats</h1>
      <div className="studio-route__workspace">
        <React.Suspense fallback={<StudioLoading />}>
          <StudioPage initialView={initialView} />
        </React.Suspense>
      </div>
    </div>
  );
}

export default function App({ initialLocation = "/" }) {
  const location = useLocationPath(initialLocation);
  const path = getRoutePath(location);

  if (path === "/music") {
    if (import.meta.env.SSR) return <SiteLayout><StudioLandingPage /></SiteLayout>;
    return <StudioRoute location={location} />;
  }

  const routes = {
    "/": <HomePage />,
    "/synth-lab": <SynthPage />,
    "/sounds": <SoundsPage />,
    "/workflow": <WorkflowPage />,
    "/help": <HelpPage />,
    "/about": <AboutPage />,
    "/contact": <ContactPage />,
    "/privacy": <PrivacyPage />,
    "/terms": <TermsPage />,
    "/copyright": <CopyrightPage />,
  };

  return <SiteLayout>{routes[path] || <NotFoundPage />}</SiteLayout>;
}
