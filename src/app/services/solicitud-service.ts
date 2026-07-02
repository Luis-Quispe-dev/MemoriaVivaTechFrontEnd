import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AsignacionRespondeDTO } from '../model/asignacion-responde-dto';
import { SolicitudLlamarDTO } from '../model/solicitud-llamar-dto';
import { SolicitudRespondeDTO } from '../model/solicitud-responde-dto';
import { SolicitudRespuestaDTO } from '../model/solicitud-respuesta-dto';
import { AdultoMayorRespuestaDTO } from '../model/adulto-mayor-respuesta-dto';
import { CuidadorRespuestaDTO } from '../model/cuidador-respuesta-dto';

@Injectable({
  providedIn: 'root',
})
export class SolicitudService {
  private apiUrl = environment.apiUrl;
  private httpClient = inject(HttpClient);

  constructor() {}

  crearSolicitud(dto: SolicitudLlamarDTO): Observable<SolicitudRespondeDTO> {
    return this.httpClient.post<SolicitudRespondeDTO>(`${this.apiUrl}/solicitud`, dto);
  }

  responderSolicitud(dto: SolicitudRespuestaDTO): Observable<AsignacionRespondeDTO> {
    return this.httpClient.put<AsignacionRespondeDTO>(`${this.apiUrl}/responder`, dto);
  }

  obtenerPendientesAdulto(idAdultoMayor: number): Observable<SolicitudRespondeDTO[]> {
    return this.httpClient.get<SolicitudRespondeDTO[]>(
      `${this.apiUrl}/adulto/${idAdultoMayor}/pendientes`,
    );
  }

  obtenerPendientesCuidador(idCuidador: number): Observable<SolicitudRespondeDTO[]> {
    return this.httpClient.get<SolicitudRespondeDTO[]>(
      `${this.apiUrl}/cuidador/${idCuidador}/pendientes`,
    );
  }

  obtenerAsignacionActivaAdulto(idAdultoMayor: number): Observable<AsignacionRespondeDTO> {
    return this.httpClient.get<AsignacionRespondeDTO>(
      `${this.apiUrl}/adulto/${idAdultoMayor}/activa`,
    );
  }

  obtenerAsignacionesActivasCuidador(idCuidador: number): Observable<AsignacionRespondeDTO[]> {
    return this.httpClient.get<AsignacionRespondeDTO[]>(
      `${this.apiUrl}/cuidador/${idCuidador}/activas`,
    );
  }

  obtenerCuidadores(): Observable<CuidadorRespuestaDTO[]> {
    return this.httpClient.get<CuidadorRespuestaDTO[]>(`${this.apiUrl}/cuidadores`);
  }

  obtenerAdultosMayores(): Observable<AdultoMayorRespuestaDTO[]> {
    return this.httpClient.get<AdultoMayorRespuestaDTO[]>(
      `${this.apiUrl}/cuidador/adultos-mayores`,
    );
  }

  obtenerDetalleAdultoMayor(idAdultoMayor: number): Observable<AdultoMayorRespuestaDTO> {
    return this.httpClient.get<AdultoMayorRespuestaDTO>(
      `${this.apiUrl}/cuidador/adulto-mayor/${idAdultoMayor}`,
    );
  }
}
