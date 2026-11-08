import { Routes } from '@angular/router';

/**
 * MinSU FoundIt! - Application Route Configuration
 * Mindoro State University - Victoria Campus
 */
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.page.ts').then((m) => m.HomePage),
  },
  {
    path: 'upload',
    loadComponent: () => import('./pages/upload-item/upload-item.page.ts').then((m) => m.UploadItemPage),
  },
  {
    path: 'item/:id',
    loadComponent: () => import('./pages/item-detail/item-detail.page.ts').then((m) => m.ItemDetailPage),
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile.page.ts').then((m) => m.ProfilePage),
  },
  {
    path: 'admin-reports',
    loadComponent: () => import('./pages/admin-reports/admin-reports.page.ts').then((m) => m.AdminReportsPage),
  },
  {
    path: '**',
    redirectTo: 'home',
  },
];
