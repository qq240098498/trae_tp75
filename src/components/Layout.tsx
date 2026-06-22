import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Building2,
  Users,
  ClipboardList,
  Menu,
  X,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUiStore } from '@/store/uiStore';
import { ROLE_LABELS } from '../../shared/types';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  roles?: string[];
  children?: { label: string; path: string }[];
}

const navItems: NavItem[] = [
  { label: '仪表盘', icon: LayoutDashboard, path: '/' },
  { label: '商品库存', icon: Package, path: '/products', roles: ['admin', 'stock'] },
  { label: '散卖收银', icon: ShoppingCart, path: '/cashier', roles: ['admin', 'cashier'] },
  { label: '整件批发', icon: Truck, path: '/wholesale', roles: ['admin', 'cashier'] },
  { label: '工程挂账', icon: Building2, path: '/projects', roles: ['admin', 'cashier'] },
  { label: '供应商管理', icon: Users, path: '/suppliers', roles: ['admin', 'stock'] },
  { label: '进货录单', icon: ClipboardList, path: '/purchase', roles: ['admin', 'stock'] },
];

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, toggleSidebar, closeSidebar } = useUiStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredNav = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <div className="flex h-screen bg-slate-900 text-white overflow-hidden">
      <aside
        className={cn(
          'flex flex-col bg-primary-900 border-r border-slate-700/50 transition-all duration-300 z-30',
          sidebarOpen ? 'w-56' : 'w-16'
        )}
      >
        <div className="flex items-center h-14 px-3 border-b border-slate-700/50">
          {sidebarOpen && (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-8 h-8 bg-industrial-orange rounded flex items-center justify-center flex-shrink-0">
                <Package size={18} className="text-white" />
              </div>
              <span className="text-sm font-bold text-white truncate">五金建材管理</span>
            </div>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors flex-shrink-0"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="flex-1 py-2 overflow-y-auto">
          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => window.innerWidth < 768 && closeSidebar()}
                className={cn(
                  'flex items-center gap-3 mx-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-industrial-orange/20 text-industrial-orange border-l-2 border-industrial-orange'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-l-2 border-transparent'
                )}
              >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarOpen && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {user && sidebarOpen && (
          <div className="border-t border-slate-700/50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-industrial-orange/30 flex items-center justify-center text-industrial-orange text-sm font-bold">
                {user.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-400">{ROLE_LABELS[user.role] || user.role}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-md transition-colors"
            >
              <LogOut size={16} />
              退出登录
            </button>
          </div>
        )}
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-14 flex items-center justify-between px-6 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-sm flex-shrink-0">
          <h1 className="text-lg font-semibold text-white">
            {filteredNav.find((i) => location.pathname === i.path || (i.path !== '/' && location.pathname.startsWith(i.path)))?.label || '五金建材店管理系统'}
          </h1>
          <div className="flex items-center gap-4">
            {user && !sidebarOpen && (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-400 transition-colors"
              >
                <LogOut size={16} />
                <span>{user.name}</span>
              </button>
            )}
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
