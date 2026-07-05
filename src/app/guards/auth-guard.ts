import { Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { Observable } from 'rxjs';
import { UsuarioService } from '../services/usuario-service';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private router: Router,
    private usuarioService: UsuarioService
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    const token = this.usuarioService.obtenerToken();
    if (token == null) {
      Swal.fire({
        title: 'Acceso Restringido',
        text: 'Por favor, inicia sesión para continuar.',
        icon: 'warning',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#6200ea'
      });
      this.router.navigate(['/iniciar-sesion']);
      return false;
    }

    const expectedRoles = route.data['roles'] as Array<string>;
    if (expectedRoles) {
      const userRoles = this.usuarioService.obtenerRoles();
      const hasRole = expectedRoles.some(role => userRoles.includes(role));
      if (!hasRole) {
        Swal.fire({
          title: 'Sin Autorización!!',
          text: 'No tienes el rol requerido para acceder a esta sección.',
          icon: 'error',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#6200ea'
        });
        if (userRoles.includes('ROLE_CUIDADOR')) {
          this.router.navigate(['/inicio-cuidador']);
        } else if (userRoles.includes('ROLE_ADULTO_MAYOR')) {
          this.router.navigate(['/inicio-adulto-mayor']);
        } else {
          this.router.navigate(['/iniciar-sesion']);
        }
        return false;
      }
    }

    return true;
  }
}
