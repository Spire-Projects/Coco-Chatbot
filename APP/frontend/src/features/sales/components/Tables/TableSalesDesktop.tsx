// @ts-nocheck
import { memo, useEffect, useState } from "react";
import {
  formatDate,
  formatCurrency,
  getPaymentMethodBadge,
} from "../../utils/SaleUtils";
import { toast } from "sonner";

import { SaleNotePreviewModal } from "../SaleNotePreviewModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  ChevronDown,
  ChevronRight,
  Trash2,
  FileText,
  FileCheck,
  Printer,
  Eye,
} from "lucide-react";
import type { SaleView } from "@/shared/types/modelTypes/Sale";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { SaleNotePdfService } from "../../services/SaleNotePdfService";
import { salesService } from "@/shared/services/SalesService";
import ProductPurchasedList from "./ProductPurchasedList";
import ClientInfoSection from "./ClientInfoSection";
import NitInfoSection from "./NitInfoSection";
import { QuotationPdfService } from "../../services/QuotationPdfService";

interface TableSalesDesktopProps {
  sales: SaleView[];
  loading: boolean;
  searchQuery: string;
  onEdit?: (sale: SaleView) => void;
  onDelete?: (sale: SaleView) => void;
}

const TableSalesDesktopComponent = ({
  sales,
  loading,
  searchQuery,
  onEdit,
  onDelete,
}: TableSalesDesktopProps) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isDraft, setIsDraft] = useState<boolean>(false);

  // Nota de venta
  const [showSaleNoteModal, setShowSaleNoteModal] = useState(false);
  const [saleNotePdfUrl, setSaleNotePdfUrl] = useState<string | null>(null);
  const [isGeneratingSaleNote, setIsGeneratingSaleNote] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleView | null>(null);

  // Cotización
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [quotationPdfUrl, setQuotationPdfUrl] = useState<string | null>(null);
  const [isGeneratingQuotation, setIsGeneratingQuotation] = useState(false);
  const [selectedQuotationSale, setSelectedQuotationSale] =
    useState<SaleView | null>(null);

  useEffect(() => {
    setIsDraft(!sales.some((sale) => sale.isDraft));
  }, [sales]);

  const toggleRow = (saleId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(saleId)) {
        newSet.delete(saleId);
      } else {
        newSet.add(saleId);
      }
      return newSet;
    });
  };

  const handleInvoice = async (sale: SaleView) => {
    try {
      await salesService.update(sale.id, { factured: true });
      toast.success("Venta facturada correctamente.");
    } catch (err) {
      toast.error("Error al facturar la venta.");
    }
  };

  // Handler para cotización
  const handlePrintQuotationNote = async (sale: SaleView) => {
    setIsGeneratingQuotation(true);
    setSelectedQuotationSale(sale);
    try {
      // Generar PDF de cotización
      const pdf = await import("../../services/QuotationPdfService").then((m) =>
        m.QuotationPdfService.generateQuotationPdf({ sale })
      );
      const pdfBlob = pdf.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      setQuotationPdfUrl(url);
      setShowQuotationModal(true);
      toast.success("Cotización generada correctamente.");
    } catch (err) {
      toast.error("Error al generar la cotización.");
    } finally {
      setIsGeneratingQuotation(false);
    }
  };

  const handleCloseQuotationModal = () => {
    setShowQuotationModal(false);
    if (quotationPdfUrl) {
      URL.revokeObjectURL(quotationPdfUrl);
      setQuotationPdfUrl(null);
    }
    setSelectedQuotationSale(null);
  };

  const handleDownloadQuotationPdf = () => {
    if (!quotationPdfUrl || !selectedQuotationSale) {
      toast.error("No se pudo descargar el PDF de cotización.");
      return;
    }
    const link = document.createElement("a");
    link.href = quotationPdfUrl;
    link.download = QuotationPdfService.generateFileName(
        selectedQuotationSale.clientView?.name || "Sin cliente"
      );
    link.click();
    toast.success("Descarga de cotización iniciada.");
  };

  const handlePrintSaleNote = async (sale: SaleView) => {
    setIsGeneratingSaleNote(true);
    setSelectedSale(sale);
    try {
      // Generar PDF
      const pdf = SaleNotePdfService.generateSaleNotePdf({
        sale,
        noteNumber: sale.numberInvoice,
      });
      const pdfBlob = pdf.output("blob");
      const url = URL.createObjectURL(pdfBlob);
      setSaleNotePdfUrl(url);
      setShowSaleNoteModal(true);
      toast.success("Nota de venta generada correctamente.");
    } catch (err) {
      toast.error("Error al generar la nota de venta.");
    } finally {
      setIsGeneratingSaleNote(false);
    }
  };

  const handleCloseSaleNoteModal = () => {
    setShowSaleNoteModal(false);
    if (saleNotePdfUrl) {
      URL.revokeObjectURL(saleNotePdfUrl);
      setSaleNotePdfUrl(null);
    }
    setSelectedSale(null);
  };

  const handleDownloadSaleNotePdf = () => {
    if (!saleNotePdfUrl || !selectedSale) {
      toast.error("No se pudo descargar el PDF.");
      return;
    }
    const link = document.createElement("a");
    link.href = saleNotePdfUrl;
    link.download = SaleNotePdfService.generateFileName(
      selectedSale.clientView?.name || "Sin cliente"
    );
    link.click();
    toast.success("Descarga iniciada.");
  };


  return (
    <Card className="hidden md:block">
      <CardHeader>
        <CardTitle>
          {isDraft ? "Lista de Ventas" : "Lista de cotizaciones"}{" "}
        </CardTitle>
        <CardDescription>
          {isDraft
            ? "Administra las ventas realizadas"
            : "Administra las cotizaciones realizadas"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Cargando ventas...</span>
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">
              {searchQuery
                ? `No se encontraron ventas que coincidan con "${searchQuery}"`
                : "No hay ventas registradas"}
            </p>
            <p className="text-sm">
              {searchQuery
                ? "Intenta con otro término de búsqueda"
                : "Comienza registrando tu primera venta"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>
                    {isDraft ? "N° Venta" : "N° Cotización"}
                  </TableHead>
                  <TableHead>Cliente</TableHead>
                  {isDraft && <TableHead>Método Pago</TableHead>}
                  <TableHead className="text-right">Total</TableHead>
                  {isDraft && <TableHead>Facturado</TableHead>}
                  {!isDraft && (
                    <TableHead className="text-right">Acciones</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => {
                  const isExpanded = expandedRows.has(sale.id);
                  return (
                    <Collapsible
                      key={sale.id}
                      open={isExpanded}
                      onOpenChange={() => toggleRow(sale.id)}
                      asChild
                    >
                      <>
                        <TableRow>
                          <TableCell>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-0 h-6 w-6"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </Button>
                            </CollapsibleTrigger>
                          </TableCell>
                          <TableCell className="font-medium text-sm">
                            {formatDate(sale.createdAt)}
                          </TableCell>

                          <TableCell>
                            <span className="font-mono text-sm">
                              {sale.numberInvoice || "N/A"}
                            </span>
                          </TableCell>

                          <TableCell>
                            <span className="text-sm">
                              {sale.clientName || "Sin cliente"}
                            </span>
                          </TableCell>
                          {isDraft && (
                            <TableCell>
                              {(() => {
                                const badge = getPaymentMethodBadge(
                                  sale.paymentMethod
                                );
                                return (
                                  <Badge variant={badge.variant}>
                                    {badge.label}
                                  </Badge>
                                );
                              })()}
                            </TableCell>
                          )}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="font-semibold">
                                {sale.paymentCurrency === 'bob'
                                  ? `Bs ${Number(sale.totalBob ?? 0).toFixed(2)}`
                                  : `$ ${Number(sale.totalUsd ?? 0).toFixed(2)}`}
                              </span>
                              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                                {sale.paymentCurrency === 'bob' ? 'BOB' : 'USD'}
                              </Badge>
                            </div>
                          </TableCell>
                          {isDraft && (
                            <TableCell>
                              {sale.factured ? (
                                <Badge
                                  variant="default"
                                  className="bg-green-600"
                                >
                                  Sí
                                </Badge>
                              ) : (
                                <Badge variant="secondary">No</Badge>
                              )}
                            </TableCell>
                          )}
                          {!isDraft && (
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {onEdit && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onEdit(sale)}
                                    className="h-8 w-8 p-0"
                                    title="Revisar/Editar cotización"
                                  >
                                    <Eye className="h-4 w-4" />
                                    <span className="sr-only">
                                      Revisar/Editar cotización
                                    </span>
                                  </Button>
                                )}
                                {onDelete && !isDraft && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onDelete(sale)}
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    title="Eliminar venta"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                        {/* Fila expandible con detalles de items */}
                        <CollapsibleContent asChild>
                          <TableRow>
                            <TableCell colSpan={9} className="bg-gray-50 p-0">
                              <div className="p-4 space-y-4">
                                {/* Sección de información del cliente */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white rounded-lg border">
                                  <ClientInfoSection sale={sale} />
                                  <NitInfoSection sale={sale} />

                                  <div>
                                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                                      Acciones
                                    </h3>
                                    {isDraft ? (
                                      <div className="flex flex-col gap-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="w-full justify-start"
                                          onClick={() => handleInvoice(sale)}
                                          disabled={sale.factured}
                                        >
                                          <FileCheck className="h-4 w-4 mr-2" />
                                          {sale.factured
                                            ? "Facturado"
                                            : "Facturar Venta"}
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="w-full justify-start"
                                          onClick={() => {
                                            handlePrintSaleNote(sale);
                                          }}
                                        >
                                          <Printer className="h-4 w-4 mr-2" />
                                          Imprimir Nota de Venta
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full justify-start"
                                        onClick={() =>
                                          handlePrintQuotationNote(sale)
                                        }
                                      >
                                        <Printer className="h-4 w-4 mr-2" />
                                        Imprimir Cotización
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {/* Sección de productos vendidos */}
                                <ProductPurchasedList sale={sale} />
                                <div className="flex flex-col w-full justify-end items-end">
                                  <div className="font-semibold text-sm text-gray-700 mb-2">
                                    Resumen
                                  </div>

                                  <div>
                                    <span className="text-gray-600">
                                      Subtotal:
                                    </span>{" "}
                                    <span className="font-medium">
                                      {formatCurrency(
                                        sale.totalWithoutDiscountUsd
                                      )}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">
                                      Descuento:
                                    </span>{" "}
                                    <span className="font-medium">
                                      {formatCurrency(
                                        sale.totalDiscountUsd
                                      )}
                                    </span>
                                  </div>

                                  <div>
                                    <span className="text-gray-600">
                                      Total:
                                    </span>{" "}
                                    <span className="font-bold text-blue-600">
                                      {formatCurrency(
                                        sale.totalUsd
                                      )}
                                    </span>
                                  </div>
                                  {/* Payment currency detail */}
                                  <div className="mt-1 pt-1 border-t text-xs text-gray-500 space-y-0.5">
                                    {sale.paymentCurrency === 'bob' ? (
                                      <div>
                                        <span>Cobrado en Bs: </span>
                                        <span className="font-medium text-gray-700">
                                          {sale.totalBob != null
                                            ? `${Number(sale.totalBob).toFixed(2)} Bs`
                                            : '—'}
                                        </span>
                                      </div>
                                    ) : (
                                      <div>
                                        <span>Cobrado en USD: </span>
                                        <span className="font-medium text-gray-700">
                                          ${Number(sale.totalUsd ?? 0).toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                    {sale.exchangeRateUsed ? (
                                      <div>
                                        <span>TC usado: </span>
                                        <span className="font-medium text-gray-700">
                                          {Number(sale.exchangeRateUsed).toFixed(2)}
                                        </span>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                                {/* Información adicional (notas) */}
                                {sale.saleNotes && (
                                  <div className="pt-3 border-t">
                                    <div className="text-sm">
                                      <span className="text-gray-600 font-semibold">
                                        Notas:
                                      </span>{" "}
                                      <span className="italic">
                                        {sale.saleNotes}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        </CollapsibleContent>
                      </>
                    </Collapsible>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {/* Modal de previsualización de nota de venta */}
      <SaleNotePreviewModal
        open={showSaleNoteModal}
        onClose={handleCloseSaleNoteModal}
        pdfUrl={saleNotePdfUrl}
        onDownload={handleDownloadSaleNotePdf}
    
        isGenerating={isGeneratingSaleNote}
      />
      {/* Modal de previsualización de cotización */}
      <SaleNotePreviewModal
        open={showQuotationModal}
        onClose={handleCloseQuotationModal}
        pdfUrl={quotationPdfUrl}
        onDownload={handleDownloadQuotationPdf}
        isGenerating={isGeneratingQuotation}
      />
    </Card>
  );
};

export const TableSalesDesktop = memo(TableSalesDesktopComponent);
