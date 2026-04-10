import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/components/ui/dialog';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { Label } from '../../../shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../shared/components/ui/select';
import { Badge } from '../../../shared/components/ui/badge';
import { Checkbox } from '../../../shared/components/ui/checkbox';
import { UserService } from '../../../shared/services/UserService';
import { BranchService } from '../../../shared/services/BranchService';
import type { AuthUser, UserRole } from '../../../shared/types/User';
import type { Branch } from '../../../shared/types/Branch';

interface UserDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user?: AuthUser | null;
  mode: 'create' | 'edit';
}

interface UserFormData {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
  active: boolean;
}

export const UserDialog: React.FC<UserDialogProps> = ({
  isOpen,
  onClose,
  onSuccess,
  user,
  mode
}) => {
  const [formData, setFormData] = useState<UserFormData>({
    fullName: '',
    email: '',
    password: '',
    role: 'vendedor',
    active: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Branch assignment state (edit mode only) ─────────────────────────────
  const [allBranches, setAllBranches] = useState<Branch[]>([]);
  const [assignedBranchIds, setAssignedBranchIds] = useState<Set<string>>(new Set());
  const [branchesLoading, setBranchesLoading] = useState(false);

  const loadBranchData = useCallback(async (userId: string) => {
    setBranchesLoading(true);
    const [allRes, userRes] = await Promise.all([
      BranchService.getAll(),
      BranchService.getBranchesByUser(userId),
    ]);
    if (allRes.success) setAllBranches(allRes.branches);
    if (userRes.success) {
      setAssignedBranchIds(new Set(userRes.items.map((ub) => ub.branchId)));
    }
    setBranchesLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && user) {
        setFormData({
          fullName: user.fullName,
          email: user.email,
          password: '',
          role: user.role,
          active: user.active
        });
        loadBranchData(user.id);
      } else {
        setFormData({ fullName: '', email: '', password: '', role: 'vendedor', active: true });
        setAllBranches([]);
        setAssignedBranchIds(new Set());
      }
      setError(null);
    }
  }, [isOpen, mode, user, loadBranchData]);

  const handleBranchToggle = async (branchId: string, checked: boolean) => {
    if (!user) return;
    if (checked) {
      const res = await BranchService.assignBranchToUser(user.id, branchId);
      if (res.success) {
        setAssignedBranchIds((prev) => new Set([...prev, branchId]));
      } else {
        setError(res.error ?? 'Error asignando sucursal');
      }
    } else {
      const res = await BranchService.removeBranchFromUser(user.id, branchId);
      if (res.success) {
        setAssignedBranchIds((prev) => { const next = new Set(prev); next.delete(branchId); return next; });
      } else {
        setError(res.error ?? 'Error desasignando sucursal');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'create') {
        const result = await UserService.register({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          role: formData.role
        });

        if (result.success) {
          onSuccess();
          onClose();
        } else {
          setError(result.error || 'Error creando usuario');
        }
      } else if (mode === 'edit' && user) {
        const updateData: any = {
          fullName: formData.fullName,
          email: formData.email,
          role: formData.role,
          active: formData.active
        };

        // Solo incluir contraseña si se proporcionó una nueva
        if (formData.password.trim()) {
          // Aquí necesitarías un método updateUser que maneje el hash de contraseña
          // Por ahora solo actualizamos los otros campos
        }

        const result = await UserService.updateUser(user.id, updateData);

        if (result.success) {
          onSuccess();
          onClose();
        } else {
          setError(result.error || 'Error actualizando usuario');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error procesando la solicitud');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: 'superadmin', label: 'Super Admin' },
    { value: 'admin', label: 'Administrador' },
    { value: 'vendedor', label: 'Vendedor' }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create' 
              ? 'Completa la información para crear un nuevo usuario'
              : 'Modifica la información del usuario'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre completo */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre completo *</Label>
            <Input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="Ej: Juan Pérez"
              required
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="juan.perez@farmaapp.com"
              required
              disabled={loading}
            />
          </div>

          {/* Contraseña */}
          <div className="space-y-2">
            <Label htmlFor="password">
              Contraseña {mode === 'create' ? '*' : '(dejar vacío para mantener actual)'}
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              required={mode === 'create'}
              disabled={loading}
            />
          </div>

          {/* Rol */}
          <div className="space-y-2">
            <Label htmlFor="role">Rol *</Label>
            <Select 
              value={formData.role} 
              onValueChange={(value: UserRole) => setFormData({ ...formData, role: value })}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar rol" />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estado (solo en modo edición) */}
          {mode === 'edit' && (
            <div className="space-y-2">
              <Label htmlFor="active">Estado</Label>
              <Select 
                value={formData.active ? 'active' : 'inactive'} 
                onValueChange={(value: string) => setFormData({ ...formData, active: value === 'active' })}
                disabled={loading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="inactive">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Sucursales asignadas (solo en modo edición) */}
          {mode === 'edit' && (
            <div className="space-y-2">
              <Label>Sucursales asignadas</Label>
              {branchesLoading ? (
                <p className="text-sm text-gray-400">Cargando sucursales...</p>
              ) : allBranches.length === 0 ? (
                <p className="text-sm text-gray-400">No hay sucursales disponibles. Crea una en el panel de Sucursales.</p>
              ) : (
                <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                  {allBranches.map((branch) => (
                    <div key={branch.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`branch-${branch.id}`}
                        checked={assignedBranchIds.has(branch.id)}
                        onCheckedChange={(checked) => handleBranchToggle(branch.id, !!checked)}
                        disabled={loading}
                      />
                      <label
                        htmlFor={`branch-${branch.id}`}
                        className="text-sm cursor-pointer flex items-center gap-1.5 select-none"
                      >
                        {branch.name}
                        {!branch.isActive && (
                          <Badge variant="secondary" className="text-xs py-0">Inactiva</Badge>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              variant="default"
            >
              {loading ? 'Procesando...' : (mode === 'create' ? 'Crear Usuario' : 'Guardar Cambios')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
