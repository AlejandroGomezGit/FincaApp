import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface Worker {
  id: number; name: string; phone?: string; idNumber?: string;
  farmId: number; active: boolean; createdAt: string;
  _count?: { jornales: number };
}

@Injectable({ providedIn: 'root' })
export class WorkersService {
  constructor(private api: ApiService) {}

  list(farmId: number) { return this.api.get<Worker[]>(`/farms/${farmId}/workers`); }
  create(farmId: number, data: Partial<Worker>) { return this.api.post<Worker>(`/farms/${farmId}/workers`, data); }
  update(farmId: number, id: number, data: Partial<Worker>) { return this.api.put<Worker>(`/farms/${farmId}/workers/${id}`, data); }
  remove(farmId: number, id: number) { return this.api.delete(`/farms/${farmId}/workers/${id}`); }
}
