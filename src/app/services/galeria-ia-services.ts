import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { GaleriaIAGenerarLlamadoDTO } from '../model/galeria-ia-generar-llamado-dto';
import { GaleriaIAGenerarRespuestaDTO } from '../model/galeria-ia-generar-respuesta-dto';
import { GaleriaIALlamadoDTO } from '../model/galeria-ia-llamado-dto';
import { GaleriaIARespondeDTO } from '../model/galeria-ia-responde-dto';


@Injectable({
  providedIn: 'root',
})
export class GaleriaIaService {
  private apiUrl = `${environment.apiUrl}/galeria_ia`;
  private httpClient = inject(HttpClient);

  constructor() {}

  generarImagen(dto: GaleriaIAGenerarLlamadoDTO): Observable<GaleriaIAGenerarRespuestaDTO> {
    return this.httpClient.post<GaleriaIAGenerarRespuestaDTO>(`${this.apiUrl}/generar`, dto);
  }

  guardarImagen(dto: GaleriaIALlamadoDTO, urlImagen: string): Observable<GaleriaIARespondeDTO> {
    return this.httpClient.post<GaleriaIARespondeDTO>(`${this.apiUrl}/guardar?urlImamgen=${encodeURIComponent(urlImagen)}`, dto);
  }

  obtenerGaleria(idAdultoMayor: number): Observable<GaleriaIARespondeDTO[]> {
    return this.httpClient.get<GaleriaIARespondeDTO[]>(`${this.apiUrl}/adulto/${idAdultoMayor}`);
  }

  obtenerPorId(idRetratoIa: number): Observable<GaleriaIARespondeDTO> {
    return this.httpClient.get<GaleriaIARespondeDTO>(`${this.apiUrl}/buscar/${idRetratoIa}`);
  }

  borrarImagen(idRetratoIa: number): Observable<void> {
    return this.httpClient.delete<void>(`${this.apiUrl}/borrar/${idRetratoIa}`);
  }
}
