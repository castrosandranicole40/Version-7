/**
 * Ambient type declarations for Ionic, Angular, and Capacitor
 * Enables strict TypeScript compilation of Capstone architecture files
 */

declare module '@angular/core' {
  export function Component(options: any): ClassDecorator;
  export function OnInit(): any;
  export interface OnInit {
    ngOnInit(): void;
  }
  export function AfterViewInit(): any;
  export interface AfterViewInit {
    ngAfterViewInit(): void;
  }
  export function ViewChild(selector: any, opts?: any): PropertyDecorator;
  export class ElementRef<T = any> {
    nativeElement: T;
    constructor(nativeElement: T);
  }
}

declare module '@angular/common' {
  export const CommonModule: any;
}

declare module '@angular/forms' {
  export const FormsModule: any;
}

declare module '@angular/router' {
  export type Routes = any[];
  export const RouterModule: any;
  export class Router {
    navigate(commands: any[], extras?: any): Promise<boolean>;
  }
  export class ActivatedRoute {
    snapshot: {
      paramMap: {
        get(name: string): string | null;
      };
    };
  }
}

declare module '@ionic/angular/standalone' {
  export const IonHeader: any;
  export const IonToolbar: any;
  export const IonTitle: any;
  export const IonContent: any;
  export const IonButtons: any;
  export const IonButton: any;
  export const IonBackButton: any;
  export const IonMenuButton: any;
  export const IonIcon: any;
  export const IonCard: any;
  export class ToastController {
    create(opts: any): Promise<{ present: () => Promise<void> }>;
  }
  export class AlertController {
    create(opts: any): Promise<{ present: () => Promise<void> }>;
  }
}

declare module '@capacitor/cli' {
  export interface CapacitorConfig {
    appId?: string;
    appName?: string;
    webDir?: string;
    bundledWebRuntime?: boolean;
    server?: any;
    plugins?: any;
  }
}
