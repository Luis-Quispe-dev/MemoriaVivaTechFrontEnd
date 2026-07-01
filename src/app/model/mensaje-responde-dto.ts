export interface MensajeRespondeDTO {
  idMensaje: number;
  idAsignacion: number;
  contenido: string;
  tipoRemitente: string;
  fechaHora: any;
  leido: boolean;
}
