import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../services/usuario-service';
import { ConfiguracionService } from '../../services/configuracion-service';
import { LenguajeService } from '../../services/lenguaje.service';
import { TranslatePipe } from '@ngx-translate/core';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-configuracion-adulto-mayor',
  imports: [CommonModule, RouterModule, FormsModule, TranslatePipe],
  templateUrl: './configuracion-adulto-mayor.html',
  styleUrl: './configuracion-adulto-mayor.css',
})
export class ConfiguracionAdultoMayor implements OnInit {
  nombreUsuario = '';
  userId: number | null = null;
  fotoPerfil: string | null = null;

  configuracion = {
    idioma: 'Español',
    tamanioFuente: 'Normal',
    temaVisual: 'Claro',
    notificacionesSonido: true,
  };

  cargando = false;

  constructor(
    private usuarioService: UsuarioService,
    private configuracionService: ConfiguracionService,
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
    this.nombreUsuario = this.usuarioService.obtenerNombreCompleto() || 'Luis Lee';
    this.fotoPerfil = this.usuarioService.obtenerFotoPerfil();

    if (this.userId) {
      this.cargarConfiguracion();
    }
  }

  cargarConfiguracion() {
    if (!this.userId) return;
    this.cargando = true;
    this.cdr.detectChanges();

    this.configuracionService.obtenerConfiguracionUsuario(this.userId).subscribe({
      next: (res) => {
        if (res) {
          const idiomaLocal = localStorage.getItem('soulstory_lang') || 'Español';
          const temaLocal = localStorage.getItem('soulstory_theme') || 'Claro';
          const fuenteLocal = localStorage.getItem('soulstory_font_size') || 'Normal';

          this.configuracion.idioma = res.idioma || idiomaLocal;
          this.configuracion.temaVisual = res.temaVisual || temaLocal;

          let fuente = res.tamanioFuente || fuenteLocal;
          if (fuente === 'Mediano') {
            fuente = 'Normal';
          }
          this.configuracion.tamanioFuente = fuente;
          this.configuracion.notificacionesSonido = res.notificacionesSonido !== false;

          localStorage.setItem('soulstory_theme', this.configuracion.temaVisual);
          localStorage.setItem('soulstory_font_size', this.configuracion.tamanioFuente);
          this.lenguajeService.establecerIdioma(this.configuracion.idioma);
          this.aplicarAjustesVisuales(
            this.configuracion.temaVisual,
            this.configuracion.tamanioFuente,
          );
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn(
          'No se encontró configuración previa en el servidor, usando valores locales.',
          err,
        );
        const temaLocal = localStorage.getItem('soulstory_theme') || 'Claro';
        const fuenteLocal = localStorage.getItem('soulstory_font_size') || 'Normal';
        const idiomaLocal = localStorage.getItem('soulstory_lang') || 'Español';
        this.configuracion.temaVisual = temaLocal;
        this.configuracion.tamanioFuente = fuenteLocal;
        this.configuracion.idioma = idiomaLocal;
        this.lenguajeService.establecerIdioma(idiomaLocal);
        this.aplicarAjustesVisuales(temaLocal, fuenteLocal);

        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  guardarCambios() {
    if (!this.userId) return;
    this.cargando = true;
    this.cdr.detectChanges();

    const dto = {
      idUsuario: this.userId,
      idioma: this.configuracion.idioma,
      tamanioFuente: this.configuracion.tamanioFuente,
      temaVisual: this.configuracion.temaVisual,
      notificacionesSonido: this.configuracion.notificacionesSonido,
    };

    this.configuracionService.guardarConfiguracion(dto).subscribe({
      next: (res) => {
        this.cargando = false;
        this.cdr.detectChanges();

        localStorage.setItem('soulstory_theme', this.configuracion.temaVisual);
        localStorage.setItem('soulstory_font_size', this.configuracion.tamanioFuente);
        this.lenguajeService.establecerIdioma(this.configuracion.idioma);
        this.aplicarAjustesVisuales(
          this.configuracion.temaVisual,
          this.configuracion.tamanioFuente,
        );

        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true,
          icon: 'success',
          title: this.lenguajeService.translate('CONF.GUARDAR'),
          text: this.lenguajeService.translate('CONF.SAVE_SUCCESS_DESC'),
        });
      },
      error: (err) => {
        this.cargando = false;
        this.cdr.detectChanges();
        console.error('Error al guardar la configuración:', err);
        Swal.fire(
          this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
          this.lenguajeService.translate('CONF.SAVE_ERROR_DESC'),
          'error',
        );
      },
    });
  }

  private aplicarAjustesVisuales(tema: string, fuente: string) {
    const body = document.body;
    body.classList.remove('dark-theme', 'high-contrast-theme');
    if (tema === 'Oscuro') {
      body.classList.add('dark-theme');
    } else if (tema === 'Alto Contraste') {
      body.classList.add('high-contrast-theme');
    }

    const htmlEl = document.documentElement;
    if (fuente === 'Normal') {
      htmlEl.style.fontSize = '100%';
    } else if (fuente === 'Grande') {
      htmlEl.style.fontSize = '120%';
    } else if (fuente === 'Gigante') {
      htmlEl.style.fontSize = '140%';
    }
  }

  cerrarSesion() {
    this.usuarioService.cerrarSesion();
    this.router.navigate(['/iniciar-sesion']);
  }
}
