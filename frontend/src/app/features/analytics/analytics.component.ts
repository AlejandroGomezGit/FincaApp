import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { AnalyticsService, FarmForecast } from '../../core/services/analytics.service';

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, CurrencyPipe, BaseChartDirective],
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
    :host { display:block; padding:28px; font-family:'Plus Jakarta Sans',sans-serif; }

    .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
    .page-title { font-family:'Fraunces',serif; font-size:26px; font-weight:700; color:#1c2b16; margin:0; }
    .page-sub { font-size:13px; color:#7a8670; margin:4px 0 0; }

    .section { background:white; border-radius:12px; border:1px solid #e8e0d0; padding:20px; margin-bottom:20px; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
    .section-title { font-size:14px; font-weight:600; color:#2d3a26; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
    .section-title mat-icon { font-size:18px; width:18px; height:18px; color:#7dab6e; }

    .banner {
      display:flex; align-items:center; gap:10px; background:rgba(196,132,26,0.1);
      border:1px solid rgba(196,132,26,0.25); color:#8a6414; border-radius:10px;
      padding:12px 16px; font-size:13px; margin-bottom:16px;
    }
    .banner mat-icon { font-size:18px; width:18px; height:18px; color:#c4841a; flex-shrink:0; }

    .legend { display:flex; gap:16px; margin-bottom:14px; flex-wrap:wrap; }
    .legend-item { display:flex; align-items:center; gap:6px; font-size:12px; color:#6a7a60; }
    .leg-dot { width:10px; height:10px; border-radius:2px; }
    .leg-line { width:14px; height:2px; }

    .chart-box { height:280px; position:relative; }

    .kpi-row { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:14px; margin-bottom:20px; }
    .kpi { background:white; border-radius:12px; padding:16px 18px; border:1px solid #e8e0d0; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
    .kpi-label { font-size:11px; font-weight:600; letter-spacing:0.5px; text-transform:uppercase; color:#9aaa90; margin-bottom:6px; }
    .kpi-value { font-size:22px; font-weight:700; color:#1c2b16; }

    .crop-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:14px; }
    .crop-card { border:1px solid #e8e0d0; border-radius:10px; padding:14px 16px; }
    .crop-name { font-size:14px; font-weight:600; color:#1c2b16; }
    .crop-type { font-size:11.5px; color:#8a9882; margin-bottom:8px; }
    .crop-msg { font-size:12.5px; color:#9aaa90; }
    .crop-proj { font-size:13px; color:#4a8f3f; font-weight:600; margin-top:4px; }

    .loading { display:flex; justify-content:center; padding:60px; }
    .empty-msg { text-align:center; padding:30px; color:#9aaa90; font-size:14px; }
  `],
  template: `
    <div class="header">
      <div>
        <div class="page-title">Analítica Predictiva</div>
        <div class="page-sub">Proyección financiera y de cosechas para los próximos meses</div>
      </div>
      <button mat-stroked-button style="border-color:#c8d8c0;color:#2a5225" (click)="goToWeather()">
        <mat-icon>wb_cloudy</mat-icon> Ver clima
      </button>
    </div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="36"></mat-spinner></div>
    } @else if (forecast()) {

      @if (forecast()!.finance.insufficientData) {
        <div class="banner">
          <mat-icon>info</mat-icon>
          No hay suficiente historial de transacciones (mínimo 3 meses) para calcular una tendencia; se muestra un promedio simple.
        </div>
      }

      <div class="kpi-row">
        <div class="kpi">
          <div class="kpi-label">Meses de historial</div>
          <div class="kpi-value">{{ forecast()!.finance.monthsOfHistory }}</div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Balance próximo mes</div>
          <div class="kpi-value" [style.color]="nextBalance() >= 0 ? '#3d7034' : '#c05050'">
            {{ nextBalance() | currency:'COP':'symbol-narrow':'1.0-0' }}
          </div>
        </div>
        <div class="kpi">
          <div class="kpi-label">Método</div>
          <div class="kpi-value" style="font-size:16px">{{ forecast()!.finance.method === 'regression' ? 'Tendencia' : 'Promedio' }}</div>
        </div>
      </div>

      <div class="section">
        <div class="section-title"><mat-icon>trending_up</mat-icon>Proyección financiera</div>
        <div class="legend">
          <div class="legend-item"><div class="leg-dot" style="background:#4a8f3f"></div>Ingresos (histórico)</div>
          <div class="legend-item"><div class="leg-dot" style="background:#c05040"></div>Egresos (histórico)</div>
          <div class="legend-item"><div class="leg-line" style="background:#2a5225"></div>Balance real</div>
          <div class="legend-item"><div class="leg-line" style="background:#c4841a;border-top:2px dashed #c4841a;height:0"></div>Balance proyectado</div>
        </div>
        <div class="chart-box">
          <canvas baseChart [type]="'bar'" [data]="chartData" [options]="chartOptions"></canvas>
        </div>
      </div>

      <div class="section">
        <div class="section-title"><mat-icon>agriculture</mat-icon>Rendimiento por cultivo</div>
        @if (!forecast()!.cropYield.length) {
          <div class="empty-msg">Sin cultivos registrados en esta finca</div>
        } @else {
          <div class="crop-grid">
            @for (c of forecast()!.cropYield; track c.cropId) {
              <div class="crop-card">
                <div class="crop-name">{{ c.cropName }}</div>
                <div class="crop-type">{{ c.cropType }}</div>
                @if (c.insufficientData) {
                  <div class="crop-msg">Aún no hay suficientes cosechas registradas para este cultivo (mínimo 2 con cantidad real).</div>
                } @else {
                  <div class="crop-msg">Última cosecha real: {{ lastActual(c) }} {{ lastUnit(c) }}</div>
                  <div class="crop-proj">Próxima proyección: {{ c.nextProjected | number:'1.0-1' }} {{ lastUnit(c) }}</div>
                }
              </div>
            }
          </div>
        }
      </div>
    }
  `,
})
export class AnalyticsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(AnalyticsService);

  farmId = signal(0);
  forecast = signal<FarmForecast | null>(null);
  loading = signal(true);

  chartData: any = { labels: [], datasets: [] };
  chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  ngOnInit() {
    this.farmId.set(Number(this.route.snapshot.paramMap.get('farmId')));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.getForecast(this.farmId()).subscribe((f) => {
      this.forecast.set(f);
      this.buildChart(f);
      this.loading.set(false);
    });
  }

  nextBalance(): number {
    const f = this.forecast();
    return f?.finance.projection[0]?.balance ?? 0;
  }

  lastActual(c: FarmForecast['cropYield'][number]): number {
    const h = c.history ?? [];
    return h.length ? h[h.length - 1].actualQuantity : 0;
  }

  lastUnit(c: FarmForecast['cropYield'][number]): string {
    const h = c.history ?? [];
    return h.length ? h[h.length - 1].unit : 'kg';
  }

  goToWeather() {
    this.router.navigate(['/farms', this.farmId(), 'weather']);
  }

  private buildChart(f: FarmForecast) {
    const { history, projection } = f.finance;
    const historyLabels = history.map((b) => `${MONTH_NAMES[b.month]} ${b.year}`);
    const projLabels = projection.map((b) => `${MONTH_NAMES[b.month]} ${b.year}`);
    const labels = [...historyLabels, ...projLabels];

    const historyBalance = history.map((b) => b.balance);
    const projectedBalance = [
      ...Array(Math.max(history.length - 1, 0)).fill(null),
      ...(history.length ? [history[history.length - 1].balance] : []),
      ...projection.map((b) => b.balance),
    ];

    this.chartData = {
      labels,
      datasets: [
        {
          type: 'bar',
          label: 'Ingresos',
          data: [...history.map((b) => b.income), ...projection.map(() => null)],
          backgroundColor: 'rgba(74,143,63,0.75)',
          borderRadius: 3,
        },
        {
          type: 'bar',
          label: 'Egresos',
          data: [...history.map((b) => b.expense), ...projection.map(() => null)],
          backgroundColor: 'rgba(192,80,64,0.75)',
          borderRadius: 3,
        },
        {
          type: 'line',
          label: 'Balance real',
          data: [...historyBalance, ...projection.map(() => null)],
          borderColor: '#2a5225',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.25,
        },
        {
          type: 'line',
          label: 'Balance proyectado',
          data: projectedBalance,
          borderColor: '#c4841a',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 3,
          tension: 0.25,
        },
      ],
    };
  }
}
