Mosjid.info extractor

This script crawls the public directory pages on https://mosjid.info and exports:
- mosque name
- address
- establishment info when present
- source page
- page title
- image URLs and alt text

Install:
  pip install requests beautifulsoup4 lxml

Run:
  python mosjid_scraper.py

The exporter writes:
  mosjid_export/mosques.json
  mosjid_export/mosques.csv
  mosjid_export/images.csv
  mosjid_export/pages.json

Note:
The website currently presents anti-bot verification on some bulk/page requests. If that happens,
run the script from your own computer/network where mosjid.info loads normally. The script includes
a sitemap-first approach and a directory-link fallback.
