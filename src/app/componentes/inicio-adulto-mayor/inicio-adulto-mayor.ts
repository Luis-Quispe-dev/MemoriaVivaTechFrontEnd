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
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { UsuarioService } from '../../services/usuario-service';
import { SolicitudService } from '../../services/solicitud-service';
import { MensajeService } from '../../services/mensaje-service';
import { AsignacionRespondeDTO } from '../../model/asignacion-responde-dto';
import { MensajeRespondeDTO } from '../../model/mensaje-responde-dto';
import { TranslatePipe } from '@ngx-translate/core';
import { LenguajeService } from '../../services/lenguaje.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-inicio-adulto-mayor',
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
    MatButtonToggleModule,
    TranslatePipe
  ],
  templateUrl: './inicio-adulto-mayor.html',
  styleUrl: './inicio-adulto-mayor.css',
})
export class InicioAdultoMayor implements OnInit, OnDestroy {
  nombreUsuario = '';
  userId: number | null = null;
  roles: string[] = [];
  fotoPerfil: string | null = null;

  // Chat parameters
  mostrarChat = false;
  tieneCuidadorActivo = false;
  asignacionActiva: AsignacionRespondeDTO | null = null;

  mensajes: MensajeRespondeDTO[] = [];
  nuevoMensaje = '';
  cargandoMensajes = false;
  noLeidosCount = 0; // NUEVO: Contador de mensajes no leídos del cuidador
  tieneSolicitudPendiente = false;
  fotoCuidadorPendiente: string | null = null;

  private intervalId: any = null;
  private timerConteoId: any = null; // NUEVO: Temporizador para contar mensajes no leídos en segundo plano

  private usuarioService = inject(UsuarioService);
  private solicitudService = inject(SolicitudService);
  private mensajeService = inject(MensajeService);
  private lenguajeService = inject(LenguajeService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  constructor() {}

  ngOnInit() {
    if (!this.usuarioService.estaLogueado()) {
      this.router.navigate(['/iniciar-sesion']);
      return;
    }

    this.userId = this.usuarioService.obtenerUserId();
    this.nombreUsuario = this.usuarioService.obtenerNombreCompleto() || 'Usuario';
    this.roles = this.usuarioService.obtenerRoles();
    this.fotoPerfil = this.usuarioService.obtenerFotoPerfil();

    if (this.userId) {
      this.cargarCuidadorActivo();
      this.iniciarPollingConteo(); // NUEVO: Monitorear notificaciones de chat en segundo plano
      this.verificarSolicitudesPendientes();
    }
  }

  ngOnDestroy() {
    this.detenerPolling();
    this.detenerPollingConteo();
  }

  cargarCuidadorActivo() {
    if (!this.userId) return;
    this.solicitudService.obtenerAsignacionActivaAdulto(this.userId).subscribe({
      next: (res) => {
        if (res && res.idAsignacion) {
          this.asignacionActiva = res;
          this.tieneCuidadorActivo = true;
          this.obtenerConteoNoLeidosSilencioso(); // Cargar conteo inmediatamente
        } else {
          this.tieneCuidadorActivo = false;
          this.asignacionActiva = null;
          this.noLeidosCount = 0;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn("No se pudo cargar cuidador activo para el chat:", err);
        this.tieneCuidadorActivo = false;
        this.asignacionActiva = null;
        this.noLeidosCount = 0;
        this.cdr.detectChanges();
      }
    });
  }

  toggleChat() {
    if (!this.tieneCuidadorActivo) {
      Swal.fire({
        title: this.lenguajeService.translate('CHAT.MENSAJES_FAMILIARES'),
        text: this.lenguajeService.translate('CHAT.VINCULO_REQUERIDO'),
        icon: 'info',
        confirmButtonText: this.lenguajeService.translate('CHAT.IR_PERFIL'),
        confirmButtonColor: '#6200ea',
        showCancelButton: true,
        cancelButtonText: this.lenguajeService.translate('BOTON.CANCELAR')
      }).then((result) => {
        if (result.isConfirmed) {
          this.router.navigate(['/perfil-adulto-mayor']);
        }
      });
      return;
    }

    this.mostrarChat = !this.mostrarChat;
    this.cdr.detectChanges();

    if (this.mostrarChat) {
      this.noLeidosCount = 0; // Limpiar contador al abrir chat
      this.cargarMensajes();
      this.iniciarPolling();
      this.marcarMensajesComoLeidos();
    } else {
      this.detenerPolling();
      this.obtenerConteoNoLeidosSilencioso(); // Recargar conteo al cerrar chat
    }
  }

  cargarMensajes() {
    if (!this.asignacionActiva) return;
    this.cargandoMensajes = true;
    this.mensajeService.obtenerMensajesPorAsignacion(this.asignacionActiva.idAsignacion).subscribe({
      next: (data) => {
        this.mensajes = data || [];

        if (this.mostrarChat) {
          this.noLeidosCount = 0;
          this.marcarMensajesComoLeidos();
        } else {
          this.noLeidosCount = this.mensajes.filter(m => m.tipoRemitente === 'CUIDADOR' && !m.leido).length;
        }

        if (this.cargandoMensajes) {
          setTimeout(() => {
            this.cargandoMensajes = false;
            this.cdr.detectChanges();
            this.scrollToBottom();
          }, 1000);
        } else {
          this.cdr.detectChanges();
          this.scrollToBottom();
        }
      },
      error: (err) => {
        console.error("Error al cargar mensajes del chat:", err);
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
    if (!this.nuevoMensaje.trim() || !this.asignacionActiva) return;

    const mensajeTexto = this.nuevoMensaje.trim();
    this.nuevoMensaje = ''; // Limpiar input de inmediato

    const dto = {
      idAsignacion: this.asignacionActiva.idAsignacion,
      contenido: mensajeTexto,
      tipoRemitente: 'ADULTO_MAYOR'
    };

    this.mensajeService.enviarMensaje(dto).subscribe({
      next: () => {
        this.cargarMensajes();
      },
      error: (err) => {
        console.error("Error al enviar mensaje:", err);
        Swal.fire('Error', 'No se pudo enviar el mensaje en este momento.', 'error');
      }
    });
  }

  marcarMensajesComoLeidos() {
    if (!this.asignacionActiva) return;
    this.mensajeService.marcarMensajesComoLeidos(this.asignacionActiva.idAsignacion).subscribe({
      error: (err) => console.warn("No se pudo marcar mensajes como leídos:", err)
    });
  }

  iniciarPolling() {
    this.detenerPolling();
    this.intervalId = setInterval(() => {
      if (this.mostrarChat && this.asignacionActiva) {
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
    if (!this.asignacionActiva) return;
    this.mensajeService.obtenerMensajesPorAsignacion(this.asignacionActiva.idAsignacion).subscribe({
      next: (data) => {
        const nuevosMensajes = data || [];
        // Si hay nuevos mensajes en tiempo real, recargamos
        if (nuevosMensajes.length !== this.mensajes.length) {
          this.mensajes = nuevosMensajes;
          this.noLeidosCount = 0;
          this.cdr.detectChanges();
          this.scrollToBottom();
          this.marcarMensajesComoLeidos();
        }
      }
    });
  }

  // NUEVO: Métodos para monitorear en segundo plano el conteo de mensajes no leídos del cuidador
  iniciarPollingConteo() {
    this.detenerPollingConteo();
    // Cargar el conteo inicial
    if (this.asignacionActiva) {
      this.mensajeService.obtenerMensajesPorAsignacion(this.asignacionActiva.idAsignacion).subscribe({
        next: (msgs) => {
          if (msgs) {
            this.noLeidosCount = msgs.filter(m => m.tipoRemitente === 'CUIDADOR' && !m.leido).length;
            this.cdr.detectChanges();
          }
        }
      });
    }
    this.timerConteoId = setInterval(() => {
      this.obtenerConteoNoLeidosSilencioso();
    }, 5000); // Revisar cada 5 segundos
  }

  detenerPollingConteo() {
    if (this.timerConteoId) {
      clearInterval(this.timerConteoId);
      this.timerConteoId = null;
    }
  }

  obtenerConteoNoLeidosSilencioso() {
    if (this.tieneCuidadorActivo && !this.mostrarChat && this.asignacionActiva) {
      this.mensajeService.obtenerMensajesPorAsignacion(this.asignacionActiva.idAsignacion).subscribe({
        next: (msgs) => {
          if (msgs) {
            this.noLeidosCount = msgs.filter(m => m.tipoRemitente === 'CUIDADOR' && !m.leido).length;
            this.cdr.detectChanges();
          }
        },
        error: () => {}
      });
    }
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

  scrollToBottom() {
    setTimeout(() => {
      const container = document.getElementById('chat-history-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);
  }

  verificarSolicitudesPendientes() {
    if (!this.userId) return;
    this.solicitudService.obtenerPendientesAdulto(this.userId).subscribe({
      next: (res) => {
        const pendientes = res ? res.filter(s => s.iniciadoPor === 'CUIDADOR' && s.estado === 'PENDIENTE') : [];
        if (pendientes.length > 0) {
          this.tieneSolicitudPendiente = true;
          this.fotoCuidadorPendiente = pendientes[0].fotoCuidador || null;
        } else {
          this.tieneSolicitudPendiente = false;
          this.fotoCuidadorPendiente = null;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn("Error al verificar solicitudes pendientes:", err);
      }
    });
  }

  cerrarSesion() {
    this.detenerPolling();
    this.detenerPollingConteo();
    this.usuarioService.cerrarSesion();
    this.router.navigate(['/iniciar-sesion']);
  }
}
