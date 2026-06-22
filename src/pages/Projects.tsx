import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Search, Plus, Building2, Eye, DollarSign, Calendar } from 'lucide-react';
import { projectApi, saleApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Button, Input, Select, Badge, Modal, Card, Table } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import type { Project, ProjectPayment, SaleOrder } from '../../shared/types';
import { PROJECT_STATUS_LABELS, PAY_METHOD_LABELS } from '../../shared/types';
import type { Column } from '@/components/ui/Table';

const STATUS_TABS = [
  { label: '全部', value: '' },
  { label: '进行中', value: 'active' },
  { label: '已逾期', value: 'overdue' },
  { label: '已结清', value: 'completed' },
];

const CREDIT_PAY_OPTIONS = [
  { label: '现金', value: 'cash' },
  { label: '微信', value: 'wechat' },
  { label: '支付宝', value: 'alipay' },
  { label: '转账', value: 'transfer' },
];

const STATUS_VARIANT: Record<string, 'info' | 'danger' | 'success'> = {
  active: 'info',
  overdue: 'danger',
  completed: 'success',
};

export default function Projects() {
  const { user } = useAuthStore();
  const { success, error: toastError } = useToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Add/Edit project modal
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [formName, setFormName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formRemark, setFormRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailProject, setDetailProject] = useState<Project | null>(null);
  const [detailTab, setDetailTab] = useState<'bills' | 'payments'>('bills');
  const [saleOrders, setSaleOrders] = useState<SaleOrder[]>([]);
  const [payments, setPayments] = useState<ProjectPayment[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentRemark, setPaymentRemark] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectApi.getProjects({
        page,
        pageSize: 20,
        status: statusFilter || undefined,
        keyword: keyword || undefined,
      });
      if (res.success && res.data) {
        setProjects(res.data.items);
        setTotal(res.data.total);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, statusFilter, keyword]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const resetForm = () => {
    setFormName('');
    setFormAddress('');
    setFormContact('');
    setFormPhone('');
    setFormDueDate('');
    setFormRemark('');
    setEditingProject(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowProjectModal(true);
  };

  const handleCreateProject = async () => {
    if (!formName.trim()) { toastError('请输入项目名称'); return; }
    setSubmitting(true);
    try {
      const res = await projectApi.createProject({
        name: formName,
        address: formAddress,
        contact: formContact,
        phone: formPhone,
        dueDate: formDueDate ? new Date(formDueDate).getTime() : Date.now() + 30 * 86400000,
        totalDebt: 0,
        paidAmount: 0,
        status: 'active',
        remark: formRemark,
      });
      if (res.success) {
        success('项目创建成功');
        setShowProjectModal(false);
        resetForm();
        fetchProjects();
      }
    } catch {
      toastError('创建失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (project: Project) => {
    setDetailProject(project);
    setShowDetailModal(true);
    setDetailTab('bills');
    setDetailLoading(true);
    try {
      const [orderRes, projectRes] = await Promise.all([
        saleApi.getSaleOrders({ page: 1, pageSize: 100, type: 'credit', status: undefined }),
        projectApi.getProject(project.id),
      ]);
      if (orderRes.success && orderRes.data) {
        const related = orderRes.data.items.filter((o) => o.projectId === project.id);
        setSaleOrders(related);
      }
      // payments are embedded in project detail or we simulate
      setPayments([]);
    } catch { /* ignore */ }
    finally { setDetailLoading(false); }
  };

  const openPaymentModal = () => {
    setPaymentAmount('');
    setPaymentMethod('cash');
    setPaymentRemark('');
    setShowPaymentModal(true);
  };

  const handleAddPayment = async () => {
    if (!detailProject) return;
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) { toastError('请输入有效金额'); return; }
    setPaymentSubmitting(true);
    try {
      const res = await projectApi.addProjectPayment(detailProject.id, {
        amount,
        payMethod: paymentMethod,
        remark: paymentRemark,
      });
      if (res.success) {
        success('回款登记成功');
        setShowPaymentModal(false);
        openDetail(detailProject);
        fetchProjects();
      }
    } catch {
      toastError('回款登记失败');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  const getDaysRemaining = (project: Project): number => {
    if (project.daysRemaining !== undefined) return project.daysRemaining;
    const due = project.dueDate;
    return Math.ceil((due - Date.now()) / 86400000);
  };

  const renderDaysRemaining = (project: Project) => {
    const days = getDaysRemaining(project);
    if (days < 0) return <span className="text-red-400 font-medium">逾期{Math.abs(days)}天</span>;
    if (days < 7) return <span className="text-industrial-orange font-medium">剩余{days}天</span>;
    return <span className="text-slate-400">剩余{days}天</span>;
  };

  const billColumns: Column<SaleOrder>[] = [
    { key: 'orderNo', title: '单号', dataIndex: 'orderNo', width: 140 },
    { key: 'totalAmount', title: '金额', width: 100, render: (r) => <span className="text-white">¥{r.totalAmount.toFixed(2)}</span> },
    { key: 'payMethod', title: '支付方式', width: 90, render: (r) => PAY_METHOD_LABELS[r.payMethod] || r.payMethod },
    { key: 'status', title: '状态', width: 80, render: (r) => {
      const map: Record<string, 'default' | 'success' | 'warning' | 'danger'> = { paid: 'success', pending: 'warning', partial: 'info' as 'default', void: 'danger' };
      return <Badge variant={map[r.status] || 'default'}>{r.status === 'paid' ? '已付' : r.status === 'pending' ? '待付' : r.status === 'void' ? '已作废' : '部分'}</Badge>;
    }},
    { key: 'createTime', title: '日期', width: 100, render: (r) => r.createTime ? format(r.createTime, 'MM-dd HH:mm') : '-' },
  ];

  const paymentColumns: Column<ProjectPayment>[] = [
    { key: 'amount', title: '金额', width: 100, render: (r) => <span className="text-emerald-400 font-medium">+¥{r.amount.toFixed(2)}</span> },
    { key: 'payMethod', title: '方式', width: 80, render: (r) => PAY_METHOD_LABELS[r.payMethod] || r.payMethod },
    { key: 'remark', title: '备注', dataIndex: 'remark' },
    { key: 'createTime', title: '日期', width: 100, render: (r) => r.createTime ? format(r.createTime, 'MM-dd HH:mm') : '-' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Tab Bar */}
      <div className="flex items-center gap-2 mb-4">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => { setStatusFilter(tab.value); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              statusFilter === tab.value
                ? 'bg-industrial-orange text-white shadow-md shadow-industrial-orange/30'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search & Add */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <Input
            placeholder="搜索项目名称/采购人"
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1); }}
            prefix={Search}
          />
        </div>
        <Button variant="warning" onClick={openAddModal}>
          <Plus size={16} />
          新增项目
        </Button>
      </div>

      {/* Project Cards Grid */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-slate-500">加载中...</div>
        ) : projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500">
            <Building2 size={40} className="mb-2 opacity-30" />
            <span>暂无项目</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project) => {
              const progress = project.totalDebt > 0 ? (project.paidAmount / project.totalDebt) * 100 : 0;
              const days = getDaysRemaining(project);
              return (
                <div
                  key={project.id}
                  className="bg-slate-800/80 border border-slate-700 rounded-lg p-4 hover:border-industrial-orange/40 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-base font-bold text-white truncate flex-1">{project.name}</h3>
                    <Badge variant={STATUS_VARIANT[project.status] || 'default'} className="ml-2 flex-shrink-0">
                      {PROJECT_STATUS_LABELS[project.status] || project.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex items-center text-slate-400">
                      <span className="w-16 flex-shrink-0">采购人</span>
                      <span className="text-white">{project.contact}</span>
                      {project.phone && <span className="ml-2 text-slate-500">{project.phone}</span>}
                    </div>
                    {project.address && (
                      <div className="flex items-center text-slate-400">
                        <span className="w-16 flex-shrink-0">地址</span>
                        <span className="text-white truncate">{project.address}</span>
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">回款进度</span>
                      <span className="text-white">¥{project.paidAmount.toFixed(0)} / ¥{project.totalDebt.toFixed(0)}</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, progress)}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Calendar size={12} />
                      <span>约定回款日: {project.dueDate ? format(project.dueDate, 'yyyy-MM-dd') : '-'}</span>
                    </div>
                    <div className="text-xs">{renderDaysRemaining(project)}</div>
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-700/50">
                    <Button variant="secondary" size="sm" onClick={() => openDetail(project)} className="flex-1">
                      <Eye size={14} />
                      详情
                    </Button>
                    {project.status !== 'completed' && (
                      <Button variant="success" size="sm" onClick={() => { setDetailProject(project); openPaymentModal(); }} className="flex-1">
                        <DollarSign size={14} />
                        回款
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-2 pt-3 border-t border-slate-700/50">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</Button>
          <span className="text-sm text-slate-400">{page} / {Math.ceil(total / 20)}</span>
          <Button variant="secondary" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((p) => p + 1)}>下一页</Button>
        </div>
      )}

      {/* Add Project Modal */}
      <Modal
        open={showProjectModal}
        title="新增项目"
        onClose={() => { setShowProjectModal(false); resetForm(); }}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setShowProjectModal(false); resetForm(); }}>取消</Button>
            <Button variant="warning" loading={submitting} onClick={handleCreateProject}>确认创建</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="项目名称" placeholder="请输入项目名称" value={formName} onChange={(e) => setFormName(e.target.value)} />
          <Input label="地址" placeholder="请输入项目地址" value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="采购人" placeholder="请输入采购人姓名" value={formContact} onChange={(e) => setFormContact(e.target.value)} />
            <Input label="联系电话" placeholder="请输入联系电话" value={formPhone} onChange={(e) => setFormPhone(e.target.value)} />
          </div>
          <Input label="约定回款日" type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
          <Input label="备注" placeholder="选填" value={formRemark} onChange={(e) => setFormRemark(e.target.value)} />
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal
        open={showDetailModal}
        title={detailProject ? `项目详情 - ${detailProject.name}` : '项目详情'}
        onClose={() => setShowDetailModal(false)}
        size="xl"
      >
        {detailProject && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
              <div>
                <span className="text-slate-400 text-sm">项目名称</span>
                <p className="text-white font-medium">{detailProject.name}</p>
              </div>
              <div>
                <span className="text-slate-400 text-sm">状态</span>
                <div><Badge variant={STATUS_VARIANT[detailProject.status] || 'default'}>{PROJECT_STATUS_LABELS[detailProject.status]}</Badge></div>
              </div>
              <div>
                <span className="text-slate-400 text-sm">采购人</span>
                <p className="text-white">{detailProject.contact} {detailProject.phone && <span className="text-slate-500">{detailProject.phone}</span>}</p>
              </div>
              <div>
                <span className="text-slate-400 text-sm">地址</span>
                <p className="text-white">{detailProject.address || '-'}</p>
              </div>
              <div>
                <span className="text-slate-400 text-sm">欠款总额</span>
                <p className="text-industrial-orange font-bold">¥{detailProject.totalDebt.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-slate-400 text-sm">已回款</span>
                <p className="text-emerald-400 font-bold">¥{detailProject.paidAmount.toFixed(2)}</p>
              </div>
              <div>
                <span className="text-slate-400 text-sm">剩余欠款</span>
                <p className="text-red-400 font-bold">¥{(detailProject.remainingDebt ?? detailProject.totalDebt - detailProject.paidAmount).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-slate-400 text-sm">约定回款日</span>
                <p className="text-white">{detailProject.dueDate ? format(detailProject.dueDate, 'yyyy-MM-dd') : '-'}</p>
              </div>
              {detailProject.remark && (
                <div className="col-span-2">
                  <span className="text-slate-400 text-sm">备注</span>
                  <p className="text-white">{detailProject.remark}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 border-b border-slate-700 mb-4">
              <button
                onClick={() => setDetailTab('bills')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  detailTab === 'bills' ? 'text-industrial-orange border-industrial-orange' : 'text-slate-400 border-transparent hover:text-white'
                }`}
              >
                账单列表
              </button>
              <button
                onClick={() => setDetailTab('payments')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  detailTab === 'payments' ? 'text-industrial-orange border-industrial-orange' : 'text-slate-400 border-transparent hover:text-white'
                }`}
              >
                回款记录
              </button>
            </div>

            {detailTab === 'bills' && (
              <Table columns={billColumns} dataSource={saleOrders} loading={detailLoading} rowKey="id" />
            )}
            {detailTab === 'payments' && (
              <div>
                <div className="flex justify-end mb-3">
                  <Button variant="success" size="sm" onClick={openPaymentModal}>
                    <Plus size={14} />
                    新增回款
                  </Button>
                </div>
                <Table columns={paymentColumns} dataSource={payments} loading={detailLoading} rowKey="id" />
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Payment Modal */}
      <Modal
        open={showPaymentModal}
        title="新增回款"
        onClose={() => setShowPaymentModal(false)}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowPaymentModal(false)}>取消</Button>
            <Button variant="success" loading={paymentSubmitting} onClick={handleAddPayment}>确认回款</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="回款金额" type="number" placeholder="请输入金额" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
          <Select label="支付方式" options={CREDIT_PAY_OPTIONS} value={paymentMethod} onChange={(v) => setPaymentMethod(String(v))} />
          <Input label="备注" placeholder="选填" value={paymentRemark} onChange={(e) => setPaymentRemark(e.target.value)} />
        </div>
      </Modal>
    </div>
  );
}
