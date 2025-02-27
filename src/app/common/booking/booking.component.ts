import { CommonModule, NgFor } from '@angular/common';
import { Component, ElementRef, NgModule, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import emailjs from 'emailjs-com';
import { jsPDF } from "jspdf";

declare var bootstrap: any;

@Component({
  selector: 'app-booking',
  imports: [ReactiveFormsModule, FormsModule, CommonModule, NgFor],
  templateUrl: './booking.component.html',
  styleUrl: './booking.component.css'
})
export class BookingComponent implements OnInit {
  bookingForm!: FormGroup;
  services = ["Mechanical Repair", "Electrical Service", "Plumbing Issue", "Other Emergency"];
  timeSlots = ["Morning (8AM - 12PM)", "Afternoon (12PM - 4PM)", "Evening (4PM - 8PM)"];

  bookingReference = '';
  emailStatus: boolean = true;
  emailStatusLine: string = '';
  downloadBtnText: string = 'Processing...';
  generatedPdf: any;

  @ViewChild('bookingModal') bookingModal!: ElementRef;
  @ViewChild('confirmationModal') confirmationModal!: ElementRef;

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
      emergencyCheck: [false]
    });

    emailjs.init("MrVRHZu2lBLuH2Jz2");
    this.bookingReference = this.generateBookingReference();
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
      service_id: "service_yp6vc7q", // Replace with your EmailJS service ID
      template_id: "template_gs6km1a", // Replace with your EmailJS template ID
      user_id: "MrVRHZu2lBLuH2Jz2", // Replace with your public key
      template_params: {
        to_email: this.bookingForm.value.email,
        admin_email: "kevin.2007.01.22@gmail.com", // Your email
        from_name: "QuickFix Emergency Services",
        to_name: this.bookingForm.value.name,
        booking_reference: this.bookingReference,
        service_type: this.bookingForm.value.serviceType,
        service_date: this.bookingForm.value.serviceDate,
        service_time: this.bookingForm.value.serviceTime,
        address: this.bookingForm.value.address,
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
        .finally( () => {
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
