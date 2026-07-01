export interface CuidadorRespuestaDTO {
  idCuidador: number;
  nombreCompleto: string;
  email: string;
  telefono?: string;
  biografia?: string;
  notificacionActiva?: boolean;
  contenidoFoto?: string;
}
