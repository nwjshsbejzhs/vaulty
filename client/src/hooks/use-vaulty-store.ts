import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getRank } from '@/lib/ranks';

interface VaultyState {
  vaultyPoints: number;
  xp: number;
  rankId: string;
  
  // Tracking for limits
  lastDailyLogin: string | null;
  videosWatchedToday: number;
  lastVideoDate: string | null;
  twitterSharesToday: number;
  lastTwitterShareDate: string | null;
  
  // Stats
  friendsInvited: number;
  likesReceived: number;

  // Actions
  addVaultyPoints: (amount: number) => void;
  addXP: (amount: number) => void;
  claimDailyLogin: () => { success: boolean; message: string; earnedVP: number; earnedXP: number };
  watchVideo: () => { success: boolean; message: string; earnedVP: number; earnedXP: number };
  shareOnTwitter: () => { success: boolean; message: string; earnedVP: number; earnedXP: number };
  inviteFriend: () => { success: boolean; message: string; earnedVP: number; earnedXP: number };
  receiveLike: () => void;
  resetDailyLimitsIfNeeded: () => void;
}

const TODAY = new Date().toISOString().split('T')[0];

export const useVaultyStore = create<VaultyState>()(
  persist(
    (set, get) => ({
      vaultyPoints: 0,
      xp: 0,
      rankId: 'unranked',
      
      lastDailyLogin: null,
      videosWatchedToday: 0,
      lastVideoDate: null,
      twitterSharesToday: 0,
      lastTwitterShareDate: null,
      
      friendsInvited: 0,
      likesReceived: 0,

      addVaultyPoints: (amount) => set((state) => ({ vaultyPoints: state.vaultyPoints + amount })),
      
      addXP: (amount) => set((state) => {
        const newXP = state.xp + amount;
        const newRank = getRank(newXP);
        // Check for rank up reward could be here, but simpler to just set state
        return { xp: newXP, rankId: newRank.id };
      }),

      resetDailyLimitsIfNeeded: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];
        
        if (state.lastVideoDate !== today) {
          set({ videosWatchedToday: 0, lastVideoDate: today });
        }
        if (state.lastTwitterShareDate !== today) {
          set({ twitterSharesToday: 0, lastTwitterShareDate: today });
        }
      },

      claimDailyLogin: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];
        
        if (state.lastDailyLogin === today) {
          return { success: false, message: "Already claimed today!", earnedVP: 0, earnedXP: 0 };
        }

        set((state) => ({
          vaultyPoints: state.vaultyPoints + 2,
          xp: state.xp + 50,
          lastDailyLogin: today
        }));

        return { success: true, message: "Daily login claimed!", earnedVP: 2, earnedXP: 50 };
      },

      watchVideo: () => {
        get().resetDailyLimitsIfNeeded();
        const state = get();
        
        if (state.videosWatchedToday >= 10) {
          return { success: false, message: "Daily limit reached (10/10)!", earnedVP: 0, earnedXP: 0 };
        }

        // Random VP between 0.2 and 1
        const earnedVP = Number((Math.random() * (1 - 0.2) + 0.2).toFixed(2));
        const earnedXP = 50;

        set((state) => ({
          vaultyPoints: state.vaultyPoints + earnedVP,
          xp: state.xp + earnedXP,
          videosWatchedToday: state.videosWatchedToday + 1,
          lastVideoDate: new Date().toISOString().split('T')[0]
        }));

        return { success: true, message: "Video watched!", earnedVP, earnedXP };
      },

      shareOnTwitter: () => {
        get().resetDailyLimitsIfNeeded();
        const state = get();

        if (state.twitterSharesToday >= 5) {
          return { success: false, message: "Daily limit reached (5/5)!", earnedVP: 0, earnedXP: 0 };
        }

        const earnedVP = 10;
        const earnedXP = 10; // Assuming 10 XP for consistency with other quests

        set((state) => ({
          vaultyPoints: state.vaultyPoints + earnedVP,
          xp: state.xp + earnedXP,
          twitterSharesToday: state.twitterSharesToday + 1,
          lastTwitterShareDate: new Date().toISOString().split('T')[0]
        }));

        return { success: true, message: "Shared on Twitter!", earnedVP, earnedXP };
      },

      inviteFriend: () => {
        const earnedVP = 5;
        const earnedXP = 100;

        set((state) => ({
          vaultyPoints: state.vaultyPoints + earnedVP,
          xp: state.xp + earnedXP,
          friendsInvited: state.friendsInvited + 1
        }));

        return { success: true, message: "Friend invited!", earnedVP, earnedXP };
      },

      receiveLike: () => {
        set((state) => {
          const newLikes = state.likesReceived + 1;
          let addedVP = 0;
          let addedXP = 0;

          // Every 5 likes = 1 VP and 10 XP
          if (newLikes % 5 === 0) {
            addedVP = 1;
            addedXP = 10;
            
            // Special case: 10 likes = 2 VP (which is handled by 5+5 logic naturally, 
            // user said "5 likes is 1 VP, 10 likes is 2 VP", so it's cumulative)
            // If user meant "at 10 likes get EXTRA 2 VP", that's different.
            // Assuming "Every 5 likes gives 1 VP" covers the "10 likes gives 2 VP" (1+1).
            // User said: "10 lajkov sta 2 Vaulty Pointsa in tako dalje..." implies linear scale.
          }

          return {
            likesReceived: newLikes,
            vaultyPoints: state.vaultyPoints + addedVP,
            xp: state.xp + addedXP
          };
        });
      }
    }),
    {
      name: 'vaulty-storage',
    }
  )
);
