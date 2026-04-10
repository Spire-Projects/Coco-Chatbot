import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../shared/components/ui/dialog';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { BranchService } from '../../../shared/services/BranchService';
import type { Branch } from '../../../shared/types/Branch';

interface BranchDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  branch?: Branch | null;
  mode: 'create' | 'edit';
}

interface BranchFormData {
  name: string;
  address: string;
  phone: string;
  salePrefix: string;
}

export const BranchDialog: React.FC<BranchDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  branch,
  mode,
}) => {
  const [formData, setFormData] = useState<BranchFormData>({ name: '', address: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && branch) {
        setFormData({
          name: branch.name,
          address: branch.address ?? '',
          phone: branch.phone ?? '',
          salePrefix: branch.salePrefix ?? '',
        });
      } else {
        setFormData({ name: '', address: '', phone: '', salePrefix: '' });
      }
      setError(null);
    }
  }, [isOpen, mode, branch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'create') {
        const result = await BranchService.create(formData);
        if (result.success) {
          onSuccess();
          onClose();
        } else {
          setError(result.error);
        }
      } else if (mode === 'edit' && branch) {
        const result = await BranchService.update(branch.id, formData);
        if (result.success) {
          onSuccess();
          onClose();
        } else {
          setError(result.error);
        }
      }
    } catch {
      setError('Error procesando la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nueva Sucursal' : 'Editar Sucursal'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Completa la información para crear una nueva sucursal'
              : 'Modifica la información de la sucursal'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre *</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Sucursal Centro"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Input
              id="address"
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Ej: Av. Principal 123"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Teléfono</Label>
            <Input
              id="phone"
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Ej: 591-77712345"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="salePrefix">Prefijo de ventas</Label>
            <Input
              id="salePrefix"
              type="text"
              value={formData.salePrefix}
              onChange={(e) => setFormData({ ...formData, salePrefix: e.target.value.toUpperCase() })}
              placeholder="Ej: AMER (máx. 6 caracteres)"
              maxLength={6}
              disabled={loading}
            />
            <p className="text-xs text-gray-500">
              Se usará como prefijo en el número de venta: AMER-00001
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md text-sm" role="alert">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : mode === 'create' ? 'Crear' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
