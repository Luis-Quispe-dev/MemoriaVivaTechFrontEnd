export interface RecuerdoRespondeDTO {
  idRecuerdo: number;
  idAdultoMayor: number;
  nombreAdultoMayor?: string;
  tituloRecuerdo: string;
  tipoRecuerdo: string;
  contenido: string;
  formato?: string;
  favorito?: string;
  fechaCreacion?: string;
  esFavorito: boolean;
}
