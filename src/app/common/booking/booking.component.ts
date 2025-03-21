import { CommonModule, NgFor } from '@angular/common';
import { AfterViewInit, Component, ElementRef, NgModule, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import emailjs from 'emailjs-com';
import { jsPDF } from "jspdf";
import * as L from 'leaflet';
import 'leaflet-control-geocoder';

declare var bootstrap: any;

@Component({
  selector: 'app-booking',
  imports: [ReactiveFormsModule, FormsModule, CommonModule, NgFor],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.css'
})
export class BookingComponent implements OnInit, AfterViewInit {
  bookingForm!: FormGroup;
  services = ["Mechanical Repair", "Electrical Service", "Plumbing Issue", "Other Emergency"];
  timeSlots = ["Morning (8AM - 12PM)", "Afternoon (12PM - 4PM)", "Evening (4PM - 8PM)"];

  bookingReference = '';
  emailStatus: boolean = true;
  emailStatusLine: string = '';
  downloadBtnText: string = 'Processing...';
  generatedPdf: any;
  map!: L.Map;
  marker!: L.Marker;

  @ViewChild('bookingModal') bookingModal!: ElementRef;
  @ViewChild('confirmationModal') confirmationModal!: ElementRef;
  @ViewChild('map', { static: false }) mapElement!: ElementRef;

  constructor(private fb: FormBuilder) { }

  ngOnInit(): void {
    this.bookingForm = this.fb.group({
      serviceType: ['', Validators.required],
      serviceDate: ['', Validators.required],
      serviceTime: ['', Validators.required],
      serviceDescription: [''],
      name: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      address: ['', Validators.required],
      exactLocation: [''], // Add this field for storing coordinates
      emergencyCheck: [false]
    });

    emailjs.init("MrVRHZu2lBLuH2Jz2");
    this.bookingReference = this.generateBookingReference();
  }

  ngAfterViewInit(): void {
    // Wait for modal to be fully visible before initializing map
    const modalElement = this.bookingModal.nativeElement;

    // Listen for when modal is fully shown
    modalElement.addEventListener('shown.bs.modal', () => {
      setTimeout(() => {
        this.initMap();
        // Force map to correct size
        this.map.invalidateSize();
      }, 300);
    });
  }


  initMap(): void {
    // Prevent multiple initializations
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize(); // Fixes modal rendering issues
      }, 300);
      return; // Stop duplicate maps
    }

    this.map = L.map('map', {
      center: [6.9271, 79.8612], // Default to Colombo, Sri Lanka
      zoom: 13
    });

    // Load OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19 // Allow more detailed zoom
    }).addTo(this.map);

    // Create a custom icon for better visibility
    const customIcon = L.icon({
      iconUrl: 'assets/marker-icon.png', // Make sure this exists in your assets folder
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    // Use the custom icon for the marker
    this.marker = L.marker([6.9271, 79.8612], {
      draggable: true,
      autoPan: true,
      icon: customIcon // Use custom icon
    })
      .addTo(this.map)
      .bindPopup('Drag to your exact location')
      .openPopup();

    // Add a draggable marker
    this.marker = L.marker([6.9271, 79.8612], {
      draggable: true,
      autoPan: true // Automatically pan map when marker reaches edge while dragging
    })
      .addTo(this.map)
      .bindPopup('Drag to your exact location')
      .openPopup();

    // Improved geocoder styling and functionality
    const geocoder = (L.Control as any).geocoder({
      defaultMarkGeocode: false,
      position: 'topright', // More visible position
      placeholder: 'Enter exact address or house number...', // More descriptive placeholder
      errorMessage: 'Address not found. Try another search.',
      suggestMinLength: 2, // Start suggesting after 2 characters
      suggestTimeout: 200, // Faster suggestions
      queryMinLength: 1,
      geocodingQueryParams: {
        addressdetails: 1, // Request detailed address information
        extratags: 1, // Request extra tags like housenumber
        namedetails: 1
      }
    })
      .on('markgeocode', (e: any) => {
        const latlng = e.geocode.center;
        this.marker.setLatLng(latlng);
        this.map.setView(latlng, 18); // Zoom in closer for house-level detail

        // Extract house number if available
        let houseNumber = '';
        if (e.geocode.properties && e.geocode.properties.address) {
          houseNumber = e.geocode.properties.address.house_number || '';
        }

        this.getAddress(latlng.lat, latlng.lng, houseNumber);
      })
      .addTo(this.map);

    // Add custom styling to make the search box more prominent
    const searchContainer = document.querySelector('.leaflet-control-geocoder');
    if (searchContainer) {
      (searchContainer as HTMLElement).style.width = '300px';
      const searchInput = searchContainer.querySelector('input');
      if (searchInput) {
        (searchInput as HTMLElement).style.padding = '10px';
        (searchInput as HTMLElement).style.fontSize = '16px';
      }
    }

    // Update input field on marker drag
    this.marker.on('dragend', () => {
      const position = this.marker.getLatLng();
      this.getAddress(position.lat, position.lng);
      // Store exact coordinates in the form
      this.bookingForm.patchValue({
        exactLocation: `${position.lat.toFixed(6)},${position.lng.toFixed(6)}`
      });
    });

    // Get user location if available
    this.map.locate({
      setView: true,
      maxZoom: 16,
      enableHighAccuracy: true // Request high accuracy
    });

    this.map.on('locationfound', (e: any) => {
      this.marker.setLatLng(e.latlng);
      this.getAddress(e.latlng.lat, e.latlng.lng);
      // Store exact coordinates in the form
      this.bookingForm.patchValue({
        exactLocation: `${e.latlng.lat.toFixed(6)},${e.latlng.lng.toFixed(6)}`
      });
    });

    // Add click event to set marker
    this.map.on('click', (e: any) => {
      this.marker.setLatLng(e.latlng);
      this.getAddress(e.latlng.lat, e.latlng.lng);
      // Store exact coordinates in the form
      this.bookingForm.patchValue({
        exactLocation: `${e.latlng.lat.toFixed(6)},${e.latlng.lng.toFixed(6)}`
      });
    });

    // Ensure the map resizes properly inside a modal
    setTimeout(() => {
      this.map.invalidateSize();
    }, 300);
  }



  getAddress(lat: number, lng: number, houseNumber: string = ''): void {
    // Store exact coordinates
    this.bookingForm.patchValue({
      exactLocation: `${lat.toFixed(6)},${lng.toFixed(6)}`
    });

    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

    fetch(url)
      .then(response => response.json())
      .then(data => {
        if (data && data.address) {
          // Extract address components
          const addressComponents = data.address;
          const road = addressComponents.road || addressComponents.street || '';
          const houseNum = houseNumber || addressComponents.house_number || '';
          const suburb = addressComponents.suburb || addressComponents.neighbourhood || '';
          const city = addressComponents.city || addressComponents.town || addressComponents.village || '';
          const state = addressComponents.state || '';
          const postcode = addressComponents.postcode || '';

          // Format a cleaner address with house number prominence
          let formattedAddress = '';
          if (houseNum) formattedAddress += `${houseNum} `;
          if (road) formattedAddress += `${road}, `;
          if (suburb) formattedAddress += `${suburb}, `;
          if (city) formattedAddress += `${city}, `;
          if (state) formattedAddress += `${state} `;
          if (postcode) formattedAddress += `${postcode}`;

          // For display purposes, use a shorter version in the popup
          const shortAddress = formattedAddress.split(',').slice(0, 2).join(',');

          this.bookingForm.patchValue({ address: formattedAddress });
          this.marker.bindPopup(`
            <strong>${houseNum ? 'House #' + houseNum + ', ' : ''}${road || ''}</strong><br>
            ${shortAddress}<br>
            <small>Drag marker for precise location</small>
          `).openPopup();
        } else if (data && data.display_name) {
          // Fallback to display_name if address components aren't available
          this.bookingForm.patchValue({ address: data.display_name });
          this.marker.bindPopup(`
            <strong>Selected Location</strong><br>
            ${data.display_name.split(',').slice(0, 2).join(',')}<br>
            <small>Drag marker for precise location</small>
          `).openPopup();
        } else {
          this.bookingForm.patchValue({
            address: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`
          });
          this.marker.bindPopup(`
            <strong>Selected location</strong><br>
            Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}<br>
            <small>Drag marker for precise location</small>
          `).openPopup();
        }
      })
      .catch(() => {
        this.bookingForm.patchValue({
          address: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`
        });
        this.marker.bindPopup(`
          <strong>Selected location</strong><br>
          Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}<br>
          <small>Drag marker for precise location</small>
        `).openPopup();
      });
  }

  // Add these methods to your component

  updateHouseNumber(event: any): void {
    const houseNumber = event.target.value.trim();
    if (!houseNumber) return;

    // Get current address and add/update house number
    let address = this.bookingForm.get('address')?.value || '';

    // Check if address already has a house number format (starts with number)
    if (/^\d+[A-Za-z]?\s/.test(address)) {
      // Replace existing house number
      address = address.replace(/^\d+[A-Za-z]?\s/, `${houseNumber} `);
    } else {
      // Add house number at the beginning
      address = `${houseNumber} ${address}`;
    }

    this.bookingForm.patchValue({ address: address });

    // Update popup
    const position = this.marker.getLatLng();
    this.marker.bindPopup(`
    <strong>House #${houseNumber}</strong><br>
    ${address.split(',').slice(0, 2).join(',')}<br>
    <small>Address manually refined</small>
  `).openPopup();
  }

  updateStreetAddress(event: any): void {
    const streetAddress = event.target.value.trim();
    if (!streetAddress) return;

    this.bookingForm.patchValue({ address: streetAddress });
  }

  getStreetAddress(): string {
    // Get current address without house number
    const address = this.bookingForm.get('address')?.value || '';
    // Remove house number if it exists
    return address.replace(/^\d+[A-Za-z]?\s/, '');
  }



  generateBookingReference() {
    const prefix = 'QF';
    const timestamp = new Date().getTime().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${timestamp}-${random}`;
  }

  submitBooking(): void {
    if (this.bookingForm.valid) {
      this.closeBookingModal();
      this.generatePdf();
      this.showConfirmationModal();
    } else {
      alert("Please fill all required fields.");
    }
  }

  closeBookingModal(): void {
    const modalInstance = bootstrap.Modal.getInstance(this.bookingModal.nativeElement) ||
      new bootstrap.Modal(this.bookingModal.nativeElement);
    modalInstance.hide();
  }

  showConfirmationModal(): void {
    this.emailStatusLine = 'Sending confirmation email...';

    const modalInstance = bootstrap.Modal.getInstance(this.confirmationModal.nativeElement) ||
      new bootstrap.Modal(this.confirmationModal.nativeElement);
    modalInstance.show();

    this.sendEmail().then(() => {
      this.emailStatusLine = 'Confirmation email sent successfully!';
      this.emailStatus = true;
    }).catch(() => {
      this.emailStatusLine = 'Failed to send confirmation email.';
      this.emailStatus = false;
    });
  }

  sendEmail(): Promise<void> {
    const emailData = {
      service_id: "service_yp6vc7q",
      template_id: "template_gs6km1a",
      user_id: "MrVRHZu2lBLuH2Jz2",
      template_params: {
        to_email: this.bookingForm.value.email,
        admin_email: "kevin.2007.01.22@gmail.com",
        from_name: "QuickFix Emergency Services",
        to_name: this.bookingForm.value.name,
        booking_reference: this.bookingReference,
        service_type: this.bookingForm.value.serviceType,
        service_date: this.bookingForm.value.serviceDate,
        service_time: this.bookingForm.value.serviceTime,
        address: this.bookingForm.value.address,
        exact_location: this.bookingForm.value.exactLocation || "Not specified", // Include exact coordinates
        phone: this.bookingForm.value.phoneNumber,
        issue: this.bookingForm.value.serviceDescription || "No description provided",
        emergency: this.bookingForm.value.emergencyCheck ? "Urgent" : "Standard"
      }
    };

    console.log(emailData);
    this.bookingForm.reset();

    return new Promise((resolve, reject) => {
      emailjs.send(emailData.service_id, emailData.template_id, emailData.template_params, emailData.user_id)
        .then(response => {
          console.log('✅ Email sent successfully:', response);
          this.emailStatusLine = 'Confirmation email sent successfully!';
          this.emailStatus = true;
          resolve();
        })
        .catch(error => {
          console.error('❌ Error sending email:', error);
          this.emailStatusLine = 'Could not send email automatically. Please download your booking confirmation PDF.';
          this.emailStatus = false;
          reject(error);
        })
        .finally(() => {
          // Reset button state
          this.downloadBtnText = 'Download PDF'
        });
    });
  }

  generatePdf(): void {
    // Create new PDF document
    const doc = new jsPDF();

    // Add logo/header
    doc.setFillColor(220, 53, 69); // Bootstrap danger color
    doc.rect(0, 0, doc.internal.pageSize.width, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('QuickFix Emergency Services', 105, 20, { align: 'center' });
    doc.setFontSize(14);
    doc.text('24/7 Breakdown Service Booking Confirmation', 105, 30, { align: 'center' });

    // Add booking reference and date
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Booking Reference: ${this.bookingReference}`, 15, 50);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 15, 58);

    // Add customer information section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Customer Information', 15, 75);
    doc.line(15, 77, 195, 77);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Name: ${this.bookingForm.value.name}`, 15, 85);
    doc.text(`Phone: ${this.bookingForm.value.phoneNumber}`, 15, 93);
    doc.text(`Email: ${this.bookingForm.value.email}`, 15, 101);
    doc.text(`Address: ${this.bookingForm.value.address}`, 15, 109);

    // Add service details section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Service Details', 15, 125);
    doc.line(15, 127, 195, 127);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(`Service Type: ${this.bookingForm.value.serviceType}`, 15, 135);
    doc.text(`Date Requested: ${this.bookingForm.value.serviceDate}`, 15, 143);
    doc.text(`Time Slot: ${this.bookingForm.value.serviceTime}`, 15, 151);
    doc.text(`Emergency Priority: ${this.bookingForm.value.emergencyCheck}`, 15, 159);

    // Add issue description
    doc.setFont('helvetica', 'bold');
    doc.text('Issue Description:', 15, 175);
    doc.setFont('helvetica', 'normal');

    // Handle multiline description text
    const descriptionText = this.bookingForm.value.serviceDescription || 'No description provided';
    const splitDescription = doc.splitTextToSize(descriptionText, 170);
    doc.text(splitDescription, 15, 183);

    // Add service agreement and terms
    doc.setFillColor(240, 240, 240);
    doc.rect(15, 210, 180, 35, 'F');

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Service Agreement:', 20, 218);
    doc.text('1. A technician will contact you to confirm your appointment.', 20, 225);
    doc.text('2. Standard service fee applies, plus parts and labor as required.', 20, 232);
    doc.text('3. All work comes with our 90-day satisfaction guarantee.', 20, 239);

    // Add footer
    doc.setFillColor(50, 50, 50);
    doc.rect(0, 270, doc.internal.pageSize.width, 25, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text('QuickFix Emergency Services', 105, 280, { align: 'center' });
    doc.text('Phone: +94 71 450 0496 | Email: service@quickfix.com | www.quickfix.com', 105, 286, { align: 'center' });

    // Save the generated PDF
    this.generatedPdf = doc;
  }


  downloadPdf(): void {
    this.generatedPdf.save(`QuickFix_Booking_${this.bookingReference}.pdf`);
  }
}
