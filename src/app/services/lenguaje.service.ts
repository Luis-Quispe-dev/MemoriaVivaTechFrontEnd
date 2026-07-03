import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LenguajeService {
  private translateService = inject(TranslateService);

  private idiomaActualSubject = new BehaviorSubject<string>(
    localStorage.getItem('soulstory_lang') || 'Español'
  );
  idioma$ = this.idiomaActualSubject.asObservable();

  constructor() {
    const idiomaInicial = this.idiomaActualSubject.value;
    this.translateService.use(idiomaInicial);
  }

  obtenerIdiomaActual(): string {
    return this.idiomaActualSubject.value;
  }

  establecerIdioma(idioma: string) {
    localStorage.setItem('soulstory_lang', idioma);
    this.idiomaActualSubject.next(idioma);
    this.translateService.use(idioma);
  }

  translate(key: string): string {
    return this.translateService.instant(key);
  }
}
