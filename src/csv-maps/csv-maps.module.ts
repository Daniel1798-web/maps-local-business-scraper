import { Module } from '@nestjs/common';
import { CsvMapsService } from './csv-maps.service';
import { CsvMapsController } from './csv-maps.controller';

@Module({
  controllers: [CsvMapsController],
  providers: [CsvMapsService],
  exports: [CsvMapsService],
})
export class CsvMapsModule {}
