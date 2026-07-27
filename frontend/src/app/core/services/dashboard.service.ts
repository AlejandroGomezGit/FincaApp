import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface DashboardSummary {
  totalCrops: number; activeCrops: number; totalWorkers: number;
  totalActivities: number; activeActivities: number;
  monthIncome: number; monthExpense: number; monthBalance: number;
  yearIncome: number; yearExpense: number; yearBalance: number;
  upcomingHarvests: any[];
}

export interface MonthlyBalance {
  month: number; income: number; expense: number; balance: number;
}

export interface ActivityCost {
  id: number; name: string; category: string; status: string;
  cropName: string; startDate: string; endDate?: string;
  totalDays: number; totalCost: number;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {
  constructor(private api: ApiService) {}

  getSummary(farmId: number) {
    return this.api.get<DashboardSummary>(`/farms/${farmId}/dashboard/summary`);
  }
  getMonthlyBalance(farmId: number, year?: number) {
    const params: Record<string, string> | undefined = year ? { year: String(year) } : undefined;
    return this.api.get<MonthlyBalance[]>(`/farms/${farmId}/dashboard/monthly-balance`, params);
  }
  getActivityCosts(farmId: number) {
    return this.api.get<ActivityCost[]>(`/farms/${farmId}/dashboard/activity-costs`);
  }
}
