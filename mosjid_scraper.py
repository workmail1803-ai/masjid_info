#!/usr/bin/env python3
"""
Mosjid.info bulk extractor

What it extracts:
- District / upazila / Dhaka thana directory pages
- Mosque serial number (when present)
- Mosque name (including Bangla text as published in the page)
- Address
- Establishment year/date when present
- Source page URL
- Image URLs + image alt text
- Page title

Outputs:
  mosjid_export/mosques.json
  mosjid_export/mosques.csv
  mosjid_export/pages.json
  mosjid_export/images.csv

Install:
  pip install requests beautifulsoup4 lxml
Run:
  python mosjid_scraper.py
"""

from __future__ import annotations

import csv
import json
import re
import time
from collections import deque
from pathlib import Path
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

BASE = "https://mosjid.info/"
OUT = Path("mosjid_export")
OUT.mkdir(exist_ok=True)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/150.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9,bn;q=0.8",
}

session = requests.Session()
session.headers.update(HEADERS)

# These are the directory areas visible on the site.
ALLOWED_PREFIXES = (
    "/districts-of-bangladesh/",
    "/thanas-of-dhaka-city/",
)

INDEX_URLS = [
    BASE,
    urljoin(BASE, "districts-of-bangladesh/"),
    urljoin(BASE, "thanas-of-dhaka-city/"),
]

SITEMAP_CANDIDATES = [
    urljoin(BASE, "wp-sitemap.xml"),
    urljoin(BASE, "sitemap_index.xml"),
    urljoin(BASE, "sitemap.xml"),
    urljoin(BASE, "page-sitemap.xml"),
]

YEAR_PATTERNS = [
    re.compile(r"(?:Established|Estb|ESTB|established)\s*[-–:]?\s*([0-9]{4})", re.I),
    re.compile(r"(?:Established|Estb|ESTB|established)\s*[-–:]?\s*([0-9]{1,2}[./-][A-Za-z0-9]{1,12}[./-][0-9]{2,4})", re.I),
]


def clean(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def get(url: str) -> requests.Response | None:
    try:
        r = session.get(url, timeout=30)
        if r.status_code == 200 and "text/html" in r.headers.get("content-type", ""):
            return r
        if r.status_code == 200 and "xml" in r.headers.get("content-type", ""):
            return r
        print(f"[skip {r.status_code}] {url}")
    except requests.RequestException as e:
        print(f"[error] {url}: {e}")
    return None


def discover_from_sitemap(url: str) -> list[str]:
    r = get(url)
    if not r:
        return []
    soup = BeautifulSoup(r.text, "xml")
    locs = [clean(x.get_text()) for x in soup.find_all("loc")]
    return locs


def is_directory_url(url: str) -> bool:
    p = urlparse(url)
    if p.netloc != urlparse(BASE).netloc:
        return False
    return any(p.path.startswith(x) for x in ALLOWED_PREFIXES)


def parse_page(url: str, html: str) -> tuple[list[dict], list[dict], list[str]]:
    soup = BeautifulSoup(html, "lxml")
    title = clean(soup.title.get_text(" ", strip=True) if soup.title else "")
    rows: list[dict] = []
    images: list[dict] = []
    links: list[str] = []

    # Directory tables on mosjid.info use rows like:
    # SL | Name | Address
    for table in soup.find_all("table"):
        for tr in table.find_all("tr"):
            cells = tr.find_all(["th", "td"])
            if len(cells) < 2:
                continue

            vals = [clean(c.get_text(" ", strip=True)) for c in cells]
            joined = " | ".join(vals).lower()

            # Skip header rows.
            if "name" in joined and "address" in joined:
                continue

            sl = vals[0] if len(vals) >= 3 and re.fullmatch(r"\d{1,4}", vals[0]) else ""
            if sl:
                name = vals[1]
                address = " | ".join(vals[2:])
            else:
                name = vals[0]
                address = " | ".join(vals[1:])

            if not name or not address:
                continue

            established = ""
            for pat in YEAR_PATTERNS:
                m = pat.search(address)
                if m:
                    established = m.group(1)
                    break

            rows.append({
                "serial": sl,
                "name": name,
                "address": address,
                "established": established,
                "source_url": url,
                "page_title": title,
            })

    # Also inspect non-table list content for directory rows that may be rendered differently.
    if not rows and re.search(r"(District|Thana|Upazila).*Mosjid", title, re.I):
        text = clean(soup.get_text(" ", strip=True))
        rows.append({
            "serial": "",
            "name": "",
            "address": "",
            "established": "",
            "source_url": url,
            "page_title": title,
            "page_text_available": bool(text),
        })

    for img in soup.find_all("img"):
        src = img.get("src") or img.get("data-src") or img.get("data-lazy-src")
        if src:
            images.append({
                "source_url": url,
                "image_url": urljoin(url, src),
                "alt": clean(img.get("alt", "")),
            })

    for a in soup.find_all("a", href=True):
        links.append(urljoin(url, a["href"]))

    return rows, images, links


def fallback_crawl(max_pages: int = 3000) -> list[str]:
    queue = deque(INDEX_URLS)
    seen = set()

    while queue and len(seen) < max_pages:
        url = queue.popleft()
        if url in seen or not is_directory_url(url) and url not in INDEX_URLS:
            continue

        r = get(url)
        if not r:
            continue

        seen.add(url)
        soup = BeautifulSoup(r.text, "lxml")

        for a in soup.find_all("a", href=True):
            nxt = urljoin(url, a["href"])
            if nxt in seen:
                continue
            if is_directory_url(nxt):
                queue.append(nxt)

        time.sleep(0.35)

    return sorted(seen)


def main() -> None:
    print("Discovering site URLs...")

    urls = []
    for sm in SITEMAP_CANDIDATES:
        vals = discover_from_sitemap(sm)
        if vals:
            print(f"Found {len(vals)} URLs from {sm}")
            urls.extend(vals)

    directory_urls = sorted({
        u for u in urls
        if is_directory_url(u)
    })

    if not directory_urls:
        print("Sitemap was unavailable. Falling back to directory-link crawling.")
        directory_urls = fallback_crawl()

    # Always include the two directory indexes if accessible.
    directory_urls = sorted(set(directory_urls + INDEX_URLS))

    print(f"Directory pages to inspect: {len(directory_urls)}")

    all_rows = []
    all_images = []
    page_meta = []

    for i, url in enumerate(directory_urls, 1):
        print(f"[{i}/{len(directory_urls)}] {url}")
        r = get(url)
        if not r:
            page_meta.append({"url": url, "status": "failed"})
            continue

        rows, images, links = parse_page(url, r.text)
        all_rows.extend(rows)
        all_images.extend(images)

        page_meta.append({
            "url": url,
            "status": "ok",
            "row_count": len(rows),
            "image_count": len(images),
        })

        time.sleep(0.35)

    # Deduplicate exact records.
    seen = set()
    deduped = []
    for row in all_rows:
        key = (
            clean(row.get("name", "")).lower(),
            clean(row.get("address", "")).lower(),
            row.get("source_url", ""),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(row)

    all_images = sorted({
        (x["source_url"], x["image_url"], x["alt"]): x
        for x in all_images
    }.values(), key=lambda x: (x["source_url"], x["image_url"]))

    with open(OUT / "mosques.json", "w", encoding="utf-8") as f:
        json.dump(deduped, f, ensure_ascii=False, indent=2)

    with open(OUT / "mosques.csv", "w", encoding="utf-8-sig", newline="") as f:
        fields = ["serial", "name", "address", "established", "source_url", "page_title"]
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows({k: row.get(k, "") for k in fields} for row in deduped)

    with open(OUT / "images.csv", "w", encoding="utf-8-sig", newline="") as f:
        fields = ["source_url", "image_url", "alt"]
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(all_images)

    with open(OUT / "pages.json", "w", encoding="utf-8") as f:
        json.dump(page_meta, f, ensure_ascii=False, indent=2)

    print()
    print(f"Done. Mosques extracted: {len(deduped)}")
    print(f"Pages inspected: {len(page_meta)}")
    print(f"Image URLs found: {len(all_images)}")
    print(f"Output folder: {OUT.resolve()}")


if __name__ == "__main__":
    main()
