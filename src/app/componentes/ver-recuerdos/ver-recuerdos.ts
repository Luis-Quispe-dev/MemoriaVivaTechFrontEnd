import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../services/usuario-service';
import { RecuerdoService } from '../../services/recuerdo-service';
import { RecuerdoRespondeDTO } from '../../model/recuerdo-responde-dto';
import Swal from 'sweetalert2';
import { TranslatePipe } from '@ngx-translate/core';
import { LenguajeService } from '../../services/lenguaje.service';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-ver-recuerdos',
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
  templateUrl: './ver-recuerdos.html',
  styleUrl: './ver-recuerdos.css',
})
export class VerRecuerdos implements OnInit {
  nombreUsuario = '';
  userId: number | null = null;
  cargando = false;
  fotoPerfil: string | null = null;

  recuerdos: RecuerdoRespondeDTO[] = [];
  recuerdosFiltrados: RecuerdoRespondeDTO[] = [];
  filtroActual = 'TODOS';
  busquedaQuery = '';

  private usuarioService = inject(UsuarioService);
  private recuerdoService = inject(RecuerdoService);
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
      this.cargarRecuerdos();
    }
  }

  cargarRecuerdos() {
    if (!this.userId) {
      this.cargando = false;
      return;
    }
    this.cargando = true;
    this.cdr.detectChanges();

    this.recuerdoService.obtenerTodos(this.userId).subscribe({
      next: (data) => {
        this.recuerdos = (data || []).map((r: any) => {
          r.esFavorito = r.favorito === 'true' || r.favorito === true || r.esFavorito === true;
          return r;
        });
        this.aplicarFiltros();

        setTimeout(() => {
          this.cargando = false;
          this.cdr.detectChanges();
        }, 1500);
      },
      error: (err) => {
        console.error("Error al cargar recuerdos:", err);

        setTimeout(() => {
          this.cargando = false;
          this.cdr.detectChanges();
        }, 1500);
      }
    });
  }

  cambiarFiltro(filtro: string) {
    this.filtroActual = filtro;
    this.aplicarFiltros();
  }

  filtrarPorBusqueda() {
    this.aplicarFiltros();
  }

  aplicarFiltros() {
    let temporal = [...this.recuerdos];

    if (this.filtroActual !== 'TODOS' && this.filtroActual !== 'FAVORITOS') {
      temporal = temporal.filter(r => r.tipoRecuerdo === this.filtroActual);
    } else if (this.filtroActual === 'FAVORITOS') {
      temporal = temporal.filter(r => r.esFavorito);
    }

    if (this.busquedaQuery.trim()) {
      const query = this.busquedaQuery.toLowerCase().trim();
      temporal = temporal.filter(r =>
        r.tituloRecuerdo.toLowerCase().includes(query) ||
        r.contenido.toLowerCase().includes(query)
      );
    }

    this.recuerdosFiltrados = temporal;
    this.cdr.detectChanges();
  }

  toggleFavorito(recuerdo: any) {
    this.recuerdoService.toggleFavorito(recuerdo.idRecuerdo).subscribe({
      next: (updated: any) => {
        recuerdo.favorito = updated.favorito;
        recuerdo.esFavorito = updated.favorito === 'true' || updated.favorito === true;
        this.aplicarFiltros();

        if (recuerdo.esFavorito) {
          Swal.fire({
            title: this.lenguajeService.translate('RECUERDOS.FAV_ADD_TITLE'),
            text: this.lenguajeService.translate('RECUERDOS.FAV_ADD_DESC') + recuerdo.tituloRecuerdo,
            timer: 2000,
            showConfirmButton: false,
            position: 'top-end',
            toast: true
          });
        } else {
          Swal.fire({
            title: this.lenguajeService.translate('RECUERDOS.FAV_REM_TITLE'),
            text: this.lenguajeService.translate('RECUERDOS.FAV_REM_DESC') + recuerdo.tituloRecuerdo,
            timer: 2000,
            showConfirmButton: false,
            position: 'top-end',
            toast: true
          });
        }
      },
      error: (err) => {
        console.error("Error al cambiar favorito:", err);
      }
    });
  }

  eliminarRecuerdo(id: number) {
    Swal.fire({
      title: this.lenguajeService.translate('RECUERDOS.CONFIRM_DELETE_TITLE'),
      text: this.lenguajeService.translate('RECUERDOS.CONFIRM_DELETE_DESC'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ff007f',
      cancelButtonColor: '#3085d6',
      confirmButtonText: this.lenguajeService.translate('RECUERDOS.CONFIRM_DELETE_YES'),
      cancelButtonText: this.lenguajeService.translate('BOTON.CANCELAR')
    }).then((result) => {
      if (result.isConfirmed) {
        this.recuerdoService.eliminarRecuerdo(id).subscribe({
          next: () => {
            Swal.fire(
              this.lenguajeService.translate('RECUERDOS.DELETE_SUCCESS_TITLE'),
              this.lenguajeService.translate('RECUERDOS.DELETE_SUCCESS_DESC'),
              'success'
            );
            this.cargarRecuerdos();
          },
          error: (err) => {
            console.error("Error al eliminar recuerdo:", err);
            Swal.fire(
              this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
              this.lenguajeService.translate('RECUERDOS.DELETE_ERROR_DESC'),
              'error'
            );
          }
        });
      }
    });
  }

  abrirEditarRecuerdoModal(recuerdo: RecuerdoRespondeDTO) {
    const titleLabel = this.lenguajeService.translate('RECUERDOS.EDITAR_TITULO_LABEL') || 'Título del recuerdo';
    const contentLabel = this.lenguajeService.translate('RECUERDOS.EDITAR_CONTENIDO_LABEL') || 'Contenido / Relato';
    const submitText = this.lenguajeService.translate('CONF.GUARDAR') || 'Guardar';
    const cancelText = this.lenguajeService.translate('BOTON.CANCELAR') || 'Cancelar';
    const modalTitle = this.lenguajeService.translate('RECUERDOS.EDITAR_MODAL_TITLE') || 'Editar Recuerdo';

    let contentHtml = '';

    if (recuerdo.tipoRecuerdo === 'TEXTO') {
      contentHtml = `
        <div style="text-align: left; font-family: 'Segoe UI', system-ui, sans-serif; padding: 10px 0;">
          <div style="margin-bottom: 15px;">
            <label style="display: block; font-weight: 700; color: #475569; margin-bottom: 5px;">${titleLabel}</label>
            <input id="edit-recuerdo-titulo" type="text" class="swal2-input" value="${recuerdo.tituloRecuerdo}" style="margin: 0; width: 100%; box-sizing: border-box; border-radius: 8px;">
          </div>
          <div style="margin-bottom: 15px;">
            <label style="display: block; font-weight: 700; color: #475569; margin-bottom: 5px;">${contentLabel}</label>
            <textarea id="edit-recuerdo-contenido" class="swal2-textarea" style="margin: 0; width: 100%; height: 180px; box-sizing: border-box; border-radius: 8px; font-family: inherit;">${recuerdo.contenido}</textarea>
          </div>
        </div>
      `;
    } else {
      contentHtml = `
        <div style="text-align: left; font-family: 'Segoe UI', system-ui, sans-serif; padding: 10px 0;">
          <div style="margin-bottom: 15px;">
            <label style="display: block; font-weight: 700; color: #475569; margin-bottom: 5px;">${titleLabel}</label>
            <input id="edit-recuerdo-titulo" type="text" class="swal2-input" value="${recuerdo.tituloRecuerdo}" style="margin: 0; width: 100%; box-sizing: border-box; border-radius: 8px;">
          </div>
          <input id="edit-recuerdo-contenido" type="hidden" value="${recuerdo.contenido}">
        </div>
      `;
    }

    Swal.fire({
      title: modalTitle,
      html: contentHtml,
      showCancelButton: true,
      confirmButtonText: submitText,
      cancelButtonText: cancelText,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      focusConfirm: false,
      preConfirm: () => {
        const nuevoTitulo = (document.getElementById('edit-recuerdo-titulo') as HTMLInputElement).value.trim();
        const nuevoContenido = (document.getElementById('edit-recuerdo-contenido') as HTMLInputElement).value.trim();

        if (!nuevoTitulo) {
          Swal.showValidationMessage(this.lenguajeService.translate('RECUERDOS.VALIDATION_TITLE_REQ') || 'El título es obligatorio.');
          return false;
        }
        if (!nuevoContenido) {
          Swal.showValidationMessage(this.lenguajeService.translate('RECUERDOS.VALIDATION_CONTENT_REQ') || 'El contenido es obligatorio.');
          return false;
        }

        return {
          idAdultoMayor: this.userId!,
          tituloRecuerdo: nuevoTitulo,
          tipoRecuerdo: recuerdo.tipoRecuerdo,
          contenido: nuevoContenido,
          formato: recuerdo.formato || ''
        };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        Swal.showLoading();
        this.recuerdoService.editarRecuerdo(recuerdo.idRecuerdo, result.value).subscribe({
          next: (res) => {
            Swal.close();
            Swal.fire({
              icon: 'success',
              title: this.lenguajeService.translate('RECUERDOS.EDITAR_SUCCESS_TITLE') || 'Recuerdo Actualizado',
              text: this.lenguajeService.translate('RECUERDOS.EDITAR_SUCCESS_DESC') || 'El recuerdo ha sido modificado con éxito.',
              confirmButtonColor: '#10b981'
            });
            this.cargarRecuerdos();
          },
          error: (err) => {
            Swal.close();
            console.error("Error al editar recuerdo:", err);
            Swal.fire({
              icon: 'error',
              title: this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE') || 'Error',
              text: this.lenguajeService.translate('RECUERDOS.EDITAR_ERROR_DESC') || 'No se pudo guardar la modificación del recuerdo.',
              confirmButtonColor: '#10b981'
            });
          }
        });
      }
    });
  }

  exportarLegado(recuerdo: RecuerdoRespondeDTO) {
    this.recuerdoService.exportarRecuerdo(recuerdo.idRecuerdo).subscribe({
      next: (exportData) => {
        Swal.fire({
          title: '📖 Exportación de Legado',
          html: `<div style="text-align: left; padding: 10px; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; background: #ffffff; color: #333333;">
                   <h3 style="color: #6200ea;">${exportData.tituloRecuerdo || recuerdo.tituloRecuerdo}</h3>
                   <p style="font-size: 0.8rem; color: #777777; margin-top: 5px;">Tipo: ${exportData.tipoRecuerdo || recuerdo.tipoRecuerdo} | Legado Familiar</p>
                   <hr style="border-color: rgba(0,0,0,0.05); margin: 10px 0;">
                   <p style="white-space: pre-wrap; font-family: monospace; font-size: 0.95rem;">${exportData.contenido || recuerdo.contenido}</p>
                 </div>`,
          confirmButtonText: 'Descargar e Imprimir',
          confirmButtonColor: '#6200ea'
        });
      },
      error: (err) => {
        console.error("Error al exportar recuerdo:", err);
        Swal.fire('Error', 'No se pudo realizar la exportación del legado en este momento.', 'error');
      }
    });
  }

  descargarRecuerdo(recuerdo: RecuerdoRespondeDTO) {
    Swal.fire({
      title: this.lenguajeService.translate('GALERIA.DESCARGANDO') || 'Descargando...',
      timer: 1000,
      showConfirmButton: false,
      position: 'top-end',
      toast: true
    });

    const nombreArchivo = `${recuerdo.tituloRecuerdo.toLowerCase().replace(/\s+/g, '-') || 'recuerdo'}`;

    if (recuerdo.tipoRecuerdo === 'TEXTO') {
      const contenidoTexto = `==================================================
   SOULSTORY - LEGADO FAMILIAR Y RECUERDOS
==================================================
Título: ${recuerdo.tituloRecuerdo}
Fecha: ${recuerdo.fechaCreacion || 'No registrada'}
Tipo: Relato Escrito (Texto)
==================================================

${recuerdo.contenido}

==================================================
Guardado con amor en SoulStory.
Preservando la memoria viva de nuestra familia.
==================================================`;

      const blob = new Blob([contenidoTexto], { type: 'text/plain;charset=utf-8' });
      const localUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = localUrl;
      link.download = `${nombreArchivo}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(localUrl);
    } else {
      const url = recuerdo.contenido;
      let ext = 'png';
      if (recuerdo.tipoRecuerdo === 'AUDIO') {
        ext = 'mp3';
        if (url.includes('ogg') || url.includes('audio/ogg')) ext = 'ogg';
        else if (url.includes('wav')) ext = 'wav';
      } else {
        if (url.includes('jpeg') || url.includes('jpg')) ext = 'jpg';
        else if (url.includes('gif')) ext = 'gif';
      }

      fetch(url)
        .then(response => {
          if (!response.ok) throw new Error('CORS restriction or network error');
          return response.blob();
        })
        .then(blob => {
          const localUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = localUrl;
          link.download = `${nombreArchivo}.${ext}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(localUrl);
        })
        .catch(err => {
          console.warn("Fallo descarga directa de archivo, usando fallback de navegador:", err);
          const link = document.createElement('a');
          link.href = url;
          link.target = '_blank';
          link.download = `${nombreArchivo}.${ext}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        });
    }
  }

  compartirRecuerdo(recuerdo: RecuerdoRespondeDTO) {
    Swal.fire({
      title: this.lenguajeService.translate('GALERIA.COMPARTIR_CARGANDO') || 'Cargando enlaces...',
      didOpen: () => {
        Swal.showLoading();
      },
      allowOutsideClick: false,
      showConfirmButton: false
    });

    this.recuerdoService.exportarRecuerdo(recuerdo.idRecuerdo).subscribe({
      next: (exportData) => {
        Swal.close();
        this.mostrarModalCompartir(
          recuerdo.tituloRecuerdo,
          recuerdo.tipoRecuerdo,
          recuerdo.contenido,
          exportData.linkWhatsapp,
          exportData.linkFacebook,
          exportData.linkInstagram
        );
      },
      error: (err) => {
        Swal.close();
        console.error("Error al obtener enlaces del backend:", err);
        const textToShare = `${recuerdo.tituloRecuerdo}: ${recuerdo.tipoRecuerdo === 'TEXTO' ? recuerdo.contenido : ''}`;
        const linkWhatsapp = `https://api.whatsapp.com/send?text=${encodeURIComponent(textToShare)}`;
        const linkFacebook = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(recuerdo.tipoRecuerdo !== 'TEXTO' ? recuerdo.contenido : window.location.href)}`;
        const linkInstagram = `https://www.instagram.com/`;

        this.mostrarModalCompartir(
          recuerdo.tituloRecuerdo,
          recuerdo.tipoRecuerdo,
          recuerdo.contenido,
          linkWhatsapp,
          linkFacebook,
          linkInstagram
        );
      }
    });
  }

  mostrarModalCompartir(titulo: string, tipo: string, contenido: string, linkWhatsapp: string, linkFacebook: string, linkInstagram: string) {
    let previewHtml = '';

    if (tipo === 'FOTO') {
      previewHtml = `<img src="${contenido}" style="width: 100%; max-width: 250px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #e2e8f0;">`;
    } else if (tipo === 'AUDIO') {
      previewHtml = `
        <div style="background: #fff0f5; border: 1px solid #ffb3c6; border-radius: 12px; padding: 15px; margin-bottom: 20px; display: inline-block; width: 100%; max-width: 280px; box-sizing: border-box;">
          <i class="fas fa-microphone" style="font-size: 2rem; color: #ff007f; margin-bottom: 8px;"></i>
          <p style="margin: 0; font-size: 0.85rem; color: #ff007f; font-weight: 700;">Mensaje de voz / Audio</p>
        </div>
      `;
    } else {
      const truncContent = contenido.length > 100 ? contenido.substring(0, 97) + '...' : contenido;
      previewHtml = `
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; margin-bottom: 20px; text-align: left; font-family: monospace; font-size: 0.85rem; color: #334155;">
          <p style="margin: 0; white-space: pre-wrap;">"${truncContent}"</p>
        </div>
      `;
    }

    Swal.fire({
      title: this.lenguajeService.translate('GALERIA.COMPARTIR_TITULO') || '📤 Compartir Recuerdo Familiar',
      html: `
        <div style="text-align: center; font-family: 'Segoe UI', system-ui, sans-serif; padding: 15px 0;">
          <h4 style="color: #6200ea; margin-bottom: 15px; font-weight: 700;">${titulo}</h4>
          ${previewHtml}

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

  cerrarSesion() {
    this.usuarioService.cerrarSesion();
    this.router.navigate(['/iniciar-sesion']);
  }
}
