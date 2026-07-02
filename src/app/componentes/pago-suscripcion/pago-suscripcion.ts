import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../services/usuario-service';
import { SuscripcionService } from '../../services/suscripcion-service';
import { TranslatePipe } from '@ngx-translate/core';
import Swal from 'sweetalert2';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-pago-suscripcion',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    TranslatePipe
  ],
  templateUrl: './pago-suscripcion.html',
  styleUrl: './pago-suscripcion.css',
})
export class PagoSuscripcion implements OnInit {
  nombreUsuario = '';
  emailUsuario = '';
  fotoPerfil: string | null = null;
  userId: number | null = null;
  cargando = false;

  idPlan: number | null = null;
  planSeleccionado: any = null;

  metodoPago: 'TARJETA' | 'QR' = 'TARJETA';
  numeroTarjeta = '';
  cvc = '';
  fechaVencimiento = '';
  correoFacturacion = '';
  codigoZip = '';

  constructor(
    private usuarioService: UsuarioService,
    private suscripcionService: SuscripcionService,
    private route: ActivatedRoute,
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

    this.route.queryParams.subscribe(params => {
      const idPlanParam = params['idPlan'];
      if (idPlanParam) {
        this.idPlan = parseInt(idPlanParam, 10);
        this.cargarPlanSeleccionado();
      } else {
        this.router.navigate(['/cambiar-suscripcion']);
      }
    });
  }

  cargarPlanSeleccionado() {
    if (!this.idPlan) return;
    this.cargando = true;

    this.suscripcionService.listarPlanes().subscribe({
      next: (data: any[]) => {
        this.planSeleccionado = data.find(p => p.idPlan === this.idPlan);
        this.cargando = false;
        if (!this.planSeleccionado) {
          Swal.fire('Error', 'El plan seleccionado no es válido.', 'error').then(() => {
            this.router.navigate(['/cambiar-suscripcion']);
          });
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Error al obtener detalles del plan:", err);
        this.cargando = false;
        this.cdr.detectChanges();
      }
    });
  }

  seleccionarMetodo(metodo: 'TARJETA' | 'QR') {
    this.metodoPago = metodo;
    this.cdr.detectChanges();
  }

  procesarPago() {
    if (!this.userId || !this.planSeleccionado) return;

    // VALIDACIONES DE SEGURIDAD Y FORMATO
    if (this.metodoPago === 'TARJETA') {
      const cardRegex = /^\d{16}$/;
      const cvcRegex = /^\d{3}$/;
      const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/; // MM/YY

      if (!cardRegex.test(this.numeroTarjeta.replace(/\s+/g, ''))) {
        Swal.fire('Tarjeta Inválida', 'El número de tarjeta debe tener 16 dígitos.', 'warning');
        return;
      }
      if (!expiryRegex.test(this.fechaVencimiento)) {
        Swal.fire('Vencimiento Inválido', 'Formato de fecha inválido. Usa MM/AA (ej. 05/29).', 'warning');
        return;
      }
      if (!cvcRegex.test(this.cvc)) {
        Swal.fire('CVC Inválido', 'El código CVC debe tener exactamente 3 dígitos.', 'warning');
        return;
      }
      if (!this.correoFacturacion.trim()) {
        Swal.fire('Correo Requerido', 'Ingresa un correo electrónico de facturación válido.', 'warning');
        return;
      }
    } else {
      // Validaciones para pago QR
      if (!this.codigoZip.trim()) {
        Swal.fire('Código Zip Requerido', 'Para mayor seguridad, por favor ingresa tu código postal (ZIP).', 'warning');
        return;
      }
    }

    this.cargando = true;
    this.cdr.detectChanges();

    // Convertir MM/AA a formato AAAA-MM-DD
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
      codigoZip: this.metodoPago === 'QR' ? this.codigoZip : '15046'
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
          this.router.navigate(['/suscripcion-adultomayor']);
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
