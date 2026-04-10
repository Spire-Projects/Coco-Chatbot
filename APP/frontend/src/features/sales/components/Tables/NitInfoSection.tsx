// @ts-nocheck
import type { SaleView } from "@/shared/types/modelTypes/Sale";
import { getNitInfo } from "../../utils/SaleUtils";

interface NitSectionProps {
  sale: SaleView;
}

const NitInfoSection = ({ sale }: NitSectionProps) => {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">
        Información de Facturación
      </h3>
      <div className="space-y-1 text-sm">
        <div>
          <span className="text-gray-600">NIT:</span>{" "}
          <span className="font-medium">{getNitInfo(sale).nit}</span>
        </div>
        <div>
          <span className="text-gray-600">Razón Social:</span>{" "}
          <span className="font-medium">{getNitInfo(sale).socialReason}</span>
        </div>
        <div>
          <span className="text-gray-600">N° Venta:</span>{" "}
          <span className="font-medium font-mono">
            {getNitInfo(sale).invoiceNumber}
          </span>
        </div>
         <div>
          <span className="text-gray-600">Creado por:</span>{" "}
          <span className="font-medium">
            {sale.creatorName ?? sale.sellerName ?? "—"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default NitInfoSection;
