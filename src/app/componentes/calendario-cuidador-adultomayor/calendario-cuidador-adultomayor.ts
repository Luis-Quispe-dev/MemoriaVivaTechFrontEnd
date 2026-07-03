import { Component, OnInit, ChangeDetectorRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, Validators } from '@angular/forms';
import { UsuarioService } from '../../services/usuario-service';
import { SolicitudService } from '../../services/solicitud-service';
import { ActividadService } from '../../services/actividad-service';
import { CalendarioEvento } from '../../model/calendario-evento-dto';
import { DiaMiniCalendario } from '../../model/dia-mini-calendario-dto';
import { LenguajeService } from '../../services/lenguaje.service';
import { TranslatePipe } from '@ngx-translate/core';
import Swal from 'sweetalert2';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-calendario-cuidador-adultomayor',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSelectModule,
    TranslatePipe,
  ],
  templateUrl: './calendario-cuidador-adultomayor.html',
  styleUrl: './calendario-cuidador-adultomayor.css',
})
export class CalendarioCuidadorAdultomayor implements OnInit {
  nombreUsuario = '';
  userId: number | null = null;
  roles: string[] = [];
  fotoPerfil: string | null = null;

  idAsignacion: number | null = null;
  nombrePaciente = '';
  nombreCuidador = '';
  cargandoAsignacion = true;

  mesesAbreviados = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ];
  anios = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

  anioSeleccionado = 2025;
  mesSeleccionado = 8;
  diaSeleccionado = 9;

  diasMiniCalendario: DiaMiniCalendario[] = [];

  horasGrid = [
    '00:00',
    '01:00',
    '02:00',
    '03:00',
    '04:00',
    '05:00',
    '06:00',
    '07:00',
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
    '20:00',
    '21:00',
    '22:00',
    '23:00',
  ];

  fechaLunesSemana = new Date(2025, 8, 7);
  diasSemana: { nombre: string; numero: number; fechaString: string; esHoy: boolean }[] = [];
  rangoSemanaTexto = '7 - 13';

  eventos: CalendarioEvento[] = [];

  eventoArrastrado: CalendarioEvento | null = null;
  esRedimensionando = false;
  diaDestinoArrastre: string | null = null;

  startY = 0;
  originalStartMinutes = 0;
  originalEndMinutes = 0;
  originalFecha = '';

  mostrarCrearEventoModal = false;
  esModoEdicion = false;
  eventoEnEdicion: CalendarioEvento | null = null;

  private usuarioService = inject(UsuarioService);
  private solicitudService = inject(SolicitudService);
  private actividadService = inject(ActividadService);
  private lenguajeService = inject(LenguajeService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private fb = inject(FormBuilder);

  eventForm = this.fb.group({
    nuevoTitulo: ['', [Validators.required]],
    nuevaDescripcion: [''],
    nuevoDiaString: ['2025-09-09', [Validators.required]],
    nuevaHoraInicio: ['08:00', [Validators.required]],
    nuevaHoraFin: ['09:30', [Validators.required]],
    nuevoColor: ['purple'],
  });

  ngOnInit() {
    if (
      !this.usuarioService.estaLogueado() ||
      !this.usuarioService.obtenerRoles().includes('ROLE_CUIDADOR')
    ) {
      this.router.navigate(['/iniciar-sesion']);
      return;
    }

    this.userId = this.usuarioService.obtenerUserId();
    this.nombreUsuario = this.usuarioService.obtenerNombreCompleto() || 'Cuidador';
    this.roles = this.usuarioService.obtenerRoles();
    this.fotoPerfil = this.usuarioService.obtenerFotoPerfil();

    const savedAsigId = localStorage.getItem('soulstory_active_id_asignacion');
    if (!savedAsigId) {
      Swal.fire({
        icon: 'warning',
        title: this.lenguajeService.translate('CCA.ALERT.CHOOSE_SENIOR_TITLE'),
        text: this.lenguajeService.translate('CCA.ALERT.CHOOSE_SENIOR_DESC'),
        confirmButtonColor: '#10b981',
      });
      this.router.navigate(['/calendario-cuidador-inicio']);
      return;
    }

    this.idAsignacion = Number(savedAsigId);

    const hoy = new Date();
    this.anioSeleccionado = hoy.getFullYear();
    this.mesSeleccionado = hoy.getMonth();
    this.diaSeleccionado = hoy.getDate();

    const diaSemana = hoy.getDay();
    const offsetLunes = diaSemana === 0 ? -6 : 1 - diaSemana;

    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + offsetLunes);
    lunes.setHours(0, 0, 0, 0);
    this.fechaLunesSemana = lunes;

    this.anios = [
      hoy.getFullYear() - 2,
      hoy.getFullYear() - 1,
      hoy.getFullYear(),
      hoy.getFullYear() + 1,
      hoy.getFullYear() + 2,
    ];

    this.cargarAsignacionYActividades();
    this.generarDiasMiniCalendario();
    this.generarDiasSemana();
  }

  cargarAsignacionYActividades() {
    if (!this.userId || !this.idAsignacion) {
      this.cargandoAsignacion = false;
      return;
    }

    this.cargandoAsignacion = true;
    const startTime = Date.now();

    this.solicitudService.obtenerAsignacionesActivasCuidador(this.userId).subscribe({
      next: (res) => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 800 - elapsed);

        setTimeout(() => {
          if (res && res.length > 0) {
            const matched = res.find((r) => r.idAsignacion === this.idAsignacion);
            if (matched) {
              this.nombrePaciente = matched.nombreAdultoMayor || 'Adulto Mayor';
              this.nombreCuidador = this.nombreUsuario;
              this.cargarActividadesDelBackend();
            } else {
              this.cargandoAsignacion = false;
              this.cdr.detectChanges();
            }
          } else {
            this.cargandoAsignacion = false;
            this.cdr.detectChanges();
          }
        }, delay);
      },
      error: (err) => {
        const elapsed = Date.now() - startTime;
        const delay = Math.max(0, 800 - elapsed);
        setTimeout(() => {
          console.warn('No se pudieron cargar asignaciones del cuidador:', err);
          this.cargandoAsignacion = false;
          this.cdr.detectChanges();
        }, delay);
      },
    });
  }

  cargarActividadesDelBackend() {
    if (!this.idAsignacion) return;

    this.actividadService.obtenerActividadesPorAsignacion(this.idAsignacion).subscribe({
      next: (data) => {
        if (data && data.length > 0) {
          this.eventos = data.map((item, index) => {
            const datePart = item.fechaHoraInicio.split('T')[0];
            const startPart = item.fechaHoraInicio.split('T')[1].substring(0, 5);
            const endPart = item.fechaHoraFin
              ? item.fechaHoraFin.split('T')[1].substring(0, 5)
              : '09:00';

            let color = 'teal'; // default color for caregiver UI
            const tit = item.titulo.toLowerCase();
            if (
              tit.includes('medicina') ||
              tit.includes('pastilla') ||
              tit.includes('salud') ||
              tit.includes('doctor') ||
              tit.includes('presión')
            ) {
              color = 'blue';
            } else if (
              tit.includes('caminata') ||
              tit.includes('ejercicio') ||
              tit.includes('deporte') ||
              tit.includes('gimnasio')
            ) {
              color = 'green';
            } else if (
              tit.includes('comida') ||
              tit.includes('desayuno') ||
              tit.includes('almuerzo') ||
              tit.includes('cena')
            ) {
              color = 'orange';
            } else if (
              tit.includes('jardín') ||
              tit.includes('plantas') ||
              tit.includes('naturaleza') ||
              tit.includes('pintura')
            ) {
              color = 'teal';
            } else {
              const colores = ['purple', 'blue', 'teal', 'orange', 'green'];
              color = colores[index % colores.length];
            }

            return {
              id: item.idActividad,
              titulo: item.titulo,
              descripcion: item.descripcion || '',
              fecha: datePart,
              horaInicio: startPart,
              horaFin: endPart,
              color: color,
              esDelBackend: true,
              creadoPor: item.creadoPor || 'ADULTO_MAYOR',
            };
          });
        } else {
          this.eventos = [];
        }
        this.cargandoAsignacion = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar actividades desde el backend:', err);
        this.eventos = [];
        this.cargandoAsignacion = false;
        this.cdr.detectChanges();
      },
    });
  }

  generarDiasMiniCalendario() {
    this.diasMiniCalendario = [];
    const primerDia = new Date(this.anioSeleccionado, this.mesSeleccionado, 1);
    let diaSemana = primerDia.getDay();
    let startOffset = diaSemana === 0 ? 6 : diaSemana - 1;

    const mesAnterior = this.mesSeleccionado === 0 ? 11 : this.mesSeleccionado - 1;
    const anioAnterior =
      this.mesSeleccionado === 0 ? this.anioSeleccionado - 1 : this.anioSeleccionado;
    const diasMesAnterior = new Date(anioAnterior, mesAnterior + 1, 0).getDate();

    for (let i = startOffset - 1; i >= 0; i--) {
      const numDia = diasMesAnterior - i;
      this.diasMiniCalendario.push({
        numero: numDia,
        esDeEsteMes: false,
        fechaString: this.formatearFechaString(anioAnterior, mesAnterior, numDia),
      });
    }

    const diasMesSeleccionado = new Date(
      this.anioSeleccionado,
      this.mesSeleccionado + 1,
      0,
    ).getDate();
    for (let i = 1; i <= diasMesSeleccionado; i++) {
      this.diasMiniCalendario.push({
        numero: i,
        esDeEsteMes: true,
        fechaString: this.formatearFechaString(this.anioSeleccionado, this.mesSeleccionado, i),
      });
    }

    const totalCeldas = this.diasMiniCalendario.length > 35 ? 42 : 35;
    const faltantes = totalCeldas - this.diasMiniCalendario.length;
    const mesSiguiente = this.mesSeleccionado === 11 ? 0 : this.mesSeleccionado + 1;
    const anioSiguiente =
      this.mesSeleccionado === 11 ? this.anioSeleccionado + 1 : this.anioSeleccionado;

    for (let i = 1; i <= faltantes; i++) {
      this.diasMiniCalendario.push({
        numero: i,
        esDeEsteMes: false,
        fechaString: this.formatearFechaString(anioSiguiente, mesSiguiente, i),
      });
    }
  }

  formatearFechaString(anio: number, mes: number, dia: number): string {
    const mm = String(mes + 1).padStart(2, '0');
    const dd = String(dia).padStart(2, '0');
    return `${anio}-${mm}-${dd}`;
  }

  generarDiasSemana() {
    this.diasSemana = [];
    const nombresDias = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

    for (let i = 0; i < 7; i++) {
      const fechaDia = new Date(this.fechaLunesSemana);
      fechaDia.setDate(this.fechaLunesSemana.getDate() + i);

      const anio = fechaDia.getFullYear();
      const mes = fechaDia.getMonth();
      const diaNum = fechaDia.getDate();

      const hoy = new Date();
      const esHoy =
        anio === hoy.getFullYear() && mes === hoy.getMonth() && diaNum === hoy.getDate();

      this.diasSemana.push({
        nombre: nombresDias[i],
        numero: diaNum,
        fechaString: this.formatearFechaString(anio, mes, diaNum),
        esHoy: esHoy,
      });
    }

    const primerDiaNum = this.diasSemana[0].numero;
    const ultimoDiaNum = this.diasSemana[6].numero;
    this.rangoSemanaTexto = `${primerDiaNum} - ${ultimoDiaNum}`;
  }

  mesAnterior() {
    if (this.mesSeleccionado === 0) {
      this.mesSeleccionado = 11;
      this.anioSeleccionado--;
    } else {
      this.mesSeleccionado--;
    }
    this.generarDiasMiniCalendario();
  }

  mesSiguiente() {
    if (this.mesSeleccionado === 11) {
      this.mesSeleccionado = 0;
      this.anioSeleccionado++;
    } else {
      this.mesSeleccionado++;
    }
    this.generarDiasMiniCalendario();
  }

  onMonthOrYearChange() {
    this.generarDiasMiniCalendario();
  }

  seleccionarDiaMini(dia: DiaMiniCalendario) {
    if (!dia.numero) return;
    this.diaSeleccionado = dia.numero;

    const fechaClick = new Date(dia.fechaString + 'T00:00:00');
    const diaSemana = fechaClick.getDay();
    const offsetLunes = diaSemana === 0 ? -6 : 1 - diaSemana;

    const nuevoLunes = new Date(fechaClick);
    nuevoLunes.setDate(fechaClick.getDate() + offsetLunes);
    this.fechaLunesSemana = nuevoLunes;

    this.generarDiasSemana();
  }

  semanaAnterior() {
    const nuevoLunes = new Date(this.fechaLunesSemana);
    nuevoLunes.setDate(this.fechaLunesSemana.getDate() - 7);
    this.fechaLunesSemana = nuevoLunes;
    this.generarDiasSemana();
  }

  semanaSiguiente() {
    const nuevoLunes = new Date(this.fechaLunesSemana);
    nuevoLunes.setDate(this.fechaLunesSemana.getDate() + 7);
    this.fechaLunesSemana = nuevoLunes;
    this.generarDiasSemana();
  }

  obtenerEventosDelDia(fechaString: string): CalendarioEvento[] {
    return this.eventos.filter((e) => e.fecha === fechaString);
  }

  calcularEstiloEvento(evento: CalendarioEvento): any {
    const parsearHora = (horaStr: string): number => {
      const [h, m] = horaStr.split(':').map(Number);
      return h + m / 60;
    };

    const inicio = parsearHora(evento.horaInicio);
    const fin = parsearHora(evento.horaFin);
    const duracion = Math.max(0.5, fin - inicio);

    const filaAltura = 60;
    const top = inicio * filaAltura;
    const height = duracion * filaAltura;

    return {
      top: `${top}px`,
      height: `${height}px`,
    };
  }

  abrirModalCrearEvento(fechaString?: string) {
    this.esModoEdicion = false;
    this.eventoEnEdicion = null;

    let targetFecha = '';
    if (fechaString) {
      targetFecha = fechaString;
    } else {
      const mesStr = String(this.mesSeleccionado + 1).padStart(2, '0');
      const diaStr = String(this.diaSeleccionado).padStart(2, '0');
      targetFecha = `${this.anioSeleccionado}-${mesStr}-${diaStr}`;
    }

    this.eventForm.patchValue({
      nuevoTitulo: '',
      nuevaDescripcion: '',
      nuevoDiaString: targetFecha,
      nuevaHoraInicio: '08:00',
      nuevaHoraFin: '09:30',
      nuevoColor: 'purple',
    });

    this.mostrarCrearEventoModal = true;
    this.cdr.detectChanges();
  }

  abrirModalEditarEvento(evento: CalendarioEvento, event: MouseEvent) {
    event.stopPropagation();

    this.esModoEdicion = true;
    this.eventoEnEdicion = evento;

    this.eventForm.patchValue({
      nuevoTitulo: evento.titulo,
      nuevaDescripcion: evento.descripcion || '',
      nuevoDiaString: evento.fecha,
      nuevaHoraInicio: evento.horaInicio,
      nuevaHoraFin: evento.horaFin,
      nuevoColor: evento.color,
    });

    this.mostrarCrearEventoModal = true;
    this.cdr.detectChanges();
  }

  cerrarModalCrearEvento() {
    this.mostrarCrearEventoModal = false;
  }

  actualizarEventoEditado() {
    if (!this.eventoEnEdicion) return;

    const id = this.eventoEnEdicion.id;
    const esDelBackend = this.eventoEnEdicion.esDelBackend;
    const formVals = this.eventForm.getRawValue();

    const [hIni, mIni] = (formVals.nuevaHoraInicio || '').split(':').map(Number);
    const [hFin, mFin] = (formVals.nuevaHoraFin || '').split(':').map(Number);
    const minInicio = hIni * 60 + mIni;
    const minFin = hFin * 60 + mFin;

    if (minFin <= minInicio) {
      Swal.fire({
        icon: 'error',
        title: this.lenguajeService.translate('CAL.ALERT_INVALID_TIME_TITLE'),
        text: this.lenguajeService.translate('CAL.ALERT_INVALID_TIME_DESC'),
        confirmButtonColor: '#10b981',
      });
      return;
    }

    if (esDelBackend && this.idAsignacion) {
      const fechaInicioIso = `${formVals.nuevoDiaString}T${formVals.nuevaHoraInicio}:00`;
      const fechaFinIso = `${formVals.nuevoDiaString}T${formVals.nuevaHoraFin}:00`;

      const dto = {
        idAsignacion: this.idAsignacion,
        titulo: formVals.nuevoTitulo || '',
        descripcion: formVals.nuevaDescripcion || '',
        fechaHoraInicio: fechaInicioIso,
        fechaHoraFin: fechaFinIso,
        recordatorioEn: fechaInicioIso,
        creadoPor: 'CUIDADOR',
      };

      Swal.showLoading();
      this.actividadService.editarActividad(id, dto).subscribe({
        next: () => {
          Swal.close();
          this.mostrarCrearEventoModal = false;
          Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
            icon: 'success',
            title: this.lenguajeService.translate('CAL.ALERT_UPDATE_SUCCESS_TITLE'),
            text: `${this.lenguajeService.translate('CAL.ALERT_UPDATE_SUCCESS_DESC')} "${formVals.nuevoTitulo}".`,
          });
          this.cargarActividadesDelBackend();
        },
        error: (err) => {
          Swal.close();
          console.error('Error al editar actividad en el backend:', err);
          Swal.fire({
            icon: 'error',
            title: this.lenguajeService.translate('CAL.ALERT_NETWORK_ERROR_TITLE'),
            text: this.lenguajeService.translate('CAL.ALERT_NETWORK_ERROR_DESC'),
            confirmButtonColor: '#10b981',
          });
        },
      });
    }
  }

  guardarEvento() {
    const formVals = this.eventForm.getRawValue();
    if (!formVals.nuevoTitulo || !formVals.nuevoTitulo.trim()) {
      Swal.fire({
        icon: 'error',
        title: this.lenguajeService.translate('CAL.ALERT_MISSING_DATA_TITLE'),
        text: this.lenguajeService.translate('CAL.ALERT_MISSING_DATA_DESC'),
        confirmButtonColor: '#10b981',
      });
      return;
    }

    if (this.esModoEdicion) {
      this.actualizarEventoEditado();
      return;
    }

    const [hIni, mIni] = (formVals.nuevaHoraInicio || '').split(':').map(Number);
    const [hFin, mFin] = (formVals.nuevaHoraFin || '').split(':').map(Number);
    const minInicio = hIni * 60 + mIni;
    const minFin = hFin * 60 + mFin;

    if (minFin <= minInicio) {
      Swal.fire({
        icon: 'error',
        title: this.lenguajeService.translate('CAL.ALERT_INVALID_TIME_TITLE'),
        text: this.lenguajeService.translate('CAL.ALERT_INVALID_TIME_DESC'),
        confirmButtonColor: '#10b981',
      });
      return;
    }

    if (this.idAsignacion) {
      const fechaInicioIso = `${formVals.nuevoDiaString}T${formVals.nuevaHoraInicio}:00`;
      const fechaFinIso = `${formVals.nuevoDiaString}T${formVals.nuevaHoraFin}:00`;

      const dto = {
        idAsignacion: this.idAsignacion,
        titulo: formVals.nuevoTitulo || '',
        descripcion: formVals.nuevaDescripcion || '',
        fechaHoraInicio: fechaInicioIso,
        fechaHoraFin: fechaFinIso,
        recordatorioEn: fechaInicioIso,
        creadoPor: 'CUIDADOR',
      };

      Swal.showLoading();
      this.actividadService.crearActividad(dto).subscribe({
        next: (res: any) => {
          Swal.close();
          this.mostrarCrearEventoModal = false;
          Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
            icon: 'success',
            title: this.lenguajeService.translate('CCA.ALERT.ADD_SUCCESS_TITLE'),
            text: `${this.lenguajeService.translate('CCA.ALERT.ADD_SUCCESS_DESC_PRE')}${formVals.nuevoTitulo}${this.lenguajeService.translate('CCA.ALERT.ADD_SUCCESS_DESC_POST')}${this.nombrePaciente}.`,
          });
          this.cargarActividadesDelBackend();
        },
        error: (err) => {
          Swal.close();
          console.error('Error al registrar actividad en el backend:', err);
          Swal.fire({
            icon: 'error',
            title: this.lenguajeService.translate('CCA.ALERT.ADD_ERROR_TITLE'),
            text: this.lenguajeService.translate('CCA.ALERT.ADD_ERROR_DESC'),
            confirmButtonColor: '#10b981',
          });
        },
      });
    }
  }

  eliminarEvento(id: number, event: MouseEvent, esDelBackend?: boolean) {
    event.stopPropagation();

    Swal.fire({
      title: this.lenguajeService.translate('CAL.ALERT_DELETE_CONFIRM_TITLE'),
      text: this.lenguajeService.translate('CAL.ALERT_DELETE_CONFIRM_DESC'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#64748b',
      confirmButtonText: this.lenguajeService.translate('CAL.ALERT_DELETE_CONFIRM_YES'),
      cancelButtonText: this.lenguajeService.translate('BOTON.CANCELAR'),
    }).then((result) => {
      if (result.isConfirmed) {
        if (esDelBackend) {
          Swal.showLoading();
          this.actividadService.eliminarActividad(id).subscribe({
            next: () => {
              Swal.close();
              Swal.fire({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true,
                icon: 'success',
                title: this.lenguajeService.translate('CAL.ALERT_DELETE_SUCCESS_TITLE'),
                text: this.lenguajeService.translate('CAL.ALERT_DELETE_SUCCESS_DESC'),
              });
              this.cargarActividadesDelBackend();
            },
            error: (err) => {
              Swal.close();
              console.error('Error al borrar actividad del backend:', err);
              Swal.fire({
                icon: 'error',
                title: this.lenguajeService.translate('CAL.ALERT_NETWORK_ERROR_TITLE'),
                text: this.lenguajeService.translate('CAL.ALERT_DELETE_ERROR_DESC'),
                confirmButtonColor: '#10b981',
              });
            },
          });
        }
      }
    });
  }

  convertirHoraAMinutos(horaStr: string): number {
    const [h, m] = horaStr.split(':').map(Number);
    return h * 60 + m;
  }

  convertirMinutosAHora(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  calcularClaseTamano(evento: CalendarioEvento): string {
    const inicio = this.convertirHoraAMinutos(evento.horaInicio);
    const fin = this.convertirHoraAMinutos(evento.horaFin);
    const duracionMins = fin - inicio;

    if (duracionMins <= 30) return 'size-xs';
    if (duracionMins <= 60) return 'size-sm';
    if (duracionMins <= 90) return 'size-md';
    return 'size-lg';
  }

  iniciarArrastre(evento: CalendarioEvento, event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.closest('.btn-delete-event') || target.closest('.event-resize-handle')) {
      return;
    }

    this.eventoArrastrado = evento;
    this.esRedimensionando = false;
    this.startY = event.clientY;
    this.originalFecha = evento.fecha;
    this.diaDestinoArrastre = evento.fecha;
    this.originalStartMinutes = this.convertirHoraAMinutos(evento.horaInicio);
    this.originalEndMinutes = this.convertirHoraAMinutos(evento.horaFin);

    event.preventDefault();
  }

  iniciarRedimension(evento: CalendarioEvento, event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    this.eventoArrastrado = evento;
    this.esRedimensionando = true;
    this.startY = event.clientY;
    this.originalStartMinutes = this.convertirHoraAMinutos(evento.horaInicio);
    this.originalEndMinutes = this.convertirHoraAMinutos(evento.horaFin);
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.eventoArrastrado) return;

    const deltaY = event.clientY - this.startY;

    if (this.esRedimensionando) {
      const minutesDelta = Math.round(deltaY / 30) * 30;
      let newEndMins = this.originalEndMinutes + minutesDelta;

      newEndMins = Math.min(24 * 60, newEndMins);
      newEndMins = Math.max(this.originalStartMinutes + 30, newEndMins);

      this.eventoArrastrado.horaFin = this.convertirMinutosAHora(newEndMins);
    } else {
      const minutesDelta = Math.round(deltaY / 30) * 30;
      let newStartMins = this.originalStartMinutes + minutesDelta;
      const duration = this.originalEndMinutes - this.originalStartMinutes;

      newStartMins = Math.max(0, newStartMins);
      if (newStartMins + duration > 24 * 60) {
        newStartMins = 24 * 60 - duration;
      }

      this.eventoArrastrado.horaInicio = this.convertirMinutosAHora(newStartMins);
      this.eventoArrastrado.horaFin = this.convertirMinutosAHora(newStartMins + duration);

      if (this.diaDestinoArrastre && this.eventoArrastrado.fecha !== this.diaDestinoArrastre) {
        this.eventoArrastrado.fecha = this.diaDestinoArrastre;
      }
    }

    this.cdr.detectChanges();
  }

  @HostListener('document:mouseup', ['$event'])
  onMouseUp(event: MouseEvent) {
    if (!this.eventoArrastrado) return;

    const ev = this.eventoArrastrado;
    this.eventoArrastrado = null;

    this.guardarCambiosArrastre(ev);
    this.cdr.detectChanges();
  }

  onMouseEnterColumna(fechaString: string) {
    if (this.eventoArrastrado && !this.esRedimensionando) {
      this.diaDestinoArrastre = fechaString;
    }
  }

  guardarCambiosArrastre(evento: CalendarioEvento) {
    if (evento.esDelBackend && this.idAsignacion) {
      const fechaInicioIso = `${evento.fecha}T${evento.horaInicio}:00`;
      const fechaFinIso = `${evento.fecha}T${evento.horaFin}:00`;

      const dto = {
        idAsignacion: this.idAsignacion,
        titulo: evento.titulo,
        descripcion: evento.descripcion,
        fechaHoraInicio: fechaInicioIso,
        fechaHoraFin: fechaFinIso,
        recordatorioEn: fechaInicioIso,
        creadoPor: 'CUIDADOR',
      };

      Swal.showLoading();
      this.actividadService.editarActividad(evento.id, dto).subscribe({
        next: () => {
          Swal.close();
          Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true,
            icon: 'success',
            title: this.lenguajeService.translate('CAL.ALERT_UPDATE_SUCCESS_TITLE'),
            text: `${this.lenguajeService.translate('CAL.ALERT_UPDATE_SUCCESS_DESC')} "${evento.titulo}".`,
          });
          this.cargarActividadesDelBackend();
        },
        error: (err) => {
          Swal.close();
          console.error('Error al actualizar actividad:', err);
          Swal.fire({
            icon: 'error',
            title: this.lenguajeService.translate('CAL.ALERT_NETWORK_ERROR_TITLE'),
            text: this.lenguajeService.translate('CAL.ALERT_DRAG_ERROR_DESC'),
            confirmButtonColor: '#10b981',
          });
          this.cargarActividadesDelBackend();
        },
      });
    }
  }

  ordenarEventosPorFecha(evs: CalendarioEvento[]): CalendarioEvento[] {
    return [...evs].sort((a, b) => {
      const fechaDiff = a.fecha.localeCompare(b.fecha);
      if (fechaDiff !== 0) return fechaDiff;
      return a.horaInicio.localeCompare(b.horaInicio);
    });
  }

  formatearFechaListado(fechaStr: string): string {
    if (!fechaStr) return '';
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return fechaStr;
    const anio = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10) - 1;
    const dia = parseInt(partes[2], 10);

    const fecha = new Date(anio, mes, dia);
    const nombresDias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const nombresMeses = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];

    const nomDia = nombresDias[fecha.getDay()];
    const nomMes = nombresMeses[fecha.getMonth()];
    return `${nomDia}, ${dia} ${nomMes}`;
  }

  irAFecha(fechaString: string) {
    const fecha = new Date(fechaString + 'T00:00:00');

    this.anioSeleccionado = fecha.getFullYear();
    this.mesSeleccionado = fecha.getMonth();
    this.diaSeleccionado = fecha.getDate();

    const diaSemana = fecha.getDay();
    const offsetLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
    const lunes = new Date(fecha);
    lunes.setDate(fecha.getDate() + offsetLunes);
    lunes.setHours(0, 0, 0, 0);
    this.fechaLunesSemana = lunes;

    this.generarDiasMiniCalendario();
    this.generarDiasSemana();
    this.cdr.detectChanges();
  }

  cerrarSesion() {
    this.usuarioService.cerrarSesion();
    this.router.navigate(['/iniciar-sesion']);
  }
}
