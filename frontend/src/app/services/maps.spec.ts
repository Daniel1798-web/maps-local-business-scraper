import { TestBed } from '@angular/core/testing';

import { MapsService } from './maps';

describe('Maps', () => {
  let service: MapsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MapsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
