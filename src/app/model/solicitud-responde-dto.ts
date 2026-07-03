export interface SolicitudRespondeDTO {
  idSolicitud: number;
  idAdultoMayor: number;
  nombreAdultoMayor: string;
  idCuidador: number;
  nombreCuidador: string;
  iniciadoPor: string;
  estado: string;
  fechaCreacion: string;
  mensaje?: string | null;
  fotoCuidador?: string | null;
}
