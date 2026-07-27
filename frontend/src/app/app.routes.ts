import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'login', loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'farms', pathMatch: 'full' },
      { path: 'farms', loadComponent: () => import('./features/farms/farms.component').then(m => m.FarmsComponent) },
      { path: 'farms/:farmId/dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'farms/:farmId/analytics', loadComponent: () => import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent) },
      { path: 'farms/:farmId/weather', loadComponent: () => import('./features/weather/weather.component').then(m => m.WeatherComponent) },
      { path: 'farms/:farmId/crops', loadComponent: () => import('./features/crops/crops.component').then(m => m.CropsComponent) },
      { path: 'farms/:farmId/crops/:cropId/activities', loadComponent: () => import('./features/activities/activities.component').then(m => m.ActivitiesComponent) },
      { path: 'farms/:farmId/crops/:cropId/activities/:activityId/jornales', loadComponent: () => import('./features/jornales/jornales.component').then(m => m.JornalesComponent) },
      { path: 'farms/:farmId/workers', loadComponent: () => import('./features/workers/workers.component').then(m => m.WorkersComponent) },
      { path: 'farms/:farmId/transactions', loadComponent: () => import('./features/transactions/transactions.component').then(m => m.TransactionsComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
