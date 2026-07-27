import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CropsService, Crop } from '../../core/services/crops.service';

const CROP_TYPES = ['CAFE','PLATANO','YUCA','MAIZ','AGUACATE','FRIJOL','OTRO'];
const CROP_LABELS: Record<string,string> = { CAFE:'Café', PLATANO:'Plátano', YUCA:'Yuca', MAIZ:'Maíz', AGUACATE:'Aguacate', FRIJOL:'Fríjol', OTRO:'Otro' };
const STATUS_LABELS: Record<string,string> = { ACTIVE:'Activo', HARVESTED:'Cosechado', INACTIVE:'Inactivo' };
const STATUS_COLORS: Record<string,string> = { ACTIVE:'#3d7034', HARVESTED:'#c4841a', INACTIVE:'#8a8a8a' };
const CROP_ICONS: Record<string,string> = { CAFE:'coffee', PLATANO:'park', YUCA:'spa', MAIZ:'grain', AGUACATE:'energy_savings_leaf', FRIJOL:'spa', OTRO:'grass' };

@Component({
  selector: 'app-crops',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, DatePipe],
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
    :host { display:block; padding:28px; font-family:'Plus Jakarta Sans',sans-serif; }

    .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
    .header h1 { font-family:'Fraunces',serif; font-size:24px; font-weight:700; color:#1c2b16; margin:0; }

    .add-btn { background:linear-gradient(135deg,#2a5225,#46883b) !important; color:white !important; border-radius:8px !important; box-shadow:0 3px 12px rgba(42,82,37,0.28) !important; }

    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); gap:16px; }

    .crop-card {
      background:white; border-radius:12px; border:1px solid #e8e0d0; padding:18px;
      box-shadow:0 1px 4px rgba(0,0,0,0.04); transition:all 0.18s ease;
    }
    .crop-card:hover { box-shadow:0 6px 20px rgba(0,0,0,0.08); transform:translateY(-2px); }

    .card-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:12px; }
    .crop-icon { width:42px; height:42px; border-radius:10px; background:rgba(125,171,110,0.15); border:1px solid rgba(125,171,110,0.25); display:flex; align-items:center; justify-content:center; color:#4a8f3f; }
    .crop-icon mat-icon { font-size:22px; width:22px; height:22px; }

    .status-badge { font-size:11px; font-weight:600; padding:3px 9px; border-radius:12px; }
    .crop-name { font-size:16px; font-weight:600; color:#1c2b16; margin-bottom:4px; }
    .crop-type { font-size:12px; color:#8a9882; margin-bottom:10px; }

    .meta { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:12px; }
    .meta-item { display:flex; align-items:center; gap:4px; font-size:12px; color:#7a8670; }
    .meta-item mat-icon { font-size:14px; width:14px; height:14px; }

    .divider { border:none; border-top:1px solid #f0ebe0; margin:10px 0; }
    .act-count { font-size:12.5px; color:#4a8f3f; font-weight:600; }

    .card-footer { display:flex; gap:6px; margin-top:12px; }

    .loading { display:flex; justify-content:center; padding:60px; }
    .empty { text-align:center; padding:60px 20px; color:#8a9882; }
    .empty mat-icon { font-size:54px; width:54px; height:54px; color:#c8d8c0; display:block; margin:0 auto 14px; }

    /* dialog */
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
        <h1>Cultivos</h1>
        <p style="color:#7a8670;font-size:13.5px;margin:4px 0 0">Gestiona los cultivos de la finca</p>
      </div>
      <button mat-flat-button class="add-btn" (click)="openDialog()">
        <mat-icon>add</mat-icon> Nuevo Cultivo
      </button>
    </div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="36"></mat-spinner></div>
    } @else if (!crops().length) {
      <div class="empty">
        <mat-icon>grass</mat-icon>
        <p>Sin cultivos registrados en esta finca.</p>
        <button mat-flat-button style="background:#2a5225;color:white;margin-top:10px" (click)="openDialog()">Agregar cultivo</button>
      </div>
    } @else {
      <div class="grid">
        @for (c of crops(); track c.id) {
          <div class="crop-card">
            <div class="card-top">
              <div class="crop-icon"><mat-icon>{{ cropIcon(c.type) }}</mat-icon></div>
              <span class="status-badge" [style.background]="statusColor(c.status)+'18'" [style.color]="statusColor(c.status)">
                {{ statusLabel(c.status) }}
              </span>
            </div>
            <div class="crop-name">{{ c.name }}</div>
            <div class="crop-type">{{ cropLabel(c.type) }}</div>
            <div class="meta">
              @if (c.hectares) {
                <div class="meta-item"><mat-icon>straighten</mat-icon>{{ c.hectares }} ha</div>
              }
              @if (c.plantingDate) {
                <div class="meta-item"><mat-icon>event</mat-icon>Siembra: {{ c.plantingDate | date:'dd/MM/yy' }}</div>
              }
              @if (c.expectedHarvestDate) {
                <div class="meta-item"><mat-icon>agriculture</mat-icon>Cosecha: {{ c.expectedHarvestDate | date:'dd/MM/yy' }}</div>
              }
            </div>
            <hr class="divider">
            <div class="act-count">{{ c._count?.activities ?? 0 }} actividades</div>
            <div class="card-footer">
              <button mat-stroked-button style="flex:1;font-size:12px;border-color:#c8d8c0;color:#2a5225"
                      (click)="goActivities(c)">
                <mat-icon style="font-size:15px">task</mat-icon> Actividades
              </button>
              <button mat-icon-button style="color:#7a8670" (click)="openDialog(c)"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button style="color:#d07070" (click)="remove(c)"><mat-icon>delete</mat-icon></button>
            </div>
          </div>
        }
      </div>
    }

    @if (showDialog()) {
      <div class="dialog-overlay" (click)="showDialog.set(false)">
        <div class="dialog" (click)="$event.stopPropagation()">
          <h2>{{ editCrop() ? 'Editar Cultivo' : 'Nuevo Cultivo' }}</h2>
          <div class="field-group">
            <input class="fi" placeholder="Nombre *" [(ngModel)]="form.name">
            <select class="fi" [(ngModel)]="form.type">
              @for (t of types; track t) { <option [value]="t">{{ cropLabel(t) }}</option> }
            </select>
            <input class="fi" type="number" placeholder="Hectáreas" [(ngModel)]="form.hectares">
            <input class="fi" type="date" placeholder="Fecha de siembra" [(ngModel)]="form.plantingDate">
            <input class="fi" type="date" placeholder="Fecha estimada cosecha" [(ngModel)]="form.expectedHarvestDate">
            <select class="fi" [(ngModel)]="form.status">
              <option value="ACTIVE">Activo</option>
              <option value="HARVESTED">Cosechado</option>
              <option value="INACTIVE">Inactivo</option>
            </select>
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
export class CropsComponent implements OnInit {
  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  private svc      = inject(CropsService);
  private snackBar = inject(MatSnackBar);

  farmId    = signal(0);
  crops     = signal<Crop[]>([]);
  loading   = signal(true);
  saving    = signal(false);
  showDialog = signal(false);
  editCrop  = signal<Crop | null>(null);
  types     = CROP_TYPES;

  form = { name: '', type: 'CAFE', hectares: null as number | null, plantingDate: '', expectedHarvestDate: '', status: 'ACTIVE' };

  ngOnInit() { this.farmId.set(Number(this.route.snapshot.paramMap.get('farmId'))); this.load(); }

  load() {
    this.loading.set(true);
    this.svc.list(this.farmId()).subscribe({ next: c => { this.crops.set(c); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  openDialog(crop?: Crop) {
    this.editCrop.set(crop ?? null);
    this.form = {
      name: crop?.name ?? '', type: crop?.type ?? 'CAFE',
      hectares: crop?.hectares ?? null,
      plantingDate: crop?.plantingDate?.substring(0,10) ?? '',
      expectedHarvestDate: crop?.expectedHarvestDate?.substring(0,10) ?? '',
      status: crop?.status ?? 'ACTIVE',
    };
    this.showDialog.set(true);
  }

  save() {
    this.saving.set(true);
    const data: any = { ...this.form, hectares: this.form.hectares ?? null };
    const req = this.editCrop() ? this.svc.update(this.farmId(), this.editCrop()!.id, data) : this.svc.create(this.farmId(), data);
    req.subscribe({
      next: () => { this.saving.set(false); this.showDialog.set(false); this.load(); this.snackBar.open('Cultivo guardado', '', { duration: 2500 }); },
      error: () => { this.saving.set(false); this.snackBar.open('Error al guardar', '', { duration: 3000 }); },
    });
  }

  remove(c: Crop) {
    if (!confirm(`¿Eliminar "${c.name}"?`)) return;
    this.svc.remove(this.farmId(), c.id).subscribe({ next: () => { this.load(); this.snackBar.open('Cultivo eliminado', '', { duration: 2500 }); } });
  }

  goActivities(c: Crop) { this.router.navigate(['/farms', this.farmId(), 'crops', c.id, 'activities']); }

  cropLabel(t: string)  { return CROP_LABELS[t] ?? t; }
  statusLabel(s: string){ return STATUS_LABELS[s] ?? s; }
  statusColor(s: string){ return STATUS_COLORS[s] ?? '#888'; }
  cropIcon(t: string)   { return CROP_ICONS[t] ?? 'grass'; }
}
