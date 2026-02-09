import { Injectable, Logger } from "@nestjs/common";
import puppeteer, { Page, Browser } from "puppeteer";

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
    const seenNames = new Set<string>();
    const seenAddresses = new Set<string>();

    const browser = await puppeteer.launch({
      headless: false,
      args: ["--no-sandbox", "--start-maximized", "--lang=es-ES"]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=es`;

    try {
      await page.goto(url, { waitUntil: "networkidle2" });
      
      let scrollAttempts = 0;
      const maxScrolls = 10;
      
      while (places.length < limit && scrollAttempts < maxScrolls) {
        const cards = await page.$$('div[role="article"]');
        let foundNew = false;

        for (const card of cards) {
          if (places.length >= limit) break;

          const cardData = await card.evaluate(el => {
            const name = el.querySelector(".fontHeadlineSmall")?.textContent?.trim() || "";
            const address = el.querySelector('div.W4Efsd span:last-child')?.textContent?.trim() || "";
            return { name, address };
          });

          const { name, address } = cardData;
          
          const normalizedName = name
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .trim();
          
          const normalizedAddress = address
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .trim();
          
          const uniqueKey = `${normalizedName}|${normalizedAddress}`;
          
          if (!name) continue;
          
          if (seenNames.has(normalizedName) || (normalizedAddress && seenAddresses.has(uniqueKey))) {
            this.logger.debug(`Saltando duplicado: ${name}`);
            continue;
          }

          try {
            await card.evaluate(el => el.scrollIntoView());
            await this.delay(500);
            await card.click();

            await page.waitForSelector('h1.DUwDvf', { timeout: 7000 });
            
            try {
              const expandBtn = await page.$('button[jsaction*="review.expand"], button[aria-label*="Más"]');
              if (expandBtn) {
                await expandBtn.click();
                await this.delay(500);
              }
            } catch (e) { }
            
            await this.delay(1200);

            const scraped = await this.extractDetails(page, city);
            
            const scrapedNormalizedName = scraped.name
              .toLowerCase()
              .replace(/[^\w\s]/g, '')
              .trim();
            
            const scrapedNormalizedAddress = (scraped.address || "")
              .toLowerCase()
              .replace(/[^\w\s]/g, '')
              .trim();
            
            const scrapedKey = `${scrapedNormalizedName}|${scrapedNormalizedAddress}`;
            
            if (seenNames.has(scrapedNormalizedName) || (scrapedNormalizedAddress && seenAddresses.has(scrapedKey))) {
              this.logger.warn(`Duplicado detectado después de scraping: ${scraped.name}`);
              continue;
            }
            
            if (scraped.website && !scraped.website.includes("instagram.com") && !scraped.website.includes("facebook.com")) {
              scraped.email = await this.scrapeEmailFromWebsite(browser, scraped.website);
            }

            seenNames.add(scrapedNormalizedName);
            if (scrapedNormalizedAddress) {
              seenAddresses.add(scrapedKey);
            }
            
            places.push(scraped);
            foundNew = true;
            this.logger.log(`[${city}] Extraído (${places.length}/${limit}): ${scraped.name}`);
          } catch (e) { 
            this.logger.error(`Error procesando ${name}: ${e}`);
            continue; 
          }
        }

        if (!foundNew) {
          await this.scrollFeed(page);
          scrollAttempts++;
          this.logger.debug(`Scroll ${scrollAttempts}/${maxScrolls} - Sin nuevos resultados`);
        } else { 
          scrollAttempts = 0;
        }
      }
      
      this.logger.log(`Extracción finalizada: ${places.length} lugares únicos encontrados`);
      return places;
    } finally {
      await browser.close();
    }
  }

  private async extractDetails(page: Page, cityName: string): Promise<Place> {
    return page.evaluate((city) => {
      const getTxt = (sel: string) => (document.querySelector(sel) as HTMLElement)?.innerText?.trim() || "";
      const clean = (str: string) => str.replace(/[\x00-\x1F\x7F-\x9F]/g, "").trim();

      const website = (document.querySelector('a[data-item-id="authority"]') as HTMLAnchorElement)?.href || "";
      const url = window.location.href;
      
      let attributes = "";
      const featureButtons = Array.from(document.querySelectorAll('button.hh2c6'))
        .map(btn => (btn as HTMLElement).innerText?.trim())
        .filter(t => t && t.length > 2 && t.length < 50)
        .join(" | ");
      
      const serviceLabels = Array.from(document.querySelectorAll('div[class*="accessibility"], div[role="img"][aria-label]'))
        .map(el => el.getAttribute('aria-label') || '')
        .filter(t => t && t.length > 3 && t.length < 60)
        .join(" | ");
      
      const glanceSection = document.querySelector('div[aria-label*="vistazo"], div[aria-label*="glance"]');
      const glanceItems = glanceSection 
        ? Array.from(glanceSection.querySelectorAll('span'))
            .map(s => (s as HTMLElement).innerText?.trim())
            .filter(t => t && t.length > 3)
            .join(" | ")
        : "";
      
      const iconLabels = Array.from(document.querySelectorAll('div.AeaXub span.fontBodyMedium'))
        .map(s => (s as HTMLElement).innerText?.trim())
        .filter(t => t && t.length > 2 && t.length < 40)
        .join(" | ");
      
      attributes = [featureButtons, serviceLabels, glanceItems, iconLabels]
        .filter(a => a.length > 0)
        .join(" | ");

      let topReview = "";
      const reviewElement = document.querySelector('.MyEned, .wiI7pd, .review-full-text') as HTMLElement;
      if (reviewElement) {
        topReview = clean(reviewElement.innerText);
      } else {
        const firstReview = document.querySelector('[data-review-id] span[class*="review"], .rsqaWe') as HTMLElement;
        topReview = firstReview ? clean(firstReview.innerText) : "";
      }
      topReview = topReview.replace(/\s*Más\s*$/, '').trim();

      const isClaimed = !document.body.innerText.includes("Reclamar este negocio") && 
                        !document.body.innerText.includes("Own this business") &&
                        !document.body.innerText.includes("Claim this business");

      const hours = Array.from(document.querySelectorAll('table.CsEnBe tr'))
        .map(tr => (tr as HTMLElement).innerText.replace(/\s+/g, " "))
        .join(" ; ");

      let imageUrl = "";
      const mainPhoto = document.querySelector('button[jsaction*="pane.place.photo"] img') as HTMLImageElement;
      if (mainPhoto && mainPhoto.src && mainPhoto.src.includes('googleusercontent')) {
        imageUrl = mainPhoto.src;
      }

      if (!imageUrl) {
        const carouselImg = document.querySelector('div.eKbjU img, button.aoRNLd img') as HTMLImageElement;
        if (carouselImg && carouselImg.src && carouselImg.src.includes('googleusercontent')) {
          imageUrl = carouselImg.src;
        }
      }

      if (!imageUrl) {
        const allImages = Array.from(document.querySelectorAll('img'))
          .filter(img => {
            const src = (img as HTMLImageElement).src || '';
            const parent = img.parentElement;
            return (
              (src.includes('googleusercontent.com') || src.includes('ggpht.com')) &&
              !src.includes('gstatic.com/images') &&
              !src.includes('maps/api/js') &&
              (img as HTMLImageElement).width > 100 &&
              !parent?.getAttribute('aria-label')?.includes('Mapa')
            );
          });
        
        if (allImages.length > 0) {
          imageUrl = (allImages[0] as HTMLImageElement).src;
        }
      }

      if (imageUrl) {
        const baseUrl = imageUrl.split('=')[0];
        imageUrl = baseUrl + '=s1000';
      }

      const coords = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      const allLinks = Array.from(document.querySelectorAll('a[href]')).map(a => (a as HTMLAnchorElement).href);

      let reviewsCount = "0";
      const reviewButton = document.querySelector('button[jsaction*="reviews"]') as HTMLElement;
      if (reviewButton) {
        const text = reviewButton.innerText || "";
        const match = text.match(/\(?([\d,\.]+)\)?/);
        if (match) {
          reviewsCount = match[1].replace(/[,\.]/g, "");
        }
      }
      
      if (reviewsCount === "0") {
        const ratingArea = document.querySelector('div.F7nice') as HTMLElement;
        if (ratingArea) {
          const spans = ratingArea.querySelectorAll('span');
          for (const span of spans) {
            const text = (span as HTMLElement).innerText || "";
            const match = text.match(/\(?([\d,\.]+)\)?/);
            if (match && !text.includes("★") && !text.includes(",")) {
              reviewsCount = match[1].replace(/[,\.]/g, "");
              break;
            }
          }
        }
      }

      if (reviewsCount === "0") {
        const elements = document.querySelectorAll('[aria-label*="reseña"], [aria-label*="review"]');
        for (const el of elements) {
          const ariaLabel = el.getAttribute('aria-label') || "";
          const match = ariaLabel.match(/([\d,\.]+)\s*(reseña|review)/i);
          if (match) {
            reviewsCount = match[1].replace(/[,\.]/g, "");
            break;
          }
        }
      }

      return {
        city,
        name: clean(getTxt("h1.DUwDvf")),
        category: clean(getTxt('button[jsaction*="category"]')),
        address: clean(getTxt('button[data-item-id="address"]')),
        phone: clean(getTxt('button[data-item-id^="phone"]')),
        website: website.includes("instagram") || website.includes("facebook") ? "" : website,
        instagram: allLinks.find(l => l.includes("instagram.com")) || (website.includes("instagram.com") ? website : ""),
        facebook: allLinks.find(l => l.includes("facebook.com")) || (website.includes("facebook.com") ? website : ""),
        rating: getTxt("span.ceNzR") || getTxt("div.F7nice span"),
        reviewsCount,
        topReview,
        attributes,
        isClaimed: isClaimed ? "Yes" : "No",
        workingHours: hours,
        imageUrl,
        latitude: coords?.[1] || "",
        longitude: coords?.[2] || "",
        googleUrl: url
      };
    }, cityName);
  }

  private async scrollFeed(page: Page) {
    await page.evaluate(() => {
      const feed = document.querySelector('div[role="feed"]');
      if (feed) feed.scrollBy(0, 600);
    });
    await this.delay(2000);
  }

  private async scrapeEmailFromWebsite(browser: Browser, url: string): Promise<string> {
    const page = await browser.newPage();
    try {
      await page.setRequestInterception(true);
      page.on('request', r => ['image', 'stylesheet', 'font'].includes(r.resourceType()) ? r.abort() : r.continue());
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 12000 });
      return await page.evaluate(() => {
        const regex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}/g;
        return (document.documentElement.innerHTML.match(regex) || [])[0] || "";
      });
    } catch { return ""; } finally { await page.close(); }
  }
}