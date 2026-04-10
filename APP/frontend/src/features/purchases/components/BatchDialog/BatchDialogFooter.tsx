import React, { memo } from 'react';
import { Button } from '../../../../shared/components/ui/button';

interface BatchDialogFooterProps {
  mode: 'create' | 'edit';
  loading: boolean;
  onClose: () => void;
}

const BatchDialogFooter: React.FC<BatchDialogFooterProps> = ({
  mode,
  loading,
  onClose
}) => {
  return (
    <div className="flex justify-end gap-3 pt-6 border-t">
      <Button type="button" variant="outline" onClick={onClose}>
        Cancelar
      </Button>
      <Button type="submit" disabled={loading}>
        {loading ? 'Guardando...' : (mode === 'create' ? 'Crear Lote' : 'Actualizar Lote')}
      </Button>
    </div>
  );
};

export default memo(BatchDialogFooter);
