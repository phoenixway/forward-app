// src/renderer/components/GoalEditModal.tsx
import React, { useState } from 'react';
import { useAppDispatch } from '../store/hooks';
import { goalUpdated } from '../store/listsSlice';
import { calculateScores } from '../logic/goalScoring';
import type { Goal } from '../types';
import { ScoringStatus } from '../types';
import { Info, Link as LinkIcon, Activity } from 'lucide-react';
import GoalAssociationManager from './GoalAssociationManager';

interface GoalEditModalProps {
  goal: Goal;
  onClose: () => void;
}

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

const ScoringSubTab: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
  <button onClick={onClick} className={`px-3 py-1 text-sm rounded-full ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
    {label}
  </button>
);

const PillButton: React.FC<{ label: string; isActive: boolean; onClick: () => void; }> = ({ label, isActive, onClick }) => (
    <button onClick={onClick} className={`px-4 py-1.5 text-sm rounded-full font-medium transition-colors ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600'}`}>
      {label}
    </button>
);

// ЗМІНА: Повертаємо масиви значень для крокових слайдерів
const effortRiskValues = [0, 1, 2, 3, 5, 8, 13, 21];
const costValues = [0, 1, 3, 5, 8, 13]; // 0:немає, 1:дуже низькі, 3:низькі, 5:середні, 8:високі, 13:дуже високі

const GoalEditModal: React.FC<GoalEditModalProps> = ({ goal, onClose }) => {
  const dispatch = useAppDispatch();
  const [localGoal, setLocalGoal] = useState<Goal>(goal);
  const [activeTab, setActiveTab] = useState<'general' | 'associations' | 'scoring'>('general');
  const [activeScoringTab, setActiveScoringTab] = useState<'achievements' | 'losses' | 'weights'>('achievements');

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setLocalGoal(prev => ({...prev, [e.target.name]: e.target.value}));
  }

  const handleValueChange = (field: keyof Goal, value: string | number) => {
    setLocalGoal(prev => ({ ...prev, [field]: Number(value) }));
  };

  const handleSave = () => {
    const finalScores = calculateScores(localGoal);
    dispatch(goalUpdated({ ...localGoal, ...finalScores }));
    onClose();
  };

  const renderSlider = (label: string, field: keyof Goal, min: number, max: number, step: number) => (
    <div className="mb-6">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize flex justify-between">
        <span>{label}</span>
        <span className="font-mono px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200">
          {localGoal[field] as number || (field.startsWith('weight') ? 1 : min)}
        </span>
      </label>
      <input type="range" min={min} max={max} step={step} value={localGoal[field] as number || (field.startsWith('weight') ? 1 : min)}
        onChange={(e) => handleValueChange(field, e.target.value)}
        className="w-full h-2 mt-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 slider-thumb"
      />
    </div>
  );

  // ЗМІНА: Нова функція для рендерингу крокового слайдера
  const renderSteppedSlider = (label: string, field: keyof Goal, options: number[]) => {
    const currentValue = localGoal[field] as number || 0;
    // Знаходимо найближчий індекс у масиві опцій
    let currentIndex = options.findIndex(opt => opt === currentValue);
    if (currentIndex === -1) currentIndex = 0;

    const handleSteppedChange = (index: number) => {
        const newValue = options[index];
        handleValueChange(field, newValue);
    };

    return (
        <div className="mb-6">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize flex justify-between">
                <span>{label}</span>
                <span className="font-mono px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200">
                    {currentValue}
                </span>
            </label>
            <input
                type="range"
                min={0}
                max={options.length - 1}
                step={1}
                value={currentIndex}
                onChange={(e) => handleSteppedChange(parseInt(e.target.value, 10))}
                className="w-full h-2 mt-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 slider-thumb"
            />
        </div>
    );
  };


  const BalanceIndicator = () => {
    const { rawScore } = calculateScores(localGoal);
    const colorClass = rawScore > 0.05 ? 'text-green-600 dark:text-green-400' : rawScore < -0.05 ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400';

    return (
        <div className="flex items-center text-sm mb-4 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-md">
            <span className={`font-semibold ${colorClass}`}>Баланс:</span>
            <span className="font-mono ml-2 px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-200">
                {rawScore.toFixed(2)}
            </span>
        </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onMouseDown={onClose}>
      <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-3xl text-slate-800 dark:text-slate-200 flex flex-col max-h-[90vh]" onMouseDown={e => e.stopPropagation()}>
        <div className="flex-shrink-0">
            <h2 className="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100">Редагувати ціль</h2>
            <textarea name="text" rows={2} value={localGoal.text} onChange={handleTextChange}
                className="block w-full text-lg rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-900 dark:border-slate-600 dark:text-slate-100"
            />
        </div>
        <div className="mt-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <nav className="-mb-px flex space-x-4">
            <TabButton label="Загальне" icon={<Info size={16}/>} isActive={activeTab === 'general'} onClick={() => setActiveTab('general')} />
            <TabButton label="Асоційовані списки" icon={<LinkIcon size={16}/>} isActive={activeTab === 'associations'} onClick={() => setActiveTab('associations')} />
            <TabButton label="Оцінка цілі" icon={<Activity size={16}/>} isActive={activeTab === 'scoring'} onClick={() => setActiveTab('scoring')} />
          </nav>
        </div>
        <div className="py-5 flex-grow min-h-0 overflow-y-auto custom-scrollbar">
          {activeTab === 'general' && (
            <div>
               <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Нотатки</label>
                <textarea id="description" name="description" rows={10} value={localGoal.description || ''} onChange={handleTextChange} placeholder="Додайте детальний опис..."
                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-slate-700 dark:border-slate-600"
                />
                <div className="mt-4 text-xs text-slate-400 dark:text-slate-500 space-y-1">
                    <p>Створено: {new Date(localGoal.createdAt).toLocaleString()}</p>
                    {localGoal.updatedAt && <p>Оновлено: {new Date(localGoal.updatedAt).toLocaleString()}</p>}
                </div>
            </div>
          )}
          {activeTab === 'associations' && (
            <GoalAssociationManager goal={localGoal} onGoalChange={setLocalGoal} />
          )}
          {activeTab === 'scoring' && (
            <div>
                <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Статус оцінки</label>
                    <div className="flex items-center space-x-2">
                        <PillButton label="Не оцінено" isActive={!localGoal.scoringStatus || localGoal.scoringStatus === ScoringStatus.NOT_ASSESSED} onClick={() => setLocalGoal(g => ({...g, scoringStatus: ScoringStatus.NOT_ASSESSED}))} />
                        <PillButton label="Неможливо оцінити" isActive={localGoal.scoringStatus === ScoringStatus.IMPOSSIBLE_TO_ASSESS} onClick={() => setLocalGoal(g => ({...g, scoringStatus: ScoringStatus.IMPOSSIBLE_TO_ASSESS}))} />
                        <PillButton label="Оцінено" isActive={localGoal.scoringStatus === ScoringStatus.ASSESSED} onClick={() => setLocalGoal(g => ({...g, scoringStatus: ScoringStatus.ASSESSED}))} />
                    </div>
                </div>
                
                {localGoal.scoringStatus === 'ASSESSED' && (
                  <>
                    <BalanceIndicator />
                    <div className="my-6 border-b border-slate-200 dark:border-slate-700"></div>
                    <div className="flex items-center space-x-2 mb-4">
                        <ScoringSubTab label="Досягнення" isActive={activeScoringTab === 'achievements'} onClick={() => setActiveScoringTab('achievements')} />
                        <ScoringSubTab label="Втрати" isActive={activeScoringTab === 'losses'} onClick={() => setActiveScoringTab('losses')} />
                        <ScoringSubTab label="Ваги" isActive={activeScoringTab === 'weights'} onClick={() => setActiveScoringTab('weights')} />
                    </div>
                    {activeScoringTab === 'achievements' && ( <div> {renderSlider("Цінність", "valueImportance", 1, 12, 1)} {renderSlider("Вплив", "valueImpact", 1, 13, 1)} </div> )}
                    {activeScoringTab === 'losses' && (
                        // ЗМІНА: Використовуємо нові крокові слайдери
                        <div>
                            {renderSteppedSlider("Зусилля", "effort", effortRiskValues)}
                            {renderSteppedSlider("Вартість", "cost", costValues)}
                            {renderSteppedSlider("Ризик", "risk", effortRiskValues)}
                        </div>
                    )}
                    {activeScoringTab === 'weights' && ( <div> {renderSlider("Вага Зусиль", "weightEffort", 0.0, 2.0, 0.1)} {renderSlider("Вага Вартості", "weightCost", 0.0, 2.0, 0.1)} {renderSlider("Вага Ризику", "weightRisk", 0.0, 2.0, 0.1)} </div> )}
                  </>
                )}
            </div>
          )}
        </div>
        <div className="flex justify-end space-x-2 mt-4 flex-shrink-0 border-t border-slate-200 dark:border-slate-700 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md bg-slate-200 hover:bg-slate-300 dark:bg-slate-600 dark:hover:bg-slate-500">Скасувати</button>
          <button type="button" onClick={handleSave} className="px-4 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold">Зберегти</button>
        </div>
      </div>
    </div>
  );
};

export default GoalEditModal;