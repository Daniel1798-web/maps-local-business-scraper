import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { MapsModule } from "./maps/maps.module";
import { CsvMapsModule } from "./csv-maps/csv-maps.module";

@Module({
  imports: [MapsModule, CsvMapsModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
