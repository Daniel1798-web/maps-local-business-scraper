import { Module } from '@nestjs/common';
import { MapsService } from './maps.service';
import { MapsController } from './maps.controller';
import { CsvMapsModule } from '../csv-maps/csv-maps.module';

@Module({
  imports: [CsvMapsModule],
  controllers: [MapsController],
  providers: [MapsService],
  exports: [MapsService],
})
export class MapsModule {}
