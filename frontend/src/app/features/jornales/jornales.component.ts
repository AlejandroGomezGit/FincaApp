import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { JornalesService, Jornal } from '../../core/services/jornales.service';
import { WorkersService, Worker } from '../../core/services/workers.service';

@Component({
  selector: 'app-jornales',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, CurrencyPipe, DatePipe],
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
    :host { display:block; padding:28px; font-family:'Plus Jakarta Sans',sans-serif; }

    .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
    .header h1 { font-family:'Fraunces',serif; font-size:24px; font-weight:700; color:#1c2b16; margin:0; }
    .add-btn { background:linear-gradient(135deg,#2a5225,#46883b) !important; color:white !important; border-radius:8px !important; box-shadow:0 3px 12px rgba(42,82,37,0.28) !important; }

    /* summary strip */
    .summary { display:flex; gap:16px; margin-bottom:24px; flex-wrap:wrap; }
    .sum-card { background:white; border-radius:10px; border:1px solid #e8e0d0; padding:14px 20px; flex:1; min-width:140px; }
    .sum-val { font-size:22px; font-weight:700; color:#2a5225; }
    .sum-lbl { font-size:11px; text-transform:uppercase; letter-spacing:0.7px; color:#9aaa90; margin-top:2px; }

    .table-wrap { background:white; border-radius:12px; border:1px solid #e8e0d0; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.04); }

    .table-header {
      display:grid; grid-template-columns:auto 1fr 80px 120px 120px 120px;
      padding:10px 16px; background:#f7f3eb; border-bottom:1px solid #e8e0d0;
      font-size:11px; font-weight:600; letter-spacing:0.8px; text-transform:uppercase; color:#8a9882;
    }

    .table-row {
      display:grid; grid-template-columns:auto 1fr 80px 120px 120px 120px;
      padding:13px 16px; border-bottom:1px solid #f0ebe0; align-items:center;
      transition:background 0.12s;
    }
    .table-row:last-child { border-bottom:none; }
    .table-row:hover { background:#faf7f0; }

    .avatar { width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg,#7dab6e,#3d7534); display:flex; align-items:center; justify-content:center; color:white; font-size:12px; font-weight:700; flex-shrink:0; margin-right:10px; }

    .worker-name { font-size:14px; font-weight:600; color:#1c2b16; display:flex; align-items:center; }
    .cell { font-size:13.5px; color:#4a5640; }
    .cost-val { font-size:14px; font-weight:700; color:#2a5225; }
    .actions { display:flex; gap:2px; justify-content:flex-end; }

    .loading { display:flex; justify-content:center; padding:60px; }
    .empty { text-align:center; padding:60px 20px; color:#8a9882; }
    .empty mat-icon { font-size:54px; width:54px; height:54px; color:#c8d8c0; display:block; margin:0 auto 14px; }

    .dialog-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:1000; display:flex; align-items:center; justify-content:center; }
    .dialog { background:white; border-radius:14px; padding:28px; min-width:360px; max-width:460px; box-shadow:0 20px 60px rgba(0,0,0,0.2); }
    .dialog h2 { font-family:'Fraunces',serif; font-size:22px; color:#1c2b16; margin:0 0 20px; }
    .field-group { display:flex; flex-direction:column; gap:12px; margin-bottom:20px; }
    .fi { padding:11px 14px; border:1.5px solid #e0d8cc; border-radius:8px; font-size:14px; font-family:inherit; outline:none; width:100%; box-sizing:border-box; }
    .fi:focus { border-color:#7dab6e; }
    select.fi { background:white; }
    .dialog-footer { display:flex; gap:8px; justify-content:flex-end; }
    .preview { background:#f7f3eb; border-radius:8px; padding:12px 14px; font-size:13px; color:#4a5640; border:1px solid #e8e0d0; }
    .preview strong { color:#2a5225; }

    @media(max-width:768px) {
      .table-header, .table-row { grid-template-columns:auto 1fr 80px 120px; }
      .col-date, .col-notes { display:none; }
    }
  `],
  template: `
    <div class="header">
      <div>
        <h1>Jornales</h1>
        <p style="color:#7a8670;font-size:13.5px;margin:4px 0 0">Registro de mano de obra por actividad</p>
      </div>
      <button mat-flat-button class="add-btn" (click)="openDialog()">
        <mat-icon>add</mat-icon> Registrar Jornal
      </button>
    </div>

    @if (!loading()) {
      <div class="summary">
        <div class="sum-card">
          <div class="sum-val">{{ totalDays() }}</div>
          <div class="sum-lbl">Jornales totales</div>
        </div>
        <div class="sum-card">
          <div class="sum-val">{{ totalCost() | currency:'COP':'symbol-narrow':'1.0-0' }}</div>
          <div class="sum-lbl">Costo total</div>
        </div>
        <div class="sum-card">
          <div class="sum-val">{{ uniqueWorkers() }}</div>
          <div class="sum-lbl">Trabajadores</div>
        </div>
      </div>
    }

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="36"></mat-spinner></div>
    } @else if (!jornales().length) {
      <div class="empty">
        <mat-icon>people</mat-icon>
        <p>Sin jornales registrados en esta actividad.</p>
        <button mat-flat-button style="background:#2a5225;color:white;margin-top:10px" (click)="openDialog()">Registrar primer jornal</button>
      </div>
    } @else {
      <div class="table-wrap">
        <div class="table-header">
          <div>Trabajador</div>
          <div></div>
          <div>Días</div>
          <div>Valor/día</div>
          <div>Total</div>
          <div class="col-date">Fecha</div>
        </div>
        @for (j of jornales(); track j.id) {
          <div class="table-row">
            <div class="avatar">{{ j.worker?.name?.charAt(0)?.toUpperCase() ?? '?' }}</div>
            <div class="worker-name">{{ j.worker?.name ?? 'Trabajador' }}</div>
            <div class="cell">{{ j.days }}</div>
            <div class="cell">{{ j.dailyValue | currency:'COP':'symbol-narrow':'1.0-0' }}</div>
            <div class="cost-val">{{ j.days * j.dailyValue | currency:'COP':'symbol-narrow':'1.0-0' }}</div>
            <div class="cell col-date">{{ j.date | date:'dd/MM/yy' }}</div>
            <div class="actions">
              <button mat-icon-button style="color:#7a8670" (click)="openDialog(j)"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button style="color:#d07070" (click)="remove(j)"><mat-icon>delete</mat-icon></button>
            </div>
          </div>
        }
      </div>
    }

    @if (showDialog()) {
      <div class="dialog-overlay" (click)="showDialog.set(false)">
        <div class="dialog" (click)="$event.stopPropagation()">
          <h2>{{ editJornal() ? 'Editar Jornal' : 'Registrar Jornal' }}</h2>
          <div class="field-group">
            <select class="fi" [(ngModel)]="form.workerId">
              <option value="">Seleccionar trabajador *</option>
              @for (w of workers(); track w.id) {
                <option [value]="w.id">{{ w.name }}</option>
              }
            </select>
            <input class="fi" type="date" [(ngModel)]="form.date" placeholder="Fecha *">
            <input class="fi" type="number" [(ngModel)]="form.days" placeholder="Número de jornales *" min="0.5" step="0.5">
            <input class="fi" type="number" [(ngModel)]="form.dailyValue" placeholder="Valor por jornal (COP) *">
            <textarea class="fi" [(ngModel)]="form.notes" placeholder="Notas" rows="2" style="resize:none"></textarea>
            @if (form.days && form.dailyValue) {
              <div class="preview">
                Costo total: <strong>{{ form.days * form.dailyValue | currency:'COP':'symbol-narrow':'1.0-0' }}</strong>
              </div>
            }
          </div>
          <div class="dialog-footer">
            <button mat-button (click)="showDialog.set(false)">Cancelar</button>
            <button mat-flat-button style="background:#2a5225;color:white;border-radius:8px"
                    [disabled]="!form.workerId || !form.date || !form.days || !form.dailyValue || saving()" (click)="save()">
              {{ saving() ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class JornalesComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private svc        = inject(JornalesService);
  private workersSvc = inject(WorkersService);
  private snackBar   = inject(MatSnackBar);

  farmId     = signal(0);
  cropId     = signal<number | null>(null);
  batchId    = signal<number | null>(null);
  activityId = signal(0);
  jornales   = signal<Jornal[]>([]);
  workers    = signal<Worker[]>([]);
  loading    = signal(true);
  saving     = signal(false);
  showDialog = signal(false);
  editJornal = signal<Jornal | null>(null);

  form = { workerId: '' as any, date: '', days: null as number | null, dailyValue: null as number | null, notes: '' };

  totalDays     = () => this.jornales().reduce((s, j) => s + j.days, 0);
  totalCost     = () => this.jornales().reduce((s, j) => s + j.days * j.dailyValue, 0);
  uniqueWorkers = () => new Set(this.jornales().map(j => j.workerId)).size;

  ngOnInit() {
    const p = this.route.snapshot.paramMap;
    this.farmId.set(Number(p.get('farmId')));
    this.cropId.set(p.get('cropId') ? Number(p.get('cropId')) : null);
    this.batchId.set(p.get('batchId') ? Number(p.get('batchId')) : null);
    this.activityId.set(Number(p.get('activityId')));
    this.load();
    this.workersSvc.list(this.farmId()).subscribe(w => this.workers.set(w));
  }

  private parent() {
    return this.cropId() != null ? { cropId: this.cropId()! } : { batchId: this.batchId()! };
  }

  load() {
    this.loading.set(true);
    this.svc.list(this.farmId(), this.parent(), this.activityId()).subscribe({
      next: j => { this.jornales.set(j); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openDialog(j?: Jornal) {
    this.editJornal.set(j ?? null);
    this.form = {
      workerId: j?.workerId ?? '',
      date: j?.date?.substring(0,10) ?? '',
      days: j?.days ?? null,
      dailyValue: j?.dailyValue ?? null,
      notes: j?.notes ?? '',
    };
    this.showDialog.set(true);
  }

  save() {
    this.saving.set(true);
    const data: any = { workerId: this.form.workerId, date: this.form.date, days: this.form.days, dailyValue: this.form.dailyValue, notes: this.form.notes || null };
    const req = this.editJornal()
      ? this.svc.update(this.farmId(), this.parent(), this.activityId(), this.editJornal()!.id, data)
      : this.svc.create(this.farmId(), this.parent(), this.activityId(), data);
    req.subscribe({
      next: () => { this.saving.set(false); this.showDialog.set(false); this.load(); this.snackBar.open('Jornal guardado', '', { duration: 2500 }); },
      error: () => { this.saving.set(false); this.snackBar.open('Error al guardar', '', { duration: 3000 }); },
    });
  }

  remove(j: Jornal) {
    if (!confirm('¿Eliminar este jornal?')) return;
    this.svc.remove(this.farmId(), this.parent(), this.activityId(), j.id).subscribe({ next: () => { this.load(); this.snackBar.open('Jornal eliminado', '', { duration: 2500 }); } });
  }
}
