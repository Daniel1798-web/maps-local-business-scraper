import {
    Controller,
    Post,
    Body,
    BadRequestException,
  } from '@nestjs/common';
  import { CsvMapsService } from './csv-maps.service';
  import { Place } from '../maps/maps.service';
  
  @Controller('csv')
  export class CsvMapsController {
    constructor(private readonly csvService: CsvMapsService) {}
  
    @Post('save')
    saveToCsv(
      @Body()
      body: {
        places: Place[];
        fileName: string;
      },
    ): { message: string } {
      const { places, fileName } = body;
  
      if (!places || !Array.isArray(places) || places.length === 0) {
        throw new BadRequestException('places debe ser un array con datos');
      }
  
      if (!fileName) {
        throw new BadRequestException('fileName es obligatorio');
      }
  
      this.csvService.savePlaces(places, fileName);
  
      return {
        message: 'CSV generado correctamente',
      };
    }
  }
  