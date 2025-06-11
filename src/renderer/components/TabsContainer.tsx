// src/renderer/components/TabsContainer.tsx
import React from 'react';
import TabItem from './TabItem'; // TabItem також має бути оновлений для dark mode
import type { Tab } from './MainPanel';

interface TabsContainerProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
}

function TabsContainer({ tabs, activeTabId, onTabClick, onTabClose, onNewTab }: TabsContainerProps) {
  return (
    <div className="flex border-b border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 overflow-x-auto relative z-0 flex-shrink-0 ">
      {tabs.map((tab) => (
        <TabItem
          key={tab.id}
          tab={tab}
          isActive={tab.id === activeTabId}
          onClick={onTabClick}
          onClose={onTabClose}
        />
      ))}
      <button
        onClick={onNewTab}
        className="p-3 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none flex-shrink-0"
        aria-label="Створити нову вкладку"
        title="Створити нову вкладку"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}

export default TabsContainer;