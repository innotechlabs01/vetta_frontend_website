// src/data/wizard.ts
import type { WizardState } from "@/types";
type GoalT = WizardState["goal"];



// Array para los objetivos del paso 1
export const items: { id: any; label: string; description: string; goal: GoalT }[] = [
  { id: "blank", label: "En blanco", description: "Configura tu campaña desde cero.", goal: "engagement" },
  { id: "recover_inactive", label: "Recuperar clientes inactivos", description: "Vuelve a activar clientes que no compran hace tiempo.", goal: "retention" },
  { id: "promote_repurchase", label: "Promover recompra", description: "Incentiva compras repetidas.", goal: "retention" },
  { id: "launch_promo", label: "Lanzar promoción o novedad", description: "Da a conocer un nuevo producto.", goal: "awareness" },
  { id: "increase_visits", label: "Aumentar visitas en tienda", description: "Atrae tráfico a tu local o e-commerce.", goal: "engagement" },
  { id: "abandoned_cart", label: "Recordar carritos abandonados", description: "Recupera ventas pendientes.", goal: "conversion" },
];


// Ubicaciones
export const lastPurchase  = [
  { id: 1, name: "Todas" },
  { id: 2, name: "24 hr" },
  { id: 3, name: "1 semana" },
  { id: 4, name: "15 días" },
  { id: 4, name: "1 mes" },
];

export const locationsRow2 = [
  { id: 5, name: "La 10 el poblado" },
  { id: 6, name: "La 10 el poblado" },
  { id: 7, name: "La 10 el poblado" },
];

// Categorías
export const categoriesRow1 = [
  { id: 1, name: "Cuidado del bebé" },
  { id: 2, name: "Cuidado del bebé" },
  { id: 3, name: "Cuidado del bebé" },
];

// Zonas
export const forZone = [
  { id: 1, name: "Calazans" },
  { id: 2, name: "Restrepo naranjo" },
  { id: 3, name: "El poblado" },
];
export const forZone2 = [
  { id: 4, name: "El poblado" },
  { id: 5, name: "El poblado" },
  { id: 6, name: "El poblado" },
  { id: 7, name: "El poblado" },
];

// Última compra
export const lastPurchase1 = [
  { id: 1, name: "30 días" },
  { id: 2, name: "90 días" },
  { id: 3, name: "120 días" },
];
export const lastPurchase2 = [
  { id: 4, name: "120 días" },
  { id: 5, name: "120 días" },
  { id: 6, name: "120 días" },
];

// Interacción carrito
export const cart = [
  { id: 1, name: "30 días" },
  { id: 2, name: "90 días" },
  { id: 3, name: "120 días" },
];




