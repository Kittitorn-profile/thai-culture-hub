# Provincial identity data

77 entries keyed by canonical `TH-xx` province codes. Motto and seal references were collected from the Thai Wikipedia provincial infoboxes on 2026-11-08; seal images link to Wikimedia Commons with a file-description link. These are attributed reference data, not a claim of independent official verification of all 77 records. Check the linked file description for image provenance and use terms.

Verified primary-document overrides live in `verified-overrides.json`. Maha Sarakham's motto and colour names were checked on page 1 of the provincial development plan published by Maha Sarakham Vocational College. Its brown/yellow swatches are approximate display colours, not official Pantone/HEX specifications. Other provinces' colours remain unverified and empty. Never infer official colours from seal pixels or the site's map palette.

To refresh: install `beautifulsoup4` in an isolated Python environment, then run `python3 scripts/collect-province-identities.py`. Complete existing entries are preserved; incomplete entries are retried with two workers. Primary-document overrides are reapplied after collection. No page requests run during public page rendering.

## Local seal cache

`local-seals.json` maps all 77 province codes to files in `public/assets/province-seals/`. The public component reads only these local images, with explicit dimensions and eager loading for the visible identity panel; it never waits for Wikimedia. External provenance links remain unchanged. Run `python3 scripts/cache-province-seals.py` for missing assets. Wikimedia-prepared 120px thumbnails are used when an original is unavailable; existing local WebP files are preserved. Run `node scripts/optimize-province-seals.cjs` after downloading to resize to at most 160px and convert to WebP; the optimizer removes only superseded generated seal files after the manifest is saved. Download responses are validated by image signature before saving. All 77 optimized seals total about 832 KB on disk and are cacheable by the site's static file hosting.
