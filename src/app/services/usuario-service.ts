import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private apiUrl = environment.apiUrl;
  private httpClient = inject(HttpClient);

  constructor() { }

  registrarAdultoMayor(datosUsuario: any): Observable<any> {
    return this.httpClient.post(`${this.apiUrl}/adulto-mayor`, datosUsuario);
  }

  registrarCuidador(datosUsuario: any): Observable<any> {
    return this.httpClient.post(`${this.apiUrl}/cuidador`, datosUsuario);
  }

  iniciarSesion(credenciales: any): Observable<any> {
    return this.httpClient.post<any>(`${this.apiUrl}/authenticate`, credenciales).pipe(
      tap(respuesta => {
        if (respuesta && respuesta.jwt) {
          localStorage.setItem('token', respuesta.jwt);
          localStorage.setItem('roles', JSON.stringify(respuesta.roles));
          localStorage.setItem('userId', respuesta.userId.toString());
          localStorage.setItem('email', respuesta.email);
          localStorage.setItem('nombreCompleto', respuesta.nombreCompleto);
          localStorage.setItem('username', credenciales.username); // Guardar email
          localStorage.setItem('fotoPerfil', respuesta.contenidoFoto || '');
        }
      })
    );
  }

  obtenerToken(): string | null {
    return localStorage.getItem('token');
  }

  obtenerRoles(): string[] {
    const roles = localStorage.getItem('roles');
    return roles ? JSON.parse(roles) : [];
  }

  obtenerUserId(): number | null {
    const id = localStorage.getItem('userId');
    return id ? parseInt(id, 10) : null;
  }

  obtenerEmail(): string | null {
    return localStorage.getItem('email');
  }

  obtenerNombreCompleto(): string | null {
    return localStorage.getItem('nombreCompleto');
  }

  obtenerFotoPerfil(): string | null {
    return localStorage.getItem('fotoPerfil');
  }

  obtenerUsuarioLogueado(): string | null {
    return localStorage.getItem('username');
  }

  editarAdultoMayor(id: number, datos: any): Observable<any> {
    return this.httpClient.put(`${this.apiUrl}/adulto-mayor/${id}`, datos);
  }

  editarCuidador(id: number, datos: any): Observable<any> {
    return this.httpClient.put(`${this.apiUrl}/cuidador/${id}`, datos);
  }

  obtenerCuidadorPorId(id: number): Observable<any> {
    return this.httpClient.get(`${this.apiUrl}/cuidador/${id}`);
  }

  recuperarContrasena(dto: any): Observable<any> {
    return this.httpClient.put(`${this.apiUrl}/recuperar-contrasena`, dto, { responseType: 'text' });
  }

  cerrarSesion(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('roles');
    localStorage.removeItem('userId');
    localStorage.removeItem('email');
    localStorage.removeItem('nombreCompleto');
    localStorage.removeItem('username');
    localStorage.removeItem('fotoPerfil');
  }

  estaLogueado(): boolean {
    return !!this.obtenerToken();
  }
}
