import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SettingsState {
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
  soundsEnabled: boolean;
  setSoundsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      hapticsEnabled: true,
      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
      soundsEnabled: true,
      setSoundsEnabled: (enabled) => set({ soundsEnabled: enabled }),
    }),
    {
      name: "bachat-settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
