import { Body, Controller, Post } from "@nestjs/common";
import { ScraperService } from "./scraper.service";
import { SearchDto } from "./dto/search.dto";

@Controller("maps")
export class ScraperController {
  constructor(private readonly scraperService: ScraperService) {}

  @Post("search")
  search(@Body() dto: SearchDto) {
    return this.scraperService.search(dto);
  }
}