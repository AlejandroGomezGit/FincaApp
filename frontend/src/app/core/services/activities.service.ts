import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface Activity {
  id: number; name: string; category: string; cropId: number;
  startDate: string; endDate?: string; status: string; description?: string;
  totalJornales?: number; totalCostJornales?: number;
  _count?: { jornales: number };
}

@Injectable({ providedIn: 'root' })
export class ActivitiesService {
  constructor(private api: ApiService) {}

  list(farmId: number, cropId: number) {
    return this.api.get<Activity[]>(`/farms/${farmId}/crops/${cropId}/activities`);
  }
  get(farmId: number, cropId: number, id: number) {
    return this.api.get<Activity>(`/farms/${farmId}/crops/${cropId}/activities/${id}`);
  }
  create(farmId: number, cropId: number, data: Partial<Activity>) {
    return this.api.post<Activity>(`/farms/${farmId}/crops/${cropId}/activities`, data);
  }
  update(farmId: number, cropId: number, id: number, data: Partial<Activity>) {
    return this.api.put<Activity>(`/farms/${farmId}/crops/${cropId}/activities/${id}`, data);
  }
  remove(farmId: number, cropId: number, id: number) {
    return this.api.delete(`/farms/${farmId}/crops/${cropId}/activities/${id}`);
  }
}
