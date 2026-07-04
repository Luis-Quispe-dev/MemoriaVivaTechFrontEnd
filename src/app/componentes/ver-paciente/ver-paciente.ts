import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../services/usuario-service';
import { SolicitudService } from '../../services/solicitud-service';
import { ActividadService } from '../../services/actividad-service';
import { AdultoMayorRespuestaDTO } from '../../model/adulto-mayor-respuesta-dto';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { LenguajeService } from '../../services/lenguaje.service';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-ver-paciente',
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
  templateUrl: './ver-paciente.html',
  styleUrl: './ver-paciente.css',
})
export class VerPaciente implements OnInit, OnDestroy {
  nombreCuidador = '';
  userId: number | null = null;
  fotoPerfil: string | null = null;
  cargandoSeniors = false;

  adultosMayores: AdultoMayorRespuestaDTO[] = [];
  seleccionado: AdultoMayorRespuestaDTO | null = null;

  busquedaQuery = '';

  mostrarDetalleModal = false;
  detallePaciente: any = null;
  cantidadActividadesPendientes = 0;
  tieneSolicitudPendiente = false;
  fotoAdultoMayorPendiente: string | null = null;

  todosLosSeniorsDetails: any[] = [];

  private usuarioService = inject(UsuarioService);
  private solicitudService = inject(SolicitudService);
  private actividadService = inject(ActividadService);
  private lenguajeService = inject(LenguajeService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    if (!this.usuarioService.estaLogueado() || !this.usuarioService.obtenerRoles().includes('ROLE_CUIDADOR')) {
      this.router.navigate(['/iniciar-sesion']);
      return;
    }

    this.userId = this.usuarioService.obtenerUserId();
    this.nombreCuidador = this.usuarioService.obtenerNombreCompleto() || 'Cuidador';
    this.fotoPerfil = this.usuarioService.obtenerFotoPerfil();

    this.cargarAdultosMayores();
    this.cargarTodosLosSeniorsDetails();
    this.verificarSolicitudesPendientes();
  }

  ngOnDestroy() {}

  cargarAdultosMayores() {
    if (!this.userId) return;
    this.cargandoSeniors = true;
    this.solicitudService.obtenerAsignacionesActivasCuidador(this.userId).subscribe({
      next: (res) => {
        this.adultosMayores = res.map(p => ({
          idAdultoMayor: p.idAdultoMayor,
          nombreCompleto: p.nombreAdultoMayor,
          email: '',
          idAsignacion: p.idAsignacion,
          contenidoFoto: p.fotoAdultoMayor
        })) || [];
        this.cargandoSeniors = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Error al cargar adultos mayores asignados:", err);
        this.cargandoSeniors = false;
        this.cdr.detectChanges();
      }
    });
  }

  cargarTodosLosSeniorsDetails() {
    this.solicitudService.obtenerAdultosMayores().subscribe({
      next: (data) => {
        this.todosLosSeniorsDetails = data || [];
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.warn("No se pudo pre-cargar el listado completo de adultos mayores:", err);
      }
    });
  }

  filtrarPacientes() {
    if (!this.busquedaQuery.trim()) {
      return this.adultosMayores;
    }
    const q = this.busquedaQuery.toLowerCase().trim();
    return this.adultosMayores.filter(p => p.nombreCompleto.toLowerCase().includes(q));
  }

  seleccionarAdulto(adulto: AdultoMayorRespuestaDTO) {
    this.seleccionado = adulto;
    this.mostrarDetalleModal = true;
    this.detallePaciente = null;
    this.cantidadActividadesPendientes = 0;
    this.cdr.detectChanges();

    // 1. Try to find the senior's full details (email, fechaNacimiento) locally first
    const localDetail = this.todosLosSeniorsDetails.find(s => s.idAdultoMayor === adulto.idAdultoMayor);
    if (localDetail) {
      this.detallePaciente = localDetail;
      this.cdr.detectChanges();
    } else {
      // Fallback: Fetch full senior details (email, fechaNacimiento) from API
      this.solicitudService.obtenerDetalleAdultoMayor(adulto.idAdultoMayor).subscribe({
        next: (info) => {
          this.detallePaciente = info;
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error("Error al cargar detalles del adulto mayor desde fallback API:", err);
        }
      });
    }

    // 2. Fetch activities to count pending ones
    if (adulto.idAsignacion) {
      this.actividadService.obtenerActividadesPorAsignacion(adulto.idAsignacion).subscribe({
        next: (acts) => {
          if (acts) {
            this.cantidadActividadesPendientes = acts.filter(a => a.estado && a.estado.toUpperCase() === 'PENDIENTE').length;
          } else {
            this.cantidadActividadesPendientes = 0;
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.warn("No se pudieron cargar actividades del paciente:", err);
          this.cantidadActividadesPendientes = 0;
          this.cdr.detectChanges();
        }
      });
    }
  }

  calcularEdad(fechaNacimiento: any): string | number {
    if (!fechaNacimiento) return 'N/D';
    try {
      let birthDate: Date;
      if (Array.isArray(fechaNacimiento)) {
        const [anio, mes, dia] = fechaNacimiento;
        birthDate = new Date(anio, mes - 1, dia);
      } else {
        birthDate = new Date(fechaNacimiento);
      }

      const today = new Date();
      if (isNaN(birthDate.getTime())) {
        return 'N/D';
      }
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    } catch (e) {
      return 'N/D';
    }
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
    this.router.navigate(['/perfil-cuidador']);
  }

  cerrarSesion() {
    this.usuarioService.cerrarSesion();
    this.router.navigate(['/iniciar-sesion']);
  }
}
