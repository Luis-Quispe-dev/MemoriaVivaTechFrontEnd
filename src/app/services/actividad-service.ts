import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ActividadService {
  private apiUrl = environment.apiUrl;
  private httpClient = inject(HttpClient);

  constructor() { }

  obtenerActividadesPorAsignacion(idAsignacion: number): Observable<any[]> {
    return this.httpClient.get<any[]>(`${this.apiUrl}/asignacion/actividades/${idAsignacion}`);
  }

  crearActividad(dto: any): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/actividad/registrar`, dto);
  }

  editarActividad(idActividad: number, dto: any): Observable<any> {
    return this.httpClient.put<any>(`${this.apiUrl}/actividad/editar/${idActividad}`, dto);
  }

  eliminarActividad(idActividad: number): Observable<void> {
    return this.httpClient.delete<void>(`${this.apiUrl}/${idActividad}`);
  }
}
