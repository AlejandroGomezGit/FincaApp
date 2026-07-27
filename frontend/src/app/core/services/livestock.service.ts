import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface LivestockBatch {
  id: number; name: string; species: string; purpose: string; farmId: number;
  quantity: number; acquisitionDate?: string; status: string; notes?: string; createdAt: string;
  _count?: { animals: number; activities?: number; healthRecords?: number; productionRecords?: number };
  animals?: Animal[];
}

export interface Animal {
  id: number; batchId: number; tag?: string; sex?: string; birthDate?: string;
  breed?: string; status: string; notes?: string; createdAt: string;
  _count?: { weightRecords: number; healthRecords: number; reproductionRecords: number };
  weightRecords?: WeightRecord[];
  healthRecords?: HealthRecord[];
  reproductionRecords?: ReproductionRecord[];
  batch?: { id: number; name: string; farmId: number };
}

export interface WeightRecord { id: number; animalId: number; date: string; weightKg: number; notes?: string; }
export interface HealthRecord {
  id: number; batchId: number; animalId?: number | null; type: string; date: string;
  product?: string; cost?: number; nextDueDate?: string; notes?: string;
  animal?: { id: number; tag?: string } | null;
}
export interface ReproductionRecord {
  id: number; animalId: number; type: string; date: string;
  expectedDate?: string; offspringCount?: number; notes?: string;
}
export interface ProductionRecord {
  id: number; batchId: number; date: string; productType: string; quantity: number; unit: string; notes?: string;
}
export interface MortalityRecord {
  id: number; batchId: number; animalId?: number | null; date: string; quantity: number; cause?: string; notes?: string;
  animal?: { id: number; tag?: string } | null;
}

@Injectable({ providedIn: 'root' })
export class LivestockService {
  constructor(private api: ApiService) {}

  list(farmId: number) { return this.api.get<LivestockBatch[]>(`/farms/${farmId}/livestock`); }
  get(farmId: number, id: number) { return this.api.get<LivestockBatch>(`/farms/${farmId}/livestock/${id}`); }
  create(farmId: number, data: Partial<LivestockBatch>) { return this.api.post<LivestockBatch>(`/farms/${farmId}/livestock`, data); }
  update(farmId: number, id: number, data: Partial<LivestockBatch>) { return this.api.put<LivestockBatch>(`/farms/${farmId}/livestock/${id}`, data); }
  remove(farmId: number, id: number) { return this.api.delete(`/farms/${farmId}/livestock/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class AnimalsService {
  constructor(private api: ApiService) {}

  private base(farmId: number, batchId: number) { return `/farms/${farmId}/livestock/${batchId}/animals`; }

  list(farmId: number, batchId: number) { return this.api.get<Animal[]>(this.base(farmId, batchId)); }
  get(farmId: number, batchId: number, id: number) { return this.api.get<Animal>(`${this.base(farmId, batchId)}/${id}`); }
  create(farmId: number, batchId: number, data: Partial<Animal>) { return this.api.post<Animal>(this.base(farmId, batchId), data); }
  update(farmId: number, batchId: number, id: number, data: Partial<Animal>) { return this.api.put<Animal>(`${this.base(farmId, batchId)}/${id}`, data); }
  remove(farmId: number, batchId: number, id: number) { return this.api.delete(`${this.base(farmId, batchId)}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class LivestockHealthService {
  constructor(private api: ApiService) {}
  private base(farmId: number, batchId: number) { return `/farms/${farmId}/livestock/${batchId}/health`; }
  list(farmId: number, batchId: number) { return this.api.get<HealthRecord[]>(this.base(farmId, batchId)); }
  create(farmId: number, batchId: number, data: Partial<HealthRecord>) { return this.api.post<HealthRecord>(this.base(farmId, batchId), data); }
  remove(farmId: number, batchId: number, id: number) { return this.api.delete(`${this.base(farmId, batchId)}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class LivestockProductionService {
  constructor(private api: ApiService) {}
  private base(farmId: number, batchId: number) { return `/farms/${farmId}/livestock/${batchId}/production`; }
  list(farmId: number, batchId: number) { return this.api.get<ProductionRecord[]>(this.base(farmId, batchId)); }
  create(farmId: number, batchId: number, data: Partial<ProductionRecord>) { return this.api.post<ProductionRecord>(this.base(farmId, batchId), data); }
  remove(farmId: number, batchId: number, id: number) { return this.api.delete(`${this.base(farmId, batchId)}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class LivestockMortalityService {
  constructor(private api: ApiService) {}
  private base(farmId: number, batchId: number) { return `/farms/${farmId}/livestock/${batchId}/mortality`; }
  list(farmId: number, batchId: number) { return this.api.get<MortalityRecord[]>(this.base(farmId, batchId)); }
  create(farmId: number, batchId: number, data: Partial<MortalityRecord>) { return this.api.post<MortalityRecord>(this.base(farmId, batchId), data); }
  remove(farmId: number, batchId: number, id: number) { return this.api.delete(`${this.base(farmId, batchId)}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class AnimalWeightsService {
  constructor(private api: ApiService) {}
  private base(farmId: number, batchId: number, animalId: number) { return `/farms/${farmId}/livestock/${batchId}/animals/${animalId}/weights`; }
  list(farmId: number, batchId: number, animalId: number) { return this.api.get<WeightRecord[]>(this.base(farmId, batchId, animalId)); }
  create(farmId: number, batchId: number, animalId: number, data: Partial<WeightRecord>) { return this.api.post<WeightRecord>(this.base(farmId, batchId, animalId), data); }
  remove(farmId: number, batchId: number, animalId: number, id: number) { return this.api.delete(`${this.base(farmId, batchId, animalId)}/${id}`); }
}

@Injectable({ providedIn: 'root' })
export class AnimalReproductionService {
  constructor(private api: ApiService) {}
  private base(farmId: number, batchId: number, animalId: number) { return `/farms/${farmId}/livestock/${batchId}/animals/${animalId}/reproduction`; }
  list(farmId: number, batchId: number, animalId: number) { return this.api.get<ReproductionRecord[]>(this.base(farmId, batchId, animalId)); }
  create(farmId: number, batchId: number, animalId: number, data: Partial<ReproductionRecord>) { return this.api.post<ReproductionRecord>(this.base(farmId, batchId, animalId), data); }
  remove(farmId: number, batchId: number, animalId: number, id: number) { return this.api.delete(`${this.base(farmId, batchId, animalId)}/${id}`); }
}
