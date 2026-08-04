import { Injectable, Logger } from "@nestjs/common";
import puppeteer, { Page, Browser } from "puppeteer";

export interface Review {
  author: string;
  rating: string;
  date: string;
  text: string;
}

export interface Place {
  city: string;
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
  businessStatus?: string;
  googleUrl?: string;
  workingHours?: string;
  priceLevel?: string;
  latitude?: string;
  longitude?: string;
  plusCode?: string;
  description?: string;
  photoUrl?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  tiktok?: string;
  whatsapp?: string;
  reviews?: Review[];
}

const REVIEWS_PER_PLACE = 3;

@Injectable()
export class MapsService {
  private readonly logger = new Logger(MapsService.name);
  private seen = new Set<string>();

  async getPlaces(query: string, city: string, limit = 100): Promise<Place[]> {
    const places: Place[] = [];
    const seenNames = new Set<string>();

    const browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--start-maximized"]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en`;

    try {
      await page.goto(searchUrl, { waitUntil: "networkidle2" });
      await page.waitForSelector('div[role="feed"]', { timeout: 15000 });

      let retryCount = 0;

      while (places.length < limit && retryCount < 10) {
        let cards;
        try {
          cards = await page.$$('div[role="article"]');
        } catch (e) {
          this.logger.error(`Error obteniendo tarjetas: ${e}`);
          break;
        }

        let foundNewInThisScroll = false;

        for (const card of cards) {
          if (places.length >= limit) break;

          let name: string | undefined;
          try {
            name = await card.evaluate(el => el.querySelector(".fontHeadlineSmall")?.textContent?.trim());
          } catch {
            continue;
          }

          if (name && !seenNames.has(name)) {
            try {
              await card.evaluate(el => el.scrollIntoView());
              await new Promise(r => setTimeout(r, 500));

              await card.click();

              await page.waitForSelector('h1.DUwDvf', { timeout: 5000 });
              await new Promise(r => setTimeout(r, 1500));

              const scraped = await this.extractDetails(page, city);

              if (scraped.name) {
                if (scraped.website && scraped.website.length > 5) {
                  this.logger.log(`Buscando datos en: ${scraped.website}...`);
                  const extra = await this.scrapeWebsiteExtras(browser, scraped.website);
                  scraped.email = extra.email;
                  scraped.instagram = extra.instagram;
                  scraped.facebook = extra.facebook;
                  scraped.twitter = extra.twitter;
                  scraped.linkedin = extra.linkedin;
                  scraped.tiktok = extra.tiktok;
                  scraped.whatsapp = extra.whatsapp;
                }

                scraped.reviews = await this.scrapeReviews(page);

                seenNames.add(scraped.name);
                places.push(scraped);
                foundNewInThisScroll = true;
                this.logger.log(`[${city}] (${places.length}/${limit}) Extraído: ${scraped.name} ${scraped.email ? '📧' : ''}`);
              }
            } catch (e) {
              this.logger.error(`Error procesando tarjeta: ${name}`);
            } finally {
              await this.returnToResultsList(page, searchUrl);
            }
          }
        }

        try {
          await this.scrollFeed(page);
        } catch (e) {
          this.logger.warn('No se pudo hacer scroll al feed');
          break;
        }

        if (!foundNewInThisScroll) {
          retryCount++;
          this.logger.warn(`No se hallaron nuevos resultados, reintento ${retryCount}/10...`);
        } else {
          retryCount = 0;
        }
      }

      return places;
    } catch (e) {
      this.logger.error(`Error general en getPlaces: ${e}`);
      return places;
    } finally {
      await browser.close();
    }
  }

  private async returnToResultsList(page: Page, searchUrl: string) {
    try {
      const hasFeed = await page.$('div[role="feed"]');
      if (hasFeed) return;

      await page.goBack({ waitUntil: "networkidle2", timeout: 8000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 500));

      const hasFeedAfterOneBack = await page.$('div[role="feed"]');
      if (hasFeedAfterOneBack) return;

      await page.goBack({ waitUntil: "networkidle2", timeout: 8000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 500));

      const hasFeedAfterTwoBacks = await page.$('div[role="feed"]');
      if (hasFeedAfterTwoBacks) return;

      await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 15000 });
      await page.waitForSelector('div[role="feed"]', { timeout: 10000 });
    } catch (e) {
      this.logger.warn('No se pudo volver al listado, recargando búsqueda...');
      try {
        await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 15000 });
        await page.waitForSelector('div[role="feed"]', { timeout: 10000 });
      } catch {
        //
      }
    }
  }

  private async extractDetails(page: Page, cityName: string): Promise<Place> {
    return page.evaluate((city) => {
      const clean = (text: string) => {
        if (!text) return "";
        return text.replace(/[^\x20-\x7EÀ-ÿ]/g, "").replace(/\s+/g, " ").trim();
      };

      const getText = (sel: string) => (document.querySelector(sel) as HTMLElement)?.innerText || "";

      const href = window.location.href;
      const coordMatch = href.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
      const latitude = coordMatch ? coordMatch[1] : "";
      const longitude = coordMatch ? coordMatch[2] : "";

      const bodyTextSample = document.body.innerText.slice(0, 3000).toLowerCase();
      let businessStatus = "Operational";
      if (bodyTextSample.includes("permanently closed")) businessStatus = "Permanently closed";
      else if (bodyTextSample.includes("temporarily closed")) businessStatus = "Temporarily closed";

      const descriptionCandidates = [
        '.PYvSYb', '.WeS02d.fontBodyMedium', 'div[jsaction*="pane.wfvdle"] div.fontBodyMedium'
      ];
      let description = "";
      for (const sel of descriptionCandidates) {
        const el = document.querySelector(sel) as HTMLElement;
        if (el?.innerText) { description = el.innerText; break; }
      }

      const photoEl = document.querySelector('button[jsaction*="heroHeaderImage"] img, .ZKCDEc img, .aoRNLd img') as HTMLImageElement;
      const photoUrl = photoEl?.src || "";

      return {
        city,
        name: clean(getText("h1.DUwDvf")),
        category: clean(getText('button[jsaction*="category"]') || document.querySelector('.fontBodyMedium span button')?.textContent || ""),
        address: clean(getText('button[data-item-id="address"]')),
        phone: clean(getText('button[data-item-id^="phone"]')),
        website: (document.querySelector('a[data-item-id="authority"]') as HTMLAnchorElement)?.href || "",
        social: "", socialType: "", email: "",
        rating: getText("span.ceNzR") || getText("div.F7nice span:first-child"),
        reviewsCount: (getText('button[jsaction*="reviews"]') || "").replace(/[^0-9]/g, ""),
        workingHours: Array.from(document.querySelectorAll('div[aria-label*="Hours"] table tr'))
                           .map(r => clean((r as HTMLElement).innerText)).join(" | "),
        priceLevel: clean(getText('span[aria-label*="Price"]')),
        googleUrl: href,
        latitude,
        longitude,
        plusCode: clean(getText('button[data-item-id="oloc"]')),
        description: clean(description),
        businessStatus,
        photoUrl
      };
    }, cityName);
  }

  private async scrapeReviews(page: Page): Promise<Review[]> {
    try {
      const reviewsTabButton = await page.$('button[aria-label*="Reviews for"], button[jsaction*="pane.rating.moreReviews"]');
      if (!reviewsTabButton) return [];

      await reviewsTabButton.click();
      await page.waitForSelector('div.jftiEf', { timeout: 5000 });
      await new Promise(r => setTimeout(r, 1000));

      const reviews = await page.evaluate((max) => {
        const clean = (text: string) => {
          if (!text) return "";
          return text.replace(/[^\x20-\x7EÀ-ÿ]/g, "").replace(/\s+/g, " ").trim();
        };

        const nodes = Array.from(document.querySelectorAll('div.jftiEf')).slice(0, max);

        return nodes.map(node => {
          const author = (node.querySelector('.d4r55') as HTMLElement)?.innerText || "";
          const ratingLabel = (node.querySelector('span[role="img"]') as HTMLElement)?.getAttribute('aria-label') || "";
          const ratingMatch = ratingLabel.match(/(\d+(\.\d+)?)/);
          const rating = ratingMatch ? ratingMatch[1] : "";
          const date = (node.querySelector('.rsqaWe') as HTMLElement)?.innerText || "";
          const text = (node.querySelector('.wiI7pd') as HTMLElement)?.innerText || "";

          return {
            author: clean(author),
            rating,
            date: clean(date),
            text: clean(text)
          };
        });
      }, REVIEWS_PER_PLACE);

      return reviews;
    } catch (e) {
      this.logger.error(`Error scrapeando reseñas: ${e}`);
      return [];
    }
  }

  private async scrollFeed(page: Page) {
    await page.evaluate(() => {
      const feed = document.querySelector('div[role="feed"]');
      if (feed) {
        feed.scrollTop = feed.scrollHeight;
      }
    });
    await new Promise(r => setTimeout(r, 2500));
  }

  private async scrapeWebsiteExtras(browser: Browser, url: string): Promise<{
    email: string;
    instagram: string;
    facebook: string;
    twitter: string;
    linkedin: string;
    tiktok: string;
    whatsapp: string;
  }> {
    const empty = { email: "", instagram: "", facebook: "", twitter: "", linkedin: "", tiktok: "", whatsapp: "" };
    if (!url) return empty;

    const page = await browser.newPage();
    try {
      let targetUrl = url;

      if (url.includes("facebook.com")) {
        targetUrl = url.replace("www.facebook.com", "m.facebook.com");
        if (!targetUrl.includes("about")) {
          targetUrl = targetUrl.endsWith('/') ? `${targetUrl}about` : `${targetUrl}/about`;
        }
        await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1");
      } else {
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
      }

      await page.goto(targetUrl, { waitUntil: "networkidle2", timeout: 20000 });

      const extract = async () => {
        return await page.evaluate(() => {
          const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,4}/g;
          const bodyText = document.body.innerText;
          const htmlContent = document.documentElement.innerHTML;

          const raw = [...(bodyText.match(regex) || []), ...(htmlContent.match(regex) || [])];

          const blacklist = [
            '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.js', '.css',
            'example', 'domain', 'sentry', 'wix', 'bootstrap', 'jquery', 'google', 'email@'
          ];

          const filtered = raw.filter(e => {
            const low = e.toLowerCase();
            return !blacklist.some(bad => low.includes(bad)) && low.length > 6;
          });

          const links = Array.from(document.querySelectorAll('a')).map(a => (a as HTMLAnchorElement).href);

          const findLink = (domain: string) => links.find(l => l.toLowerCase().includes(domain)) || "";

          return {
            email: filtered.length > 0 ? filtered[0] : "",
            instagram: findLink("instagram.com"),
            facebook: findLink("facebook.com"),
            twitter: findLink("twitter.com") || findLink("x.com"),
            linkedin: findLink("linkedin.com"),
            tiktok: findLink("tiktok.com"),
            whatsapp: findLink("wa.me") || findLink("api.whatsapp.com")
          };
        });
      };

      let data = await extract();

      if (!data.email && !url.includes("facebook.com")) {
        const contactHref = await page.evaluate(() => {
          const a = Array.from(document.querySelectorAll('a')).find(el =>
            /contacto|contact|about|nosotros/i.test(el.innerText) || /contact/i.test(el.href)
          );
          return a ? a.href : null;
        });

        if (contactHref) {
          await page.goto(contactHref, { waitUntil: "networkidle2", timeout: 15000 });
          const contactData = await extract();
          data = {
            email: contactData.email || data.email,
            instagram: contactData.instagram || data.instagram,
            facebook: contactData.facebook || data.facebook,
            twitter: contactData.twitter || data.twitter,
            linkedin: contactData.linkedin || data.linkedin,
            tiktok: contactData.tiktok || data.tiktok,
            whatsapp: contactData.whatsapp || data.whatsapp
          };
        }
      }

      await page.close();
      return {
        email: data.email.toLowerCase().trim(),
        instagram: data.instagram,
        facebook: data.facebook,
        twitter: data.twitter,
        linkedin: data.linkedin,
        tiktok: data.tiktok,
        whatsapp: data.whatsapp
      };
    } catch (e) {
      await page.close();
      return empty;
    }
  }
}