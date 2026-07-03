import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../services/usuario-service';
import { SolicitudService } from '../../services/solicitud-service';
import { SuscripcionService } from '../../services/suscripcion-service';
import { RecuerdoService } from '../../services/recuerdo-service';
import { TranslatePipe } from '@ngx-translate/core';
import { LenguajeService } from '../../services/lenguaje.service';
import Swal from 'sweetalert2';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-perfil-adulto-mayor',
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
  templateUrl: './perfil-adulto-mayor.html',
  styleUrl: './perfil-adulto-mayor.css',
})
export class PerfilAdultoMayor implements OnInit {
  nombreUsuario = 'Soul User';
  emailUsuario = 'correo@ejemplo.com';
  userId: number | null = null;
  nombreCuidador = 'Ninguno';
  nombrePlan = 'Libreta Familiar';
  tieneCuidador = false;
  solicitudPendiente: any = null;
  cargando = false;
  fotoPerfil: string | null = null;
  fotoCuidador: string | null = null;

  // Conteo de recuerdos dinámico
  limitePlan = 100;
  cantidadRecuerdos = 0;
  porcentajeUso = 0;

  constructor(
    private usuarioService: UsuarioService,
    private solicitudService: SolicitudService,
    private suscripcionService: SuscripcionService,
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
    this.nombreUsuario = this.usuarioService.obtenerNombreCompleto() || 'Soul User';
    this.emailUsuario = this.usuarioService.obtenerEmail() || 'correo@ejemplo.com';
    this.fotoPerfil = this.usuarioService.obtenerFotoPerfil();

    if (this.userId) {
      this.cargarDatosAdicionales();
    }
  }

  cargarDatosAdicionales() {
    if (!this.userId) return;
    this.cargando = true;
    this.cdr.detectChanges();

    this.solicitudService.obtenerAsignacionActivaAdulto(this.userId).subscribe({
      next: (res) => {
        if (res && res.nombreCuidador) {
          this.nombreCuidador = res.nombreCuidador;
          this.fotoCuidador = res.fotoCuidador || null;
          this.tieneCuidador = true;
          this.solicitudPendiente = null;
          this.cargando = false;
        } else {
          this.tieneCuidador = false;
          this.nombreCuidador = 'Ninguno';
          this.fotoCuidador = null;
          this.buscarSolicitudesPendientes();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('No fue posible cargar el cuidador activo. Se están buscando solicitudes pendientes...', err);
        this.tieneCuidador = false;
        this.nombreCuidador = 'Ninguno';
        this.fotoCuidador = null;
        this.buscarSolicitudesPendientes();
      },
    });

    this.suscripcionService.obtenerSuscripcionActivaAdulto(this.userId).subscribe({
      next: (res) => {
        if (res && res.nombrePlan) {
          this.nombrePlan = res.nombrePlan;
        } else {
          this.nombrePlan = 'Libreta Familiar';
        }
        this.actualizarLimitePlan();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn(
          'No se pudo cargar suscripción activa, usando Libreta Familiar por defecto:',
          err,
        );
        this.nombrePlan = 'Libreta Familiar';
        this.actualizarLimitePlan();
        this.cdr.detectChanges();
      },
    });

    this.recuerdoService.obtenerTodos(this.userId).subscribe({
      next: (recuerdos) => {
        this.cantidadRecuerdos = recuerdos ? recuerdos.length : 0;
        this.actualizarPorcentaje();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Error al cargar la cantidad de recuerdos para la barra:', err);
        this.cantidadRecuerdos = 0;
        this.actualizarPorcentaje();
        this.cdr.detectChanges();
      },
    });
  }

  actualizarLimitePlan() {
    if (this.nombrePlan === 'Libreta Familiar') {
      this.limitePlan = 100;
    } else if (this.nombrePlan === 'Album Familiar') {
      this.limitePlan = 300;
    } else if (this.nombrePlan === 'Biblioteca Familiar') {
      this.limitePlan = 600;
    } else {
      this.limitePlan = 100;
    }
    this.actualizarPorcentaje();
  }

  actualizarPorcentaje() {
    if (this.limitePlan > 0) {
      this.porcentajeUso = (this.cantidadRecuerdos / this.limitePlan) * 100;
      if (this.porcentajeUso > 100) {
        this.porcentajeUso = 100;
      }
    } else {
      this.porcentajeUso = 0;
    }
  }

  buscarSolicitudesPendientes() {
    if (!this.userId) return;
    this.solicitudService.obtenerPendientesAdulto(this.userId).subscribe({
      next: (res) => {
        if (res && res.length > 0) {
          // Filtramos solicitudes con estado 'PENDIENTE'
          const pendientes = res.filter((s) => s.estado === 'PENDIENTE');
          this.solicitudPendiente = pendientes.length > 0 ? pendientes[0] : null;
          if (this.solicitudPendiente) {
            this.fotoCuidador = this.solicitudPendiente.fotoCuidador;
          } else {
            this.fotoCuidador = null;
          }
        } else {
          this.solicitudPendiente = null;
          this.fotoCuidador = null;
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn('Error al buscar solicitudes pendientes:', err);
        this.solicitudPendiente = null;
        this.fotoCuidador = null;
        this.cargando = false;
        this.cdr.detectChanges();
      },
    });
  }

  buscarYSolicitarCuidador() {
    this.cargando = true;
    this.cdr.detectChanges();

    this.solicitudService.obtenerCuidadores().subscribe({
      next: (data) => {
        this.cargando = false;
        this.cdr.detectChanges();

        if (!data || data.length === 0) {
          Swal.fire(
            this.lenguajeService.translate('PERF.ALERT_NO_CAREGIVERS_TITLE'),
            this.lenguajeService.translate('PERF.ALERT_NO_CAREGIVERS_DESC'),
            'warning',
          );
          return;
        }

        let cuidadoresHtml = `
          <div style="max-height: 400px; overflow-y: auto; text-align: left; padding: 10px; font-family: 'Segoe UI', sans-serif;">
            <p style="color: #64748b; font-size: 1rem; margin-bottom: 20px;">
              ${this.lenguajeService.translate('PERF.ALERT_LIST_INTRO')}
            </p>
        `;

        data.forEach((c) => {
          const noPhoneLabel = this.lenguajeService.translate('PERF.ALERT_NO_PHONE');
          const defaultBio = this.lenguajeService.translate('PERF.ALERT_DEFAULT_BIO');
          const vincularLabel = this.lenguajeService.translate('PERF.ALERT_VINCULAR');

          cuidadoresHtml += `
            <div style="background: #f8fafc; border: 2px solid #edf2f7; border-radius: 18px; padding: 18px; margin-bottom: 15px; display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="margin: 0; font-size: 1.25rem; font-weight: 800; color: #0f172a;">${c.nombreCompleto}</h4>
                <button onclick="window.solicitarCuidador('${c.idCuidador}', '${c.nombreCompleto}')" style="background: #c6f6d5; color: #166534; border: 2px solid #86efac; font-weight: 700; border-radius: 10px; padding: 8px 16px; font-size: 0.95rem; cursor: pointer; transition: all 0.2s;">
                  💖 ${vincularLabel}
                </button>
              </div>
              <p style="font-size: 0.9rem; color: #64748b; margin: 0;">📧 ${c.email} | 📞 ${c.telefono || noPhoneLabel}</p>
              <p style="font-size: 0.95rem; font-style: italic; color: #475569; margin: 5px 0 0 0; border-left: 3px solid #6200ea; padding-left: 10px;">
                "${c.biografia || defaultBio}"
              </p>
            </div>
          `;
        });

        cuidadoresHtml += '</div>';

        (window as any).solicitarCuidador = (idCuidador: string, nombreCompleto: string) => {
          Swal.close();

          Swal.fire({
            title: '💖 ' + this.lenguajeService.translate('PERF.ALERT_REQ_TITLE'),
            text: this.lenguajeService.translate('PERF.ALERT_REQ_DESC') + `${nombreCompleto}?`,
            input: 'text',
            inputPlaceholder: this.lenguajeService.translate('PERF.ALERT_REQ_PLACEHOLDER'),
            showCancelButton: true,
            confirmButtonText: this.lenguajeService.translate('PERF.ALERT_SEND_REQ'),
            confirmButtonColor: '#6200ea',
            cancelButtonText: this.lenguajeService.translate('BOTON.CANCELAR'),
          }).then((result) => {
            if (result.isConfirmed) {
              const friendlyMessage =
                result.value || this.lenguajeService.translate('PERF.ALERT_DEFAULT_REQ_MSG');
              this.enviarSolicitudRest(parseInt(idCuidador, 10), friendlyMessage);
            }
          });
        };

        Swal.fire({
          title: '🔍 ' + this.lenguajeService.translate('PERF.ALERT_SEARCH_TITLE'),
          html: cuidadoresHtml,
          showCloseButton: true,
          showConfirmButton: false,
          width: '600px',
        });
      },
      error: (err) => {
        this.cargando = false;
        this.cdr.detectChanges();
        console.error('Error al cargar cuidadores:', err);
        Swal.fire(
          this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
          this.lenguajeService.translate('PERF.ALERT_LOAD_ERROR'),
          'error',
        );
      },
    });
  }

  enviarSolicitudRest(idCuidador: number, mensaje: string) {
    if (!this.userId) return;
    this.cargando = true;
    this.cdr.detectChanges();

    const dto = {
      idAdultoMayor: this.userId,
      idCuidador: idCuidador,
      iniciadoPor: 'ADULTO_MAYOR',
      mensaje: mensaje,
    };

    this.solicitudService.crearSolicitud(dto).subscribe({
      next: (res: any) => {
        this.cargando = false;
        this.cdr.detectChanges();
        Swal.fire({
          title: this.lenguajeService.translate('PERF.ALERT_REQ_SENT_TITLE'),
          text: this.lenguajeService.translate('PERF.ALERT_REQ_SENT_DESC'),
          icon: 'success',
          timer: 2500,
          showConfirmButton: false,
        });
        this.cargarDatosAdicionales(); // Recargar estados
      },
      error: (err) => {
        this.cargando = false;
        this.cdr.detectChanges();
        console.error('Error al enviar solicitud:', err);
        Swal.fire(
          this.lenguajeService.translate('PERF.ALERT_REQ_ERROR_TITLE'),
          err.error?.message || this.lenguajeService.translate('PERF.ALERT_REQ_ERROR_DESC'),
          'error',
        );
      },
    });
  }

  responderSolicitud(idSolicitud: number, respuesta: 'ACEPTADA' | 'RECHAZADA') {
    this.cargando = true;
    this.cdr.detectChanges();

    const dto = {
      idSolicitud: idSolicitud,
      respuesta: respuesta,
    };

    this.solicitudService.responderSolicitud(dto).subscribe({
      next: (res) => {
        this.cargando = false;
        this.cdr.detectChanges();
        Swal.fire({
          title:
            respuesta === 'ACEPTADA'
              ? this.lenguajeService.translate('PERF.ALERT_REQ_ACCEPTED_TITLE')
              : this.lenguajeService.translate('PERF.ALERT_REQ_REJECTED_TITLE'),
          text:
            respuesta === 'ACEPTADA'
              ? this.lenguajeService.translate('PERF.ALERT_REQ_ACCEPTED_DESC')
              : this.lenguajeService.translate('PERF.ALERT_REQ_REJECTED_DESC'),
          icon: 'success',
          timer: 2500,
          showConfirmButton: false,
        });
        this.cargarDatosAdicionales();
      },
      error: (err) => {
        this.cargando = false;
        this.cdr.detectChanges();

        const msg = err.error?.message || err.message || '';
        if (
          respuesta === 'RECHAZADA' &&
          (msg.includes('rechazada correctamente') || err.status === 500)
        ) {
          Swal.fire({
            title: this.lenguajeService.translate('PERF.ALERT_REQ_REJECTED_CONFIRM_TITLE'),
            text: this.lenguajeService.translate('PERF.ALERT_REQ_REJECTED_CONFIRM_DESC'),
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
          this.cargarDatosAdicionales();
          return;
        }

        console.error('Error al responder solicitud:', err);
        Swal.fire(
          this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
          err.error?.message || this.lenguajeService.translate('PERF.ALERT_RESPOND_ERROR'),
          'error',
        );
      },
    });
  }

  escribirMensaje() {
    Swal.fire({
      title: '💬 ' + this.lenguajeService.translate('PERF.ALERT_MESSAGE_TITLE'),
      input: 'textarea',
      inputPlaceholder:
        this.lenguajeService.translate('PERF.ALERT_MESSAGE_PLACEHOLDER') +
        this.nombreCuidador +
        '...',
      inputAttributes: {
        'aria-label': this.lenguajeService.translate('PERF.ALERT_MESSAGE_LABEL'),
      },
      showCancelButton: true,
      confirmButtonText: this.lenguajeService.translate('PERF.ALERT_SEND_MSG'),
      confirmButtonColor: '#6200ea',
      cancelButtonText: this.lenguajeService.translate('BOTON.CANCELAR'),
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        Swal.fire({
          title: this.lenguajeService.translate('PERF.ALERT_MSG_SENT_TITLE'),
          text:
            this.lenguajeService.translate('PERF.ALERT_MSG_SENT_DESC_PRE') +
            this.nombreCuidador +
            this.lenguajeService.translate('PERF.ALERT_MSG_SENT_DESC_POST'),
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
      }
    });
  }

  cambioSuscripcion() {
    this.router.navigate(['/cambiar-suscripcion']);
  }

  editarPerfil() {
    this.router.navigate(['/editar-adulto-mayor']);
  }

  abrirConfiguracion() {
    this.router.navigate(['/configuracion-adulto-mayor']);
  }

  cerrarSesion() {
    this.usuarioService.cerrarSesion();
    this.router.navigate(['/iniciar-sesion']);
  }
}
