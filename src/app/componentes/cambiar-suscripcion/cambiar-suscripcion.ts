import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../services/usuario-service';
import { SuscripcionService } from '../../services/suscripcion-service';
import { TranslatePipe } from '@ngx-translate/core';
import Swal from 'sweetalert2';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-cambiar-suscripcion',
  imports: [CommonModule, RouterModule, FormsModule, MatCardModule, MatButtonModule, TranslatePipe],
  templateUrl: './cambiar-suscripcion.html',
  styleUrl: './cambiar-suscripcion.css',
})
export class CambiarSuscripcion implements OnInit {
  nombreUsuario = '';
  emailUsuario = '';
  fotoPerfil: string | null = null;
  userId: number | null = null;
  cargando = false;

  planes: any[] = [];
  suscripcionActiva: any = null;

  constructor(
    private usuarioService: UsuarioService,
    private suscripcionService: SuscripcionService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    if (!this.usuarioService.estaLogueado()) {
      this.router.navigate(['/iniciar-sesion']);
      return;
    }

    const roles = this.usuarioService.obtenerRoles();
    if (!roles.includes('ROLE_ADULTO_MAYOR')) {
      Swal.fire({
        icon: 'error',
        title: 'Acceso Denegado',
        text: 'Solo los adultos mayores pueden acceder a esta sección.',
        confirmButtonColor: '#166534',
      }).then(() => {
        this.router.navigate(['/iniciar-sesion']);
      });
      return;
    }

    this.userId = this.usuarioService.obtenerUserId();
    this.nombreUsuario = this.usuarioService.obtenerNombreCompleto() || 'Soul User';
    this.emailUsuario = this.usuarioService.obtenerEmail() || 'correo@ejemplo.com';
    this.fotoPerfil = this.usuarioService.obtenerFotoPerfil();

    if (this.userId) {
      this.cargarDatos();
    }
  }

  cargarDatos() {
    if (!this.userId) return;
    this.cargando = true;

    // Obtener la suscripción activa primero
    this.suscripcionService.obtenerSuscripcionActivaAdulto(this.userId).subscribe({
      next: (subRes) => {
        this.suscripcionActiva = subRes;
        this.cargarPlanes();
      },
      error: (err) => {
        console.warn('No se pudo obtener suscripción activa, listando planes igualmente:', err);
        this.suscripcionActiva = null;
        this.cargarPlanes();
      },
    });
  }

  cargarPlanes() {
    this.suscripcionService.listarPlanes().subscribe({
      next: (data) => {
        this.planes = data || [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar los planes:', err);
        this.cargando = false;
        Swal.fire('Error', 'No se pudieron cargar los planes disponibles.', 'error');
        this.cdr.detectChanges();
      },
    });
  }

  obtenerDetallesPlan(planNombre: string): string[] {
    if (planNombre === 'Libreta Familiar') {
      return ['SUB.FEAT_FREE_1', 'SUB.FEAT_FREE_2', 'SUB.FEAT_FREE_3', 'SUB.FEAT_FREE_4'];
    } else if (planNombre === 'Album Familiar') {
      return ['SUB.FEAT_ALBUM_1', 'SUB.FEAT_ALBUM_2', 'SUB.FEAT_ALBUM_3', 'SUB.FEAT_ALBUM_4'];
    } else if (planNombre === 'Biblioteca Familiar') {
      return ['SUB.FEAT_BIBLIO_1', 'SUB.FEAT_BIBLIO_2', 'SUB.FEAT_BIBLIO_3', 'SUB.FEAT_BIBLIO_4'];
    }
    return ['SUB.FEAT_FREE_2', 'SUB.FEAT_FREE_3'];
  }

  seleccionarPlan(plan: any) {
    if (this.suscripcionActiva && this.suscripcionActiva.nombrePlan === plan.nombrePlan) {
      Swal.fire('Plan Activo', `Ya posees el plan ${plan.nombrePlan} activo actualmente.`, 'info');
      return;
    }
    this.router.navigate(['/pago-suscripcion'], { queryParams: { idPlan: plan.idPlan } });
  }

  cerrarSesion() {
    this.usuarioService.cerrarSesion();
    this.router.navigate(['/iniciar-sesion']);
  }
}
