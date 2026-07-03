import { Routes } from '@angular/router';
import { LandingPage } from './componentes/landing-page/landing-page';
import { IniciarSesion } from './componentes/iniciar-sesion/iniciar-sesion';
import { SeleccionarCuenta } from './componentes/seleccionar-cuenta/seleccionar-cuenta';
import { RegistrarAdultoMayor } from './componentes/registrar-adulto-mayor/registrar-adulto-mayor';
import { RegistrarCuidador } from './componentes/registrar-cuidador/registrar-cuidador';
import { InicioAdultoMayor } from './componentes/inicio-adulto-mayor/inicio-adulto-mayor';
import { InicioCuidador } from './componentes/inicio-cuidador/inicio-cuidador';
import { RegistrarRecuerdoTexto } from './componentes/registrar-recuerdo-texto/registrar-recuerdo-texto';
import { RegistrarRecuerdoAudio } from './componentes/registrar-recuerdo-audio/registrar-recuerdo-audio';
import { RegistrarRecuerdoFoto } from './componentes/registrar-recuerdo-foto/registrar-recuerdo-foto';
import { VerRecuerdos } from './componentes/ver-recuerdos/ver-recuerdos';
import { GaleriaIa } from './componentes/galeria-ia/galeria-ia';
import { MiLegado } from './componentes/mi-legado/mi-legado';
import { PerfilAdultoMayor } from './componentes/perfil-adulto-mayor/perfil-adulto-mayor';
import { PerfilCuidador } from './componentes/perfil-cuidador/perfil-cuidador';
import { VerPaciente } from './componentes/ver-paciente/ver-paciente';
import { CalendarioAdultoMayor } from './componentes/calendario-adulto-mayor/calendario-adulto-mayor';
import { CalendarioCuidadorInicio } from './componentes/calendario-cuidador-inicio/calendario-cuidador-inicio';
import { CalendarioCuidadorAdultomayor } from './componentes/calendario-cuidador-adultomayor/calendario-cuidador-adultomayor';
import { ConfiguracionAdultoMayor } from './componentes/configuracion-adulto-mayor/configuracion-adulto-mayor';
import { ConfiguracionCuidador } from './componentes/configuracion-cuidador/configuracion-cuidador';
import { AuthGuard } from './guards/auth-guard';
import { EditarAdultoMayor } from './componentes/editar-adulto-mayor/editar-adulto-mayor';
import { EditarCuidador } from './componentes/editar-cuidador/editar-cuidador';
import { SuscripcionAdultomayor } from './componentes/suscripcion-adultomayor/suscripcion-adultomayor';
import { CambiarSuscripcion } from './componentes/cambiar-suscripcion/cambiar-suscripcion';
import { PagoSuscripcion } from './componentes/pago-suscripcion/pago-suscripcion';

export const routes: Routes = [
  // Rutas públicas
  { path: '', component: LandingPage },
  { path: 'iniciar-sesion', component: IniciarSesion },
  { path: 'seleccionar-cuenta', component: SeleccionarCuenta },
  { path: 'registrar-adulto-mayor', component: RegistrarAdultoMayor },
  { path: 'registrar-cuidador', component: RegistrarCuidador },

  // Rutas protegidas para Adulto Mayor
  { path: 'inicio-adulto-mayor', component: InicioAdultoMayor, canActivate: [AuthGuard], data: { roles: ['ROLE_ADULTO_MAYOR'] } },
  { path: 'registrar-recuerdo-texto', component: RegistrarRecuerdoTexto, canActivate: [AuthGuard], data: { roles: ['ROLE_ADULTO_MAYOR'] } },
  { path: 'registrar-recuerdo-audio', component: RegistrarRecuerdoAudio, canActivate: [AuthGuard], data: { roles: ['ROLE_ADULTO_MAYOR'] } },
  { path: 'registrar-recuerdo-foto', component: RegistrarRecuerdoFoto, canActivate: [AuthGuard], data: { roles: ['ROLE_ADULTO_MAYOR'] } },
  { path: 'ver-recuerdos', component: VerRecuerdos, canActivate: [AuthGuard], data: { roles: ['ROLE_ADULTO_MAYOR'] } },
  { path: 'galeria-ia', component: GaleriaIa, canActivate: [AuthGuard], data: { roles: ['ROLE_ADULTO_MAYOR'] } },
  { path: 'mi-legado', component: MiLegado, canActivate: [AuthGuard], data: { roles: ['ROLE_ADULTO_MAYOR'] } },
