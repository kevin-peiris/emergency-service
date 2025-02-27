import { CommonModule, NgFor } from '@angular/common';
import { Component, ElementRef, NgModule, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import emailjs from 'emailjs-com';

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
  emailStatus: string = '';

  inputData = {
    serviceType: '',
    serviceDate: '',
    serviceTime: '',
    serviceDescription: '',
    name: '',
    phoneNumber: '',
    email: '',
    address: '',
    emergencyCheck: ''
  };

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
    this.emailStatus = 'Sending confirmation email...';

    const modalInstance = bootstrap.Modal.getInstance(this.confirmationModal.nativeElement) ||
      new bootstrap.Modal(this.confirmationModal.nativeElement);

    modalInstance.show();

    this.sendEmail().then(() => {
      this.emailStatus = 'Confirmation email sent successfully!';
    }).catch(() => {
      this.emailStatus = 'Failed to send confirmation email.';
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
          this.emailStatus = 'Confirmation email sent successfully!'; // Update Angular-bound status
          resolve();
        })
        .catch(error => {
          console.error('❌ Error sending email:', error);
          this.emailStatus = 'Could not send email automatically. Please download your booking confirmation PDF.';
          reject(error);
        });
    });
  }


  downloadPdf(): void {
    console.log('Downloading PDF...'); // Replace with your actual PDF generation logic
  }
}
