import { Component, input } from '@angular/core';
import { Visit } from './visit';

@Component({
  selector: 'app-visit-screen',
  template: `<section><h2>{{ visit().patientName }}</h2></section>`,
})
export class VisitScreenComponent {
  readonly visit = input.required<Visit>();
}
