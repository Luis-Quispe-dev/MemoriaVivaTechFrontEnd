import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { UsuarioService } from '../../services/usuario-service';
import { AdultoMayorLlamarDTO } from '../../model/adulto-mayor-llamar-dto';
import { MatCardModule } from '@angular/material/card';
import Swal from 'sweetalert2';
import { TranslatePipe } from '@ngx-translate/core';
import { LenguajeService } from '../../services/lenguaje.service';

@Component({
  selector: 'app-editar-adulto-mayor',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, MatCardModule, TranslatePipe],
  templateUrl: './editar-adulto-mayor.html',
  styleUrl: './editar-adulto-mayor.css',
})
export class EditarAdultoMayor implements OnInit, OnDestroy {
  nombreUsuario = '';
  emailUsuario = '';
  fotoPerfil: string | null = null;
  userId: number | null = null;
  cargandoCambios = false;
  cargandoCorreo = false;
  flashActivo = false;

  nuevaFotoBase64: string | null = null;
  webcamStream: MediaStream | null = null;
  codigoDeVerificacion: string | null = null;
  correoVerificado = false;
  mostrarCodigoBox = false;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('webcamVideo') webcamVideo!: ElementRef<HTMLVideoElement>;

  private usuarioService = inject(UsuarioService);
  private lenguajeService = inject(LenguajeService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  profileForm = this.fb.group({
    nombreUsuario: ['', [Validators.required]],
    emailUsuario: ['', [Validators.required, Validators.email]],
    codigoIngresado: [''],
  });

  ngOnInit() {
    if (!this.usuarioService.estaLogueado()) {
      this.router.navigate(['/iniciar-sesion']);
      return;
    }

    this.userId = this.usuarioService.obtenerUserId();
    this.nombreUsuario = this.usuarioService.obtenerNombreCompleto() || '';
    this.emailUsuario = this.usuarioService.obtenerEmail() || '';
    this.fotoPerfil = this.usuarioService.obtenerFotoPerfil();

    this.profileForm.patchValue({
      nombreUsuario: this.nombreUsuario,
      emailUsuario: this.emailUsuario,
    });
  }

  ngOnDestroy() {
    this.stopCamera();
  }

  triggerFileSelect() {
    this.stopCamera();
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.nuevaFotoBase64 = e.target.result;
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: this.lenguajeService.translate('PERF.ALERT_IMG_LOADED'),
          showConfirmButton: false,
          timer: 3500,
        });
      };
      reader.readAsDataURL(file);
    }
  }

  async startCamera() {
    try {
      this.webcamStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setTimeout(() => {
        if (this.webcamVideo && this.webcamVideo.nativeElement) {
          this.webcamVideo.nativeElement.srcObject = this.webcamStream;
        }
      }, 100);
    } catch (err) {
      console.error('Acceso a cámara denegado:', err);
      Swal.fire(
        this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
        this.lenguajeService.translate('PERF.ALERT_CAMERA_ERROR'),
        'error',
      );
    }
  }

  stopCamera() {
    if (this.webcamStream) {
      this.webcamStream.getTracks().forEach((track) => track.stop());
      this.webcamStream = null;
    }
  }

  capturePhoto() {
    if (this.webcamStream && this.webcamVideo && this.webcamVideo.nativeElement) {
      const video = this.webcamVideo.nativeElement;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 320;
      canvas.height = video.videoHeight || 240;
      const context = canvas.getContext('2d');
      context?.drawImage(video, 0, 0, canvas.width, canvas.height);

      this.flashActivo = true;
      setTimeout(() => (this.flashActivo = false), 450);

      this.nuevaFotoBase64 = canvas.toDataURL('image/jpeg');
      this.stopCamera();

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: this.lenguajeService.translate('PERF.ALERT_PHOTO_CAPTURED'),
        showConfirmButton: false,
        timer: 3500,
      });
    }
  }

  guardarCambios() {
    const rawVal = this.profileForm.getRawValue();
    const nuevoNombre = rawVal.nombreUsuario ? rawVal.nombreUsuario.trim() : '';
    if (!nuevoNombre) {
      Swal.fire(
        this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
        this.lenguajeService.translate('PERF.ALERT_NAME_EMPTY'),
        'error',
      );
      return;
    }

    this.cargandoCambios = true;

    const payload: AdultoMayorLlamarDTO = {
      nombreCompleto: nuevoNombre,
      email: this.usuarioService.obtenerEmail() || '', // keep current email
      contenidoFoto: this.nuevaFotoBase64 || this.fotoPerfil,
    };

    this.usuarioService.editarAdultoMayor(this.userId!, payload).subscribe({
      next: (res: any) => {
        this.cargandoCambios = false;
        this.nombreUsuario = res.nombreCompleto;
        this.fotoPerfil = res.contenidoFoto || null;

        localStorage.setItem('nombreCompleto', res.nombreCompleto);
        localStorage.setItem('fotoPerfil', res.contenidoFoto || '');

        Swal.fire({
          icon: 'success',
          title: this.lenguajeService.translate('PERF.ALERT_PROFILE_UPDATED_TITLE'),
          text: this.lenguajeService.translate('PERF.ALERT_PROFILE_UPDATED_DESC'),
          confirmButtonColor: '#166534',
          confirmButtonText: this.lenguajeService.translate('BOTON.EXCELENTE'),
        }).then(() => {
          this.router.navigate(['/perfil-adulto-mayor']);
        });
      },
      error: (err) => {
        this.cargandoCambios = false;
        console.error('Error al actualizar cambios:', err);
        Swal.fire(
          this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
          err.error?.message || this.lenguajeService.translate('GALERIA.SAVE_ERROR_DESC'),
          'error',
        );
      },
    });
  }

  enviarCodigo() {
    const rawVal = this.profileForm.getRawValue();
    const emailVal = rawVal.emailUsuario ? rawVal.emailUsuario.trim() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailVal || !emailRegex.test(emailVal)) {
      Swal.fire(
        this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
        this.lenguajeService.translate('PERF.ALERT_EMAIL_INVALID'),
        'error',
      );
      return;
    }

    this.codigoDeVerificacion = Math.floor(100000 + Math.random() * 900000).toString();
    this.correoVerificado = false;
    this.mostrarCodigoBox = true;
    this.profileForm.patchValue({ codigoIngresado: '' });

    Swal.fire({
      icon: 'info',
      title: this.lenguajeService.translate('PERF.ALERT_CODE_SENT_TITLE'),
      html:
        this.lenguajeService.translate('PERF.ALERT_CODE_SENT_DESC_PRE') +
        `<b>${this.codigoDeVerificacion}</b>` +
        this.lenguajeService.translate('PERF.ALERT_CODE_SENT_DESC_POST'),
      confirmButtonText: this.lenguajeService.translate('BOTON.ENTENDIDO'),
      confirmButtonColor: '#166534',
    });
  }

  verificarCorreo() {
    if (this.correoVerificado) {
      Swal.fire(
        this.lenguajeService.translate('PERF.ALERT_ALREADY_VERIFIED_TITLE'),
        this.lenguajeService.translate('PERF.ALERT_ALREADY_VERIFIED_DESC'),
        'success',
      );
      return;
    }
    if (!this.codigoDeVerificacion) {
      Swal.fire(
        this.lenguajeService.translate('PERF.ALERT_SEND_CODE_FIRST_TITLE'),
        this.lenguajeService.translate('PERF.ALERT_SEND_CODE_FIRST_DESC'),
        'warning',
      );
      return;
    }
    this.mostrarCodigoBox = true;
  }

  confirmarCodigo() {
    const rawVal = this.profileForm.getRawValue();
    const userCode = rawVal.codigoIngresado ? rawVal.codigoIngresado.trim() : '';
    if (userCode === this.codigoDeVerificacion) {
      this.correoVerificado = true;
      this.mostrarCodigoBox = false;

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: this.lenguajeService.translate('PERF.ALERT_EMAIL_VERIFIED_SUCCESS'),
        showConfirmButton: false,
        timer: 3000,
      });
    } else {
      Swal.fire(
        this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
        this.lenguajeService.translate('PERF.ALERT_CODE_INCORRECT'),
        'error',
      );
    }
  }

  guardarCorreo() {
    const rawVal = this.profileForm.getRawValue();
    const nuevoEmail = rawVal.emailUsuario ? rawVal.emailUsuario.trim() : '';
    if (!nuevoEmail) {
      Swal.fire(
        this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
        this.lenguajeService.translate('PERF.ALERT_EMAIL_EMPTY'),
        'error',
      );
      return;
    }

    const currentEmail = this.usuarioService.obtenerEmail() || '';
    if (nuevoEmail !== currentEmail && !this.correoVerificado) {
      Swal.fire(
        this.lenguajeService.translate('PERF.ALERT_VERIFICATION_REQUIRED_TITLE'),
        this.lenguajeService.translate('PERF.ALERT_VERIFICATION_REQUIRED_DESC'),
        'warning',
      );
      return;
    }

    this.cargandoCorreo = true;

    const payload: AdultoMayorLlamarDTO = {
      nombreCompleto: rawVal.nombreUsuario || this.nombreUsuario,
      email: nuevoEmail,
      contenidoFoto: this.nuevaFotoBase64 || this.fotoPerfil,
    };

    this.usuarioService.editarAdultoMayor(this.userId!, payload).subscribe({
      next: (res: any) => {
        setTimeout(() => {
          this.cargandoCorreo = false;
          this.emailUsuario = res.email;
          this.fotoPerfil = res.contenidoFoto || null;

          localStorage.setItem('email', res.email);
          localStorage.setItem('fotoPerfil', res.contenidoFoto || '');

          Swal.fire({
            icon: 'success',
            title: this.lenguajeService.translate('PERF.ALERT_EMAIL_UPDATED_TITLE'),
            text: this.lenguajeService.translate('PERF.ALERT_EMAIL_UPDATED_DESC'),
            confirmButtonColor: '#166534',
            confirmButtonText: this.lenguajeService.translate('BOTON.EXCELENTE'),
          }).then(() => {
            this.router.navigate(['/perfil-adulto-mayor']);
          });
        }, 1000);
      },
      error: (err) => {
        setTimeout(() => {
          this.cargandoCorreo = false;
          console.error('Error al actualizar correo:', err);
          Swal.fire(
            this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
            err.error?.message || this.lenguajeService.translate('GALERIA.SAVE_ERROR_DESC'),
            'error',
          );
        }, 1000);
      },
    });
  }

  cerrarSesion() {
    this.usuarioService.cerrarSesion();
    this.router.navigate(['/iniciar-sesion']);
  }
}
