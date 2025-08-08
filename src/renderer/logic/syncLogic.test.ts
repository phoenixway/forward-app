import { syncComparator, applyChanges, transformImportedData, SyncChange, DesktopBackupFile } from './syncLogic';
import { ListsState } from '../store/listsSlice';
import { ScoringStatus } from '../types';

// --- Початкові дані для тестів ---
const NOW = Date.now();
const LATER = NOW + 10000;

const baseState: ListsState = {
    goals: {
        'goal-1': { id: 'goal-1', text: 'Local Goal 1', completed: false, createdAt: NOW, updatedAt: NOW, associatedListIds: [], description: '', scoringStatus: ScoringStatus.NOT_ASSESSED },
        'goal-2': { id: 'goal-2', text: 'Goal to be updated', completed: false, createdAt: NOW, updatedAt: NOW, associatedListIds: [], description: '', scoringStatus: ScoringStatus.NOT_ASSESSED },
        'goal-3': { id: 'goal-3', text: 'Goal to be deleted', completed: false, createdAt: NOW, updatedAt: NOW, associatedListIds: [], description: '', scoringStatus: ScoringStatus.NOT_ASSESSED },
    },
    goalLists: {
        'list-1': { id: 'list-1', name: 'Local List 1', parentId: null, createdAt: NOW, updatedAt: NOW, order: 0, description: '', isExpanded: true, tags: [] },
        'list-2': { id: 'list-2', name: 'List to be deleted', parentId: null, createdAt: NOW, updatedAt: NOW, order: 1, description: '', isExpanded: true, tags: [] },
    },
    goalInstances: {
        'inst-1': { instanceId: 'inst-1', goalId: 'goal-1', listId: 'list-1', order: 0 },
        'inst-2': { instanceId: 'inst-2', goalId: 'goal-2', listId: 'list-1', order: 1 },
        'inst-3': { instanceId: 'inst-3', goalId: 'goal-3', listId: 'list-2', order: 0 },
        'inst-4': { instanceId: 'inst-4', goalId: 'goal-1', listId: 'list-2', order: 1 }, // To be moved
    },
};

const remoteBackupData: DesktopBackupFile = {
    version: 4,
    exportedAt: new Date(LATER).toISOString(),
    data: {
        goals: {
            'goal-1': { id: 'goal-1', text: 'Local Goal 1', completed: false, createdAt: new Date(NOW).toISOString(), updatedAt: new Date(NOW).toISOString() },
            'goal-2': { id: 'goal-2', text: 'Goal has been updated', completed: true, createdAt: new Date(NOW).toISOString(), updatedAt: new Date(LATER).toISOString() },
            'goal-4': { id: 'goal-4', text: 'Newly added goal', completed: false, createdAt: new Date(LATER).toISOString(), updatedAt: new Date(LATER).toISOString() },
        },
        goalLists: {
            'list-1': { id: 'list-1', name: 'Local List 1', parentId: null, createdAt: new Date(NOW).toISOString(), updatedAt: new Date(NOW).toISOString(), order: 0, itemInstanceIds: ['inst-2', 'inst-4', 'inst-5'] },
            'list-3': { id: 'list-3', name: 'Newly added list', parentId: null, createdAt: new Date(LATER).toISOString(), updatedAt: new Date(LATER).toISOString(), order: 1, itemInstanceIds: [] },
        },
        goalInstances: {
            'inst-2': { id: 'inst-2', goalId: 'goal-2' },
            'inst-4': { id: 'inst-4', goalId: 'goal-1' },
            'inst-5': { id: 'inst-5', goalId: 'goal-4' },
        },
    }
};

describe('syncComparator', () => {

    const { changes } = syncComparator(baseState, remoteBackupData);

    it('should detect added entities', () => {
        const addChanges = changes.filter(c => c.type === 'Add');
        expect(addChanges).toHaveLength(3);
        expect(addChanges).toContainEqual(expect.objectContaining({ entityType: 'Ціль', id: 'goal-4' }));
        expect(addChanges).toContainEqual(expect.objectContaining({ entityType: 'Список', id: 'list-3' }));
        expect(addChanges).toContainEqual(expect.objectContaining({ entityType: 'Привʼязка', id: 'inst-5' }));
    });

    it('should detect updated entities', () => {
        const updateChanges = changes.filter(c => c.type === 'Update');
        expect(updateChanges).toHaveLength(1);
        expect(updateChanges[0]).toMatchObject({ type: 'Update', entityType: 'Ціль', id: 'goal-2', description: 'Goal has been updated' });
    });

    it('should detect deleted entities', () => {
        const deleteChanges = changes.filter(c => c.type === 'Delete');
        expect(deleteChanges).toHaveLength(3);
        expect(deleteChanges).toContainEqual(expect.objectContaining({ entityType: 'Ціль', id: 'goal-3' }));
        expect(deleteChanges).toContainEqual(expect.objectContaining({ entityType: 'Список', id: 'list-2' }));
        expect(deleteChanges).toContainEqual(expect.objectContaining({ entityType: 'Привʼязка', id: 'inst-1' }));
    });
    
    it('should detect moved instances', () => {
        const moveChanges = changes.filter(c => c.type === 'Move');
        expect(moveChanges).toHaveLength(2);
        expect(moveChanges).toContainEqual(expect.objectContaining({ id: 'inst-2', description: 'Переміщення цілі "Goal to be updated"' }));
        expect(moveChanges).toContainEqual(expect.objectContaining({ id: 'inst-4', description: 'Переміщення цілі "Local Goal 1"' }));
    });
});

describe('syncApplicator', () => {
    
    let allChanges: SyncChange[];
    beforeAll(() => {
        allChanges = syncComparator(baseState, remoteBackupData).changes;
    });

    it('should correctly apply a single Add change', () => {
        const addChange = allChanges.find(c => c.type === 'Add' && c.entityType === 'Список');
        expect(addChange).toBeDefined();
        if (!addChange) return;

        const finalState = applyChanges(baseState, [addChange]);
        
        expect(finalState.goalLists[addChange.id]).toEqual(addChange.entity);
    });

    it('should correctly apply a single Delete change', () => {
        const deleteChange = allChanges.find(c => c.type === 'Delete' && c.entityType === 'Ціль');
        expect(deleteChange).toBeDefined();
        if (!deleteChange) return;

        const finalState = applyChanges(baseState, [deleteChange]);

        expect(finalState.goals[deleteChange.id]).toBeUndefined();
    });

    it('should correctly apply a single Update change', () => {
        const updateChange = allChanges.find(c => c.type === 'Update' && c.entityType === 'Ціль');
        expect(updateChange).toBeDefined();
        if (!updateChange) return;

        const finalState = applyChanges(baseState, [updateChange]);

        expect(finalState.goals[updateChange.id]).toEqual(updateChange.entity);
    });
    
    it('should correctly apply a single Move change', () => {
        const moveChange = allChanges.find(c => c.type === 'Move');
        expect(moveChange).toBeDefined();
        if (!moveChange) return;

        const finalState = applyChanges(baseState, [moveChange]);

        expect(finalState.goalInstances[moveChange.id]).toEqual(moveChange.entity);
    });

    it('should only apply selected changes (e.g., no deletions)', () => {
        const nonDeleteChanges = allChanges.filter(c => c.type !== 'Delete');
        const finalState = applyChanges(baseState, nonDeleteChanges);
        
        // Deletions should NOT have been applied
        expect(finalState.goals['goal-3']).toBeDefined();
        expect(finalState.goalLists['list-2']).toBeDefined();
        expect(finalState.goalInstances['inst-1']).toBeDefined();
        
        // Additions should have been applied
        expect(finalState.goals['goal-4']).toBeDefined();
    });

    it('should correctly apply all changes at once', () => {
        const finalState = applyChanges(baseState, allChanges);
        const remoteState = transformImportedData(remoteBackupData.data);
        
        // Check deletions
        expect(finalState.goals['goal-3']).toBeUndefined();
        expect(finalState.goalLists['list-2']).toBeUndefined();
        expect(finalState.goalInstances['inst-1']).toBeUndefined();
        expect(finalState.goalInstances['inst-3']).toBeUndefined();

        // Check additions
        expect(finalState.goals['goal-4']).toEqual(remoteState.goals['goal-4']);
        expect(finalState.goalLists['list-3']).toEqual(remoteState.goalLists['list-3']);
        expect(finalState.goalInstances['inst-5']).toEqual(remoteState.goalInstances['inst-5']);

        // Check updates
        expect(finalState.goals['goal-2'].completed).toBe(true);
        expect(finalState.goals['goal-2'].updatedAt).toBe(LATER);

        // Check moves
        expect(finalState.goalInstances['inst-2'].order).toBe(remoteState.goalInstances['inst-2'].order);
        expect(finalState.goalInstances['inst-4'].listId).toBe(remoteState.goalInstances['inst-4'].listId);
    });
});