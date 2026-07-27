import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LivestockService, LivestockBatch } from '../../core/services/livestock.service';

const SPECIES = ['BOVINO', 'AVES', 'PORCINO', 'OVINO', 'CAPRINO', 'EQUINO', 'OTRO'];
const SPECIES_LABELS: Record<string, string> = { BOVINO: 'Bovino', AVES: 'Aves', PORCINO: 'Porcino', OVINO: 'Ovino', CAPRINO: 'Caprino', EQUINO: 'Equino', OTRO: 'Otro' };
const SPECIES_ICONS: Record<string, string> = { BOVINO: 'pets', AVES: 'egg', PORCINO: 'pets', OVINO: 'pets', CAPRINO: 'pets', EQUINO: 'pets', OTRO: 'pets' };
const PURPOSES = ['LECHE', 'CARNE', 'HUEVOS', 'REPRODUCCION', 'DOBLE_PROPOSITO', 'OTRO'];
const PURPOSE_LABELS: Record<string, string> = { LECHE: 'Leche', CARNE: 'Carne', HUEVOS: 'Huevos', REPRODUCCION: 'Reproducción', DOBLE_PROPOSITO: 'Doble propósito', OTRO: 'Otro' };
const STATUS_LABELS: Record<string, string> = { ACTIVE: 'Activo', INACTIVE: 'Inactivo' };
const STATUS_COLORS: Record<string, string> = { ACTIVE: '#3d7034', INACTIVE: '#8a8a8a' };

@Component({
  selector: 'app-livestock',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
    :host { display:block; padding:28px; font-family:'Plus Jakarta Sans',sans-serif; }

    .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
    .header h1 { font-family:'Fraunces',serif; font-size:24px; font-weight:700; color:#1c2b16; margin:0; }
    .add-btn { background:linear-gradient(135deg,#2a5225,#46883b) !important; color:white !important; border-radius:8px !important; box-shadow:0 3px 12px rgba(42,82,37,0.28) !important; }

    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); gap:16px; }

    .batch-card { background:white; border-radius:12px; border:1px solid #e8e0d0; padding:18px; box-shadow:0 1px 4px rgba(0,0,0,0.04); transition:all 0.18s ease; }
    .batch-card:hover { box-shadow:0 6px 20px rgba(0,0,0,0.08); transform:translateY(-2px); }

    .card-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:12px; }
    .batch-icon { width:42px; height:42px; border-radius:10px; background:rgba(160,118,74,0.15); border:1px solid rgba(160,118,74,0.25); display:flex; align-items:center; justify-content:center; color:#a0764a; }
    .batch-icon mat-icon { font-size:22px; width:22px; height:22px; }

    .status-badge { font-size:11px; font-weight:600; padding:3px 9px; border-radius:12px; }
    .batch-name { font-size:16px; font-weight:600; color:#1c2b16; margin-bottom:4px; }
    .batch-type { font-size:12px; color:#8a9882; margin-bottom:10px; }

    .meta { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
    .meta-item { display:flex; align-items:center; gap:4px; font-size:12px; color:#7a8670; }
    .meta-item mat-icon { font-size:14px; width:14px; height:14px; }

    .divider { border:none; border-top:1px solid #f0ebe0; margin:10px 0; }
    .animal-count { font-size:12.5px; color:#a0764a; font-weight:600; }

    .card-footer { display:flex; gap:6px; margin-top:12px; }

    .loading { display:flex; justify-content:center; padding:60px; }
    .empty { text-align:center; padding:60px 20px; color:#8a9882; }
    .empty mat-icon { font-size:54px; width:54px; height:54px; color:#c8d8c0; display:block; margin:0 auto 14px; }

    .dialog-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:1000; display:flex; align-items:center; justify-content:center; }
    .dialog { background:white; border-radius:14px; padding:28px; min-width:380px; max-width:480px; box-shadow:0 20px 60px rgba(0,0,0,0.2); }
    .dialog h2 { font-family:'Fraunces',serif; font-size:22px; color:#1c2b16; margin:0 0 20px; }
    .field-group { display:flex; flex-direction:column; gap:12px; margin-bottom:20px; }
    .fi { padding:11px 14px; border:1.5px solid #e0d8cc; border-radius:8px; font-size:14px; font-family:inherit; outline:none; width:100%; box-sizing:border-box; }
    .fi:focus { border-color:#7dab6e; }
    select.fi { background:white; }
    .dialog-footer { display:flex; gap:8px; justify-content:flex-end; }
  `],
  template: `
    <div class="header">
      <div>
        <h1>Ganado y Aves</h1>
        <p style="color:#7a8670;font-size:13.5px;margin:4px 0 0">Lotes de animales de la finca</p>
      </div>
      <button mat-flat-button class="add-btn" (click)="openDialog()">
        <mat-icon>add</mat-icon> Nuevo Lote
      </button>
    </div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="36"></mat-spinner></div>
    } @else if (!batches().length) {
      <div class="empty">
        <mat-icon>pets</mat-icon>
        <p>Sin lotes de ganado registrados en esta finca.</p>
        <button mat-flat-button style="background:#2a5225;color:white;margin-top:10px" (click)="openDialog()">Agregar lote</button>
      </div>
    } @else {
      <div class="grid">
        @for (b of batches(); track b.id) {
          <div class="batch-card">
            <div class="card-top">
              <div class="batch-icon"><mat-icon>{{ speciesIcon(b.species) }}</mat-icon></div>
              <span class="status-badge" [style.background]="statusColor(b.status)+'18'" [style.color]="statusColor(b.status)">
                {{ statusLabel(b.status) }}
              </span>
            </div>
            <div class="batch-name">{{ b.name }}</div>
            <div class="batch-type">{{ speciesLabel(b.species) }} · {{ purposeLabel(b.purpose) }}</div>
            <div class="meta">
              <div class="meta-item"><mat-icon>numbers</mat-icon>{{ b.quantity }} cabeza(s)</div>
              @if (b.acquisitionDate) {
                <div class="meta-item"><mat-icon>event</mat-icon>Desde {{ b.acquisitionDate | date:'dd/MM/yy' }}</div>
              }
            </div>
            <hr class="divider">
            <div class="animal-count">{{ b._count?.animals ?? 0 }} animal(es) individual(es)</div>
            <div class="card-footer">
              <button mat-stroked-button style="flex:1;font-size:12px;border-color:#c8d8c0;color:#2a5225" (click)="goDetail(b)">
                <mat-icon style="font-size:15px">visibility</mat-icon> Ver lote
              </button>
              <button mat-icon-button style="color:#7a8670" (click)="openDialog(b)"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button style="color:#d07070" (click)="remove(b)"><mat-icon>delete</mat-icon></button>
            </div>
          </div>
        }
      </div>
    }

    @if (showDialog()) {
      <div class="dialog-overlay" (click)="showDialog.set(false)">
        <div class="dialog" (click)="$event.stopPropagation()">
          <h2>{{ editBatch() ? 'Editar Lote' : 'Nuevo Lote' }}</h2>
          <div class="field-group">
            <input class="fi" placeholder="Nombre *" [(ngModel)]="form.name">
            <select class="fi" [(ngModel)]="form.species">
              @for (s of species; track s) { <option [value]="s">{{ speciesLabel(s) }}</option> }
            </select>
            <select class="fi" [(ngModel)]="form.purpose">
              @for (p of purposes; track p) { <option [value]="p">{{ purposeLabel(p) }}</option> }
            </select>
            <input class="fi" type="number" placeholder="Cantidad de cabezas/aves" [(ngModel)]="form.quantity" min="0">
            <input class="fi" type="date" placeholder="Fecha de adquisición" [(ngModel)]="form.acquisitionDate">
            <textarea class="fi" placeholder="Notas" [(ngModel)]="form.notes" rows="2" style="resize:none"></textarea>
          </div>
          <div class="dialog-footer">
            <button mat-button (click)="showDialog.set(false)">Cancelar</button>
            <button mat-flat-button style="background:#2a5225;color:white;border-radius:8px"
                    [disabled]="!form.name || saving()" (click)="save()">
              {{ saving() ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class LivestockComponent implements OnInit {
  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  private svc      = inject(LivestockService);
  private snackBar = inject(MatSnackBar);

  farmId     = signal(0);
  batches    = signal<LivestockBatch[]>([]);
  loading    = signal(true);
  saving     = signal(false);
  showDialog = signal(false);
  editBatch  = signal<LivestockBatch | null>(null);
  species    = SPECIES;
  purposes   = PURPOSES;

  form = { name: '', species: 'BOVINO', purpose: 'LECHE', quantity: 1 as number | null, acquisitionDate: '', notes: '' };

  ngOnInit() { this.farmId.set(Number(this.route.snapshot.paramMap.get('farmId'))); this.load(); }

  load() {
    this.loading.set(true);
    this.svc.list(this.farmId()).subscribe({ next: b => { this.batches.set(b); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  openDialog(b?: LivestockBatch) {
    this.editBatch.set(b ?? null);
    this.form = {
      name: b?.name ?? '', species: b?.species ?? 'BOVINO', purpose: b?.purpose ?? 'LECHE',
      quantity: b?.quantity ?? 1,
      acquisitionDate: b?.acquisitionDate?.substring(0, 10) ?? '',
      notes: b?.notes ?? '',
    };
    this.showDialog.set(true);
  }

  save() {
    this.saving.set(true);
    const data: any = { ...this.form, quantity: this.form.quantity ?? 1 };
    const req = this.editBatch() ? this.svc.update(this.farmId(), this.editBatch()!.id, data) : this.svc.create(this.farmId(), data);
    req.subscribe({
      next: () => { this.saving.set(false); this.showDialog.set(false); this.load(); this.snackBar.open('Lote guardado', '', { duration: 2500 }); },
      error: () => { this.saving.set(false); this.snackBar.open('Error al guardar', '', { duration: 3000 }); },
    });
  }

  remove(b: LivestockBatch) {
    if (!confirm(`¿Eliminar "${b.name}"? Esto borra también sus animales y registros.`)) return;
    this.svc.remove(this.farmId(), b.id).subscribe({ next: () => { this.load(); this.snackBar.open('Lote eliminado', '', { duration: 2500 }); } });
  }

  goDetail(b: LivestockBatch) { this.router.navigate(['/farms', this.farmId(), 'livestock', b.id]); }

  speciesLabel(s: string) { return SPECIES_LABELS[s] ?? s; }
  speciesIcon(s: string)  { return SPECIES_ICONS[s] ?? 'pets'; }
  purposeLabel(p: string) { return PURPOSE_LABELS[p] ?? p; }
  statusLabel(s: string)  { return STATUS_LABELS[s] ?? s; }
  statusColor(s: string)  { return STATUS_COLORS[s] ?? '#888'; }
}
