import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabaseClient } from '../services/supabaseClient';

export interface SocietyRole {
  role_code: string;
  role_name: string;
}

export interface SocietyAccess {
  society_id: string;
  tenant_code: string;
  legal_name: string;
  display_name: string;
  timezone: string;
  roles: SocietyRole[];
  permissions: string[];
}

interface SocietyAccessContextValue {
  societies: SocietyAccess[];
  activeSociety: SocietyAccess | null;
  setActiveSocietyId: (societyId: string) => void;
  hasPermission: (...permissionCodes: string[]) => boolean;
}

const SocietyAccessContext = createContext<SocietyAccessContextValue>({
  societies: [],
  activeSociety: null,
  setActiveSocietyId: () => undefined,
  hasPermission: () => false,
});

export const SocietyAccessProvider: React.FC<React.PropsWithChildren<{ societies: SocietyAccess[] }>> = ({
  societies,
  children,
}) => {
  const [activeSocietyId, setActiveSocietyId] = useState<string | null>(societies[0]?.society_id ?? null);

  useEffect(() => {
    if (!societies.some((society) => society.society_id === activeSocietyId)) {
      setActiveSocietyId(societies[0]?.society_id ?? null);
    }
  }, [societies, activeSocietyId]);

  const activeSociety = useMemo(
    () => societies.find((society) => society.society_id === activeSocietyId) ?? null,
    [societies, activeSocietyId],
  );

  const hasPermission = useCallback(
    (...permissionCodes: string[]) => permissionCodes.some((code) => activeSociety?.permissions.includes(code)),
    [activeSociety],
  );

  // Every PostgREST request is pinned to the selected tenant. RLS independently
  // verifies that the authenticated user has an active membership in this tenant.
  const restClient = supabaseClient.rest as unknown as { headers: Record<string, string> };
  if (activeSocietyId) restClient.headers['x-society-id'] = activeSocietyId;
  else delete restClient.headers['x-society-id'];

  const value = useMemo(() => ({
    societies,
    activeSociety,
    setActiveSocietyId,
    hasPermission,
  }), [societies, activeSociety, hasPermission]);

  return <SocietyAccessContext.Provider value={value}>{children}</SocietyAccessContext.Provider>;
};

export const useSocietyAccess = () => useContext(SocietyAccessContext);
