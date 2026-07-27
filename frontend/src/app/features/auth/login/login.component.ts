import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule,
  ],
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,300;1,9..144,400&family=Plus+Jakarta+Sans:wght@300;400;500;600&display=swap');

    :host { display:flex; height:100vh; font-family:'Plus Jakarta Sans',sans-serif; }

    @keyframes fadeUp {
      from { opacity:0; transform:translateY(18px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes fadeIn {
      from { opacity:0; transform:translateX(18px); }
      to   { opacity:1; transform:translateX(0); }
    }

    /* ── left panel ── */
    .left {
      flex:1;
      background:linear-gradient(158deg,#0f2010 0%,#1c3d1a 50%,#264e24 100%);
      display:flex; flex-direction:column; justify-content:center;
      padding:64px 60px; position:relative; overflow:hidden;
    }

    .deco { position:absolute; border-radius:50%; pointer-events:none; }
    .deco-1 { width:400px; height:400px; border:1px solid rgba(168,212,152,0.07); top:-120px; right:-100px; }
    .deco-2 { width:250px; height:250px; background:rgba(168,212,152,0.04); bottom:30px; left:20px; }
    .deco-3 { width:160px; height:160px; border:1px solid rgba(168,212,152,0.05); bottom:160px; right:50px; }

    .brand {
      display:flex; align-items:center; gap:12px; margin-bottom:56px;
      animation:fadeUp 0.55s ease both; animation-delay:0.1s;
    }

    .brand-icon {
      width:44px; height:44px;
      background:rgba(168,212,152,0.14); border:1px solid rgba(168,212,152,0.3);
      border-radius:12px; display:flex; align-items:center; justify-content:center; color:#a8d498;
    }
    .brand-icon mat-icon { font-size:24px; width:24px; height:24px; }

    .brand-name {
      font-family:'Fraunces',serif; font-size:27px; font-weight:700;
      color:#f5f0e4; letter-spacing:-0.4px;
    }

    .headline {
      font-family:'Fraunces',serif; font-size:44px; font-weight:600;
      color:#f5f0e4; line-height:1.18; margin-bottom:18px;
      animation:fadeUp 0.55s ease both; animation-delay:0.2s;
    }
    .headline em { color:#9ed08e; font-style:italic; font-weight:300; }

    .sub {
      font-size:15px; color:rgba(245,240,228,0.48);
      line-height:1.65; max-width:380px;
      animation:fadeUp 0.55s ease both; animation-delay:0.3s;
    }

    .features {
      margin-top:46px; display:flex; flex-direction:column; gap:13px;
      animation:fadeUp 0.55s ease both; animation-delay:0.4s;
    }

    .feat { display:flex; align-items:center; gap:12px; color:rgba(245,240,228,0.58); font-size:14px; }
    .dot  { width:5px; height:5px; border-radius:50%; background:#6dab5e; flex-shrink:0; }

    /* ── right panel ── */
    .right {
      width:430px; background:#faf7f0;
      display:flex; flex-direction:column; justify-content:center;
      padding:64px 50px;
      animation:fadeIn 0.55s ease both; animation-delay:0.15s;
    }

    .form-title {
      font-family:'Fraunces',serif; font-size:30px; font-weight:700;
      color:#1c2b16; margin-bottom:6px;
    }
    .form-sub { color:#8a9882; font-size:14px; margin-bottom:36px; }

    .field { width:100%; margin-bottom:14px; }

    .submit-btn {
      width:100%; height:50px; margin-top:8px;
      background:linear-gradient(135deg,#2a5225 0%,#46883b 100%) !important;
      color:white !important; font-weight:600 !important;
      font-size:15px !important; border-radius:10px !important;
      letter-spacing:0.3px !important;
      box-shadow:0 4px 18px rgba(42,82,37,0.32) !important;
      transition:box-shadow 0.2s ease, transform 0.2s ease !important;
    }
    .submit-btn:hover:not(:disabled) {
      box-shadow:0 6px 24px rgba(42,82,37,0.44) !important;
      transform:translateY(-1px);
    }
    .submit-btn:disabled { opacity:0.62 !important; transform:none !important; }

    @media (max-width:768px) {
      :host { flex-direction:column; }
      .left  { padding:44px 32px; flex:0 0 auto; }
      .headline { font-size:32px; }
      .right { width:100%; flex:1; padding:40px 28px; }
    }
  `],
  template: `
    <div class="left">
      <div class="deco deco-1"></div>
      <div class="deco deco-2"></div>
      <div class="deco deco-3"></div>

      <div class="brand">
        <div class="brand-icon"><mat-icon>eco</mat-icon></div>
        <span class="brand-name">FincaApp</span>
      </div>

      <div class="headline">
        Gestiona tu finca<br>con <em>inteligencia</em>
      </div>
      <p class="sub">
        Control total de tus cultivos, jornales, ingresos y egresos en un solo lugar.
      </p>

      <div class="features">
        @for (f of features; track f) {
          <div class="feat">
            <div class="dot"></div>
            <span>{{ f }}</span>
          </div>
        }
      </div>
    </div>

    <div class="right">
      <div class="form-title">Bienvenido</div>
      <div class="form-sub">Ingresa tus credenciales para continuar</div>

      <form #frm="ngForm" (ngSubmit)="onSubmit()">

        <mat-form-field class="field" appearance="outline">
          <mat-label>Correo electrónico</mat-label>
          <input matInput type="email" [(ngModel)]="email" name="email"
                 required [disabled]="loading()">
          <mat-icon matPrefix style="color:#7dab6e;margin-right:6px">email</mat-icon>
        </mat-form-field>

        <mat-form-field class="field" appearance="outline">
          <mat-label>Contraseña</mat-label>
          <input matInput [type]="showPwd() ? 'text' : 'password'"
                 [(ngModel)]="password" name="password"
                 required [disabled]="loading()">
          <mat-icon matPrefix style="color:#7dab6e;margin-right:6px">lock</mat-icon>
          <button mat-icon-button matSuffix type="button"
                  (click)="showPwd.update(v => !v)" [attr.aria-label]="'Mostrar contraseña'">
            <mat-icon>{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
        </mat-form-field>

        <button mat-flat-button class="submit-btn" type="submit"
                [disabled]="frm.invalid || loading()">
          {{ loading() ? 'Ingresando...' : 'Ingresar' }}
        </button>

      </form>
    </div>
  `,
})
export class LoginComponent {
  private auth     = inject(AuthService);
  private router   = inject(Router);
  private snackBar = inject(MatSnackBar);

  email    = '';
  password = '';
  loading  = signal(false);
  showPwd  = signal(false);

  features = [
    'Control de cultivos y parcelas',
    'Registro de jornales y trabajadores',
    'Seguimiento de ingresos y egresos',
    'Dashboard con proyecciones de cosecha',
  ];

  onSubmit() {
    if (!this.email || !this.password) return;
    this.loading.set(true);
    this.auth.login(this.email, this.password).subscribe({
      next: () => { this.loading.set(false); this.router.navigate(['/farms']); },
      error: err => {
        this.loading.set(false);
        const msg = err.error?.message ?? 'Credenciales inválidas';
        this.snackBar.open(msg, 'OK', { duration: 4000 });
      },
    });
  }
}
