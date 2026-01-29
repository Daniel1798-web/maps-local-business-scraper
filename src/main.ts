import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { MapsService } from "./maps/maps.service";
import { CsvMapsService } from "./csv-maps/csv-maps.service";
import { Logger } from "@nestjs/common";

async function bootstrap() {
  const logger = new Logger("GlobalScraper");
  const app = await NestFactory.createApplicationContext(AppModule);

  const mapsService = app.get(MapsService);
  const csvService = app.get(CsvMapsService);

  const COUNTRY = "Argentina";
  const CATEGORY = "contadores";
  const CITIES = ["Cordoba"];
  const LIMIT_PER_CITY = 50;

  const sessionFileName = `Leads_${COUNTRY}_${CATEGORY}`.replace(/\s/g, "_");

  for (const city of CITIES) {
    const query = `${CATEGORY} in ${city}, ${COUNTRY}`;
    logger.log(`Iniciando búsqueda: ${query}`);

    try {
      const results = await mapsService.getPlaces(query, city, LIMIT_PER_CITY);

      if (results.length > 0) {
        csvService.savePlaces(results, sessionFileName);
        logger.log(`${city} completado con ${results.length} resultados.`);
      }
    } catch (err) {
      logger.error(`Error en ${city}: ${err instanceof Error ? err.message : err}`);
    }

    await new Promise((r) => setTimeout(r, Math.random() * 3000 + 2000));
  }

  logger.log("Finalizado. Revisa la carpeta /output");
  await app.close();
}
void bootstrap();
