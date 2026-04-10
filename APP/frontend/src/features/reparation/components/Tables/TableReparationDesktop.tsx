import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { MoreVertical, DollarSign, CheckCircle, Wrench, Pencil, Trash2, Eye } from "lucide-react";
import type { ReparationView, StatusReparation } from "@/shared/types/modelTypes/Reparation";
import { memo, useState } from "react";
import { reparationService } from "@/shared/services/ReparationService";
import { toast } from "sonner";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
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

const TableReparationDesktop = memo(({ reparations, loading, searchQuery, onEdit, onDelete, onRefresh }: Props) => {
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
	<Card className="hidden md:block">
		<CardHeader>
			<CardTitle>Lista de Reparaciones</CardTitle>
			<CardDescription>Administra las reparaciones de tus clientes</CardDescription>
		</CardHeader>
		<CardContent>
			{loading ? (
				<div className="flex items-center justify-center py-8">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
					<span className="ml-3 text-gray-600">Cargando reparaciones...</span>
				</div>
			) : reparations.length === 0 ? (
				<div className="text-center py-8 text-gray-500">
					<Wrench className="h-12 w-12 mx-auto mb-4 text-gray-300" />
					<p className="text-lg font-medium">No hay reparaciones</p>
					<p className="text-sm">
						{searchQuery
							? "No se encontraron reparaciones con ese criterio de búsqueda"
							: "Comienza registrando tu primera reparación"}
					</p>
				</div>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Cliente</TableHead>
							<TableHead>Modelo</TableHead>
							<TableHead>Descripción</TableHead>
							<TableHead>Fecha Creación</TableHead>
							<TableHead>Costo Total</TableHead>
							<TableHead>Pendiente</TableHead>
							<TableHead>Estado</TableHead>
							<TableHead className="text-center">Acciones</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{reparations.map((reparation) => (
							<TableRow key={reparation.id} className="cursor-pointer hover:bg-gray-50">
								<TableCell>
									<div>
										<p className="font-medium">{reparation.clientData?.name || 'Sin cliente'}</p>
										{reparation.clientData?.phone && (
											<p className="text-xs text-gray-500">
												{reparation.clientData.phone}
											</p>
										)}
									</div>
								</TableCell>
								<TableCell className="font-medium">{reparation.model}</TableCell>
								<TableCell>
									<p className="text-sm truncate max-w-xs">
										{reparation.description}
									</p>
								</TableCell>							<TableCell className="text-xs text-gray-500">
								{formatDate(reparation.createdAt)}
							</TableCell>								<TableCell>
									<span className="font-semibold">{formatCurrency(reparation.totalCost)}</span>
								</TableCell>
								<TableCell>
									<span className={`font-semibold ${reparation.pendingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
										{formatCurrency(reparation.pendingAmount)}
									</span>
								</TableCell>
								<TableCell>{getStatusBadge(reparation.status)}</TableCell>
								<TableCell>
									<div className="flex items-center justify-center gap-2">
										{/* Botón de ver detalles */}
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleViewClick(reparation)}
											className="h-9 w-9 p-0"
											title="Ver detalles"
										>
											<Eye className="h-4 w-4" />
										</Button>

										{/* Botón de cambio de estado */}
										{getNextStatus(reparation.status) && (
											<Button
												variant="outline"
												size="sm"
												onClick={() => handleStatusClick(reparation)}
												className={`h-9 px-3 flex items-center gap-1.5 whitespace-nowrap ${
													reparation.status === 'repairing' 
														? 'border-blue-500 text-blue-600 hover:bg-blue-50' 
														: 'border-green-500 text-green-600 hover:bg-green-50'
												}`}
												title={`Marcar como ${getNextStatusLabel(reparation.status)}`}
											>
												<CheckCircle className="h-4 w-4" />
												<span className="text-xs font-medium">
													{getNextStatusLabel(reparation.status)}
												</span>
											</Button>
										)}

										{/* Botón de ajuste de pagos */}
										<Button
											variant="outline"
											size="sm"
											onClick={() => handlePaymentClick(reparation)}
											className="h-9 w-9 p-0"
											title="Ajustar pagos"
										>
											<DollarSign className="h-4 w-4" />
										</Button>

										{/* Menú de 3 puntos - Solo en estado "repairing" */}
										{reparation.status === 'repairing' && (
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button
														variant="ghost"
														size="sm"
														className="h-9 w-9 p-0"
													>
														<MoreVertical className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem onClick={() => onEdit(reparation)}>
														<Pencil className="h-4 w-4 mr-2" />
														Editar
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => onDelete(reparation)}
														className="text-red-600 focus:text-red-700"
													>
														<Trash2 className="h-4 w-4 mr-2" />
														Eliminar
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										)}
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</CardContent>

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
	</Card>
	);
});

export default TableReparationDesktop;
