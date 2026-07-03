import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { UsuarioService } from '../../services/usuario-service';
import { CuidadorLlamarDTO } from '../../model/cuidador-llamar-dto';
import { MatCard } from '@angular/material/card';
import { MatInput } from '@angular/material/input';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-registrar-cuidador',
  imports: [
    CommonModule,
    RouterModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule,
    MatCard,
    MatInput
  ],
  templateUrl: './registrar-cuidador.html',
  styleUrl: './registrar-cuidador.css',
})
export class RegistrarCuidador {
  paso = 1;

  private router = inject(Router);
  private usuarioService = inject(UsuarioService);
  private fb = inject(FormBuilder);

  registroForm = this.fb.group({
    nombreCompleto: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    confirmPassword: ['', [Validators.required]],
    telefono: [''],
    biografia: ['']
  });

  irASiguiente() {
    const rawVal = this.registroForm.getRawValue();

    if (!rawVal.nombreCompleto?.trim() || !rawVal.email?.trim() ||
      !rawVal.password || !rawVal.confirmPassword) {
      Swal.fire({
        title: 'Campos vacíos',
        text: 'Por favor, completa todos los campos del primer paso.',
        icon: 'warning',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    if (rawVal.password !== rawVal.confirmPassword) {
      Swal.fire({
        title: 'Contraseñas no coinciden',
        text: 'Las contraseñas ingresadas no coinciden. Por favor, verifica.',
        icon: 'error',
        confirmButtonText: 'Verificar'
      });
      return;
    }

    this.paso = 2;
  }

  irAAtras() {
    this.paso = 1;
  }

  enviarFormulario() {
    const rawVal = this.registroForm.getRawValue();
    const payload: CuidadorLlamarDTO = {
      nombreCompleto: rawVal.nombreCompleto || '',
      email: rawVal.email || '',
      contrasena: rawVal.password || '',
      telefono: rawVal.telefono || '',
      biografia: rawVal.biografia || ''
    };

    console.log("JSON de Cuidador que viaja a Spring Boot:", payload);

    this.usuarioService.registrarCuidador(payload).subscribe({
      next: (respuesta) => {
        console.log("¡Registro de Cuidador exitoso!", respuesta);
        Swal.fire({
          title: '¡Cuenta creada!',
          text: 'Tu cuenta de Cuidador ha sido registrada exitosamente.',
          icon: 'success',
          timer: 2500,
          showConfirmButton: false
        }).then(() => {
          this.router.navigate(['/iniciar-sesion']);
        });
      },
      error: (err) => {
        console.error("Falló el registro de Cuidador", err);
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
