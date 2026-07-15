# Google Search Console launch checklist

## Before deployment

1. Run `npm run check`.
2. Deploy the `dist` directory, not the repository root.
3. Confirm HTTPS works on the canonical `https://musicstudiolab.com` hostname.
4. Configure one preferred hostname at the Cloudflare domain level. Redirect any `www` variant to the preferred hostname with a permanent redirect.
5. Confirm these URLs return the page-specific HTML produced in `dist/<route>/index.html`.

## Search Console setup

1. Add a **Domain property** for `musicstudiolab.com` and verify it with the DNS record Google provides.
2. Submit `https://musicstudiolab.com/sitemap.xml` in the Sitemaps report.
3. Inspect and request indexing for the home page and the highest-value routes:
   - `/music`
   - `/synth-lab`
   - `/sounds`
   - `/workflow`
   - `/help`
4. In URL Inspection, verify that Google's selected canonical matches the declared canonical.
5. Check the Page indexing report after Google has recrawled the deployment.
6. Test `/`, `/music`, `/synth-lab`, `/workflow`, and `/help` with Google's Rich Results Test.
7. Watch Core Web Vitals field data after enough real-user traffic is available.

## Ongoing content work

Search visibility cannot be guaranteed by metadata alone. Publish genuinely useful, original pages when there is enough content to satisfy the query, such as:

- how to tune 808s to a song key
- how to program trap hi-hats without overcrowding a beat
- how FM changes a hip-hop lead sound
- how to arrange an eight-bar loop into a full song
- how to gain-stage a browser music project
- how to export and compare a WAV master

Avoid creating thin city pages, duplicate genre pages, keyword-swapped doorway pages, fake reviews, fake ratings, or pages whose visible content does not match their structured data.

## Maintenance

- Update sitemap `lastmod` only when a page changes materially.
- Keep canonical URLs stable.
- Preserve permanent redirects when renaming routes.
- Re-run the SEO validator after changing page metadata or navigation.
- Review Search Console query data to improve existing helpful pages before creating many new pages.
- Investigate sudden indexing changes, manual actions, security issues, structured-data errors, and Core Web Vitals regressions.
