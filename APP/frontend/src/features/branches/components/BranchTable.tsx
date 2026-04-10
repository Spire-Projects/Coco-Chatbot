import React from 'react';
import { Edit, Trash2, MapPin, Phone, CheckCircle2, XCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../shared/components/ui/table';
import { Button } from '../../../shared/components/ui/button';
import { Badge } from '../../../shared/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../../../shared/components/ui/card';
import type { Branch } from '../../../shared/types/Branch';

interface BranchTableProps {
  branches: Branch[];
  onEdit: (branch: Branch) => void;
  onDelete: (branch: Branch) => void;
  loading?: boolean;
}

export const BranchTable: React.FC<BranchTableProps> = ({
  branches,
  onEdit,
  onDelete,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Desktop */}
      <div className="hidden md:block">
        <Card className="border-none shadow-none">
          <CardHeader>
            <CardTitle>Lista de Sucursales</CardTitle>
            <CardDescription>Administra las sucursales del sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NOMBRE</TableHead>
                  <TableHead>DIRECCIÓN</TableHead>
                  <TableHead>TELÉFONO</TableHead>
                  <TableHead>ESTADO</TableHead>
                  <TableHead className="w-28">ACCIONES</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                      No hay sucursales registradas
                    </TableCell>
                  </TableRow>
                ) : (
                  branches.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium">{branch.name}</TableCell>
                      <TableCell>
                        {branch.address ? (
                          <span className="flex items-center gap-1 text-gray-600">
                            <MapPin size={14} />
                            {branch.address}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {branch.phone ? (
                          <span className="flex items-center gap-1 text-gray-600">
                            <Phone size={14} />
                            {branch.phone}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {branch.isActive ? (
                          <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">
                            <CheckCircle2 size={12} className="mr-1" />
                            Activa
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle size={12} className="mr-1" />
                            Inactiva
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(branch)}
                            className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Edit size={15} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(branch)}
                            className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3 p-3">
        {branches.length === 0 ? (
          <p className="text-center py-8 text-gray-400 text-sm">No hay sucursales registradas</p>
        ) : (
          branches.map((branch) => (
            <Card key={branch.id} className="shadow-sm">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold text-gray-900">{branch.name}</span>
                  {branch.isActive ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">Activa</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Inactiva</Badge>
                  )}
                </div>
                {branch.address && (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <MapPin size={13} />
                    {branch.address}
                  </p>
                )}
                {branch.phone && (
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <Phone size={13} />
                    {branch.phone}
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => onEdit(branch)} className="flex-1">
                    <Edit size={14} className="mr-1" /> Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDelete(branch)}
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 size={14} className="mr-1" /> Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
