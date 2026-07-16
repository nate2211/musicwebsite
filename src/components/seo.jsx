import React from "react";
import { Helmet } from "react-helmet-async";

const SITE_NAME = "MusicStudioLab";
const SITE_URL = "https://musicstudiolab.com";

export default function Seo({
                                title,
                                description,
                                path = "/",
                                keywords = "",
                                image = "/favicon.svg",
                                type = "website",
                                structuredData = null,
                            }) {
    const pageTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
    const canonicalUrl = `${SITE_URL}${path}`;
    const imageUrl = image.startsWith("http") ? image : `${SITE_URL}${image}`;

    return (
        <Helmet>
            <title>{pageTitle}</title>

            <meta name="description" content={description} />
            {keywords ? <meta name="keywords" content={keywords} /> : null}

            <link rel="canonical" href={canonicalUrl} />

            <meta property="og:type" content={type} />
            <meta property="og:site_name" content={SITE_NAME} />
            <meta property="og:title" content={pageTitle} />
            <meta property="og:description" content={description} />
            <meta property="og:url" content={canonicalUrl} />
            <meta property="og:image" content={imageUrl} />

            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={pageTitle} />
            <meta name="twitter:description" content={description} />
            <meta name="twitter:image" content={imageUrl} />

            <meta name="theme-color" content="#050711" />

            {structuredData ? (
                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            ) : null}
        </Helmet>
    );
}