import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface DailyForecast {
  date: string; tempMax: number; tempMin: number;
  precipitationSum: number; precipitationProbability: number; weatherCode: number;
}

export interface WeatherRecommendation {
  id: string; severity: 'info' | 'warning' | 'danger'; icon: string; title: string; message: string;
}

export interface WeatherResponse {
  available: boolean;
  reason?: 'no_location' | 'geocode_failed' | 'weather_api_error';
  location?: { lat: number; lng: number; resolvedName?: string };
  daily?: DailyForecast[];
  recommendations?: WeatherRecommendation[];
}

@Injectable({ providedIn: 'root' })
export class WeatherService {
  constructor(private api: ApiService) {}

  getForecast(farmId: number) {
    return this.api.get<WeatherResponse>(`/farms/${farmId}/weather`);
  }
}
