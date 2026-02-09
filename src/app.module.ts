import { Module } from '@nestjs/common';
import { MapsModule } from './maps/maps.module';
import { CsvMapsModule } from './csv-maps/csv-maps.module';

@Module({
  imports: [MapsModule, CsvMapsModule],
})
export class AppModule {}
