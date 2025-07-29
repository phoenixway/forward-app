// src/renderer/components/GoalEditModal.tsx
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { goalUpdated } from '../store/listsSlice';
import { calculateScores } from '../logic/goalScoring';
import type { Goal } from '../types';
import { SlidersHorizontal, BarChart2, MessageSquare } from 'lucide-react';

interface GoalEditModalProps {
  goal: Goal;
  onClose: () => void;
}

// Допоміжний компонент для вкладок
const TabButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors duration-200 focus:outline-none ${
      isActive
        ? 'border-blue-500 text-blue-600 dark:text-blue-400 dark:border-blue-400'
        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
    }`}
  >
    {icon}
    <span className="ml-2">{label}</span>
  </button>
);


const GoalEditModal: React.FC<GoalEditModalProps> = ({ goal, onClose }) => {
  const dispatch = useDispatch();
  const [localGoal, setLocalGoal] = useState<Goal>(goal);
  const [activeTab, setActiveTab] = useState<'params' | 'weights' | 'notes'>('params');

  const handleChange = (field: keyof Goal, value: string | number | boolean) => {
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    setLocalGoal(prev => ({ ...prev, [field]: numericValue }));
  };
  
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLocalGoal(prev => ({...prev, [name]: value}));
  }

  const handleSave = () => {
    const goalWithNewScores = calculateScores(localGoal);
    dispatch(goalUpdated({ ...localGoal, ...goalWithNewScores }));
    onClose();
  };

  const renderSlider = (label: string, field: keyof Goal, min: number, max: number, step: number) => (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">
          {label}
        </label>
        <span className="text-sm font-mono px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200">
          {localGoal[field] as number || (field.startsWith('weight') ? 1 : 0)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localGoal[field] as number || (field.startsWith('weight') ? 1 : 0)}
        onChange={(e) => handleChange(field, e.target.value)}
        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 slider-thumb"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onMouseDown={onClose}>
      <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-2xl text-slate-800 dark:text-slate-200 flex flex-col" onMouseDown={e => e.stopPropagation()}>
        
        <div className="flex-shrink-0">
            <h2 className="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100">Редагувати ціль</h2>
            <textarea
                name="text"
                rows={2}
                value={localGoal.text}
                onChange={handleTextChange}
                className="block w-full text-lg rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100 sm:text-lg"
            />
        </div>

        <div className="mt-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <nav className="-mb-px flex space-x-4" aria-label="Tabs">
            <TabButton label="Параметри" icon={<SlidersHorizontal size={16}/>} isActive={activeTab === 'params'} onClick={() => setActiveTab('params')} />
            <TabButton label="Ваги" icon={<BarChart2 size={16}/>} isActive={activeTab === 'weights'} onClick={() => setActiveTab('weights')} />
            <TabButton label="Нотатки" icon={<MessageSquare size={16}/>} isActive={activeTab === 'notes'} onClick={() => setActiveTab('notes')} />
          </nav>
        </div>

        <div className="py-5 flex-grow min-h-[250px]">
          {activeTab === 'params' && (
            <div>
              {renderSlider("Важливість", "valueImportance", 0, 10, 1)}
              {renderSlider("Вплив", "valueImpact", 0, 10, 1)}
              {renderSlider("Зусилля", "effort", 0, 10, 1)}
              {renderSlider("Вартість", "cost", 0, 10, 1)}
              {renderSlider("Ризик", "risk", 0, 10, 1)}
            </div>
          )}
          {activeTab === 'weights' && (
            <div>
                {renderSlider("Вага Зусиль", "weightEffort", 0.1, 3, 0.1)}
                {renderSlider("Вага Вартості", "weightCost", 0.1, 3, 0.1)}
                {renderSlider("Вага Ризику", "weightRisk", 0.1, 3, 0.1)}
            </div>
          )}
          {activeTab === 'notes' && (
            <div>
               <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Нотатки до цілі</label>
                <textarea
                    id="description"
                    name="description"
                    rows={8}
                    value={localGoal.description || ''}
                    onChange={handleTextChange}
                    placeholder="Додайте детальний опис, критерії виконання, посилання тощо."
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100 sm:text-sm"
                />
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 mt-4 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500">Скасувати</button>
          <button type="button" onClick={handleSave} className="px-4 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold">Зберегти</button>
        </div>
      </div>
    </div>
  );
};

export default GoalEditModal;