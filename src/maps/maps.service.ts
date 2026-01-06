import { Injectable, Logger } from "@nestjs/common";
import puppeteer, { Page } from "puppeteer";

export interface Place {
  name: string;
  category?: string;
  address?: string;
  phone?: string;
  website: string;
  social: string;
  socialType: string;
  email?: string;
  rating?: string;
  reviewsCount?: string;
}

const fingerprint = (p: Place): string => {
  if (p.phone) return `phone:${p.phone}`;
  if (p.website) return `website:${p.website}`;
  if (p.social) return `social:${p.social}`;
  return `name:${p.name}|addr:${p.address ?? ""}`;
};

@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);
  private readonly seen = new Set<string>();

  async getPlaces(query: string, limit = 100): Promise<Place[]> {
    const browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    this.logger.log(`Opening ${url}`);

    await page.goto(url, { waitUntil: "networkidle2" });
    await page.waitForSelector('div[role="feed"]');

    const places: Place[] = [];
    const cardsSelector = 'div[role="article"]';

    let index = 0;
    let stuckScrolls = 0;
    let lastName: string | undefined;

    while (places.length < limit) {
      const cards = await page.$$(cardsSelector);

      if (index >= cards.length) {
        const scrolled = await this.scrollFeed(page);

        if (!scrolled) {
          stuckScrolls++;
          if (stuckScrolls >= 3) break;
        } else {
          stuckScrolls = 0;
        }
        continue;
      }

      const card = cards[index++];

      try {
        await card.evaluate((el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
        await card.click();

        await this.waitForPlaceChange(page, lastName);

        const scraped = await page.evaluate(() => {
          const text = (s: string) => document.querySelector(s)?.textContent?.trim() || undefined;

          const name = text("h1.DUwDvf");
          const category = text('button[jsaction*="pane.rating.category"]');
          const address = text('button[data-item-id="address"]');
          const phone = text('button[data-item-id^="phone"]');

          const websiteEl = document.querySelector<HTMLAnchorElement>('a[data-item-id="authority"]');

          let website = "";
          let social = "";
          let socialType = "";

          if (websiteEl?.href) {
            const h = websiteEl.href.toLowerCase();
            if (h.includes("instagram")) {
              social = websiteEl.href;
              socialType = "instagram";
            } else if (h.includes("facebook")) {
              social = websiteEl.href;
              socialType = "facebook";
            } else if (h.includes("wa.me") || h.includes("whatsapp")) {
              social = websiteEl.href;
              socialType = "whatsapp";
            } else {
              website = websiteEl.href;
            }
          }

          const rating = text('div.F7nice span[aria-hidden="true"]');
          const reviewsCount = text('div.F7nice span[aria-label*="reviews"]');

          const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/;
          const emailMatch = document.body.innerText.match(emailRegex);

          return {
            name,
            category,
            address,
            phone,
            website,
            social,
            socialType,
            email: emailMatch ? emailMatch[0] : undefined,
            rating,
            reviewsCount
          };
        });

        if (!scraped?.name) continue;
        lastName = scraped.name;

        const place: Place = {
          name: scraped.name,
          category: scraped.category,
          address: scraped.address,
          phone: scraped.phone,
          website: scraped.website,
          social: scraped.social,
          socialType: scraped.socialType,
          email: scraped.email,
          rating: scraped.rating,
          reviewsCount: scraped.reviewsCount
        };

        const key = fingerprint(place);
        if (this.seen.has(key)) continue;

        this.seen.add(key);
        places.push(place);

        this.logger.log(`[${places.length}] ${place.name}`);
      } catch {
        continue;
      }
    }

    await browser.close();
    return places;
  }

  private async waitForPlaceChange(page: Page, previousName?: string) {
    await page.waitForFunction(
      (prev) => {
        const el = document.querySelector("h1.DUwDvf");
        if (!el || !el.textContent) return false;
        return el.textContent.trim() !== prev;
      },
      { timeout: 5000 },
      previousName
    );
  }

  private async scrollFeed(page: Page): Promise<boolean> {
    return page.evaluate(async () => {
      const feed = document.querySelector('div[role="feed"]') as HTMLElement;
      if (!feed) return false;

      const prev = feed.scrollTop;

      feed.scrollTo({ top: feed.scrollHeight });
      await new Promise((r) => setTimeout(r, 1000));

      if (feed.scrollTop === prev) {
        feed.dispatchEvent(new WheelEvent("wheel", { deltaY: 2000, bubbles: true }));
        await new Promise((r) => setTimeout(r, 1000));
      }

      return feed.scrollTop !== prev;
    });
  }
}
