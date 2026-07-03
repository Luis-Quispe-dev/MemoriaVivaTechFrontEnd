import { Component } from '@angular/core';
import {CommonModule} from '@angular/common';
import {RouterModule} from '@angular/router';
import {MatCardModule} from '@angular/material/card';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';

@Component({
  selector: 'app-seleccionar-cuenta',
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './seleccionar-cuenta.html',
  styleUrl: './seleccionar-cuenta.css',
})
export class SeleccionarCuenta {
  tipoSeleccionado: string = '';

  seleccionar(tipo: string) {
    if (this.tipoSeleccionado === tipo) {
      this.tipoSeleccionado = '';
    } else {
      this.tipoSeleccionado = tipo;
    }
  }

  get rutaDestino(): string {
    if (this.tipoSeleccionado === 'mayor') {
      return '/registrar-adulto-mayor';
    } else if (this.tipoSeleccionado === 'cuidador') {
      return '/registrar-cuidador';
    }
    return '/';
  }
}
