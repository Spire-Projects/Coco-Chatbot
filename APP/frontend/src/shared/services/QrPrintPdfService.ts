import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface PrintQrSheetOptions {
  qrValue: string;
  label: string;
  title?: string;
  copies?: number;
  fileName?: string;
}

export class QrPrintPdfService {
  private static readonly DEFAULT_COPIES = 12;
  private static readonly COLUMNS = 3;
  private static readonly ROWS = 4;
  private static readonly PAGE_MARGIN = 10;
  private static readonly GRID_TOP = 24;
  private static readonly GRID_GAP_X = 5;
  private static readonly GRID_GAP_Y = 5;

  static async printQrSheet(options: PrintQrSheetOptions): Promise<void> {
    const { qrValue, label, title, fileName } = options;
    const copies = Math.max(1, options.copies ?? this.DEFAULT_COPIES);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const qrDataUrl = await QRCode.toDataURL(qrValue, {
      width: 512,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
    });

    doc.setDocumentProperties({
      title: title ? `QR ${title}` : `QR ${label}`,
      subject: 'Hoja de impresion de codigos QR',
      creator: 'Apple Land',
    });

    this.addCopies(doc, qrDataUrl, {
      label,
      title,
      copies,
    });

    doc.autoPrint();
    const blobUrl = doc.output('bloburl');
    const printWindow = window.open(blobUrl, '_blank', 'noopener,noreferrer');

    if (!printWindow) {
      doc.save(fileName ?? this.generateFileName(label));
    }
  }

  static generateFileName(label: string): string {
    const safeLabel = label
      .trim()
      .replace(/[^a-zA-Z0-9-_]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'qr';
    return `qr-sheet-${safeLabel}.pdf`;
  }

  private static addCopies(
    doc: jsPDF,
    qrDataUrl: string,
    options: { label: string; title?: string; copies: number },
  ): void {
    const perPage = this.COLUMNS * this.ROWS;

    for (let index = 0; index < options.copies; index += 1) {
      const pageIndex = index % perPage;

      if (pageIndex === 0) {
        if (index > 0) {
          doc.addPage();
        }
        this.addPageHeader(doc, options.title, options.label);
      }

      this.addCopyCard(doc, qrDataUrl, options.label, pageIndex);
    }
  }

  private static addPageHeader(doc: jsPDF, title?: string, label?: string): void {
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(title || 'Hoja de codigos QR', pageWidth / 2, 10, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (label) {
      doc.text(`Codigo: ${label}`, pageWidth / 2, 16, { align: 'center' });
    }

    doc.setDrawColor('#d1d5db');
    doc.line(this.PAGE_MARGIN, 19, pageWidth - this.PAGE_MARGIN, 19);
  }

  private static addCopyCard(doc: jsPDF, qrDataUrl: string, label: string, pageIndex: number): void {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const availableWidth = pageWidth - this.PAGE_MARGIN * 2;
    const availableHeight = pageHeight - this.GRID_TOP - this.PAGE_MARGIN;
    const cardWidth = (availableWidth - this.GRID_GAP_X * (this.COLUMNS - 1)) / this.COLUMNS;
    const cardHeight = (availableHeight - this.GRID_GAP_Y * (this.ROWS - 1)) / this.ROWS;
    const column = pageIndex % this.COLUMNS;
    const row = Math.floor(pageIndex / this.COLUMNS);
    const x = this.PAGE_MARGIN + column * (cardWidth + this.GRID_GAP_X);
    const y = this.GRID_TOP + row * (cardHeight + this.GRID_GAP_Y);
    const qrSize = Math.min(cardWidth - 10, cardHeight - 18, 38);
    const qrX = x + (cardWidth - qrSize) / 2;
    const qrY = y + 6;

    doc.setDrawColor('#d1d5db');
    doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'S');
    doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(label, x + cardWidth / 2, y + cardHeight - 5, {
      align: 'center',
      maxWidth: cardWidth - 6,
    });
  }
}