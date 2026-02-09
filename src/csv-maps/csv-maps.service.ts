import { Injectable } from "@nestjs/common";
import { appendFileSync, existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
import { Place } from "../maps/maps.service";

@Injectable()
export class CsvMapsService {
  private readonly outputDir = join(process.cwd(), "output");

  savePlaces(places: Place[], fileName: string) {
    if (!existsSync(this.outputDir)) mkdirSync(this.outputDir, { recursive: true });
    
    const filePath = join(this.outputDir, `${fileName}.csv`);
    const BOM = "\uFEFF";

    const headerFields = [
      "City", 
      "Name", 
      "Category", 
      "Address", 
      "Phone", 
      "Website", 
      "Email", 
      "Instagram", 
      "Facebook", 
      "Rating", 
      "Reviews Count", 
      "Claimed",
      "Attributes",
      "Top Review",
      "Working Hours",
      "Image URL",
      "Latitude", 
      "Longitude", 
      "Google URL"
    ];

    const header = headerFields.join(",") + "\n";

    const existingNames = new Set<string>();
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf8');
        content.split('\n').forEach(line => {
          const columns = line.split(',');
          if (columns[1]) {
            const name = columns[1].replace(/"/g, '').trim();
            const normalized = name
              .toLowerCase()
              .replace(/[^\w\s]/g, '')
              .trim();
            existingNames.add(normalized);
          }
        });
      } catch (e) {
        console.error("Error leyendo archivo existente:", e);
      }
    }

    const rows = places
      .filter(p => {
        const normalized = p.name
          .toLowerCase()
          .replace(/[^\w\s]/g, '')
          .trim();
        return !existingNames.has(normalized);
      })
      .map(p => [
        this.escape(p.city),
        this.escape(p.name),
        this.escape(p.category),
        this.escape(p.address),
        this.escape(p.phone),
        this.escape(p.website),
        this.escape(p.email),
        this.escape(p.instagram),
        this.escape(p.facebook),
        this.escape(p.rating),
        this.escape(p.reviewsCount),
        this.escape(p.isClaimed),
        this.escape(p.attributes),
        this.escape(p.topReview),
        this.escape(p.workingHours),
        this.escape(p.imageUrl),
        this.escape(p.latitude),
        this.escape(p.longitude),
        this.escape(p.googleUrl)
      ].join(","))
      .join("\n");

    if (rows.length === 0) {
      console.log("No hay filas nuevas para guardar (todos son duplicados)");
      return;
    }

    if (!existsSync(filePath)) {
      writeFileSync(filePath, BOM + header + rows + "\n", "utf8");
    } else {
      appendFileSync(filePath, rows + "\n", "utf8");
    }
  }

  private escape(value?: any) {
    if (value === undefined || value === null) return '""';
    const str = String(value);
    const cleanValue = str
      .replace(/"/g, '""')       
      .replace(/\r?\n|\r/g, " ") 
      .trim();
    return `"${cleanValue}"`;
  }
}