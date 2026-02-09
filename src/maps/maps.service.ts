import { Injectable, Logger } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';

export interface Place {
  city: string;
  name: string;
  category?: string;
  address?: string;
  phone?: string;
  website?: string;
  email?: string;
  rating?: string;
  reviewsCount?: string;
  facebook?: string;
  instagram?: string;
  latitude?: string;
  longitude?: string;
  googleUrl?: string;
  isClaimed?: string;
  attributes?: string;
  topReview?: string;
  workingHours?: string;
  imageUrl?: string;
}

@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);

  private delay(ms: number) {
    return new Promise(res => setTimeout(res, ms));
  }

  async getPlaces(query: string, city: string, limit = 20): Promise<Place[]> {
    const places: Place[] = [];
    const seen = new Set<string>();

    let browser: Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
        defaultViewport: { width: 1280, height: 900 },
      });

      const page = await browser.newPage();
      await page.goto(
        `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=es`,
        { waitUntil: 'networkidle2', timeout: 60000 },
      );

      let scrolls = 0;

      while (places.length < limit && scrolls < 10) {
        const cards = await page.$$('div[role="article"]');
        let added = false;

        for (const card of cards) {
          if (places.length >= limit) break;

          const { name } = await card.evaluate(el => ({
            name: el.querySelector('.fontHeadlineSmall')?.textContent?.trim() || '',
          }));

          if (!name) continue;

          const key = name.toLowerCase();
          if (seen.has(key)) continue;

          try {
            await card.scrollIntoView();
            await this.delay(400);
            await card.click();

            await page.waitForSelector('h1.DUwDvf', { timeout: 8000 });
            await this.delay(800);

            const data = await this.extractDetails(page, city);

            if (!data.name) continue;

            if (data.website && browser && (await browser.pages()).length < 5) {
              data.email = await this.scrapeEmailFromWebsite(browser, data.website);
            }

            places.push(data);
            seen.add(key);
            added = true;

            this.logger.log(`✔ ${places.length}/${limit} ${data.name}`);
          } catch (e: any) {
            if (String(e).includes('Target closed')) {
              this.logger.warn('Chrome cerrado inesperadamente');
              return places;
            }
          }
        }

        if (!added) {
          await this.scrollFeed(page);
          scrolls++;
        }
      }

      return places;
    } catch (e) {
      this.logger.error(e);
      return places;
    } finally {
      try {
        if (browser?.isConnected()) {
          await browser.close();
        }
      } catch {}
    }
  }

  private async extractDetails(page: Page, city: string): Promise<Place> {
    return page.evaluate(city => {
      const txt = (sel: string) =>
        (document.querySelector(sel) as HTMLElement)?.innerText?.trim() || '';

      const url = location.href;
      const coords = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

      const links = Array.from(document.querySelectorAll('a[href]')).map(
        a => (a as HTMLAnchorElement).href,
      );

      return {
        city,
        name: txt('h1.DUwDvf'),
        category: txt('button[jsaction*="category"]'),
        address: txt('button[data-item-id="address"]'),
        phone: txt('button[data-item-id^="phone"]'),
        website: (document.querySelector(
          'a[data-item-id="authority"]',
        ) as HTMLAnchorElement)?.href,
        instagram: links.find(l => l.includes('instagram.com')),
        facebook: links.find(l => l.includes('facebook.com')),
        rating: txt('span.ceNzR'),
        reviewsCount: txt('button[jsaction*="reviews"]'),
        topReview: txt('.wiI7pd'),
        isClaimed: document.body.innerText.includes('Reclamar') ? 'No' : 'Yes',
        latitude: coords?.[1],
        longitude: coords?.[2],
        googleUrl: url,
      };
    }, city);
  }

  private async scrollFeed(page: Page) {
    await page.evaluate(() => {
      document.querySelector('div[role="feed"]')?.scrollBy(0, 600);
    });
    await this.delay(1500);
  }

  private async scrapeEmailFromWebsite(browser: Browser, url: string): Promise<string> {
    const page = await browser.newPage();
    try {
      await page.setRequestInterception(true);
      page.on('request', r =>
        ['image', 'stylesheet', 'font'].includes(r.resourceType())
          ? r.abort()
          : r.continue(),
      );

      await page.goto(url, { timeout: 12000, waitUntil: 'domcontentloaded' });

      return await page.evaluate(() => {
        const match = document.body.innerHTML.match(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/,
        );
        return match?.[0] || '';
      });
    } catch {
      return '';
    } finally {
      await page.close();
    }
  }
}
