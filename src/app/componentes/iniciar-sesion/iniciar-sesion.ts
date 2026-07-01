import {Component, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatCardModule} from '@angular/material/card';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {Router, RouterModule} from '@angular/router';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import Swal from 'sweetalert2';
import {UsuarioService} from '../../services/usuario-service';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-iniciar-sesion',
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    ReactiveFormsModule,
    TranslatePipe
  ],
  templateUrl: './iniciar-sesion.html',
  styleUrl: './iniciar-sesion.css',
})
export class IniciarSesion {
  private usuarioService = inject(UsuarioService);
  private configuracionService = inject(ConfiguracionService);
  private lenguajeService = inject(LenguajeService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  cargando = false;

  enviarFormulario() {
    if (this.loginForm.invalid) {
      Swal.fire({
        title: this.lenguajeService.translate('LOGIN.REQUIRED_TITLE') || 'Campos requeridos',
        text: this.lenguajeService.translate('LOGIN.REQUIRED_TEXT') || 'Por favor, ingresa tu correo y contraseña.',
        icon: 'warning',
        confirmButtonText: this.lenguajeService.translate('BOTON.ENTENDIDO') || 'Entendido'
      });
      return;
    }

    this.cargando = true;
    const creds = this.loginForm.getRawValue();

    // El backend espera 'username' (que es el email) y 'password'
    const payload = {
      username: creds.email,
      password: creds.password
    };

    this.usuarioService.iniciarSesion(payload).subscribe({
      next: (respuesta) => {
        console.log("¡Autenticación exitosa!", respuesta);

        // Obtener la configuración del usuario desde el servidor e inicializar idioma/tema/fuente
        this.configuracionService.obtenerConfiguracionUsuario(respuesta.userId).subscribe({
          next: (res) => {
            if (res) {
              const idioma = res.idioma || 'Español';
              const tema = res.temaVisual || 'Claro';
              const fuente = res.tamanioFuente || 'Normal';

              localStorage.setItem('soulstory_lang', idioma);
              localStorage.setItem('soulstory_theme', tema);
              localStorage.setItem('soulstory_font_size', fuente);

              this.lenguajeService.establecerIdioma(idioma);
              this.aplicarAjustesVisuales(tema, fuente);
            }
            this.cargando = false;
            this.mostrarBienvenidaYRedireccionar();
          },
          error: (err) => {
            console.warn("No se pudo cargar la configuración del usuario tras iniciar sesión, usando local defaults:", err);
            this.cargando = false;

            const idioma = localStorage.getItem('soulstory_lang') || 'Español';
            const tema = localStorage.getItem('soulstory_theme') || 'Claro';
            const fuente = localStorage.getItem('soulstory_font_size') || 'Normal';
            this.lenguajeService.establecerIdioma(idioma);
            this.aplicarAjustesVisuales(tema, fuente);

            this.mostrarBienvenidaYRedireccionar();
          }
        });
      },
      error: (err) => {
        this.cargando = false;
        console.error("Error al iniciar sesión", err);
        Swal.fire({
          title: this.lenguajeService.translate('LOGIN.ERROR_TITLE') || 'Error de ingreso',
          text: this.lenguajeService.translate('LOGIN.ERROR_TEXT') || 'Credenciales inválidas. Por favor, verifica tu correo y contraseña.',
          icon: 'error',
          confirmButtonText: this.lenguajeService.translate('LOGIN.TRY_AGAIN') || 'Intentar de nuevo'
        });
      }
    });
  }

  private aplicarAjustesVisuales(tema: string, fuente: string) {
    const body = document.body;
    body.classList.remove('dark-theme', 'high-contrast-theme');
    if (tema === 'Oscuro') {
      body.classList.add('dark-theme');
    } else if (tema === 'Alto Contraste') {
      body.classList.add('high-contrast-theme');
    }

    const htmlEl = document.documentElement;
    if (fuente === 'Normal') {
      htmlEl.style.fontSize = '100%';
    } else if (fuente === 'Grande') {
      htmlEl.style.fontSize = '120%';
    } else if (fuente === 'Gigante') {
      htmlEl.style.fontSize = '140%';
    }
  }

  abrirRecuperarContrasenaModal() {
    const title = this.lenguajeService.translate('LOGIN.RECOVER_PASSWORD') || 'Recuperar Contraseña';
    const emailLabel = this.lenguajeService.translate('LOGIN.RECOVER_EMAIL_LABEL') || 'Correo electrónico registrado';
    const emailPlaceholder = this.lenguajeService.translate('LOGIN.RECOVER_PLACEHOLDER_EMAIL') || 'correo@ejemplo.com';
    const newPwdLabel = this.lenguajeService.translate('LOGIN.RECOVER_NEW_PWD_LABEL') || 'Nueva contraseña (mínimo 6 caracteres)';
    const newPwdPlaceholder = this.lenguajeService.translate('LOGIN.RECOVER_PLACEHOLDER_NEW') || 'Mínimo 6 caracteres';
    const confirmPwdLabel = this.lenguajeService.translate('LOGIN.RECOVER_CONFIRM_PWD_LABEL') || 'Confirmar contraseña';
    const confirmPwdPlaceholder = this.lenguajeService.translate('LOGIN.RECOVER_PLACEHOLDER_CONFIRM') || 'Repite la contraseña';
    const submitText = this.lenguajeService.translate('LOGIN.RECOVER_SUBMIT') || 'Restablecer';
    const cancelText = this.lenguajeService.translate('BOTON.CANCELAR') || 'Cancelar';

    Swal.fire({
      title: title,
      html: `
        <div style="text-align: left; font-family: 'Segoe UI', system-ui, sans-serif; padding: 10px 0;">
          <div style="margin-bottom: 15px;">
            <label style="display: block; font-weight: 700; color: #475569; margin-bottom: 5px;">${emailLabel}</label>
            <input id="recover-email" type="email" class="swal2-input" placeholder="${emailPlaceholder}" style="margin: 0; width: 100%; box-sizing: border-box; border-radius: 8px;">
          </div>
          <div style="margin-bottom: 15px;">
            <label style="display: block; font-weight: 700; color: #475569; margin-bottom: 5px;">${newPwdLabel}</label>
            <input id="recover-new-password" type="password" class="swal2-input" placeholder="${newPwdPlaceholder}" style="margin: 0; width: 100%; box-sizing: border-box; border-radius: 8px;">
          </div>
          <div style="margin-bottom: 15px;">
            <label style="display: block; font-weight: 700; color: #475569; margin-bottom: 5px;">${confirmPwdLabel}</label>
            <input id="recover-confirm-password" type="password" class="swal2-input" placeholder="${confirmPwdPlaceholder}" style="margin: 0; width: 100%; box-sizing: border-box; border-radius: 8px;">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: submitText,
      cancelButtonText: cancelText,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#64748b',
      focusConfirm: false,
      preConfirm: () => {
        const email = (document.getElementById('recover-email') as HTMLInputElement).value.trim();
        const nuevaContrasena = (document.getElementById('recover-new-password') as HTMLInputElement).value;
        const confirmarContrasena = (document.getElementById('recover-confirm-password') as HTMLInputElement).value;

        if (!email || !nuevaContrasena || !confirmarContrasena) {
          Swal.showValidationMessage(this.lenguajeService.translate('LOGIN.RECOVER_VALIDATION_FIELDS') || 'Por favor, completa todos los campos.');
          return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          Swal.showValidationMessage(this.lenguajeService.translate('LOGIN.RECOVER_VALIDATION_EMAIL') || 'Ingresa un correo electrónico válido.');
          return false;
        }

        if (nuevaContrasena.length < 6) {
          Swal.showValidationMessage(this.lenguajeService.translate('LOGIN.RECOVER_VALIDATION_LENGTH') || 'La contraseña debe tener al menos 6 caracteres.');
          return false;
        }

        if (nuevaContrasena !== confirmarContrasena) {
          Swal.showValidationMessage(this.lenguajeService.translate('LOGIN.RECOVER_VALIDATION_MATCH') || 'Las contraseñas no coinciden.');
          return false;
        }

        return { email, nuevaContrasena, confirmarContrasena };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        Swal.showLoading();
        this.usuarioService.recuperarContrasena(result.value).subscribe({
          next: (res) => {
            Swal.close();
            Swal.fire({
              icon: 'success',
              title: title,
              text: this.lenguajeService.translate('LOGIN.RECOVER_SUCCESS') || 'Contraseña restablecida con éxito.',
              confirmButtonColor: '#10b981'
            });
          },
          error: (err) => {
            Swal.close();
            console.error("Error al recuperar contraseña:", err);

            const errMsg = err.error || err.message || 'No se pudo recuperar la contraseña.';
            let finalMsg = errMsg;

            if (errMsg.includes('Email no registrado') || errMsg.includes('Email no encontrado')) {
              finalMsg = this.lenguajeService.translate('PERF.ALERT_ALREADY_VERIFIED_DESC') || 'El correo ingresado no se encuentra registrado.';
            } else if (errMsg.includes('Las contraseñas no coinciden') || errMsg.includes('no coinciden')) {
              finalMsg = this.lenguajeService.translate('LOGIN.RECOVER_VALIDATION_MATCH') || 'Las contraseñas no coinciden.';
            } else if (errMsg.includes('al menos 6 caracteres')) {
              finalMsg = this.lenguajeService.translate('LOGIN.RECOVER_VALIDATION_LENGTH') || 'La contraseña debe tener al menos 6 caracteres.';
            }

            Swal.fire({
              icon: 'error',
              title: this.lenguajeService.translate('REC_TEXTO.SAVE_ERROR_TITLE') || 'Error',
              text: finalMsg,
              confirmButtonColor: '#10b981'
            });
          }
        });
      }
    });
  }

  private mostrarBienvenidaYRedireccionar() {
    const roles = this.usuarioService.obtenerRoles();
    Swal.fire({
      title: this.lenguajeService.translate('LOGIN.WELCOME_TITLE') || '¡Bienvenido de vuelta!',
      text: this.lenguajeService.translate('LOGIN.WELCOME_TEXT') || 'Has ingresado correctamente a SoulStory.',
      icon: 'success',
      timer: 2000,
      showConfirmButton: false
    }).then(() => {
      if (roles.includes('ROLE_CUIDADOR')) {
        this.router.navigate(['/inicio-cuidador']);
      } else {
        this.router.navigate(['/inicio-adulto-mayor']);
      }
    });
  }
}
