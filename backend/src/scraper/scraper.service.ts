import { Injectable } from "@nestjs/common";
import { MapsService, Place } from "../maps/maps.service";
import { CsvMapsService } from "../csv-maps/csv-maps.service";
import { SearchDto } from "./dto/search.dto";

@Injectable()
export class ScraperService {
  constructor(
    private readonly mapsService: MapsService,
    private readonly csvService: CsvMapsService
  ) {}

async search(dto: SearchDto): Promise<Place[]> {
  const results: Place[] = [];


  for (const city of dto.cities) {
    const query = `${dto.category} in ${city}, ${dto.country}`;

    const places = await this.mapsService.getPlaces(query, city, dto.limit);

    results.push(...places);

 
  }

  return results;
}
}