import { Injectable } from '@angular/core';
import { ApiService } from './api.service';

export interface Alert {
  id: string; severity: 'danger' | 'warning' | 'info'; icon: string; title: string; message: string;
  relatedActivityId?: number; relatedCropId?: number; relatedBatchId?: number;
}

interface AlertsResponse { alerts: Alert[]; }

@Injectable({ providedIn: 'root' })
export class AlertsService {
  constructor(private api: ApiService) {}

  list(farmId: number) {
    return this.api.get<AlertsResponse>(`/farms/${farmId}/alerts`);
  }
}
