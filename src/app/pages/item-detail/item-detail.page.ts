import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, 
  IonBackButton, IonButton, IonIcon, AlertController, ToastController 
} from '@ionic/angular/standalone';
import * as L from 'leaflet';
import { Item, MINSU_VICTORIA_CAMPUS_CENTER, calculateDistanceMeters } from '../../models/item.model';

@Component({
  selector: 'app-item-detail',
  templateUrl: './item-detail.page.html',
  styleUrls: ['./item-detail.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
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
export class ItemDetailPage implements OnInit, AfterViewInit {
  @ViewChild('itemMapContainer', { static: false }) itemMapContainer!: ElementRef<HTMLDivElement>;

  item: Item | null = null;
  activeImageIndex: number = 0;
  private map: L.Map | null = null;
  distanceFromUserStr: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController
  ) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    // Sample item loaded with exact MinSU Victoria Campus coordinates
    this.item = {
      id: id || 'item-101',
      title: 'Casio FX-991EX ClassWiz Scientific Calculator',
      description: 'Found left on Table 12 in the 2nd Floor Engineering Reference Section of the University Library. Has a small green sticker on the back cover with initials "J.D.". Working display.',
      type: 'found',
      category: 'Electronics',
      date: 'November 7, 2026',
      location: {
        lat: 13.1560,
        lng: 121.1873,
        campusZone: 'University Library',
        specificLocation: '2nd Floor, Reference Table 12'
      },
      contact: '0917-555-8921',
      status: 'active',
      images: [
        '/src/assets/images/found_scientific_calculator_1794042804065.jpg'
      ],
      postedBy: 'Engr. Michael Reyes',
      postedDate: '2026-11-07'
    };
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initItemLeafletMap();
      this.checkUserProximity();
    }, 200);
  }

  initItemLeafletMap() {
    if (!this.itemMapContainer?.nativeElement || !this.item) return;

    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    const lat = this.item.location.lat || MINSU_VICTORIA_CAMPUS_CENTER.lat;
    const lng = this.item.location.lng || MINSU_VICTORIA_CAMPUS_CENTER.lng;

    this.map = L.map(this.itemMapContainer.nativeElement, {
      center: [lat, lng],
      zoom: 17,
      zoomControl: true,
      attributionControl: false,
      maxZoom: 19,
      minZoom: 14
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(this.map);

    // Campus boundary circle
    L.circle([MINSU_VICTORIA_CAMPUS_CENTER.lat, MINSU_VICTORIA_CAMPUS_CENTER.lng], {
      radius: 350,
      color: '#005A36',
      weight: 1.5,
      dashArray: '4, 4',
      fillColor: '#005A36',
      fillOpacity: 0.05
    }).addTo(this.map);

    const isLost = this.item.type === 'lost';
    const pinColor = isLost ? '#FFC72C' : '#0B7B48';
    const pinTextColor = isLost ? '#003620' : '#FFFFFF';

    const pinHtml = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
      ">
        <div style="
          background: ${pinColor};
          color: ${pinTextColor};
          padding: 2px 8px;
          border-radius: 9999px;
          font-size: 9px;
          font-weight: 900;
          text-transform: uppercase;
          box-shadow: 0 2px 6px rgba(0,0,0,0.25);
          white-space: nowrap;
          border: 1px solid white;
        ">
          ${isLost ? 'LOST SPOT' : 'FOUND SPOT'}
        </div>
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: ${pinColor};
          color: ${pinTextColor};
          border: 3px solid white;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
      </div>
    `;

    const icon = L.divIcon({
      className: 'minsu-item-pin-host',
      html: pinHtml,
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });

    L.marker([lat, lng], { icon }).addTo(this.map)
      .bindPopup(`<strong>${this.item.title}</strong><br>${this.item.location.specificLocation || this.item.location.campusZone}`);
  }

  checkUserProximity() {
    if (!navigator.geolocation || !this.item) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!this.item) return;
        const dist = calculateDistanceMeters(
          pos.coords.latitude,
          pos.coords.longitude,
          this.item.location.lat,
          this.item.location.lng
        );
        this.distanceFromUserStr = dist < 1000 ? `${dist}m away from your current location` : `${(dist/1000).toFixed(1)}km away`;
      },
      () => {},
      { timeout: 5000 }
    );
  }

  async openMessageModal() {
    const alert = await this.alertCtrl.create({
      header: 'Send Message to Finder',
      subHeader: `Inquiring about ${this.item?.title}`,
      inputs: [
        {
          name: 'message',
          type: 'textarea',
          placeholder: 'Hello, I believe this is my item. I can verify with the serial number or campus ID...'
        }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Send',
          handler: async (data: any) => {
            if (data.message) {
              const toast = await this.toastCtrl.create({
                message: 'Message delivered to poster via MinSU In-App Dispatch.',
                duration: 3000,
                color: 'success'
              });
              await toast.present();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async reportPost() {
    const alert = await this.alertCtrl.create({
      header: 'Report Ad / Listing',
      message: 'Please specify reason for reporting to MinSU System Admin & Campus Security Board:',
      inputs: [
        { type: 'radio', label: 'False or fake claim', value: 'fake', checked: true },
        { type: 'radio', label: 'Inappropriate image or text', value: 'inappropriate' },
        { type: 'radio', label: 'Item already claimed / outdated', value: 'outdated' }
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Submit Report',
          handler: async () => {
            const toast = await this.toastCtrl.create({
              message: 'Report submitted for System Admin review. Thank you.',
              duration: 2500,
              color: 'medium'
            });
            await toast.present();
          }
        }
      ]
    });
    await alert.present();
  }

  shareItem() {
    if (navigator.share) {
      navigator.share({
        title: this.item?.title,
        text: `Lost & Found at MinSU Victoria: ${this.item?.title}`,
        url: window.location.href
      });
    }
  }
}
