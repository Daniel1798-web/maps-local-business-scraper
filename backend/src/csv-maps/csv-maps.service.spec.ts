import { Test, TestingModule } from "@nestjs/testing";
import { CsvMapsService } from "./csv-maps.service";

describe("CsvMapsService", () => {
  let service: CsvMapsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CsvMapsService]
    }).compile();

    service = module.get<CsvMapsService>(CsvMapsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
