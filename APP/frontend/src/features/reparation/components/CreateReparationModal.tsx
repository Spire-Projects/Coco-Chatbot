import { memo, useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { toast } from "sonner";
import { FilterTabs } from "@/shared/components/FilterTabs";
import type { Client } from "@/shared/types/Client";
import type { CreateReparationData, UpdateReparationData, ReparationView, StatusReparation, GraphPattern } from "@/shared/types/modelTypes/Reparation";
import { reparationService } from "@/shared/services/ReparationService";
import { clientService } from "@/shared/services";
import CreatableSelect from "@/shared/components/CreatableSelect";
import GraphPatternInput from "@/shared/components/GraphPatternInput";
import { ClientFormDialog } from "@/features/sales/components/SaleSection/ClientFormDialog";
import { Wrench, Eye, EyeOff, Plus } from "lucide-react";

interface CreateReparationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  createdBy: string;
  reparationToEdit?: ReparationView | null;
}

// Estados predefinidos que el equipo puede tener al recibirlo
const PREDEFINED_STATES = [
  "Pantalla rota",
  "Batería inflada",
  "No enciende",
  "Botones dañados",
  "Puerto de carga defectuoso",
  "Altavoz no funciona",
  "Micrófono no funciona",
  "Cámara defectuosa",
  "Problemas de red/señal",
  "Sobrecalentamiento",
  "Líquido derramado",
  "Golpeado/abollado",
  "Rayones o marcas",
  "Con accesorios (cargador, funda, etc.)",
  "Sin accesorios",
];

const CreateReparationModal = memo(({
  isOpen,
  onClose,
  onSuccess,
  createdBy,
  reparationToEdit,
}: CreateReparationModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [initialClients, setInitialClients] = useState<Client[]>([]);
  const [showCreateClientDialog, setShowCreateClientDialog] = useState(false);

  // Form fields
  const [model, setModel] = useState("");
  const [description, setDescription] = useState("");
  const [totalCost, setTotalCost] = useState<string>("");
  const [advanceAmount, setAdvanceAmount] = useState<string>("");
  const [status, setStatus] = useState<StatusReparation>("repairing");
  
  // Arrays
  const [selectedStates, setSelectedStates] = useState<string[]>([]);
  const [customState, setCustomState] = useState("");
  
  // Password
  const [passwordType, setPasswordType] = useState<"text" | "pattern" | "none">("none");
  const [textPassword, setTextPassword] = useState("");
  const [patternPassword, setPatternPassword] = useState<GraphPattern>([]);
  const [showPassword, setShowPassword] = useState(false);

  // Cargar clientes iniciales
  useEffect(() => {
    if (isOpen) {
      const fetchInitialClients = async () => {
        try {
          const response = await clientService.getAllView(1, 10);
          setInitialClients(response.items);
        } catch (error) {
          console.error("Error cargando clientes iniciales:", error);
        }
      };
      fetchInitialClients();
    }
  }, [isOpen]);

  // Cargar datos de reparación si es edición
  useEffect(() => {
    if (reparationToEdit && isOpen) {
      setModel(reparationToEdit.model);
      setDescription(reparationToEdit.description);
      setTotalCost(reparationToEdit.totalCost.toString());
      setAdvanceAmount(reparationToEdit.advanceAmount.toString());
      setStatus(reparationToEdit.status);
      setSelectedStates(reparationToEdit.stateReceived || []);
      
      if (reparationToEdit.clientData) {
        setSelectedClient(reparationToEdit.clientData);
      }

      // Cargar password
      if (reparationToEdit.password) {
        if (typeof reparationToEdit.password === "string") {
          setPasswordType("text");
          setTextPassword(reparationToEdit.password);
        } else {
          setPasswordType("pattern");
          setPatternPassword(reparationToEdit.password as GraphPattern);
        }
      } else {
        setPasswordType("none");
      }
    }
  }, [reparationToEdit, isOpen]);

  // Función de búsqueda de clientes
  const searchClientsFunction = async (query: string): Promise<Client[]> => {
    if (!query || query.trim().length < 2) {
      return [];
    }
    try {
      const response = await clientService.getAllView(1, 10, query);
      return response.items;
    } catch (error) {
      console.error("Error buscando clientes:", error);
      return [];
    }
  };

  // Calcular monto pendiente
  const pendingAmount = useCallback(() => {
    const total = parseFloat(totalCost) || 0;
    const advance = parseFloat(advanceAmount) || 0;
    return Math.max(0, total - advance);
  }, [totalCost, advanceAmount]);

  // Toggle estado en la lista
  const toggleState = useCallback((state: string) => {
    setSelectedStates((prev) =>
      prev.includes(state) ? prev.filter((s) => s !== state) : [...prev, state]
    );
  }, []);

  // Agregar estado customizado
  const handleAddCustomState = useCallback(() => {
    if (customState.trim() && !selectedStates.includes(customState.trim())) {
      setSelectedStates((prev) => [...prev, customState.trim()]);
      setCustomState("");
      toast.success("Estado agregado");
    }
  }, [customState, selectedStates]);

  // Handler para cuando se crea un nuevo cliente
  const handleClientCreated = useCallback((client: Client) => {
    setSelectedClient(client);
    setInitialClients((prev) => [client, ...prev]);
    setShowCreateClientDialog(false);
    toast.success("Cliente creado exitosamente");
  }, []);

  // Reset form
  const resetForm = useCallback(() => {
    setSelectedClient(null);
    setModel("");
    setDescription("");
    setTotalCost("");
    setAdvanceAmount("");
    setStatus("repairing");
    setSelectedStates([]);
    setCustomState("");
    setPasswordType("none");
    setTextPassword("");
    setPatternPassword([]);
    setShowPassword(false);
  }, []);

  // Handle submit
  const handleSubmit = async () => {
    // Validaciones
    if (!selectedClient) {
      toast.error("Debes seleccionar un cliente");
      return;
    }
    if (!model.trim()) {
      toast.error("El modelo es obligatorio");
      return;
    }
    if (!description.trim()) {
      toast.error("La descripción es obligatoria");
      return;
    }
    if (!totalCost || parseFloat(totalCost) <= 0) {
      toast.error("El costo total debe ser mayor a 0");
      return;
    }
    if (selectedStates.length === 0) {
      toast.error("Debes seleccionar al menos un estado recibido");
      return;
    }

    setIsSubmitting(true);

    try {
      // Preparar password según tipo
      let passwordValue: string | GraphPattern | undefined = undefined;
      if (passwordType === "text" && textPassword.trim()) {
        passwordValue = textPassword.trim();
      } else if (passwordType === "pattern" && patternPassword.length > 0) {
        passwordValue = patternPassword;
      }

      if (reparationToEdit) {
        // Editar
        const updateData: UpdateReparationData = {
          model: model.trim(),
          description: description.trim(),
          totalCost: parseFloat(totalCost),
          advanceAmount: parseFloat(advanceAmount) || 0,
          pendingAmount: pendingAmount(),
          stateReceived: selectedStates,
          password: passwordValue,
          status,
          updatedBy: createdBy,
        };

        await reparationService.update(reparationToEdit.id, updateData);
        toast.success("Reparación actualizada exitosamente");
      } else {
        // Crear
        const createData: CreateReparationData = {
          clientId: selectedClient.id,
          model: model.trim(),
          description: description.trim(),
          totalCost: parseFloat(totalCost),
          advanceAmount: parseFloat(advanceAmount) || 0,
          pendingAmount: pendingAmount(),
          stateReceived: selectedStates,
          password: passwordValue,
          createdBy,
        };

        await reparationService.create(createData);
        toast.success("Reparación creada exitosamente");
      }

      resetForm();
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error al guardar reparación:", error);
      toast.error("Error al guardar la reparación");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="min-w-[50vw] max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="p-6 pb-4 shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-600" />
            {reparationToEdit ? "Editar Reparación" : "Nueva Reparación"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 min-h-0">
          <div className="space-y-6 pb-6">
            {/* Selector de Cliente */}
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <CreatableSelect<Client>
                    label="Cliente"
                    values={initialClients}
                    selectedValue={selectedClient}
                    onChange={setSelectedClient}
                    searchFunction={searchClientsFunction}
                    displayField="name"
                    valueField="id"
                    secondaryDisplayField="phone"
                    secondaryLabel="Teléfono:"
                    placeholder="Buscar cliente por nombre, email o teléfono..."
                    disabled={isSubmitting}
                    hideLabel={true}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowCreateClientDialog(true)}
                  disabled={isSubmitting}
                  title="Crear nuevo cliente"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Modelo */}
            <div className="space-y-2">
              <Label htmlFor="model">Modelo del Equipo *</Label>
              <Input
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ej: iPhone 13 Pro, Samsung Galaxy S21..."
                disabled={isSubmitting}
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción del Trabajo *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el trabajo a realizar..."
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            {/* Costos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalCost">Costo Total * (Bs.)</Label>
                <Input
                  id="totalCost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={totalCost}
                  onChange={(e) => setTotalCost(e.target.value)}
                  placeholder="0.00"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="advanceAmount">Anticipo (Bs.)</Label>
                <Input
                  id="advanceAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  placeholder="0.00"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label>Pendiente (Bs.)</Label>
                <Input
                  value={pendingAmount().toFixed(2)}
                  disabled
                  className="bg-gray-100"
                />
              </div>
            </div>

            {/* Estado */}
            {reparationToEdit && (
              <div className="space-y-2">
                <Label htmlFor="status">Estado de la Reparación</Label>
                <Select
                  value={status}
                  onValueChange={(value) => setStatus(value as StatusReparation)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="repairing">En Reparación</SelectItem>
                    <SelectItem value="completed">Completado</SelectItem>
                    <SelectItem value="delivered">Entregado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Estados al Recibir */}
            <div className="space-y-2">
              <Label>Estado del Equipo al Recibir *</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {PREDEFINED_STATES.map((state) => (
                  <div key={state} className="flex items-center space-x-2">
                    <Checkbox
                      id={`state-${state}`}
                      checked={selectedStates.includes(state)}
                      onCheckedChange={() => toggleState(state)}
                      disabled={isSubmitting}
                    />
                    <label
                      htmlFor={`state-${state}`}
                      className="text-sm cursor-pointer select-none"
                    >
                      {state}
                    </label>
                  </div>
                ))}
              </div>
              {/* Input para agregar estado customizado */}
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Agregar otro estado..."
                  value={customState}
                  onChange={(e) => setCustomState(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomState();
                    }
                  }}
                  disabled={isSubmitting}
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddCustomState}
                  disabled={isSubmitting || !customState.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {selectedStates.length > 0 && (
                <p className="text-xs text-gray-500">
                  {selectedStates.length} estado(s) seleccionado(s)
                </p>
              )}
            </div>

            {/* Contraseña/Patrón */}
            <div className="space-y-3">
              <Label>Contraseña/Patrón (Opcional)</Label>
              <FilterTabs
                options={[
                  { value: "none", label: "Sin Contraseña" },
                  { value: "text", label: "Contraseña Texto" },
                  { value: "pattern", label: "Patrón 3x3" },
                ]}
                activeFilter={passwordType}
                onFilterChange={(v) => setPasswordType(v as any)}
              />
              {passwordType === "none" && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No se guardará contraseña para este equipo
                </div>
              )}
              {passwordType === "text" && (
                <div className="space-y-2">
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={textPassword}
                      onChange={(e) => setTextPassword(e.target.value)}
                      placeholder="Ingresa la contraseña..."
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}
              {passwordType === "pattern" && (
                <div className="flex justify-center py-4">
                  <GraphPatternInput
                    value={patternPassword}
                    onChange={setPatternPassword}
                    disabled={isSubmitting}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer con botones */}
        <div className="flex justify-end gap-2 p-6 pt-4 border-t shrink-0 bg-white">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : reparationToEdit ? "Actualizar" : "Crear Reparación"}
          </Button>
        </div>
      </DialogContent>

      {/* Diálogo para crear nuevo Cliente */}
      <ClientFormDialog
        open={showCreateClientDialog}
        onOpenChange={setShowCreateClientDialog}
        onClientCreated={handleClientCreated}
      />
    </Dialog>
  );
});

CreateReparationModal.displayName = "CreateReparationModal";

export default CreateReparationModal;
