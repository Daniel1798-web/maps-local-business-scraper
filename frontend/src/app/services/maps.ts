import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Review {
  author: string;
  rating: string;
  date: string;
  text: string;
}

export interface Place {
  city: string;
  name: string;
  category?: string;
  address?: string;
  phone?: string;
  website: string;
  social: string;
  socialType: string;
  email?: string;
  rating?: string;
  reviewsCount?: string;
  businessStatus?: string;
  googleUrl?: string;
  workingHours?: string;
  priceLevel?: string;
  latitude?: string;
  longitude?: string;
  plusCode?: string;
  description?: string;
  photoUrl?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  linkedin?: string;
  tiktok?: string;
  whatsapp?: string;
  reviews?: Review[];
}

@Injectable({
  providedIn: 'root'
})
export class MapsService {

  private http = inject(HttpClient);

  search(data: any): Observable<Place[]> {
    return this.http.post<Place[]>(
      'http://localhost:3000/maps/search',
      data
    );
  }
}