import { HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { catchError, EMPTY, throwError } from 'rxjs';
import Swal from 'sweetalert2';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  console.log("Intercepto!!");
  const token = localStorage.getItem('token');
  console.log("Token recuperado:", token);
  let authReq = req;

  // Clona la solicitud y añade el encabezado de autorización
  if (token) {
    authReq = req.clone({
      withCredentials: true, // ojo add
      headers: req.headers.set('Authorization', "Bearer " + token)
    });
    console.log("Se terminó de clonar la solicitud");
  }

  return next(authReq).pipe(
    catchError(error => {
      console.log("Error en la petición", error);
      if (error.status === HttpStatusCode.Forbidden) {
        Swal.fire({
          title: 'Acceso Denegado',
          text: 'No tienes los permisos necesarios para realizar esta petición.',
          icon: 'error',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#6200ea'
        });
        return EMPTY;
      } else {
        return throwError(() => error);
      }
    })
  );
};
