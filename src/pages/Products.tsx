import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Package, Plus, Search, Edit2, Trash2, ChevronRight, ChevronDown, FolderOpen, Folder } from 'lucide-react';
import { Card, Button, Input, Select, Modal, Table, Badge } from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useProductStore } from '@/store/productStore';
import { categoryApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Product, Category } from '../../shared/types';
import { UNIT_TYPE_LABELS } from '../../shared/types';

const UNIT_TYPE_OPTIONS = [
  { label: '按个', value: 'piece' },
  { label: '按斤', value: 'weight' },
  { label: '按米', value: 'length' },
];

interface ProductFormData {
  sku: string;
  name: string;
  categoryId: number | '';
  barcode: string;
  unitType: 'piece' | 'weight' | 'length';
  baseUnit: string;
  saleUnit: string;
  wholeUnit: string;
  unitRate: number | '';
  wholeRate: number | '';
  pieceWeight: number | '';
  retailPrice: number | '';
  wholesalePrice: number | '';
  costPrice: number | '';
  stock: number | '';
  warningStock: number | '';
}

interface CategoryFormData {
  name: string;
  parentId: number | '';
  sort: number;
}

const defaultProductForm: ProductFormData = {
  sku: '', name: '', categoryId: '', barcode: '',
  unitType: 'piece', baseUnit: '个', saleUnit: '个', wholeUnit: '箱',
  unitRate: 1, wholeRate: 1, pieceWeight: 0,
  retailPrice: '', wholesalePrice: '', costPrice: '',
  stock: '', warningStock: '',
};

const defaultCategoryForm: CategoryFormData = {
  name: '', parentId: '', sort: 0,
};

const Products: React.FC = () => {
  const {
    products, categoryTree, loading, pagination,
    fetchProducts, fetchCategoryTree,
    createProduct, updateProduct, deleteProduct,
  } = useProductStore();

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [keyword, setKeyword] = useState('');
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductFormData>(defaultProductForm);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState<CategoryFormData>(defaultCategoryForm);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'product' | 'category'; id: number } | null>(null);

  useEffect(() => { fetchCategoryTree(); }, []);

  const loadData = useCallback((page = 1) => {
    fetchProducts({
      page, pageSize: pagination.pageSize,
      keyword: keyword || undefined,
      categoryId: selectedCategoryId || undefined,
    });
  }, [keyword, selectedCategoryId, pagination.pageSize]);

  useEffect(() => { loadData(); }, [selectedCategoryId]);

  const handleCategorySelect = useCallback((id: number) => {
    setSelectedCategoryId(prev => prev === id ? null : id);
  }, []);

  const toggleExpand = useCallback((id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const flatCategories = useMemo(() => {
    const result: { id: number; name: string; level: number; parentId: number | null }[] = [];
    const walk = (nodes: Category[]) => {
      for (const n of nodes) {
        result.push({ id: n.id, name: n.name, level: n.level, parentId: n.parentId });
        if (n.children) walk(n.children);
      }
    };
    walk(categoryTree);
    return result;
  }, [categoryTree]);

  const level3Options = useMemo(() =>
    flatCategories.filter(c => c.level === 3).map(c => ({ label: c.name, value: c.id })),
    [flatCategories]);

  const allCategoryOptions = useMemo(() => {
    const opts: { label: string; value: number | string }[] = [{ label: '全部分类', value: '' }];
    const walk = (nodes: Category[], prefix = '') => {
      for (const n of nodes) {
        opts.push({ label: prefix + n.name, value: n.id });
        if (n.children) walk(n.children, prefix + '  ');
      }
    };
    walk(categoryTree);
    return opts;
  }, [categoryTree]);

  const parentCategoryOptions = useMemo(() => {
    const opts: { label: string; value: number | string }[] = [{ label: '无（顶级品类）', value: '' }];
    for (const c of flatCategories) {
      if (c.level === 1) opts.push({ label: c.name, value: c.id });
      if (c.level === 2) opts.push({ label: `  └ ${c.name}`, value: c.id });
    }
    return opts;
  }, [flatCategories]);

  const minUnitPrice = useMemo(() => {
    const rp = Number(productForm.retailPrice) || 0;
    const ur = Number(productForm.unitRate) || 1;
    return ur > 0 ? rp / ur : 0;
  }, [productForm.retailPrice, productForm.unitRate]);

  const pf = useCallback((field: keyof ProductFormData, value: any) => {
    setProductForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const openProductModal = useCallback((product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        sku: product.sku, name: product.name, categoryId: product.categoryId,
        barcode: product.barcode, unitType: product.unitType,
        baseUnit: product.baseUnit, saleUnit: product.saleUnit, wholeUnit: product.wholeUnit,
        unitRate: product.unitRate, wholeRate: product.wholeRate, pieceWeight: product.pieceWeight,
        retailPrice: product.retailPrice, wholesalePrice: product.wholesalePrice,
        costPrice: product.costPrice, stock: product.stock, warningStock: product.warningStock,
      });
    } else {
      setEditingProduct(null);
      setProductForm(defaultProductForm);
    }
    setProductModalOpen(true);
  }, []);

  const handleProductSubmit = useCallback(async () => {
    const data = {
      sku: productForm.sku, name: productForm.name,
      categoryId: Number(productForm.categoryId), barcode: productForm.barcode,
      unitType: productForm.unitType,
      baseUnit: productForm.baseUnit, saleUnit: productForm.saleUnit, wholeUnit: productForm.wholeUnit,
      unitRate: Number(productForm.unitRate), wholeRate: Number(productForm.wholeRate),
      pieceWeight: Number(productForm.pieceWeight),
      retailPrice: Number(productForm.retailPrice), wholesalePrice: Number(productForm.wholesalePrice),
      costPrice: Number(productForm.costPrice),
      minUnitPrice: Number(productForm.retailPrice) / (Number(productForm.unitRate) || 1),
      stock: Number(productForm.stock), warningStock: Number(productForm.warningStock),
    };
    const ok = editingProduct
      ? await updateProduct(editingProduct.id, data)
      : await createProduct(data as any);
    if (ok) { setProductModalOpen(false); loadData(pagination.page); }
  }, [productForm, editingProduct, pagination.page]);

  const openCategoryModal = useCallback((category?: Category) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({ name: category.name, parentId: category.parentId || '', sort: category.sort });
    } else {
      setEditingCategory(null);
      setCategoryForm(defaultCategoryForm);
    }
    setCategoryModalOpen(true);
  }, []);

  const handleCategorySubmit = useCallback(async () => {
    const data = {
      name: categoryForm.name,
      parentId: categoryForm.parentId ? Number(categoryForm.parentId) : null,
      sort: categoryForm.sort,
    };
    if (editingCategory) await categoryApi.updateCategory(editingCategory.id, data);
    else await categoryApi.createCategory(data);
    setCategoryModalOpen(false);
    fetchCategoryTree();
  }, [categoryForm, editingCategory]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'product') {
      const ok = await deleteProduct(deleteTarget.id);
      if (ok) setDeleteTarget(null);
    } else {
      await categoryApi.deleteCategory(deleteTarget.id);
      if (selectedCategoryId === deleteTarget.id) setSelectedCategoryId(null);
      setDeleteTarget(null);
      fetchCategoryTree();
      loadData(1);
    }
  }, [deleteTarget, selectedCategoryId]);

  const columns: TableColumn<Product>[] = useMemo(() => [
    { key: 'sku', title: 'SKU', width: 100 },
    { key: 'name', title: '商品名称', width: 150 },
    { key: 'categoryName', title: '品类', width: 100 },
    { key: 'unitType', title: '计价方式', width: 80, render: (r) => UNIT_TYPE_LABELS[r.unitType] },
    { key: 'retailPrice', title: '零售价', width: 90, render: (r) => `¥${r.retailPrice.toFixed(2)}` },
    { key: 'wholesalePrice', title: '批发价', width: 90, render: (r) => `¥${r.wholesalePrice.toFixed(2)}` },
    { key: 'minUnitPrice', title: '最小单位价', width: 100, render: (r) => `¥${r.minUnitPrice.toFixed(4)}` },
    {
      key: 'stock', title: '库存', width: 100,
      render: (r) => (
        <span className={r.stock <= r.warningStock ? 'text-red-400 font-semibold' : 'text-slate-300'}>
          {r.stock} {r.saleUnit}
        </span>
      ),
    },
    { key: 'warningStock', title: '预警', width: 70 },
    {
      key: 'actions', title: '操作', width: 90,
      render: (r) => (
        <div className="flex items-center gap-2">
          <button onClick={() => openProductModal(r)} className="text-slate-400 hover:text-industrial-orange transition-colors"><Edit2 size={15} /></button>
          <button onClick={() => setDeleteTarget({ type: 'product', id: r.id })} className="text-slate-400 hover:text-red-400 transition-colors"><Trash2 size={15} /></button>
        </div>
      ),
    },
  ], [openProductModal]);

  const renderTreeNode = (node: Category, depth: number) => {
    const hasChildren = !!(node.children && node.children.length > 0);
    const isExpanded = expandedIds.has(node.id);
    const isSelected = selectedCategoryId === node.id;
    return (
      <div key={node.id}>
        <div
          className={cn(
            'flex items-center gap-1 py-1.5 px-2 cursor-pointer hover:bg-slate-700/50 rounded text-sm group transition-colors',
            isSelected ? 'bg-industrial-orange/10 border-l-2 border-industrial-orange' : 'border-l-2 border-transparent',
            depth === 1 && 'pl-6',
            depth === 2 && 'pl-10',
          )}
          onClick={() => { handleCategorySelect(node.id); if (hasChildren) toggleExpand(node.id); }}
        >
          {hasChildren ? (
            <button onClick={e => { e.stopPropagation(); toggleExpand(node.id); }} className="p-0.5 text-slate-400 hover:text-white">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : <span className="w-5" />}
          {hasChildren ? (
            isExpanded ? <FolderOpen size={14} className="text-industrial-orange flex-shrink-0" /> : <Folder size={14} className="text-industrial-orange/70 flex-shrink-0" />
          ) : <Folder size={14} className="text-slate-500 flex-shrink-0" />}
          <span className={cn('flex-1 truncate', isSelected ? 'text-industrial-orange font-medium' : 'text-slate-300')}>{node.name}</span>
          <span className="hidden group-hover:flex items-center gap-0.5">
            <button onClick={e => { e.stopPropagation(); openCategoryModal(node); }} className="p-0.5 text-slate-400 hover:text-industrial-orange"><Edit2 size={12} /></button>
            <button onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'category', id: node.id }); }} className="p-0.5 text-slate-400 hover:text-red-400"><Trash2 size={12} /></button>
          </span>
        </div>
        {hasChildren && isExpanded && node.children!.map(c => renderTreeNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      <Card className="w-64 flex-shrink-0 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <Package size={16} className="text-industrial-orange" />品类管理
          </h3>
          <button onClick={() => openCategoryModal()} className="p-1 rounded hover:bg-slate-700 text-industrial-orange hover:text-industrial-orange-light transition-colors">
            <Plus size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-1">
          <div
            className={cn(
              'flex items-center gap-1 py-1.5 px-2 cursor-pointer hover:bg-slate-700/50 rounded text-sm border-l-2 transition-colors',
              selectedCategoryId === null ? 'bg-industrial-orange/10 border-industrial-orange' : 'border-transparent',
            )}
            onClick={() => setSelectedCategoryId(null)}
          >
            <span className="w-5" />
            <FolderOpen size={14} className="text-industrial-orange flex-shrink-0" />
            <span className={cn('flex-1', selectedCategoryId === null ? 'text-industrial-orange font-medium' : 'text-slate-300')}>全部商品</span>
          </div>
          {categoryTree.map(c => renderTreeNode(c, 0))}
        </div>
      </Card>

      <div className="flex-1 flex flex-col min-w-0">
        <Card className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 flex-wrap">
            <div className="w-56">
              <Input placeholder="搜索商品名称/SKU" prefix={Search} value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadData(1)} />
            </div>
            <div className="w-44">
              <Select options={allCategoryOptions} value={selectedCategoryId ?? ''} onChange={v => { setSelectedCategoryId(v === '' ? null : Number(v)); }} placeholder="分类筛选" />
            </div>
            <Button variant="primary" size="sm" onClick={() => loadData(1)}>搜索</Button>
            <div className="flex-1" />
            <Button variant="warning" size="sm" onClick={() => openProductModal()}>
              <Plus size={14} /> 新增商品
            </Button>
          </div>
          <div className="flex-1 overflow-auto">
            <Table
              columns={columns}
              dataSource={products}
              loading={loading}
              rowKey="id"
              pagination={{
                current: pagination.page,
                pageSize: pagination.pageSize,
                total: pagination.total,
                onChange: (page) => loadData(page),
              }}
            />
          </div>
        </Card>
      </div>

      <Modal
        open={productModalOpen}
        title={editingProduct ? '编辑商品' : '新增商品'}
        onClose={() => setProductModalOpen(false)}
        size="xl"
        className="[&_.max-w-xl]:!max-w-3xl"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setProductModalOpen(false)}>取消</Button>
            <Button variant="primary" size="sm" onClick={handleProductSubmit} loading={loading}>确认</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 max-h-[65vh] overflow-y-auto pr-1">
          <Input label="SKU" value={productForm.sku} onChange={e => pf('sku', e.target.value)} />
          <Input label="商品名称" value={productForm.name} onChange={e => pf('name', e.target.value)} />
          <Select label="品类" options={level3Options} value={productForm.categoryId} onChange={v => pf('categoryId', v)} placeholder="选择三级品类" />
          <Input label="条码" value={productForm.barcode} onChange={e => pf('barcode', e.target.value)} />
          <Select label="计价方式" options={UNIT_TYPE_OPTIONS} value={productForm.unitType} onChange={v => pf('unitType', v)} />
          <Input label="最小单位" value={productForm.baseUnit} onChange={e => pf('baseUnit', e.target.value)} />
          <Input label="销售单位" value={productForm.saleUnit} onChange={e => pf('saleUnit', e.target.value)} />
          <Input label="整件单位" value={productForm.wholeUnit} onChange={e => pf('wholeUnit', e.target.value)} />
          <Input label="销售单位换算率" type="number" value={productForm.unitRate} onChange={e => pf('unitRate', e.target.value ? Number(e.target.value) : '')} />
          <Input label="整件换算率" type="number" value={productForm.wholeRate} onChange={e => pf('wholeRate', e.target.value ? Number(e.target.value) : '')} />
          <Input label="单重(克)" type="number" value={productForm.pieceWeight} onChange={e => pf('pieceWeight', e.target.value ? Number(e.target.value) : '')} />
          <Input label="零售价(¥)" type="number" value={productForm.retailPrice} onChange={e => pf('retailPrice', e.target.value ? Number(e.target.value) : '')} />
          <Input label="批发价(¥)" type="number" value={productForm.wholesalePrice} onChange={e => pf('wholesalePrice', e.target.value ? Number(e.target.value) : '')} />
          <Input label="成本价(¥)" type="number" value={productForm.costPrice} onChange={e => pf('costPrice', e.target.value ? Number(e.target.value) : '')} />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-slate-300">最小单位价</label>
            <div className="h-10 px-3 flex items-center bg-slate-800/60 border border-slate-700 rounded-md text-sm text-slate-400">
              ¥{minUnitPrice.toFixed(4)} <span className="ml-2 text-xs text-slate-500">（自动计算）</span>
            </div>
          </div>
          <Input label="库存数量" type="number" value={productForm.stock} onChange={e => pf('stock', e.target.value ? Number(e.target.value) : '')} />
          <Input label="预警库存" type="number" value={productForm.warningStock} onChange={e => pf('warningStock', e.target.value ? Number(e.target.value) : '')} />
        </div>
      </Modal>

      <Modal
        open={categoryModalOpen}
        title={editingCategory ? '编辑品类' : '新增品类'}
        onClose={() => setCategoryModalOpen(false)}
        size="md"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCategoryModalOpen(false)}>取消</Button>
            <Button variant="primary" size="sm" onClick={handleCategorySubmit}>确认</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="品类名称" value={categoryForm.name} onChange={e => setCategoryForm(p => ({ ...p, name: e.target.value }))} />
          <Select label="上级品类" options={parentCategoryOptions} value={categoryForm.parentId} onChange={v => setCategoryForm(p => ({ ...p, parentId: v === '' ? '' : Number(v) }))} placeholder="选择上级品类" />
          <Input label="排序" type="number" value={categoryForm.sort} onChange={e => setCategoryForm(p => ({ ...p, sort: Number(e.target.value) }))} />
          {categoryForm.parentId !== '' && (
            <p className="text-xs text-slate-500">
              层级将自动计算为：{flatCategories.find(c => c.id === Number(categoryForm.parentId))?.level === 1 ? '2' : '3'}
            </p>
          )}
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        title="确认删除"
        onClose={() => setDeleteTarget(null)}
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>取消</Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>删除</Button>
          </>
        }
      >
        <p className="text-slate-300 text-sm">
          {deleteTarget?.type === 'product' ? '确定删除该商品吗？此操作不可撤销。' : '确定删除该品类吗？其下子品类也将被删除，此操作不可撤销。'}
        </p>
      </Modal>
    </div>
  );
};

export default Products;
