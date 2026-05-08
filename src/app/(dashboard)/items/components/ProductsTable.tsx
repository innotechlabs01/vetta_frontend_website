"use client";

import { Product } from "../types";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pencil, Package, AlertCircle } from "lucide-react";
import { formatCOP } from "../utils";

interface ProductsTableProps {
  loading: boolean;
  products: Product[];
  totalProducts: number;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
}

function ProductRow({ product, onEdit }: { product: Product; onEdit: (p: Product) => void }) {
  return (
    <TableRow className="hover:bg-muted/40 transition-colors">
      <TableCell>
        {product.image_url ? (
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-muted">
            <img
              src={product.image_url}
              alt={product.name}
              className="object-cover w-full h-full"
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
            <Package className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="font-medium truncate max-w-[260px]">{product.name}</div>
        {product.description && (
          <div className="md:hidden text-xs text-muted-foreground truncate max-w-[260px] mt-0.5">
            {product.description}
          </div>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground truncate max-w-[420px]">
        {product.description || "-"}
      </TableCell>
      <TableCell className="font-medium tabular-nums">
        {formatCOP(product.price ?? (product as any)?.variants?.[0]?.price ?? null)}
      </TableCell>
      <TableCell>
        {product.is_available ? (
          <Badge className="bg-emerald-600 hover:bg-emerald-600">Disponible</Badge>
        ) : (
          <Badge variant="secondary">No disponible</Badge>
        )}
      </TableCell>
      <TableCell>
        <Button variant="outline" size="sm" onClick={() => onEdit(product)}>
          <Pencil className="w-4 h-4 mr-1.5" />
          Editar
        </Button>
      </TableCell>
    </TableRow>
  );
}

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell>
        <div className="w-12 h-12 rounded-lg bg-muted animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-32 rounded bg-muted animate-pulse mb-2" />
        <div className="md:hidden h-3 w-24 rounded bg-muted animate-pulse" />
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <div className="h-3 w-48 rounded bg-muted animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-16 rounded bg-muted animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-5 w-20 rounded-full bg-muted animate-pulse" />
      </TableCell>
      <TableCell>
        <div className="h-8 w-20 rounded bg-muted animate-pulse" />
      </TableCell>
    </TableRow>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <TableRow>
      <TableCell colSpan={6}>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-10 h-10 text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground font-medium">
            {hasFilters
              ? "No hay productos para los filtros aplicados"
              : "No hay productos todavía"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {hasFilters
              ? "Intenta ajustar los filtros o crear un nuevo producto"
              : "Crea tu primer producto para comenzar"}
          </p>
        </div>
      </TableCell>
    </TableRow>
  );
}

export function ProductsTable({
  loading,
  products,
  totalProducts,
  onEdit,
  onDelete,
}: ProductsTableProps) {
  const hasFilters = products.length === 0 && !loading;

  return (
    <div className="rounded-xl border overflow-hidden mt-4">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[68px]">Imagen</TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead className="hidden md:table-cell">Descripción</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead className="w-[130px]">Estado</TableHead>
            <TableHead className="w-[120px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading && (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          )}

          {!loading && products.length === 0 && <EmptyState hasFilters={hasFilters} />}

          {!loading &&
            products.map((product) => (
              <ProductRow key={product.id} product={product} onEdit={onEdit} />
            ))}
        </TableBody>
      </Table>

      {!loading && products.length > 0 && (
        <div className="px-4 py-3 border-t text-xs text-muted-foreground bg-muted/20">
          Mostrando {totalProducts} productos
        </div>
      )}
    </div>
  );
}