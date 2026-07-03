import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../services/usuario-service';
import { RecuerdoService } from '../../services/recuerdo-service';
import { RecuerdoLlamadoDTO } from '../../model/recuerdo-llamado-dto';
import Swal from 'sweetalert2';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { LenguajeService } from '../../services/lenguaje.service';

@Component({
  selector: 'app-registrar-recuerdo-audio',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './registrar-recuerdo-audio.html',
  styleUrl: './registrar-recuerdo-audio.css',
})
export class RegistrarRecuerdoAudio implements OnInit, OnDestroy {
  nombreUsuario = '';
  userId: number | null = null;
  cargando = false;
  estaGrabando = false;
  fotoPerfil: string | null = null;

  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];
  audioUrl = '';
  esSimulado = false;

  nuevoRecuerdo: RecuerdoLlamadoDTO = {
    idAdultoMayor: 0,
    tituloRecuerdo: '',
    tipoRecuerdo: 'AUDIO',
    contenido: '',
    formato: 'wav',
  };

  constructor(
    private usuarioService: UsuarioService,
    private recuerdoService: RecuerdoService,
    private lenguajeService: LenguajeService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    if (!this.usuarioService.estaLogueado()) {
      this.router.navigate(['/iniciar-sesion']);
      return;
    }

    this.userId = this.usuarioService.obtenerUserId();
    this.nombreUsuario = this.usuarioService.obtenerNombreCompleto() || 'Usuario';
    this.fotoPerfil = this.usuarioService.obtenerFotoPerfil();

    if (this.userId) {
      this.nuevoRecuerdo.idAdultoMayor = this.userId;
    }
  }

  ngOnDestroy() {
    this.detenerGrabacionSilenciosa();
  }

  iniciarGrabacion() {
    this.audioChunks = [];
    this.audioUrl = '';
    this.nuevoRecuerdo.contenido = '';
    this.esSimulado = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      console.warn('Acceso al micrófono no soportado en este entorno. Iniciando simulación.');
      this.iniciarSimulacionGrabacion();
      return;
    }

    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        this.estaGrabando = true;
        this.mediaRecorder = new MediaRecorder(stream);

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
          this.audioUrl = URL.createObjectURL(audioBlob);

          const reader = new FileReader();
          reader.onloadend = () => {
            this.nuevoRecuerdo.contenido = reader.result as string;
            this.cdr.detectChanges();
          };
          reader.readAsDataURL(audioBlob);

          stream.getTracks().forEach((track) => track.stop());
          this.cdr.detectChanges();
        };

        this.mediaRecorder.start();
        this.cdr.detectChanges();
      })
      .catch((err) => {
        console.error('Acceso denegado o error de hardware, iniciando simulación:', err);
        this.iniciarSimulacionGrabacion();
      });
  }

  iniciarSimulacionGrabacion() {
    this.estaGrabando = true;
    this.esSimulado = true;
    this.cdr.detectChanges();
  }

  detenerSimulacionGrabacion() {
    this.estaGrabando = false;
    const wavSilencioBase64 =
      'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA';
    this.audioUrl = wavSilencioBase64;
    this.nuevoRecuerdo.contenido = wavSilencioBase64;
    this.cdr.detectChanges();
  }

  detenerGrabacion() {
    if (this.esSimulado) {
      this.detenerSimulacionGrabacion();
      return;
    }

    if (this.mediaRecorder && this.estaGrabando) {
      this.mediaRecorder.stop();
      this.estaGrabando = false;
      this.cdr.detectChanges();
    }
  }

  alternarGrabacion() {
    if (this.estaGrabando) {
      this.detenerGrabacion();
    } else {
      this.iniciarGrabacion();
    }
  }

  borrarGrabacion() {
    this.audioUrl = '';
    this.nuevoRecuerdo.contenido = '';
    this.detenerGrabacionSilenciosa();
    this.cdr.detectChanges();
  }

  detenerGrabacionSilenciosa() {
    if (this.esSimulado) {
      this.estaGrabando = false;
      return;
    }

    if (this.mediaRecorder && this.estaGrabando) {
      try {
        this.mediaRecorder.stop();
      } catch (e) {}
      this.estaGrabando = false;
    }
  }

  guardarRecuerdo() {
    if (!this.nuevoRecuerdo.tituloRecuerdo || !this.nuevoRecuerdo.contenido) {
      Swal.fire(
        this.lenguajeService.translate('REC_TEXTO.CAMPOS_VACIOS_TITLE'),
        this.lenguajeService.translate('REC_AUDIO.CAMPOS_VACIOS_DESC'),
        'warning',
      );
      return;
    }

    this.cargando = true;

    this.recuerdoService.crearRecuerdoAudio(this.nuevoRecuerdo).subscribe({
      next: () => {
        this.cargando = false;
        Swal.fire({
          title: this.lenguajeService.translate('REC_AUDIO.SAVE_SUCCESS_TITLE'),
          text: this.lenguajeService.translate('REC_AUDIO.SAVE_SUCCESS_DESC'),
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });

        this.router.navigate(['/ver-recuerdos']);
      },
      error: (err) => {
        this.cargando = false;
        console.error('Error al guardar recuerdo de audio:', err);
        Swal.fire(
          this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
          this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_DESC'),
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
