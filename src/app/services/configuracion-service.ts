import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ConfiguracionService {
  private apiUrl = environment.apiUrl;
  private httpClient = inject(HttpClient);

  constructor() { }

  obtenerConfiguracionUsuario(idUsuario: number): Observable<any> {
    return this.httpClient.get<any>(`${this.apiUrl}/configuracion/usuario/${idUsuario}`);
  }

  guardarConfiguracion(dto: any): Observable<any> {
    return this.httpClient.put<any>(`${this.apiUrl}/configuracion/guardar`, dto);
  }
}
