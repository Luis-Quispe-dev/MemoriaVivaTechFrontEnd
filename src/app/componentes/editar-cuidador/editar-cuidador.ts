import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { UsuarioService } from '../../services/usuario-service';
import { CuidadorLlamarDTO } from '../../model/cuidador-llamar-dto';
import { MatCardModule } from '@angular/material/card';
import { LenguajeService } from '../../services/lenguaje.service';
import { TranslatePipe } from '@ngx-translate/core';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-editar-cuidador',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, MatCardModule, TranslatePipe],
  templateUrl: './editar-cuidador.html',
  styleUrl: './editar-cuidador.css',
})
export class EditarCuidador implements OnInit, OnDestroy {
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
    telefonoUsuario: [''],
    biografiaUsuario: ['', [Validators.maxLength(300)]],
    emailUsuario: ['', [Validators.required, Validators.email]],
    codigoIngresado: [''],
  });

  ngOnInit() {
    if (!this.usuarioService.estaLogueado()) {
      this.router.navigate(['/iniciar-sesion']);
      return;
    }

    this.userId = this.usuarioService.obtenerUserId();
    const nombre = this.usuarioService.obtenerNombreCompleto() || '';
    const email = this.usuarioService.obtenerEmail() || '';
    this.fotoPerfil = this.usuarioService.obtenerFotoPerfil();

    this.profileForm.patchValue({
      nombreUsuario: nombre,
      emailUsuario: email,
    });

    if (this.userId) {
      this.usuarioService.obtenerCuidadorPorId(this.userId).subscribe({
        next: (res: any) => {
          this.profileForm.patchValue({
            telefonoUsuario: res.telefono || '',
            biografiaUsuario: res.biografia || '',
          });
        },
        error: (err) => {
          console.error('Error al obtener datos del cuidador:', err);
        },
      });
    }
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

    const payload: CuidadorLlamarDTO = {
      nombreCompleto: nuevoNombre,
      email: this.usuarioService.obtenerEmail() || '', // keep current email
      telefono: rawVal.telefonoUsuario ? rawVal.telefonoUsuario.trim() : '',
      biografia: rawVal.biografiaUsuario ? rawVal.biografiaUsuario.trim() : '',
      contenidoFoto: this.nuevaFotoBase64 || this.fotoPerfil,
    };

    this.usuarioService.editarCuidador(this.userId!, payload).subscribe({
      next: (res: any) => {
        this.cargandoCambios = false;
        this.fotoPerfil = res.contenidoFoto || null;

        localStorage.setItem('nombreCompleto', res.nombreCompleto);
        localStorage.setItem('fotoPerfil', res.contenidoFoto || '');

        Swal.fire({
          icon: 'success',
          title: this.lenguajeService.translate('PERF.ALERT_PROFILE_UPDATED_TITLE'),
          text: this.lenguajeService.translate('EDC.ALERT.PROFILE_UPDATED_DESC'),
          confirmButtonColor: '#166534',
          confirmButtonText: this.lenguajeService.translate('BOTON.EXCELENTE'),
        }).then(() => {
          this.router.navigate(['/perfil-cuidador']);
        });
      },
      error: (err) => {
        this.cargandoCambios = false;
        console.error('Error al actualizar cambios:', err);
        Swal.fire(
          this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
          err.error?.message || this.lenguajeService.translate('PERF.ALERT_LOAD_ERROR'),
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

    const telVal = rawVal.telefonoUsuario ? rawVal.telefonoUsuario.trim() : '';
    if (!telVal) {
      Swal.fire(
        this.lenguajeService.translate('EDC.ALERT.SMS_REQ_TEL_TITLE'),
        this.lenguajeService.translate('EDC.ALERT.SMS_REQ_TEL_DESC'),
        'warning',
      );
      return;
    }

    this.codigoDeVerificacion = Math.floor(100000 + Math.random() * 900000).toString();
    this.correoVerificado = false;
    this.mostrarCodigoBox = true;
    this.profileForm.patchValue({ codigoIngresado: '' });

    Swal.fire({
      icon: 'info',
      title: this.lenguajeService.translate('EDC.ALERT.SMS_TITLE'),
      html: `${this.lenguajeService.translate('EDC.ALERT.SMS_DESC_PRE')}<b>${telVal}</b>${this.lenguajeService.translate('EDC.ALERT.SMS_DESC_POST')}<b>${this.codigoDeVerificacion}</b>.`,
      confirmButtonText: this.lenguajeService.translate('EDC.ALERT.SMS_BOTON'),
      confirmButtonColor: '#166534',
    });
  }

  verificarCorreo() {
    if (this.correoVerificado) {
      Swal.fire(
        this.lenguajeService.translate('PERF.VERIFICADO'),
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

    const rawVal = this.profileForm.getRawValue();
    const code = rawVal.codigoIngresado ? rawVal.codigoIngresado.trim() : '';
    if (code === this.codigoDeVerificacion) {
      this.correoVerificado = true;
      this.mostrarCodigoBox = false;
      Swal.fire(
        this.lenguajeService.translate('PERF.VERIFICADO'),
        this.lenguajeService.translate('PERF.ALERT_EMAIL_VERIFIED_SUCCESS'),
        'success',
      );
    } else {
      Swal.fire(
        this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
        this.lenguajeService.translate('PERF.ALERT_CODE_INCORRECT'),
        'error',
      );
    }
  }

  confirmarCodigo() {
    this.verificarCorreo();
  }

  guardarCorreo() {
    const rawVal = this.profileForm.getRawValue();
    const emailVal = rawVal.emailUsuario ? rawVal.emailUsuario.trim() : '';
    if (!emailVal) {
      Swal.fire(
        this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
        this.lenguajeService.translate('PERF.ALERT_EMAIL_EMPTY'),
        'error',
      );
      return;
    }

    if (!this.correoVerificado && emailVal !== this.usuarioService.obtenerEmail()) {
      Swal.fire(
        this.lenguajeService.translate('PERF.ALERT_VERIFICATION_REQUIRED_TITLE'),
        this.lenguajeService.translate('PERF.ALERT_VERIFICATION_REQUIRED_DESC'),
        'warning',
      );
      return;
    }

    this.cargandoCorreo = true;

    const payload: CuidadorLlamarDTO = {
      nombreCompleto: this.usuarioService.obtenerNombreCompleto() || '',
      email: emailVal,
      telefono: rawVal.telefonoUsuario ? rawVal.telefonoUsuario.trim() : '',
      biografia: rawVal.biografiaUsuario ? rawVal.biografiaUsuario.trim() : '',
      contenidoFoto: this.fotoPerfil,
    };

    this.usuarioService.editarCuidador(this.userId!, payload).subscribe({
      next: (res: any) => {
        this.cargandoCorreo = false;
        this.correoVerificado = false;
        localStorage.setItem('email', res.email);

        Swal.fire({
          icon: 'success',
          title: this.lenguajeService.translate('PERF.ALERT_EMAIL_UPDATED_TITLE'),
          text: this.lenguajeService.translate('PERF.ALERT_EMAIL_UPDATED_DESC'),
          confirmButtonColor: '#166534',
        }).then(() => {
          this.router.navigate(['/perfil-cuidador']);
        });
      },
      error: (err) => {
        this.cargandoCorreo = false;
        console.error('Error al guardar el correo:', err);
        Swal.fire(
          this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
          err.error?.message || this.lenguajeService.translate('PERF.ALERT_LOAD_ERROR'),
          'error',
        );
      },
    });
  }

  cerrarSesion() {
    this.usuarioService.cerrarSesion();
    this.router.navigate(['/iniciar-sesion']);
  }
}
