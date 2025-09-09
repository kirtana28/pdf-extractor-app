import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { routes } from './app.routes';
//import { PdfParserService } from './services/pdf-parser.service';
//import { ExcelExportService } from './services/excel-export.service';
export const appConfig: ApplicationConfig = {
 providers: [
   provideRouter(routes),
   importProvidersFrom(BrowserAnimationsModule, FormsModule, HttpClientModule),
   //PdfParserService,
   //ExcelExportService
 ]
};