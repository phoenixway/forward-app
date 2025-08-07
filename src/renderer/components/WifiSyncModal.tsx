// src/renderer/components/WifiSyncModal.tsx
import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
    closeSyncModal,
    setDeviceAddress,
    setSyncStatus,
    setSyncError,
    setSyncReport,
} from '../store/syncSlice';
import { stateReplaced } from '../store/listsSlice';
import { Wifi, LoaderCircle, CircleCheck, CircleAlert, X, FileDiff } from 'lucide-react';
import { formatStateForExport, transformImportedData, createSyncReportForDesktop, DesktopBackupFile } from '../logic/syncLogic';

const WifiSyncModal: React.FC = () => {
    const dispatch = useAppDispatch();
    const {
        isModalOpen,
        modalMode,
        syncStatus,
        deviceAddress,
        errorMessage,
        syncReport,
        originalBackup,
    } = useAppSelector((state) => state.sync);

    const listsState = useAppSelector((state) => state.lists);
    const [localServerAddress, setLocalServerAddress] = useState<string | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        const handleServer = async () => {
            if (isModalOpen && modalMode === 'server') {
                setLocalError(null);
                
                const dataForExport = formatStateForExport(listsState);
                const exportFileContent: DesktopBackupFile = {
                    version: 4,
                    exportedAt: new Date().toISOString(),
                    data: dataForExport,
                };

                const result = await window.electronAPI.startWifiServer(exportFileContent);

                if (result.success && result.address) {
                    setLocalServerAddress(result.address);
                } else {
                    setLocalError(result.error || "Невідома помилка запуску сервера.");
                }
            }
        };

        handleServer();

        return () => {
            if (modalMode === 'server') {
                window.electronAPI.stopWifiServer();
            }
        };
    }, [isModalOpen, modalMode, listsState]);

    const handleFetchFromDevice = async () => {
        if (!deviceAddress) {
            dispatch(setSyncError('Будь ласка, введіть адресу пристрою.'));
            return;
        }
        dispatch(setSyncStatus('fetching'));
        const result = await window.electronAPI.fetchFromDevice(deviceAddress);

        if (result.success && result.data) {
            try {
                const report = createSyncReportForDesktop(listsState, result.data);
                if (report.changes.length === 0) {
                    dispatch(setSyncStatus('success'));
                    setTimeout(() => dispatch(closeSyncModal()), 2000);
                } else {
                    dispatch(setSyncReport({ report, originalBackup: result.data }));
                }
            } catch (error: any) {
                dispatch(setSyncError(error.message || 'Помилка аналізу даних.'));
            }
        } else {
            dispatch(setSyncError(result.error || 'Не вдалося отримати дані.'));
        }
    };

    const handleApplyChanges = () => {
        if (!originalBackup) return;
        dispatch(setSyncStatus('applying'));

        const finalState = transformImportedData(originalBackup.data);
        dispatch(stateReplaced(finalState));
        
        dispatch(setSyncStatus('success'));
        setTimeout(() => dispatch(closeSyncModal()), 2000);
    };

    const handleClose = () => dispatch(closeSyncModal());

    if (!isModalOpen) return null;

    const renderServerContent = () => (
        <>
            <h3 className="text-lg font-semibold mb-4 text-center">Поділитись у локальній мережі</h3>
            {localServerAddress ? (
                <div className='text-center'>
                    <Wifi className="mx-auto h-12 w-12 text-green-500 mb-4" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Сервер запущено. Введіть цю адресу на іншому пристрої:</p>
                    <p className="mt-2 text-xl font-mono p-2 bg-slate-100 dark:bg-slate-700 rounded-md select-all">
                        http://{localServerAddress}
                    </p>
                </div>
            ) : !localError ? (
                 <div className='text-center'>
                    <LoaderCircle className="mx-auto h-12 w-12 text-blue-500 mb-4 animate-spin" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">Запуск сервера...</p>
                </div>
            ) : null}
            {localError &&
                <div className="text-center py-4">
                    <CircleAlert className="mx-auto h-10 w-10 text-red-500" />
                    <p className="mt-2 text-sm text-red-500">{localError}</p>
                </div>
            }
        </>
    );

    const renderReviewContent = () => (
        <>
            <h3 className="text-lg font-semibold mb-2 text-center flex items-center justify-center">
                <FileDiff className="mr-2 h-5 w-5" />
                Огляд змін
            </h3>
            <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-4">
                Знайдено {syncReport?.changes.length || 0} змін з іншого пристрою. Застосувати їх?
            </p>
            <div className="max-h-60 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md border border-slate-200 dark:border-slate-600">
                <ul className="space-y-2">
                    {syncReport?.changes.map(change => (
                        <li key={change.id} className="flex items-center text-sm">
                            <span className={`font-bold mr-2 ${change.type === 'Add' ? 'text-green-500' : 'text-blue-500'}`}>
                                {change.type === 'Add' ? '[ + ]' : '[ ~ ]'}
                            </span>
                            <span className="font-medium mr-1">{change.entityType}:</span>
                            <span className="truncate text-slate-700 dark:text-slate-300" title={change.description}>
                                {change.description}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
                <button onClick={() => dispatch(setSyncStatus('idle'))} className="px-4 py-2 text-sm bg-slate-200 dark:bg-slate-600 rounded-md">
                    Скасувати
                </button>
                <button onClick={handleApplyChanges} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold">
                    Застосувати зміни
                </button>
            </div>
        </>
    );

    const renderImportContent = () => {
        switch (syncStatus) {
            case 'fetching':
            case 'applying':
                return (
                    <div className="text-center py-8">
                        <LoaderCircle className="mx-auto h-10 w-10 text-blue-500 animate-spin" />
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{syncStatus === 'fetching' ? 'Отримання даних...' : 'Застосування змін...'}</p>
                    </div>
                );
            case 'success':
                return (
                    <div className="text-center py-8">
                        <CircleCheck className="mx-auto h-10 w-10 text-green-500" />
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Синхронізацію успішно завершено!</p>
                    </div>
                );
            case 'error':
                return (
                    <div className="text-center py-4">
                        <CircleAlert className="mx-auto h-10 w-10 text-red-500" />
                        <p className="mt-2 text-sm text-red-500">{errorMessage}</p>
                        <button onClick={() => dispatch(setSyncStatus('idle'))} className="mt-4 px-4 py-2 text-sm bg-slate-200 dark:bg-slate-600 rounded-md">Спробувати ще</button>
                    </div>
                );

            case 'reviewing':
                return renderReviewContent();

            default: // idle
                return (
                    <>
                        <h3 className="text-lg font-semibold mb-4 text-center">Імпорт з локальної мережі</h3>
                        <label htmlFor="device-address" className="text-sm font-medium text-slate-700 dark:text-slate-300">Адреса у локальній мережі для імпорту</label>
                        <input
                            id="device-address"
                            type="text"
                            value={deviceAddress}
                            onChange={(e) => dispatch(setDeviceAddress(e.target.value))}
                            placeholder="Напр. 192.168.1.5:8080"
                            className="w-full mt-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                            onClick={handleFetchFromDevice}
                            disabled={!deviceAddress}
                            className="w-full mt-4 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md font-semibold disabled:opacity-50"
                        >
                            Отримати дані
                        </button>
                    </>
                );
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onMouseDown={handleClose}>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl w-full max-w-md text-slate-800 dark:text-slate-200 relative" onMouseDown={e => e.stopPropagation()}>
                <button onClick={handleClose} className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700">
                    <X size={20} />
                </button>
                {modalMode === 'server' ? renderServerContent() : renderImportContent()}
            </div>
        </div>
    );
};

export default WifiSyncModal;