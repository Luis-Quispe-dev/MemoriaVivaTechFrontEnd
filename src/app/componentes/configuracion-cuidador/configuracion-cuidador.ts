import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { UsuarioService } from '../../services/usuario-service';
import { ConfiguracionService } from '../../services/configuracion-service';
import { LenguajeService } from '../../services/lenguaje.service';
import { TranslatePipe } from '@ngx-translate/core';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-configuracion-cuidador',
  imports: [CommonModule, RouterModule, ReactiveFormsModule, TranslatePipe],
  templateUrl: './configuracion-cuidador.html',
  styleUrl: './configuracion-cuidador.css',
})
export class ConfiguracionCuidador implements OnInit {
  nombreUsuario = '';
  userId: number | null = null;
  fotoPerfil: string | null = null;
  cargando = false;

  private usuarioService = inject(UsuarioService);
  private configuracionService = inject(ConfiguracionService);
  private lenguajeService = inject(LenguajeService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);

  configForm = this.fb.group({
    idioma: ['Español'],
    tamanioFuente: ['Normal'],
    temaVisual: ['Claro'],
    notificacionesSonido: ['Activadas'],
  });

  ngOnInit() {
    if (!this.usuarioService.estaLogueado()) {
      this.router.navigate(['/iniciar-sesion']);
      return;
    }

    this.userId = this.usuarioService.obtenerUserId();
    this.nombreUsuario = this.usuarioService.obtenerNombreCompleto() || 'Usuario Cuidador';
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

          const idioma = res.idioma || idiomaLocal;
          const tema = res.temaVisual || temaLocal;

          let fuente = res.tamanioFuente || fuenteLocal;
          if (fuente === 'Mediano') {
            fuente = 'Normal';
          }
          const notif = res.notificacionesSonido !== false ? 'Activadas' : 'Desactivadas';

          this.configForm.patchValue({
            idioma: idioma,
            temaVisual: tema,
            tamanioFuente: fuente,
            notificacionesSonido: notif,
          });

          localStorage.setItem('soulstory_theme', tema);
          localStorage.setItem('soulstory_font_size', fuente);
          this.lenguajeService.establecerIdioma(idioma);
          this.aplicarAjustesVisuales(tema, fuente);
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

        this.configForm.patchValue({
          temaVisual: temaLocal,
          tamanioFuente: fuenteLocal,
          idioma: idiomaLocal,
          notificacionesSonido: 'Activadas',
        });

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

    const rawVal = this.configForm.getRawValue();

    const dto = {
      idUsuario: this.userId,
      idioma: rawVal.idioma || 'Español',
      tamanioFuente: rawVal.tamanioFuente || 'Normal',
      temaVisual: rawVal.temaVisual || 'Claro',
      notificacionesSonido: rawVal.notificacionesSonido === 'Activadas',
    };

    this.configuracionService.guardarConfiguracion(dto).subscribe({
      next: (res) => {
        this.cargando = false;
        this.cdr.detectChanges();

        localStorage.setItem('soulstory_theme', dto.temaVisual);
        localStorage.setItem('soulstory_font_size', dto.tamanioFuente);
        this.lenguajeService.establecerIdioma(dto.idioma);
        this.aplicarAjustesVisuales(dto.temaVisual, dto.tamanioFuente);

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
        console.error('Error al guardar la configuración del cuidador:', err);
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
