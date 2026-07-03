import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UsuarioService } from '../../services/usuario-service';
import { SolicitudService } from '../../services/solicitud-service';
import { AsignacionRespondeDTO } from '../../model/asignacion-responde-dto';
import { LenguajeService } from '../../services/lenguaje.service';
import { TranslatePipe } from '@ngx-translate/core';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-calendario-cuidador-inicio',
  standalone: true,
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
  templateUrl: './calendario-cuidador-inicio.html',
  styleUrl: './calendario-cuidador-inicio.css'
})
export class CalendarioCuidadorInicio implements OnInit {
  nombreCuidador = '';
  userId: number | null = null;
  cargandoAsignaciones = true;
  filtroNombre = '';
  asignaciones: AsignacionRespondeDTO[] = [];
  fotoPerfil: string | null = null;

  private usuarioService = inject(UsuarioService);
  private solicitudService = inject(SolicitudService);
  private lenguajeService = inject(LenguajeService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    if (!this.usuarioService.estaLogueado()) {
      this.router.navigate(['/iniciar-sesion']);
      return;
    }

    this.userId = this.usuarioService.obtenerUserId();
    this.nombreCuidador = this.usuarioService.obtenerNombreCompleto() || 'Cuidador';
    this.fotoPerfil = this.usuarioService.obtenerFotoPerfil();

    if (this.userId) {
      this.cargarAsignaciones();
    } else {
      this.cargandoAsignaciones = false;
    }
  }

  cargarAsignaciones() {
    this.cargandoAsignaciones = true;
    const startTime = Date.now();

    this.solicitudService.obtenerAsignacionesActivasCuidador(this.userId!).subscribe({
      next: (res) => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 1000 - elapsed);

        setTimeout(() => {
          this.asignaciones = res || [];
          this.cargandoAsignaciones = false;
          this.cdr.detectChanges();
        }, delay);
      },
      error: (err) => {
        console.warn("No se pudieron cargar las vinculaciones activas:", err);
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 1000 - elapsed);

        setTimeout(() => {
          this.asignaciones = [];
          this.cargandoAsignaciones = false;
          this.cdr.detectChanges();
        }, delay);
      }
    });
  }

  obtenerPacientesFiltrados(): AsignacionRespondeDTO[] {
    if (!this.filtroNombre.trim()) {
      return this.asignaciones;
    }
    const query = this.filtroNombre.toLowerCase().trim();
    return this.asignaciones.filter(am =>
      am.nombreAdultoMayor.toLowerCase().includes(query)
    );
  }

  obtenerColorAvatar(index: number): string {
    return 'avatar-theme-' + (index % 5);
  }

  obtenerIniciales(nombre: string): string {
    if (!nombre) return 'P';
    const partes = nombre.trim().split(/\s+/);
    if (partes.length >= 2) {
      return (partes[0].charAt(0) + partes[1].charAt(0)).toUpperCase();
    }
    return partes[0].substring(0, 2).toUpperCase();
  }

  formatearFecha(fechaStr: any): string {
    if (!fechaStr) return '---';
    try {
      if (Array.isArray(fechaStr)) {
        const [anio, mes, dia] = fechaStr;
        const mm = String(mes).padStart(2, '0');
        const dd = String(dia).padStart(2, '0');
        return `${dd}/${mm}/${anio}`;
      }

      const datePart = fechaStr.split('T')[0];
      const partes = datePart.split('-');
      if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
      }
      return datePart;
    } catch (e) {
      return String(fechaStr);
    }
  }

  abrirCalendarioPaciente(am: AsignacionRespondeDTO) {
    localStorage.setItem('soulstory_active_id_asignacion', String(am.idAsignacion));
    this.router.navigate(['/calendario-cuidador-adultomayor']);
  }

  cerrarSesion() {
    this.usuarioService.cerrarSesion();
    this.router.navigate(['/iniciar-sesion']);
  }
}
