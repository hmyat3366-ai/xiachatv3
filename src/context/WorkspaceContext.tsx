import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { WorkspaceItem } from '../types/dashboard';
import { apiFetch } from '../utils/api';
import { useAuth } from './AuthContext';

interface WorkspaceContextType {
  workspaces: WorkspaceItem[];
  currentWorkspace: WorkspaceItem | null;
  isLoadingWorkspaces: boolean;
  selectWorkspace: (workspaceId: string) => void;
  createWorkspace: (name: string) => Promise<boolean>;
  refreshWorkspaces: (preferredWorkspaceId?: string) => Promise<WorkspaceItem | null>;
  updateCurrentWorkspace: (updated: Partial<WorkspaceItem>) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

const STORAGE_KEY_ID = 'xia_active_workspace_id';
const STORAGE_KEY_DATA = 'xia_active_workspace_data';

// Helper to safely get stored workspace from localStorage on initial render
function getInitialWorkspace(): WorkspaceItem | null {
  try {
    // Check URL query param first (?workspaceId=...)
    const urlParams = new URLSearchParams(window.location.search);
    const urlWsId = urlParams.get('workspaceId');

    const storedData = localStorage.getItem(STORAGE_KEY_DATA);
    if (storedData) {
      const parsed = JSON.parse(storedData) as WorkspaceItem;
      if (parsed && parsed.id) {
        if (!urlWsId || urlWsId === parsed.id) {
          return parsed;
        }
      }
    }
  } catch {
    // Fallback gracefully if localStorage has corrupt JSON
  }
  return null;
}

function getStoredWorkspaceId(): string | null {
  const urlParams = new URLSearchParams(window.location.search);
  const urlWsId = urlParams.get('workspaceId');
  if (urlWsId) return urlWsId;
  return localStorage.getItem(STORAGE_KEY_ID);
}

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceItem | null>(getInitialWorkspace);
  const [isLoadingWorkspaces, setIsLoadingWorkspaces] = useState<boolean>(false);
  const isFetchingRef = useRef<boolean>(false);

  // Sync active workspace to localStorage whenever it changes
  const persistWorkspace = useCallback((ws: WorkspaceItem | null) => {
    if (ws) {
      localStorage.setItem(STORAGE_KEY_ID, ws.id);
      localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(ws));
    } else {
      localStorage.removeItem(STORAGE_KEY_ID);
      localStorage.removeItem(STORAGE_KEY_DATA);
    }
  }, []);

  const selectWorkspace = useCallback((workspaceId: string) => {
    setWorkspaces((prevWorkspaces) => {
      const target = prevWorkspaces.find((w) => w.id === workspaceId);
      if (target) {
        setCurrentWorkspace(target);
        persistWorkspace(target);
      } else {
        // If not in current list yet, create minimal representation and persist ID
        const fallback: WorkspaceItem = {
          id: workspaceId,
          name: 'Workspace',
          slug: 'workspace',
        };
        setCurrentWorkspace(fallback);
        persistWorkspace(fallback);
      }
      return prevWorkspaces;
    });
  }, [persistWorkspace]);

  const updateCurrentWorkspace = useCallback((updated: Partial<WorkspaceItem>) => {
    setCurrentWorkspace((prev) => {
      if (!prev) return null;
      const next = { ...prev, ...updated };
      persistWorkspace(next);
      return next;
    });
    setWorkspaces((prevList) =>
      prevList.map((w) => (w.id === currentWorkspace?.id ? { ...w, ...updated } : w))
    );
  }, [currentWorkspace?.id, persistWorkspace]);

  const refreshWorkspaces = useCallback(async (preferredWorkspaceId?: string): Promise<WorkspaceItem | null> => {
    if (!isAuthenticated || isFetchingRef.current) return null;
    try {
      isFetchingRef.current = true;
      setIsLoadingWorkspaces(true);

      const targetId = preferredWorkspaceId || getStoredWorkspaceId() || currentWorkspace?.id;
      let url = '/api/dashboard/overview?period=7d';
      if (targetId) {
        url += `&workspaceId=${targetId}`;
      }

      const res = await apiFetch(url, { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        const fetchedWorkspaces: WorkspaceItem[] = data.workspaces || [];
        setWorkspaces(fetchedWorkspaces);

        // Determine which workspace should be active:
        // 1. Look for preferredWorkspaceId or stored workspace in fetched list
        // 2. Otherwise look for currentWorkspace in fetched list
        // 3. Otherwise use data.workspace from server
        // 4. Otherwise use first workspace in fetched list
        let activeToSet: WorkspaceItem | null = null;
        if (targetId) {
          activeToSet = fetchedWorkspaces.find((w) => w.id === targetId) || null;
        }
        if (!activeToSet && currentWorkspace) {
          activeToSet = fetchedWorkspaces.find((w) => w.id === currentWorkspace.id) || null;
        }
        if (!activeToSet && data.workspace) {
          activeToSet = data.workspace;
        }
        if (!activeToSet && fetchedWorkspaces.length > 0) {
          activeToSet = fetchedWorkspaces[0];
        }

        if (activeToSet) {
          setCurrentWorkspace(activeToSet);
          persistWorkspace(activeToSet);
        }

        return activeToSet;
      }
      return null;
    } catch (err) {
      console.error('[WorkspaceContext] Error refreshing workspaces:', err);
      return null;
    } finally {
      setIsLoadingWorkspaces(false);
      isFetchingRef.current = false;
    }
  }, [isAuthenticated, currentWorkspace, persistWorkspace]);

  const createWorkspace = useCallback(async (name: string): Promise<boolean> => {
    try {
      const res = await apiFetch('/api/dashboard/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        const data = await res.json();
        const newWs: WorkspaceItem = data.workspace;
        if (newWs) {
          setWorkspaces((prev) => [...prev, newWs]);
          setCurrentWorkspace(newWs);
          persistWorkspace(newWs);
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error('[WorkspaceContext] Error creating workspace:', err);
      return false;
    }
  }, [persistWorkspace]);

  // Initial load when user logs in or page loads authenticated
  useEffect(() => {
    if (isAuthenticated) {
      refreshWorkspaces();
    } else {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      localStorage.removeItem(STORAGE_KEY_ID);
      localStorage.removeItem(STORAGE_KEY_DATA);
    }
  }, [isAuthenticated, user?.id]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        currentWorkspace,
        isLoadingWorkspaces,
        selectWorkspace,
        createWorkspace,
        refreshWorkspaces,
        updateCurrentWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
