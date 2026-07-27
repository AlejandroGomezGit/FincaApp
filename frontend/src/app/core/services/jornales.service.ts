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

  private base(farmId: number, parent: { cropId?: number; batchId?: number }, activityId: number) {
    const activitiesBase = parent.cropId != null
      ? `/farms/${farmId}/crops/${parent.cropId}/activities`
      : `/farms/${farmId}/livestock/${parent.batchId}/activities`;
    return `${activitiesBase}/${activityId}/jornales`;
  }

  list(farmId: number, parent: { cropId?: number; batchId?: number }, activityId: number) {
    return this.api.get<Jornal[]>(this.base(farmId, parent, activityId));
  }
  create(farmId: number, parent: { cropId?: number; batchId?: number }, activityId: number, data: Partial<Jornal>) {
    return this.api.post<Jornal>(this.base(farmId, parent, activityId), data);
  }
  update(farmId: number, parent: { cropId?: number; batchId?: number }, activityId: number, id: number, data: Partial<Jornal>) {
    return this.api.put<Jornal>(`${this.base(farmId, parent, activityId)}/${id}`, data);
  }
  remove(farmId: number, parent: { cropId?: number; batchId?: number }, activityId: number, id: number) {
    return this.api.delete(`${this.base(farmId, parent, activityId)}/${id}`);
  }
}
