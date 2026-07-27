import { Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { WorkersService, Worker } from '../../core/services/workers.service';

@Component({
  selector: 'app-workers',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
    :host { display:block; padding:28px; font-family:'Plus Jakarta Sans',sans-serif; }

    .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; }
    .header h1 { font-family:'Fraunces',serif; font-size:24px; font-weight:700; color:#1c2b16; margin:0; }
    .add-btn { background:linear-gradient(135deg,#2a5225,#46883b) !important; color:white !important; border-radius:8px !important; box-shadow:0 3px 12px rgba(42,82,37,0.28) !important; }

    .workers-table { background:white; border-radius:12px; border:1px solid #e8e0d0; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.04); }

    .table-header {
      display:grid; grid-template-columns:auto 1fr 1fr 1fr 80px 120px;
      padding:10px 16px; background:#f7f3eb; border-bottom:1px solid #e8e0d0;
      font-size:11px; font-weight:600; letter-spacing:0.8px; text-transform:uppercase; color:#8a9882;
    }

    .table-row {
      display:grid; grid-template-columns:auto 1fr 1fr 1fr 80px 120px;
      padding:14px 16px; border-bottom:1px solid #f0ebe0; align-items:center;
      transition:background 0.12s;
    }
    .table-row:last-child { border-bottom:none; }
    .table-row:hover { background:#faf7f0; }

    .avatar-cell { display:flex; align-items:center; gap:10px; }
    .avatar {
      width:36px; height:36px; border-radius:50%;
      background:linear-gradient(135deg,#7dab6e,#3d7534);
      display:flex; align-items:center; justify-content:center;
      color:white; font-size:14px; font-weight:700; flex-shrink:0;
    }
    .worker-name { font-size:14px; font-weight:600; color:#1c2b16; }
    .worker-id   { font-size:11.5px; color:#8a9882; margin-top:2px; }

    .cell { font-size:13.5px; color:#4a5640; }

    .status-badge { font-size:11px; font-weight:600; padding:3px 10px; border-radius:12px; display:inline-block; }

    .actions { display:flex; gap:2px; justify-content:flex-end; }

    .loading { display:flex; justify-content:center; padding:60px; }
    .empty { text-align:center; padding:60px 20px; color:#8a9882; }
    .empty mat-icon { font-size:54px; width:54px; height:54px; color:#c8d8c0; display:block; margin:0 auto 14px; }

    .dialog-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:1000; display:flex; align-items:center; justify-content:center; }
    .dialog { background:white; border-radius:14px; padding:28px; min-width:360px; max-width:440px; box-shadow:0 20px 60px rgba(0,0,0,0.2); }
    .dialog h2 { font-family:'Fraunces',serif; font-size:22px; color:#1c2b16; margin:0 0 20px; }
    .field-group { display:flex; flex-direction:column; gap:12px; margin-bottom:20px; }
    .fi { padding:11px 14px; border:1.5px solid #e0d8cc; border-radius:8px; font-size:14px; font-family:inherit; outline:none; width:100%; box-sizing:border-box; }
    .fi:focus { border-color:#7dab6e; }
    .dialog-footer { display:flex; gap:8px; justify-content:flex-end; }

    @media(max-width:768px) {
      .table-header, .table-row { grid-template-columns:auto 1fr 120px; }
      .col-phone, .col-id, .col-jornales { display:none; }
    }
  `],
  template: `
    <div class="header">
      <div>
        <h1>Trabajadores</h1>
        <p style="color:#7a8670;font-size:13.5px;margin:4px 0 0">Gestiona el personal de la finca</p>
      </div>
      <button mat-flat-button class="add-btn" (click)="openDialog()">
        <mat-icon>person_add</mat-icon> Nuevo Trabajador
      </button>
    </div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="36"></mat-spinner></div>
    } @else if (!workers().length) {
      <div class="empty">
        <mat-icon>people</mat-icon>
        <p>Sin trabajadores registrados.</p>
        <button mat-flat-button style="background:#2a5225;color:white;margin-top:10px" (click)="openDialog()">Agregar trabajador</button>
      </div>
    } @else {
      <div class="workers-table">
        <div class="table-header">
          <div>Trabajador</div>
          <div class="col-phone">Teléfono</div>
          <div class="col-id">Cédula</div>
          <div class="col-jornales">Jornales</div>
          <div>Estado</div>
          <div></div>
        </div>
        @for (w of workers(); track w.id) {
          <div class="table-row">
            <div class="avatar-cell">
              <div class="avatar">{{ w.name.charAt(0).toUpperCase() }}</div>
              <div>
                <div class="worker-name">{{ w.name }}</div>
              </div>
            </div>
            <div class="cell col-phone">{{ w.phone ?? '—' }}</div>
            <div class="cell col-id">{{ w.idNumber ?? '—' }}</div>
            <div class="cell col-jornales">{{ w._count?.jornales ?? 0 }}</div>
            <div>
              <span class="status-badge"
                    [style.background]="w.active ? 'rgba(61,112,52,0.1)' : 'rgba(140,140,140,0.1)'"
                    [style.color]="w.active ? '#3d7034' : '#7a8a7a'">
                {{ w.active ? 'Activo' : 'Inactivo' }}
              </span>
            </div>
            <div class="actions">
              <button mat-icon-button style="color:#7a8670" (click)="openDialog(w)"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button style="color:#d07070" (click)="remove(w)"><mat-icon>delete</mat-icon></button>
            </div>
          </div>
        }
      </div>
    }

    @if (showDialog()) {
      <div class="dialog-overlay" (click)="showDialog.set(false)">
        <div class="dialog" (click)="$event.stopPropagation()">
          <h2>{{ editWorker() ? 'Editar Trabajador' : 'Nuevo Trabajador' }}</h2>
          <div class="field-group">
            <input class="fi" placeholder="Nombre completo *" [(ngModel)]="form.name">
            <input class="fi" placeholder="Teléfono" [(ngModel)]="form.phone" type="tel">
            <input class="fi" placeholder="Cédula" [(ngModel)]="form.idNumber">
            @if (editWorker()) {
              <label style="display:flex;align-items:center;gap:8px;font-size:14px;color:#4a5640;cursor:pointer">
                <input type="checkbox" [(ngModel)]="form.active"> Trabajador activo
              </label>
            }
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
export class WorkersComponent implements OnInit {
  private route    = inject(ActivatedRoute);
  private svc      = inject(WorkersService);
  private snackBar = inject(MatSnackBar);

  farmId     = signal(0);
  workers    = signal<Worker[]>([]);
  loading    = signal(true);
  saving     = signal(false);
  showDialog = signal(false);
  editWorker = signal<Worker | null>(null);

  form = { name: '', phone: '', idNumber: '', active: true };

  ngOnInit() { this.farmId.set(Number(this.route.snapshot.paramMap.get('farmId'))); this.load(); }

  load() {
    this.loading.set(true);
    this.svc.list(this.farmId()).subscribe({ next: w => { this.workers.set(w); this.loading.set(false); }, error: () => this.loading.set(false) });
  }

  openDialog(w?: Worker) {
    this.editWorker.set(w ?? null);
    this.form = { name: w?.name ?? '', phone: w?.phone ?? '', idNumber: w?.idNumber ?? '', active: w?.active ?? true };
    this.showDialog.set(true);
  }

  save() {
    this.saving.set(true);
    const data: any = { name: this.form.name, phone: this.form.phone || null, idNumber: this.form.idNumber || null, active: this.form.active };
    const req = this.editWorker() ? this.svc.update(this.farmId(), this.editWorker()!.id, data) : this.svc.create(this.farmId(), data);
    req.subscribe({
      next: () => { this.saving.set(false); this.showDialog.set(false); this.load(); this.snackBar.open('Trabajador guardado', '', { duration: 2500 }); },
      error: () => { this.saving.set(false); this.snackBar.open('Error al guardar', '', { duration: 3000 }); },
    });
  }

  remove(w: Worker) {
    if (!confirm(`¿Eliminar a "${w.name}"?`)) return;
    this.svc.remove(this.farmId(), w.id).subscribe({ next: () => { this.load(); this.snackBar.open('Trabajador eliminado', '', { duration: 2500 }); } });
  }
}
