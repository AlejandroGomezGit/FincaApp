import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CurrencyPipe } from '@angular/common';
import { ActivitiesService, Activity } from '../../core/services/activities.service';

const CATEGORIES = ['SIEMBRA','FERTILIZACION','FUMIGACION','PODA','COSECHA','MANTENIMIENTO','RIEGO','OTRO'];
const CAT_LABELS: Record<string,string> = { SIEMBRA:'Siembra', FERTILIZACION:'Fertilización', FUMIGACION:'Fumigación', PODA:'Poda', COSECHA:'Cosecha', MANTENIMIENTO:'Mantenimiento', RIEGO:'Riego', OTRO:'Otro' };
const CAT_ICONS: Record<string,string>  = { SIEMBRA:'yard', FERTILIZACION:'science', FUMIGACION:'cloud', PODA:'content_cut', COSECHA:'agriculture', MANTENIMIENTO:'build', RIEGO:'water_drop', OTRO:'miscellaneous_services' };
const CAT_COLORS: Record<string,string> = { SIEMBRA:'#4a8f3f', FERTILIZACION:'#3c78c8', FUMIGACION:'#9b59b6', PODA:'#c4841a', COSECHA:'#e67e22', MANTENIMIENTO:'#7f8c8d', RIEGO:'#1abc9c', OTRO:'#8a9882' };
const STATUS_LABELS: Record<string,string> = { IN_PROGRESS:'En progreso', COMPLETED:'Completada', CANCELLED:'Cancelada' };
const STATUS_COLORS: Record<string,string> = { IN_PROGRESS:'#c4841a', COMPLETED:'#3d7034', CANCELLED:'#c05050' };

@Component({
  selector: 'app-activities',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, DatePipe, CurrencyPipe],
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
    :host { display:block; padding:28px; font-family:'Plus Jakarta Sans',sans-serif; }

    .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
    .header h1 { font-family:'Fraunces',serif; font-size:24px; font-weight:700; color:#1c2b16; margin:0; }
    .add-btn { background:linear-gradient(135deg,#2a5225,#46883b) !important; color:white !important; border-radius:8px !important; box-shadow:0 3px 12px rgba(42,82,37,0.28) !important; }

    .act-list { display:flex; flex-direction:column; gap:12px; }

    .act-card {
      background:white; border-radius:12px; border:1px solid #e8e0d0; padding:16px 18px;
      box-shadow:0 1px 4px rgba(0,0,0,0.04);
    }

    .act-top { display:flex; align-items:center; gap:12px; margin-bottom:10px; }
    .cat-icon { width:38px; height:38px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .cat-icon mat-icon { font-size:20px; width:20px; height:20px; color:white; }

    .act-title { flex:1; }
    .act-name { font-size:15px; font-weight:600; color:#1c2b16; }
    .act-cat  { font-size:12px; color:#8a9882; }

    .status-badge { font-size:11px; font-weight:600; padding:3px 9px; border-radius:12px; }

    .act-meta { display:flex; flex-wrap:wrap; gap:14px; margin-bottom:12px; }
    .meta-item { display:flex; align-items:center; gap:5px; font-size:12.5px; color:#7a8670; }
    .meta-item mat-icon { font-size:14px; width:14px; height:14px; }
    .meta-highlight { font-weight:700; color:#2a5225; }

    .act-footer { display:flex; gap:6px; justify-content:flex-end; }

    .loading { display:flex; justify-content:center; padding:60px; }
    .empty { text-align:center; padding:60px 20px; color:#8a9882; }
    .empty mat-icon { font-size:54px; width:54px; height:54px; color:#c8d8c0; display:block; margin:0 auto 14px; }

    .dialog-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:1000; display:flex; align-items:center; justify-content:center; }
    .dialog { background:white; border-radius:14px; padding:28px; min-width:380px; max-width:500px; box-shadow:0 20px 60px rgba(0,0,0,0.2); }
    .dialog h2 { font-family:'Fraunces',serif; font-size:22px; color:#1c2b16; margin:0 0 20px; }
    .field-group { display:flex; flex-direction:column; gap:12px; margin-bottom:20px; }
    .fi { padding:11px 14px; border:1.5px solid #e0d8cc; border-radius:8px; font-size:14px; font-family:inherit; outline:none; width:100%; box-sizing:border-box; }
    .fi:focus { border-color:#7dab6e; }
    .dialog-footer { display:flex; gap:8px; justify-content:flex-end; }

    .duration-badge { font-size:11.5px; font-weight:600; color:#3c78c8; background:rgba(60,120,200,0.1); padding:2px 8px; border-radius:10px; }
  `],
  template: `
    <div class="header">
      <div>
        <h1>Actividades</h1>
        <p style="color:#7a8670;font-size:13.5px;margin:4px 0 0">Cultivo: {{ cropId() }} · Finca: {{ farmId() }}</p>
      </div>
      <button mat-flat-button class="add-btn" (click)="openDialog()">
        <mat-icon>add</mat-icon> Nueva Actividad
      </button>
    </div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="36"></mat-spinner></div>
    } @else if (!activities().length) {
      <div class="empty">
        <mat-icon>task</mat-icon>
        <p>Sin actividades registradas en este cultivo.</p>
        <button mat-flat-button style="background:#2a5225;color:white;margin-top:10px" (click)="openDialog()">Agregar actividad</button>
      </div>
    } @else {
      <div class="act-list">
        @for (a of activities(); track a.id) {
          <div class="act-card">
            <div class="act-top">
              <div class="cat-icon" [style.background]="catColor(a.category)">
                <mat-icon>{{ catIcon(a.category) }}</mat-icon>
              </div>
              <div class="act-title">
                <div class="act-name">{{ a.name }}</div>
                <div class="act-cat">{{ catLabel(a.category) }}</div>
              </div>
              <span class="status-badge" [style.background]="statusColor(a.status)+'18'" [style.color]="statusColor(a.status)">
                {{ statusLabel(a.status) }}
              </span>
            </div>

            <div class="act-meta">
              <div class="meta-item">
                <mat-icon>event</mat-icon>
                Inicio: {{ a.startDate | date:'dd/MM/yyyy' }}
              </div>
              @if (a.endDate) {
                <div class="meta-item">
                  <mat-icon>event_available</mat-icon>
                  Fin: {{ a.endDate | date:'dd/MM/yyyy' }}
                </div>
              }
              <div class="meta-item">
                <mat-icon>schedule</mat-icon>
                <span class="duration-badge">{{ durationDays(a) }} días</span>
              </div>
              @if ((a.totalJornales ?? 0) > 0) {
                <div class="meta-item">
                  <mat-icon>people</mat-icon>
                  <span class="meta-highlight">{{ a.totalJornales }} jornales</span>
                </div>
                <div class="meta-item">
                  <mat-icon>attach_money</mat-icon>
                  <span class="meta-highlight">{{ a.totalCostJornales | currency:'COP':'symbol-narrow':'1.0-0' }}</span>
                </div>
              }
            </div>

            <div class="act-footer">
              <button mat-stroked-button style="font-size:12px;border-color:#c8d8c0;color:#2a5225"
                      (click)="goJornales(a)">
                <mat-icon style="font-size:15px">people</mat-icon> Jornales
              </button>
              <button mat-icon-button style="color:#7a8670" (click)="openDialog(a)"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button style="color:#d07070" (click)="remove(a)"><mat-icon>delete</mat-icon></button>
            </div>
          </div>
        }
      </div>
    }

    @if (showDialog()) {
      <div class="dialog-overlay" (click)="showDialog.set(false)">
        <div class="dialog" (click)="$event.stopPropagation()">
          <h2>{{ editActivity() ? 'Editar Actividad' : 'Nueva Actividad' }}</h2>
          <div class="field-group">
            <input class="fi" placeholder="Nombre *" [(ngModel)]="form.name">
            <select class="fi" [(ngModel)]="form.category">
              @for (c of categories; track c) { <option [value]="c">{{ catLabel(c) }}</option> }
            </select>
            <input class="fi" type="date" placeholder="Fecha de inicio *" [(ngModel)]="form.startDate">
            <input class="fi" type="date" placeholder="Fecha de fin (opcional)" [(ngModel)]="form.endDate">
            <select class="fi" [(ngModel)]="form.status">
              <option value="IN_PROGRESS">En progreso</option>
              <option value="COMPLETED">Completada</option>
              <option value="CANCELLED">Cancelada</option>
            </select>
            <textarea class="fi" placeholder="Descripción" [(ngModel)]="form.description" rows="2" style="resize:none"></textarea>
          </div>
          <div class="dialog-footer">
            <button mat-button (click)="showDialog.set(false)">Cancelar</button>
            <button mat-flat-button style="background:#2a5225;color:white;border-radius:8px"
                    [disabled]="!form.name || !form.startDate || saving()" (click)="save()">
              {{ saving() ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ActivitiesComponent implements OnInit {
  private route    = inject(ActivatedRoute);
  private router   = inject(Router);
  private svc      = inject(ActivitiesService);
  private snackBar = inject(MatSnackBar);

  farmId       = signal(0);
  cropId       = signal(0);
  activities   = signal<Activity[]>([]);
  loading      = signal(true);
  saving       = signal(false);
  showDialog   = signal(false);
  editActivity = signal<Activity | null>(null);
  categories   = CATEGORIES;

  form = { name: '', category: 'MANTENIMIENTO', startDate: '', endDate: '', status: 'IN_PROGRESS', description: '' };

  ngOnInit() {
    this.farmId.set(Number(this.route.snapshot.paramMap.get('farmId')));
    this.cropId.set(Number(this.route.snapshot.paramMap.get('cropId')));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.svc.list(this.farmId(), this.cropId()).subscribe({
      next: a => { this.activities.set(a); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openDialog(a?: Activity) {
    this.editActivity.set(a ?? null);
    this.form = {
      name: a?.name ?? '', category: a?.category ?? 'MANTENIMIENTO',
      startDate: a?.startDate?.substring(0,10) ?? '',
      endDate: a?.endDate?.substring(0,10) ?? '',
      status: a?.status ?? 'IN_PROGRESS',
      description: a?.description ?? '',
    };
    this.showDialog.set(true);
  }

  save() {
    this.saving.set(true);
    const data: any = { ...this.form, endDate: this.form.endDate || null };
    const req = this.editActivity()
      ? this.svc.update(this.farmId(), this.cropId(), this.editActivity()!.id, data)
      : this.svc.create(this.farmId(), this.cropId(), data);
    req.subscribe({
      next: () => { this.saving.set(false); this.showDialog.set(false); this.load(); this.snackBar.open('Actividad guardada', '', { duration: 2500 }); },
      error: () => { this.saving.set(false); this.snackBar.open('Error al guardar', '', { duration: 3000 }); },
    });
  }

  remove(a: Activity) {
    if (!confirm(`¿Eliminar "${a.name}"?`)) return;
    this.svc.remove(this.farmId(), this.cropId(), a.id).subscribe({ next: () => { this.load(); this.snackBar.open('Actividad eliminada', '', { duration: 2500 }); } });
  }

  goJornales(a: Activity) {
    this.router.navigate(['/farms', this.farmId(), 'crops', this.cropId(), 'activities', a.id, 'jornales']);
  }

  durationDays(a: Activity): number {
    const start = new Date(a.startDate);
    const end   = a.endDate ? new Date(a.endDate) : new Date();
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000));
  }

  catLabel(c: string)  { return CAT_LABELS[c] ?? c; }
  catIcon(c: string)   { return CAT_ICONS[c] ?? 'task'; }
  catColor(c: string)  { return CAT_COLORS[c] ?? '#7dab6e'; }
  statusLabel(s: string){ return STATUS_LABELS[s] ?? s; }
  statusColor(s: string){ return STATUS_COLORS[s] ?? '#888'; }
}
