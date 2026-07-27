import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

// Una actividad cuelga de un cultivo O de un lote de ganado — nunca ambos.
export interface Activity {
  id: number; name: string; category: string; cropId?: number | null; livestockBatchId?: number | null;
  startDate: string; endDate?: string; status: string; description?: string;
  totalJornales?: number; totalCostJornales?: number;
  _count?: { jornales: number };
}

@Injectable({ providedIn: 'root' })
export class ActivitiesService {
  constructor(private api: ApiService) {}

  private base(farmId: number, parent: { cropId?: number; batchId?: number }) {
    return parent.cropId != null
      ? `/farms/${farmId}/crops/${parent.cropId}/activities`
      : `/farms/${farmId}/livestock/${parent.batchId}/activities`;
  }

  list(farmId: number, parent: { cropId?: number; batchId?: number }) {
    return this.api.get<Activity[]>(this.base(farmId, parent));
  }
  get(farmId: number, parent: { cropId?: number; batchId?: number }, id: number) {
    return this.api.get<Activity>(`${this.base(farmId, parent)}/${id}`);
  }
  create(farmId: number, parent: { cropId?: number; batchId?: number }, data: Partial<Activity>) {
    return this.api.post<Activity>(this.base(farmId, parent), data);
  }
  update(farmId: number, parent: { cropId?: number; batchId?: number }, id: number, data: Partial<Activity>) {
    return this.api.put<Activity>(`${this.base(farmId, parent)}/${id}`, data);
  }
  remove(farmId: number, parent: { cropId?: number; batchId?: number }, id: number) {
    return this.api.delete(`${this.base(farmId, parent)}/${id}`);
  }
}
