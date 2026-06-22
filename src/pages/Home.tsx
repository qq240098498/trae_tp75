import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  AlertTriangle,
  Clock,
  Wallet,
  Truck,
  PackagePlus,
  PlusCircle,
  Building2,
  Users,
  ClipboardList,
  BarChart3,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table, type Column } from "@/components/ui/Table";
import { dashboardApi } from "@/lib/api";
import type { DashboardStats, SaleOrder, Product } from "../../shared/types";
import {
  ORDER_TYPE_LABELS,
  ORDER_STATUS_LABELS,
} from "../../shared/types";

const formatMoney = (n: number) =>
  n.toLocaleString("zh-CN", { minimumFractionDigits: 2 });

interface StatCard {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
}

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  path: string;
  iconColor: string;
}

const quickActions: QuickAction[] = [
  {
    label: "散卖收银",
    icon: <ShoppingCart size={24} />,
    path: "/cashier",
    iconColor: "text-industrial-orange",
  },
  {
    label: "整件批发",
    icon: <Truck size={24} />,
    path: "/wholesale",
    iconColor: "text-blue-400",
  },
  {
    label: "商品入库",
    icon: <PackagePlus size={24} />,
    path: "/purchase",
    iconColor: "text-emerald-400",
  },
  {
    label: "新增商品",
    icon: <PlusCircle size={24} />,
    path: "/products",
    iconColor: "text-purple-400",
  },
  {
    label: "工程挂账",
    icon: <Building2 size={24} />,
    path: "/projects",
    iconColor: "text-cyan-400",
  },
  {
    label: "供应商管理",
    icon: <Users size={24} />,
    path: "/suppliers",
    iconColor: "text-pink-400",
  },
  {
    label: "库存盘点",
    icon: <ClipboardList size={24} />,
    path: "/products",
    iconColor: "text-amber-400",
  },
  {
    label: "数据报表",
    icon: <BarChart3 size={24} />,
    path: "/",
    iconColor: "text-teal-400",
  },
];

const orderStatusVariant = (
  status: string
): "default" | "success" | "warning" | "danger" | "info" => {
  const map: Record<string, "default" | "success" | "warning" | "danger" | "info"> = {
    paid: "success",
    pending: "warning",
    partial: "info",
    void: "danger",
  };
  return map[status] ?? "default";
};

const recentOrderColumns: Column<SaleOrder>[] = [
  {
    key: "orderNo",
    title: "订单号",
    dataIndex: "orderNo",
  },
  {
    key: "type",
    title: "类型",
    render: (record) => ORDER_TYPE_LABELS[record.type] ?? record.type,
  },
  {
    key: "actualAmount",
    title: "金额",
    render: (record) => (
      <span className="font-mono">¥{formatMoney(record.actualAmount)}</span>
    ),
  },
  {
    key: "status",
    title: "状态",
    render: (record) => (
      <Badge variant={orderStatusVariant(record.status)}>
        {ORDER_STATUS_LABELS[record.status] ?? record.status}
      </Badge>
    ),
  },
  {
    key: "createTime",
    title: "时间",
    render: (record) =>
      record.createTime
        ? format(record.createTime, "MM-dd HH:mm")
        : "-",
  },
];

const lowStockColumns: Column<Product>[] = [
  {
    key: "name",
    title: "商品名称",
    dataIndex: "name",
  },
  {
    key: "stock",
    title: "当前库存",
    render: (record) => (
      <span className="text-red-400 font-mono">{record.stock}</span>
    ),
  },
  {
    key: "warningStock",
    title: "预警值",
    dataIndex: "warningStock",
  },
  {
    key: "saleUnit",
    title: "单位",
    dataIndex: "saleUnit",
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .getDashboardStats()
      .then((res) => {
        if (res.success && res.data) {
          setStats(res.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const statCards: StatCard[] = stats
    ? [
        {
          label: "今日销售额",
          value: `¥${formatMoney(stats.todaySales)}`,
          icon: <DollarSign size={24} />,
          iconBg: "bg-blue-500/20 text-blue-400",
        },
        {
          label: "今日订单数",
          value: String(stats.todayOrders),
          icon: <ShoppingCart size={24} />,
          iconBg: "bg-emerald-500/20 text-emerald-400",
        },
        {
          label: "月销售额",
          value: `¥${formatMoney(stats.monthSales)}`,
          icon: <TrendingUp size={24} />,
          iconBg: "bg-purple-500/20 text-purple-400",
        },
        {
          label: "库存预警",
          value: String(stats.warningProducts),
          icon: <AlertTriangle size={24} />,
          iconBg: "bg-industrial-orange/20 text-industrial-orange",
        },
        {
          label: "逾期项目",
          value: String(stats.overdueProjects),
          icon: <Clock size={24} />,
          iconBg: "bg-red-500/20 text-red-400",
        },
        {
          label: "待收账款",
          value: `¥${formatMoney(stats.pendingReceivable)}`,
          icon: <Wallet size={24} />,
          iconBg: "bg-amber-500/20 text-amber-400",
        },
      ]
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="animate-spin text-industrial-orange" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="flex items-center gap-4 bg-slate-800/80 border border-slate-700 rounded-lg px-5 py-4"
          >
            <div className={`p-3 rounded-lg ${card.iconBg}`}>
              {card.icon}
            </div>
            <div>
              <p className="text-sm text-slate-400">{card.label}</p>
              <p className="text-2xl font-bold text-white font-mono">
                {card.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Card
            key={action.label}
            hoverable
            className="flex flex-col items-center justify-center gap-3 py-6"
            onClick={() => navigate(action.path)}
          >
            <span className={action.iconColor}>{action.icon}</span>
            <span className="text-sm text-slate-300 font-medium">
              {action.label}
            </span>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title={
            <h3 className="text-lg font-semibold text-white">最近订单</h3>
          }
        >
          <Table<SaleOrder>
            columns={recentOrderColumns}
            dataSource={stats?.recentOrders ?? []}
            rowKey="id"
            striped
          />
        </Card>

        <Card
          title={
            <h3 className="text-lg font-semibold text-white">库存预警</h3>
          }
        >
          <Table<Product>
            columns={lowStockColumns}
            dataSource={stats?.lowStockProducts ?? []}
            rowKey="id"
            striped
          />
        </Card>
      </div>
    </div>
  );
}
