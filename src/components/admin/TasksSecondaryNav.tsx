'use client';

import React from 'react';
import { usePreserveNavScroll } from '@/src/hooks/usePreserveNavScroll';
import { LayoutGrid, List, Plus, RefreshCw, Filter, CheckSquare } from 'lucide-react';

export interface TasksTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export const TASKS_TABS: TasksTab[] = [
  {
    id: 'board',
    label: 'Board',
    icon: <LayoutGrid className="h-4 w-4" />,
    description: 'Column board view',
  },
  {
    id: 'list',
    label: 'List',
    icon: <List className="h-4 w-4" />,
    description: 'All tasks in a list',
  },
  {
    id: 'new',
    label: 'New task',
    icon: <Plus className="h-4 w-4" />,
    description: 'Create a task',
  },
  {
    id: 'refresh',
    label: 'Refresh',
    icon: <RefreshCw className="h-4 w-4" />,
    description: 'Reload tasks from server',
  },
  {
    id: 'filters',
    label: 'Filters',
    icon: <Filter className="h-4 w-4" />,
    description: 'Filter by status, priority, assignee',
  },
];

interface TasksSecondaryNavProps {
  activeTab: 'board' | 'list';
  onTabChange: (tabId: string) => void;
  filtersActive?: boolean;
  taskCount?: number;
  className?: string;
}

const TasksSecondaryNav: React.FC<TasksSecondaryNavProps> = ({
  activeTab,
  onTabChange,
  filtersActive = false,
  taskCount,
  className = '',
}) => {
  const { navRef, onNavScroll } = usePreserveNavScroll([activeTab, filtersActive]);

  return (
    <div
      className={`fixed left-20 top-0 z-30 flex h-screen w-20 flex-col border-r border-white/80 bg-white/60 shadow-[4px_0_30px_0_rgba(15,23,42,0.04),inset_-1px_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl ${className}`}
    >
      {/* Specular right reflection edge */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-white/95 via-white/50 to-white/20" />

      <div className="shrink-0 border-b border-white/40 p-3.5 shadow-none">
        <div className="flex items-center justify-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/90 bg-white/70 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95)] backdrop-blur-md">
            <CheckSquare className="h-5 w-5 text-slate-800" />
          </div>
        </div>
      </div>

      <div ref={navRef} onScroll={onNavScroll} className="min-h-0 flex-1 overflow-y-auto py-3">
        <nav className="space-y-1.5 px-2.5">
          {TASKS_TABS.map((tab) => {
            const isViewTab = tab.id === 'board' || tab.id === 'list';
            const isActive =
              (isViewTab && activeTab === tab.id) ||
              (tab.id === 'filters' && filtersActive);

            let badge: string | number | undefined;
            if (tab.id === 'board' && taskCount != null && taskCount > 0) {
              badge = taskCount;
            }

            return (
              <button
                key={tab.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onTabChange(tab.id)}
                className={`group relative flex w-full items-center justify-center rounded-2xl p-2.5 transition-all duration-200 cursor-pointer ${isActive
                  ? 'bg-slate-900/90 text-white shadow-[0_4px_16px_rgba(15,23,42,0.25),inset_0_1px_1px_rgba(255,255,255,0.25)] border border-white/30 backdrop-blur-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60 hover:shadow-xs border border-transparent'
                  }`}
                title={tab.label}
              >
                {isActive && (
                  <div className="absolute left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-gradient-to-b from-teal-400 to-emerald-400 shadow-[0_0_8px_rgba(45,212,191,0.8)] pointer-events-none" />
                )}

                <span
                  className={`flex-shrink-0 transition-transform duration-200 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-800 group-hover:scale-110'
                    }`}
                >
                  {tab.icon}
                </span>

                <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 transform whitespace-nowrap rounded-xl border border-white/80 bg-slate-900/90 px-3 py-2 text-xs text-white opacity-0 shadow-[0_8px_24px_rgba(15,23,42,0.25)] backdrop-blur-xl transition-opacity duration-200 group-hover:opacity-100">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold">{tab.label}</span>
                    {badge != null && (
                      <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium text-white">
                        {badge}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-300 font-normal">{tab.description}</div>
                  <div className="absolute right-full top-1/2 -translate-y-1/2 transform border-4 border-transparent border-r-slate-900/90" />
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default TasksSecondaryNav;
