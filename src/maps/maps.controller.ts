import { Controller, Get, Query } from '@nestjs/common';
import { MapsService } from './maps.service';
import { Place } from './maps.service';

@Controller('maps')
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get('search')
  async search(
    @Query('query') query: string,
    @Query('city') city: string,
    @Query('limit') limit = '20'
  ): Promise<Place[]> {
    return this.mapsService.getPlaces(
      query,
      city,
      Number(limit)
    );
  }
}
