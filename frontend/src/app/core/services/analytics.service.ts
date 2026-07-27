import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface MonthlyBucket {
  year: number; month: number; income: number; expense: number; balance: number;
}

export interface FinanceForecast {
  history: MonthlyBucket[];
  projection: MonthlyBucket[];
  method: 'regression' | 'average';
  insufficientData: boolean;
  monthsOfHistory: number;
}

export interface CropYieldTrend {
  cropId: number; cropName: string; cropType: string;
  insufficientData: boolean;
  history?: { projectedDate: string; actualQuantity: number; unit: string }[];
  nextProjected?: number | null;
}

export interface FarmForecast {
  finance: FinanceForecast;
  cropYield: CropYieldTrend[];
}

export interface FarmRanking {
  farmId: number; name: string; location?: string; hectares?: number;
  incomeTotal: number; expenseTotal: number; netBalance: number;
  balancePerHectare: number | null; rank: number;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  constructor(private api: ApiService) {}

  getForecast(farmId: number) {
    return this.api.get<FarmForecast>(`/farms/${farmId}/analytics/forecast`);
  }
  getRanking() {
    return this.api.get<FarmRanking[]>('/farms/ranking');
  }
}
