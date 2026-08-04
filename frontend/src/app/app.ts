import { Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MapsService, Place } from './services/maps';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-root',
  imports: [FormsModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private mapsService = inject(MapsService);

  country = 'Argentina';
  category = 'bares';
  city = 'Cordoba';
  limit = 10;

  loading = signal(false);
  results = signal<Place[]>([]);

  buscar() {
    this.loading.set(true);
    this.results.set([]);

    this.mapsService.search({
      country: this.country,
      category: this.category,
      cities: [this.city],
      limit: this.limit
    }).subscribe({
      next: (res: Place[]) => {
        this.results.set(res);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.loading.set(false);
      }
    });
  }

  exportarExcel() {
    const data = this.results();
    if (!data.length) return;

    const rows = data.map(item => ({
      Nombre: item.name,
      Categoría: item.category || '',
      Estado: this.estadoLabel(item.businessStatus),
      Ciudad: item.city,
      Dirección: item.address || '',
      Teléfono: item.phone || '',
      WhatsApp: item.whatsapp || '',
      Email: item.email || '',
      Website: item.website || '',
      Instagram: item.instagram || '',
      Facebook: item.facebook || '',
      Twitter: item.twitter || '',
      LinkedIn: item.linkedin || '',
      TikTok: item.tiktok || '',
      Rating: item.rating || '',
      'Nivel de Precio': item.priceLevel || '',
      'Horario': item.workingHours || '',
      Descripción: item.description || '',
      Latitud: item.latitude || '',
      Longitud: item.longitude || '',
      'Plus Code': item.plusCode || '',
      'URL Google Maps': item.googleUrl || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 22 }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Negocios');

    const fecha = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `negocios-${this.city}-${fecha}.xlsx`);
  }

  estadoLabel(status?: string): string {
    switch (status) {
      case 'Operational': return 'Activo';
      case 'Temporarily closed': return 'Cerrado temporalmente';
      case 'Permanently closed': return 'Cerrado permanentemente';
      default: return '-';
    }
  }

  estadoClass(status?: string): string {
    switch (status) {
      case 'Operational': return 'badge-active';
      case 'Temporarily closed': return 'badge-warning';
      case 'Permanently closed': return 'badge-closed';
      default: return 'badge-neutral';
    }
  }
}