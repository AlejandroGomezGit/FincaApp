import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface Farm {
  id: number; name: string; location?: string;
  description?: string; hectares?: number;
  lat?: number; lng?: number; locationResolved?: string;
  createdAt: string;
  _count?: { crops: number; workers: number; transactions: number };
}

@Injectable({ providedIn: 'root' })
export class FarmsService {
  constructor(private api: ApiService) {}

  list() { return this.api.get<Farm[]>('/farms'); }
  get(id: number) { return this.api.get<Farm>(`/farms/${id}`); }
  create(data: Partial<Farm>) { return this.api.post<Farm>('/farms', data); }
  update(id: number, data: Partial<Farm>) { return this.api.put<Farm>(`/farms/${id}`, data); }
  remove(id: number) { return this.api.delete(`/farms/${id}`); }
}
