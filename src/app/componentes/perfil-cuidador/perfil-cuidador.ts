import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../services/usuario-service';
import { SolicitudService } from '../../services/solicitud-service';
import { MensajeService } from '../../services/mensaje-service';
import { AsignacionRespondeDTO } from '../../model/asignacion-responde-dto';
import { LenguajeService } from '../../services/lenguaje.service';
import { TranslatePipe } from '@ngx-translate/core';
import Swal from 'sweetalert2';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-perfil-cuidador',
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
  templateUrl: './perfil-cuidador.html',
  styleUrl: './perfil-cuidador.css',
})
export class PerfilCuidador implements OnInit {
  nombreUsuario = 'Cuidador';
  emailUsuario = 'correo@ejemplo.com';
  userId: number | null = null;
  solicitudMensaje = ''; // Bindable text for custom request invitation message
  cuidadoresList: any[] = [];
  busquedaQuery = '';

  asignacionesActivas: any[] = [];
  solicitudesPendientes: any[] = [];
  cargando = false;
  indicePacienteActual = 0;
  fotoPerfil: string | null = null;
  tieneSolicitudPendiente = false;
  fotoAdultoMayorPendiente: string | null = null;

  private usuarioService = inject(UsuarioService);
  private solicitudService = inject(SolicitudService);
  private mensajeService = inject(MensajeService);
  private lenguajeService = inject(LenguajeService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    if (!this.usuarioService.estaLogueado() || !this.usuarioService.obtenerRoles().includes('ROLE_CUIDADOR')) {
      this.router.navigate(['/iniciar-sesion']);
      return;
    }

    this.userId = this.usuarioService.obtenerUserId();
    this.nombreUsuario = this.usuarioService.obtenerNombreCompleto() || 'Cuidador';
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

    this.solicitudService.obtenerAsignacionesActivasCuidador(this.userId).subscribe({
      next: (res) => {
        const asignaciones = res || [];
        const calls = asignaciones.map(asig => {
          return new Promise<any>((resolve) => {
            this.usuarioService.obtenerAdultoMayorPorId(asig.idAdultoMayor).subscribe({
              next: (am) => {
                let edad = '';
                if (am.fechaNacimiento) {
                  try {
                    const cumple = new Date(am.fechaNacimiento);
                    const hoy = new Date();
                    let calcEdad = hoy.getFullYear() - cumple.getFullYear();
                    const m = hoy.getMonth() - cumple.getMonth();
                    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
                      calcEdad--;
                    }
                    if (calcEdad > 0) {
                      edad = `${calcEdad} años`;
                    }
                  } catch (e) {}
                }
                resolve({
                  ...asig,
                  fotoAdultoMayor: am.contenidoFoto || asig.fotoAdultoMayor || null,
                  edadAdultoMayor: edad
                });
              },
              error: () => {
                resolve({
                  ...asig,
                  edadAdultoMayor: ''
                });
              }
            });
          });
        });

        Promise.all(calls).then((mappedAsignaciones) => {
          this.asignacionesActivas = mappedAsignaciones;
          this.indicePacienteActual = 0;
          this.cargarSolicitudesPendientes();
        });
      },
      error: (err) => {
        console.warn("No se pudieron cargar las asignaciones activas:", err);
        this.asignacionesActivas = [];
        this.indicePacienteActual = 0;
        this.cargarSolicitudesPendientes();
      }
    });
  }

  cargarSolicitudesPendientes() {
    if (!this.userId) return;
    this.solicitudService.obtenerPendientesCuidador(this.userId).subscribe({
      next: (res) => {
        const solicitudes = res || [];
        const calls = solicitudes.map(soli => {
          return new Promise<any>((resolve) => {
            this.usuarioService.obtenerAdultoMayorPorId(soli.idAdultoMayor).subscribe({
              next: (am) => {
                let edad = '';
                if (am.fechaNacimiento) {
                  try {
                    const cumple = new Date(am.fechaNacimiento);
                    const hoy = new Date();
                    let calcEdad = hoy.getFullYear() - cumple.getFullYear();
                    const m = hoy.getMonth() - cumple.getMonth();
                    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
                      calcEdad--;
                    }
                    if (calcEdad > 0) {
                      edad = `${calcEdad} años`;
                    }
                  } catch (e) {}
                }
                resolve({
                  ...soli,
                  fotoAdultoMayor: am.contenidoFoto || null,
                  edadAdultoMayor: edad
                });
              },
              error: () => {
                resolve({
                  ...soli,
                  fotoAdultoMayor: null,
                  edadAdultoMayor: ''
                });
              }
            });
          });
        });

        Promise.all(calls).then((mappedSolicitudes) => {
          this.solicitudesPendientes = mappedSolicitudes;
          const pendientesAcompanamiento = mappedSolicitudes.filter(s => s.iniciadoPor === 'ADULTO_MAYOR' && s.estado === 'PENDIENTE');
          if (pendientesAcompanamiento.length > 0) {
            this.tieneSolicitudPendiente = true;
            this.fotoAdultoMayorPendiente = pendientesAcompanamiento[0].fotoAdultoMayor || null;
          } else {
            this.tieneSolicitudPendiente = false;
            this.fotoAdultoMayorPendiente = null;
          }
          this.cargando = false;
          this.cdr.detectChanges();
        });
      },
      error: (err) => {
        console.warn("No se pudieron cargar las solicitudes pendientes:", err);
        this.solicitudesPendientes = [];
        this.cargando = false;
        this.cdr.detectChanges();
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
          title: respuesta === 'ACEPTADA'
            ? this.lenguajeService.translate('PERF.ALERT_REQ_ACCEPTED_TITLE')
            : this.lenguajeService.translate('PERF.ALERT_REQ_REJECTED_TITLE'),
          text: respuesta === 'ACEPTADA'
            ? this.lenguajeService.translate('PERF.ALERT_REQ_ACCEPTED_DESC')
            : this.lenguajeService.translate('PERF.ALERT_REQ_REJECTED_DESC'),
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

  buscarYVincularPaciente() {
    this.cargando = true;
    this.cdr.detectChanges();

    this.solicitudService.obtenerAdultosMayores().subscribe({
      next: (data) => {
        this.cargando = false;
        this.cdr.detectChanges();

        if (!data || data.length === 0) {
          Swal.fire(
            this.lenguajeService.translate('PERF.ALERT_NO_CAREGIVERS_TITLE') || 'Búsqueda',
            this.lenguajeService.translate('PERF.SOLI.BUSCAR_POPUP_VACIO') || 'No hay pacientes registrados.',
            'info'
          );
          return;
        }

        const vinculadosIds = this.asignacionesActivas.map(a => a.idAdultoMayor);
        const disponibles = data.filter(am => !vinculadosIds.includes(am.idAdultoMayor));

        if (disponibles.length === 0) {
          Swal.fire(
            this.lenguajeService.translate('PERF.ALERT_ALREADY_VERIFIED_TITLE') || 'Búsqueda',
            this.lenguajeService.translate('PERF.SOLI.BUSCAR_POPUP_VINCULADOS_TODOS') || 'Todos los pacientes ya están vinculados.',
            'info'
          );
          return;
        }

        let htmlContent = `
          <div style="font-family: 'Segoe UI', system-ui, sans-serif; text-align: left; padding: 5px;">
            <p style="color: #64748b; font-size: 0.95rem; margin-bottom: 12px;">
              ${this.lenguajeService.translate('PERF.SOLI.BUSCAR_POPUP_INTRO') || 'Selecciona un adulto mayor de la lista para enviarle una invitación:'}
            </p>

            <!-- Barra de búsqueda interactiva -->
            <div style="position: relative; margin-bottom: 18px;">
              <i class="fas fa-search" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 1rem;"></i>
              <input type="text" id="patient-search-input" placeholder="Buscar por nombre o correo..."
                     style="width: 100%; padding: 12px 12px 12px 42px; border-radius: 12px; border: 2px solid #cbd5e1; font-size: 0.95rem; box-sizing: border-box; outline: none; transition: border-color 0.2s;"
                     onfocus="this.style.borderColor='#166534'" onblur="this.style.borderColor='#cbd5e1'">
            </div>

            <div id="patients-list-container" style="max-height: 350px; overflow-y: auto; padding-right: 5px;">
        `;

        disponibles.forEach(am => {
          let edadStr = '';
          if (am.fechaNacimiento) {
            try {
              const cumple = new Date(am.fechaNacimiento);
              const hoy = new Date();
              let edad = hoy.getFullYear() - cumple.getFullYear();
              const m = hoy.getMonth() - cumple.getMonth();
              if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
                edad--;
              }
              if (edad > 0) {
                edadStr = ` | 🎂 ${edad} años`;
              }
            } catch (e) {}
          }

          const fotoHtml = am.contenidoFoto
            ? `<img src="${am.contenidoFoto}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2.5px solid #166534; flex-shrink: 0;">`
            : `<div style="width: 48px; height: 48px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; color: #64748b; font-size: 1.2rem; flex-shrink: 0;"><i class="fas fa-user"></i></div>`;

          const vincularLabel = this.lenguajeService.translate('PERF.SOLI.BUSCAR_POPUP_BOTON') || 'Vincular';

          htmlContent += `
            <div class="patient-card"
                 data-nombre="${am.nombreCompleto.toLowerCase()}"
                 data-email="${am.email.toLowerCase()}"
                 style="background: #f8fafc; border: 2px solid #edf2f7; border-radius: 16px; padding: 12px 15px; margin-bottom: 12px; display: flex; align-items: center; gap: 12px; transition: all 0.2s;">
              ${fotoHtml}
              <div style="flex: 1; min-width: 0;">
                <h4 style="margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${am.nombreCompleto}</h4>
                <p style="font-size: 0.85rem; color: #64748b; margin: 3px 0 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">📧 ${am.email}${edadStr}</p>
              </div>
              <button onclick="window.solicitarAcompanamiento('${am.idAdultoMayor}', '${am.nombreCompleto.replace(/'/g, "\\'")}')"
                      style="background: #c6f6d5; color: #166534; border: 2px solid #86efac; font-weight: 700; border-radius: 10px; padding: 6px 14px; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; flex-shrink: 0;"
                      onmouseover="this.style.background='#bbf7d0'" onmouseout="this.style.background='#c6f6d5'">
                💖 ${vincularLabel}
              </button>
            </div>
          `;
        });

        htmlContent += `
            </div>
            <!-- Div para cuando no hay resultados -->
            <div id="no-results-message-am" style="display: none; text-align: center; padding: 25px 10px; color: #64748b;">
              <i class="fas fa-search" style="font-size: 2.2rem; color: #cbd5e1; margin-bottom: 10px;"></i>
              <p style="margin: 0; font-size: 0.95rem; font-weight: 600;">No se encontraron adultos mayores que coincidan con la búsqueda.</p>
            </div>
          </div>
        `;

        (window as any).solicitarAcompanamiento = (idAdulto: string, nombreCompleto: string) => {
          Swal.close();

          Swal.fire({
            title: this.lenguajeService.translate('PERF.ALERT_REQ_TITLE'),
            text: `${this.lenguajeService.translate('PERF.ALERT_REQ_DESC')}${nombreCompleto}?`,
            input: 'text',
            inputPlaceholder: this.lenguajeService.translate('PERF.ALERT_REQ_PLACEHOLDER'),
            showCancelButton: true,
            confirmButtonText: this.lenguajeService.translate('PERF.ALERT_SEND_REQ'),
            confirmButtonColor: '#166534',
            cancelButtonText: this.lenguajeService.translate('BOTON.CANCELAR')
          }).then((result) => {
            if (result.isConfirmed) {
              const msg = result.value || `${this.lenguajeService.translate('PERF.ALERT_DEFAULT_REQ_MSG')}`;
              this.enviarSolicitudRest(parseInt(idAdulto, 10), msg);
            }
          });
        };

        Swal.fire({
          title: this.lenguajeService.translate('PERF.VINCULAR_NUEVO'),
          html: htmlContent,
          showCloseButton: true,
          showConfirmButton: false,
          width: '550px',
          didOpen: () => {
            const searchInput = document.getElementById('patient-search-input') as HTMLInputElement;
            const noResults = document.getElementById('no-results-message-am');
            if (searchInput) {
              searchInput.addEventListener('input', (e: any) => {
                const query = e.target.value.toLowerCase().trim();
                const cards = document.querySelectorAll('.patient-card');
                let visibleCount = 0;

                cards.forEach((card: any) => {
                  const name = card.getAttribute('data-nombre') || '';
                  const email = card.getAttribute('data-email') || '';

                  if (name.includes(query) || email.includes(query)) {
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
        console.error("Error al cargar adultos mayores:", err);
        Swal.fire(
          this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
          this.lenguajeService.translate('PERF.ALERT_LOAD_ERROR'),
          'error'
        );
      }
    });
  }

  enviarSolicitudRest(idAdultoMayor: number, mensaje: string) {
    if (!this.userId) return;
    this.cargando = true;
    this.cdr.detectChanges();

    const dto = {
      idAdultoMayor: idAdultoMayor,
      idCuidador: this.userId,
      iniciadoPor: 'CUIDADOR',
      mensaje: mensaje
    };

    this.solicitudService.crearSolicitud(dto).subscribe({
      next: (res) => {
        this.cargando = false;
        this.cdr.detectChanges();
        Swal.fire({
          title: this.lenguajeService.translate('PERF.ALERT_REQ_SENT_TITLE'),
          text: this.lenguajeService.translate('PERF.ALERT_REQ_SENT_DESC'),
          icon: 'success',
          timer: 2500,
          showConfirmButton: false
        });
        this.cargarDatosAdicionales();
      },
      error: (err) => {
        this.cargando = false;
        this.cdr.detectChanges();
        console.error("Error al enviar solicitud:", err);
        Swal.fire(
          this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
          err.error?.message || this.lenguajeService.translate('PERF.ALERT_REQ_ERROR_DESC'),
          'error'
        );
      }
    });
  }

  editarPerfil() {
    this.router.navigate(['/editar-cuidador']);
  }


  abrirConfiguracion() {
    this.router.navigate(['/configuracion-cuidador']);
  }

  siguientePaciente() {
    if (this.asignacionesActivas.length === 0) return;
    this.indicePacienteActual = (this.indicePacienteActual + 1) % this.asignacionesActivas.length;
    this.cdr.detectChanges();
  }

  anteriorPaciente() {
    if (this.asignacionesActivas.length === 0) return;
    this.indicePacienteActual = (this.indicePacienteActual - 1 + this.asignacionesActivas.length) % this.asignacionesActivas.length;
    this.cdr.detectChanges();
  }

  formatearFecha(fecha: any): string {
    if (!fecha) return 'el inicio';
    try {
      if (Array.isArray(fecha)) {
        const [anio, mes, dia, hora, min] = fecha;
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(dia)}/${pad(mes)}/${anio} ${pad(hora)}:${pad(min)}`;
      }
      const d = new Date(fecha);
      if (isNaN(d.getTime())) {
        return fecha.toString().replace('T', ' ').substring(0, 16);
      }
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (e) {
      return fecha.toString();
    }
  }

  irAlPerfil() {
    this.router.navigate(['/perfil-cuidador']);
  }

  cerrarSesion() {
    this.usuarioService.cerrarSesion();
    this.router.navigate(['/iniciar-sesion']);
  }
}

