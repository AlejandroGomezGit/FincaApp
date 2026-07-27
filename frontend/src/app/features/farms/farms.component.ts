import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FarmsService, Farm } from '../../core/services/farms.service';
import { AnalyticsService, FarmRanking } from '../../core/services/analytics.service';


@Component({
  selector: 'app-farms',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, CurrencyPipe,
  ],
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
    :host { display:block; padding:28px; font-family:'Plus Jakarta Sans',sans-serif; }

    .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:28px; }
    .header h1 { font-family:'Fraunces',serif; font-size:26px; font-weight:700; color:#1c2b16; margin:0; }
    .header p { color:#7a8670; font-size:13.5px; margin:4px 0 0; }

    .add-btn {
      background:linear-gradient(135deg,#2a5225,#46883b) !important;
      color:white !important; border-radius:8px !important;
      box-shadow:0 3px 12px rgba(42,82,37,0.28) !important;
    }

    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:18px; }

    .farm-card {
      background:white; border-radius:12px;
      border:1px solid #e8e0d0; padding:20px;
      cursor:pointer; transition:all 0.18s ease;
      box-shadow:0 1px 4px rgba(0,0,0,0.05);
    }
    .farm-card:hover { box-shadow:0 6px 20px rgba(0,0,0,0.1); transform:translateY(-2px); border-color:#c8d8c0; }

    .card-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:14px; }

    .trophy-badge {
      display:flex; align-items:center; gap:4px; font-size:10.5px; font-weight:700;
      color:#8a6414; background:rgba(196,132,26,0.15); border:1px solid rgba(196,132,26,0.3);
      border-radius:12px; padding:3px 9px; margin-bottom:8px; width:fit-content;
    }
    .trophy-badge mat-icon { font-size:13px; width:13px; height:13px; color:#c4841a; }

    .card-icon {
      width:44px; height:44px; border-radius:10px;
      background:linear-gradient(135deg,rgba(125,171,110,0.18),rgba(74,143,63,0.12));
      border:1px solid rgba(125,171,110,0.25);
      display:flex; align-items:center; justify-content:center; color:#4a8f3f;
    }
    .card-icon mat-icon { font-size:22px; width:22px; height:22px; }

    .farm-name { font-size:17px; font-weight:600; color:#1c2b16; margin-bottom:4px; }
    .farm-loc  { font-size:12.5px; color:#8a9882; display:flex; align-items:center; gap:4px; }
    .farm-loc mat-icon { font-size:14px; width:14px; height:14px; }

    .divider { border:none; border-top:1px solid #f0ebe0; margin:14px 0; }

    .stats { display:flex; gap:18px; }
    .stat-val { font-size:18px; font-weight:700; color:#2a5225; }
    .stat-lbl { font-size:11px; color:#9aaa90; margin-top:2px; }

    .card-footer { display:flex; gap:6px; margin-top:16px; }

    .empty { text-align:center; padding:60px 20px; color:#8a9882; }
    .empty mat-icon { font-size:56px; width:56px; height:56px; color:#c8d8c0; display:block; margin:0 auto 14px; }

    .loading { display:flex; justify-content:center; padding:60px; }
  `],
  template: `
    <div class="header">
      <div>
        <h1>Mis Fincas</h1>
        <p>Administra tus propiedades agrícolas</p>
      </div>
      <button mat-flat-button class="add-btn" (click)="openDialog()">
        <mat-icon>add</mat-icon> Nueva Finca
      </button>
    </div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="36"></mat-spinner></div>
    } @else if (farms().length === 0) {
      <div class="empty">
        <mat-icon>landscape</mat-icon>
        <p>Aún no tienes fincas registradas.</p>
        <button mat-flat-button style="background:#2a5225;color:white;margin-top:10px" (click)="openDialog()">
          Crear primera finca
        </button>
      </div>
    } @else {
      <div class="grid">
        @for (farm of farms(); track farm.id) {
          <div class="farm-card" (click)="goTo(farm)">
            @if (isTopFarm(farm)) {
              <div class="trophy-badge"><mat-icon>stars</mat-icon>Más rentable</div>
            }
            <div class="card-top">
              <div class="card-icon"><mat-icon>landscape</mat-icon></div>
              <div style="display:flex;gap:4px">
                <button mat-icon-button (click)="openDialog(farm);$event.stopPropagation()" style="color:#7a8670">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button (click)="remove(farm);$event.stopPropagation()" style="color:#d07070">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </div>
            <div class="farm-name">{{ farm.name }}</div>
            @if (farm.location) {
              <div class="farm-loc">
                <mat-icon>place</mat-icon>{{ farm.location }}
              </div>
            }
            @if (farm.hectares) {
              <div style="font-size:12px;color:#8a9882;margin-top:4px">
                {{ farm.hectares }} ha
              </div>
            }
            <hr class="divider">
            <div class="stats">
              <div>
                <div class="stat-val">{{ farm._count?.crops ?? 0 }}</div>
                <div class="stat-lbl">Cultivos</div>
              </div>
              <div>
                <div class="stat-val">{{ farm._count?.workers ?? 0 }}</div>
                <div class="stat-lbl">Trabajadores</div>
              </div>
              <div>
                <div class="stat-val">{{ farm._count?.transactions ?? 0 }}</div>
                <div class="stat-lbl">Transacciones</div>
              </div>
              @if (rankingOf(farm)) {
                <div>
                  <div class="stat-val" [style.color]="rankingOf(farm)!.netBalance >= 0 ? '#2a5225' : '#c05050'">
                    {{ rankingOf(farm)!.netBalance | currency:'COP':'symbol-narrow':'1.0-0' }}
                  </div>
                  <div class="stat-lbl">Balance 12m</div>
                </div>
              }
            </div>
            <div class="card-footer">
              <button mat-stroked-button style="flex:1;font-size:12px;border-color:#c8d8c0;color:#2a5225"
                      (click)="goTo(farm);$event.stopPropagation()">
                <mat-icon style="font-size:15px">dashboard</mat-icon> Dashboard
              </button>
            </div>
          </div>
        }
      </div>
    }

    <!-- Inline create/edit dialog using a simple overlay div -->
    @if (showDialog()) {
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:1000;display:flex;align-items:center;justify-content:center"
           (click)="showDialog.set(false)">
        <div style="background:white;border-radius:14px;padding:28px;min-width:380px;max-width:460px;box-shadow:0 20px 60px rgba(0,0,0,0.2)"
             (click)="$event.stopPropagation()">
          <h2 style="font-family:'Fraunces',serif;font-size:22px;color:#1c2b16;margin:0 0 20px">
            {{ editFarm() ? 'Editar Finca' : 'Nueva Finca' }}
          </h2>
          <div style="display:flex;flex-direction:column;gap:12px">
            <input [placeholder]="'Nombre *'" [(ngModel)]="form.name"
                   style="padding:12px 14px;border:1.5px solid #e0d8cc;border-radius:8px;font-size:14px;font-family:inherit;outline:none;width:100%;box-sizing:border-box">
            <input [placeholder]="'Ubicación'" [(ngModel)]="form.location"
                   style="padding:12px 14px;border:1.5px solid #e0d8cc;border-radius:8px;font-size:14px;font-family:inherit;outline:none;width:100%;box-sizing:border-box">
            <input type="number" [placeholder]="'Hectáreas'" [(ngModel)]="form.hectares"
                   style="padding:12px 14px;border:1.5px solid #e0d8cc;border-radius:8px;font-size:14px;font-family:inherit;outline:none;width:100%;box-sizing:border-box">
            <textarea [placeholder]="'Descripción'" [(ngModel)]="form.description" rows="2"
                   style="padding:12px 14px;border:1.5px solid #e0d8cc;border-radius:8px;font-size:14px;font-family:inherit;outline:none;resize:none;width:100%;box-sizing:border-box"></textarea>
          </div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">
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
export class FarmsComponent implements OnInit {
  private svc          = inject(FarmsService);
  private analyticsSvc = inject(AnalyticsService);
  private router       = inject(Router);
  private snackBar     = inject(MatSnackBar);

  farms     = signal<Farm[]>([]);
  ranking   = signal<FarmRanking[]>([]);
  loading   = signal(true);
  saving    = signal(false);
  showDialog = signal(false);
  editFarm  = signal<Farm | null>(null);
  form = { name: '', location: '', hectares: null as number | null, description: '' };

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.list().subscribe({ next: f => { this.farms.set(f); this.loading.set(false); }, error: () => this.loading.set(false) });
    this.analyticsSvc.getRanking().subscribe({ next: r => this.ranking.set(r), error: () => this.ranking.set([]) });
  }

  rankingOf(farm: Farm): FarmRanking | undefined {
    return this.ranking().find(r => r.farmId === farm.id);
  }

  isTopFarm(farm: Farm): boolean {
    return this.farms().length >= 2 && this.ranking()[0]?.farmId === farm.id;
  }

  openDialog(farm?: Farm) {
    this.editFarm.set(farm ?? null);
    this.form = { name: farm?.name ?? '', location: farm?.location ?? '', hectares: farm?.hectares ?? null, description: farm?.description ?? '' };
    this.showDialog.set(true);
  }

  save() {
    this.saving.set(true);
    const data: any = { name: this.form.name, location: this.form.location, hectares: this.form.hectares, description: this.form.description };
    const req = this.editFarm() ? this.svc.update(this.editFarm()!.id, data) : this.svc.create(data);
    req.subscribe({
      next: () => { this.saving.set(false); this.showDialog.set(false); this.load(); this.snackBar.open('Finca guardada', '', { duration: 2500 }); },
      error: () => { this.saving.set(false); this.snackBar.open('Error al guardar', '', { duration: 3000 }); },
    });
  }

  remove(farm: Farm) {
    if (!confirm(`¿Eliminar "${farm.name}"? Esta acción no se puede deshacer.`)) return;
    this.svc.remove(farm.id).subscribe({ next: () => { this.load(); this.snackBar.open('Finca eliminada', '', { duration: 2500 }); } });
  }

  goTo(farm: Farm) { this.router.navigate(['/farms', farm.id, 'dashboard']); }
}
