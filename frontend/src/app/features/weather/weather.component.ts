import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import { WeatherService, WeatherResponse, DailyForecast, WeatherRecommendation } from '../../core/services/weather.service';

const WEATHER_ICONS: Record<number, { icon: string; label: string }> = {
  0: { icon: 'wb_sunny', label: 'Despejado' },
  1: { icon: 'wb_sunny', label: 'Mayormente despejado' },
  2: { icon: 'wb_cloudy', label: 'Parcialmente nublado' },
  3: { icon: 'cloud', label: 'Nublado' },
  45: { icon: 'blur_on', label: 'Niebla' },
  48: { icon: 'blur_on', label: 'Niebla escarchada' },
  51: { icon: 'opacity', label: 'Llovizna leve' },
  53: { icon: 'opacity', label: 'Llovizna' },
  55: { icon: 'opacity', label: 'Llovizna densa' },
  56: { icon: 'ac_unit', label: 'Llovizna helada' },
  57: { icon: 'ac_unit', label: 'Llovizna helada densa' },
  61: { icon: 'opacity', label: 'Lluvia leve' },
  63: { icon: 'opacity', label: 'Lluvia' },
  65: { icon: 'opacity', label: 'Lluvia fuerte' },
  66: { icon: 'ac_unit', label: 'Lluvia helada' },
  67: { icon: 'ac_unit', label: 'Lluvia helada fuerte' },
  71: { icon: 'ac_unit', label: 'Nieve leve' },
  73: { icon: 'ac_unit', label: 'Nieve' },
  75: { icon: 'ac_unit', label: 'Nieve fuerte' },
  77: { icon: 'ac_unit', label: 'Granizo de nieve' },
  80: { icon: 'opacity', label: 'Chubascos leves' },
  81: { icon: 'opacity', label: 'Chubascos' },
  82: { icon: 'opacity', label: 'Chubascos fuertes' },
  85: { icon: 'ac_unit', label: 'Chubascos de nieve' },
  86: { icon: 'ac_unit', label: 'Chubascos de nieve fuertes' },
  95: { icon: 'flash_on', label: 'Tormenta' },
  96: { icon: 'flash_on', label: 'Tormenta con granizo' },
  99: { icon: 'flash_on', label: 'Tormenta con granizo fuerte' },
};

function weatherInfo(code: number) {
  return WEATHER_ICONS[code] ?? { icon: 'help_outline', label: 'Desconocido' };
}

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const SEVERITY_CLASS: Record<string, string> = { info: 'kpi-g', warning: 'kpi-a', danger: 'kpi-r' };

@Component({
  selector: 'app-weather',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatProgressSpinnerModule, RouterLink, BaseChartDirective],
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
    :host { display:block; padding:28px; font-family:'Plus Jakarta Sans',sans-serif; }

    .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
    .page-title { font-family:'Fraunces',serif; font-size:26px; font-weight:700; color:#1c2b16; margin:0; }
    .page-sub { font-size:13px; color:#7a8670; margin:4px 0 20px; display:flex; align-items:center; gap:5px; }
    .page-sub mat-icon { font-size:14px; width:14px; height:14px; }

    .section { background:white; border-radius:12px; border:1px solid #e8e0d0; padding:20px; margin-bottom:20px; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
    .section-title { font-size:14px; font-weight:600; color:#2d3a26; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
    .section-title mat-icon { font-size:18px; width:18px; height:18px; color:#7dab6e; }

    .day-strip { display:flex; gap:10px; overflow-x:auto; padding-bottom:4px; }
    .day-card {
      flex:1; min-width:110px; text-align:center; padding:14px 10px;
      border-radius:10px; border:1px solid #e8e0d0; background:#fbf9f4;
    }
    .day-date { font-size:12px; font-weight:600; color:#6a7a60; text-transform:capitalize; }
    .day-icon { color:#4a8f3f; margin:8px 0; }
    .day-icon mat-icon { font-size:30px; width:30px; height:30px; }
    .day-label { font-size:10.5px; color:#9aaa90; margin-bottom:6px; min-height:26px; }
    .day-temp { font-size:13px; font-weight:700; color:#1c2b16; }
    .day-temp .lo { color:#9aaa90; font-weight:500; }
    .day-precip {
      margin-top:8px; font-size:11px; font-weight:600; color:#3c78c8;
      background:rgba(60,120,200,0.1); border-radius:10px; padding:2px 8px; display:inline-block;
    }

    .chart-box { height:200px; position:relative; }

    .rec-card { display:flex; gap:12px; padding:14px 16px; border-radius:10px; margin-bottom:10px; }
    .rec-card:last-child { margin-bottom:0; }
    .rec-icon { width:36px; height:36px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .rec-icon mat-icon { font-size:19px; width:19px; height:19px; }
    .rec-title { font-size:13.5px; font-weight:700; color:#1c2b16; margin-bottom:2px; }
    .rec-msg { font-size:12.5px; color:#5a6a52; line-height:1.4; }

    .kpi-g { background:rgba(74,143,63,0.07); } .kpi-g .rec-icon { background:rgba(74,143,63,0.15); color:#3d7034; }
    .kpi-a { background:rgba(196,132,26,0.07); } .kpi-a .rec-icon { background:rgba(196,132,26,0.15); color:#c4841a; }
    .kpi-r { background:rgba(200,80,80,0.07); } .kpi-r .rec-icon { background:rgba(200,80,80,0.15); color:#c05050; }

    .loading { display:flex; justify-content:center; padding:60px; }
    .empty-state { text-align:center; padding:60px 20px; color:#8a9882; }
    .empty-state mat-icon { font-size:56px; width:56px; height:56px; color:#c8d8c0; display:block; margin:0 auto 14px; }
    .empty-state p { font-size:14px; max-width:420px; margin:0 auto; }
  `],
  template: `
    <div class="header">
      <div class="page-title">Clima y Recomendaciones</div>
      <button mat-stroked-button style="border-color:#c8d8c0;color:#2a5225" (click)="goToAnalytics()">
        <mat-icon>trending_up</mat-icon> Ver analítica
      </button>
    </div>
    @if (weather()?.location?.resolvedName) {
      <div class="page-sub"><mat-icon>place</mat-icon>Clima para: {{ weather()!.location!.resolvedName }}</div>
    }

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="36"></mat-spinner></div>
    } @else if (!weather()?.available) {
      <div class="empty-state">
        <mat-icon>cloud_off</mat-icon>
        @if (weather()?.reason === 'no_location') {
          <p>Agrega una ubicación a tu finca (ciudad/región) para ver el clima.</p>
          <button mat-flat-button style="background:#2a5225;color:white;margin-top:14px" routerLink="/farms">Ir a Fincas</button>
        } @else if (weather()?.reason === 'geocode_failed') {
          <p>No pudimos ubicar la finca en el mapa. Prueba con una ubicación más específica, ej. "Neiva, Huila".</p>
          <button mat-flat-button style="background:#2a5225;color:white;margin-top:14px" routerLink="/farms">Editar ubicación</button>
        } @else {
          <p>El servicio de clima no está disponible en este momento. Intenta más tarde.</p>
        }
      </div>
    } @else {
      <div class="section">
        <div class="section-title"><mat-icon>event</mat-icon>Pronóstico 7 días</div>
        <div class="day-strip">
          @for (d of weather()!.daily; track d.date) {
            <div class="day-card">
              <div class="day-date">{{ dayLabel(d) }}</div>
              <div class="day-icon"><mat-icon>{{ icon(d) }}</mat-icon></div>
              <div class="day-label">{{ label(d) }}</div>
              <div class="day-temp">{{ d.tempMax | number:'1.0-0' }}° <span class="lo">/ {{ d.tempMin | number:'1.0-0' }}°</span></div>
              <div class="day-precip">{{ d.precipitationProbability }}% lluvia</div>
            </div>
          }
        </div>
      </div>

      <div class="section">
        <div class="section-title"><mat-icon>water_drop</mat-icon>Probabilidad de lluvia</div>
        <div class="chart-box">
          <canvas baseChart [type]="'bar'" [data]="chartData" [options]="chartOptions"></canvas>
        </div>
      </div>

      <div class="section">
        <div class="section-title"><mat-icon>lightbulb</mat-icon>Recomendaciones</div>
        @if (!weather()!.recommendations?.length) {
          <div class="empty-msg">Sin recomendaciones por ahora</div>
        } @else {
          @for (r of weather()!.recommendations; track r.id) {
            <div class="rec-card" [class]="sevClass(r)">
              <div class="rec-icon"><mat-icon>{{ r.icon }}</mat-icon></div>
              <div>
                <div class="rec-title">{{ r.title }}</div>
                <div class="rec-msg">{{ r.message }}</div>
              </div>
            </div>
          }
        }
      </div>
    }
  `,
})
export class WeatherComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(WeatherService);

  farmId = signal(0);
  weather = signal<WeatherResponse | null>(null);
  loading = signal(true);

  chartData: any = { labels: [], datasets: [] };
  chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (v: number) => `${v}%` } } },
  };

  ngOnInit() {
    this.farmId.set(Number(this.route.snapshot.paramMap.get('farmId')));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.getForecast(this.farmId()).subscribe((w) => {
      this.weather.set(w);
      if (w.available && w.daily) this.buildChart(w.daily);
      this.loading.set(false);
    });
  }

  dayLabel(d: DailyForecast): string { return parseLocalDate(d.date).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' }); }
  icon(d: DailyForecast): string { return weatherInfo(d.weatherCode).icon; }
  label(d: DailyForecast): string { return weatherInfo(d.weatherCode).label; }
  sevClass(r: WeatherRecommendation): string { return SEVERITY_CLASS[r.severity] ?? 'kpi-g'; }

  goToAnalytics() {
    this.router.navigate(['/farms', this.farmId(), 'analytics']);
  }

  private buildChart(daily: DailyForecast[]) {
    this.chartData = {
      labels: daily.map((d) => parseLocalDate(d.date).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })),
      datasets: [{
        label: 'Probabilidad de lluvia',
        data: daily.map((d) => d.precipitationProbability),
        backgroundColor: 'rgba(60,120,200,0.7)',
        borderRadius: 4,
      }],
    };
  }
}
