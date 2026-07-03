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
  selector: 'app-registrar-recuerdo-foto',
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
  templateUrl: './registrar-recuerdo-foto.html',
  styleUrl: './registrar-recuerdo-foto.css',
})
export class RegistrarRecuerdoFoto implements OnInit, OnDestroy {
  nombreUsuario = '';
  userId: number | null = null;
  cargando = false;
  fotoMockUrl = '';
  fotoPerfil: string | null = null;

  // Estados de cámara
  usandoCamara = false;
  stream: MediaStream | null = null;
  camaraError = '';

  nuevoRecuerdo: RecuerdoLlamadoDTO = {
    idAdultoMayor: 0,
    tituloRecuerdo: '',
    tipoRecuerdo: 'FOTO',
    contenido: '', // Almacenará la URL final de la imagen
    formato: 'png', // Formato por defecto aceptado por el Backend ("png", "jpg", "webp")
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
    this.detenerCamara();
  }

  obtenerUrlImagenMemoria(titulo: string): string {
    const pools = [
      'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800', // Almuerzo familiar feliz
      'https://images.unsplash.com/photo-1516627145497-ae6968895b74?w=800', // Abuelos sonriendo con nietos
      'https://images.unsplash.com/photo-1489710437720-ebb67ec84dd2?w=800', // Niños felices jugando en la playa
      'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=800', // Familia unida y feliz en el campo
      'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800', // Abuela sosteniendo la mano de su nieto
      'https://images.unsplash.com/photo-1472289065668-ce650ac443d2?w=800', // Momentos familiares nostálgicos
      'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=800', // Diario antiguo de memorias escritas
    ];

    let sum = 0;
    for (let i = 0; i < titulo.length; i++) {
      sum += titulo.charCodeAt(i);
    }
    return pools[sum % pools.length];
  }

  iniciarCamara() {
    this.usandoCamara = true;
    this.camaraError = '';
    this.cdr.detectChanges(); // Forzar actualización visual para mostrar preview

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user' } })
      .then((stream) => {
        this.stream = stream;
        const videoElement = document.getElementById('camera-preview') as HTMLVideoElement;
        if (videoElement) {
          videoElement.srcObject = stream;
          videoElement.play();
        }
        this.cdr.detectChanges(); // Forzar render
      })
      .catch((err) => {
        console.error('Error al acceder a la cámara:', err);
        this.camaraError =
          'No se pudo acceder a la cámara. Asegúrate de otorgar los permisos en tu navegador.';
        this.usandoCamara = false;
        this.cdr.detectChanges();
        Swal.fire({
          title: this.lenguajeService.translate('REC_FOTO.CAMERA_ERROR_TITLE'),
          text: this.lenguajeService.translate('REC_FOTO.CAMERA_ERROR_DESC'),
          icon: 'error',
        });
      });
  }

  capturarFoto() {
    if (this.stream) {
      const videoElement = document.getElementById('camera-preview') as HTMLVideoElement;
      const canvas = document.createElement('canvas');

      if (videoElement) {
        canvas.width = videoElement.videoWidth || 640;
        canvas.height = videoElement.videoHeight || 480;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

          const dataUrl = canvas.toDataURL('image/png');
          this.fotoMockUrl = dataUrl; // Preview local en Base64
          this.nuevoRecuerdo.formato = 'png';
        }
      }

      this.detenerCamara();
      this.cdr.detectChanges(); // Forzar cambio a vista previa Polaroid
    }
  }

  detenerCamara() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    this.usandoCamara = false;
    this.cdr.detectChanges();
  }

  // --- MÉTODOS DE ARCHIVO UPLOAD ---
  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        Swal.fire(
          this.lenguajeService.translate('REC_FOTO.INVALID_FORMAT_TITLE'),
          this.lenguajeService.translate('REC_FOTO.INVALID_FORMAT_DESC'),
          'error',
        );
        return;
      }

      // Extraer extensión compatible con Backend
      let extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'jpeg') {
        extension = 'jpg';
      }

      if (extension && ['jpg', 'png', 'webp'].includes(extension)) {
        this.nuevoRecuerdo.formato = extension;
      } else {
        this.nuevoRecuerdo.formato = 'png';
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        const dataUrl = e.target.result;
        this.fotoMockUrl = dataUrl; // Preview local en Base64
        this.cdr.detectChanges(); // Forzar repintado inmediato para que se renderice el Polaroid sin demoras
      };
      reader.readAsDataURL(file);
    }
  }

  cambiarFoto() {
    this.fotoMockUrl = '';
    this.nuevoRecuerdo.contenido = '';
    this.nuevoRecuerdo.formato = 'png';
    this.detenerCamara();
    this.cdr.detectChanges();
  }

  // --- GUARDADO ---
  guardarRecuerdo() {
    if (!this.nuevoRecuerdo.tituloRecuerdo || !this.fotoMockUrl) {
      Swal.fire(
        this.lenguajeService.translate('REC_TEXTO.CAMPOS_VACIOS_TITLE'),
        this.lenguajeService.translate('REC_FOTO.CAMPOS_VACIOS_DESC'),
        'warning',
      );
      return;
    }

    this.cargando = true;
    this.cdr.detectChanges();

    // Asignar la imagen Base64 capturada/cargada para que el backend la suba automáticamente a Cloudinary y guarde la URL segura
    this.nuevoRecuerdo.contenido = this.fotoMockUrl;

    this.recuerdoService.crearRecuerdoFoto(this.nuevoRecuerdo).subscribe({
      next: () => {
        this.cargando = false;
        this.cdr.detectChanges();
        Swal.fire({
          title: this.lenguajeService.translate('REC_FOTO.SAVE_SUCCESS_TITLE'),
          text: this.lenguajeService.translate('REC_FOTO.SAVE_SUCCESS_DESC'),
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });

        // Redirigir a bitácora de recuerdos
        this.router.navigate(['/ver-recuerdos']);
      },
      error: (err) => {
        this.cargando = false;
        this.cdr.detectChanges();
        console.error('Error al guardar recuerdo de foto:', err);
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
