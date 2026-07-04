import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../services/usuario-service';
import { RecuerdoService } from '../../services/recuerdo-service';
import { GaleriaIARespondeDTO } from '../../model/galeria-ia-responde-dto';
import { GaleriaIALlamadoDTO } from '../../model/galeria-ia-llamado-dto';
import { GaleriaIAGenerarLlamadoDTO } from '../../model/galeria-ia-generar-llamado-dto';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { TranslatePipe } from '@ngx-translate/core';
import { LenguajeService } from '../../services/lenguaje.service';
import {GaleriaIaService} from '../../services/galeria-ia-services';

import Swal from 'sweetalert2';

@Component({
  selector: 'app-galeria-ia',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    TranslatePipe
  ],
  templateUrl: './galeria-ia.html',
  styleUrl: './galeria-ia.css',
})
export class GaleriaIa implements OnInit {
  nombreUsuario = '';
  userId: number | null = null;
  cargando = false;
  fotoPerfil: string | null = null;

  // Lista de retratos del Adulto Mayor
  retratos: GaleriaIARespondeDTO[] = [];

  // Estados del generador IA
  mostrarFormularioGenerador = false;
  generando = false;
  guardando = false;
  prompt = '';
  tituloRetrato = '';
  imagenGeneradaUrl = '';
  retratoSeleccionado: GaleriaIARespondeDTO | null = null;

  private usuarioService = inject(UsuarioService);
  private recuerdoService = inject(RecuerdoService);
  private galeriaIaService = inject(GaleriaIaService);
  private lenguajeService = inject(LenguajeService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    if (!this.usuarioService.estaLogueado()) {
      this.router.navigate(['/iniciar-sesion']);
      return;
    }

    this.userId = this.usuarioService.obtenerUserId();
    this.nombreUsuario = this.usuarioService.obtenerNombreCompleto() || 'Usuario';
    this.fotoPerfil = this.usuarioService.obtenerFotoPerfil();

    if (this.userId) {
      this.cargarGaleria();
    }
  }

  cargarGaleria() {
    if (!this.userId) return;
    this.cargando = true;
    this.cdr.detectChanges();

    this.galeriaIaService.obtenerGaleria(this.userId).subscribe({
      next: (data) => {
        this.retratos = data || [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Error al cargar galería de imágenes:", err);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  // --- MÉTODOS DE GENERADOR IA (INTEGRACIÓN NATIVA CON BACKEND) ---
  generarIlustracion() {
    if (!this.prompt.trim()) {
      Swal.fire(
        this.lenguajeService.translate('GALERIA.EMPTY_PROMPT_TITLE'),
        this.lenguajeService.translate('GALERIA.EMPTY_PROMPT_DESC'),
        'warning'
      );
      return;
    }

    this.generando = true;
    this.imagenGeneradaUrl = '';
    this.cdr.detectChanges();

    const dto: GaleriaIAGenerarLlamadoDTO = {
      promptDescripcion: this.prompt
    };

    this.galeriaIaService.generarImagen(dto).subscribe({
      next: (res) => {
        this.generando = false;
        this.imagenGeneradaUrl = res.urlImagen; // Obtiene la URL de Cloudinary
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.generando = false;
        this.cdr.detectChanges();
        console.error("Error al generar imagen de IA:", err);
        Swal.fire(
          this.lenguajeService.translate('GALERIA.IA_ERROR_TITLE'),
          this.lenguajeService.translate('GALERIA.IA_ERROR_DESC'),
          'error'
        );
      }
    });
  }

  guardarIlustracion() {
    if (!this.userId || !this.imagenGeneradaUrl || !this.tituloRetrato.trim()) {
      Swal.fire(
        this.lenguajeService.translate('GALERIA.CAMPOS_VACIOS_TITLE'),
        this.lenguajeService.translate('GALERIA.CAMPOS_VACIOS_DESC'),
        'warning'
      );
      return;
    }

    this.guardando = true;
    this.cdr.detectChanges();

    const dto: GaleriaIALlamadoDTO = {
      idAdultoMayor: this.userId,
      promptDescripcion: this.prompt,
      titulo: this.tituloRetrato
    };

    this.galeriaIaService.guardarImagen(dto, this.imagenGeneradaUrl).subscribe({
      next: () => {
        this.guardando = false;
        this.mostrarFormularioGenerador = false;
        this.prompt = '';
        this.tituloRetrato = '';
        this.imagenGeneradaUrl = '';

        Swal.fire({
          title: this.lenguajeService.translate('GALERIA.SAVE_SUCCESS_TITLE'),
          text: this.lenguajeService.translate('GALERIA.SAVE_SUCCESS_DESC'),
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });

        this.cargarGaleria();
      },
      error: (err) => {
        this.guardando = false;
        this.cdr.detectChanges();
        console.error("Error al guardar retrato:", err);
        Swal.fire(
          this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
          this.lenguajeService.translate('GALERIA.SAVE_ERROR_DESC'),
          'error'
        );
      }
    });
  }

  eliminarRetrato(idRetratoIa: number) {
    Swal.fire({
      title: this.lenguajeService.translate('GALERIA.DELETE_CONFIRM_TITLE'),
      text: this.lenguajeService.translate('GALERIA.DELETE_CONFIRM_DESC'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.lenguajeService.translate('GALERIA.DELETE_CONFIRM_YES'),
      cancelButtonText: this.lenguajeService.translate('BOTON.CANCELAR')
    }).then((result) => {
      if (result.isConfirmed) {
        this.galeriaIaService.borrarImagen(idRetratoIa).subscribe({
          next: () => {
            Swal.fire(
              this.lenguajeService.translate('GALERIA.DELETE_SUCCESS_TITLE'),
              this.lenguajeService.translate('GALERIA.DELETE_SUCCESS_DESC'),
              'success'
            );
            this.cargarGaleria();
          },
          error: (err) => {
            console.error("Error al borrar retrato:", err);
            Swal.fire(
              this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
              this.lenguajeService.translate('GALERIA.DELETE_ERROR_DESC'),
              'error'
            );
          }
        });
      }
    });
  }

  exportarLegado(retrato: GaleriaIARespondeDTO) {
    Swal.fire({
      title: this.lenguajeService.translate('GALERIA.EXPORT_TITLE'),
      html: `<div style="text-align: left; padding: 10px; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; background: #ffffff; color: #333333;">
               <h3 style="color: #6200ea;">${retrato.titulo}</h3>
               <p style="font-size: 0.8rem; color: #777777; margin-top: 5px;">${this.lenguajeService.translate('GALERIA.EXPORT_SUBTITLE')}</p>
               <hr style="border-color: rgba(0,0,0,0.05); margin: 10px 0;">
               <img src="${retrato.urlImagen}" style="width: 100%; border-radius: 8px; margin-bottom: 10px;">
               <p style="font-size: 0.95rem; font-style: italic; color: #5a6c7d;">"${this.lenguajeService.translate('GALERIA.IDEA_ORIGINAL')}: ${retrato.promptDescripcion}"</p>
             </div>`,
      confirmButtonText: this.lenguajeService.translate('GALERIA.EXPORT_DOWNLOAD'),
      confirmButtonColor: '#6200ea'
    });
  }

  compartirRetrato(retrato: GaleriaIARespondeDTO) {
    Swal.fire({
      title: this.lenguajeService.translate('GALERIA.COMPARTIR_CARGANDO') || 'Cargando enlaces...',
      didOpen: () => {
        Swal.showLoading();
      },
      allowOutsideClick: false,
      showConfirmButton: false
    });

    // Intentamos consumir el endpoint de exportar del backend
    this.recuerdoService.exportarRecuerdo(retrato.idRetratoIa).subscribe({
      next: (exportData) => {
        Swal.close();
        this.mostrarModalCompartir(
          retrato.titulo,
          retrato.urlImagen,
          exportData.linkWhatsapp || `https://api.whatsapp.com/send?text=${encodeURIComponent(retrato.titulo + ' ' + retrato.urlImagen)}`,
          exportData.linkFacebook || `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(retrato.urlImagen)}`,
          exportData.linkInstagram || `https://www.instagram.com/`
        );
      },
      error: (err) => {
        Swal.close();
        console.warn("Llamada al backend falló (id de retrato no es un id de recuerdo). Utilizando generación local de enlaces.", err);
        const linkWhatsapp = `https://api.whatsapp.com/send?text=${encodeURIComponent(retrato.titulo + ' ' + retrato.urlImagen)}`;
        const linkFacebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(retrato.urlImagen)}`;
        const linkInstagram = `https://www.instagram.com/`;

        this.mostrarModalCompartir(
          retrato.titulo,
          retrato.urlImagen,
          linkWhatsapp,
          linkFacebook,
          linkInstagram
        );
      }
    });
  }

  mostrarModalCompartir(titulo: string, url: string, linkWhatsapp: string, linkFacebook: string, linkInstagram: string) {
    Swal.fire({
      title: this.lenguajeService.translate('GALERIA.COMPARTIR_TITULO') || '📤 Compartir Retrato Familiar',
      html: `
        <div style="text-align: center; font-family: 'Segoe UI', system-ui, sans-serif; padding: 15px 0;">
          <h4 style="color: #6200ea; margin-bottom: 15px; font-weight: 700;">${titulo}</h4>
          <img src="${url}" style="width: 100%; max-width: 250px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">

          <div style="display: flex; justify-content: center; gap: 15px; margin-top: 15px;">
            <a href="${linkWhatsapp}" target="_blank" style="text-decoration: none; display: flex; flex-direction: column; align-items: center; color: #25d366; width: 80px;">
              <div style="width: 50px; height: 50px; border-radius: 50%; background: #e8faf0; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 5px; box-shadow: 0 4px 8px rgba(37, 211, 102, 0.15); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                <i class="fab fa-whatsapp"></i>
              </div>
              <span style="font-size: 0.8rem; font-weight: 600; color: #334155;">WhatsApp</span>
            </a>

            <a href="${linkFacebook}" target="_blank" style="text-decoration: none; display: flex; flex-direction: column; align-items: center; color: #1877f2; width: 80px;">
              <div style="width: 50px; height: 50px; border-radius: 50%; background: #e8f2fe; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 5px; box-shadow: 0 4px 8px rgba(24, 119, 242, 0.15); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                <i class="fab fa-facebook-f"></i>
              </div>
              <span style="font-size: 0.8rem; font-weight: 600; color: #334155;">Facebook</span>
            </a>

            <a href="${linkInstagram}" target="_blank" style="text-decoration: none; display: flex; flex-direction: column; align-items: center; color: #e1306c; width: 80px;">
              <div style="width: 50px; height: 50px; border-radius: 50%; background: #fdf2f8; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; margin-bottom: 5px; box-shadow: 0 4px 8px rgba(225, 48, 108, 0.15); transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                <i class="fab fa-instagram"></i>
              </div>
              <span style="font-size: 0.8rem; font-weight: 600; color: #334155;">Instagram</span>
            </a>
          </div>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true
    });
  }

  descargarImagen(url: string, titulo: string) {
    if (!url) return;

    Swal.fire({
      title: this.lenguajeService.translate('GALERIA.DESCARGANDO') || 'Descargando...',
      timer: 1000,
      showConfirmButton: false,
      position: 'top-end',
      toast: true
    });

    const nombreArchivo = `${titulo.toLowerCase().replace(/\s+/g, '-') || 'retrato-ia'}.png`;

    fetch(url, { mode: 'cors' })
      .then(response => {
        if (!response.ok) throw new Error('CORS restriction or network error');
        return response.blob();
      })
      .then(blob => {
        const localUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = localUrl;
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(localUrl);
      })
      .catch(err => {
        console.warn("Fallo descarga CORS. Utilizando fallback de descarga por navegador:", err);
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.download = nombreArchivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });
  }

  abrirPrevisualizacion(retrato: GaleriaIARespondeDTO) {
    this.retratoSeleccionado = retrato;
    this.cdr.detectChanges();
  }

  cerrarPrevisualizacion() {
    this.retratoSeleccionado = null;
    this.cdr.detectChanges();
  }

  cerrarSesion() {
    this.usuarioService.cerrarSesion();
    this.router.navigate(['/iniciar-sesion']);
  }
}
