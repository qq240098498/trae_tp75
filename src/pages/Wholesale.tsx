import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingCart, Truck } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { productApi, categoryApi, saleApi, projectApi } from '@/lib/api';
import { Button, Input, Select, Badge, Modal } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import type { Product, Category, Project, SaleOrderItem, SaleOrder } from '../../shared/types';
import { PAY_METHOD_LABELS } from '../../shared/types';

const PAY_METHOD_OPTIONS = [
  { label: '现金', value: 'cash' },
  { label: '微信', value: 'wechat' },
  { label: '支付宝', value: 'alipay' },
  { label: '刷卡', value: 'card' },
  { label: '挂账', value: 'credit' },
];

export default function Wholesale() {
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
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [discount, setDiscount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setWholesale(true);
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
      const res = await productApi.getProducts({ page, pageSize: 40, keyword: keyword || undefined, categoryId: selectedCategoryId || undefined });
      if (res.success && res.data) {
        setProducts(res.data.items);
        setTotal(res.data.total);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, keyword, selectedCategoryId]);

  useEffect(() => { fetchCategories(); fetchProjects(); }, [fetchCategories, fetchProjects]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleAddProduct = (product: Product) => { addItem(product, 1); };

  const totalAmount = getTotalAmount();
  const discountValue = parseFloat(discount) || 0;
  const isPercentDiscount = discount.includes('%');
  const actualAmount = isPercentDiscount
    ? totalAmount * (1 - discountValue / 100)
    : totalAmount - discountValue;
  const finalAmount = Math.max(0, actualAmount);

  const handleSubmit = async () => {
    if (items.length === 0) return;
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

      await saleApi.createWholesaleSale({
        items: orderItems,
        totalAmount,
        discount: discountValue,
        actualAmount: finalAmount,
        paidAmount: payMethod === 'credit' ? 0 : finalAmount,
        payMethod: payMethod as SaleOrder['payMethod'],
        projectId: payMethod === 'credit' ? selectedProjectId! : undefined,
        status: payMethod === 'credit' ? 'pending' : 'paid',
        operatorId: user?.id ?? 0,
      });

      success('批发开单成功');
      clearCart();
      setDiscount('');
      setCustomerName('');
      setCustomerPhone('');
      setPayMethod('cash');
      setSelectedProjectId(null);
    } catch {
      toastError('开单失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const allCategories: Category[] = [{ id: 0, name: '全部', parentId: null, level: 1, sort: 0 }, ...categories];

  return (
    <div className="flex h-full gap-4">
      {/* Left Panel - Product Selection */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Input
              placeholder="搜索商品名称/条码"
              value={keyword}
              onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
              prefix={Search}
            />
          </div>
        </div>

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

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-slate-500">加载中...</div>
          ) : products.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-slate-500">暂无商品</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  onClick={() => handleAddProduct(product)}
                  className="bg-slate-800/80 border border-slate-700 rounded-lg p-3 cursor-pointer hover:border-industrial-orange/60 hover:shadow-lg hover:shadow-industrial-orange/5 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-sm font-medium text-white truncate flex-1">{product.name}</span>
                    {product.stock <= product.warningStock && (
                      <Badge variant="danger" className="ml-1 flex-shrink-0">低</Badge>
                    )}
                  </div>
                  <div className="text-industrial-orange font-bold text-lg">
                    ¥{product.wholesalePrice}<span className="text-xs text-slate-400 font-normal">/{product.saleUnit}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    1{product.wholeUnit}={product.wholeRate}{product.saleUnit}
                  </div>
                  <div className="text-xs text-slate-500">库存: {product.stock}{product.saleUnit}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {total > 40 && (
          <div className="flex items-center justify-center gap-2 pt-3 border-t border-slate-700/50">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
            <span className="text-sm text-slate-400">{page} / {Math.ceil(total / 40)}</span>
            <Button variant="secondary" size="sm" disabled={page >= Math.ceil(total / 40)} onClick={() => setPage((p) => p + 1)}>下一页</Button>
          </div>
        )}
      </div>

      {/* Right Panel - Order Form */}
      <div className="w-96 flex flex-col bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden flex-shrink-0">
        <div className="px-4 py-3 border-b border-slate-700 bg-slate-800/80 flex items-center gap-2">
          <Truck size={18} className="text-industrial-orange" />
          <span className="font-semibold text-white">批发订单</span>
          {items.length > 0 && (
            <Badge variant="warning" className="ml-auto">{items.length}项</Badge>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <ShoppingCart size={40} className="mb-2 opacity-30" />
              <span>点击商品添加到订单</span>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.product.id} className="bg-slate-800 rounded-lg p-3 border border-slate-700/50">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{item.product.name}</p>
                    <p className="text-xs text-slate-500">
                      ¥{item.unitPrice}/{item.unitInfo}
                      {item.product.wholeUnit && ` (1${item.product.wholeUnit}=${item.product.wholeRate}${item.product.saleUnit})`}
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateItemQuantity(item.product.id, item.quantity - 1)}
                      className="w-7 h-7 flex items-center justify-center rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center text-sm font-medium text-white">{item.quantity}</span>
                    <button
                      onClick={() => updateItemQuantity(item.product.id, item.quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-industrial-orange">¥{item.amount.toFixed(2)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-slate-700 bg-slate-800/80 px-4 py-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input label="客户姓名" placeholder="选填" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            <Input label="联系电话" placeholder="选填" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </div>

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
              options={projects.map((p) => ({ label: p.name, value: p.id }))}
              value={selectedProjectId ?? ''}
              onChange={(v) => setSelectedProjectId(Number(v))}
              placeholder="请选择项目"
            />
          )}

          <div className="space-y-1 pt-2 border-t border-slate-700/50">
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
            <div className="flex justify-between text-base font-bold pt-1">
              <span className="text-white">实收金额</span>
              <span className="text-industrial-orange text-xl">¥{finalAmount.toFixed(2)}</span>
            </div>
          </div>

          <Button
            variant="warning"
            size="lg"
            className="w-full"
            loading={submitting}
            disabled={items.length === 0}
            onClick={handleSubmit}
          >
            开单
          </Button>
        </div>
      </div>
    </div>
  );
}
