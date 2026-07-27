import {
  Component, inject, signal, computed, OnInit, OnDestroy,
} from '@angular/core';
import {
  Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd,
} from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs/operators';
import { Subscription } from 'rxjs';
import { FarmsService, Farm } from '../../../core/services/farms.service';
import { AuthService } from '../../../core/services/auth.service';

const NAV = [
  { label: 'Dashboard',     icon: 'dashboard',              seg: 'dashboard'     },
  { label: 'Alertas',       icon: 'notifications_active',   seg: 'alerts'        },
  { label: 'Analítica',     icon: 'show_chart',             seg: 'analytics'     },
  { label: 'Clima',         icon: 'wb_cloudy',              seg: 'weather'       },
  { label: 'Cultivos',      icon: 'grass',                  seg: 'crops'         },
  { label: 'Ganado y Aves', icon: 'pets',                   seg: 'livestock'     },
  { label: 'Trabajadores',  icon: 'people',                 seg: 'workers'       },
  { label: 'Transacciones', icon: 'account_balance_wallet', seg: 'transactions'  },
];

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatToolbarModule,
    MatButtonModule, MatIconModule, MatMenuModule,
  ],
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');

    :host { display:block; height:100vh; overflow:hidden; font-family:'Plus Jakarta Sans',sans-serif; }

    mat-sidenav-container { height:100%; }

    mat-sidenav {
      width:256px;
      background:linear-gradient(175deg,#122610 0%,#1c3b1a 55%,#1a3818 100%);
      border-right:none !important;
      display:flex; flex-direction:column;
    }

    /* ── header ── */
    .nav-header { padding:20px 14px 14px; border-bottom:1px solid rgba(255,255,255,0.07); }

    .brand { display:flex; align-items:center; gap:10px; margin-bottom:18px; cursor:pointer; text-decoration:none; }

    .brand-icon {
      width:34px; height:34px;
      background:rgba(125,171,110,0.2); border:1px solid rgba(125,171,110,0.35);
      border-radius:8px; display:flex; align-items:center; justify-content:center; color:#a8d498;
    }
    .brand-icon mat-icon { font-size:20px; width:20px; height:20px; }

    .brand-name {
      font-family:'Fraunces',serif; font-size:20px; font-weight:700;
      color:#f5f0e4; letter-spacing:-0.3px;
    }

    .farm-label {
      font-size:9px; font-weight:600; letter-spacing:1.8px;
      text-transform:uppercase; color:rgba(255,255,255,0.28); margin-bottom:6px;
    }

    .farm-btn {
      display:flex; align-items:center; justify-content:space-between;
      width:100%; padding:9px 11px;
      background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1);
      border-radius:8px; cursor:pointer;
      color:#f0ece0; font-size:13px; font-weight:500;
      font-family:'Plus Jakarta Sans',sans-serif;
      transition:background 0.15s; overflow:hidden;
    }
    .farm-btn span { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .farm-btn:hover { background:rgba(255,255,255,0.1); }
    .farm-btn mat-icon { font-size:16px; width:16px; height:16px; opacity:0.55; flex-shrink:0; margin-left:4px; }

    /* ── nav ── */
    nav { flex:1; padding:14px 10px; overflow-y:auto; }

    .nav-section {
      font-size:9px; font-weight:600; letter-spacing:1.8px;
      text-transform:uppercase; color:rgba(255,255,255,0.22);
      padding:0 8px; margin-bottom:5px;
    }

    .nav-link {
      display:flex; align-items:center; gap:11px;
      padding:9px 10px; border-radius:7px;
      color:rgba(255,255,255,0.52); font-size:13.5px; font-weight:500;
      text-decoration:none; margin-bottom:2px;
      transition:all 0.12s ease; border:1px solid transparent;
    }
    .nav-link:hover { background:rgba(255,255,255,0.07); color:rgba(255,255,255,0.85); }
    .nav-link.active {
      background:rgba(168,212,152,0.12); color:#b8e0a8;
      border-color:rgba(168,212,152,0.2);
    }
    .nav-link mat-icon { font-size:19px; width:19px; height:19px; }

    .nav-empty { padding:10px 10px; font-size:12px; color:rgba(255,255,255,0.22); font-style:italic; }

    /* ── footer ── */
    .nav-footer { padding:12px 10px; border-top:1px solid rgba(255,255,255,0.07); }

    .logout-btn {
      display:flex; align-items:center; gap:11px;
      width:100%; padding:9px 10px; border-radius:7px;
      background:none; border:none; cursor:pointer;
      color:rgba(255,255,255,0.38); font-size:13px; font-weight:500;
      font-family:'Plus Jakarta Sans',sans-serif; transition:all 0.13s ease;
    }
    .logout-btn:hover { background:rgba(220,80,80,0.13); color:#f08888; }
    .logout-btn mat-icon { font-size:19px; width:19px; height:19px; }

    /* ── toolbar ── */
    .toolbar {
      height:58px; padding:0 16px;
      background:#faf7f0 !important;
      border-bottom:1px solid #e4ddd0;
      box-shadow:0 1px 3px rgba(0,0,0,0.05);
      display:flex; align-items:center; gap:10px;
    }

    .spacer { flex:1; }

    .farm-chip {
      font-size:11.5px; font-weight:600; color:#3d7034;
      background:rgba(61,112,52,0.1); border:1px solid rgba(61,112,52,0.2);
      padding:3px 10px; border-radius:20px;
    }

    .toolbar-title { font-size:15px; font-weight:600; color:#2d3a26; }

    .user-pill {
      display:flex; align-items:center; gap:7px;
      padding:4px 12px 4px 5px;
      background:rgba(0,0,0,0.04); border-radius:20px;
      color:#4a5640; font-size:12.5px; font-weight:500;
    }

    .avatar {
      width:27px; height:27px; border-radius:50%;
      background:linear-gradient(135deg,#7dab6e,#3d7534);
      display:flex; align-items:center; justify-content:center;
      color:white; font-size:11px; font-weight:700; flex-shrink:0;
    }

    /* ── content ── */
    .content-wrap {
      background:#f2ede4;
      height:calc(100% - 58px);
      overflow-y:auto;
    }
  `],
  template: `
    <mat-sidenav-container>

      <mat-sidenav #sidenav [mode]="isMobile() ? 'over' : 'side'" [opened]="!isMobile()">

        <div class="nav-header">
          <a class="brand" routerLink="/farms">
            <div class="brand-icon"><mat-icon>eco</mat-icon></div>
            <span class="brand-name">FincaApp</span>
          </a>

          <div class="farm-label">Finca activa</div>
          <button class="farm-btn" [matMenuTriggerFor]="farmMenu">
            <span>{{ selectedFarm()?.name ?? 'Seleccionar finca' }}</span>
            <mat-icon>expand_more</mat-icon>
          </button>
          <mat-menu #farmMenu="matMenu">
            @for (f of farms(); track f.id) {
              <button mat-menu-item (click)="onFarmChange(f.id)">
                <mat-icon>landscape</mat-icon>{{ f.name }}
              </button>
            }
            @if (!farms().length) {
              <button mat-menu-item disabled>Sin fincas registradas</button>
            }
          </mat-menu>
        </div>

        <nav>
          <div class="nav-section">Menú</div>
          @if (selectedFarmId()) {
            @for (item of navLinks(); track item.seg) {
              <a class="nav-link" [routerLink]="item.path" routerLinkActive="active">
                <mat-icon>{{ item.icon }}</mat-icon>{{ item.label }}
              </a>
            }
          } @else {
            <div class="nav-empty">Selecciona una finca para ver el menú</div>
          }
        </nav>

        <div class="nav-footer">
          <button class="logout-btn" (click)="logout()">
            <mat-icon>logout</mat-icon>Cerrar sesión
          </button>
        </div>

      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar class="toolbar">
          @if (isMobile()) {
            <button mat-icon-button (click)="sidenav.toggle()" style="color:#4a5640">
              <mat-icon>menu</mat-icon>
            </button>
          }
          @if (selectedFarm()) {
            <span class="farm-chip">{{ selectedFarm()!.name }}</span>
          } @else {
            <span class="toolbar-title">Administración de Fincas</span>
          }
          <span class="spacer"></span>
          @if (user()) {
            <div class="user-pill">
              <div class="avatar">{{ user()!.name.charAt(0).toUpperCase() }}</div>
              {{ user()!.name }}
            </div>
          }
        </mat-toolbar>
        <div class="content-wrap">
          <router-outlet />
        </div>
      </mat-sidenav-content>

    </mat-sidenav-container>
  `,
})
export class LayoutComponent implements OnInit, OnDestroy {
  private farmsService = inject(FarmsService);
  private authService  = inject(AuthService);
  private router       = inject(Router);
  private bo           = inject(BreakpointObserver);

  farms           = signal<Farm[]>([]);
  selectedFarmId  = signal<number | null>(null);
  user            = this.authService.user;

  isMobile = toSignal(
    this.bo.observe([Breakpoints.Handset]).pipe(map(r => r.matches)),
    { initialValue: false }
  );

  selectedFarm = computed(() => this.farms().find(f => f.id === this.selectedFarmId()) ?? null);

  navLinks = computed(() => {
    const id = this.selectedFarmId();
    if (!id) return [];
    return NAV.map(n => ({ ...n, path: `/farms/${id}/${n.seg}` }));
  });

  private subs = new Subscription();

  ngOnInit() {
    this.subs.add(
      this.farmsService.list().subscribe(farms => this.farms.set(farms))
    );
    this.subs.add(
      this.router.events.pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map(e => e.url),
        startWith(this.router.url),
      ).subscribe(url => {
        const m = url.match(/\/farms\/(\d+)/);
        if (m) this.selectedFarmId.set(Number(m[1]));
      })
    );
  }

  ngOnDestroy() { this.subs.unsubscribe(); }

  onFarmChange(id: number) {
    this.selectedFarmId.set(id);
    this.router.navigate(['/farms', id, 'dashboard']);
  }

  logout() { this.authService.logout(); }
}
