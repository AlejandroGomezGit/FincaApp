import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
const refreshedToken$ = new BehaviorSubject<string | null>(null);

const AUTH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.accessToken();
  const authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  const isAuthCall = AUTH_PATHS.some((p) => req.url.includes(p));

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401 || isAuthCall || !auth.getRefreshToken()) {
        if (err.status === 401) auth.clearSession();
        return throwError(() => err);
      }

      // El access token (15 min) expiró: intercambia el refresh token por un
      // par nuevo y reintenta la petición original una sola vez.
      if (!isRefreshing) {
        isRefreshing = true;
        refreshedToken$.next(null);
        return auth.refresh().pipe(
          switchMap((r) => {
            isRefreshing = false;
            refreshedToken$.next(r.accessToken);
            return next(req.clone({ setHeaders: { Authorization: `Bearer ${r.accessToken}` } }));
          }),
          catchError((refreshErr) => {
            isRefreshing = false;
            auth.clearSession();
            return throwError(() => refreshErr);
          })
        );
      }

      // Ya hay un refresh en curso disparado por otra petición paralela:
      // espera su resultado y reintenta con el token nuevo en vez de
      // disparar refresh() múltiples veces a la vez.
      return refreshedToken$.pipe(
        filter((t): t is string => t !== null),
        take(1),
        switchMap((t) => next(req.clone({ setHeaders: { Authorization: `Bearer ${t}` } })))
      );
    })
  );
};
