import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import Swal from 'sweetalert2';
import {MatIconModule} from '@angular/material/icon';
import {MatToolbarModule} from '@angular/material/toolbar';

@Component({
  selector: 'app-landing-page',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatButtonModule,
    MatMenuModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatToolbarModule,
    MatIconModule
  ],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.css'
})
export class LandingPage {
  showBackToTop = false;

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.showBackToTop = window.scrollY > 300;
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  enviarMensaje(event: Event) {
    event.preventDefault();
    Swal.fire({
      title: '¡Mensaje Enviado!',
      text: 'Gracias por escribirnos. En breve nos comunicaremos contigo para ayudarte.'  ,
      icon: 'success',
      confirmButtonText: 'Genial',
      confirmButtonColor: '#333333',
      background: '#ffffff',
      color: '#333333',
      padding: '2em',
      backdrop: `
        rgba(0,0,0,0.4)
        left top
        no-repeat
      `,
      customClass: {
        popup: 'alerta-soulstory'
      }
    });
  }
}
