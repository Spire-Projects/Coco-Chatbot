// Ejemplo de cómo usar el sistema de exportación en otras tablas
// Este archivo muestra cómo implementar exportación para una tabla de ventas

import { useCallback } from "react";
import { Download } from "lucide-react";
import { ExportModal } from "@/shared/components/ExportModal";
import { useExcelExport } from "@/shared/hooks/useExcelExport";
import { Button } from "@/shared/components/ui/button";
import type { ExportFieldConfig, DataExtractor } from "@/shared/types/ExportTypes";

// Tipo de ejemplo para ventas
interface Sale {
  id: string;
  date: string;
  customerName: string;
  medicationName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMethod: string;
  sellerId: string;
  status: string;
}

// Función extractora de datos para ventas
const getSalesExport: DataExtractor<Sale> = async (dateRange) => {
  // Aquí iría la lógica para obtener las ventas del rango de fechas
  // Por ejemplo, usando un servicio similar al de medicamentos
  
  try {
    // Simulación de llamada a servicio
    const salesData: Sale[] = [
      {
        id: "sale-1",
        date: "2025-01-15T10:30:00Z",
        customerName: "Juan Pérez",
        medicationName: "Aspirina 500mg",
        quantity: 2,
        unitPrice: 15.50,
        totalAmount: 31.00,
        paymentMethod: "Efectivo",
        sellerId: "user-123",
        status: "Completada"
      }
      // ... más datos
    ];

    // Filtrar por rango de fechas
    const filteredSales = salesData.filter(sale => {
      const saleDate = new Date(sale.date);
      return saleDate >= dateRange.from && saleDate <= dateRange.to;
    });

    return filteredSales;
  } catch (error) {
    console.error('Error getting sales for export:', error);
    throw new Error('Error al obtener datos de ventas para exportación');
  }
};

// Componente de ejemplo para tabla de ventas
export const SalesPageExample = () => {
  // Configuración de campos para exportación de ventas
  const salesExportFields: ExportFieldConfig<Sale>[] = [
    { key: 'date', label: 'Fecha', selected: true, format: (value) => new Date(value).toLocaleDateString() },
    { key: 'customerName', label: 'Cliente', selected: true },
    { key: 'medicationName', label: 'Medicamento', selected: true },
    { key: 'quantity', label: 'Cantidad', selected: true },
    { key: 'unitPrice', label: 'Precio Unitario', selected: true, format: (value) => `$${value.toFixed(2)}` },
    { key: 'totalAmount', label: 'Total', selected: true, format: (value) => `$${value.toFixed(2)}` },
    { key: 'paymentMethod', label: 'Método de Pago', selected: true },
    { key: 'status', label: 'Estado', selected: false },
    { key: 'sellerId', label: 'Vendedor ID', selected: false },
  ];

  // Hook de exportación reutilizable
  const {
    isExporting,
    isModalOpen,
    openExportModal,
    closeExportModal,
    handleExport
  } = useExcelExport({
    title: 'Reporte de Ventas',
    dataExtractor: getSalesExport,
    defaultFields: salesExportFields,
    fileName: 'reporte_ventas',
    getAdditionalMetadata: () => ({
      // Aquí se pueden agregar filtros específicos de ventas
      // paymentMethod: selectedPaymentMethod,
      // sellerId: selectedSeller,
      // etc.
    })
  });

  const handleExportError = useCallback((error: Error) => {
    // Manejar errores de exportación
    console.error('Error al exportar ventas:', error);
    // Aquí podrías mostrar una notificación de error al usuario
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header con botón de exportación */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Ventas</h1>
        <Button 
          variant="outline"
          size="sm"
          onClick={openExportModal}
          disabled={isExporting}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar ventas
        </Button>
      </div>

      {/* Aquí iría tu tabla de ventas */}
      <div>
        {/* Tu componente de tabla de ventas */}
      </div>

      {/* Modal de exportación reutilizable */}
      <ExportModal<Sale>
        open={isModalOpen}
        onOpenChange={closeExportModal}
        title="Exportar Reporte de Ventas"
        fields={salesExportFields}
        onExport={async (config) => {
          try {
            await handleExport(config);
          } catch (error) {
            handleExportError(error as Error);
          }
        }}
        isExporting={isExporting}
      />
    </div>
  );
};

// ================================================================
// OTRO EJEMPLO: Tabla de clientes
// ================================================================

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  registrationDate: string;
  totalPurchases: number;
  lastPurchaseDate: string;
}

const getCustomersExport: DataExtractor<Customer> = async () => {
  // Lógica similar para obtener clientes
  // Filtrar por fecha de registro en el rango especificado
  return []; // Retornar datos de clientes
};

const customerExportFields: ExportFieldConfig<Customer>[] = [
  { key: 'name', label: 'Nombre', selected: true },
  { key: 'email', label: 'Email', selected: true },
  { key: 'phone', label: 'Teléfono', selected: true },
  { key: 'address', label: 'Dirección', selected: false },
  { key: 'registrationDate', label: 'Fecha de Registro', selected: true, format: (value) => new Date(value).toLocaleDateString() },
  { key: 'totalPurchases', label: 'Total Compras', selected: true, format: (value) => `$${value.toFixed(2)}` },
  { key: 'lastPurchaseDate', label: 'Última Compra', selected: false, format: (value) => new Date(value).toLocaleDateString() },
];

export const CustomersPageExample = () => {
  const {
    isExporting,
    isModalOpen,
    openExportModal,
    closeExportModal,
    handleExport
  } = useExcelExport({
    title: 'Lista de Clientes',
    dataExtractor: getCustomersExport,
    defaultFields: customerExportFields,
    fileName: 'lista_clientes'
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Button 
          variant="outline"
          size="sm"
          onClick={openExportModal}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar clientes
        </Button>
      </div>

      {/* Modal de exportación */}
      <ExportModal<Customer>
        open={isModalOpen}
        onOpenChange={closeExportModal}
        title="Exportar Lista de Clientes"
        fields={customerExportFields}
        onExport={handleExport}
        isExporting={isExporting}
      />
    </div>
  );
};
