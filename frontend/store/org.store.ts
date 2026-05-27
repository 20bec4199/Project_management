import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ActiveOrg {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

export interface OrgState {
  activeOrg: ActiveOrg | null;
  setActiveOrg: (org: ActiveOrg) => void;
  clearOrg: () => void;
}

export const useOrgStore = create<OrgState>()(
  persist<OrgState>(
    (set) => ({
      activeOrg: null,
      setActiveOrg: (org) => set({ activeOrg: org }),
      clearOrg: () => set({ activeOrg: null }),
    }),
    { name: "active-org" },
  ),
);
