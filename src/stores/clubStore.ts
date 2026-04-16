import { create } from 'zustand';
import { Club, Event, Membership } from '@/types';

interface ClubState {
  myClubs: Club[];
  selectedClub: Club | null;
  events: Event[];
  memberships: Membership[];
  isLoading: boolean;
  setMyClubs: (clubs: Club[]) => void;
  setSelectedClub: (club: Club | null) => void;
  setEvents: (events: Event[]) => void;
  setMemberships: (memberships: Membership[]) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useClubStore = create<ClubState>(set => ({
  myClubs: [],
  selectedClub: null,
  events: [],
  memberships: [],
  isLoading: false,
  setMyClubs: clubs => set({ myClubs: clubs }),
  setSelectedClub: club => set({ selectedClub: club }),
  setEvents: events => set({ events }),
  setMemberships: memberships => set({ memberships }),
  setLoading: loading => set({ isLoading: loading }),
  reset: () =>
    set({ myClubs: [], selectedClub: null, events: [], memberships: [], isLoading: false }),
}));
