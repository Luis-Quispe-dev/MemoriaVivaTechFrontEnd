import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../services/usuario-service';
import { RecuerdoService } from '../../services/recuerdo-service';
import { RecuerdoRespondeDTO } from '../../model/recuerdo-responde-dto';
import Swal from 'sweetalert2';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { TranslatePipe } from '@ngx-translate/core';
import { LenguajeService } from '../../services/lenguaje.service';

@Component({
  selector: 'app-mi-legado',
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
  templateUrl: './mi-legado.html',
  styleUrl: './mi-legado.css',
})
export class MiLegado implements OnInit {
  nombreUsuario = '';
  userId: number | null = null;
  cargando = false;
  recuerdos: RecuerdoRespondeDTO[] = [];
  codigoVerificado = false;
  codigoInput = '';
  fotoPerfil: string | null = null;

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
      this.cargarRecuerdos();
    }
  }

  cargarRecuerdos() {
    if (!this.userId) return;
    this.cargando = true;

    this.recuerdoService.obtenerMiLegado(this.userId).subscribe({
      next: (data) => {
        // En mi-legado solo cargamos favoritos reales desde el backend
        this.recuerdos = (data || []).map((r: any) => {
          r.esFavorito = true; // Por definición ya vienen filtrados por favoritos
          return r;
        });
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar recuerdos favoritos:', err);
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  toggleFavorito(recuerdo: any) {
    this.recuerdoService.toggleFavorito(recuerdo.idRecuerdo).subscribe({
      next: (updated: any) => {
        // Quitar al instante de la lista local
        this.recuerdos = this.recuerdos.filter((r) => r.idRecuerdo !== recuerdo.idRecuerdo);
        this.cdr.detectChanges();

        Swal.fire({
          title: this.lenguajeService.translate('RECUERDOS.FAV_REM_TITLE'),
          text: this.lenguajeService.translate('RECUERDOS.FAV_REM_DESC') + recuerdo.tituloRecuerdo,
          timer: 2000,
          showConfirmButton: false,
          position: 'top-end',
          toast: true,
        });
      },
      error: (err) => {
        console.error('Error al quitar favorito:', err);
      },
    });
  }

  exportarLegado(recuerdo: RecuerdoRespondeDTO) {
    this.recuerdoService.exportarRecuerdo(recuerdo.idRecuerdo).subscribe({
      next: (exportData) => {
        Swal.fire({
          title: this.lenguajeService.translate('LEGADO.EXPORT_TITLE'),
          html: `<div style="text-align: left; padding: 10px; border: 1px solid rgba(0,0,0,0.08); border-radius: 12px; background: #ffffff; color: #333333;">
                   <h3 style="color: #ef4444;">${exportData.tituloRecuerdo || recuerdo.tituloRecuerdo}</h3>
                   <p style="font-size: 0.8rem; color: #777777; margin-top: 5px;">${this.lenguajeService.translate('LEGADO.EXPORT_TYPE')}: ${exportData.tipoRecuerdo || recuerdo.tipoRecuerdo} | ${this.lenguajeService.translate('LEGADO.EXPORT_SUBTITLE')}</p>
                   <hr style="border-color: rgba(0,0,0,0.05); margin: 10px 0;">
                   <p style="white-space: pre-wrap; font-family: monospace; font-size: 0.95rem;">${exportData.contenido || recuerdo.contenido}</p>
                 </div>`,
          confirmButtonText: this.lenguajeService.translate('LEGADO.EXPORT_DOWNLOAD'),
          confirmButtonColor: '#ef4444',
        });
      },
      error: (err) => {
        console.error('Error al exportar recuerdo:', err);
        Swal.fire(
          this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
          this.lenguajeService.translate('LEGADO.EXPORT_ERROR_DESC'),
          'error',
        );
      },
    });
  }

  verificarCodigo() {
    if (this.codigoInput.trim() === '123456') {
      this.codigoVerificado = true;
      this.cdr.detectChanges();
      Swal.fire({
        title: this.lenguajeService.translate('LEGADO.VERIFY_SUCCESS_TITLE'),
        text: this.lenguajeService.translate('LEGADO.VERIFY_SUCCESS_DESC'),
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });
    } else {
      Swal.fire({
        title: this.lenguajeService.translate('LEGADO.VERIFY_ERROR_TITLE'),
        text: this.lenguajeService.translate('LEGADO.VERIFY_ERROR_DESC'),
        icon: 'error',
        confirmButtonText: this.lenguajeService.translate('BOTON.ENTENDIDO'),
        confirmButtonColor: '#6200ea',
      });
    }
  }

  cerrarSesion() {
    this.usuarioService.cerrarSesion();
    this.router.navigate(['/iniciar-sesion']);
  }
}
