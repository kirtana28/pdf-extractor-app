import { Component, ViewChild, ElementRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClarityModule } from '@clr/angular';
import * as pdfjsLib from 'pdfjs-dist';
import { GlobalWorkerOptions, PDFDocumentProxy } from 'pdfjs-dist';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface ExtractedData {
  sNo: number;
  documentNo: string;
  revision: string;
  nameOfDocument: string;
}

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
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor() {
    GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  }

  onImportClick(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
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
      this.errorMessage = 'Please select a PDF file first.';
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
  const entries = text.split(/\[\s*\d+\s*\]/).filter(e => e.trim());
  const extractedDataArray: ExtractedData[] = [];

  console.log(entries);

 
  entries.forEach((entry, index) => {
  const nameMatch = entry.match(/["“”„](.*?)["“”„]/);
  const nxMatch = entry.match(/(?:document\s*no\.?|dokument\s*nr\.?)[:\-]?\s*(\d{5}-e\d{10}|E\d{10}|[A-Z0-9]+_[0-9]+_[A-Z]{2}|[A-Z0-9]+(?:[_\-][A-Z0-9]+)?|\d+[A-Z]{0,9})/i);
  const revisionMatch = entry.match(/\bRevis(?:ion|on)\s*(?:number\s*)?(\d+)/i);
 
    const data: ExtractedData = {
      sNo: index -1,
      documentNo: nxMatch?.[1]?.trim() || '0',
      revision: revisionMatch?.[1]?.trim() || '0',
      nameOfDocument: nameMatch?.[1]?.trim() || '0',
    };

    console.log(data);
    if (!(data.nameOfDocument === '0' && data.documentNo === '0' && data.revision === '0')) {
    extractedDataArray.push(data);
    
  }  });

  return extractedDataArray;
}


  onExportToExcel(): void {
    if (this.extractedData.length === 0) {
      this.errorMessage = 'No data to export.';
      return;
    }

    this.isLoading = true;
    const worksheet = XLSX.utils.json_to_sheet(this.extractedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Extracted Data');
    const excelBuffer: any = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blobData: Blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blobData, 'ExtractedData.xlsx');
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

  trackByFn(index: number, item: ExtractedData): number {
    return item.sNo;
  }
}
