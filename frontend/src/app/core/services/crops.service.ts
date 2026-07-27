import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface Crop {
  id: number; name: string; type: string; farmId: number;
  hectares?: number; plantingDate?: string; expectedHarvestDate?: string;
  status: string; notes?: string; createdAt: string;
  _count?: { activities: number };
}

@Injectable({ providedIn: 'root' })
export class CropsService {
  constructor(private api: ApiService) {}

  list(farmId: number) { return this.api.get<Crop[]>(`/farms/${farmId}/crops`); }
  get(farmId: number, id: number) { return this.api.get<Crop>(`/farms/${farmId}/crops/${id}`); }
  create(farmId: number, data: Partial<Crop>) { return this.api.post<Crop>(`/farms/${farmId}/crops`, data); }
  update(farmId: number, id: number, data: Partial<Crop>) { return this.api.put<Crop>(`/farms/${farmId}/crops/${id}`, data); }
  remove(farmId: number, id: number) { return this.api.delete(`/farms/${farmId}/crops/${id}`); }
}
