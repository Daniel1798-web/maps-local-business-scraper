import { Module } from "@nestjs/common";
import { CsvMapsService } from "./csv-maps.service";

@Module({
  providers: [CsvMapsService],
  exports: [CsvMapsService]
})
export class CsvMapsModule {}
