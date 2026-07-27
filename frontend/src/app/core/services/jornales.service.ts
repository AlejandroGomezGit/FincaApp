import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface Jornal {
  id: number; workerId: number; activityId: number;
  date: string; days: number; dailyValue: number; notes?: string;
  worker?: { id: number; name: string };
}

@Injectable({ providedIn: 'root' })
export class JornalesService {
  constructor(private api: ApiService) {}

  list(farmId: number, cropId: number, activityId: number) {
    return this.api.get<Jornal[]>(`/farms/${farmId}/crops/${cropId}/activities/${activityId}/jornales`);
  }
  create(farmId: number, cropId: number, activityId: number, data: Partial<Jornal>) {
    return this.api.post<Jornal>(`/farms/${farmId}/crops/${cropId}/activities/${activityId}/jornales`, data);
  }
  update(farmId: number, cropId: number, activityId: number, id: number, data: Partial<Jornal>) {
    return this.api.put<Jornal>(`/farms/${farmId}/crops/${cropId}/activities/${activityId}/jornales/${id}`, data);
  }
  remove(farmId: number, cropId: number, activityId: number, id: number) {
    return this.api.delete(`/farms/${farmId}/crops/${cropId}/activities/${activityId}/jornales/${id}`);
  }
}
