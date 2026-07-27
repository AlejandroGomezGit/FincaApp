import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AlertsService, Alert } from '../../core/services/alerts.service';

const SEVERITY_CLASS: Record<string, string> = { info: 'kpi-g', warning: 'kpi-a', danger: 'kpi-r' };

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
    :host { display:block; padding:28px; font-family:'Plus Jakarta Sans',sans-serif; }

    .page-title { font-family:'Fraunces',serif; font-size:26px; font-weight:700; color:#1c2b16; margin:0; }
    .page-sub { font-size:13px; color:#7a8670; margin:4px 0 24px; }

    .rec-card { display:flex; gap:14px; padding:16px 18px; border-radius:12px; margin-bottom:12px; border:1px solid transparent; }
    .rec-icon { width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .rec-icon mat-icon { font-size:21px; width:21px; height:21px; }
    .rec-title { font-size:14.5px; font-weight:700; color:#1c2b16; margin-bottom:3px; }
    .rec-msg { font-size:13px; color:#5a6a52; line-height:1.5; }

    .kpi-g { background:rgba(74,143,63,0.07); border-color:rgba(74,143,63,0.15); } .kpi-g .rec-icon { background:rgba(74,143,63,0.15); color:#3d7034; }
    .kpi-a { background:rgba(196,132,26,0.07); border-color:rgba(196,132,26,0.15); } .kpi-a .rec-icon { background:rgba(196,132,26,0.15); color:#c4841a; }
    .kpi-r { background:rgba(200,80,80,0.07); border-color:rgba(200,80,80,0.15); } .kpi-r .rec-icon { background:rgba(200,80,80,0.15); color:#c05050; }

    .loading { display:flex; justify-content:center; padding:60px; }
    .empty-state { text-align:center; padding:60px 20px; color:#8a9882; }
    .empty-state mat-icon { font-size:56px; width:56px; height:56px; color:#c8d8c0; display:block; margin:0 auto 14px; }
  `],
  template: `
    <div class="page-title">Alertas Tempranas</div>
    <div class="page-sub">Comparado contra el historial de tu propia finca — nada se inventa, todo sale de tus datos</div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="36"></mat-spinner></div>
    } @else if (!alerts().length) {
      <div class="empty-state">
        <mat-icon>check_circle</mat-icon>
        <p>Sin alertas por ahora. Todo se ve dentro de lo normal.</p>
      </div>
    } @else {
      @for (a of alerts(); track a.id) {
        <div class="rec-card" [class]="sevClass(a)">
          <div class="rec-icon"><mat-icon>{{ a.icon }}</mat-icon></div>
          <div>
            <div class="rec-title">{{ a.title }}</div>
            <div class="rec-msg">{{ a.message }}</div>
          </div>
        </div>
      }
    }
  `,
})
export class AlertsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private svc = inject(AlertsService);

  farmId = signal(0);
  alerts = signal<Alert[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.farmId.set(Number(this.route.snapshot.paramMap.get('farmId')));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.list(this.farmId()).subscribe({
      next: (r) => { this.alerts.set(r.alerts); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  sevClass(a: Alert): string { return SEVERITY_CLASS[a.severity] ?? 'kpi-g'; }
}
