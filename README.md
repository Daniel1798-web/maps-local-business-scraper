# Google Maps Business Scraper (NestJS + Puppeteer)

This repository provides a **Google Maps business scraper** built with **NestJS** and **Puppeteer**. It is designed to collect structured lead data from Google Maps at scale, exporting the results into clean CSV files ready for outreach, analysis, or enrichment.

The project focuses on **reliability**, **deduplication**, and **global usability**, avoiding region‑specific assumptions so it can be used anywhere in the world.

---

## What This Project Does

* Scrapes business listings directly from Google Maps search results
* Extracts the maximum amount of public business data available
* Automatically detects and separates:

* Official websites
* Social media links (Instagram, Facebook, WhatsApp)
* Deduplicates businesses to avoid repeated entries
* Generates **one CSV file per search query** (no overwrites)
* Handles Google Maps scroll freezes and slow UI updates
* Works with any country or city without manual coordinates

---

## Data Collected Per Business

Each scraped business produces a structured record with the following fields:

* `name`
* `category`
* `address`
* `phone`
* `website` (only dedicated websites)
* `social` (Instagram / Facebook / WhatsApp links)
* `socialType`
* `email` (best‑effort extraction)
* `rating`
* `reviewsCount`

All data is exported to CSV using proper escaping.

---

## How Deduplication Works

Google Maps frequently repeats businesses across scrolls and categories. This scraper prevents duplicates by generating a **fingerprint** per business using the most reliable identifier available:

1. Phone number (highest priority)
2. Website URL
3. Social link
4. Fallback: name + address

Only unique businesses are stored and exported.

---

## How Scraping Is Stabilized

This project avoids brittle `setTimeout`‑based scraping. Instead it:

* Waits for the business panel to actually change before scraping
* Detects frozen scroll states and forces wheel events
* Scrolls incrementally until no new results appear
* Stops safely when Google Maps stops loading new cards

This makes the scraper stable for **hundreds or thousands of listings per run**.

---

## CSV Output

* All CSV files are written to the `/output` directory
* Each search query generates its own file
* Filenames include:

  * The sanitized search query
  * A timestamp

Example:

```
output/leads_panaderia_en_cordoba_argentina_2026-01-02T14-32-10.csv
```

This ensures no data loss between runs or categories.

---

## Configuration (main.ts)

You control scraping behavior from `main.ts`:

```ts
const COUNTRY = "Argentina";
const LOCATION = "Córdoba";

const BUSINESS_QUERIES = [
  "peluquería",
  "panadería",
  "ferretería",
  "taller mecánico",
  "kiosco"
];

const LIMIT_PER_QUERY = 100;
```

* Change `COUNTRY` and `LOCATION` to scrape anywhere in the world
* Add or remove business categories freely
* Increase limits depending on your machine and patience

No neighborhood names, coordinates, or manual map navigation required.

---

## Requirements

* Node.js 18+
* npm
* Google Chrome (or Chromium)

---

## Installation

```bash
npm install
```

---

## Run the Scraper

```bash
npm run start
```

A visible browser window will open (headful mode) so you can monitor activity.

---

## Important Notes

* This project scrapes **publicly available data** only
* Google Maps may change DOM selectors at any time
* Use responsibly and respect local laws and Google’s terms
* This tool is intended for **research, lead generation, and internal tooling**

---

## Future Improvements

* Headless + stealth mode
* Automatic geographic tiling for very large countries
* Proxy rotation
* Export to JSON / database
* Email enrichment via external APIs

---

## Disclaimer

This project is provided for educational and internal use. The author is not responsible for misuse or violations of third‑party terms of service.

---
