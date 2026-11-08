import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonBackButton, IonButton, IonIcon, AlertController, ToastController 
} from '@ionic/angular/standalone';
import { 
  SecurityReport, 
  SecurityReportStatus, 
  SecurityReportReason,
  getLocalSecurityReports,
  saveLocalSecurityReports
} from '../../models/item.model';
import { 
  fetchSecurityReportsFromFirestore, 
  updateSecurityReportInFirestore, 
  deleteItemFromFirestore,
  subscribeToFirestoreSecurityReports
} from '../../../firebase/firebase';
import { isFirebaseConfigured } from '../../../firebase/firebaseConfig';
import { INITIAL_SECURITY_REPORTS } from '../../../data/mockItems';

@Component({
  selector: 'app-admin-reports',
  templateUrl: './admin-reports.page.html',
  styleUrls: ['./admin-reports.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon
  ]
})
export class AdminReportsPage implements OnInit {
  reports: SecurityReport[] = [];
  selectedFilter: 'all' | SecurityReportStatus = 'all';
  searchQuery: string = '';
  selectedReason: string = 'all';
  isLoading: boolean = false;
  isFirebaseActive: boolean = false;

  constructor(
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  async ngOnInit() {
    this.isFirebaseActive = isFirebaseConfigured();
    await this.loadReports();

    // Subscribe to realtime updates if Firebase is configured
    if (this.isFirebaseActive) {
      subscribeToFirestoreSecurityReports((updatedReports: SecurityReport[]) => {
        if (updatedReports && updatedReports.length > 0) {
          this.reports = updatedReports;
          saveLocalSecurityReports(updatedReports);
        }
      });
    }
  }

  async loadReports() {
    this.isLoading = true;
    try {
      if (this.isFirebaseActive) {
        const remote = await fetchSecurityReportsFromFirestore();
        if (remote && remote.length > 0) {
          this.reports = remote;
          saveLocalSecurityReports(remote);
          this.isLoading = false;
          return;
        }
      }

      // Local fallback / initial seed
      const local = getLocalSecurityReports();
      if (local && local.length > 0) {
        this.reports = local;
      } else {
        this.reports = INITIAL_SECURITY_REPORTS;
        saveLocalSecurityReports(INITIAL_SECURITY_REPORTS);
      }
    } catch (e) {
      console.warn('Error loading security reports:', e);
      this.reports = INITIAL_SECURITY_REPORTS;
    } finally {
      this.isLoading = false;
    }
  }

  get filteredReports(): SecurityReport[] {
    return this.reports.filter((r) => {
      // Status filter
      if (this.selectedFilter !== 'all' && r.status !== this.selectedFilter) {
        return false;
      }

      // Reason filter
      if (this.selectedReason !== 'all' && r.reason !== this.selectedReason) {
        return false;
      }

      // Search keyword
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        const matchTitle = r.itemTitle.toLowerCase().includes(q);
        const matchId = r.itemId.toLowerCase().includes(q);
        const matchReporter = r.reportedBy.toLowerCase().includes(q);
        const matchEmail = (r.reporterEmail || '').toLowerCase().includes(q);
        const matchNotes = (r.reasonDetails || '').toLowerCase().includes(q);
        if (!matchTitle && !matchId && !matchReporter && !matchEmail && !matchNotes) {
          return false;
        }
      }

      return true;
    });
  }

  get pendingCount(): number {
    return this.reports.filter(r => r.status === 'Pending Review').length;
  }

  get resolvedCount(): number {
    return this.reports.filter(r => r.status === 'Resolved').length;
  }

  get removedCount(): number {
    return this.reports.filter(r => r.status === 'Post Removed').length;
  }

  get dismissedCount(): number {
    return this.reports.filter(r => r.status === 'Dismissed').length;
  }

  getReasonLabel(reason: SecurityReportReason): string {
    switch (reason) {
      case 'spam':
        return 'Spam or Commercial Advertisement';
      case 'fake_claim':
        return 'Fake Item / Suspicious Ownership';
      case 'inappropriate':
        return 'Inappropriate Content or Remarks';
      case 'duplicate':
        return 'Duplicate or Outdated Listing';
      default:
        return 'Campus Security Concern';
    }
  }

  // Action 1: Dismiss Report (keeps the post active)
  async dismissReport(report: SecurityReport) {
    const alert = await this.alertCtrl.create({
      header: 'Dismiss Security Report',
      message: `Dismiss report #${report.id}? The post "${report.itemTitle}" will remain active on the campus feed.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Dismiss Report',
          handler: async () => {
            await this.updateReportStatus(report.id, 'Dismissed', 'Dismissed by System Admin. Listing verified as active.');
            await this.showToast('Report dismissed. Item remains active.');
          }
        }
      ]
    });
    await alert.present();
  }

  // Action 2: Remove Post / Item (deletes or hides reported post from public campus feed)
  async removePostItem(report: SecurityReport) {
    const alert = await this.alertCtrl.create({
      header: 'Remove Reported Post',
      message: `Are you sure you want to remove "${report.itemTitle}" (ID: ${report.itemId}) from the public campus feed?`,
      inputs: [
        {
          name: 'notes',
          type: 'text',
          placeholder: 'Reason for removal (e.g. prohibited ad, spam)'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove Post',
          handler: async (data: any) => {
            const adminNote = data.notes || 'Removed by System Admin due to violation of MinSU policies.';
            
            // Delete/hide from Firestore
            if (this.isFirebaseActive) {
              await deleteItemFromFirestore(report.itemId);
            }

            // Update report status to 'Post Removed'
            await this.updateReportStatus(report.id, 'Post Removed', adminNote);
            await this.showToast(`Post #${report.itemId} removed from campus feed.`);
          }
        }
      ]
    });
    await alert.present();
  }

  // Action 3: Mark as Resolved
  async markAsResolved(report: SecurityReport) {
    const alert = await this.alertCtrl.create({
      header: 'Mark Report as Resolved',
      message: `Mark security report #${report.id} as resolved?`,
      inputs: [
        {
          name: 'notes',
          type: 'text',
          placeholder: 'Resolution notes (e.g. verified with security)'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Resolve',
          handler: async (data: any) => {
            const adminNote = data.notes || 'Resolved by System Admin and verified with Campus Security.';
            await this.updateReportStatus(report.id, 'Resolved', adminNote);
            await this.showToast('Security report marked as resolved.');
          }
        }
      ]
    });
    await alert.present();
  }

  private async updateReportStatus(reportId: string, status: SecurityReportStatus, adminNotes: string) {
    const nowStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    // Local state update
    this.reports = this.reports.map(r => {
      if (r.id === reportId) {
        return {
          ...r,
          status,
          adminNotes,
          resolvedAt: nowStr,
          resolvedBy: 'System Administrator (admin@minsu.edu.ph)'
        };
      }
      return r;
    });

    saveLocalSecurityReports(this.reports);

    // Sync to Firestore
    if (this.isFirebaseActive) {
      await updateSecurityReportInFirestore(reportId, {
        status,
        adminNotes,
        resolvedAt: nowStr,
        resolvedBy: 'System Administrator (admin@minsu.edu.ph)'
      });
    }
  }

  private async showToast(message: string) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color: 'dark'
    });
    await toast.present();
  }
}
