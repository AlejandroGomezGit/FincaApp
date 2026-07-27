import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  LivestockService, LivestockBatch, AnimalsService, Animal,
  LivestockHealthService, HealthRecord, LivestockProductionService, ProductionRecord,
  LivestockMortalityService, MortalityRecord,
} from '../../core/services/livestock.service';

const HEALTH_TYPES = ['VACUNA', 'DESPARASITACION', 'TRATAMIENTO', 'REVISION', 'OTRO'];
const HEALTH_LABELS: Record<string, string> = { VACUNA: 'Vacuna', DESPARASITACION: 'Desparasitación', TRATAMIENTO: 'Tratamiento', REVISION: 'Revisión', OTRO: 'Otro' };
const PRODUCTION_TYPES = ['LECHE', 'HUEVOS', 'LANA', 'OTRO'];
const PRODUCTION_LABELS: Record<string, string> = { LECHE: 'Leche (litros)', HUEVOS: 'Huevos (unidades)', LANA: 'Lana (kg)', OTRO: 'Otro' };
const SEX_LABELS: Record<string, string> = { MACHO: 'Macho', HEMBRA: 'Hembra' };
const ANIMAL_STATUS_LABELS: Record<string, string> = { ACTIVE: 'Activo', SOLD: 'Vendido', DECEASED: 'Fallecido' };

@Component({
  selector: 'app-livestock-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, DatePipe, CurrencyPipe],
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
    :host { display:block; padding:28px; font-family:'Plus Jakarta Sans',sans-serif; }

    .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
    .back-link { display:flex; align-items:center; gap:4px; font-size:12.5px; color:#7a8670; cursor:pointer; margin-bottom:10px; width:fit-content; }
    .back-link mat-icon { font-size:16px; width:16px; height:16px; }
    .header h1 { font-family:'Fraunces',serif; font-size:24px; font-weight:700; color:#1c2b16; margin:0; }
    .header p { color:#7a8670; font-size:13.5px; margin:4px 0 0; }
    .header-actions { display:flex; gap:8px; }

    .section { background:white; border-radius:12px; border:1px solid #e8e0d0; padding:20px; margin-bottom:20px; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
    .section-title { font-size:14px; font-weight:600; color:#2d3a26; margin-bottom:16px; display:flex; align-items:center; justify-content:space-between; }
    .section-title-label { display:flex; align-items:center; gap:8px; }
    .section-title mat-icon { font-size:18px; width:18px; height:18px; color:#a0764a; }

    .animal-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:12px; }
    .animal-card { border:1px solid #e8e0d0; border-radius:10px; padding:12px 14px; cursor:pointer; transition:all 0.15s; }
    .animal-card:hover { border-color:#a0764a; box-shadow:0 3px 10px rgba(0,0,0,0.06); }
    .animal-tag { font-size:14px; font-weight:600; color:#1c2b16; }
    .animal-meta { font-size:11.5px; color:#8a9882; margin-top:2px; }

    .record-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid #f0ebe0; }
    .record-row:last-child { border-bottom:none; }
    .record-date { font-size:12px; font-weight:600; color:#a0764a; min-width:80px; }
    .record-main { flex:1; font-size:13.5px; color:#1c2b16; }
    .record-sub { font-size:11.5px; color:#8a9882; }
    .record-del { color:#d07070; }

    .quick-form { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:14px; padding:14px; background:#f7f3eb; border-radius:10px; }
    .fi { padding:9px 12px; border:1.5px solid #e0d8cc; border-radius:8px; font-size:13px; font-family:inherit; outline:none; box-sizing:border-box; }
    select.fi { background:white; }

    .empty-msg { text-align:center; padding:20px; color:#9aaa90; font-size:13px; }
    .loading { display:flex; justify-content:center; padding:60px; }
  `],
  template: `
    <div class="back-link" (click)="goBack()"><mat-icon>arrow_back</mat-icon> Volver a Ganado</div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="36"></mat-spinner></div>
    } @else if (batch()) {
      <div class="header">
        <div>
          <h1>{{ batch()!.name }}</h1>
          <p>{{ batch()!.quantity }} cabeza(s) · {{ batch()!.species }} · {{ batch()!.purpose }}</p>
        </div>
        <div class="header-actions">
          <button mat-stroked-button style="border-color:#c8d8c0;color:#2a5225" (click)="goActivities()">
            <mat-icon>task</mat-icon> Actividades
          </button>
        </div>
      </div>

      <div class="section">
        <div class="section-title">
          <div class="section-title-label"><mat-icon>pets</mat-icon>Animales individuales</div>
          <button mat-stroked-button style="font-size:12px;border-color:#c8d8c0;color:#2a5225" (click)="addAnimal()">
            <mat-icon style="font-size:15px">add</mat-icon> Agregar animal
          </button>
        </div>
        @if (!animals().length) {
          <div class="empty-msg">Sin animales individuales — útil solo si necesitas seguimiento por cabeza (ej. ganado). Para aves, registra todo a nivel de lote abajo.</div>
        } @else {
          <div class="animal-grid">
            @for (a of animals(); track a.id) {
              <div class="animal-card" (click)="goAnimal(a)">
                <div class="animal-tag">{{ a.tag || ('Animal #' + a.id) }}</div>
                <div class="animal-meta">{{ sexLabel(a.sex) }} · {{ animalStatusLabel(a.status) }}</div>
                @if (a.breed) { <div class="animal-meta">{{ a.breed }}</div> }
              </div>
            }
          </div>
        }
      </div>

      <div class="section">
        <div class="section-title"><div class="section-title-label"><mat-icon>egg</mat-icon>Producción</div></div>
        <div class="quick-form">
          <input class="fi" type="date" [(ngModel)]="prodForm.date" style="width:140px">
          <select class="fi" [(ngModel)]="prodForm.productType">
            @for (t of productionTypes; track t) { <option [value]="t">{{ productionLabel(t) }}</option> }
          </select>
          <input class="fi" type="number" placeholder="Cantidad" [(ngModel)]="prodForm.quantity" style="width:100px">
          <button mat-flat-button style="background:#2a5225;color:white" [disabled]="!prodForm.date || !prodForm.quantity" (click)="addProduction()">Registrar</button>
        </div>
        @if (!production().length) {
          <div class="empty-msg">Sin registros de producción todavía.</div>
        } @else {
          @for (p of production().slice(0, 10); track p.id) {
            <div class="record-row">
              <div class="record-date">{{ p.date | date:'dd/MM/yy' }}</div>
              <div class="record-main">{{ productionLabel(p.productType) }}: <strong>{{ p.quantity }} {{ p.unit }}</strong></div>
              <button mat-icon-button class="record-del" (click)="removeProduction(p)"><mat-icon style="font-size:18px">delete</mat-icon></button>
            </div>
          }
        }
      </div>

      <div class="section">
        <div class="section-title"><div class="section-title-label"><mat-icon>vaccines</mat-icon>Salud (todo el lote)</div></div>
        <div class="quick-form">
          <input class="fi" type="date" [(ngModel)]="healthForm.date" style="width:140px">
          <select class="fi" [(ngModel)]="healthForm.type">
            @for (t of healthTypes; track t) { <option [value]="t">{{ healthLabel(t) }}</option> }
          </select>
          <input class="fi" placeholder="Producto/detalle" [(ngModel)]="healthForm.product" style="width:160px">
          <input class="fi" type="number" placeholder="Costo (opcional)" [(ngModel)]="healthForm.cost" style="width:120px">
          <button mat-flat-button style="background:#2a5225;color:white" [disabled]="!healthForm.date" (click)="addHealth()">Registrar</button>
        </div>
        @if (!health().length) {
          <div class="empty-msg">Sin registros de salud todavía.</div>
        } @else {
          @for (h of health().slice(0, 10); track h.id) {
            <div class="record-row">
              <div class="record-date">{{ h.date | date:'dd/MM/yy' }}</div>
              <div class="record-main">
                {{ healthLabel(h.type) }} @if (h.product) { — {{ h.product }} }
                <div class="record-sub">{{ h.animal ? ('Animal ' + (h.animal.tag || h.animal.id)) : 'Todo el lote' }} @if (h.cost) { · {{ h.cost | currency:'COP':'symbol-narrow':'1.0-0' }} }</div>
              </div>
              <button mat-icon-button class="record-del" (click)="removeHealth(h)"><mat-icon style="font-size:18px">delete</mat-icon></button>
            </div>
          }
        }
      </div>

      <div class="section">
        <div class="section-title"><div class="section-title-label"><mat-icon>warning</mat-icon>Mortalidad</div></div>
        <div class="quick-form">
          <input class="fi" type="date" [(ngModel)]="mortalityForm.date" style="width:140px">
          <input class="fi" type="number" placeholder="Cantidad" [(ngModel)]="mortalityForm.quantity" style="width:90px">
          <input class="fi" placeholder="Causa (opcional)" [(ngModel)]="mortalityForm.cause" style="width:160px">
          <button mat-flat-button style="background:#c05050;color:white" [disabled]="!mortalityForm.date || !mortalityForm.quantity" (click)="addMortality()">Registrar baja</button>
        </div>
        @if (!mortality().length) {
          <div class="empty-msg">Sin bajas registradas.</div>
        } @else {
          @for (m of mortality().slice(0, 10); track m.id) {
            <div class="record-row">
              <div class="record-date">{{ m.date | date:'dd/MM/yy' }}</div>
              <div class="record-main">{{ m.quantity }} baja(s) @if (m.cause) { — {{ m.cause }} }</div>
              <button mat-icon-button class="record-del" (click)="removeMortality(m)"><mat-icon style="font-size:18px">delete</mat-icon></button>
            </div>
          }
        }
      </div>
    }
  `,
})
export class LivestockDetailComponent implements OnInit {
  private route          = inject(ActivatedRoute);
  private router          = inject(Router);
  private svc             = inject(LivestockService);
  private animalsSvc      = inject(AnimalsService);
  private healthSvc       = inject(LivestockHealthService);
  private productionSvc   = inject(LivestockProductionService);
  private mortalitySvc    = inject(LivestockMortalityService);
  private snackBar        = inject(MatSnackBar);

  farmId  = signal(0);
  batchId = signal(0);
  batch   = signal<LivestockBatch | null>(null);
  animals = signal<Animal[]>([]);
  health  = signal<HealthRecord[]>([]);
  production = signal<ProductionRecord[]>([]);
  mortality  = signal<MortalityRecord[]>([]);
  loading = signal(true);

  healthTypes = HEALTH_TYPES;
  productionTypes = PRODUCTION_TYPES;

  healthForm: any = { date: '', type: 'VACUNA', product: '', cost: null };
  prodForm: any = { date: '', productType: 'LECHE', quantity: null };
  mortalityForm: any = { date: '', quantity: null, cause: '' };

  ngOnInit() {
    const p = this.route.snapshot.paramMap;
    this.farmId.set(Number(p.get('farmId')));
    this.batchId.set(Number(p.get('batchId')));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.get(this.farmId(), this.batchId()).subscribe({
      next: b => { this.batch.set(b); this.animals.set(b.animals ?? []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.healthSvc.list(this.farmId(), this.batchId()).subscribe(h => this.health.set(h));
    this.productionSvc.list(this.farmId(), this.batchId()).subscribe(p => this.production.set(p));
    this.mortalitySvc.list(this.farmId(), this.batchId()).subscribe(m => this.mortality.set(m));
  }

  addAnimal() {
    const tag = prompt('Arete/identificador del animal (opcional):');
    this.animalsSvc.create(this.farmId(), this.batchId(), { tag: tag || undefined }).subscribe({
      next: () => { this.load(); this.snackBar.open('Animal agregado', '', { duration: 2000 }); },
      error: () => this.snackBar.open('Error al agregar animal', '', { duration: 3000 }),
    });
  }

  addHealth() {
    this.healthSvc.create(this.farmId(), this.batchId(), this.healthForm).subscribe({
      next: () => { this.healthForm = { date: '', type: 'VACUNA', product: '', cost: null }; this.load(); this.snackBar.open('Registro de salud guardado', '', { duration: 2000 }); },
      error: () => this.snackBar.open('Error al guardar', '', { duration: 3000 }),
    });
  }
  removeHealth(h: HealthRecord) {
    if (!confirm('¿Eliminar este registro?')) return;
    this.healthSvc.remove(this.farmId(), this.batchId(), h.id).subscribe({ next: () => this.load() });
  }

  addProduction() {
    this.productionSvc.create(this.farmId(), this.batchId(), { ...this.prodForm, unit: this.prodForm.productType === 'HUEVOS' ? 'unidades' : this.prodForm.productType === 'LANA' ? 'kg' : 'litros' }).subscribe({
      next: () => { this.prodForm = { date: '', productType: 'LECHE', quantity: null }; this.load(); this.snackBar.open('Producción registrada', '', { duration: 2000 }); },
      error: () => this.snackBar.open('Error al guardar', '', { duration: 3000 }),
    });
  }
  removeProduction(p: ProductionRecord) {
    if (!confirm('¿Eliminar este registro?')) return;
    this.productionSvc.remove(this.farmId(), this.batchId(), p.id).subscribe({ next: () => this.load() });
  }

  addMortality() {
    this.mortalitySvc.create(this.farmId(), this.batchId(), this.mortalityForm).subscribe({
      next: () => { this.mortalityForm = { date: '', quantity: null, cause: '' }; this.load(); this.snackBar.open('Baja registrada', '', { duration: 2000 }); },
      error: () => this.snackBar.open('Error al guardar', '', { duration: 3000 }),
    });
  }
  removeMortality(m: MortalityRecord) {
    if (!confirm('¿Eliminar este registro?')) return;
    this.mortalitySvc.remove(this.farmId(), this.batchId(), m.id).subscribe({ next: () => this.load() });
  }

  goBack() { this.router.navigate(['/farms', this.farmId(), 'livestock']); }
  goActivities() { this.router.navigate(['/farms', this.farmId(), 'livestock', this.batchId(), 'activities']); }
  goAnimal(a: Animal) { this.router.navigate(['/farms', this.farmId(), 'livestock', this.batchId(), 'animals', a.id]); }

  sexLabel(s?: string) { return s ? (SEX_LABELS[s] ?? s) : '—'; }
  animalStatusLabel(s: string) { return ANIMAL_STATUS_LABELS[s] ?? s; }
  healthLabel(t: string) { return HEALTH_LABELS[t] ?? t; }
  productionLabel(t: string) { return PRODUCTION_LABELS[t] ?? t; }
}
