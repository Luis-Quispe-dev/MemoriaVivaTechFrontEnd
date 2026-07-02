import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MensajeRespondeDTO } from '../model/mensaje-responde-dto';

@Injectable({
  providedIn: 'root',
})
export class MensajeService {
  private apiUrl = environment.apiUrl;
  private httpClient = inject(HttpClient);

  constructor() {}

  obtenerMensajesPorAsignacion(idAsignacion: number): Observable<MensajeRespondeDTO[]> {
    return this.httpClient.get<MensajeRespondeDTO[]>(
      `${this.apiUrl}/mensajes/asignacion/${idAsignacion}`,
    );
  }

  enviarMensaje(dto: {
    idAsignacion: number;
    contenido: string;
    tipoRemitente: string;
  }): Observable<MensajeRespondeDTO> {
    return this.httpClient.post<MensajeRespondeDTO>(`${this.apiUrl}/mensajes`, dto);
  }

  marcarMensajesComoLeidos(idAsignacion: number): Observable<any> {
    return this.httpClient.patch<any>(
      `${this.apiUrl}/mensajes/asignacion/${idAsignacion}/leidos`,
      {},
    );
  }
}
