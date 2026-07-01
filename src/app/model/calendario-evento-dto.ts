export interface CalendarioEvento {
  id: number;
  titulo: string;
  descripcion: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  color: string;
  esDelBackend?: boolean;
  creadoPor?: string;
}
