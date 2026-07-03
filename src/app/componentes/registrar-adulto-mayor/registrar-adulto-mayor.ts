import { Component } from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatFormFieldModule} from '@angular/material/form-field';
import {Router, RouterModule} from '@angular/router';
import {CommonModule} from '@angular/common';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatNativeDateModule, MAT_DATE_LOCALE, DateAdapter} from '@angular/material/core';
import {FormsModule} from '@angular/forms';
import {UsuarioService} from '../../services/usuario-service';
import {MatCard} from '@angular/material/card';
import {MatInput} from '@angular/material/input';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-registrar-adulto-mayor',
  imports: [
    CommonModule,
    RouterModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    FormsModule,
    MatCard,
    MatInput
  ],
  providers: [
    { provide: MAT_DATE_LOCALE, useValue: 'es-ES' }
  ],
  templateUrl: './registrar-adulto-mayor.html',
  styleUrl: './registrar-adulto-mayor.css',
})
export class RegistrarAdultoMayor {
  constructor(private dateAdapter: DateAdapter<Date>,
              private router :Router,
              private usuarioService:UsuarioService,) {
    this.dateAdapter.setLocale('es-PE');
  }

  datosRegistro = {
    nombreCompleto: '',
    email: '',
    fechaNacimiento: null as Date | null,
    password: '',
    confirmPassword: ''
  };

  enviarFormulario() {
    if (this.datosRegistro.password !== this.datosRegistro.confirmPassword) {
      alert("Las contraseñas no coinciden. Por favor, verifica.");
      return;
    }

    let fechaFormateada = '';
    if (this.datosRegistro.fechaNacimiento) {
      const fecha = new Date(this.datosRegistro.fechaNacimiento);
      fecha.setMinutes(fecha.getMinutes() - fecha.getTimezoneOffset());
      fechaFormateada = fecha.toISOString().split('T')[0];
    }

    const payload = {
      nombreCompleto: this.datosRegistro.nombreCompleto,
      email: this.datosRegistro.email,
      fechaNacimiento: fechaFormateada,
      contrasena: this.datosRegistro.password,
    };

    console.log("JSON limpio que viaja a Spring Boot:", payload);

    this.usuarioService.registrarAdultoMayor(payload).subscribe({
      next: (respuesta) => {
        console.log("¡Registro exitoso!", respuesta);
        Swal.fire({
          title: '¡Cuenta creada!',
          text: 'Tu cuenta de Adulto Mayor ha sido registrada exitosamente.',
          icon: 'success',
          timer: 2500,
          showConfirmButton: false
        }).then(() => {
          this.router.navigate(['/iniciar-sesion']);
        });
      },
      error: (err) => {
        console.error("Falló el registro", err);
        Swal.fire({
          title: 'Error de registro',
          text: 'Hubo un problema al crear tu cuenta. Por favor verifica tus datos e intenta de nuevo.',
          icon: 'error',
          confirmButtonText: 'Reintentar'
        });
      }
    });

  }
}
