import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface User { id: number; name: string; email: string; role: string; }
interface AuthResponse { accessToken: string; refreshToken: string; user: User; }
interface RefreshResponse { accessToken: string; refreshToken: string; }

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly ACCESS_KEY = 'finca_access_token';
  private readonly REFRESH_KEY = 'finca_refresh_token';
  private readonly USER_KEY = 'finca_user';

  private _accessToken = signal<string | null>(localStorage.getItem(this.ACCESS_KEY));
  private _user = signal<User | null>(JSON.parse(localStorage.getItem(this.USER_KEY) || 'null'));

  accessToken = this._accessToken.asReadonly();
  user = this._user.asReadonly();
  isLoggedIn = computed(() => !!this._accessToken());

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      tap((r) => this.setSession(r))
    );
  }

  register(name: string, email: string, password: string) {
    return this.http.post<AuthResponse>(`${environment.apiUrl}/auth/register`, { name, email, password }).pipe(
      tap((r) => this.setSession(r))
    );
  }

  // Access token de vida corta (15 min); cuando expira, el interceptor llama
  // aquí para canjear el refresh token (7 días, rotable/revocable) por un par
  // nuevo, sin tener que volver a pedir credenciales al usuario.
  refresh() {
    const refreshToken = localStorage.getItem(this.REFRESH_KEY);
    if (!refreshToken) throw new Error('No hay refresh token');
    return this.http.post<RefreshResponse>(`${environment.apiUrl}/auth/refresh`, { refreshToken }).pipe(
      tap((r) => {
        localStorage.setItem(this.ACCESS_KEY, r.accessToken);
        localStorage.setItem(this.REFRESH_KEY, r.refreshToken);
        this._accessToken.set(r.accessToken);
      })
    );
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  logout() {
    const refreshToken = localStorage.getItem(this.REFRESH_KEY);
    if (refreshToken) {
      this.http.post(`${environment.apiUrl}/auth/logout`, { refreshToken }).subscribe({ error: () => {} });
    }
    this.clearSession();
    this.router.navigate(['/login']);
  }

  clearSession() {
    localStorage.removeItem(this.ACCESS_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._accessToken.set(null);
    this._user.set(null);
  }

  private setSession(r: AuthResponse) {
    localStorage.setItem(this.ACCESS_KEY, r.accessToken);
    localStorage.setItem(this.REFRESH_KEY, r.refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(r.user));
    this._accessToken.set(r.accessToken);
    this._user.set(r.user);
  }
}
