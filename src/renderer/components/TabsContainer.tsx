// src/renderer/components/TabsContainer.tsx
import React from "react";
import TabItem from "./TabItem"; // TabItem також має бути оновлений для dark mode
import { Tab } from "../types";

interface TabsContainerProps {
  tabs: Tab[];
  activeTabId: string | null;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
}

function TabsContainer({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onNewTab, // проп залишається, але кнопка видалена
}: TabsContainerProps) {
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
      {/* КНОПКУ "+" ВИДАЛЕНО ЗВІДСИ */}
    </div>
  );
}

export default TabsContainer;