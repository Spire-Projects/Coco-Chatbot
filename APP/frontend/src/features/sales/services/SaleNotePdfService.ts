// @ts-nocheck
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { SaleView } from '@/shared/types/modelTypes/Sale';
import { logoBase64 } from '@/assets/logoBase64';

interface SaleNotePdfOptions {
  sale: SaleView;
  noteNumber?: string;
}

export class SaleNotePdfService {
  private static readonly BUSINESS_NAME = 'Apple Land';
  private static readonly COLORS = {
    primary: '#0095eb',
    secondary: '#64748b',
    text: '#1e293b',
    lightGray: '#f1f5f9',
    border: '#e5e7eb',
  };

  static generateSaleNotePdf(options: SaleNotePdfOptions): jsPDF {
    const { sale, noteNumber = 'NOTA-001' } = options;
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;

    this.addHeader(doc, pageWidth, margin, noteNumber);
    this.addClientInfo(doc, sale, margin);
    this.addProductsTable(doc, sale);
    this.addTotalsSummary(doc, sale, pageWidth, margin);
    this.addFooter(doc, pageWidth);
    return doc;
  }

  private static addHeader(doc: jsPDF, pageWidth: number, margin: number, numberInvoice: string): void {
    doc.setFontSize(18);
    doc.setTextColor(this.COLORS.text);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTA DE VENTA', pageWidth / 2, 20, { align: 'center' });
    doc.text(`N°: ${numberInvoice}`, pageWidth - margin, 20, { align: 'right' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(this.BUSINESS_NAME, pageWidth / 2, 28, { align: 'center' });
    doc.setDrawColor(this.COLORS.border);
    doc.setLineWidth(0.5);
    doc.line(margin, 32, pageWidth - margin, 32);
    doc.addImage(logoBase64, 'PNG', margin, 10, 40, 20);
  }

  private static addClientInfo(doc: jsPDF, sale: SaleView, margin: number): void {
  doc.setFontSize(10);
  doc.setTextColor(this.COLORS.text);
  let y = 38;
  const lineYSpacing = 7;
  // Obtener datos del cliente
  const client = sale.clientView;
  const clientName = client?.name || sale.socialReasonClient || 'N/A';
  const clientEmail = client?.email || 'N/A';
  const clientPhone = client?.phone || 'N/A';
  const clientAddress = client?.address || 'N/A';
  // Etiquetas y datos
  doc.text('Nombre del cliente:', margin, y);
  doc.text(clientName, margin + 45, y);
  y += lineYSpacing;
  doc.text('Email:', margin, y);
  doc.text(clientEmail, margin + 45, y);
  y += lineYSpacing;
  doc.text('Teléfono:', margin, y);
  doc.text(clientPhone, margin + 45, y);
  y += lineYSpacing;
  doc.text('Dirección:', margin, y);
  doc.text(clientAddress, margin + 45, y);
  }

  private static addProductsTable(doc: jsPDF, sale: SaleView): void {
    const tableData = sale.items.map((item, idx) => [
      (idx + 1).toString(),
      item.productName,
      item.quantity.toString(),
      this.formatCurrency(item.unitPrice, sale.paymentCurrency),
      this.formatCurrency(item.total, sale.paymentCurrency),
    ]);
    autoTable(doc, {
      startY: 55,
      head: [['#', 'CONCEPTO', 'CANT', 'PRECIO', 'IMPORTE']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: this.COLORS.primary,
        textColor: '#fff',
        fontSize: 10,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 9,
        textColor: this.COLORS.text,
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 25 },
        4: { halign: 'right', cellWidth: 25 },
      },
      alternateRowStyles: {
        fillColor: this.COLORS.lightGray,
      },
    });
  }

  private static addTotalsSummary(doc: jsPDF, sale: SaleView, pageWidth: number, margin: number): void {
    const finalY = (doc as any).lastAutoTable.finalY || 120;
    let y = finalY + 8;
    const rightAlign = pageWidth - margin;
    const labelX = rightAlign - 50;
    const valueX = rightAlign;
    doc.setFontSize(10);
    doc.setTextColor(this.COLORS.text);
    // Calcular subtotal: usar totalWithoutDiscount si existe, si no, sumar los totales de los items
    const subtotal = typeof sale.totalWithoutDiscount === 'number'
      ? sale.totalWithoutDiscount
      : sale.items.reduce((acc, item) => acc + item.total, 0);
    doc.text('SUBTOTAL:', labelX, y, { align: 'right' });
    doc.text(this.formatCurrency(subtotal, sale.paymentCurrency), valueX, y, { align: 'right' });
    y += 6;
    doc.text('TOTAL:', labelX, y, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(this.formatCurrency(sale.total, sale.paymentCurrency), valueX, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
  }

  private static addFooter(doc: jsPDF, pageWidth: number): void {
    const pageHeight = doc.internal.pageSize.getHeight();
    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setTextColor(this.COLORS.secondary);
    doc.setFont('helvetica', 'italic');
    console.log('--- footerY ---', footerY,pageWidth);
    //doc.text('[DIRECCIÓN, TELÉFONO, EMAIL]', pageWidth / 2, footerY, { align: 'center' });
  }

  private static formatCurrency(amount: number, currency: 'bs' | 'arg'): string {
    const symbol = currency === 'bs' ? 'Bs' : 'ARS';
    return `${symbol} ${amount.toFixed(2)}`;
  }

  static generateFileName(clientName?: string): string {
    const date = new Date().toISOString().split('T')[0];
    const client = clientName ? clientName.replace(/\s+/g, '_') : 'Cliente_General';
    return `NotaVenta_${client}_${date}.pdf`;
  }
}
