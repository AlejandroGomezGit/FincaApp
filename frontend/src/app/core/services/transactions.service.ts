import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface Transaction {
  id: number; farmId: number; cropId?: number; type: 'INCOME' | 'EXPENSE';
  category: string; amount: number; date: string; description?: string;
  crop?: { id: number; name: string };
}

@Injectable({ providedIn: 'root' })
export class TransactionsService {
  constructor(private api: ApiService) {}

  list(farmId: number, params?: Record<string, string>) {
    return this.api.get<Transaction[]>(`/farms/${farmId}/transactions`, params);
  }
  create(farmId: number, data: Partial<Transaction>) {
    return this.api.post<Transaction>(`/farms/${farmId}/transactions`, data);
  }
  update(farmId: number, id: number, data: Partial<Transaction>) {
    return this.api.put<Transaction>(`/farms/${farmId}/transactions/${id}`, data);
  }
  remove(farmId: number, id: number) {
    return this.api.delete(`/farms/${farmId}/transactions/${id}`);
  }
}
