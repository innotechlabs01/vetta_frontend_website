"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { X, Search } from "lucide-react";

function cn(...c: Array<string | false | null | undefined>) {
  return c.filter(Boolean).join(" ");
}

interface Product {
  id: string;
  name: string;
  price: number | null;
  image_url: string | null;
}

interface ProductSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  selectedProductIds: string[];
  onConfirm: (selectedIds: string[]) => void;
  loading?: boolean;
  mode?: 'single' | 'multiple';
  title?: string;
  description?: string;
}

export default function ProductSelectorModal({ 
  isOpen, 
  onClose, 
  products = [], 
  selectedProductIds = [], 
  onConfirm,
  loading = false 
}: ProductSelectorModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(selectedProductIds);

  useEffect(() => {
    if (isOpen) {
      setTempSelectedIds(selectedProductIds);
      setSearchTerm("");
    }
  }, [isOpen, selectedProductIds]);

  if (!isOpen) return null;

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleProduct = (productId: string) => {
    setTempSelectedIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredProducts.map(p => p.id);
    const allSelected = allFilteredIds.every(id => tempSelectedIds.includes(id));
    
    if (allSelected) {
      setTempSelectedIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setTempSelectedIds(prev => {
        const newIds = [...prev];
        allFilteredIds.forEach(id => {
          if (!newIds.includes(id)) {
            newIds.push(id);
          }
        });
        return newIds;
      });
    }
  };

  const handleConfirm = () => {
    onConfirm(tempSelectedIds);
    onClose();
  };

  const handleCancel = () => {
    setTempSelectedIds(selectedProductIds);
    onClose();
  };

  const allFilteredSelected = filteredProducts.length > 0 && 
    filteredProducts.every(p => tempSelectedIds.includes(p.id));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-6">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden"
        style={{ animation: "slideUp 0.3s ease-out" }}
      >
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Seleccionar Productos
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Elige los productos donde aplica esta recompensa
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-6 py-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Select All / Deselect All */}
            {filteredProducts.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  {allFilteredSelected ? "Deseleccionar todos" : "Seleccionar todos"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Product List */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-gray-500">Cargando productos...</p>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500">
                  {searchTerm ? "No se encontraron productos" : "No hay productos disponibles"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((product) => {
                const isSelected = tempSelectedIds.includes(product.id);
                
                return (
                  <label
                    key={product.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md",
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {/* Checkbox */}
                    <div className="flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleProduct(product.id)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      />
                    </div>

                    {/* Image */}
                    {product.image_url ? (
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={product.image_url}
                          alt={product.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-gray-400 text-xs">Sin foto</span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {product.name}
                      </p>
                      {product.price && (
                        <p className="text-sm text-gray-600 mt-0.5">
                          ${product.price.toLocaleString()}
                        </p>
                      )}
                    </div>

                    {/* Check Icon */}
                    {isSelected && (
                      <div className="flex-shrink-0">
                        <svg
                          className="w-6 h-6 text-blue-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 rounded-b-2xl">
          <div className="flex items-center justify-between">
            {/* Counter */}
            <div className="text-sm">
              {tempSelectedIds.length > 0 ? (
                <span className="text-blue-600 font-medium">
                  {tempSelectedIds.length} producto{tempSelectedIds.length !== 1 ? "s" : ""} seleccionado{tempSelectedIds.length !== 1 ? "s" : ""}
                </span>
              ) : (
                <span className="text-gray-500">
                  Ningún producto seleccionado
                </span>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:brightness-110 transition"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px); 
          }
          to { 
            opacity: 1;
            transform: translateY(0); 
          }
        }
      `}</style>
    </div>
  );
}
