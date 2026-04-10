// @ts-nocheck
import type { SaleView } from "@/shared/types/modelTypes/Sale";
import { getClientInfo } from "../../utils/SaleUtils";

interface ClientInfoSectionProps {
  sale: SaleView;
}

const ClientInfoSection = ({ sale }: ClientInfoSectionProps) => {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">
        Información del Cliente
      </h3>
      <div className="space-y-1 text-sm">
        <div>
          <span className="text-gray-600">Nombre:</span>{" "}
          <span className="font-medium">
            {getClientInfo(sale).name}
          </span>
        </div>
        <div>
          <span className="text-gray-600">Correo:</span>{" "}
          <span className="font-medium">
            {getClientInfo(sale).email}
          </span>
        </div>
        <div>
          <span className="text-gray-600">Teléfono:</span>{" "}
          <span className="font-medium">
            {getClientInfo(sale).phone}
          </span>
        </div>
         <div>
          <span className="text-gray-600">Dirección:</span>{" "}
          <span className="font-medium">
            {sale.clientView?.address || "-"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ClientInfoSection;
