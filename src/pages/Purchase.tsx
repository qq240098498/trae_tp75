import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Trash2, Eye, PackageOpen } from 'lucide-react';
import { format } from 'date-fns';
import { purchaseApi, supplierApi, productApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/components/ui/Toast';
import { Button, Modal, Input, Select, Table, Badge, type TableColumn } from '@/components/ui';
import type { PurchaseOrder, PurchaseOrderItem, Supplier, Product } from '../../shared/types';
import { PAY_METHOD_LABELS } from '../../shared/types';

const statusOptions = [
  { label: '全部付款状态', value: '' },
  { label: '待付款', value: 'pending' },
  { label: '部分付款', value: 'partial' },
  { label: '已结清', value: 'paid' },
];

const stockStatusOptions = [
  { label: '全部入库状态', value: '' },
  { label: '待入库', value: 'pending' },
  { label: '部分入库', value: 'partial' },
  { label: '已入库', value: 'completed' },
];

const payMethodOptions = [
  { label: '现金', value: 'cash' },
  { label: '转账', value: 'transfer' },
  { label: '挂账', value: 'credit' },
];

function getStatusBadge(status: PurchaseOrder['status']) {
  const map: Record<string, { variant: 'warning' | 'success' | 'danger'; label: string }> = {
    pending: { variant: 'warning', label: '待付款' },
    partial: { variant: 'danger', label: '部分付款' },
    paid: { variant: 'success', label: '已结清' },
  };
  const cfg = map[status];
  return cfg ? <Badge variant={cfg.variant}>{cfg.label}</Badge> : <Badge>{status}</Badge>;
}

function getStockStatusBadge(stockStatus: PurchaseOrder['stockStatus']) {
  const map: Record<string, { variant: 'warning' | 'danger' | 'success'; label: string }> = {
    pending: { variant: 'warning', label: '待入库' },
    partial: { variant: 'danger', label: '部分入库' },
    completed: { variant: 'success', label: '已入库' },
  };
  const cfg = map[stockStatus];
  return cfg ? <Badge variant={cfg.variant}>{cfg.label}</Badge> : <Badge>{stockStatus}</Badge>;
}

interface OrderItemRow {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  _searchText: string;
  _showDropdown: boolean;
}

interface StockInRow {
  id: number;
  productName: string;
  quantity: number;
  stockInQty: number;
  currentStockIn: number;
  inputQty: number;
}

export default function Purchase() {
  const user = useAuthStore((s) => s.user);
  const toast = useToast();

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string | number>('');
  const [stockStatusFilter, setStockStatusFilter] = useState<string | number>('');
  const [supplierFilter, setSupplierFilter] = useState<string | number>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | number>('');
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [paidAmount, setPaidAmount] = useState('');
  const [payMethod, setPayMethod] = useState<string | number>('cash');
  const [productSearchResults, setProductSearchResults] = useState<Product[]>([]);
  const [activeSearchIdx, setActiveSearchIdx] = useState<number | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const [stockInModalOpen, setStockInModalOpen] = useState(false);
  const [stockInOrder, setStockInOrder] = useState<PurchaseOrder | null>(null);
  const [stockInRows, setStockInRows] = useState<StockInRow[]>([]);
  const [stockInSubmitting, setStockInSubmitting] = useState(false);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<PurchaseOrder | null>(null);

  const supplierSelectOptions = [
    { label: '全部供应商', value: '' },
    ...allSuppliers.map((s) => ({ label: s.name, value: s.id })),
  ];

  const createSupplierOptions = [
    { label: '请选择供应商', value: '' },
    ...allSuppliers.map((s) => ({ label: s.name, value: s.id })),
  ];

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, pageSize };
      if (statusFilter) params.status = statusFilter;
      if (stockStatusFilter) params.stockStatus = stockStatusFilter;
      if (supplierFilter) params.supplierId = supplierFilter;
      if (startDate) params.startDate = new Date(startDate).getTime();
      if (endDate) params.endDate = new Date(endDate).getTime() + 86400000;
      const res = await purchaseApi.getPurchaseOrders(params as Parameters<typeof purchaseApi.getPurchaseOrders>[0]);
      if (res.success && res.data) {
        setOrders(res.data.items);
        setTotal(res.data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, stockStatusFilter, supplierFilter, startDate, endDate]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    supplierApi.getAllSuppliers().then((res) => {
      if (res.success && res.data) setAllSuppliers(res.data);
    });
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setActiveSearchIdx(null);
        setProductSearchResults([]);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSearch() {
    setPage(1);
    fetchOrders();
  }

  function openCreateModal() {
    setSelectedSupplierId('');
    setOrderItems([]);
    setPaidAmount('');
    setPayMethod('cash');
    setCreateModalOpen(true);
  }

  async function searchProducts(keyword: string, idx: number) {
    const updated = [...orderItems];
    updated[idx] = { ...updated[idx], _searchText: keyword, _showDropdown: true };
    setOrderItems(updated);
    setActiveSearchIdx(idx);
    if (!keyword.trim()) {
      setProductSearchResults([]);
      return;
    }
    const res = await productApi.getProducts({ keyword, pageSize: 10 });
    if (res.success && res.data) {
      setProductSearchResults(res.data.items);
    }
  }

  function selectProduct(product: Product, idx: number) {
    const updated = [...orderItems];
    updated[idx] = {
      ...updated[idx],
      productId: product.id,
      productName: product.name,
      unitPrice: product.costPrice,
      amount: updated[idx].quantity * product.costPrice,
      _searchText: product.name,
      _showDropdown: false,
    };
    setOrderItems(updated);
    setProductSearchResults([]);
    setActiveSearchIdx(null);
  }

  function addOrderItemRow() {
    setOrderItems([
      ...orderItems,
      { productId: 0, productName: '', quantity: 1, unitPrice: 0, amount: 0, _searchText: '', _showDropdown: false },
    ]);
  }

  function removeOrderItemRow(idx: number) {
    setOrderItems(orderItems.filter((_, i) => i !== idx));
  }

  function updateItemQty(idx: number, qty: number) {
    const updated = [...orderItems];
    updated[idx] = { ...updated[idx], quantity: qty, amount: qty * updated[idx].unitPrice };
    setOrderItems(updated);
  }

  function updateItemPrice(idx: number, price: number) {
    const updated = [...orderItems];
    updated[idx] = { ...updated[idx], unitPrice: price, amount: updated[idx].quantity * price };
    setOrderItems(updated);
  }

  const totalAmount = orderItems.reduce((sum, item) => sum + item.amount, 0);

  async function handleCreateOrder() {
    if (!selectedSupplierId) {
      toast.warning('请选择供应商');
      return;
    }
    const validItems = orderItems.filter((item) => item.productId > 0);
    if (validItems.length === 0) {
      toast.warning('请至少添加一个有效商品');
      return;
    }
    setCreating(true);
    try {
      const items: PurchaseOrderItem[] = validItems.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        amount: item.amount,
        stockInQty: 0,
      }));
      const res = await purchaseApi.createPurchaseOrder({
        supplierId: Number(selectedSupplierId),
        items,
        totalAmount,
        paidAmount: Number(paidAmount) || 0,
        payMethod: payMethod as 'cash' | 'transfer' | 'credit',
        status: 'pending',
        stockStatus: 'pending',
        operatorId: user?.id ?? 1,
      });
      if (res.success) {
        toast.success('采购单创建成功');
        setCreateModalOpen(false);
        fetchOrders();
      } else {
        toast.error(res.message || '创建采购单失败');
      }
    } catch (error: any) {
      toast.error(error?.message || '创建采购单失败，请重试');
    } finally {
      setCreating(false);
    }
  }

  async function openStockIn(order: PurchaseOrder) {
    const res = await purchaseApi.getPurchaseOrder(order.id!);
    if (res.success && res.data) {
      setStockInOrder(res.data);
      setStockInRows(
        res.data.items.map((item) => ({
          id: item.id!,
          productName: item.productName,
          quantity: item.quantity,
          stockInQty: item.stockInQty,
          currentStockIn: item.stockInQty,
          inputQty: 0,
        }))
      );
      setStockInModalOpen(true);
    }
  }

  function updateStockInQty(idx: number, qty: number) {
    const updated = [...stockInRows];
    const row = updated[idx];
    const maxQty = row.quantity - row.currentStockIn;
    updated[idx] = { ...row, inputQty: Math.max(0, Math.min(qty, maxQty)) };
    setStockInRows(updated);
  }

  async function handleStockInSubmit() {
    if (!stockInOrder) return;
    const itemsToStockIn = stockInRows.filter((r) => r.inputQty > 0);
    if (itemsToStockIn.length === 0) {
      toast.warning('请至少填写一个商品的入库数量');
      return;
    }
    setStockInSubmitting(true);
    try {
      const items = itemsToStockIn.map((r) => ({ id: r.id, stockInQty: r.inputQty }));
      const res = await purchaseApi.stockInPurchaseOrder(stockInOrder.id!, { 
        items, 
        operatorId: user?.id ?? 1 
      });
      if (res.success) {
        toast.success('入库成功');
        setStockInModalOpen(false);
        fetchOrders();
      } else {
        toast.error(res.message || '入库失败');
      }
    } catch (error: any) {
      toast.error(error?.message || '入库失败，请重试');
    } finally {
      setStockInSubmitting(false);
    }
  }

  async function openDetail(order: PurchaseOrder) {
    const res = await purchaseApi.getPurchaseOrder(order.id!);
    if (res.success && res.data) {
      setDetailOrder(res.data);
      setDetailModalOpen(true);
    }
  }

  async function handleDelete(order: PurchaseOrder) {
    if (!confirm(`确定删除采购单「${order.orderNo}」吗？`)) return;
    try {
      await purchaseApi.deletePurchaseOrder(order.id!);
      fetchOrders();
    } catch {}
  }

  const columns: TableColumn<PurchaseOrder>[] = [
    { key: 'orderNo', title: '单号', dataIndex: 'orderNo', width: 150 },
    { key: 'supplierName', title: '供应商', dataIndex: 'supplierName' },
    {
      key: 'totalAmount',
      title: '总金额',
      dataIndex: 'totalAmount',
      render: (record) => <span className="text-white font-medium">¥{record.totalAmount.toFixed(2)}</span>,
    },
    {
      key: 'paidAmount',
      title: '已付',
      dataIndex: 'paidAmount',
      render: (record) => <span>¥{record.paidAmount.toFixed(2)}</span>,
    },
    {
      key: 'payMethod',
      title: '付款方式',
      dataIndex: 'payMethod',
      render: (record) => PAY_METHOD_LABELS[record.payMethod] ?? record.payMethod,
    },
    {
      key: 'status',
      title: '付款状态',
      dataIndex: 'status',
      render: (record) => getStatusBadge(record.status),
    },
    {
      key: 'stockStatus',
      title: '入库状态',
      dataIndex: 'stockStatus',
      render: (record) => getStockStatusBadge(record.stockStatus),
    },
    { key: 'operatorName', title: '操作人', dataIndex: 'operatorName' },
    {
      key: 'createTime',
      title: '创建时间',
      dataIndex: 'createTime',
      render: (record) =>
        record.createTime ? format(new Date(record.createTime), 'yyyy-MM-dd HH:mm') : '-',
    },
    {
      key: 'actions',
      title: '操作',
      width: 200,
      render: (record) => (
        <div className="flex items-center gap-1.5">
          <Button variant="secondary" size="sm" onClick={() => openDetail(record)}>
            <Eye size={14} /> 详情
          </Button>
          {record.stockStatus !== 'completed' && (
            <Button variant="success" size="sm" onClick={() => openStockIn(record)}>
              <PackageOpen size={14} /> 入库
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={() => handleDelete(record)}>
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  const detailColumns: TableColumn<PurchaseOrderItem>[] = [
    { key: 'productName', title: '商品名称', dataIndex: 'productName' },
    { key: 'quantity', title: '数量', dataIndex: 'quantity' },
    {
      key: 'unitPrice',
      title: '单价',
      dataIndex: 'unitPrice',
      render: (record) => `¥${record.unitPrice.toFixed(2)}`,
    },
    {
      key: 'amount',
      title: '金额',
      dataIndex: 'amount',
      render: (record) => <span className="text-white font-medium">¥${record.amount.toFixed(2)}</span>,
    },
    {
      key: 'stockInQty',
      title: '已入库',
      dataIndex: 'stockInQty',
      render: (record) => `${record.stockInQty} / ${record.quantity}`,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">进货录单</h1>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          containerClassName="w-40"
        />
        <Select
          options={stockStatusOptions}
          value={stockStatusFilter}
          onChange={(v) => { setStockStatusFilter(v); setPage(1); }}
          containerClassName="w-40"
        />
        <Select
          options={supplierSelectOptions}
          value={supplierFilter}
          onChange={(v) => { setSupplierFilter(v); setPage(1); }}
          containerClassName="w-44"
        />
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          containerClassName="w-40"
        />
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          containerClassName="w-40"
        />
        <Button variant="primary" onClick={handleSearch}>
          <Search size={16} /> 搜索
        </Button>
        <Button variant="warning" onClick={openCreateModal}>
          <Plus size={16} /> 新建采购单
        </Button>
      </div>

      <Table<PurchaseOrder>
        columns={columns}
        dataSource={orders}
        loading={loading}
        rowKey="id"
        pagination={{ current: page, pageSize, total, onChange: setPage }}
      />

      <Modal
        open={createModalOpen}
        title="新建采购单"
        onClose={() => setCreateModalOpen(false)}
        size="xl"
        className="[&_.relative]:max-w-3xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>取消</Button>
            <Button
              variant="primary"
              onClick={handleCreateOrder}
              loading={creating}
              disabled={!selectedSupplierId || orderItems.filter((i) => i.productId > 0).length === 0}
            >
              提交
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div>
            <h4 className="text-sm font-semibold text-industrial-orange-light mb-3">① 选择供应商</h4>
            <Select
              options={createSupplierOptions}
              value={selectedSupplierId}
              onChange={setSelectedSupplierId}
              placeholder="请选择供应商"
            />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-industrial-orange-light mb-3">② 添加商品</h4>
            <div className="space-y-2">
              {orderItems.map((item, idx) => (
                <div key={idx} className="relative flex items-center gap-2" ref={activeSearchIdx === idx ? searchRef : undefined}>
                  <div className="relative flex-1">
                    <Input
                      placeholder="搜索商品名称..."
                      value={item._searchText}
                      onChange={(e) => searchProducts(e.target.value, idx)}
                      onFocus={() => setActiveSearchIdx(idx)}
                    />
                    {activeSearchIdx === idx && item._showDropdown && productSearchResults.length > 0 && (
                      <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-xl max-h-40 overflow-auto">
                        {productSearchResults.map((p) => (
                          <button
                            key={p.id}
                            className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                            onClick={() => selectProduct(p, idx)}
                          >
                            {p.name} <span className="text-slate-500 text-xs">(成本: ¥{p.costPrice.toFixed(2)})</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Input
                    type="number"
                    placeholder="数量"
                    value={item.quantity || ''}
                    onChange={(e) => updateItemQty(idx, Number(e.target.value))}
                    containerClassName="w-24"
                  />
                  <Input
                    type="number"
                    placeholder="单价"
                    value={item.unitPrice || ''}
                    onChange={(e) => updateItemPrice(idx, Number(e.target.value))}
                    containerClassName="w-28"
                  />
                  <span className="text-sm text-slate-300 w-24 text-right">¥{item.amount.toFixed(2)}</span>
                  <Button variant="danger" size="sm" onClick={() => removeOrderItemRow(idx)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              ))}
            </div>
            <Button variant="secondary" size="sm" onClick={addOrderItemRow} className="mt-2">
              <Plus size={14} /> 添加商品
            </Button>
          </div>

          <div className="border-t border-slate-700 pt-4">
            <h4 className="text-sm font-semibold text-industrial-orange-light mb-3">③ 确认信息</h4>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="text-sm text-slate-300">
                总金额：<span className="text-white text-lg font-bold">¥{totalAmount.toFixed(2)}</span>
              </div>
              <Input
                type="number"
                label="已付金额"
                placeholder="0.00"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                containerClassName="w-36"
              />
              <Select
                label="付款方式"
                options={payMethodOptions}
                value={payMethod}
                onChange={setPayMethod}
                containerClassName="w-36"
              />
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={stockInModalOpen}
        title="采购入库"
        onClose={() => setStockInModalOpen(false)}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setStockInModalOpen(false)}>取消</Button>
            <Button
              variant="success"
              onClick={handleStockInSubmit}
              loading={stockInSubmitting}
              disabled={stockInRows.every((r) => r.inputQty === 0)}
            >
              确认入库
            </Button>
          </>
        }
      >
        {stockInOrder && (
          <div className="space-y-4">
            <div className="text-sm text-slate-400">
              采购单号：<span className="text-white">{stockInOrder.orderNo}</span>
              <span className="mx-3">|</span>
              供应商：<span className="text-white">{stockInOrder.supplierName}</span>
            </div>
            <div className="space-y-2">
              {stockInRows.map((row, idx) => {
                const remaining = row.quantity - row.currentStockIn;
                return (
                  <div key={row.id} className="flex items-center gap-3 py-2 border-b border-slate-700/50">
                    <span className="flex-1 text-sm text-slate-300">{row.productName}</span>
                    <span className="text-sm text-slate-400 w-24 text-center">
                      订购: {row.quantity}
                    </span>
                    <span className="text-sm text-slate-400 w-24 text-center">
                      已入库: {row.currentStockIn}
                    </span>
                    <span className="text-sm text-emerald-400 w-24 text-center">
                      待入库: {remaining}
                    </span>
                    <Input
                      type="number"
                      placeholder="入库数量"
                      value={row.inputQty || ''}
                      onChange={(e) => updateStockInQty(idx, Number(e.target.value))}
                      containerClassName="w-28"
                      disabled={remaining <= 0}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={detailModalOpen}
        title="采购单详情"
        onClose={() => setDetailModalOpen(false)}
        size="xl"
        className="[&_.relative]:max-w-3xl"
      >
        {detailOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">单号：</span>
                <span className="text-white">{detailOrder.orderNo}</span>
              </div>
              <div>
                <span className="text-slate-400">供应商：</span>
                <span className="text-white">{detailOrder.supplierName}</span>
              </div>
              <div>
                <span className="text-slate-400">总金额：</span>
                <span className="text-white font-medium">¥{detailOrder.totalAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400">已付金额：</span>
                <span className="text-white">¥{detailOrder.paidAmount.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400">付款方式：</span>
                <span className="text-white">{PAY_METHOD_LABELS[detailOrder.payMethod] ?? detailOrder.payMethod}</span>
              </div>
              <div>
                <span className="text-slate-400">付款状态：</span>
                {getStatusBadge(detailOrder.status)}
              </div>
              <div>
                <span className="text-slate-400">入库状态：</span>
                {getStockStatusBadge(detailOrder.stockStatus)}
              </div>
              <div>
                <span className="text-slate-400">操作人：</span>
                <span className="text-white">{detailOrder.operatorName}</span>
              </div>
              {detailOrder.createTime && (
                <div>
                  <span className="text-slate-400">创建时间：</span>
                  <span className="text-white">{format(new Date(detailOrder.createTime), 'yyyy-MM-dd HH:mm')}</span>
                </div>
              )}
            </div>
            <Table<PurchaseOrderItem>
              columns={detailColumns}
              dataSource={detailOrder.items}
              rowKey={(item) => String(item.id ?? item.productId)}
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
