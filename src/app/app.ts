import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('MemoriaVivaTechFrontEnd');

  ngOnInit() {
    const tema = localStorage.getItem('soulstory_theme') || 'Claro';
    let fuente = localStorage.getItem('soulstory_font_size') || 'Normal';

    // Si estaba guardado como Grande debido al comportamiento previo por defecto, lo restablecemos a Normal
    if (fuente === 'Grande') {
      fuente = 'Normal';
      localStorage.setItem('soulstory_font_size', 'Normal');
    }

    this.aplicarAjustesVisuales(tema, fuente);
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
}
