import { Settings } from "lucide-react";
import PageHeader from "@/shared/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { SuppliersTab } from "../components/SuppliersTab";
import { ExchangeRateTab } from "../components/ExchangeRateTab";

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuración"
        subtitle="Administra proveedores y tipos de cambio"
        icon={<Settings />}
        classNameIcon="text-blue-600"
      />

      <Tabs defaultValue="suppliers">
        <TabsList className="mb-4">
          <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
          <TabsTrigger value="exchange-rate">Tipo de Cambio</TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers">
          <SuppliersTab />
        </TabsContent>

        <TabsContent value="exchange-rate">
          <ExchangeRateTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
