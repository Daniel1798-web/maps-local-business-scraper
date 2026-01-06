import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { MapsService } from "./maps/maps.service";
import { CsvMapsService } from "./csv-maps/csv-maps.service";

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const mapsService = app.get(MapsService);
  const csvService = app.get(CsvMapsService);

  const COUNTRY = "Argentina";
  const LOCATION = "Córdoba";

  const BUSINESS_QUERIES = [
    "peluquería",
    "panadería",
    "ferretería",
    "taller mecánico",
    "kiosco",
    "estudio contable",
    "consultorio",
    "local comercial"
  ];

  const LIMIT_PER_QUERY = 100;

  for (const business of BUSINESS_QUERIES) {
    const searchQuery = `${business} en ${LOCATION} ${COUNTRY}`;

    const places = await mapsService.getPlaces(searchQuery, LIMIT_PER_QUERY);

    csvService.savePlaces(places, searchQuery);
  }

  await app.close();
}

void bootstrap();
