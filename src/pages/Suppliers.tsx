import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { supplierApi } from '@/lib/api';
import { Button, Modal, Input, Select, Table, Badge, type TableColumn } from '@/components/ui';
import type { Supplier } from '../../shared/types';
import { CREDIT_RATING_LABELS } from '../../shared/types';

const creditRatingOptions = [
  { label: '全部评级', value: '' },
  { label: 'A - 优秀', value: 'A' },
  { label: 'B - 良好', value: 'B' },
  { label: 'C - 一般', value: 'C' },
];

const creditRatingSelectOptions = [
  { label: 'A - 优秀', value: 'A' },
  { label: 'B - 良好', value: 'B' },
  { label: 'C - 一般', value: 'C' },
];

interface SupplierFormData {
  name: string;
  contact: string;
  phone: string;
  address: string;
  mainCategory: string;
  creditRating: 'A' | 'B' | 'C';
  remark: string;
}

const emptyForm: SupplierFormData = {
  name: '',
  contact: '',
  phone: '',
  address: '',
  mainCategory: '',
  creditRating: 'B',
  remark: '',
};

function getCreditBadge(rating: 'A' | 'B' | 'C') {
  const variantMap: Record<string, 'success' | 'info' | 'warning'> = {
    A: 'success',
    B: 'info',
    C: 'warning',
  };
  return (
    <Badge variant={variantMap[rating]}>
      {rating} - {CREDIT_RATING_LABELS[rating]}
    </Badge>
  );
}

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [creditFilter, setCreditFilter] = useState<string | number>('');
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierFormData>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await supplierApi.getSuppliers({ page, pageSize, keyword: keyword || undefined });
      if (res.success && res.data) {
        let items = res.data.items;
        if (creditFilter) {
          items = items.filter((s) => s.creditRating === creditFilter);
        }
        setSuppliers(items);
        setTotal(creditFilter ? items.length : res.data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, creditFilter]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  function handleSearch() {
    setPage(1);
    fetchSuppliers();
  }

  function openCreate() {
    setEditingSupplier(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(supplier: Supplier) {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name,
      contact: supplier.contact,
      phone: supplier.phone,
      address: supplier.address,
      mainCategory: supplier.mainCategory,
      creditRating: supplier.creditRating,
      remark: supplier.remark,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingSupplier) {
        await supplierApi.updateSupplier(editingSupplier.id, form);
      } else {
        await supplierApi.createSupplier(form);
      }
      setModalOpen(false);
      fetchSuppliers();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(supplier: Supplier) {
    if (!confirm(`确定删除供应商「${supplier.name}」吗？`)) return;
    try {
      await supplierApi.deleteSupplier(supplier.id);
      fetchSuppliers();
    } catch {}
  }

  const columns: TableColumn<Supplier>[] = [
    { key: 'name', title: '供应商名称', dataIndex: 'name' },
    { key: 'contact', title: '联系人', dataIndex: 'contact' },
    { key: 'phone', title: '电话', dataIndex: 'phone' },
    { key: 'address', title: '地址', dataIndex: 'address', width: 180 },
    { key: 'mainCategory', title: '主营品类', dataIndex: 'mainCategory' },
    {
      key: 'creditRating',
      title: '信誉评级',
      dataIndex: 'creditRating',
      render: (record) => getCreditBadge(record.creditRating),
    },
    { key: 'remark', title: '备注', dataIndex: 'remark', width: 140 },
    {
      key: 'actions',
      title: '操作',
      width: 140,
      render: (record) => (
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => openEdit(record)}>
            <Pencil size={14} /> 编辑
          </Button>
          <Button variant="danger" size="sm" onClick={() => handleDelete(record)}>
            <Trash2 size={14} /> 删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">供应商管理</h1>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[240px] max-w-md">
          <Input
            placeholder="搜索供应商名称..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            prefix={Search}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <Select
          options={creditRatingOptions}
          value={creditFilter}
          onChange={(v) => {
            setCreditFilter(v);
            setPage(1);
          }}
          containerClassName="w-40"
        />
        <Button variant="primary" onClick={handleSearch}>
          <Search size={16} /> 搜索
        </Button>
        <Button variant="warning" onClick={openCreate}>
          <Plus size={16} /> 新增供应商
        </Button>
      </div>

      <Table<Supplier>
        columns={columns}
        dataSource={suppliers}
        loading={loading}
        rowKey="id"
        pagination={{
          current: page,
          pageSize,
          total,
          onChange: setPage,
        }}
      />

      <Modal
        open={modalOpen}
        title={editingSupplier ? '编辑供应商' : '新增供应商'}
        onClose={() => setModalOpen(false)}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              取消
            </Button>
            <Button variant="primary" onClick={handleSave} loading={saving} disabled={!form.name.trim()}>
              {editingSupplier ? '保存' : '创建'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="供应商名称 *"
            placeholder="请输入供应商名称"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={form.name.trim() === '' && form.name.length > 0 ? '供应商名称不能为空' : undefined}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="联系人"
              placeholder="请输入联系人"
              value={form.contact}
              onChange={(e) => setForm({ ...form, contact: e.target.value })}
            />
            <Input
              label="电话"
              placeholder="请输入电话"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <Input
            label="地址"
            placeholder="请输入地址"
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="主营品类"
              placeholder="请输入主营品类"
              value={form.mainCategory}
              onChange={(e) => setForm({ ...form, mainCategory: e.target.value })}
            />
            <Select
              label="信誉评级"
              options={creditRatingSelectOptions}
              value={form.creditRating}
              onChange={(v) => setForm({ ...form, creditRating: v as 'A' | 'B' | 'C' })}
            />
          </div>
          <Input
            label="备注"
            placeholder="请输入备注"
            value={form.remark}
            onChange={(e) => setForm({ ...form, remark: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
