import { memo } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/shared/components/ui/table';
import { Button } from '@/shared/components/ui/button';
import { Mail, Phone, MapPin, Edit, Trash2, UserCog } from "lucide-react";
import type { ClientView } from "@/shared/types/Client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";

interface ClientTableProps {
  clients: ClientView[];
  loading: boolean;
  searchQuery: string;
  onEdit?: (client: ClientView) => void;
  onDelete?: (client: ClientView) => void;
}

export const ClientTable = memo<ClientTableProps>(({ clients, loading, searchQuery, onEdit, onDelete }) => {
  return (
    <div className="hidden md:block w-full">
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
          <CardDescription>Administra tu lista de clientes</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <span className="ml-3 text-gray-600">Cargando clientes...</span>
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UserCog className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No hay clientes registrados</p>
              <p className="text-sm">
                {searchQuery
                  ? "No se encontraron clientes con ese criterio"
                  : "Comienza agregando tu primer cliente"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-blue-700">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span>{client.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {client.email || "Sin email"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {client.phone || "Sin teléfono"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          {client.address || "Sin dirección"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit?.(client)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete?.(client)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
});

ClientTable.displayName = "ClientTable";

