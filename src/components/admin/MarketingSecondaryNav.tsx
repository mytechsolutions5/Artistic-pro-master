'use client'

import React from 'react';
import { TrendingUp, Search, CheckCircle, LineChart, Mail, Calendar, MapPin, Link2 } from 'lucide-react';
import { usePreserveNavScroll } from '@/src/hooks/usePreserveNavScroll';

export interface MarketingTab {
  id: 'tracking' | 'seo' | 'keyword_tracking' | 'seo_daily' | 'email' | 'seo_plan' | 'gmb' | 'urls';
  label: string;
  icon: React.ReactNode;
  description: string;
}

interface MarketingSecondaryNavProps {
  activeTab: 'tracking' | 'seo' | 'keyword_tracking' | 'seo_daily' | 'email' | 'seo_plan' | 'gmb' | 'urls';
  onTabChange: (tabId: 'tracking' | 'seo' | 'keyword_tracking' | 'seo_daily' | 'email' | 'seo_plan' | 'gmb' | 'urls') => void;
  className?: string;
}

const MARKETING_TABS: MarketingTab[] = [
  {
    id: 'tracking',
    label: 'Tracking',
    icon: <TrendingUp className="w-4 h-4" />,
    description: 'Meta Pixel and analytics tracking',
  },
  {
    id: 'seo',
    label: 'SEO',
    icon: <Search className="w-4 h-4" />,
    description: 'Metadata, internal links, workflow & tools',
  },
  {
    id: 'keyword_tracking',
    label: 'Keywords',
    icon: <LineChart className="w-4 h-4" />,
    description: 'Track 3-5 priority keyword movement',
  },
  {
    id: 'seo_daily',
    label: 'SEO Daily',
    icon: <CheckCircle className="w-4 h-4" />,
    description: 'Daily SEO checklist and routine',
  },
  {
    id: 'seo_plan',
    label: 'SEO Plan',
    icon: <Calendar className="w-4 h-4" />,
    description: '16-week SEO content calendar and evergreen assets',
  },
  {
    id: 'gmb',
    label: 'GMB',
    icon: <MapPin className="w-4 h-4" />,
    description: 'Google My Business local SEO optimization',
  },
  {
    id: 'email',
    label: 'Email',
    icon: <Mail className="w-4 h-4" />,
    description: 'Cold email campaign sender/recipient controls',
  },
  {
    id: 'urls',
    label: 'All URLs',
    icon: <Link2 className="w-4 h-4" />,
    description: 'List of all live site URLs',
  },
];

const MarketingSecondaryNav: React.FC<MarketingSecondaryNavProps> = ({
  activeTab,
  onTabChange,
  className = '',
}) => {
  const { navRef, onNavScroll } = usePreserveNavScroll([activeTab]);

  return (
    <div
      className={`fixed left-20 top-0 z-30 flex h-screen w-[4.25rem] flex-col border-r border-white/80 bg-white/60 shadow-[4px_0_30px_0_rgba(15,23,42,0.04),inset_-1px_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-2xl ${className}`}
    >
      {/* Specular right reflection edge */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-[1.5px] bg-gradient-to-b from-white/95 via-white/50 to-white/20" />

      <div className="shrink-0 border-b border-white/40 p-3 shadow-none">
        <div className="flex items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/90 bg-white/70 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95)] backdrop-blur-md">
            <TrendingUp className="h-4 w-4 text-slate-800" />
          </div>
        </div>
      </div>

      <nav
        ref={navRef}
        onScroll={onNavScroll}
        className="min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-3"
      >
        {MARKETING_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onTabChange(tab.id)}
            className={`group relative flex w-full items-center justify-center rounded-2xl p-2.5 transition-all duration-200 cursor-pointer ${activeTab === tab.id
              ? 'bg-slate-900/90 text-white shadow-[0_4px_14px_rgba(15,23,42,0.25),inset_0_1px_1px_rgba(255,255,255,0.25)] border border-white/30 backdrop-blur-md'
              : 'text-slate-500 hover:text-slate-900 hover:bg-white/60 hover:shadow-xs border border-transparent'
              }`}
            title={tab.label}
          >
            {activeTab === tab.id && (
              <div className="absolute bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-gradient-to-r from-teal-400 to-emerald-400 shadow-[0_0_6px_rgba(45,212,191,0.8)]" />
            )}

            <span className={`transition-transform duration-200 ${activeTab === tab.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-800 group-hover:scale-110'}`}>
              {React.cloneElement(tab.icon as React.ReactElement, { className: 'h-4 w-4' })}
            </span>

            <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-xl border border-white/80 bg-slate-900/90 px-3 py-1.5 text-xs text-white opacity-0 shadow-[0_8px_24px_rgba(15,23,42,0.25)] backdrop-blur-xl transition-opacity duration-150 group-hover:opacity-100">
              <div className="font-semibold">{tab.label}</div>
              <div className="mt-0.5 text-[10px] text-slate-300 font-normal">{tab.description}</div>
              <div className="absolute right-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-r-slate-900/90" />
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default MarketingSecondaryNav;




