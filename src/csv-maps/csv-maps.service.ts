import { Injectable } from "@nestjs/common";
import { appendFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { Place } from "../maps/maps.service";

@Injectable()
export class CsvMapsService {
  private readonly outputDir = join(process.cwd(), "output");

  savePlaces(places: Place[], fileName: string) {
    if (!existsSync(this.outputDir)) mkdirSync(this.outputDir, { recursive: true });
    const filePath = join(this.outputDir, `${fileName}.csv`);
    const BOM = "\uFEFF";

    const existingIds = new Set<string>();
    if (existsSync(filePath)) {
        const content = require('fs').readFileSync(filePath, 'utf8');
        content.split('\n').forEach(line => {
            const columns = line.split(',');
            if (columns[1]) existingIds.add(columns[1].replace(/"/g, '').trim());
        });
    }

    const header = [
        "City", "Name", "Category", "Address", "Phone", "Website", "Email", 
        "Rating", "Reviews", "Working Hours", "Price Level", "Google Maps URL"
    ].join(",") + "\n";

    const rows = places
        .filter(p => !existingIds.has(p.name.trim())) 
        .map(p => [
            this.escape(p.city),
            this.escape(p.name),
            this.escape(p.category),
            this.escape(p.address),
            this.escape(p.phone),
            this.escape(p.website),
            this.escape(p.email),
            this.escape(p.rating),
            this.escape(p.reviewsCount),
            this.escape(p.workingHours),
            this.escape(p.priceLevel),
            this.escape(p.googleUrl)
        ].join(","))
        .join("\n");

    if (rows.length === 0) return;

    if (!existsSync(filePath)) {
        writeFileSync(filePath, BOM + header + rows + "\n", "utf8");
    } else {
        appendFileSync(filePath, rows + "\n", "utf8");
    }
}

  private escape(value?: string) {
    if (!value) return '""';
    const cleanValue = value
      .replace(/"/g, '""')
      .replace(/\s+/g, " ")
      .trim();
    return `"${cleanValue}"`;
  }
}
