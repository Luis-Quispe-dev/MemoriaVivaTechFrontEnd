import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SuscripcionService {
  private apiUrl = environment.apiUrl;
  private httpClient = inject(HttpClient);

  constructor() {}

  obtenerSuscripcionActivaAdulto(idAdultoMayor: number): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/suscripciones/adulto/${idAdultoMayor}/activa`);
  }

  listarPlanes(): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/suscripciones/planes`);
  }

  pagar(dto: any): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/suscripciones/pagar`, dto);
  }

  obtenerHistorialPagos(idAdultoMayor: number): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/suscripciones/adulto/${idAdultoMayor}/pagos`);
  }
}
