import { Pipe, PipeTransform, inject } from '@angular/core';
import { LenguajeService } from '../services/lenguaje.service';

@Pipe({
  name: 'translate',
  pure: false
})
export class TranslatePipe implements PipeTransform {
  private lenguajeService = inject(LenguajeService);

  transform(key: string): string {
    return this.lenguajeService.translate(key);
  }
}
