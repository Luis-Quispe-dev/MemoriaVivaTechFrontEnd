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

  asignacionesActivas: AsignacionRespondeDTO[] = [];
  solicitudesPendientes: any[] = [];
  cargando = false;
  indicePacienteActual = 0;
  fotoPerfil: string | null = null;

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
        this.asignacionesActivas = res || [];
        this.indicePacienteActual = 0;
        this.cargarSolicitudesPendientes();
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
        this.solicitudesPendientes = res || [];
        this.cargando = false;
        this.cdr.detectChanges();
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
            this.lenguajeService.translate('PERF.ALERT_NO_CAREGIVERS_TITLE'),
            this.lenguajeService.translate('PERF.SOLI.BUSCAR_POPUP_VACIO'),
            'info'
          );
          return;
        }

        const vinculadosIds = this.asignacionesActivas.map(a => a.idAdultoMayor);
        const disponibles = data.filter(am => !vinculadosIds.includes(am.idAdultoMayor));

        if (disponibles.length === 0) {
          Swal.fire(
            this.lenguajeService.translate('PERF.ALERT_ALREADY_VERIFIED_TITLE'),
            this.lenguajeService.translate('PERF.SOLI.BUSCAR_POPUP_VINCULADOS_TODOS'),
            'info'
          );
          return;
        }

        let htmlContent = `
          <div style="max-height: 400px; overflow-y: auto; text-align: left; padding: 10px; font-family: 'Segoe UI', sans-serif;">
            <p style="color: #64748b; font-size: 1rem; margin-bottom: 20px;">
              ${this.lenguajeService.translate('PERF.SOLI.BUSCAR_POPUP_INTRO')}
            </p>
        `;

        disponibles.forEach(am => {
          htmlContent += `
            <div style="background: #f8fafc; border: 2px solid #edf2f7; border-radius: 18px; padding: 18px; margin-bottom: 15px; display: flex; flex-direction: column; gap: 8px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="margin: 0; font-size: 1.2rem; font-weight: 800; color: #0f172a;">${am.nombreCompleto}</h4>
                <button onclick="window.solicitarAcompanamiento('${am.idAdultoMayor}', '${am.nombreCompleto.replace(/'/g, "\\'")}')" style="background: #c6f6d5; color: #166534; border: 2px solid #86efac; font-weight: 700; border-radius: 10px; padding: 8px 16px; font-size: 0.95rem; cursor: pointer; transition: all 0.2s;">
                  ${this.lenguajeService.translate('PERF.SOLI.BUSCAR_POPUP_BOTON')}
                </button>
              </div>
              <p style="font-size: 0.9rem; color: #64748b; margin: 0;"> @ ${am.email}</p>
            </div>
          `;
        });

        htmlContent += '</div>';

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
          width: '600px'
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

