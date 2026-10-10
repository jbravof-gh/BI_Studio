import { useState, useEffect, useCallback } from 'react';
import { pwaService, PwaState } from '../services/pwaService';

export function usePwa() {
  const [pwaState, setPwaState] = useState<PwaState>(pwaService.getState());

  useEffect(() => {
    const unsubscribe = pwaService.subscribe((state) => {
      setPwaState(state);
    });
    return () => unsubscribe();
  }, []);

  const installPwa = useCallback(async () => {
    return await pwaService.promptInstall();
  }, []);

  const updateApp = useCallback(() => {
    pwaService.updateApp();
  }, []);

  return {
    ...pwaState,
    installPwa,
    updateApp
  };
}
