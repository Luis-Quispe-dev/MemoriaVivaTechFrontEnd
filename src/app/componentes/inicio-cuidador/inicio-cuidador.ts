import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { UsuarioService } from '../../services/usuario-service';
import { SolicitudService } from '../../services/solicitud-service';
import { MensajeService } from '../../services/mensaje-service';
import { AdultoMayorRespuestaDTO } from '../../model/adulto-mayor-respuesta-dto';
import { MensajeRespondeDTO } from '../../model/mensaje-responde-dto';
import { LenguajeService } from '../../services/lenguaje.service';
import { TranslatePipe } from '@ngx-translate/core';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-inicio-cuidador',
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    TranslatePipe
  ],
  templateUrl: './inicio-cuidador.html',
  styleUrl: './inicio-cuidador.css',
})
export class InicioCuidador implements OnInit, OnDestroy {
  nombreCuidador = '';
  userId: number | null = null;
  fotoPerfil: string | null = null;

  // List of active patients
  pacientes: AdultoMayorRespuestaDTO[] = [];
  seleccionado: AdultoMayorRespuestaDTO | null = null;
  cargandoPacientes = true;

  // NUEVO CHAT DEDICADO MULTI-PACIENTE (Mockup Chat cuidador.png)
  mostrarChatGlobal = false; // Desactivado por defecto (se activa al presionar el botón de chat)
  pacientesChat: any[] = [];
  pacienteSeleccionadoChat: any = null;
  busquedaChatQuery = '';
  mensajes: MensajeRespondeDTO[] = [];
  nuevoMensaje = '';
  cargandoMensajes = false;
  totalNoLeidosCount = 0; // NUEVO: Suma de todos los mensajes no leídos de todos los pacientes del cuidador
  tieneSolicitudPendiente = false;
  fotoAdultoMayorPendiente: string | null = null;

  private intervalId: any = null;
  private timerConteoId: any = null; // NUEVO: Temporizador para contar mensajes no leídos de todos los pacientes en segundo plano

  private usuarioService = inject(UsuarioService);
  private solicitudService = inject(SolicitudService);
  private mensajeService = inject(MensajeService);
  private lenguajeService = inject(LenguajeService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    // Guardia de seguridad
    if (!this.usuarioService.estaLogueado() || !this.usuarioService.obtenerRoles().includes('ROLE_CUIDADOR')) {
      this.router.navigate(['/iniciar-sesion']);
      return;
    }

    this.userId = this.usuarioService.obtenerUserId();
    this.nombreCuidador = this.usuarioService.obtenerNombreCompleto() || 'Cuidador';
    this.fotoPerfil = this.usuarioService.obtenerFotoPerfil();

    if (this.userId) {
      this.cargarAsignacionesYConteo();
      this.iniciarPollingConteo(); // NUEVO: Iniciar monitoreo en segundo plano de mensajes no leídos totales
      this.verificarSolicitudesPendientes();
    }
  }

  ngOnDestroy() {
    this.detenerPolling();
    this.detenerPollingConteo();
  }



  // Lógica del Chat Multi-Paciente Dedicado
  toggleChatGlobal() {
    this.mostrarChatGlobal = !this.mostrarChatGlobal;
    this.cdr.detectChanges();

    if (this.mostrarChatGlobal) {
      this.cargarAsignacionesYConteo();
      this.iniciarPolling();
    } else {
      this.detenerPolling();
      this.pacienteSeleccionadoChat = null;
      this.mensajes = [];
    }
  }

  cargarAsignacionesYConteo() {
    if (!this.userId) return;
    this.solicitudService.obtenerAsignacionesActivasCuidador(this.userId).subscribe({
      next: (res) => {
        // Creamos un listado local temporal para evitar el parpadeo en la interfaz
        const tempPacientes = res.map(p => {
          // Si ya existe en la lista actual, preservamos su conteo de forma temporal
          const existente = this.pacientesChat.find(pc => pc.idAdultoMayor === p.idAdultoMayor);
          return {
            idAdultoMayor: p.idAdultoMayor,
            nombreCompleto: p.nombreAdultoMayor,
            idAsignacion: p.idAsignacion,
            fotoAdultoMayor: p.fotoAdultoMayor,
            noLeidosCount: existente ? existente.noLeidosCount : 0
          };
        }) || [];

        let pendingRequests = tempPacientes.length;
        if (pendingRequests === 0) {
          this.pacientesChat = [];
          this.totalNoLeidosCount = 0;
          this.cdr.detectChanges();
          return;
        }

        let tempTotal = 0;
        tempPacientes.forEach(pac => {
          this.mensajeService.obtenerMensajesPorAsignacion(pac.idAsignacion).subscribe({
            next: (msgs) => {
              if (msgs) {
                pac.noLeidosCount = msgs.filter(m => m.tipoRemitente === 'ADULTO_MAYOR' && !m.leido).length;
                if (this.mostrarChatGlobal && this.pacienteSeleccionadoChat && this.pacienteSeleccionadoChat.idAsignacion === pac.idAsignacion) {
                  pac.noLeidosCount = 0;
                }
                tempTotal += pac.noLeidosCount;
              }
              pendingRequests--;
              if (pendingRequests === 0) {
                // Actualizamos las propiedades de la clase de un solo golpe al terminar todas las peticiones
                this.pacientesChat = tempPacientes;
                this.totalNoLeidosCount = tempTotal;
                this.cdr.detectChanges();
              }
            },
            error: () => {
              pendingRequests--;
              if (pendingRequests === 0) {
                this.pacientesChat = tempPacientes;
                this.totalNoLeidosCount = tempTotal;
                this.cdr.detectChanges();
              }
            }
          });
        });
      },
      error: (err) => console.error("Error al cargar vinculaciones del chat:", err)
    });
  }

  seleccionarPacienteChat(paciente: any) {
    this.pacienteSeleccionadoChat = paciente;
    this.mensajes = [];
    this.cargandoMensajes = true;
    this.cdr.detectChanges();

    this.cargarMensajes();
  }

  cargarMensajes() {
    if (!this.pacienteSeleccionadoChat) return;

    this.mensajeService.obtenerMensajesPorAsignacion(this.pacienteSeleccionadoChat.idAsignacion).subscribe({
      next: (data) => {
        this.mensajes = data || [];

        // Limpiar el contador local de no leídos
        this.pacienteSeleccionadoChat.noLeidosCount = 0;

        if (this.cargandoMensajes) {
          // Retraso artificial deliberado de 1 segundo para la transición visual inicial
          setTimeout(() => {
            this.cargandoMensajes = false;
            this.cdr.detectChanges();
            this.scrollToBottom();
            this.marcarMensajesComoLeidos();
          }, 1000);
        } else {
          // Si ya estamos conversando, actualizamos de inmediato sin retraso
          this.cdr.detectChanges();
          this.scrollToBottom();
          this.marcarMensajesComoLeidos();
        }
      },
      error: (err) => {
        console.error("Error al cargar mensajes:", err);
        if (this.cargandoMensajes) {
          setTimeout(() => {
            this.cargandoMensajes = false;
            this.cdr.detectChanges();
          }, 1000);
        } else {
          this.cargandoMensajes = false;
          this.cdr.detectChanges();
        }
      }
    });
  }

  enviarMensaje() {
    if (!this.nuevoMensaje.trim() || !this.pacienteSeleccionadoChat) return;

    const texto = this.nuevoMensaje.trim();
    this.nuevoMensaje = ''; // Limpiar input de inmediato

    const dto = {
      idAsignacion: this.pacienteSeleccionadoChat.idAsignacion,
      contenido: texto,
      tipoRemitente: 'CUIDADOR'
    };

    this.mensajeService.enviarMensaje(dto).subscribe({
      next: () => {
        this.cargarMensajes();
      },
      error: (err) => {
        console.error("Error al enviar mensaje del cuidador:", err);
        Swal.fire(
          this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE'),
          this.lenguajeService.translate('CCA.ALERT.ADD_ERROR_DESC'),
          'error'
        );
      }
    });
  }

  marcarMensajesComoLeidos() {
    if (!this.pacienteSeleccionadoChat) return;
    this.mensajeService.marcarMensajesComoLeidos(this.pacienteSeleccionadoChat.idAsignacion).subscribe({
      error: (err) => console.warn("No se pudieron marcar los mensajes como leídos:", err)
    });
  }

  iniciarPolling() {
    this.detenerPolling();
    this.intervalId = setInterval(() => {
      if (this.mostrarChatGlobal) {
        this.cargarMensajesSilencioso();
      }
    }, 4000);
  }

  detenerPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  cargarMensajesSilencioso() {
    if (!this.pacienteSeleccionadoChat) return;
    this.mensajeService.obtenerMensajesPorAsignacion(this.pacienteSeleccionadoChat.idAsignacion).subscribe({
      next: (data) => {
        const nuevos = data || [];
        if (nuevos.length !== this.mensajes.length) {
          this.mensajes = nuevos;
          this.cdr.detectChanges();
          this.scrollToBottom();
          this.marcarMensajesComoLeidos();
        }
      }
    });
  }

  // Metodos de monitoreo en segundo plano del total de mensajes no leidos del cuidador
  iniciarPollingConteo() {
    this.detenerPollingConteo();
    // Cargar el conteo de mensajes pendientes inmediatamente al iniciar el componente
    if (this.userId) {
      this.cargarAsignacionesYConteo();
    }
    this.timerConteoId = setInterval(() => {
      if (this.userId) {
        this.cargarAsignacionesYConteo();
      }
    }, 5000); // Revisar cada 5 segundos
  }

  detenerPollingConteo() {
    if (this.timerConteoId) {
      clearInterval(this.timerConteoId);
      this.timerConteoId = null;
    }
  }

  scrollToBottom() {
    setTimeout(() => {
      const container = document.getElementById('chat-history-container-cuidador-global');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }

  formatearHora(fecha: any): string {
    if (!fecha) return '';
    try {
      if (Array.isArray(fecha)) {
        const [anio, mes, dia, hora, min] = fecha;
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${pad(hora)}:${pad(min)}`;
      }
      const d = new Date(fecha);
      if (isNaN(d.getTime())) {
        const parts = fecha.toString().split('T');
        if (parts.length > 1) {
          return parts[1].substring(0, 5);
        }
        return fecha.toString();
      }
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch (e) {
      return '';
    }
  }

  filtrarPacientesChat() {
    if (!this.busquedaChatQuery.trim()) {
      return this.pacientesChat;
    }
    const q = this.busquedaChatQuery.toLowerCase().trim();
    return this.pacientesChat.filter(p => p.nombreCompleto.toLowerCase().includes(q));
  }



  verificarSolicitudesPendientes() {
    if (!this.userId) return;
    this.solicitudService.obtenerPendientesCuidador(this.userId).subscribe({
      next: (res) => {
        const pendientes = res ? res.filter(s => s.iniciadoPor === 'ADULTO_MAYOR' && s.estado === 'PENDIENTE') : [];
        if (pendientes.length > 0) {
          this.tieneSolicitudPendiente = true;
          this.usuarioService.obtenerAdultoMayorPorId(pendientes[0].idAdultoMayor).subscribe({
            next: (am) => {
              this.fotoAdultoMayorPendiente = am.contenidoFoto || null;
              this.cdr.detectChanges();
            },
            error: () => {
              this.fotoAdultoMayorPendiente = null;
              this.cdr.detectChanges();
            }
          });
        } else {
          this.tieneSolicitudPendiente = false;
          this.fotoAdultoMayorPendiente = null;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.warn("Error al verificar solicitudes pendientes:", err);
      }
    });
  }

  irAlPerfil() {
    this.detenerPolling();
    this.detenerPollingConteo();
    this.router.navigate(['/perfil-cuidador']);
  }

  cerrarSesion() {
    this.detenerPolling();
    this.detenerPollingConteo();
    this.usuarioService.cerrarSesion();
    this.router.navigate(['/iniciar-sesion']);
  }
}
