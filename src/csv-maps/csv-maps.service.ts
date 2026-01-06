import { Injectable, Logger } from "@nestjs/common";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { Place } from "../maps/maps.service";

@Injectable()
export class CsvMapsService {
  private readonly logger = new Logger(CsvMapsService.name);

  private readonly outputDir = join(process.cwd(), "output");

  savePlaces(places: Place[], query: string) {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir);
    }

    const safeQuery = query
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .slice(0, 40);

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

    const filePath = join(this.outputDir, `leads_${safeQuery}_${timestamp}.csv`);

    const header =
      [
        "name",
        "category",
        "address",
        "phone",
        "website",
        "social",
        "socialType",
        "email",
        "rating",
        "reviewsCount"
      ].join(",") + "\n";

    const rows = places.map((p) =>
      [
        this.escape(p.name),
        this.escape(p.category),
        this.escape(p.address),
        this.escape(p.phone),
        this.escape(p.website),
        this.escape(p.social),
        this.escape(p.socialType),
        this.escape(p.email),
        this.escape(p.rating),
        this.escape(p.reviewsCount)
      ].join(",")
    );

    const csvContent = header + rows.join("\n");

    writeFileSync(filePath, csvContent, "utf8");

    this.logger.log(`CSV : ${filePath} (${places.length})`);
  }

  private escape(value?: string) {
    if (!value) return "";
    return `"${value.replace(/"/g, '""')}"`;
  }
}
