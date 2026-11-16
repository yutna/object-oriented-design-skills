import { bootstrapApplication } from '@angular/platform-browser';
import { DeskComponent } from './app/desk.component';

bootstrapApplication(DeskComponent).catch((error: unknown) => console.error(error));
