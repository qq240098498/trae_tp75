import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, Scan, Calculator, Scale, Ruler, Box } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { productApi, categoryApi, saleApi, projectApi } from '@/lib/api';
import { UnitConvertService } from '../../shared/UnitConvertService';
import { Button, Input, Select, Badge, Modal } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import type { Product, Category, Project, SaleOrderItem } from '../../shared/types';
import { PAY_METHOD_LABELS, UNIT_TYPE_LABELS } from '../../shared/types';

const PAY_METHOD_OPTIONS = [
  { label: '现金', value: 'cash' },
  { label: '微信', value: 'wechat' },
  { label: '支付宝', value: 'alipay' },
  { label: '刷卡', value: 'card' },
  { label: '挂账', value: 'credit' },
];

const UNIT_TYPE_ICONS: Record<string, React.ReactNode> = {
  piece: <Box size={14} />,
  weight: <Scale size={14} />,
  length: <Ruler size={14} />,
};

interface QuickQuantity {
  label: string;
  value: number;
}

const QUICK_QUANTITIES: QuickQuantity[] = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '5', value: 5 },
  { label: '10', value: 10 },
  { label: '0.5', value: 0.5 },
  { label: '0.25', value: 0.25 },
];

export default function Cashier() {
  const { items, addItem, updateItemQuantity, removeItem, clearCart, getTotalAmount, setWholesale } = useCartStore();
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [keyword, setKeyword] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [payMethod, setPayMethod] = useState<string>('cash');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [discount, setDiscount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [editingCartItem, setEditingCartItem] = useState<{ productId: number; quantity: string } | null>(null);
  const [editQuantityValue, setEditQuantityValue] = useState('');
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setWholesale(false);
    return () => setWholesale(false);
  }, [setWholesale]);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await categoryApi.getCategoryTree();
      if (res.success && res.data) setCategories(res.data);
    } catch { /* ignore */ }
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await projectApi.getProjects({ page: 1, pageSize: 200, status: 'active' });
      if (res.success && res.data) setProjects(res.data.items);
    } catch { /* ignore */ }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productApi.getProducts({ page, pageSize: 36, keyword: keyword || undefined, categoryId: selectedCategoryId || undefined });
      if (res.success && res.data) {
        setProducts(res.data.items);
        setTotal(res.data.total);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, keyword, selectedCategoryId]);

  useEffect(() => { fetchCategories(); fetchProjects(); }, [fetchCategories, fetchProjects]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  const handleAddProduct = (product: Product) => {
    addItem(product, 1);
    success(`已添加 ${product.name}`);
    barcodeInputRef.current?.focus();
  };

  const handleBarcodeScan = useCallback(async () => {
    if (!barcodeInput.trim()) return;
    try {
      const res = await productApi.getProductByBarcode(barcodeInput.trim());
      if (res.success && res.data) {
        addItem(res.data, 1);
        success(`已添加 ${res.data.name}`);
      } else {
        toastError('未找到该商品');
      }
    } catch {
      toastError('查询失败');
    } finally {
      setBarcodeInput('');
      barcodeInputRef.current?.focus();
    }
  }, [barcodeInput, addItem, success, toastError]);

  const handleQuickAddQuantity = (product: Product, qty: number) => {
    addItem(product, qty);
    success(`已添加 ${qty}${product.saleUnit} ${product.name}`);
  };

  const openEditQuantity = (productId: number, currentQty: number) => {
    setEditingCartItem({ productId, quantity: currentQty.toString() });
    setEditQuantityValue(currentQty.toString());
  };

  const handleSaveQuantity = () => {
    if (!editingCartItem) return;
    const qty = parseFloat(editQuantityValue);
    if (isNaN(qty) || qty <= 0) {
      toastError('请输入有效数量');
      return;
    }
    updateItemQuantity(editingCartItem.productId, qty);
    setEditingCartItem(null);
  };

  const handleWeightInput = (product: Product, weightKg: number) => {
    if (product.unitType === 'weight' && product.pieceWeight > 0) {
      const pieceCount = UnitConvertService.parseWeightToPieces(product, weightKg);
      addItem(product, weightKg);
      success(`已添加 ${weightKg}斤 ≈ ${pieceCount}个 ${product.name}`);
    } else {
      addItem(product, weightKg);
    }
  };

  const getCompareInfo = (product: Product): string => {
    return UnitConvertService.generateCompareInfo(product);
  };

  const getUnitInfo = (product: Product, quantity: number): string => {
    return UnitConvertService.generateUnitInfo(product, quantity, false);
  };

  const totalAmount = getTotalAmount();
  const discountValue = parseFloat(discount) || 0;
  const isPercentDiscount = discount.includes('%');
  const actualAmount = isPercentDiscount
    ? totalAmount * (1 - discountValue / 100)
    : totalAmount - discountValue;
  const finalAmount = Math.max(0, actualAmount);

  const handleSubmit = async () => {
    if (items.length === 0) {
      toastError('请先添加商品');
      return;
    }
    if (payMethod === 'credit' && !selectedProjectId) {
      toastError('请选择挂账项目');
      return;
    }

    setSubmitting(true);
    try {
      const orderItems: SaleOrderItem[] = items.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        quantity: item.quantity,
        baseQuantity: item.baseQuantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        unitType: item.product.unitType,
        unitInfo: item.unitInfo,
      }));

      await saleApi.createRetailSale({
        items: orderItems,
        totalAmount,
        discount: discountValue,
        actualAmount: finalAmount,
        paidAmount: payMethod === 'credit' ? 0 : finalAmount,
        payMethod: payMethod as SaleOrderItem['unitType'] extends any ? any : never,
        projectId: payMethod === 'credit' ? selectedProjectId! : undefined,
        status: payMethod === 'credit' ? 'pending' : 'paid',
        operatorId: user?.id ?? 0,
      });

      success('收银成功');
      clearCart();
      setDiscount('');
      setPayMethod('cash');
      setSelectedProjectId(null);
      barcodeInputRef.current?.focus();
    } catch {
      toastError('结算失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const allCategories: Category[] = [{ id: 0, name: '全部', parentId: null, level: 1, sort: 0 }, ...categories];

  return (
    <div className="flex h-full gap-4">
      {/* Left Panel - Product Selection */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barcode Scan Input */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Input
              ref={barcodeInputRef}
              placeholder="扫描条码或输入条码后回车..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleBarcodeScan()}
              prefix={Scan}
              autoFocus
            />
          </div>
          <Button variant="primary" onClick={handleBarcodeScan}>
            <Scan size={16} /> 扫码
          </Button>
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Input
              placeholder="搜索商品名称/SKU"
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              onKeyDown={(e) => e.key === 'Enter' && fetchProducts()}
              prefix={Search}
            />
          </div>
          <Button variant="secondary" onClick={() => fetchProducts()}>
            搜索
          </Button>
        </div>

        {/* Category Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-thin">
          {allCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategoryId(cat.id === 0 ? null : cat.id); setPage(1); }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                (cat.id === 0 && selectedCategoryId === null) || selectedCategoryId === cat.id
                  ? 'bg-industrial-orange text-white shadow-md shadow-industrial-orange/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-500">加载中...</div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-500">
              <Box size={40} className="mb-2 opacity-30" />
              <span>暂无商品</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="bg-slate-800/80 border border-slate-700 rounded-lg overflow-hidden hover:border-industrial-orange/60 hover:shadow-lg hover:shadow-industrial-orange/5 transition-all duration-200"
                >
                  <div
                    className="p-3 cursor-pointer"
                    onClick={() => handleAddProduct(product)}
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <span className="text-sm font-medium text-white truncate flex-1">{product.name}</span>
                      <span className="ml-1 flex items-center gap-0.5 text-xs text-slate-400">
                        {UNIT_TYPE_ICONS[product.unitType]}
                        {UNIT_TYPE_LABELS[product.unitType]}
                      </span>
                    </div>
                    
                    <div className="text-industrial-orange font-bold text-lg mb-1">
                      ¥{product.retailPrice.toFixed(2)}
                      <span className="text-xs text-slate-400 font-normal">/{product.saleUnit}</span>
                    </div>
                    
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                      <Calculator size={12} />
                      {getCompareInfo(product)}
                    </div>
                    
                    <div className="text-xs text-slate-500">
                      库存: <span className={product.stock <= product.warningStock ? 'text-red-400' : 'text-slate-400'}>
                        {product.stock.toFixed(2)}{product.saleUnit}
                      </span>
                    </div>
                  </div>
                  
                  {/* Quick Quantity Buttons */}
                  <div className="px-3 pb-3 border-t border-slate-700/50 pt-2">
                    <div className="text-xs text-slate-500 mb-1.5">快捷添加:</div>
                    <div className="flex flex-wrap gap-1">
                      {QUICK_QUANTITIES.map((q) => (
                        <button
                          key={q.label}
                          onClick={(e) => { e.stopPropagation(); handleQuickAddQuantity(product, q.value); }}
                          className="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded hover:bg-industrial-orange hover:text-white transition-colors"
                        >
                          {q.label}{product.saleUnit}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > 36 && (
          <div className="flex items-center justify-center gap-2 pt-3 border-t border-slate-700/50">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
            <span className="text-sm text-slate-400">{page} / {Math.ceil(total / 36)}</span>
            <Button variant="secondary" size="sm" disabled={page >= Math.ceil(total / 36)} onClick={() => setPage((p) => p + 1)}>下一页</Button>
          </div>
        )}
      </div>

      {/* Right Panel - Cart & Checkout */}
      <div className="w-[420px] flex flex-col bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden flex-shrink-0">
        {/* Cart Header */}
        <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/80 flex items-center gap-2">
          <ShoppingCart size={18} className="text-industrial-orange" />
          <span className="font-semibold text-white">购物车</span>
          {items.length > 0 && (
            <>
              <Badge variant="warning" className="ml-auto">{items.length}项</Badge>
              <Button variant="danger" size="sm" onClick={clearCart} className="ml-2">
                <Trash2 size={14} /> 清空
              </Button>
            </>
          )}
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <ShoppingCart size={48} className="mb-3 opacity-30" />
              <span className="text-sm">点击商品添加到购物车</span>
              <span className="text-xs mt-1">或扫描条码快速添加</span>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.product.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700/50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.product.name}</p>
                    <p className="text-xs text-industrial-orange">
                      ¥{item.unitPrice.toFixed(2)}/{item.product.saleUnit}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.unitInfo}
                    </p>
                    {item.product.unitType === 'weight' && item.product.pieceWeight > 0 && (
                      <p className="text-xs text-emerald-400 mt-0.5">
                        约 {Math.round(item.baseQuantity / item.product.pieceWeight)} 个
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {editingCartItem?.productId === item.product.id ? (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="number"
                      value={editQuantityValue}
                      onChange={(e) => setEditQuantityValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveQuantity()}
                      placeholder="数量"
                      autoFocus
                      className="flex-1"
                    />
                    <Button size="sm" variant="primary" onClick={handleSaveQuantity}>确定</Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingCartItem(null)}>取消</Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => updateItemQuantity(item.product.id, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                      >
                        <Minus size={14} />
                      </button>
                      <button
                        onClick={() => openEditQuantity(item.product.id, item.quantity)}
                        className="w-16 text-center text-sm font-medium text-white bg-slate-700/50 rounded py-1 hover:bg-slate-700 transition-colors"
                      >
                        {item.quantity}
                      </button>
                      <button
                        onClick={() => updateItemQuantity(item.product.id, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-industrial-orange">¥{item.amount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Checkout Section */}
        <div className="border-t border-slate-700 bg-slate-800/80 px-4 py-3 space-y-3">
          <Input
            label="折扣"
            placeholder="如: 5 或 5%"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />

          <Select
            label="支付方式"
            options={PAY_METHOD_OPTIONS}
            value={payMethod}
            onChange={(v) => { setPayMethod(String(v)); if (v !== 'credit') setSelectedProjectId(null); }}
          />

          {payMethod === 'credit' && (
            <Select
              label="挂账项目"
              options={projects.map((p) => ({ label: `${p.name} - ${p.contact}`, value: p.id }))}
              value={selectedProjectId ?? ''}
              onChange={(v) => setSelectedProjectId(Number(v))}
              placeholder="请选择项目"
            />
          )}

          {/* Amount Summary */}
          <div className="space-y-2 pt-2 border-t border-slate-700/50">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">商品总额</span>
              <span className="text-white">¥{totalAmount.toFixed(2)}</span>
            </div>
            {discountValue > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">折扣</span>
                <span className="text-red-400">-¥{(totalAmount - finalAmount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-baseline pt-1 border-t border-slate-700/30">
              <span className="text-white font-medium">实收金额</span>
              <span className="text-industrial-orange text-2xl font-bold">¥{finalAmount.toFixed(2)}</span>
            </div>
          </div>

          <Button
            variant="warning"
            size="lg"
            className="w-full h-12 text-base"
            loading={submitting}
            disabled={items.length === 0}
            onClick={handleSubmit}
          >
            结算
          </Button>
        </div>
      </div>

      {/* Edit Quantity Modal */}
      <Modal
        open={!!editingCartItem}
        title="修改数量"
        onClose={() => setEditingCartItem(null)}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingCartItem(null)}>取消</Button>
            <Button variant="primary" onClick={handleSaveQuantity}>确定</Button>
          </>
        }
      >
        <Input
          type="number"
          label="数量"
          value={editQuantityValue}
          onChange={(e) => setEditQuantityValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSaveQuantity()}
          autoFocus
        />
      </Modal>
    </div>
  );
}
