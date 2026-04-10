import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { DollarSign, CheckCircle, Wrench, Pencil, Trash2, Eye } from "lucide-react";
import type { ReparationView, StatusReparation } from "@/shared/types/modelTypes/Reparation";
import { memo, useState } from "react";
import { reparationService } from "@/shared/services/ReparationService";
import { toast } from "sonner";
import PaymentAdjustmentModal from "../PaymentAdjustmentModal";
import StatusChangeModal from "../StatusChangeModal";
import ViewReparationModal from "../ViewReparationModal";

interface Props {
	reparations: ReparationView[];
	loading: boolean;
	searchQuery: string;
	onEdit: (reparation: ReparationView) => void;
	onDelete: (reparation: ReparationView) => void;
	onRefresh?: () => void;
}

const getStatusBadge = (status: string) => {
	switch (status) {
		case 'repairing':
			return <Badge variant="outline" className="border-yellow-500 text-yellow-600">En Reparación</Badge>;
		case 'completed':
			return <Badge variant="outline" className="border-blue-500 text-blue-600">Completado</Badge>;
		case 'delivered':
			return <Badge variant="outline" className="border-green-500 text-green-600">Entregado</Badge>;
		default:
			return <Badge variant="secondary">Desconocido</Badge>;
	}
};

const formatCurrency = (amount: number) => {
	return new Intl.NumberFormat('es-BO', {
		style: 'currency',
		currency: 'BOB',
	}).format(amount);
};

const getNextStatus = (currentStatus: StatusReparation): StatusReparation | null => {
	switch (currentStatus) {
		case 'repairing':
			return 'completed';
		case 'completed':
			return 'delivered';
		case 'delivered':
			return null;
		default:
			return null;
	}
};

const getNextStatusLabel = (currentStatus: StatusReparation): string => {
	switch (currentStatus) {
		case 'repairing':
			return 'Reparado';
		case 'completed':
			return 'Entregado';
		default:
			return '';
	}
};

const TableReparationMobile = memo(({ reparations, loading, searchQuery, onEdit, onDelete, onRefresh }: Props) => {
	const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
	const [selectedReparation, setSelectedReparation] = useState<ReparationView | null>(null);
	const [isUpdating, setIsUpdating] = useState(false);
	const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
	const [reparationForPayment, setReparationForPayment] = useState<ReparationView | null>(null);
	const [isViewModalOpen, setIsViewModalOpen] = useState(false);
	const [reparationToView, setReparationToView] = useState<ReparationView | null>(null);

	const handleStatusClick = (reparation: ReparationView) => {
		setSelectedReparation(reparation);
		setIsStatusDialogOpen(true);
	};

	const handlePaymentClick = (reparation: ReparationView) => {
		setReparationForPayment(reparation);
		setIsPaymentModalOpen(true);
	};

	const handleViewClick = (reparation: ReparationView) => {
		setReparationToView(reparation);
		setIsViewModalOpen(true);
	};
	const handleConfirmStatusChange = async () => {
		if (!selectedReparation) return;

		const nextStatus = getNextStatus(selectedReparation.status);
		if (!nextStatus) return;

		setIsUpdating(true);
		try {
			const updateData: any = {
				status: nextStatus,
			};

			// Si se marca como entregado, agregar la fecha
			if (nextStatus === 'delivered') {
				updateData.deliveredAt = new Date().toISOString();
			}

			await reparationService.update(selectedReparation.id, updateData);
			toast.success(`Estado actualizado a ${getNextStatusLabel(selectedReparation.status)}`);
			setIsStatusDialogOpen(false);
			setSelectedReparation(null);
			if (onRefresh) {
				onRefresh();
			}
		} catch (error) {
			console.error('Error updating status:', error);
			toast.error('Error al actualizar el estado');
		} finally {
			setIsUpdating(false);
		}
	};

	const handlePaymentConfirm = async (advanceAmount: number, pendingAmount: number) => {
		if (!reparationForPayment) return;

		try {
			await reparationService.update(reparationForPayment.id, {
				advanceAmount,
				pendingAmount,
			});
			toast.success('Pagos actualizados exitosamente');
			if (onRefresh) {
				onRefresh();
			}
		} catch (error) {
			console.error('Error updating payments:', error);
			toast.error('Error al actualizar los pagos');
			throw error;
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('es-BO', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
		});
	};

	return (
	<div className="md:hidden space-y-4">
		{loading ? (
			<div className="flex items-center justify-center py-8">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
				<span className="ml-3 text-gray-600">Cargando reparaciones...</span>
			</div>
		) : reparations.length === 0 ? (
			<Card>
				<CardContent className="text-center py-8">
					<Wrench className="h-12 w-12 mx-auto mb-4 text-gray-300" />
					<p className="text-lg font-medium text-gray-700">No hay reparaciones</p>
					<p className="text-sm text-gray-500">
						{searchQuery
							? "No se encontraron reparaciones"
							: "Comienza registrando tu primera reparación"}
					</p>
				</CardContent>
			</Card>
		) : (
			reparations.map((reparation) => (
				<Card key={reparation.id} className="hover:shadow-md transition-shadow">
					<CardHeader className="pb-3">
						<div className="flex items-start justify-between">
							<div className="flex-1">
								<CardTitle className="text-base">{reparation.model}</CardTitle>
								<CardDescription className="text-xs">
									Cliente: {reparation.clientData?.name || 'Sin cliente'}
								</CardDescription>
							</div>
							{getStatusBadge(reparation.status)}
						</div>
					</CardHeader>
					<CardContent className="space-y-2">
						<div className="flex items-center justify-between text-sm">
							<span className="text-gray-500">Descripción:</span>
							<span className="text-right text-xs">{reparation.description}</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span className="text-gray-500">Fecha Creación:</span>
							<span className="text-xs text-gray-600">{formatDate(reparation.createdAt)}</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span className="text-gray-500">Costo Total:</span>
							<span className="font-semibold">{formatCurrency(reparation.totalCost)}</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span className="text-gray-500">Pendiente:</span>
							<span className={`font-semibold ${reparation.pendingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
								{formatCurrency(reparation.pendingAmount)}
							</span>
						</div>
						{reparation.clientData?.phone && (
							<div className="flex items-center justify-between text-sm">
								<span className="text-gray-500">Teléfono:</span>
								<span className="text-xs">{reparation.clientData.phone}</span>
							</div>
						)}
						
						{/* Sección de acciones */}
						<div className="mt-3 pt-3 border-t space-y-2">
							{/* Botón de ver detalles */}
							<Button
								variant="ghost"
								size="sm"
								className="w-full"
								onClick={() => handleViewClick(reparation)}
							>
								<Eye className="h-4 w-4 mr-2" />
								Ver Detalles
							</Button>

							{/* Botón de cambio de estado */}
							{getNextStatus(reparation.status) && (
								<Button
									variant="outline"
									size="sm"
									className={`w-full ${
										reparation.status === 'repairing' 
											? 'border-blue-500 text-blue-600 hover:bg-blue-50' 
											: 'border-green-500 text-green-600 hover:bg-green-50'
									}`}
									onClick={() => handleStatusClick(reparation)}
								>
									<CheckCircle className="h-4 w-4 mr-2" />
									Marcar como {getNextStatusLabel(reparation.status)}
								</Button>
							)}
							
							{/* Botón de ajuste de pagos */}
							<Button
								variant="outline"
								size="sm"
								className="w-full"
								onClick={() => handlePaymentClick(reparation)}
							>
								<DollarSign className="h-4 w-4 mr-2" />
								Ajustar Pagos
							</Button>

							{/* Botones de editar y eliminar - Solo en estado "repairing" */}
							{reparation.status === 'repairing' && (
								<div className="flex gap-2">
									<Button
										variant="outline"
										size="sm"
										className="flex-1"
										onClick={() => onEdit(reparation)}
									>
										<Pencil className="h-4 w-4 mr-2" />
										Editar
									</Button>
									<Button
										variant="outline"
										size="sm"
										onClick={() => onDelete(reparation)}
										className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							)}
						</div>
					</CardContent>
				</Card>
			))
		)}

		{/* Modal de cambio de estado */}
		<StatusChangeModal
			reparation={selectedReparation}
			nextStatus={selectedReparation ? getNextStatus(selectedReparation.status) : null}
			nextStatusLabel={selectedReparation ? getNextStatusLabel(selectedReparation.status) : ''}
			open={isStatusDialogOpen}
			onOpenChange={setIsStatusDialogOpen}
			onConfirm={handleConfirmStatusChange}
			isUpdating={isUpdating}
		/>

		{/* Modal de ajuste de pagos */}
		<PaymentAdjustmentModal
			reparation={reparationForPayment}
			open={isPaymentModalOpen}
			onOpenChange={setIsPaymentModalOpen}
			onConfirm={handlePaymentConfirm}
		/>

		{/* Modal de visualización de detalles */}
		<ViewReparationModal
			isOpen={isViewModalOpen}
			onClose={() => setIsViewModalOpen(false)}
			reparation={reparationToView}
		/>
	</div>
	);
});

export default TableReparationMobile;
