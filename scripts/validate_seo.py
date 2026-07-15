#!/usr/bin/env python3
"""Validate prerendered SEO output for MusicStudioLab."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse
from xml.etree import ElementTree

from bs4 import BeautifulSoup
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
SITE = "https://musicstudiolab.com"
ROUTES = [
    "/", "/music", "/synth-lab", "/sounds", "/workflow", "/help",
    "/about", "/contact", "/privacy", "/terms", "/copyright",
]

errors: list[str] = []
warnings: list[str] = []


def fail(message: str) -> None:
    errors.append(message)


def route_file(route: str) -> Path:
    return DIST / "index.html" if route == "/" else DIST / route.lstrip("/") / "index.html"


for route in ROUTES:
    file = route_file(route)
    if not file.exists():
        fail(f"Missing prerendered route: {route} ({file})")
        continue
    html = file.read_text(encoding="utf-8")
    soup = BeautifulSoup(html, "html.parser")

    title = soup.title.get_text(strip=True) if soup.title else ""
    if not 20 <= len(title) <= 65:
        fail(f"{route}: title length {len(title)} is outside 20-65 characters: {title!r}")

    description = soup.find("meta", attrs={"name": "description"})
    description_value = description.get("content", "").strip() if description else ""
    if not 110 <= len(description_value) <= 170:
        fail(f"{route}: description length {len(description_value)} is outside 110-170 characters")

    canonical = soup.find("link", rel="canonical")
    expected = f"{SITE}/" if route == "/" else f"{SITE}{route}"
    if not canonical or canonical.get("href") != expected:
        fail(f"{route}: canonical mismatch; expected {expected}")

    robots = soup.find("meta", attrs={"name": "robots"})
    if not robots or "index" not in robots.get("content", "") or "max-image-preview:large" not in robots.get("content", ""):
        fail(f"{route}: indexable robots directives are missing")

    h1s = soup.find_all("h1")
    if len(h1s) != 1:
        fail(f"{route}: expected exactly one H1, found {len(h1s)}")
    elif len(h1s[0].get_text(" ", strip=True)) < 18:
        warnings.append(f"{route}: H1 is unusually short")

    root = soup.find(id="root")
    if not root or len(root.get_text(" ", strip=True)) < 250:
        fail(f"{route}: prerendered body content is missing or too thin")

    for name in ["og:title", "og:description", "og:url", "og:image", "og:image:width", "og:image:height"]:
        if not soup.find("meta", attrs={"property": name}):
            fail(f"{route}: missing Open Graph tag {name}")
    for name in ["twitter:card", "twitter:title", "twitter:description", "twitter:image"]:
        if not soup.find("meta", attrs={"name": name}):
            fail(f"{route}: missing Twitter tag {name}")

    schemas = soup.find_all("script", attrs={"type": "application/ld+json"})
    if not schemas:
        fail(f"{route}: missing JSON-LD")
    for node in schemas:
        try:
            data = json.loads(node.string or node.get_text())
            if data.get("@context") != "https://schema.org":
                fail(f"{route}: JSON-LD does not use schema.org context")
        except json.JSONDecodeError as exc:
            fail(f"{route}: invalid JSON-LD: {exc}")

    for anchor in root.find_all("a", href=True):
        href = anchor["href"]
        if href.startswith(("#", "mailto:", "tel:", "http://", "https://")):
            continue
        parsed = urlparse(href)
        linked_path = parsed.path or "/"
        if linked_path == "/studio":
            linked_path = "/music"
        if linked_path not in ROUTES:
            warnings.append(f"{route}: internal link points outside known routes: {href}")

not_found = DIST / "404.html"
if not_found.exists():
    soup = BeautifulSoup(not_found.read_text(encoding="utf-8"), "html.parser")
    robots = soup.find("meta", attrs={"name": "robots"})
    if not robots or "noindex" not in robots.get("content", ""):
        fail("404.html must include noindex")
else:
    fail("Missing dist/404.html")

sitemap = DIST / "sitemap.xml"
if not sitemap.exists():
    fail("Missing sitemap.xml")
else:
    tree = ElementTree.parse(sitemap)
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = {node.text for node in tree.findall("sm:url/sm:loc", ns)}
    expected_urls = {f"{SITE}/" if r == "/" else f"{SITE}{r}" for r in ROUTES}
    if urls != expected_urls:
        fail(f"Sitemap URLs differ from canonical route set: missing={expected_urls-urls}, extra={urls-expected_urls}")

robots_file = DIST / "robots.txt"
if not robots_file.exists() or f"Sitemap: {SITE}/sitemap.xml" not in robots_file.read_text(encoding="utf-8"):
    fail("robots.txt is missing the canonical sitemap declaration")

redirects = DIST / "_redirects"
if not redirects.exists() or "/studio /music 301" not in redirects.read_text(encoding="utf-8"):
    fail("Canonical /studio to /music redirect is missing")

for image in (DIST / "og").glob("*.png"):
    with Image.open(image) as im:
        if im.size != (1200, 630):
            fail(f"{image.name}: expected 1200x630, got {im.size}")
if len(list((DIST / "og").glob("*.png"))) < 6:
    fail("Expected at least six page-specific social images")

lock = (ROOT / "package-lock.json").read_text(encoding="utf-8")
if "applied-caas" in lock or "openai.org/artifactory" in lock:
    fail("package-lock.json contains a private package registry URL")

if errors:
    print("SEO validation FAILED")
    for item in errors:
        print(f"  ERROR: {item}")
    for item in warnings[:20]:
        print(f"  WARNING: {item}")
    sys.exit(1)

print(f"SEO validation passed for {len(ROUTES)} indexable routes.")
print("Validated unique metadata, canonicals, H1s, prerendered content, JSON-LD, sitemap, robots, redirects and social images.")
if warnings:
    print(f"Warnings ({len(warnings)}):")
    for item in warnings[:20]:
        print(f"  - {item}")
