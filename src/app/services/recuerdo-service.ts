import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RecuerdoLlamadoDTO } from '../model/recuerdo-llamado-dto';
import { RecuerdoRespondeDTO } from '../model/recuerdo-responde-dto';

@Injectable({
  providedIn: 'root',
})
export class RecuerdoService {
  private apiUrl = environment.apiUrl;
  private httpClient = inject(HttpClient);

  constructor() {}

  crearRecuerdoTexto(dto: RecuerdoLlamadoDTO): Observable<RecuerdoRespondeDTO> {
    return this.httpClient.post<RecuerdoRespondeDTO>(`${this.apiUrl}/recuerdo/texto`, dto);
  }

  crearRecuerdoAudio(dto: RecuerdoLlamadoDTO): Observable<RecuerdoRespondeDTO> {
    return this.httpClient.post<RecuerdoRespondeDTO>(`${this.apiUrl}/recuerdo/audio`, dto);
  }

  crearRecuerdoFoto(dto: RecuerdoLlamadoDTO): Observable<RecuerdoRespondeDTO> {
    return this.httpClient.post<RecuerdoRespondeDTO>(`${this.apiUrl}/recuerdo/foto`, dto);
  }

  obtenerTodos(idAdultoMayor: number): Observable<RecuerdoRespondeDTO[]> {
    return this.httpClient.get<RecuerdoRespondeDTO[]>(
      `${this.apiUrl}/recuerdo/adulto/${idAdultoMayor}`,
    );
  }

  obtenerPorTipo(idAdultoMayor: number, tipo: string): Observable<RecuerdoRespondeDTO[]> {
    return this.httpClient.get<RecuerdoRespondeDTO[]>(
      `${this.apiUrl}/recuerdo/adulto/${idAdultoMayor}/tipo/${tipo}`,
    );
  }

  obtenerPorId(idRecuerdo: number): Observable<RecuerdoRespondeDTO> {
    return this.httpClient.get<RecuerdoRespondeDTO>(`${this.apiUrl}/recuerdo/buscar/${idRecuerdo}`);
  }

  editarRecuerdo(idRecuerdo: number, dto: RecuerdoLlamadoDTO): Observable<RecuerdoRespondeDTO> {
    return this.httpClient.put<RecuerdoRespondeDTO>(
      `${this.apiUrl}/recuerdo/editar/${idRecuerdo}`,
      dto,
    );
  }

  eliminarRecuerdo(idRecuerdo: number): Observable<void> {
    return this.httpClient.delete<void>(`${this.apiUrl}/recuerdo/eliminar/${idRecuerdo}`);
  }

  obtenerMiLegado(idAdultoMayor: number): Observable<RecuerdoRespondeDTO[]> {
    return this.httpClient.get<RecuerdoRespondeDTO[]>(
      `${this.apiUrl}/adulto/recuerdo/${idAdultoMayor}/mi-legado`,
    );
  }

  toggleFavorito(idRecuerdo: number): Observable<RecuerdoRespondeDTO> {
    return this.httpClient.patch<RecuerdoRespondeDTO>(
      `${this.apiUrl}/recuerdo/${idRecuerdo}/favorito`,
      {},
    );
  }

  exportarRecuerdo(idRecuerdo: number): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/recuerdo/${idRecuerdo}/exportar`);
  }
}
