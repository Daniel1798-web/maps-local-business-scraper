import { Module } from "@nestjs/common";
import { MapsModule } from "./maps/maps.module";
import { CsvMapsModule } from "./csv-maps/csv-maps.module";
import { ScraperController } from "./scraper/scraper.controller";
import { ScraperService } from "./scraper/scraper.service";

@Module({
  imports: [MapsModule, CsvMapsModule],
  controllers: [ScraperController],
  providers: [ScraperService]
})
export class AppModule {}