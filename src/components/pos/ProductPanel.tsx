'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';
import { Sparkles } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  base_price: number;
  image_url?: string;
  category?: { name: string };
  variants?: any[];
  modifiers?: any[];
}

interface Customer {
  id: string;
  name: string;
  membership_tier: string;
  ark_coin_balance: number;
  discount?: number;
}

interface CustomerFavoritesProps {
  customerFavorites: Product[];
  loadingFavorites: boolean;
  selectedCustomer: Customer | null;
  openCustomization: (product: Product) => void;
  formatCurrency: (value: number) => string;
  formatArk: (value: number) => string;
}

export function CustomerFavorites({
  customerFavorites,
  loadingFavorites,
  selectedCustomer,
  openCustomization,
  formatCurrency,
  formatArk,
}: CustomerFavoritesProps) {
  if (!selectedCustomer) return null;

  return (
    <>
      {/* Selected Customer Info */}
      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-pink-50 to-amber-50 rounded-lg border border-pink-100">
        <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 font-bold text-xs flex-shrink-0">
          {selectedCustomer.name?.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-gray-900 truncate">{selectedCustomer.name}</div>
          <div className="text-xs text-gray-600 flex items-center gap-2">
            <span className="capitalize">{selectedCustomer.membership_tier}</span>
            <span className="text-gray-300">•</span>
            <span className="text-green-600 font-medium">Diskon {selectedCustomer.discount}%</span>
            <span className="text-gray-300">•</span>
            <span className="text-amber-600 font-medium">{formatArk(selectedCustomer.ark_coin_balance)}</span>
          </div>
        </div>
      </div>

      {/* Customer Favorites */}
      {(customerFavorites.length > 0 || loadingFavorites) && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 border border-amber-100">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">
              Favorit {selectedCustomer.name?.split(' ')[0]}
            </span>
            {loadingFavorites ? (
              <span className="text-xs text-amber-600">Loading...</span>
            ) : (
              <span className="text-xs text-amber-600">({customerFavorites.length} menu)</span>
            )}
          </div>
          {loadingFavorites ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {customerFavorites.map(product => (
                <button
                  key={product.id}
                  onClick={() => openCustomization(product)}
                  className="flex items-center gap-2 p-2 bg-white rounded-lg border border-amber-200 hover:border-amber-400 hover:bg-amber-50 transition-all text-left"
                >
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                    <img src={product.image_url || '/products/placeholder.png'} alt={product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-gray-900 truncate">{product.name}</div>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xs text-pink-600 font-semibold">{formatCurrency(product.base_price)}</span>
                      <span className="text-[10px] text-amber-600 font-medium">{formatArk(product.base_price)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

interface ProductGridProps {
  products: Product[];
  searchTerm: string;
  selectedCategory: string;
  categories: string[];
  customerFavorites: Product[];
  loadingFavorites: boolean;
  selectedCustomer: Customer | null;
  openCustomization: (product: Product) => void;
  formatCurrency: (value: number) => string;
  formatArk: (value: number) => string;
}

export function ProductGrid({
  products,
  searchTerm,
  selectedCategory,
  categories,
  openCustomization,
  formatCurrency,
  formatArk,
}: ProductGridProps) {
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const categoryName = p.category?.name || 'Uncategorized';
    const matchesCategory = selectedCategory === 'Semua' || categoryName === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4 overflow-hidden flex flex-col">
      <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button key={cat} className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-pink-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {cat}
          </button>
        ))}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredProducts.map((product) => (
            <button 
              key={product.id} 
              onClick={() => openCustomization(product)} 
              className="bg-gray-50 p-2 rounded-xl border border-gray-200 hover:border-pink-400 hover:bg-pink-50 transition-all text-left"
            >
              <div className="h-20 bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden p-1">
                <img 
                  src={product.image_url || '/products/placeholder.png'} 
                  alt={product.name} 
                  className="w-full h-full object-cover rounded" 
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/products/placeholder.png';
                  }}
                />
              </div>
              <div className="flex gap-1 mb-1">
                {(product.variants && product.variants.length > 0) && (
                  <span className="px-1 py-0.5 bg-gray-200 text-gray-700 text-xs rounded font-medium">V</span>
                )}
                {(product.modifiers && product.modifiers.length > 0) && (
                  <span className="px-1 py-0.5 bg-gray-200 text-gray-700 text-xs rounded font-medium">M</span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 text-xs line-clamp-2 mb-0.5">{product.name}</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-pink-600 font-bold text-xs">{formatCurrency(product.base_price)}</span>
                <span className="text-amber-600 font-medium text-[10px]">{formatArk(product.base_price)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}