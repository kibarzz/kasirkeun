import React, { useState, useEffect, FormEvent } from 'react';
import { motion } from 'motion/react';
import { Coffee, Plus, Search, Layers, ChevronRight, X, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useLanguage } from '../i18n';

export default function Menu() {
  const { t } = useLanguage();
  const [products, setProducts] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  // Modals state
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [isEditVariantModalOpen, setIsEditVariantModalOpen] = useState(false);
  const [isAddRecipeModalOpen, setIsAddRecipeModalOpen] = useState(false);
  const [selectedVariantForRecipe, setSelectedVariantForRecipe] = useState<any>(null);
  const [selectedVariantForEdit, setSelectedVariantForEdit] = useState<any>(null);

  // Add Product Form State
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    image_url: '',
  });
  const [newVariants, setNewVariants] = useState([{ name: 'Regular', dine_in_price: '', online_price: '', dine_in_discount: '', online_discount: '' }]);

  // Edit Product Form State
  const [editProductForm, setEditProductForm] = useState({
    name: '',
    category: '',
    image_url: '',
  });

  // Edit Variant Form State
  const [editVariantForm, setEditVariantForm] = useState({
    name: '',
    dine_in_price: '',
    online_price: '',
    dine_in_discount: '',
    online_discount: '',
  });

  // Add Recipe Form State
  const [newRecipe, setNewRecipe] = useState({
    ingredient_id: '',
    qty: '',
    adjustment_factor: '1.0'
  });

  const [formError, setFormError] = useState('');

  const fetchData = () => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || []);
        setVariants(data.variants || []);
        setRecipes(data.recipes || []);
      });
      
    fetch('/api/ingredients')
      .then(res => res.json())
      .then(data => setIngredients(data || []));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddProduct = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newProduct.name || !newProduct.category) {
      setFormError(t.fillAllProductFields);
      return;
    }

    if (newVariants.length === 0) {
      setFormError(t.addAtLeastOneVariant);
      return;
    }

    const formattedVariants = newVariants.map(v => ({
      name: v.name,
      dine_in_price: parseFloat(v.dine_in_price) || 0,
      online_price: parseFloat(v.online_price) || 0,
      dine_in_discount: parseFloat(v.dine_in_discount) || 0,
      online_discount: parseFloat(v.online_discount) || 0
    }));

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProduct,
          variants: formattedVariants
        })
      });

      if (response.ok) {
        setIsAddProductModalOpen(false);
        setNewProduct({ name: '', category: '', image_url: '' });
        setNewVariants([{ name: 'Regular', dine_in_price: '', online_price: '' }]);
        fetchData();
      } else {
        setFormError(t.failedToAddProduct);
      }
    } catch (err) {
      setFormError(t.errorOccurred);
    }
  };

  const handleEditProduct = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!editProductForm.name || !editProductForm.category) {
      setFormError(t.fillAllProductFields);
      return;
    }

    try {
      const response = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editProductForm)
      });

      if (response.ok) {
        setIsEditProductModalOpen(false);
        fetchData();
        setSelectedProduct({
          ...selectedProduct,
          ...editProductForm
        });
      } else {
        setFormError(t.failedToUpdateProduct);
      }
    } catch (err) {
      setFormError(t.errorOccurred);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm(t.confirmDeleteProduct)) return;

    try {
      const response = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (response.ok) {
        setSelectedProduct(null);
        fetchData();
      } else {
        alert(t.failedToDeleteProduct);
      }
    } catch (err) {
      alert(t.errorOccurred);
    }
  };

  const handleEditVariant = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!editVariantForm.name || !editVariantForm.dine_in_price || !editVariantForm.online_price) {
      setFormError(t.fillAllFields);
      return;
    }

    try {
      const response = await fetch(`/api/variants/${selectedVariantForEdit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editVariantForm,
          dine_in_price: parseFloat(editVariantForm.dine_in_price),
          online_price: parseFloat(editVariantForm.online_price),
          dine_in_discount: parseFloat(editVariantForm.dine_in_discount) || 0,
          online_discount: parseFloat(editVariantForm.online_discount) || 0
        })
      });

      if (response.ok) {
        setIsEditVariantModalOpen(false);
        fetchData();
      } else {
        setFormError(t.failedToUpdateVariant);
      }
    } catch (err) {
      setFormError(t.errorOccurred);
    }
  };

  const handleAddRecipe = async (e: FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newRecipe.ingredient_id || !newRecipe.qty || !newRecipe.adjustment_factor) {
      setFormError(t.fillAllRecipeFields);
      return;
    }

    const qty = parseFloat(newRecipe.qty);
    const adjFactor = parseFloat(newRecipe.adjustment_factor);

    if (isNaN(qty) || qty <= 0 || isNaN(adjFactor) || adjFactor <= 0) {
      setFormError(t.invalidQtyOrAdjFactor);
      return;
    }

    try {
      const response = await fetch('/api/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_variant_id: selectedVariantForRecipe.id,
          ingredient_id: parseInt(newRecipe.ingredient_id),
          qty: qty,
          adjustment_factor: adjFactor
        })
      });

      if (response.ok) {
        setIsAddRecipeModalOpen(false);
        setNewRecipe({ ingredient_id: '', qty: '', adjustment_factor: '1.0' });
        fetchData();
      } else {
        setFormError(t.failedToAddRecipe);
      }
    } catch (err) {
      setFormError(t.errorOccurred);
    }
  };

  const addVariantField = () => {
    setNewVariants([...newVariants, { name: '', dine_in_price: '', online_price: '', dine_in_discount: '', online_discount: '' }]);
  };

  const removeVariantField = (index: number) => {
    setNewVariants(newVariants.filter((_, i) => i !== index));
  };

  const updateVariantField = (index: number, field: string, value: string) => {
    const updated = [...newVariants];
    updated[index] = { ...updated[index], [field]: value };
    setNewVariants(updated);
  };

  const getIngredientName = (id: number) => {
    const ing = ingredients.find(i => i.id === id);
    return ing ? `${ing.name} (${ing.unit})` : `Ingredient #${id}`;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('/api/upload-product-image', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (isEdit) {
          setEditProductForm(prev => ({ ...prev, image_url: data.url }));
        } else {
          setNewProduct(prev => ({ ...prev, image_url: data.url }));
        }
      } else {
        setFormError(t.failedToUploadImage);
      }
    } catch (err) {
      setFormError(t.errorDuringImageUpload);
    }
  };

  const calculateHPP = (variantId: number) => {
    const variantRecipes = recipes.filter(r => r.product_variant_id === variantId);
    let hpp = 0;
    for (const recipe of variantRecipes) {
      const ingredient = ingredients.find(i => i.id === recipe.ingredient_id);
      if (ingredient) {
        hpp += recipe.qty * recipe.adjustment_factor * ingredient.unit_cost;
      }
    }
    return hpp;
  };

  const filteredProducts = products.filter(p => 
    (activeCategory === 'All' || p.category === activeCategory) &&
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 min-h-full lg:h-full flex flex-col"
    >
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{t.menuTitle}</h1>
          <p className="text-slate-500 dark:text-white/60 mt-1">{t.menuDesc}</p>
        </div>
        
        <button 
          onClick={() => setIsAddProductModalOpen(true)}
          className="bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20 w-full md:w-auto justify-center"
        >
          <Plus className="w-4 h-4" /> {t.addProduct}
        </button>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden min-h-0">
        {/* Product List */}
        <div className="w-full lg:w-1/3 bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-4 lg:p-6 shadow-2xl flex flex-col relative overflow-hidden min-h-[300px] lg:min-h-0">
          <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
          
          <div className="relative z-10 mb-4">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/40" />
            <input 
              type="text" 
              placeholder={t.searchMenu} 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border-0 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          {/* Category Tabs */}
          <div className="relative z-10 flex gap-2 overflow-x-auto pb-4 custom-scrollbar shrink-0">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={clsx(
                  "px-4 py-1.5 rounded-full text-xs font-medium transition-all border whitespace-nowrap",
                  activeCategory === category
                    ? "bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                    : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 text-slate-500 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/10"
                )}
              >
                {category === 'All' ? t.all : category}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar pr-2 space-y-2">
            {filteredProducts.map(product => {
              const productVariants = variants.filter(v => v.product_id === product.id);
              const minDineIn = productVariants.length > 0 ? Math.min(...productVariants.map(v => v.dine_in_price)) : 0;
              const minOnline = productVariants.length > 0 ? Math.min(...productVariants.map(v => v.online_price)) : 0;

              return (
                <button
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={clsx(
                    'w-full text-left p-4 rounded-2xl transition-all border flex items-center justify-between group gap-4',
                    selectedProduct?.id === product.id 
                      ? 'bg-black/20 dark:bg-white/20 border-black/30 dark:border-white/30 shadow-lg' 
                      : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 hover:bg-black/10 dark:bg-white/10 hover:border-black/20 dark:border-white/20'
                  )}
                >
                  <div className="flex items-center gap-4">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0">
                        <Coffee className="w-6 h-6 text-slate-400 dark:text-white/40" />
                      </div>
                    )}
                    <div>
                      <h3 className="text-slate-900 dark:text-white font-medium">{product.name}</h3>
                      <div className="flex flex-col gap-0.5 mt-1">
                        <p className="text-amber-400 font-mono text-[10px] leading-none">{t.dineIn}: {formatCurrency(minDineIn)}</p>
                        <p className="text-emerald-400 font-mono text-[10px] leading-none">{t.online}: {formatCurrency(minOnline)}</p>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className={clsx(
                    'w-5 h-5 transition-colors shrink-0',
                    selectedProduct?.id === product.id ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-white/20 group-hover:text-slate-500 dark:text-white/60'
                  )} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Details & Recipe */}
        <div className="flex-1 bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 rounded-3xl p-4 lg:p-6 shadow-2xl flex flex-col relative overflow-hidden min-h-[400px]">
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
          
          {selectedProduct ? (
            <div className="relative z-10 h-full flex flex-col">
              <div className="flex justify-between items-start mb-8">
                <div className="flex items-center gap-6">
                  {selectedProduct.image_url ? (
                    <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-24 h-24 rounded-2xl object-cover shadow-lg" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-black/10 dark:bg-white/10 flex items-center justify-center shadow-lg">
                      <Coffee className="w-10 h-10 text-slate-400 dark:text-white/40" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{selectedProduct.name}</h2>
                    <span className="inline-block px-3 py-1 bg-black/10 dark:bg-white/10 border border-black/20 dark:border-white/20 rounded-lg text-xs font-medium text-slate-600 dark:text-white/70">
                      {selectedProduct.category}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setEditProductForm({
                        name: selectedProduct.name,
                        category: selectedProduct.category,
                        image_url: selectedProduct.image_url || ''
                      });
                      setIsEditProductModalOpen(true);
                    }}
                    className="text-slate-500 dark:text-white/60 hover:text-slate-900 dark:text-white transition-colors p-2 bg-black/5 dark:bg-white/5 rounded-xl border border-black/10 dark:border-white/10"
                  >
                    {t.editDetails}
                  </button>
                  <button 
                    onClick={() => handleDeleteProduct(selectedProduct.id)}
                    className="text-rose-400 hover:text-rose-300 transition-colors p-2 bg-rose-500/10 rounded-xl border border-rose-500/20"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <Layers className="w-5 h-5" /> {t.variantsAndRecipes}
                </h3>
                
                <div className="space-y-6">
                  {variants.filter(v => v.product_id === selectedProduct.id).map(variant => {
                    const variantRecipes = recipes.filter(r => r.product_variant_id === variant.id);
                    const hpp = calculateHPP(variant.id);
                    
                    return (
                      <div key={variant.id} className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-5">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-black/10 dark:border-white/10">
                          <div>
                            <div className="flex items-center gap-3">
                              <h4 className="text-slate-900 dark:text-white font-medium">{variant.name}</h4>
                              <button 
                                onClick={() => {
                                  setSelectedVariantForEdit(variant);
                                  setEditVariantForm({
                                    name: variant.name,
                                    dine_in_price: variant.dine_in_price.toString(),
                                    online_price: variant.online_price.toString(),
                                    dine_in_discount: (variant.dine_in_discount || 0).toString(),
                                    online_discount: (variant.online_discount || 0).toString()
                                  });
                                  setIsEditVariantModalOpen(true);
                                }}
                                className="text-[10px] text-indigo-400 hover:text-indigo-300 underline"
                              >
                                {t.edit}
                              </button>
                            </div>
                            <div className="flex flex-col gap-1 mt-2">
                              <p className="text-slate-500 dark:text-white/50 text-sm flex items-center gap-2">
                                <span className="w-16">{t.dineIn}:</span>
                                <span className="text-amber-400 font-mono">{formatCurrency(variant.dine_in_price)}</span>
                              </p>
                              <p className="text-slate-500 dark:text-white/50 text-sm flex items-center gap-2">
                                <span className="w-16">{t.online}:</span>
                                <span className="text-emerald-400 font-mono">{formatCurrency(variant.online_price)}</span>
                              </p>
                              {variantRecipes.length > 0 && (
                                <p className="text-slate-500 dark:text-white/50 text-sm flex items-center gap-2 mt-1">
                                  <span className="w-16">HPP:</span>
                                  <span className="text-rose-400 font-mono">{formatCurrency(hpp)}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <button 
                            onClick={() => {
                              setSelectedVariantForRecipe(variant);
                              setIsAddRecipeModalOpen(true);
                            }}
                            className="text-xs bg-black/10 dark:bg-white/10 hover:bg-black/20 dark:bg-white/20 text-slate-900 dark:text-white px-3 py-1.5 rounded-lg transition-colors border border-black/10 dark:border-white/10 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> {t.addRecipeItem}
                          </button>
                        </div>
                        
                        {variantRecipes.length > 0 ? (
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="text-slate-400 dark:text-white/40 uppercase tracking-wider">
                                <th className="pb-2 font-medium">{t.ingredient}</th>
                                <th className="pb-2 font-medium">{t.qty}</th>
                                <th className="pb-2 font-medium">{t.adjFactor}</th>
                              </tr>
                            </thead>
                            <tbody className="text-slate-600 dark:text-white/80">
                              {variantRecipes.map((recipe, idx) => (
                                <tr key={idx} className="border-t border-black/5 dark:border-white/5">
                                  <td className="py-2">{getIngredientName(recipe.ingredient_id)}</td>
                                  <td className="py-2 font-mono">{recipe.qty}</td>
                                  <td className="py-2 font-mono">{recipe.adjustment_factor}x</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-rose-400 text-sm flex items-start gap-2">
                            <Layers className="w-4 h-4 mt-0.5 shrink-0" />
                            <p>{t.noRecipeDefined}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-white/30 relative z-10">
              <Coffee className="w-16 h-16 mb-4 opacity-20" />
              <p>{t.selectProductToView}</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Product Modal */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            <div className="flex justify-between items-center p-6 border-b border-black/10 dark:border-white/10 shrink-0">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t.addNewProduct}</h2>
              <button 
                onClick={() => setIsAddProductModalOpen(false)}
                className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form id="add-product-form" onSubmit={handleAddProduct} className="space-y-6">
                {formError && (
                  <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/20 text-rose-400 text-sm">
                    {formError}
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.productImage}</label>
                    <div className="flex items-center gap-4">
                      {newProduct.image_url && (
                        <img src={newProduct.image_url} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-black/10 dark:border-white/10" />
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={e => handleImageUpload(e, false)}
                        className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/20 file:text-indigo-400 hover:file:bg-indigo-500/30"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.productName}</label>
                    <input 
                      type="text" 
                      value={newProduct.name}
                      onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                      className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="e.g. Caramel Macchiato"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.category}</label>
                    <input 
                      type="text" 
                      value={newProduct.category}
                      onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                      className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="e.g. Coffee"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-slate-500 dark:text-white/60">{t.variants}</label>
                    <button 
                      type="button"
                      onClick={addVariantField}
                      className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> {t.addVariant}
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {newVariants.map((variant, index) => (
                      <div key={index} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1">
                            <input 
                              type="text" 
                              value={variant.name}
                              onChange={e => updateVariantField(index, 'name', e.target.value)}
                              className="w-full bg-transparent border-b border-slate-300 dark:border-slate-600 px-2 py-1 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 text-sm font-medium"
                              placeholder={`${t.variantName} (e.g. Regular)`}
                            />
                          </div>
                          {newVariants.length > 1 && (
                            <button 
                              type="button"
                              onClick={() => removeVariantField(index)}
                              className="text-rose-400 hover:text-rose-300 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-slate-400 dark:text-white/40 mb-1">{t.dineInPrice}</label>
                            <input 
                              type="number" 
                              value={variant.dine_in_price}
                              onChange={e => updateVariantField(index, 'dine_in_price', e.target.value)}
                              className="w-full bg-white dark:bg-slate-900 border-0 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-sm font-mono"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-slate-400 dark:text-white/40 mb-1">{t.onlinePrice}</label>
                            <input 
                              type="number" 
                              value={variant.online_price}
                              onChange={e => updateVariantField(index, 'online_price', e.target.value)}
                              className="w-full bg-white dark:bg-slate-900 border-0 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-sm font-mono"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-slate-400 dark:text-white/40 mb-1">{t.discount} (Dine-in %)</label>
                            <input 
                              type="number" 
                              value={variant.dine_in_discount}
                              onChange={e => updateVariantField(index, 'dine_in_discount', e.target.value)}
                              className="w-full bg-white dark:bg-slate-900 border-0 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-sm font-mono"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider text-slate-400 dark:text-white/40 mb-1">{t.discount} (Online %)</label>
                            <input 
                              type="number" 
                              value={variant.online_discount}
                              onChange={e => updateVariantField(index, 'online_discount', e.target.value)}
                              className="w-full bg-white dark:bg-slate-900 border-0 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-sm font-mono"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-black/10 dark:border-white/10 flex justify-end gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => setIsAddProductModalOpen(false)}
                className="px-4 py-2 rounded-xl font-medium text-slate-600 dark:text-white/70 hover:text-slate-900 dark:text-white hover:bg-black/10 dark:bg-white/10 transition-colors"
              >
                {t.cancel}
              </button>
              <button 
                type="submit"
                form="add-product-form"
                className="bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20"
              >
                {t.saveProduct}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Product Modal */}
      {isEditProductModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex justify-between items-center p-6 border-b border-black/10 dark:border-white/10 shrink-0">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t.editProductDetails}</h2>
              <button 
                onClick={() => setIsEditProductModalOpen(false)}
                className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <form id="edit-product-form" onSubmit={handleEditProduct} className="space-y-6">
                {formError && (
                  <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/20 text-rose-400 text-sm">
                    {formError}
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.productImage}</label>
                    <div className="flex items-center gap-4">
                      {editProductForm.image_url && (
                        <img src={editProductForm.image_url} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-black/10 dark:border-white/10" />
                      )}
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={e => handleImageUpload(e, true)}
                        className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/20 file:text-indigo-400 hover:file:bg-indigo-500/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.productName}</label>
                    <input 
                      type="text" 
                      value={editProductForm.name}
                      onChange={e => setEditProductForm({...editProductForm, name: e.target.value})}
                      className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="e.g. Iced Latte"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.category}</label>
                    <input 
                      type="text" 
                      value={editProductForm.category}
                      onChange={e => setEditProductForm({...editProductForm, category: e.target.value})}
                      className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      placeholder="e.g. Coffee"
                    />
                  </div>
                </div>
              </form>
            </div>
            
            <div className="p-6 border-t border-black/10 dark:border-white/10 flex justify-end gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => setIsEditProductModalOpen(false)}
                className="px-4 py-2 rounded-xl font-medium text-slate-600 dark:text-white/70 hover:text-slate-900 dark:text-white hover:bg-black/10 dark:bg-white/10 transition-colors"
              >
                {t.cancel}
              </button>
              <button 
                type="submit"
                form="edit-product-form"
                className="bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20"
              >
                {t.saveChanges}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Variant Modal */}
      {isEditVariantModalOpen && selectedVariantForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-black/10 dark:border-white/10">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t.editVariantPrice}</h2>
              <button 
                onClick={() => setIsEditVariantModalOpen(false)}
                className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditVariant} className="p-6 space-y-6">
              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/20 text-rose-400 text-sm">
                  {formError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.variantName}</label>
                <input 
                  type="text" 
                  value={editVariantForm.name}
                  onChange={e => setEditVariantForm({...editVariantForm, name: e.target.value})}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.dineInPrice}</label>
                  <input 
                    type="number" 
                    value={editVariantForm.dine_in_price}
                    onChange={e => setEditVariantForm({...editVariantForm, dine_in_price: e.target.value})}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.onlinePrice}</label>
                  <input 
                    type="number" 
                    value={editVariantForm.online_price}
                    onChange={e => setEditVariantForm({...editVariantForm, online_price: e.target.value})}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.discount} (Dine-in %)</label>
                  <input 
                    type="number" 
                    value={editVariantForm.dine_in_discount}
                    onChange={e => setEditVariantForm({...editVariantForm, dine_in_discount: e.target.value})}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.discount} (Online %)</label>
                  <input 
                    type="number" 
                    value={editVariantForm.online_discount}
                    onChange={e => setEditVariantForm({...editVariantForm, online_discount: e.target.value})}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono"
                  />
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsEditVariantModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-medium text-slate-600 dark:text-white/70 hover:text-slate-900 dark:text-white hover:bg-black/10 dark:bg-white/10 transition-colors"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20"
                >
                  {t.saveVariant}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Add Recipe Modal */}
      {isAddRecipeModalOpen && selectedVariantForRecipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="flex justify-between items-center p-6 border-b border-black/10 dark:border-white/10">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t.addRecipeItem}</h2>
              <button 
                onClick={() => setIsAddRecipeModalOpen(false)}
                className="text-slate-400 dark:text-white/40 hover:text-slate-900 dark:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddRecipe} className="p-6 space-y-4">
              <div className="mb-4">
                <p className="text-sm text-slate-500 dark:text-white/60">{t.addingToVariant}</p>
                <p className="font-medium text-slate-900 dark:text-white">{selectedProduct?.name} - {selectedVariantForRecipe.name}</p>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-rose-500/20 border border-rose-500/20 text-rose-400 text-sm">
                  {formError}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.ingredient}</label>
                <select 
                  value={newRecipe.ingredient_id}
                  onChange={e => setNewRecipe({...newRecipe, ingredient_id: e.target.value})}
                  className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="" className="bg-white dark:bg-slate-900 text-slate-500 dark:text-white/50">{t.selectAnIngredient}</option>
                  {ingredients.map(ing => (
                    <option key={ing.id} value={ing.id} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                      {ing.name} ({ing.unit})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.quantity}</label>
                  <input 
                    type="number" 
                    step="any"
                    value={newRecipe.qty}
                    onChange={e => setNewRecipe({...newRecipe, qty: e.target.value})}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 dark:text-white/60 mb-1">{t.adjFactor}</label>
                  <input 
                    type="number" 
                    step="any"
                    value={newRecipe.adjustment_factor}
                    onChange={e => setNewRecipe({...newRecipe, adjustment_factor: e.target.value})}
                    className="w-full bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono"
                    placeholder="1.0"
                  />
                </div>
              </div>
              <p className="text-xs text-slate-400 dark:text-white/40">
                {t.adjFactorDesc}
              </p>
              
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddRecipeModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-medium text-slate-600 dark:text-white/70 hover:text-slate-900 dark:text-white hover:bg-black/10 dark:bg-white/10 transition-colors"
                >
                  {t.cancel}
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-500 hover:bg-indigo-400 text-white px-6 py-2 rounded-xl font-medium transition-colors shadow-lg shadow-indigo-500/20"
                >
                  {t.saveRecipe}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
