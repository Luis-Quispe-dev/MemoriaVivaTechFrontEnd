import { Component, OnInit } from '@angular/core';
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
  selector: 'app-registrar-recuerdo-texto',
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
  templateUrl: './registrar-recuerdo-texto.html',
  styleUrl: './registrar-recuerdo-texto.css',
})
export class RegistrarRecuerdoTexto implements OnInit {
  nombreUsuario = '';
  userId: number | null = null;
  cargando = false;
  fotoPerfil: string | null = null;

  nuevoRecuerdo: RecuerdoLlamadoDTO = {
    idAdultoMayor: 0,
    tituloRecuerdo: '',
    tipoRecuerdo: 'TEXTO',
    contenido: '',
    formato: 'texto/plano',
  };

  constructor(
    private usuarioService: UsuarioService,
    private recuerdoService: RecuerdoService,
    private lenguajeService: LenguajeService,
    private router: Router,
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

  guardarRecuerdo() {
    if (!this.nuevoRecuerdo.tituloRecuerdo || !this.nuevoRecuerdo.contenido) {
      Swal.fire(
        this.lenguajeService.translate('REC_TEXTO.CAMPOS_VACIOS_TITLE'),
        this.lenguajeService.translate('REC_TEXTO.CAMPOS_VACIOS_DESC'),
        'warning',
      );
      return;
    }

    this.cargando = true;

    this.recuerdoService.crearRecuerdoTexto(this.nuevoRecuerdo).subscribe({
      next: () => {
        this.cargando = false;
        Swal.fire({
          title: this.lenguajeService.translate('REC_TEXTO.SAVE_SUCCESS_TITLE'),
          text: this.lenguajeService.translate('REC_TEXTO.SAVE_SUCCESS_DESC'),
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });

        this.router.navigate(['/ver-recuerdos']);
      },
      error: (err) => {
        this.cargando = false;
        console.error('Error al guardar recuerdo:', err);
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
