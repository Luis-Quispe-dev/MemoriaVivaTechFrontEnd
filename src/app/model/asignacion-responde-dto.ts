export interface AsignacionRespondeDTO {
  idAsignacion: number;
  idAdultoMayor: number;
  nombreAdultoMayor: string;
  idCuidador: number;
  nombreCuidador: string;
  idSolicitud: number;
  estado: string;
  fechaInicio: any;
  fechaFin: any;
  fotoAdultoMayor?: string;
  fotoCuidador?: string;
}
