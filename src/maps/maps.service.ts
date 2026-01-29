import { Injectable, Logger } from "@nestjs/common";
import puppeteer, { Page, Browser } from "puppeteer";

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
}

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
  
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en`;
  
    try {
      await page.goto(url, { waitUntil: "networkidle2" });
  
      await page.waitForSelector('div[role="feed"]', { timeout: 10000 });
  
      let retryCount = 0;
      
      while (places.length < limit && retryCount < 10) {
        const cards = await page.$$('div[role="article"]');
        let foundNewInThisScroll = false;
  
        for (const card of cards) {
          if (places.length >= limit) break;

          const name = await card.evaluate(el => el.querySelector(".fontHeadlineSmall")?.textContent?.trim());

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
                  this.logger.log(`Buscando email en: ${scraped.website}...`);
                  scraped.email = await this.scrapeEmailFromWebsite(browser, scraped.website);
                }

                seenNames.add(scraped.name);
                places.push(scraped);
                foundNewInThisScroll = true;
                this.logger.log(`[${city}] (${places.length}/${limit}) Extraído: ${scraped.name} ${scraped.email ? '📧' : ''}`);
              }
            } catch (e) {
              this.logger.error(`Error procesando tarjeta: ${name}`);
              continue;
            }
          }
        }
  
        await this.scrollFeed(page);
        
        if (!foundNewInThisScroll) {
          retryCount++;
          this.logger.warn(`No se hallaron nuevos resultados, reintento ${retryCount}/10...`);
        } else {
          retryCount = 0;
        }
      }
  
      return places;
    } finally {
      await browser.close();
    }
  }

  private async extractDetails(page: Page, cityName: string): Promise<Place> {
    return page.evaluate((city) => {
      const clean = (text: string) => {
        if (!text) return "";
        return text.replace(/[^\x20-\x7EÀ-ÿ]/g, "").replace(/\s+/g, " ").trim();
      };
      
      const getText = (sel: string) => (document.querySelector(sel) as HTMLElement)?.innerText || "";

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
        googleUrl: window.location.href
      };
    }, cityName);
  }

  private async waitForPlaceChange(page: Page) {
    try {
      await page.waitForFunction(
        () => {
          const title = document.querySelector("h1.DUwDvf")?.textContent?.trim();
          return title && title.length > 0;
        },
        { timeout: 5000 }
      );
    } catch {
      //
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

  private async scrapeEmailFromWebsite(browser: Browser, url: string): Promise<string> {
    if (!url || url.includes("t.co") || url.includes("instagram.com")) return "";
    
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

      const extractEmails = async () => {
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

          return filtered.length > 0 ? filtered[0] : "";
        });
      };

      let email = await extractEmails();

      if (!email && !url.includes("facebook.com")) {
        const contactHref = await page.evaluate(() => {
          const a = Array.from(document.querySelectorAll('a')).find(el => 
            /contacto|contact|about|nosotros/i.test(el.innerText) || /contact/i.test(el.href)
          );
          return a ? a.href : null;
        });

        if (contactHref) {
          await page.goto(contactHref, { waitUntil: "networkidle2", timeout: 15000 });
          email = await extractEmails();
        }
      }

      await page.close();
      return email.toLowerCase().trim();
    } catch (e) {
      await page.close();
      return "";
    }
  }


  








}
