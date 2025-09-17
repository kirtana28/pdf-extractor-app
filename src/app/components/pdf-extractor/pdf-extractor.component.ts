import { Component, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClarityModule } from '@clr/angular';
import * as pdfjsLib from 'pdfjs-dist';
import { GlobalWorkerOptions, PDFDocumentProxy } from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { log } from 'node:console';
import { ExtractedData } from 'src/app/models/ExtractedData.model';



@Component({
  selector: 'app-pdf-extractor',
  standalone: true,
  imports: [CommonModule, FormsModule, ClarityModule],
  templateUrl: './pdf-extractor.component.html',
  styleUrls: ['./pdf-extractor.component.css'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PdfExtractorComponent {
  @ViewChild('fileInput', { static: false }) fileInput!: ElementRef;
  selectedFile: File | null = null;
  extractedData: ExtractedData[] = [];
  isParsing = false;
  isLoading: boolean = false;
  errorMessage = '';
  errormessage1 = '';
  successMessage = '';
  fileName: string = '';
  danger1: boolean = false;


  constructor() {
    GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }

  onImportClick(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.fileName = file?.name || '';
    if (file && file.type === 'application/pdf') {
      this.selectedFile = file;
      this.errorMessage = '';
      this.successMessage = '';
      this.extractedData = [];
    } else {
      this.errorMessage = 'Please select a valid PDF file.';
      this.selectedFile = null;
    }
  }

  async onParsePdf(): Promise<void> {
    if (!this.selectedFile) {
      // this.errorMessage = 'No file selected.';
      return;
    }

    this.isParsing = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const arrayBuffer = await this.selectedFile.arrayBuffer();
      const pdf: PDFDocumentProxy = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let textContent = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str).join(' ');
        textContent += strings + '\n';
      }
      console.log(textContent, 'textContent');

      this.extractedData = this.extractDetails(textContent);
      this.successMessage = `Successfully extracted ${this.extractedData.length} unique documents.`;
    } catch (error) {
      this.errorMessage = 'An unexpected error occurred during PDF parsing.';
      console.error(error);
    } finally {
      this.isParsing = false;
    }
  }

  private extractDetails(text: string): ExtractedData[] {
    let serial = 1;
    const entries = text.split(/\[\s*\d+\s*\]/).filter(e => e.trim());
    console.log(entries, 'entries text');
    const extractedDataArray: ExtractedData[] = [];


    entries.forEach((entry, index) => {

      const nameMatch = entry.match(/["“”„](.*?)["“”„]/);
      // const nxMatch = entry.match(/(document\s*no\.?:\s*([^+,\s]+)|document no\.?\s*[:\-]?\s*([^\s,]+)|\s*Nr\.?\s*[:\-]?\s*([A-Z0-9\-]{6,})|drawing\s*no\.?\s*[:\-]?\s*([^\s,]+))/i);
      // const nxMatch = entry.match(/(?:document\s*no\.?|dokument\s*nr\.?)[:\-]?\s*(\d{5}-e\d{10}|E\d{10}|[A-Z0-9]+_[0-9]+_[A-Z]{2}|[A-Z0-9]+(?:[_\-][A-Z0-9]+)?|\d+[A-Z]{0,9})/i);
      const nxMatch = entry.match(/(?:document\s*no\.?|project\s*no\.?|drawing\s*no\.?|dokument\s*nr\.?|zulassungsnr\.?|zulassungs\-nr\.?|zeichnung\s*nr\.?|Dokument\s*Nr\.?)\s*[:\-]?\s*([A-Za-z0-9\/\.\-_ ]*\d{2,}[A-Za-z0-9\/\.\-_ ]*)\)?/i);
      // const revisionMatch = entry.match(/\bRevis(?:ion|on)\s*(?:number\s*)?(\d+)/i);
      const revisionMatch = entry.match(/\bRev(?:ision|\.i|\.a)?\.?\s*(\w+)\b/i);

      console.log('Entry:', nxMatch);
      const data: ExtractedData = {
        SNo: serial,
        DocumentNo: nxMatch?.[1]?.trim() || nxMatch?.[2]?.trim() || '0',
        Revision: revisionMatch?.[1]?.trim() || '0',
        NameOfDocument: nameMatch?.[1]?.trim() || '0',
      };
      debugger;

      console.log("datsess",data);
      if (data.DocumentNo !== '0' && data.NameOfDocument !== '0') {
        extractedDataArray.push(data);
        this.danger1 = false;
        serial++;

      }
    });

    if (extractedDataArray.length === 0) {
      this.danger1 = true;
      this.errormessage1 = 'No relevent data found, Please upload valid PDF';
    }

    return extractedDataArray;
  }


  // onExportToExcel(): void {
  //   if (this.extractedData.length === 0) {
  //     this.errorMessage = 'No data to export.';
  //     return;
  //   }

  //   this.isLoading = true;
  //   const worksheet = XLSX.utils.json_to_sheet(this.extractedData);
  //   const workbook = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(workbook, worksheet, 'Extracted Data');
  //   const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  //   const blobData: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
  //   saveAs(blobData, 'ExtractedData.xlsx');
  //   this.isLoading = false;
  // }

  onExportToExcel(): void {
    if (this.extractedData.length === 0) {
      this.errorMessage = 'No data to export.';
      return;
    }

    this.isLoading = true;
    //rename 
    const renamedata = this.extractedData.map(item => ({
      'S.No': item.SNo,
      'Document No': item.DocumentNo,
      'Revision': item.Revision,
      'Name of Document': item.NameOfDocument,
    }));
    ;

    const worksheet = XLSX.utils.json_to_sheet(renamedata);

    // Autofit columns with type-safe access
    const keys = Object.keys(this.extractedData[0]) as (keyof ExtractedData)[];
    const columnWidths = keys.map((key) => {
      const maxLength = Math.max(
        key.length,
        ...this.extractedData.map((row) => {
          const value = row[key];
          return value ? value.toString().length : 0;
        })
      );
      return { wch: maxLength + 2 }; // Add padding
    });

    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Extracted Data');

    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blobData: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

    const baseName = this.fileName ? this.fileName.replace(/\.pdf$/i, '') : 'ExtractedData';
    saveAs(blobData, `${baseName}.xlsx`);

    this.isLoading = false;
  }



  onReset(): void {
    this.selectedFile = null;
    this.extractedData = [];
    this.errorMessage = '';
    this.successMessage = '';
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  trackByFn(index: number, item: ExtractedData): any {
    return item.SNo || index, item.DocumentNo || index;
  }
}
