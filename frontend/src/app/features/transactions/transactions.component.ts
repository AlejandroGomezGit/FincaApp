import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TransactionsService, Transaction } from '../../core/services/transactions.service';
import { CropsService, Crop } from '../../core/services/crops.service';

const CAT_LABELS: Record<string,string> = {
  VENTA_COSECHA:'Venta de Cosecha', INSUMOS:'Insumos', MAQUINARIA:'Maquinaria',
  SERVICIOS_EXTERNOS:'Servicios Externos', JORNALES:'Jornales', TRANSPORTE:'Transporte', OTRO:'Otro',
};
const INCOME_CATS  = ['VENTA_COSECHA','OTRO'];
const EXPENSE_CATS = ['INSUMOS','MAQUINARIA','SERVICIOS_EXTERNOS','JORNALES','TRANSPORTE','OTRO'];

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, CurrencyPipe, DatePipe],
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
    :host { display:block; padding:28px; font-family:'Plus Jakarta Sans',sans-serif; }

    .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
    .header h1 { font-family:'Fraunces',serif; font-size:24px; font-weight:700; color:#1c2b16; margin:0; }

    .add-btn { background:linear-gradient(135deg,#2a5225,#46883b) !important; color:white !important; border-radius:8px !important; box-shadow:0 3px 12px rgba(42,82,37,0.28) !important; }

    /* summary */
    .summary { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:20px; }
    .sum-card { background:white; border-radius:12px; border:1px solid #e8e0d0; padding:16px 20px; }
    .sum-val { font-size:22px; font-weight:700; }
    .sum-lbl { font-size:11px; text-transform:uppercase; letter-spacing:0.7px; color:#9aaa90; margin-top:3px; }
    .sum-inc { color:#3d7034; }
    .sum-exp { color:#c05040; }
    .sum-bal-pos { color:#2a5225; }
    .sum-bal-neg { color:#c05040; }

    /* filter bar */
    .filter-bar { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; align-items:center; }
    .filter-chip { padding:7px 14px; border-radius:20px; border:1.5px solid #e0d8cc; background:white; font-size:13px; font-family:inherit; color:#4a5640; cursor:pointer; transition:all 0.15s; }
    .filter-chip.active { background:#2a5225; color:white; border-color:#2a5225; }
    .filter-chip:hover:not(.active) { border-color:#7dab6e; color:#2a5225; }
    select.filter-chip { outline:none; }

    /* table */
    .tx-table { background:white; border-radius:12px; border:1px solid #e8e0d0; overflow:hidden; box-shadow:0 1px 4px rgba(0,0,0,0.04); }
    .tx-header {
      display:grid; grid-template-columns:80px 1fr 1fr 140px 120px 100px;
      padding:10px 16px; background:#f7f3eb; border-bottom:1px solid #e8e0d0;
      font-size:11px; font-weight:600; letter-spacing:0.8px; text-transform:uppercase; color:#8a9882;
    }
    .tx-row {
      display:grid; grid-template-columns:80px 1fr 1fr 140px 120px 100px;
      padding:13px 16px; border-bottom:1px solid #f0ebe0; align-items:center; transition:background 0.12s;
    }
    .tx-row:last-child { border-bottom:none; }
    .tx-row:hover { background:#faf7f0; }

    .type-badge { display:flex; align-items:center; gap:5px; font-size:11.5px; font-weight:600; padding:3px 10px; border-radius:12px; white-space:nowrap; }
    .type-income  { background:rgba(61,112,52,0.1);  color:#3d7034; }
    .type-expense { background:rgba(192,80,64,0.1);  color:#c05040; }

    .cell { font-size:13.5px; color:#4a5640; }
    .desc-cell { font-size:13.5px; color:#1c2b16; font-weight:500; }
    .sub-cell  { font-size:11.5px; color:#8a9882; margin-top:2px; }

    .amount-pos { font-size:14px; font-weight:700; color:#3d7034; }
    .amount-neg { font-size:14px; font-weight:700; color:#c05040; }

    .actions { display:flex; gap:2px; justify-content:flex-end; }

    .loading { display:flex; justify-content:center; padding:60px; }
    .empty { text-align:center; padding:60px 20px; color:#8a9882; }
    .empty mat-icon { font-size:54px; width:54px; height:54px; color:#c8d8c0; display:block; margin:0 auto 14px; }

    /* dialog */
    .dialog-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:1000; display:flex; align-items:center; justify-content:center; }
    .dialog { background:white; border-radius:14px; padding:28px; min-width:380px; max-width:500px; box-shadow:0 20px 60px rgba(0,0,0,0.2); max-height:90vh; overflow-y:auto; }
    .dialog h2 { font-family:'Fraunces',serif; font-size:22px; color:#1c2b16; margin:0 0 20px; }
    .field-group { display:flex; flex-direction:column; gap:12px; margin-bottom:20px; }
    .fi { padding:11px 14px; border:1.5px solid #e0d8cc; border-radius:8px; font-size:14px; font-family:inherit; outline:none; width:100%; box-sizing:border-box; }
    .fi:focus { border-color:#7dab6e; }
    select.fi { background:white; }
    .dialog-footer { display:flex; gap:8px; justify-content:flex-end; }
    .type-toggle { display:flex; gap:8px; }
    .type-btn { flex:1; padding:10px; border-radius:8px; border:1.5px solid #e0d8cc; background:white; font-family:inherit; font-size:14px; font-weight:500; cursor:pointer; transition:all 0.15s; color:#7a8670; }
    .type-btn.active-inc { background:rgba(61,112,52,0.1); border-color:#3d7034; color:#3d7034; }
    .type-btn.active-exp { background:rgba(192,80,64,0.1); border-color:#c05040; color:#c05040; }

    @media(max-width:900px) {
      .summary { grid-template-columns:1fr; }
      .tx-header, .tx-row { grid-template-columns:80px 1fr 140px 120px; }
      .col-cat, .col-date { display:none; }
    }
  `],
  template: `
    <div class="header">
      <div>
        <h1>Transacciones</h1>
        <p style="color:#7a8670;font-size:13.5px;margin:4px 0 0">Ingresos y egresos de la finca</p>
      </div>
      <button mat-flat-button class="add-btn" (click)="openDialog()">
        <mat-icon>add</mat-icon> Nueva Transacción
      </button>
    </div>

    <!-- Summary -->
    <div class="summary">
      <div class="sum-card">
        <div class="sum-val sum-inc">+{{ totalIncome() | currency:'COP':'symbol-narrow':'1.0-0' }}</div>
        <div class="sum-lbl">Ingresos (filtro)</div>
      </div>
      <div class="sum-card">
        <div class="sum-val sum-exp">-{{ totalExpense() | currency:'COP':'symbol-narrow':'1.0-0' }}</div>
        <div class="sum-lbl">Egresos (filtro)</div>
      </div>
      <div class="sum-card">
        <div class="sum-val" [class.sum-bal-pos]="balance() >= 0" [class.sum-bal-neg]="balance() < 0">
          {{ balance() | currency:'COP':'symbol-narrow':'1.0-0' }}
        </div>
        <div class="sum-lbl">Balance</div>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <button class="filter-chip" [class.active]="filterType() === ''" (click)="filterType.set('')">Todos</button>
      <button class="filter-chip" [class.active]="filterType() === 'INCOME'" (click)="filterType.set('INCOME')">Ingresos</button>
      <button class="filter-chip" [class.active]="filterType() === 'EXPENSE'" (click)="filterType.set('EXPENSE')">Egresos</button>
      <select class="filter-chip" [(ngModel)]="filterMonth" (ngModelChange)="applyFilter()">
        <option value="">Todos los meses</option>
        @for (m of months; track m.value) { <option [value]="m.value">{{ m.label }}</option> }
      </select>
    </div>

    @if (loading()) {
      <div class="loading"><mat-spinner diameter="36"></mat-spinner></div>
    } @else if (!filtered().length) {
      <div class="empty">
        <mat-icon>account_balance_wallet</mat-icon>
        <p>Sin transacciones registradas.</p>
        <button mat-flat-button style="background:#2a5225;color:white;margin-top:10px" (click)="openDialog()">Agregar transacción</button>
      </div>
    } @else {
      <div class="tx-table">
        <div class="tx-header">
          <div>Tipo</div>
          <div>Descripción</div>
          <div class="col-cat">Categoría</div>
          <div class="col-date">Fecha</div>
          <div>Monto</div>
          <div></div>
        </div>
        @for (tx of filtered(); track tx.id) {
          <div class="tx-row">
            <div>
              <span class="type-badge" [class.type-income]="tx.type==='INCOME'" [class.type-expense]="tx.type==='EXPENSE'">
                <mat-icon style="font-size:13px;width:13px;height:13px">{{ tx.type==='INCOME' ? 'arrow_upward' : 'arrow_downward' }}</mat-icon>
                {{ tx.type==='INCOME' ? 'Ingreso' : 'Egreso' }}
              </span>
            </div>
            <div>
              <div class="desc-cell">{{ tx.description ?? catLabel(tx.category) }}</div>
              @if (tx.crop) { <div class="sub-cell">{{ tx.crop.name }}</div> }
            </div>
            <div class="cell col-cat">{{ catLabel(tx.category) }}</div>
            <div class="cell col-date">{{ tx.date | date:'dd/MM/yyyy' }}</div>
            <div [class.amount-pos]="tx.type==='INCOME'" [class.amount-neg]="tx.type==='EXPENSE'">
              {{ (tx.type==='INCOME' ? '+' : '-') + '' }}{{ tx.amount | currency:'COP':'symbol-narrow':'1.0-0' }}
            </div>
            <div class="actions">
              <button mat-icon-button style="color:#7a8670" (click)="openDialog(tx)"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button style="color:#d07070" (click)="remove(tx)"><mat-icon>delete</mat-icon></button>
            </div>
          </div>
        }
      </div>
    }

    @if (showDialog()) {
      <div class="dialog-overlay" (click)="showDialog.set(false)">
        <div class="dialog" (click)="$event.stopPropagation()">
          <h2>{{ editTx() ? 'Editar Transacción' : 'Nueva Transacción' }}</h2>
          <div class="field-group">
            <div class="type-toggle">
              <button class="type-btn" [class.active-inc]="form.type==='INCOME'" (click)="form.type='INCOME'; form.category=''">
                ↑ Ingreso
              </button>
              <button class="type-btn" [class.active-exp]="form.type==='EXPENSE'" (click)="form.type='EXPENSE'; form.category=''">
                ↓ Egreso
              </button>
            </div>
            <select class="fi" [(ngModel)]="form.category">
              <option value="">Categoría *</option>
              @for (c of (form.type==='INCOME' ? incomeCats : expenseCats); track c) {
                <option [value]="c">{{ catLabel(c) }}</option>
              }
            </select>
            <input class="fi" type="number" placeholder="Monto (COP) *" [(ngModel)]="form.amount">
            <input class="fi" type="date" placeholder="Fecha *" [(ngModel)]="form.date">
            <input class="fi" placeholder="Descripción" [(ngModel)]="form.description">
            <select class="fi" [(ngModel)]="form.cropId">
              <option value="">Sin cultivo asociado</option>
              @for (c of crops(); track c.id) { <option [value]="c.id">{{ c.name }}</option> }
            </select>
          </div>
          <div class="dialog-footer">
            <button mat-button (click)="showDialog.set(false)">Cancelar</button>
            <button mat-flat-button style="background:#2a5225;color:white;border-radius:8px"
                    [disabled]="!form.type || !form.category || !form.amount || !form.date || saving()" (click)="save()">
              {{ saving() ? 'Guardando...' : 'Guardar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class TransactionsComponent implements OnInit {
  private route    = inject(ActivatedRoute);
  private svc      = inject(TransactionsService);
  private cropsSvc = inject(CropsService);
  private snackBar = inject(MatSnackBar);

  farmId     = signal(0);
  txs        = signal<Transaction[]>([]);
  crops      = signal<Crop[]>([]);
  loading    = signal(true);
  saving     = signal(false);
  showDialog = signal(false);
  editTx     = signal<Transaction | null>(null);
  filterType = signal('');
  filterMonth = '';

  incomeCats  = INCOME_CATS;
  expenseCats = EXPENSE_CATS;

  months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1).padStart(2, '0'),
    label: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][i],
  }));

  form: any = { type: 'INCOME', category: '', amount: null, date: '', description: '', cropId: '' };

  filtered = computed(() => {
    let list = this.txs();
    if (this.filterType()) list = list.filter(t => t.type === this.filterType());
    if (this.filterMonth) list = list.filter(t => new Date(t.date).getMonth() + 1 === Number(this.filterMonth));
    return list;
  });

  totalIncome  = computed(() => this.filtered().filter(t => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0));
  totalExpense = computed(() => this.filtered().filter(t => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0));
  balance      = computed(() => this.totalIncome() - this.totalExpense());

  ngOnInit() {
    this.farmId.set(Number(this.route.snapshot.paramMap.get('farmId')));
    this.load();
    this.cropsSvc.list(this.farmId()).subscribe(c => this.crops.set(c));
  }

  load() {
    this.loading.set(true);
    this.svc.list(this.farmId()).subscribe({
      next: t => { this.txs.set(t); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  applyFilter() { /* computed handles reactivity */ }

  openDialog(tx?: Transaction) {
    this.editTx.set(tx ?? null);
    this.form = {
      type: tx?.type ?? 'INCOME',
      category: tx?.category ?? '',
      amount: tx?.amount ?? null,
      date: tx?.date?.substring(0,10) ?? '',
      description: tx?.description ?? '',
      cropId: tx?.cropId ?? '',
    };
    this.showDialog.set(true);
  }

  save() {
    this.saving.set(true);
    const data: any = { ...this.form, cropId: this.form.cropId || null };
    const req = this.editTx() ? this.svc.update(this.farmId(), this.editTx()!.id, data) : this.svc.create(this.farmId(), data);
    req.subscribe({
      next: () => { this.saving.set(false); this.showDialog.set(false); this.load(); this.snackBar.open('Transacción guardada', '', { duration: 2500 }); },
      error: () => { this.saving.set(false); this.snackBar.open('Error al guardar', '', { duration: 3000 }); },
    });
  }

  remove(tx: Transaction) {
    if (!confirm('¿Eliminar esta transacción?')) return;
    this.svc.remove(this.farmId(), tx.id).subscribe({ next: () => { this.load(); this.snackBar.open('Transacción eliminada', '', { duration: 2500 }); } });
  }

  catLabel(c: string) { return CAT_LABELS[c] ?? c; }
}
