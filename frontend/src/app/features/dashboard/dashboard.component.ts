import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DashboardService, DashboardSummary, MonthlyBalance, ActivityCost } from '../../core/services/dashboard.service';
import { AlertsService, Alert } from '../../core/services/alerts.service';

const SEVERITY_CLASS: Record<string, string> = { info: 'alert-g', warning: 'alert-a', danger: 'alert-r' };

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, CurrencyPipe, DatePipe],
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
    :host { display:block; padding:28px; font-family:'Plus Jakarta Sans',sans-serif; }

    .header-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
    .page-title { font-family:'Fraunces',serif; font-size:26px; font-weight:700; color:#1c2b16; margin:0; }
    .header-actions { display:flex; gap:8px; }

    /* KPI cards */
    .kpi-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); gap:14px; margin-bottom:24px; }

    .kpi {
      background:white; border-radius:12px; padding:18px 20px;
      border:1px solid #e8e0d0; box-shadow:0 1px 4px rgba(0,0,0,0.04);
    }
    .kpi-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
    .kpi-icon {
      width:38px; height:38px; border-radius:9px;
      display:flex; align-items:center; justify-content:center;
    }
    .kpi-icon mat-icon { font-size:20px; width:20px; height:20px; }
    .kpi-label { font-size:11.5px; font-weight:600; letter-spacing:0.5px; text-transform:uppercase; color:#9aaa90; }
    .kpi-value { font-size:28px; font-weight:700; color:#1c2b16; line-height:1; }
    .kpi-sub { font-size:12px; color:#9aaa90; margin-top:4px; }

    /* green */
    .kpi-g .kpi-icon { background:rgba(74,143,63,0.1); color:#3d7034; }
    /* amber */
    .kpi-a .kpi-icon { background:rgba(196,132,26,0.1); color:#c4841a; }
    /* red */
    .kpi-r .kpi-icon { background:rgba(200,80,80,0.1); color:#c05050; }
    /* blue */
    .kpi-b .kpi-icon { background:rgba(60,120,200,0.1); color:#3c78c8; }

    /* sections */
    .section { background:white; border-radius:12px; border:1px solid #e8e0d0; padding:20px; margin-bottom:20px; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
    .section-title { font-size:14px; font-weight:600; color:#2d3a26; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
    .section-title mat-icon { font-size:18px; width:18px; height:18px; color:#7dab6e; }

    /* chart */
    .chart-wrap { overflow-x:auto; }
    .bar-chart  { display:flex; align-items:flex-end; gap:6px; height:140px; min-width:560px; }
    .bar-group  { flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; }
    .bars       { display:flex; gap:2px; align-items:flex-end; height:110px; }
    .bar        { width:14px; border-radius:3px 3px 0 0; min-height:2px; transition:opacity 0.2s; }
    .bar:hover  { opacity:0.8; }
    .bar-income  { background:linear-gradient(180deg,#6dab5e,#4a8f3f); }
    .bar-expense { background:linear-gradient(180deg,#d47a5a,#c05040); }
    .bar-month   { font-size:10px; color:#9aaa90; }

    /* legend */
    .legend { display:flex; gap:16px; margin-bottom:14px; }
    .legend-item { display:flex; align-items:center; gap:6px; font-size:12px; color:#6a7a60; }
    .leg-dot { width:10px; height:10px; border-radius:2px; }

    /* activity costs */
    .act-row {
      display:flex; align-items:center; padding:10px 0;
      border-bottom:1px solid #f0ebe0;
    }
    .act-row:last-child { border-bottom:none; }
    .act-icon {
      width:32px; height:32px; border-radius:7px;
      background:rgba(125,171,110,0.12); display:flex;
      align-items:center; justify-content:center; color:#4a8f3f;
      flex-shrink:0; margin-right:12px;
    }
    .act-icon mat-icon { font-size:17px; width:17px; height:17px; }
    .act-info { flex:1; min-width:0; }
    .act-name { font-size:14px; font-weight:600; color:#1c2b16; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .act-crop { font-size:11.5px; color:#8a9882; }
    .act-days { font-size:12px; font-weight:600; color:#3d7034; background:rgba(61,112,52,0.08); padding:3px 8px; border-radius:12px; white-space:nowrap; }
    .act-cost { font-size:14px; font-weight:700; color:#1c2b16; min-width:80px; text-align:right; }

    /* harvest */
    .harvest-row { display:flex; align-items:center; padding:10px 0; border-bottom:1px solid #f0ebe0; }
    .harvest-row:last-child { border-bottom:none; }
    .harvest-date { font-size:12px; font-weight:600; color:#c4841a; min-width:70px; }
    .harvest-crop { flex:1; font-size:14px; color:#1c2b16; font-weight:500; }
    .harvest-qty  { font-size:13px; color:#4a8f3f; font-weight:600; }

    .loading { display:flex; justify-content:center; padding:60px; }
    .empty-msg { text-align:center; padding:30px; color:#9aaa90; font-size:14px; }

    .two-col { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
    @media(max-width:900px) { .two-col { grid-template-columns:1fr; } }

    /* alertas teaser */
    .alert-teaser { display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:10px; margin-bottom:10px; }
    .alert-teaser:last-child { margin-bottom:0; }
    .alert-teaser mat-icon { font-size:19px; width:19px; height:19px; flex-shrink:0; }
    .alert-teaser-text { font-size:13px; color:#1c2b16; }
    .alert-g { background:rgba(74,143,63,0.07); } .alert-g mat-icon { color:#3d7034; }
    .alert-a { background:rgba(196,132,26,0.07); } .alert-a mat-icon { color:#c4841a; }
    .alert-r { background:rgba(200,80,80,0.07); } .alert-r mat-icon { color:#c05050; }
    .see-all-link { font-size:12.5px; color:#2a5225; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:2px; margin-top:6px; }
  `],
  template: `
    <div class="header-row">
      <div class="page-title">Dashboard</div>
      <div class="header-actions">
        <button mat-stroked-button style="border-color:#c8d8c0;color:#2a5225" (click)="goToAlerts()">
          <mat-icon>notifications_active</mat-icon> Alertas @if (alerts().length) { ({{ alerts().length }}) }
        </button>
        <button mat-stroked-button style="border-color:#c8d8c0;color:#2a5225" (click)="goToAnalytics()">
          <mat-icon>trending_up</mat-icon> Proyección
        </button>
        <button mat-stroked-button style="border-color:#c8d8c0;color:#2a5225" (click)="goToWeather()">
          <mat-icon>wb_cloudy</mat-icon> Clima
        </button>
      </div>
    </div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="36"></mat-spinner></div>
    } @else if (summary()) {

      <!-- KPIs -->
      <div class="kpi-grid">
        <div class="kpi kpi-g">
          <div class="kpi-top">
            <div class="kpi-label">Balance mes</div>
            <div class="kpi-icon"><mat-icon>account_balance</mat-icon></div>
          </div>
          <div class="kpi-value">{{ summary()!.monthBalance | currency:'COP':'symbol-narrow':'1.0-0' }}</div>
          <div class="kpi-sub">Ingresos - Egresos del mes</div>
        </div>
        <div class="kpi kpi-g">
          <div class="kpi-top">
            <div class="kpi-label">Ingresos mes</div>
            <div class="kpi-icon"><mat-icon>trending_up</mat-icon></div>
          </div>
          <div class="kpi-value">{{ summary()!.monthIncome | currency:'COP':'symbol-narrow':'1.0-0' }}</div>
        </div>
        <div class="kpi kpi-r">
          <div class="kpi-top">
            <div class="kpi-label">Egresos mes</div>
            <div class="kpi-icon"><mat-icon>trending_down</mat-icon></div>
          </div>
          <div class="kpi-value">{{ summary()!.monthExpense | currency:'COP':'symbol-narrow':'1.0-0' }}</div>
        </div>
        <div class="kpi kpi-b">
          <div class="kpi-top">
            <div class="kpi-label">Cultivos activos</div>
            <div class="kpi-icon"><mat-icon>grass</mat-icon></div>
          </div>
          <div class="kpi-value">{{ summary()!.activeCrops }}</div>
          <div class="kpi-sub">de {{ summary()!.totalCrops }} en total</div>
        </div>
        <div class="kpi kpi-g">
          <div class="kpi-top">
            <div class="kpi-label">Trabajadores</div>
            <div class="kpi-icon"><mat-icon>people</mat-icon></div>
          </div>
          <div class="kpi-value">{{ summary()!.totalWorkers }}</div>
          <div class="kpi-sub">activos</div>
        </div>
        <div class="kpi kpi-a">
          <div class="kpi-top">
            <div class="kpi-label">Actividades</div>
            <div class="kpi-icon"><mat-icon>task</mat-icon></div>
          </div>
          <div class="kpi-value">{{ summary()!.activeActivities }}</div>
          <div class="kpi-sub">en progreso</div>
        </div>
      </div>

      @if (alerts().length) {
        <div class="section">
          <div class="section-title"><mat-icon>notifications_active</mat-icon>Alertas Tempranas</div>
          @for (a of alerts().slice(0, 3); track a.id) {
            <div class="alert-teaser" [class]="sevClass(a)">
              <mat-icon>{{ a.icon }}</mat-icon>
              <div class="alert-teaser-text">{{ a.message }}</div>
            </div>
          }
          <div class="see-all-link" (click)="goToAlerts()">Ver todas las alertas <mat-icon style="font-size:15px;width:15px;height:15px">arrow_forward</mat-icon></div>
        </div>
      }

      <!-- Balance mensual chart + proximas cosechas -->
      <div class="two-col">
        <div class="section">
          <div class="section-title"><mat-icon>bar_chart</mat-icon>Balance Mensual {{ currentYear }}</div>
          <div class="legend">
            <div class="legend-item"><div class="leg-dot" style="background:#4a8f3f"></div>Ingresos</div>
            <div class="legend-item"><div class="leg-dot" style="background:#c05040"></div>Egresos</div>
          </div>
          <div class="chart-wrap">
            <div class="bar-chart">
              @for (m of monthly(); track m.month) {
                <div class="bar-group">
                  <div class="bars">
                    <div class="bar bar-income"  [style.height.px]="barH(m.income)"  [title]="m.income | currency:'COP':'symbol-narrow':'1.0-0'"></div>
                    <div class="bar bar-expense" [style.height.px]="barH(m.expense)" [title]="m.expense | currency:'COP':'symbol-narrow':'1.0-0'"></div>
                  </div>
                  <div class="bar-month">{{ monthName(m.month) }}</div>
                </div>
              }
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title"><mat-icon>agriculture</mat-icon>Próximas Cosechas</div>
          @if (!summary()!.upcomingHarvests.length) {
            <div class="empty-msg">Sin cosechas proyectadas</div>
          } @else {
            @for (h of summary()!.upcomingHarvests; track h.id) {
              <div class="harvest-row">
                <div class="harvest-date">{{ h.projectedDate | date:'dd MMM' }}</div>
                <div class="harvest-crop">{{ h.crop?.name }}</div>
                <div class="harvest-qty">{{ h.projectedQuantity }} {{ h.unit }}</div>
              </div>
            }
          }
        </div>
      </div>

      <!-- Costo por actividad -->
      <div class="section">
        <div class="section-title"><mat-icon>work</mat-icon>Costo por Actividad (Jornales)</div>
        @if (!actCosts().length) {
          <div class="empty-msg">Sin actividades registradas</div>
        } @else {
          @for (a of actCosts().slice(0,8); track a.id) {
            <div class="act-row">
              <div class="act-icon"><mat-icon>agriculture</mat-icon></div>
              <div class="act-info">
                <div class="act-name">{{ a.name }}</div>
                <div class="act-crop">{{ a.cropName }} · {{ a.category }}</div>
              </div>
              <div class="act-days" style="margin-right:12px">{{ a.totalDays }} jornales</div>
              <div class="act-cost">{{ a.totalCost | currency:'COP':'symbol-narrow':'1.0-0' }}</div>
            </div>
          }
        }
      </div>

    }
  `,
})
export class DashboardComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private svc        = inject(DashboardService);
  private alertsSvc  = inject(AlertsService);

  farmId      = signal(0);
  summary     = signal<DashboardSummary | null>(null);
  monthly     = signal<MonthlyBalance[]>([]);
  actCosts    = signal<ActivityCost[]>([]);
  alerts      = signal<Alert[]>([]);
  loading     = signal(true);
  currentYear = new Date().getFullYear();

  private maxVal = 0;

  ngOnInit() {
    this.farmId.set(Number(this.route.snapshot.paramMap.get('farmId')));
    this.load();
  }

  load() {
    const id = this.farmId();
    this.loading.set(true);
    this.svc.getSummary(id).subscribe(s => { this.summary.set(s); this.loading.set(false); });
    this.svc.getMonthlyBalance(id).subscribe(m => { this.monthly.set(m); this.maxVal = Math.max(...m.map(x => Math.max(x.income, x.expense)), 1); });
    this.svc.getActivityCosts(id).subscribe(a => this.actCosts.set(a));
    this.alertsSvc.list(id).subscribe(r => this.alerts.set(r.alerts));
  }

  sevClass(a: Alert): string { return SEVERITY_CLASS[a.severity] ?? 'alert-g'; }

  barH(val: number): number {
    return Math.round((val / this.maxVal) * 100);
  }

  monthName(m: number): string { return MONTH_NAMES[m - 1] ?? ''; }

  goToAnalytics() { this.router.navigate(['/farms', this.farmId(), 'analytics']); }
  goToWeather() { this.router.navigate(['/farms', this.farmId(), 'weather']); }
  goToAlerts() { this.router.navigate(['/farms', this.farmId(), 'alerts']); }
}
