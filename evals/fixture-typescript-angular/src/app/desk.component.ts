import { Component, signal } from '@angular/core';
import { Visit } from './visit';
import { VisitScreenComponent } from './visit-screen.component';

@Component({
  selector: 'app-desk',
  imports: [VisitScreenComponent],
  template: `
    @for (visit of openVisits(); track visit.id) {
      <app-visit-screen [visit]="visit" />
    }
  `,
})
export class DeskComponent {
  readonly openVisits = signal<readonly Visit[]>([
    { id: 'v-41', patientName: 'Ana Ruiz' },
    { id: 'v-42', patientName: 'Tomas Berg' },
  ]);
}
