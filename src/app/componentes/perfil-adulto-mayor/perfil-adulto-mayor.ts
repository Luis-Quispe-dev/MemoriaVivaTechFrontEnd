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
    TranslatePipe
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
  tieneSolicitudPendiente = false;
  fotoCuidadorPendiente: string | null = null;

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
    private cdr: ChangeDetectorRef
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
        console.warn("No se pudo cargar cuidador activo, buscando solicitudes pendientes:", err);
        this.tieneCuidador = false;
        this.nombreCuidador = 'Ninguno';
        this.fotoCuidador = null;
        this.buscarSolicitudesPendientes();
      }
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
        console.warn("No se pudo cargar suscripción activa, usando Libreta Familiar por defecto:", err);
        this.nombrePlan = 'Libreta Familiar';
        this.actualizarLimitePlan();
        this.cdr.detectChanges();
      }
    });

    this.recuerdoService.obtenerTodos(this.userId).subscribe({
      next: (recuerdos) => {
        this.cantidadRecuerdos = recuerdos ? recuerdos.length : 0;
        this.actualizarPorcentaje();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn("Error al cargar la cantidad de recuerdos para la barra:", err);
        this.cantidadRecuerdos = 0;
        this.actualizarPorcentaje();
        this.cdr.detectChanges();
      }
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
          const pendientes = res.filter(s => s.estado === 'PENDIENTE');
          this.solicitudPendiente = pendientes.length > 0 ? pendientes[0] : null;
          if (this.solicitudPendiente) {
            this.fotoCuidador = this.solicitudPendiente.fotoCuidador;
            this.fotoCuidadorPendiente = this.solicitudPendiente.fotoCuidador || null;
            if (this.solicitudPendiente.iniciadoPor === 'CUIDADOR') {
              this.tieneSolicitudPendiente = true;
            } else {
              this.tieneSolicitudPendiente = false;
            }
          } else {
            this.fotoCuidador = null;
            this.fotoCuidadorPendiente = null;
            this.tieneSolicitudPendiente = false;
          }
        } else {
          this.solicitudPendiente = null;
          this.fotoCuidador = null;
          this.fotoCuidadorPendiente = null;
          this.tieneSolicitudPendiente = false;
        }
        this.cargando = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn("Error al buscar solicitudes pendientes:", err);
        this.solicitudPendiente = null;
        this.fotoCuidador = null;
        this.fotoCuidadorPendiente = null;
        this.tieneSolicitudPendiente = false;
        this.cargando = false;
        this.cdr.detectChanges();
      }
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
            'warning'
          );
          return;
        }

        let cuidadoresHtml = `
          <div style="font-family: 'Segoe UI', system-ui, sans-serif; text-align: left; padding: 5px;">
            <p style="color: #64748b; font-size: 0.95rem; margin-bottom: 12px;">
              ${this.lenguajeService.translate('PERF.ALERT_LIST_INTRO') || 'Selecciona un cuidador de la lista para enviarle una solicitud de vinculación:'}
            </p>

            <!-- Barra de búsqueda interactiva -->
            <div style="position: relative; margin-bottom: 18px;">
              <i class="fas fa-search" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 1rem;"></i>
              <input type="text" id="caregiver-search-input" placeholder="Buscar por nombre, correo o teléfono..."
                     style="width: 100%; padding: 12px 12px 12px 42px; border-radius: 12px; border: 2px solid #cbd5e1; font-size: 0.95rem; box-sizing: border-box; outline: none; transition: border-color 0.2s;"
                     onfocus="this.style.borderColor='#6200ea'" onblur="this.style.borderColor='#cbd5e1'">
            </div>

            <div id="caregivers-list-container" style="max-height: 350px; overflow-y: auto; padding-right: 5px;">
        `;

        data.forEach((c) => {
          const noPhoneLabel = this.lenguajeService.translate('PERF.ALERT_NO_PHONE') || 'Sin teléfono';
          const defaultBio = this.lenguajeService.translate('PERF.ALERT_DEFAULT_BIO') || 'Sin biografía.';
          const vincularLabel = this.lenguajeService.translate('PERF.ALERT_VINCULAR') || 'Vincular';

          cuidadoresHtml += `
            <div class="caregiver-card"
                 data-nombre="${c.nombreCompleto.toLowerCase()}"
                 data-email="${c.email.toLowerCase()}"
                 data-telefono="${(c.telefono || '').toLowerCase()}"
                 style="background: #f8fafc; border: 2px solid #edf2f7; border-radius: 16px; padding: 15px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 6px; transition: all 0.2s;">
              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                <div>
                  <h4 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: #0f172a;">${c.nombreCompleto}</h4>
                  <p style="font-size: 0.85rem; color: #64748b; margin: 3px 0 0 0;">📧 ${c.email} | 📞 ${c.telefono || noPhoneLabel}</p>
                </div>
                <button onclick="window.solicitarCuidador('${c.idCuidador}', '${c.nombreCompleto}')"
                        style="background: #c6f6d5; color: #166534; border: 2px solid #86efac; font-weight: 700; border-radius: 10px; padding: 6px 14px; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; flex-shrink: 0;"
                        onmouseover="this.style.background='#bbf7d0'" onmouseout="this.style.background='#c6f6d5'">
                  💖 ${vincularLabel}
                </button>
              </div>
              <p style="font-size: 0.9rem; font-style: italic; color: #475569; margin: 4px 0 0 0; border-left: 3px solid #6200ea; padding-left: 8px;">
                "${c.biografia || defaultBio}"
              </p>
            </div>
          `;
        });

        cuidadoresHtml += `
            </div>
            <!-- Div para cuando no hay resultados -->
            <div id="no-results-message" style="display: none; text-align: center; padding: 25px 10px; color: #64748b;">
              <i class="fas fa-search" style="font-size: 2.2rem; color: #cbd5e1; margin-bottom: 10px;"></i>
              <p style="margin: 0; font-size: 0.95rem; font-weight: 600;">No se encontraron cuidadores que coincidan con la búsqueda.</p>
            </div>
          </div>
        `;

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
            cancelButtonText: this.lenguajeService.translate('BOTON.CANCELAR')
          }).then((result) => {
            if (result.isConfirmed) {
              const friendlyMessage = result.value || this.lenguajeService.translate('PERF.ALERT_DEFAULT_REQ_MSG');
              this.enviarSolicitudRest(parseInt(idCuidador, 10), friendlyMessage);
            }
          });
        };

        Swal.fire({
          title: '🔍 ' + this.lenguajeService.translate('PERF.ALERT_SEARCH_TITLE'),
          html: cuidadoresHtml,
          showCloseButton: true,
          showConfirmButton: false,
          width: '550px',
          didOpen: () => {
            const searchInput = document.getElementById('caregiver-search-input') as HTMLInputElement;
            const noResults = document.getElementById('no-results-message');
            if (searchInput) {
              searchInput.addEventListener('input', (e: any) => {
                const query = e.target.value.toLowerCase().trim();
                const cards = document.querySelectorAll('.caregiver-card');
                let visibleCount = 0;

                cards.forEach((card: any) => {
                  const name = card.getAttribute('data-nombre') || '';
                  const email = card.getAttribute('data-email') || '';
                  const phone = card.getAttribute('data-telefono') || '';

                  if (name.includes(query) || email.includes(query) || phone.includes(query)) {
                    card.style.display = 'flex';
                    visibleCount++;
                  } else {
                    card.style.display = 'none';
                  }
                });

                if (noResults) {
                  noResults.style.display = visibleCount === 0 ? 'block' : 'none';
                }
              });
            }
          }
        });

      },
      error: (err) => {
        this.cargando = false;
        this.cdr.detectChanges();
        console.error("Error al cargar cuidadores:", err);
        Swal.fire(
          this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
          this.lenguajeService.translate('PERF.ALERT_LOAD_ERROR'),
          'error'
        );
      }
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
      mensaje: mensaje
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
          showConfirmButton: false
        });
        this.cargarDatosAdicionales(); // Recargar estados
      },
      error: (err) => {
        this.cargando = false;
        this.cdr.detectChanges();
        console.error("Error al enviar solicitud:", err);
        Swal.fire(
          this.lenguajeService.translate('PERF.ALERT_REQ_ERROR_TITLE'),
          err.error?.message || this.lenguajeService.translate('PERF.ALERT_REQ_ERROR_DESC'),
          'error'
        );
      }
    });
  }

  responderSolicitud(idSolicitud: number, respuesta: 'ACEPTADA' | 'RECHAZADA') {
    this.cargando = true;
    this.cdr.detectChanges();

    const dto = {
      idSolicitud: idSolicitud,
      respuesta: respuesta
    };

    this.solicitudService.responderSolicitud(dto).subscribe({
      next: (res) => {
        this.cargando = false;
        this.cdr.detectChanges();
        Swal.fire({
          title: respuesta === 'ACEPTADA' ? this.lenguajeService.translate('PERF.ALERT_REQ_ACCEPTED_TITLE') : this.lenguajeService.translate('PERF.ALERT_REQ_REJECTED_TITLE'),
          text: respuesta === 'ACEPTADA' ? this.lenguajeService.translate('PERF.ALERT_REQ_ACCEPTED_DESC') : this.lenguajeService.translate('PERF.ALERT_REQ_REJECTED_DESC'),
          icon: 'success',
          timer: 2500,
          showConfirmButton: false
        });
        this.cargarDatosAdicionales();
      },
      error: (err) => {
        this.cargando = false;
        this.cdr.detectChanges();

        const msg = err.error?.message || err.message || '';
        if (respuesta === 'RECHAZADA' && (msg.includes('rechazada correctamente') || err.status === 500)) {
          Swal.fire({
            title: this.lenguajeService.translate('PERF.ALERT_REQ_REJECTED_CONFIRM_TITLE'),
            text: this.lenguajeService.translate('PERF.ALERT_REQ_REJECTED_CONFIRM_DESC'),
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
          });
          this.cargarDatosAdicionales();
          return;
        }

        console.error("Error al responder solicitud:", err);
        Swal.fire(
          this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
          err.error?.message || this.lenguajeService.translate('PERF.ALERT_RESPOND_ERROR'),
          'error'
        );
      }
    });
  }

  escribirMensaje() {
    Swal.fire({
      title: '💬 ' + this.lenguajeService.translate('PERF.ALERT_MESSAGE_TITLE'),
      input: 'textarea',
      inputPlaceholder: this.lenguajeService.translate('PERF.ALERT_MESSAGE_PLACEHOLDER') + this.nombreCuidador + '...',
      inputAttributes: {
        'aria-label': this.lenguajeService.translate('PERF.ALERT_MESSAGE_LABEL')
      },
      showCancelButton: true,
      confirmButtonText: this.lenguajeService.translate('PERF.ALERT_SEND_MSG'),
      confirmButtonColor: '#6200ea',
      cancelButtonText: this.lenguajeService.translate('BOTON.CANCELAR')
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        Swal.fire({
          title: this.lenguajeService.translate('PERF.ALERT_MSG_SENT_TITLE'),
          text: this.lenguajeService.translate('PERF.ALERT_MSG_SENT_DESC_PRE') + this.nombreCuidador + this.lenguajeService.translate('PERF.ALERT_MSG_SENT_DESC_POST'),
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
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
