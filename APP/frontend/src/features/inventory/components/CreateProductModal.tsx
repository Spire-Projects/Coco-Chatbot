import { memo, useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2 } from 'lucide-react';

import type { CreateProductData, UpdateProductData, ProductView } from '@/shared/types/modelTypes/Product';
import type { CreateAccessoryData, AccessoryView } from '@/shared/types/modelTypes/Accessory';
import type { BrandView } from '@/shared/types/modelTypes/Brand';
import type { FamilyView } from '@/shared/types/modelTypes/Family';
import type { CategoryView } from '@/shared/types/modelTypes/Category';
import type { ModelView } from '@/shared/types/modelTypes/Model';

import { brandService } from '@/shared/services/BrandService';
import { familyService } from '@/shared/services/FamilyService';
import { categoryService } from '@/shared/services/CategoryService';
import { modelService } from '@/shared/services/ModelService';
import { productService } from '@/shared/services/ProductService';
import { accessoryService } from '@/shared/services/AccessoryService';
import { FilterTabs } from '@/shared/components/FilterTabs';
import CreatableSelect from '@/shared/components/CreatableSelect';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Separator } from '@/shared/components/ui/separator';
import { Switch } from '@/shared/components/ui/switch';
import { Badge } from '@/shared/components/ui/badge';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';

// ---------------------------------------------------------------------------
// Zod schema — mirrors product_variants columns exactly
// ---------------------------------------------------------------------------

/**
 * Helper to coerce an input string/number/undefined to a number or undefined.
 * Required because HTML number inputs always return strings.
 */
const optionalNumber = z
  .union([z.string(), z.number(), z.undefined(), z.null()])
  .transform((v) => {
    if (v === '' || v === undefined || v === null) return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  });

const variantSchema = z
  .object({
    // FK resolved by the model cascade selector
    modelId: z.string().min(1, 'Selecciona un modelo'),

    // Variant attributes (product_variants columns)
    storage:  z.string().optional().transform((v) => v?.trim() || undefined),
    color:    z.string().optional().transform((v) => v?.trim() || undefined),
    simType:  z.string().optional().transform((v) => v?.trim() || undefined),

    // Pricing
    salePriceUsd:     z.preprocess((v) => (v === '' ? undefined : Number(v)),
      z.number({ required_error: 'El precio de venta es requerido' }).min(0, 'No puede ser negativo')),
    wholesalePriceUsd: optionalNumber,

    // Warranty
    storeWarrantyMonths: optionalNumber,
    brandWarranty:       z.boolean().default(false),
    brandWarrantyMonths: optionalNumber,
  })
  .refine(
    (d) => !d.brandWarranty || (d.brandWarrantyMonths !== undefined && d.brandWarrantyMonths > 0),
    { message: 'Indica los meses de garantía de marca', path: ['brandWarrantyMonths'] },
  );

type VariantFormValues = z.infer<typeof variantSchema>;

// ---------------------------------------------------------------------------
// Accessory Zod schema
// ---------------------------------------------------------------------------

const accessorySchema = z.object({
  name:               z.string().min(1, 'El nombre es requerido'),
  categoryId:         z.string().min(1, 'Selecciona una categoría'),
  variantDescription: z.string().optional(),
  stockMinAlert:      z.coerce.number().int().min(0).default(3),
  salePriceUsd:       z.coerce.number().min(0, 'Precio inválido'),
  wholesalePriceUsd:  z.union([z.coerce.number().min(0), z.literal('')]).optional().transform((v) => (v === '' || v === undefined ? undefined : Number(v))),
});

type AccessoryFormValues = z.infer<typeof accessorySchema>;

// ---------------------------------------------------------------------------
// Component props
// ---------------------------------------------------------------------------

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
  createdBy: string;
  productToEdit?: ProductView | null;
  /** When provided the modal opens in accessory-edit mode */
  accessoryToEdit?: AccessoryView | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CreateProductModalComponent = ({
  isOpen,
  onClose,
  onSuccess,
  createdBy,
  productToEdit = null,
  accessoryToEdit = null,
}: CreateProductModalProps) => {
  const isEditing         = productToEdit !== null;
  const isEditingAccessory = accessoryToEdit !== null;

  // -- active tab (only relevant in creation mode) --
  const [activeTab, setActiveTab] = useState<'variant' | 'accessory'>(
    isEditingAccessory ? 'accessory' : 'variant',
  );

  // -- submission state --
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // -- model hierarchy selectors (create mode only) --
  const [brandOptions,    setBrandOptions]    = useState<BrandView[]>([]);
  const [familyOptions,   setFamilyOptions]   = useState<FamilyView[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryView[]>([]);
  const [modelOptions,    setModelOptions]    = useState<ModelView[]>([]);

  const [selectedBrand,    setSelectedBrand]    = useState<BrandView | null>(null);
  const [selectedFamily,   setSelectedFamily]   = useState<FamilyView | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryView | null>(null);
  const [selectedModel,    setSelectedModel]    = useState<ModelView | null>(null);

  // -- accessory-specific selectors --
  const [accCategoryOptions, setAccCategoryOptions] = useState<CategoryView[]>([]);
  const [accBrandOptions,    setAccBrandOptions]    = useState<BrandView[]>([]);
  const [accSelectedCategory, setAccSelectedCategory] = useState<CategoryView | null>(null);
  const [accSelectedBrand,    setAccSelectedBrand]    = useState<BrandView | null>(null);

  // -- variant form --
  const form = useForm<VariantFormValues>({
    resolver: zodResolver(variantSchema) as any,
    defaultValues: {
      modelId:             '',
      storage:             '',
      color:               '',
      simType:             '',
      salePriceUsd:        0,
      wholesalePriceUsd:   undefined,
      storeWarrantyMonths: undefined,
      brandWarranty:       false,
      brandWarrantyMonths: undefined,
    },
    mode: 'onBlur',
  });

  const watchBrandWarranty = form.watch('brandWarranty');

  // -- accessory form --
  const accForm = useForm<AccessoryFormValues>({
    resolver: zodResolver(accessorySchema) as any,
    defaultValues: {
      name: '', categoryId: '', variantDescription: '',
      stockMinAlert: 3,
      salePriceUsd: 0, wholesalePriceUsd: undefined,
    },
    mode: 'onBlur',
  });

  // ---------------------------------------------------------------------------
  // Initial data load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isOpen) return;
    void brandService.getInitialList().then((brands) => {
      setBrandOptions(brands);
      setAccBrandOptions(brands);
    }).catch(console.error);
    void categoryService.getInitialList().then((cats) => {
      setCategoryOptions(cats);
      setAccCategoryOptions(cats);
    }).catch(console.error);
  }, [isOpen]);

  // Load families when brand changes
  useEffect(() => {
    if (!selectedBrand) { setFamilyOptions([]); return; }
    void familyService.getByBrand(selectedBrand.id).then(setFamilyOptions).catch(console.error);
  }, [selectedBrand]);

  // Load models when brand or family changes
  useEffect(() => {
    if (!selectedBrand) { setModelOptions([]); return; }
    const filter = { brandId: selectedBrand.id, ...(selectedFamily ? { familyId: selectedFamily.id } : {}) };
    void modelService.getAllView(1, 50, undefined, undefined, undefined, filter)
      .then((r) => setModelOptions(r.items))
      .catch(console.error);
  }, [selectedBrand, selectedFamily]);

  // ---------------------------------------------------------------------------
  // Edit mode pre-fill
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!isOpen) return;

    // Variant edit
    if (isEditing && productToEdit) {
      setActiveTab('variant');
      form.reset({
        modelId:             productToEdit.modelId,
        storage:             productToEdit.storage  ?? '',
        color:               productToEdit.color    ?? '',
        simType:             productToEdit.simType  ?? '',
        salePriceUsd:        productToEdit.salePriceUsd,
        wholesalePriceUsd:   productToEdit.wholesalePriceUsd,
        storeWarrantyMonths: productToEdit.storeWarrantyMonths,
        brandWarranty:       productToEdit.brandWarranty,
        brandWarrantyMonths: productToEdit.brandWarrantyMonths,
      });
    } else if (isEditingAccessory && accessoryToEdit) {
      setActiveTab('accessory');
      accForm.reset({
        name:               accessoryToEdit.name,
        categoryId:         accessoryToEdit.categoryId,
        variantDescription: accessoryToEdit.variantDescription ?? '',
        stockMinAlert:      accessoryToEdit.stockMinAlert,
        salePriceUsd:       accessoryToEdit.salePriceUsd,
        wholesalePriceUsd:  accessoryToEdit.wholesalePriceUsd,
      });
    } else {
      setActiveTab('variant');
      form.reset({
        modelId: '', storage: '', color: '', simType: '',
        salePriceUsd: 0, wholesalePriceUsd: undefined,
        storeWarrantyMonths: undefined,
        brandWarranty: false, brandWarrantyMonths: undefined,
      });
      accForm.reset({
        name: '', categoryId: '', variantDescription: '',
        stockMinAlert: 3,
        salePriceUsd: 0, wholesalePriceUsd: undefined,
      });
      setSelectedBrand(null);
      setSelectedFamily(null);
      setSelectedCategory(null);
      setSelectedModel(null);
      setAccSelectedCategory(null);
      setAccSelectedBrand(null);
    }
    setSubmitError(null);
  }, [isOpen, isEditing, isEditingAccessory, productToEdit, accessoryToEdit, form, accForm]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => {
        form.reset();
        accForm.reset();
        setSubmitError(null);
        setSelectedBrand(null);
        setSelectedFamily(null);
        setSelectedCategory(null);
        setSelectedModel(null);
        setAccSelectedCategory(null);
        setAccSelectedBrand(null);
      }, 200);
      return () => clearTimeout(t);
    }
  }, [isOpen, form, accForm]);

  // ---------------------------------------------------------------------------
  // Accessory form handlers
  // ---------------------------------------------------------------------------

  const handleAccCategoryChange = useCallback((cat: CategoryView) => {
    setAccSelectedCategory(cat);
    accForm.setValue('categoryId', cat.id, { shouldValidate: true });
  }, [accForm]);

  const handleAccBrandChange = useCallback((brand: BrandView) => {
    setAccSelectedBrand(brand);
  }, []);

  const handleCreateAccCategory = useCallback(async (name: string): Promise<CategoryView> => {
    const cat = await categoryService.createFromName(name);
    setAccCategoryOptions((prev) => [cat, ...prev]);
    return cat;
  }, []);

  const handleCreateAccBrand = useCallback(async (name: string): Promise<BrandView> => {
    const brand = await brandService.createFromName(name);
    setAccBrandOptions((prev) => [brand, ...prev]);
    return brand;
  }, []);

  const searchAccCategories = useCallback((q: string) => categoryService.search(q), []);
  const searchAccBrands     = useCallback((q: string) => brandService.search(q), []);

  // ---------------------------------------------------------------------------
  // Model cascade handlers
  // ---------------------------------------------------------------------------

  const handleBrandChange = useCallback((brand: BrandView) => {
    setSelectedBrand(brand);
    setSelectedFamily(null);
    setSelectedModel(null);
    form.setValue('modelId', '');
  }, [form]);

  const handleFamilyChange = useCallback((family: FamilyView) => {
    setSelectedFamily(family);
    setSelectedModel(null);
    form.setValue('modelId', '');
  }, [form]);

  const handleCategoryChange = useCallback((category: CategoryView) => {
    setSelectedCategory(category);
  }, []);

  const handleModelChange = useCallback((model: ModelView) => {
    setSelectedModel(model);
    form.setValue('modelId', model.id, { shouldValidate: true });
  }, [form]);

  // ---------------------------------------------------------------------------
  // CreatableSelect onAddValue handlers
  // ---------------------------------------------------------------------------

  const handleCreateBrand = useCallback(async (name: string): Promise<BrandView> => {
    const brand = await brandService.createFromName(name);
    setBrandOptions((prev) => [brand, ...prev]);
    return brand;
  }, []);

  const handleCreateFamily = useCallback(async (name: string): Promise<FamilyView> => {
    if (!selectedBrand) throw new Error('Selecciona una marca primero');
    const family = await familyService.createFromName(name, selectedBrand.id, createdBy);
    setFamilyOptions((prev) => [family, ...prev]);
    return family;
  }, [selectedBrand, createdBy]);

  const handleCreateCategory = useCallback(async (name: string): Promise<CategoryView> => {
    const cat = await categoryService.createFromName(name);
    setCategoryOptions((prev) => [cat, ...prev]);
    return cat;
  }, []);

  const handleCreateModel = useCallback(async (name: string): Promise<ModelView> => {
    if (!selectedBrand)    throw new Error('Selecciona una marca primero');
    if (!selectedCategory) throw new Error('Selecciona una categoría primero');
    const model = await modelService.create({
      name: name.trim(),
      brandId:    selectedBrand.id,
      familyId:   selectedFamily?.id,
      categoryId: selectedCategory.id,
      createdBy,
    });
    const view: ModelView = {
      ...model,
      brandName:    selectedBrand.name,
      familyName:   selectedFamily?.name,
      categoryName: selectedCategory.name,
    };
    setModelOptions((prev) => [view, ...prev]);
    return view;
  }, [selectedBrand, selectedFamily, selectedCategory, createdBy]);

  // ---------------------------------------------------------------------------
  // Search functions for CreatableSelect
  // ---------------------------------------------------------------------------

  const searchBrands = useCallback((q: string) => brandService.search(q), []);

  const searchFamilies = useCallback(
    (q: string) => familyService.searchByBrand(q, selectedBrand?.id),
    [selectedBrand],
  );

  const searchCategories = useCallback((q: string) => categoryService.search(q), []);

  const searchModels = useCallback(
    (q: string) => modelService.search(q, {
      brandId:  selectedBrand?.id,
      familyId: selectedFamily?.id,
    }),
    [selectedBrand, selectedFamily],
  );

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const handleClose = useCallback(() => {
    if (!isSubmitting) onClose();
  }, [isSubmitting, onClose]);

  const onSubmit = useCallback(
    async (data: VariantFormValues) => {
      try {
        setSubmitError(null);
        setIsSubmitting(true);

        if (isEditing && productToEdit) {
          const updatePayload: UpdateProductData = {
            storage:             data.storage,
            color:               data.color,
            simType:             data.simType,
            salePriceUsd:        data.salePriceUsd,
            wholesalePriceUsd:   data.wholesalePriceUsd as number | undefined,
            storeWarrantyMonths: data.storeWarrantyMonths as number | undefined,
            brandWarranty:       data.brandWarranty,
            brandWarrantyMonths: data.brandWarrantyMonths as number | undefined,
            updatedBy: createdBy,
          };
          await productService.update(productToEdit.id, updatePayload);
        } else {
          const createPayload: CreateProductData = {
            modelId:             data.modelId,
            storage:             data.storage,
            color:               data.color,
            simType:             data.simType,
            salePriceUsd:        data.salePriceUsd,
            wholesalePriceUsd:   data.wholesalePriceUsd as number | undefined,
            storeWarrantyMonths: data.storeWarrantyMonths as number | undefined,
            brandWarranty:       data.brandWarranty,
            brandWarrantyMonths: data.brandWarrantyMonths as number | undefined,
            createdBy,
          };
          await productService.create(createPayload);
        }

        if (onSuccess) await onSuccess();
        onClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : JSON.stringify(err);
        setSubmitError(msg);
        console.error(isEditing ? 'Error updating variant:' : 'Error creating variant:', err);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isEditing, productToEdit, createdBy, onSuccess, onClose],
  );

  const onSubmitAccessory = useCallback(
    async (data: AccessoryFormValues) => {
      try {
        setSubmitError(null);
        setIsSubmitting(true);

        if (isEditingAccessory && accessoryToEdit) {
          await accessoryService.update(accessoryToEdit.id, {
            name:               data.name,
            categoryId:         data.categoryId,
            brandId:            accSelectedBrand?.id,
            variantDescription: data.variantDescription,
            stockMinAlert:      data.stockMinAlert,
            salePriceUsd:       data.salePriceUsd,
            wholesalePriceUsd:  data.wholesalePriceUsd as number | undefined,
            updatedBy:          createdBy,
          });
        } else {
          const payload: CreateAccessoryData = {
            name:               data.name,
            categoryId:         data.categoryId,
            brandId:            accSelectedBrand?.id,
            variantDescription: data.variantDescription,
            stockMinAlert:      data.stockMinAlert,
            salePriceUsd:       data.salePriceUsd,
            wholesalePriceUsd:  data.wholesalePriceUsd as number | undefined,
            createdBy,
          };
          await accessoryService.create(payload);
        }

        if (onSuccess) await onSuccess();
        onClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : JSON.stringify(err);
        setSubmitError(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isEditingAccessory, accessoryToEdit, accSelectedBrand, createdBy, onSuccess, onClose],
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  const TAB_OPTIONS = [
    { value: 'variant',   label: '📱 Variante de dispositivo' },
    { value: 'accessory', label: '🔌 Accesorio' },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Variante'
              : isEditingAccessory ? 'Editar Accesorio'
              : 'Registrar Producto'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Actualiza los atributos de la variante. El modelo no puede cambiar.'
              : isEditingAccessory
              ? 'Actualiza los datos del accesorio.'
              : 'Selecciona el tipo de producto a registrar.'}
          </DialogDescription>
        </DialogHeader>

        {/* Tab selector — only in creation mode */}
        {!isEditing && !isEditingAccessory && (
          <FilterTabs
            options={TAB_OPTIONS}
            activeFilter={activeTab}
            onFilterChange={(v) => setActiveTab(v as 'variant' | 'accessory')}
            className="pb-0"
          />
        )}

        {submitError && (
          <Alert variant="destructive">
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* ====== VARIANT FORM ====== */}
        {(activeTab === 'variant' || isEditing) && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

            {/* ================================================================
                SECCIÓN 1 — MODELO
                En modo edición se muestra como badges de solo lectura.
            ================================================================ */}
            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground">Modelo</p>

              {isEditing ? (
                /* Read-only model info in edit mode */
                <div className="flex flex-wrap gap-2 rounded-md border bg-muted/40 p-3">
                  {productToEdit?.brandName    && <Badge variant="secondary">{productToEdit.brandName}</Badge>}
                  {productToEdit?.familyName   && <Badge variant="secondary">{productToEdit.familyName}</Badge>}
                  {productToEdit?.categoryName && <Badge variant="outline">{productToEdit.categoryName}</Badge>}
                  <Badge variant="default">{productToEdit?.modelName}</Badge>
                </div>
              ) : (
                /* Cascade selectors in create mode */
                <div className="grid grid-cols-1 gap-4">

                  {/* Brand */}
                  <FormItem>
                    <FormLabel>Marca *</FormLabel>
                    <CreatableSelect<BrandView>
                      label=""
                      hideLabel
                      values={brandOptions}
                      selectedValue={selectedBrand}
                      onChange={handleBrandChange}
                      searchFunction={searchBrands}
                      onAddValue={handleCreateBrand}
                      displayField="name"
                      valueField="id"
                      placeholder="Selecciona o crea una marca..."
                      disabled={isSubmitting}
                    />
                  </FormItem>

                  {/* Family — only when brand is selected */}
                  {selectedBrand && (
                    <FormItem>
                      <FormLabel>Familia</FormLabel>
                      <FormDescription className="mt-0 mb-1">
                        Opcional. Ej: "iPhone 13", "Galaxy S"
                      </FormDescription>
                      <CreatableSelect<FamilyView>
                        label=""
                        hideLabel
                        values={familyOptions}
                        selectedValue={selectedFamily}
                        onChange={handleFamilyChange}
                        searchFunction={searchFamilies}
                        onAddValue={handleCreateFamily}
                        displayField="name"
                        valueField="id"
                        placeholder="Selecciona o crea una familia..."
                        disabled={isSubmitting}
                      />
                    </FormItem>
                  )}

                  {/* Category — needed to create a new model */}
                  <FormItem>
                    <FormLabel>Categoría *</FormLabel>
                    <FormDescription className="mt-0 mb-1">
                      Requerida si vas a crear un nuevo modelo
                    </FormDescription>
                    <CreatableSelect<CategoryView>
                      label=""
                      hideLabel
                      values={categoryOptions}
                      selectedValue={selectedCategory}
                      onChange={handleCategoryChange}
                      searchFunction={searchCategories}
                      onAddValue={handleCreateCategory}
                      displayField="name"
                      valueField="id"
                      placeholder="Selecciona o crea una categoría..."
                      disabled={isSubmitting}
                    />
                  </FormItem>

                  {/* Model — required */}
                  <FormField
                    control={form.control}
                    name="modelId"
                    render={() => (
                      <FormItem>
                        <FormLabel>Modelo *</FormLabel>
                        <FormControl>
                          <CreatableSelect<ModelView>
                            label=""
                            hideLabel
                            values={modelOptions}
                            selectedValue={selectedModel}
                            onChange={handleModelChange}
                            searchFunction={searchModels}
                            onAddValue={handleCreateModel}
                            displayField="name"
                            valueField="id"
                            placeholder={
                              !selectedBrand
                                ? 'Selecciona una marca primero...'
                                : 'Selecciona o crea un modelo...'
                            }
                            disabled={isSubmitting || !selectedBrand}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <Separator />

            {/* ================================================================
                SECCIÓN 2 — ATRIBUTOS DE VARIANTE
                storage, color, simType  (product_variants columns)
            ================================================================ */}
            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground">Atributos de Variante</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

                <FormField
                  control={form.control}
                  name="storage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Almacenamiento</FormLabel>
                      <FormControl>
                        <Input placeholder="256GB" disabled={isSubmitting} {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input placeholder="Verde Alpino" disabled={isSubmitting} {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="simType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de SIM</FormLabel>
                      <FormControl>
                        <Input placeholder="eSIM / Dual SIM" disabled={isSubmitting} {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>
            </div>

            <Separator />

            {/* ================================================================
                SECCIÓN 3 — PRECIOS
            ================================================================ */}
            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground">Precios</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <FormField
                  control={form.control}
                  name="salePriceUsd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio de venta USD *</FormLabel>
                      <FormControl>
                        <Input
                          type="number" placeholder="0.00" step="0.01" min="0"
                          disabled={isSubmitting}
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="wholesalePriceUsd"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio mayorista USD</FormLabel>
                      <FormControl>
                        <Input
                          type="number" placeholder="0.00" step="0.01" min="0"
                          disabled={isSubmitting}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>
            </div>

            <Separator />

            {/* ================================================================
                SECCIÓN 4 — GARANTÍA
            ================================================================ */}
            <div className="space-y-4">
              <p className="text-sm font-semibold text-foreground">Garantía</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <FormField
                  control={form.control}
                  name="storeWarrantyMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Garantía de tienda (meses)</FormLabel>
                      <FormControl>
                        <Input
                          type="number" placeholder="3" step="1" min="0"
                          disabled={isSubmitting}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Brand warranty toggle */}
                <Controller
                  control={form.control}
                  name="brandWarranty"
                  render={({ field }) => (
                    <FormItem className="flex flex-col justify-end">
                      <FormLabel>Garantía de marca</FormLabel>
                      <div className="flex items-center gap-3 h-10">
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                        <span className="text-sm text-muted-foreground">
                          {field.value ? 'Incluye' : 'No incluye'}
                        </span>
                      </div>
                    </FormItem>
                  )}
                />

              </div>

              {watchBrandWarranty && (
                <FormField
                  control={form.control}
                  name="brandWarrantyMonths"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meses de garantía de marca *</FormLabel>
                      <FormControl>
                        <Input
                          type="number" placeholder="12" step="1" min="1"
                          disabled={isSubmitting}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* ================================================================
                ACCIONES
            ================================================================ */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSubmitting
                  ? (isEditing ? 'Actualizando...' : 'Creando...')
                  : (isEditing ? 'Actualizar variante' : 'Crear variante')}
              </Button>
            </div>

          </form>
        </Form>
        )}

        {/* ====== ACCESSORY FORM ====== */}
        {(activeTab === 'accessory' || isEditingAccessory) && (
          <Form {...accForm}>
            <form onSubmit={accForm.handleSubmit(onSubmitAccessory)} className="space-y-6">

              {/* Identificación */}
              <div className="space-y-4">
                <p className="text-sm font-semibold text-foreground">Identificación</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={accForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Nombre *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Funda silicona" disabled={isSubmitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Categoría */}
                  <FormField
                    control={accForm.control}
                    name="categoryId"
                    render={() => (
                      <FormItem>
                        <FormLabel>Categoría *</FormLabel>
                        <FormControl>
                          <CreatableSelect<CategoryView>
                            label="" hideLabel
                            values={accCategoryOptions}
                            selectedValue={accSelectedCategory}
                            onChange={handleAccCategoryChange}
                            searchFunction={searchAccCategories}
                            onAddValue={handleCreateAccCategory}
                            displayField="name" valueField="id"
                            placeholder="Selecciona o crea..."
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Marca */}
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <CreatableSelect<BrandView>
                      label="" hideLabel
                      values={accBrandOptions}
                      selectedValue={accSelectedBrand}
                      onChange={handleAccBrandChange}
                      searchFunction={searchAccBrands}
                      onAddValue={handleCreateAccBrand}
                      displayField="name" valueField="id"
                      placeholder="Opcional..."
                      disabled={isSubmitting}
                    />
                  </FormItem>

                  <FormField
                    control={accForm.control}
                    name="variantDescription"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Descripción de variante</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Negro / 1m / USB-C" disabled={isSubmitting} {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <p className="text-sm font-semibold text-foreground">Stock</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={accForm.control}
                    name="stockMinAlert"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Alerta mínima de stock</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="3" min="0" step="1" disabled={isSubmitting} {...field} value={field.value ?? 3} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
                    El stock y el costo de compra se actualizan desde el módulo de compras.
                  </div>
                </div>
              </div>

              <Separator />

              {/* Precios */}
              <div className="space-y-4">
                <p className="text-sm font-semibold text-foreground">Precios</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={accForm.control}
                    name="salePriceUsd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Venta USD *</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0.00" step="0.01" min="0" disabled={isSubmitting} {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={accForm.control}
                    name="wholesalePriceUsd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mayorista USD</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0.00" step="0.01" min="0" disabled={isSubmitting}
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Acciones */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isSubmitting
                    ? (isEditingAccessory ? 'Actualizando...' : 'Creando...')
                    : (isEditingAccessory ? 'Actualizar accesorio' : 'Crear accesorio')}
                </Button>
              </div>

            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
};

CreateProductModalComponent.displayName = 'CreateProductModal';

export const CreateProductModal = memo(CreateProductModalComponent);
