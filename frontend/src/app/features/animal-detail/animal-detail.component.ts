import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BaseChartDirective } from 'ng2-charts';
import {
  AnimalsService, Animal, AnimalWeightsService, WeightRecord,
  AnimalReproductionService, ReproductionRecord,
} from '../../core/services/livestock.service';

const REPRO_TYPES = ['MONTA', 'INSEMINACION', 'GESTACION_CONFIRMADA', 'PARTO', 'ABORTO'];
const REPRO_LABELS: Record<string, string> = { MONTA: 'Monta', INSEMINACION: 'Inseminación', GESTACION_CONFIRMADA: 'Gestación confirmada', PARTO: 'Parto', ABORTO: 'Aborto' };

@Component({
  selector: 'app-animal-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, DatePipe, BaseChartDirective],
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
    :host { display:block; padding:28px; font-family:'Plus Jakarta Sans',sans-serif; }

    .back-link { display:flex; align-items:center; gap:4px; font-size:12.5px; color:#7a8670; cursor:pointer; margin-bottom:10px; width:fit-content; }
    .back-link mat-icon { font-size:16px; width:16px; height:16px; }
    .header h1 { font-family:'Fraunces',serif; font-size:24px; font-weight:700; color:#1c2b16; margin:0 0 4px; }
    .header p { color:#7a8670; font-size:13.5px; margin:0 0 24px; }

    .section { background:white; border-radius:12px; border:1px solid #e8e0d0; padding:20px; margin-bottom:20px; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
    .section-title { font-size:14px; font-weight:600; color:#2d3a26; margin-bottom:16px; display:flex; align-items:center; gap:8px; }
    .section-title mat-icon { font-size:18px; width:18px; height:18px; color:#a0764a; }

    .chart-box { height:220px; position:relative; margin-bottom:14px; }

    .quick-form { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; padding:14px; background:#f7f3eb; border-radius:10px; }
    .fi { padding:9px 12px; border:1.5px solid #e0d8cc; border-radius:8px; font-size:13px; font-family:inherit; outline:none; box-sizing:border-box; }
    select.fi { background:white; }

    .record-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #f0ebe0; }
    .record-row:last-child { border-bottom:none; }
    .record-date { font-size:12px; font-weight:600; color:#a0764a; min-width:80px; }
    .record-main { flex:1; font-size:13.5px; color:#1c2b16; }
    .record-del { color:#d07070; }

    .empty-msg { text-align:center; padding:20px; color:#9aaa90; font-size:13px; }
    .loading { display:flex; justify-content:center; padding:60px; }
  `],
  template: `
    <div class="back-link" (click)="goBack()"><mat-icon>arrow_back</mat-icon> Volver al lote</div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="36"></mat-spinner></div>
    } @else if (animal()) {
      <div class="header">
        <h1>{{ animal()!.tag || ('Animal #' + animal()!.id) }}</h1>
        <p>{{ animal()!.breed || 'Raza no especificada' }} · {{ animal()!.batch?.name }}</p>
      </div>

      <div class="section">
        <div class="section-title"><mat-icon>monitor_weight</mat-icon>Peso en el tiempo</div>
        <div class="quick-form">
          <input class="fi" type="date" [(ngModel)]="weightForm.date" style="width:140px">
          <input class="fi" type="number" placeholder="Peso (kg)" [(ngModel)]="weightForm.weightKg" style="width:110px">
          <button mat-flat-button style="background:#2a5225;color:white" [disabled]="!weightForm.date || !weightForm.weightKg" (click)="addWeight()">Registrar</button>
        </div>
        @if (weights().length < 2) {
          <div class="empty-msg">Registra al menos 2 pesos para ver la gráfica de evolución.</div>
        } @else {
          <div class="chart-box">
            <canvas baseChart [type]="'line'" [data]="chartData" [options]="chartOptions"></canvas>
          </div>
        }
        @for (w of weights().slice(-8).reverse(); track w.id) {
          <div class="record-row">
            <div class="record-date">{{ w.date | date:'dd/MM/yy' }}</div>
            <div class="record-main"><strong>{{ w.weightKg }} kg</strong></div>
            <button mat-icon-button class="record-del" (click)="removeWeight(w)"><mat-icon style="font-size:18px">delete</mat-icon></button>
          </div>
        }
      </div>

      <div class="section">
        <div class="section-title"><mat-icon>favorite</mat-icon>Reproducción</div>
        <div class="quick-form">
          <input class="fi" type="date" [(ngModel)]="reproForm.date" style="width:140px">
          <select class="fi" [(ngModel)]="reproForm.type">
            @for (t of reproTypes; track t) { <option [value]="t">{{ reproLabel(t) }}</option> }
          </select>
          <input class="fi" type="date" placeholder="Fecha esperada" [(ngModel)]="reproForm.expectedDate" style="width:150px">
          <button mat-flat-button style="background:#2a5225;color:white" [disabled]="!reproForm.date" (click)="addRepro()">Registrar</button>
        </div>
        @if (!reproduction().length) {
          <div class="empty-msg">Sin registros de reproducción.</div>
        } @else {
          @for (r of reproduction(); track r.id) {
            <div class="record-row">
              <div class="record-date">{{ r.date | date:'dd/MM/yy' }}</div>
              <div class="record-main">
                {{ reproLabel(r.type) }}
                @if (r.expectedDate) { <span style="color:#8a9882"> — esperado: {{ r.expectedDate | date:'dd/MM/yy' }}</span> }
              </div>
              <button mat-icon-button class="record-del" (click)="removeRepro(r)"><mat-icon style="font-size:18px">delete</mat-icon></button>
            </div>
          }
        }
      </div>

      <div class="section">
        <div class="section-title"><mat-icon>vaccines</mat-icon>Historial de salud</div>
        @if (!animal()!.healthRecords?.length) {
          <div class="empty-msg">Sin registros de salud individuales (revisa también los del lote completo).</div>
        } @else {
          @for (h of animal()!.healthRecords; track h.id) {
            <div class="record-row">
              <div class="record-date">{{ h.date | date:'dd/MM/yy' }}</div>
              <div class="record-main">{{ h.type }} @if (h.product) { — {{ h.product }} }</div>
            </div>
          }
        }
      </div>
    }
  `,
})
export class AnimalDetailComponent implements OnInit {
  private route     = inject(ActivatedRoute);
  private router     = inject(Router);
  private svc        = inject(AnimalsService);
  private weightsSvc = inject(AnimalWeightsService);
  private reproSvc   = inject(AnimalReproductionService);
  private snackBar   = inject(MatSnackBar);

  farmId   = signal(0);
  batchId  = signal(0);
  animalId = signal(0);
  animal   = signal<Animal | null>(null);
  weights  = signal<WeightRecord[]>([]);
  reproduction = signal<ReproductionRecord[]>([]);
  loading  = signal(true);

  reproTypes = REPRO_TYPES;
  weightForm: any = { date: '', weightKg: null };
  reproForm: any = { date: '', type: 'MONTA', expectedDate: '' };

  chartData: any = { labels: [], datasets: [] };
  chartOptions: any = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: false } },
  };

  ngOnInit() {
    const p = this.route.snapshot.paramMap;
    this.farmId.set(Number(p.get('farmId')));
    this.batchId.set(Number(p.get('batchId')));
    this.animalId.set(Number(p.get('animalId')));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.get(this.farmId(), this.batchId(), this.animalId()).subscribe({
      next: a => { this.animal.set(a); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.weightsSvc.list(this.farmId(), this.batchId(), this.animalId()).subscribe(w => {
      const sorted = [...w].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      this.weights.set(sorted);
      this.buildChart(sorted);
    });
    this.reproSvc.list(this.farmId(), this.batchId(), this.animalId()).subscribe(r => this.reproduction.set(r));
  }

  private buildChart(weights: WeightRecord[]) {
    this.chartData = {
      labels: weights.map(w => new Date(w.date).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })),
      datasets: [{
        label: 'Peso (kg)',
        data: weights.map(w => w.weightKg),
        borderColor: '#a0764a',
        backgroundColor: 'rgba(160,118,74,0.1)',
        borderWidth: 2,
        pointRadius: 3,
        tension: 0.25,
        fill: true,
      }],
    };
  }

  addWeight() {
    this.weightsSvc.create(this.farmId(), this.batchId(), this.animalId(), this.weightForm).subscribe({
      next: () => { this.weightForm = { date: '', weightKg: null }; this.load(); this.snackBar.open('Peso registrado', '', { duration: 2000 }); },
      error: () => this.snackBar.open('Error al guardar', '', { duration: 3000 }),
    });
  }
  removeWeight(w: WeightRecord) {
    if (!confirm('¿Eliminar este registro de peso?')) return;
    this.weightsSvc.remove(this.farmId(), this.batchId(), this.animalId(), w.id).subscribe({ next: () => this.load() });
  }

  addRepro() {
    const data = { ...this.reproForm, expectedDate: this.reproForm.expectedDate || undefined };
    this.reproSvc.create(this.farmId(), this.batchId(), this.animalId(), data).subscribe({
      next: () => { this.reproForm = { date: '', type: 'MONTA', expectedDate: '' }; this.load(); this.snackBar.open('Registro guardado', '', { duration: 2000 }); },
      error: () => this.snackBar.open('Error al guardar', '', { duration: 3000 }),
    });
  }
  removeRepro(r: ReproductionRecord) {
    if (!confirm('¿Eliminar este registro?')) return;
    this.reproSvc.remove(this.farmId(), this.batchId(), this.animalId(), r.id).subscribe({ next: () => this.load() });
  }

  goBack() { this.router.navigate(['/farms', this.farmId(), 'livestock', this.batchId()]); }
  reproLabel(t: string) { return REPRO_LABELS[t] ?? t; }
}
