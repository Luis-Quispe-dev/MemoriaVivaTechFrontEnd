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
    TranslatePipe,
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
        console.error('Error al cargar recuerdos:', err);

        setTimeout(() => {
          this.cargando = false;
          this.cdr.detectChanges();
        }, 1500);
      },
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
      temporal = temporal.filter((r) => r.tipoRecuerdo === this.filtroActual);
    } else if (this.filtroActual === 'FAVORITOS') {
      temporal = temporal.filter((r) => r.esFavorito);
    }

    if (this.busquedaQuery.trim()) {
      const query = this.busquedaQuery.toLowerCase().trim();
      temporal = temporal.filter(
        (r) =>
          r.tituloRecuerdo.toLowerCase().includes(query) ||
          r.contenido.toLowerCase().includes(query),
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
            text:
              this.lenguajeService.translate('RECUERDOS.FAV_ADD_DESC') + recuerdo.tituloRecuerdo,
            timer: 2000,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
        } else {
          Swal.fire({
            title: this.lenguajeService.translate('RECUERDOS.FAV_REM_TITLE'),
            text:
              this.lenguajeService.translate('RECUERDOS.FAV_REM_DESC') + recuerdo.tituloRecuerdo,
            timer: 2000,
            showConfirmButton: false,
            position: 'top-end',
            toast: true,
          });
        }
      },
      error: (err) => {
        console.error('Error al cambiar favorito:', err);
      },
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
      cancelButtonText: this.lenguajeService.translate('BOTON.CANCELAR'),
    }).then((result) => {
      if (result.isConfirmed) {
        this.recuerdoService.eliminarRecuerdo(id).subscribe({
          next: () => {
            Swal.fire(
              this.lenguajeService.translate('RECUERDOS.DELETE_SUCCESS_TITLE'),
              this.lenguajeService.translate('RECUERDOS.DELETE_SUCCESS_DESC'),
              'success',
            );
            this.cargarRecuerdos();
          },
          error: (err) => {
            console.error('Error al eliminar recuerdo:', err);
            Swal.fire(
              this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
              this.lenguajeService.translate('RECUERDOS.DELETE_ERROR_DESC'),
              'error',
            );
          },
        });
      }
    });
  }

  abrirEditarRecuerdoModal(recuerdo: RecuerdoRespondeDTO) {
    const titleLabel =
      this.lenguajeService.translate('RECUERDOS.EDITAR_TITULO_LABEL') || 'Título del recuerdo';
    const contentLabel =
      this.lenguajeService.translate('RECUERDOS.EDITAR_CONTENIDO_LABEL') || 'Contenido / Relato';
    const submitText = this.lenguajeService.translate('CONF.GUARDAR') || 'Guardar';
    const cancelText = this.lenguajeService.translate('BOTON.CANCELAR') || 'Cancelar';
    const modalTitle =
      this.lenguajeService.translate('RECUERDOS.EDITAR_MODAL_TITLE') || 'Editar Recuerdo';

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
        const nuevoTitulo = (
          document.getElementById('edit-recuerdo-titulo') as HTMLInputElement
        ).value.trim();
        const nuevoContenido = (
          document.getElementById('edit-recuerdo-contenido') as HTMLInputElement
        ).value.trim();

        if (!nuevoTitulo) {
          Swal.showValidationMessage(
            this.lenguajeService.translate('RECUERDOS.VALIDATION_TITLE_REQ') ||
              'El título es obligatorio.',
          );
          return false;
        }
        if (!nuevoContenido) {
          Swal.showValidationMessage(
            this.lenguajeService.translate('RECUERDOS.VALIDATION_CONTENT_REQ') ||
              'El contenido es obligatorio.',
          );
          return false;
        }

        return {
          idAdultoMayor: this.userId!,
          tituloRecuerdo: nuevoTitulo,
          tipoRecuerdo: recuerdo.tipoRecuerdo,
          contenido: nuevoContenido,
          formato: recuerdo.formato || '',
        };
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        Swal.showLoading();
        this.recuerdoService.editarRecuerdo(recuerdo.idRecuerdo, result.value).subscribe({
          next: (res) => {
            Swal.close();
            Swal.fire({
              icon: 'success',
              title:
                this.lenguajeService.translate('RECUERDOS.EDITAR_SUCCESS_TITLE') ||
                'Recuerdo Actualizado',
              text:
                this.lenguajeService.translate('RECUERDOS.EDITAR_SUCCESS_DESC') ||
                'El recuerdo ha sido modificado con éxito.',
              confirmButtonColor: '#10b981',
            });
            this.cargarRecuerdos();
          },
          error: (err) => {
            Swal.close();
            console.error('Error al editar recuerdo:', err);
            Swal.fire({
              icon: 'error',
              title: this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE') || 'Error',
              text:
                this.lenguajeService.translate('RECUERDOS.EDITAR_ERROR_DESC') ||
                'No se pudo guardar la modificación del recuerdo.',
              confirmButtonColor: '#10b981',
            });
          },
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
          confirmButtonText: 'Descargar e Imprimir.',
          confirmButtonColor: '#6200ea',
        });
      },
      error: (err) => {
        console.error('Error al exportar recuerdo:', err);
        Swal.fire(
          'Error',
          'No se pudo realizar la exportación del legado en este momento.',
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
