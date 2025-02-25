import { Component, OnInit } from '@angular/core';
import { NavbarComponent } from '../../common/navbar/navbar.component';

import AOS from 'aos';
import 'aos/dist/aos.css';
import { BannerComponent } from '../../common/banner/banner.component';


@Component({
  selector: 'app-homepage',
  imports: [BannerComponent,NavbarComponent],
  templateUrl: './homepage.component.html',
  styleUrl: './homepage.component.css'
})
export class HomepageComponent implements OnInit {
  
  ngOnInit() {
    if (typeof document !== 'undefined') {
      AOS.init({
        duration: 1000
      });
    }
  }


}
