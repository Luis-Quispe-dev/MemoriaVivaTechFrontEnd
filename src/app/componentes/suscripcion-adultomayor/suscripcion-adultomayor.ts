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
  selector: 'app-suscripcion-adultomayor',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    TranslatePipe
  ],
  templateUrl: './suscripcion-adultomayor.html',
  styleUrl: './suscripcion-adultomayor.css',
})
export class SuscripcionAdultomayor implements OnInit {
  nombreUsuario = '';
  emailUsuario = '';
  fotoPerfil: string | null = null;
  userId: number | null = null;
  cargando = false;

  // Active Subscription
  suscripcionActiva: any = null;
  diasRestantes: number | null = null;

  // Visual state transitions
  vistaActual: 'ACTIVA' | 'CATALOGO' | 'PAGO' = 'ACTIVA';

  // Catalog
  planes: any[] = [];
  planSeleccionado: any = null;

  // Payment Form
  metodoPago: 'TARJETA' | 'QR' = 'TARJETA';
  numeroTarjeta = '';
  cvc = '';
  fechaVencimiento = '';
  correoFacturacion = '';
  codigoZip = '';

  constructor(
    private usuarioService: UsuarioService,
    private suscripcionService: SuscripcionService,
    private router: Router,
    private cdr: ChangeDetectorRef
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
        confirmButtonColor: '#166534'
      }).then(() => {
        this.router.navigate(['/iniciar-sesion']);
      });
      return;
    }

    this.userId = this.usuarioService.obtenerUserId();
    this.nombreUsuario = this.usuarioService.obtenerNombreCompleto() || 'Soul User';
    this.emailUsuario = this.usuarioService.obtenerEmail() || 'correo@ejemplo.com';
    this.fotoPerfil = this.usuarioService.obtenerFotoPerfil();
    this.correoFacturacion = this.emailUsuario;

    if (this.userId) {
      this.cargarSuscripcionActiva();
    }
  }

  cargarSuscripcionActiva() {
    if (!this.userId) return;
    this.cargando = true;

    this.suscripcionService.obtenerSuscripcionActivaAdulto(this.userId).subscribe({
      next: (res) => {
        this.suscripcionActiva = res;
        this.calcularDiasRestantes();
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn("No se pudo cargar la suscripción activa:", err);
        this.suscripcionActiva = null;
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  calcularDiasRestantes() {
    if (!this.suscripcionActiva || !this.suscripcionActiva.fechaFin) {
      this.diasRestantes = null; // Plan libreta/gratis no expira
      return;
    }

    const fechaFin = new Date(this.suscripcionActiva.fechaFin);
    const hoy = new Date();
    // Resetear horas para cálculo exacto de días
    fechaFin.setHours(0, 0, 0, 0);
    hoy.setHours(0, 0, 0, 0);

    const diffTime = fechaFin.getTime() - hoy.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    this.diasRestantes = diffDays >= 0 ? diffDays : 0;
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

  cambiarVista(vista: 'ACTIVA' | 'CATALOGO' | 'PAGO') {
    this.vistaActual = vista;
    if (vista === 'CATALOGO' && this.planes.length === 0) {
      this.cargarCatalogoPlanes();
    }
    this.cdr.detectChanges();
  }

  cargarCatalogoPlanes() {
    this.cargando = true;
    this.suscripcionService.listarPlanes().subscribe({
      next: (data) => {
        this.planes = data || [];
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Error al cargar los planes:", err);
        this.cargando = false;
        Swal.fire('Error', 'No se pudieron cargar los planes disponibles.', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  seleccionarPlan(plan: any) {
    // Si ya tiene este plan activo, no es necesario pagar de nuevo
    if (this.suscripcionActiva && this.suscripcionActiva.nombrePlan === plan.nombrePlan) {
      Swal.fire('Plan Activo', `Ya posees el plan ${plan.nombrePlan} activo actualmente.`, 'info');
      return;
    }
    this.planSeleccionado = plan;
    this.cambiarVista('PAGO');
  }

  procesarPago() {
    if (!this.userId || !this.planSeleccionado) return;

    // VALIDACIONES DE SEGURIDAD
    if (this.metodoPago === 'TARJETA') {
      const cardRegex = /^\d{16}$/;
      const cvcRegex = /^\d{3}$/;
      const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/; // MM/YY

      if (!cardRegex.test(this.numeroTarjeta.replace(/\s+/g, ''))) {
        Swal.fire('Tarjeta Inválida', 'El número de tarjeta debe tener exactamente 16 dígitos.', 'warning');
        return;
      }
      if (!expiryRegex.test(this.fechaVencimiento)) {
        Swal.fire('Vencimiento Inválido', 'Ingresa una fecha de vencimiento válida en formato MM/AA (ej. 12/28).', 'warning');
        return;
      }
      if (!cvcRegex.test(this.cvc)) {
        Swal.fire('CVC Inválido', 'El código de seguridad (CVC) debe tener 3 dígitos.', 'warning');
        return;
      }
    }

    this.cargando = true;

    // Convertir vencimiento al formato esperado por el backend
    // Backend espera un String, simulamos fecha formato AAAA-MM-DD
    let fechaVencBack = '2028-12-31';
    if (this.fechaVencimiento && this.fechaVencimiento.includes('/')) {
      const parts = this.fechaVencimiento.split('/');
      fechaVencBack = `20${parts[1]}-${parts[0]}-28`;
    }

    const payload = {
      idAdultoMayor: this.userId,
      idPlan: this.planSeleccionado.idPlan,
      metodoPago: this.metodoPago,
      numeroTarjeta: this.metodoPago === 'TARJETA' ? this.numeroTarjeta.replace(/\s+/g, '') : null,
      cvc: this.metodoPago === 'TARJETA' ? this.cvc : null,
      fechaVencimiento: this.metodoPago === 'TARJETA' ? fechaVencBack : null,
      correoElectronico: this.correoFacturacion,
      codigoZip: this.codigoZip || '15046'
    };

    this.suscripcionService.pagar(payload).subscribe({
      next: (res) => {
        this.cargando = false;
        Swal.fire({
          icon: 'success',
          title: '¡Suscripción Activada!',
          text: `Felicidades, te has suscrito al plan ${this.planSeleccionado.nombrePlan} con éxito.`,
          confirmButtonColor: '#166534',
          confirmButtonText: 'Genial'
        }).then(() => {
          this.numeroTarjeta = '';
          this.cvc = '';
          this.fechaVencimiento = '';
          this.planSeleccionado = null;
          this.cargarSuscripcionActiva();
          this.cambiarVista('ACTIVA');
        });
      },
      error: (err) => {
        this.cargando = false;
        console.error("Error al procesar el pago:", err);
        Swal.fire('Error de Pago', err.error?.message || 'No se pudo realizar el cargo. Intenta de nuevo.', 'error');
        this.cdr.detectChanges();
      }
    });
  }

  cerrarSesion() {
    this.usuarioService.cerrarSesion();
    this.router.navigate(['/iniciar-sesion']);
  }
}
