'use client';

// DashboardNavMenu - Responsive nav matching admin style: horizontal tabs (desktop) and burger drawer (mobile)
// "Ring menu" = horizontal tab bar (admin pattern). Supports menu_style: 'ring' | 'sidebar', menu_style_mobile: 'burger'
// Top bar layout: [Dashboard name] | [Status from component] | [Stakeholder + Logout]

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useDashboardStatusOptional } from '@/contexts/DashboardStatusContext';

export interface DashboardNavMenuItem {
  label: string;
  component_id: string;
  position: number;
  is_default?: boolean;
}

export interface DashboardNavMenuProps {
  menuItems: DashboardNavMenuItem[];
  activeComponent: string;
  onMenuClick: (componentId: string) => void;
  dashboardName: string;
  role: string;
  workspaceLayout?: {
    sidebar_width?: string;
    theme?: string;
    show_notifications?: boolean;
    default_component?: string;
    menu_style?: 'ring' | 'sidebar';
    menu_style_mobile?: 'burger';
  };
  /** Optional header slot (e.g. WorkspaceSwitcher) */
  headerSlot?: React.ReactNode;
  /** Optional footer slot (e.g. Logout button) - used in drawer/sidebar. Top bar uses topBarRightSlot when provided. */
  footerSlot?: React.ReactNode;
  /** Optional top bar right slot (e.g. Logout link) - used in top bar when in ring mode. Falls back to footerSlot if not provided. */
  topBarRightSlot?: React.ReactNode;
  /** Optional stakeholder name for display */
  stakeholderName?: string;
}

const SORTED_ITEMS = (items: DashboardNavMenuItem[]) =>
  [...items].sort((a, b) => a.position - b.position);


export function DashboardNavMenu({
  menuItems,
  activeComponent,
  onMenuClick,
  dashboardName,
  role,
  workspaceLayout = {},
  headerSlot,
  footerSlot,
  topBarRightSlot,
  stakeholderName,
}: DashboardNavMenuProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { status } = useDashboardStatusOptional();

  const menuStyle = workspaceLayout.menu_style ?? 'ring';
  const menuStyleMobile = workspaceLayout.menu_style_mobile ?? 'burger';
  const sidebarWidth = workspaceLayout.sidebar_width ?? '250px';

  const sortedItems = SORTED_ITEMS(menuItems);

  return (
    <>
      {/* Mobile: Burger on top right + slide-out drawer (md:hidden) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200">
        <h1 className="text-lg font-bold text-gray-800 truncate flex-1 mr-2">
          {dashboardName}
        </h1>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-700 flex-shrink-0"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-black/30"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-200 ease-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-800">{dashboardName}</h1>
          {stakeholderName && (
            <p className="text-sm text-gray-500 mt-1">{stakeholderName}</p>
          )}
          <p className="text-xs text-gray-400 mb-3">Role: {role}</p>
          {headerSlot}
        </div>
        <nav className="flex-1 p-4 overflow-y-auto">
          {sortedItems.length > 0 ? (
            <div className="space-y-2">
              {sortedItems.map((item) => (
                <button
                  key={item.component_id}
                  onClick={() => {
                    onMenuClick(item.component_id);
                    setMobileOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    activeComponent === item.component_id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No menu items</p>
          )}
        </nav>
        {footerSlot && (
          <div className="p-4 border-t border-gray-200">{footerSlot}</div>
        )}
      </aside>

      {/* Desktop: Ring menu (horizontal tabs) or sidebar */}
      <div className="hidden md:block">
        {menuStyle === 'ring' ? (
          /* Ring mode: header + horizontal tab bar (admin style) */
          <>
            <div className="fixed top-0 left-0 right-0 z-[90] min-h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 py-2 shadow-sm gap-4">
              {/* Left: Dashboard name */}
              <h1 className="text-lg font-bold text-gray-800 truncate flex-shrink-0">
                {dashboardName}
              </h1>
              {/* Center: Status from active component (only when set) */}
              <div className="flex-1 min-w-0 flex justify-center">
                {status ? (
                  <div className="text-center">
                    <div className="text-xs text-gray-400 font-normal">Status</div>
                    <div className="text-sm text-gray-700 font-medium truncate max-w-md">{status}</div>
                  </div>
                ) : null}
              </div>
              {/* Right: Stakeholder (with label) + Logout */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {stakeholderName && (
                  <div className="hidden sm:block text-right">
                    <div className="text-xs text-gray-400 font-normal">Stakeholder</div>
                    <div className="text-sm text-gray-700 font-medium">{stakeholderName}</div>
                  </div>
                )}
                {topBarRightSlot ?? footerSlot}
              </div>
            </div>
            <nav className="fixed top-14 left-0 right-0 z-[89] bg-white border-b border-gray-200">
              <div className="max-w-7xl mx-auto px-4">
                <div className="flex gap-6 overflow-x-auto">
                  {sortedItems.map((item) => {
                    const isActive = activeComponent === item.component_id;
                    return (
                      <button
                        key={item.component_id}
                        onClick={() => onMenuClick(item.component_id)}
                        className={`py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                          isActive
                            ? 'border-blue-600 text-blue-600'
                            : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </nav>
          </>
        ) : (
          /* Sidebar - traditional layout */
          <aside
            className="bg-white border-r border-gray-200 flex flex-col"
            style={{ width: sidebarWidth }}
          >
            <div className="p-4 border-b border-gray-200">
              <h1 className="text-xl font-bold text-gray-800">{dashboardName}</h1>
              {stakeholderName && (
                <p className="text-sm text-gray-500 mt-1">{stakeholderName}</p>
              )}
              <p className="text-xs text-gray-400 mb-3">Role: {role}</p>
              {headerSlot}
            </div>
            <nav className="flex-1 p-4 overflow-y-auto">
              {sortedItems.length > 0 ? (
                sortedItems.map((item) => (
                  <button
                    key={item.component_id}
                    onClick={() => onMenuClick(item.component_id)}
                    className={`w-full text-left px-4 py-3 rounded-lg mb-2 transition-colors ${
                      activeComponent === item.component_id
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))
              ) : (
                <p className="text-center text-gray-500 py-8">No menu items</p>
              )}
            </nav>
            {footerSlot && (
              <div className="p-4 border-t border-gray-200">{footerSlot}</div>
            )}
          </aside>
        )}
      </div>
    </>
  );
}
