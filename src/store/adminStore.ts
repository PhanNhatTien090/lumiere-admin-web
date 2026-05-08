import { create } from "zustand";
import { Staff } from "@/types";
// No need to import ACCESS_TOKEN_STORAGE_KEY from client since we are breaking the cycle.
// I will just use the string "accessToken".
export interface AdminState {
  accessToken: string | null;
  staff: Staff | null;
  isAuthenticated: boolean;
  
  setAuth: (token: string, staff: Staff) => void;
  logout: () => void;
  hydrateAuth: () => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  accessToken: null,
  staff: null,
  isAuthenticated: false,

  setAuth: (token, staff) => {
    sessionStorage.setItem("accessToken", token);
    sessionStorage.setItem("staffData", JSON.stringify(staff));
    // Since interceptor uses localStorage, let's sync to localStorage too, or update interceptor.
    localStorage.setItem("accessToken", token);
    localStorage.setItem("staffData", JSON.stringify(staff));
    set({ accessToken: token, staff, isAuthenticated: true });
  },

  logout: () => {
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("staffData");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("staffData");
    set({ accessToken: null, staff: null, isAuthenticated: false });
  },

  hydrateAuth: () => {
    // Try both sessionStorage and localStorage
    const token = sessionStorage.getItem("accessToken") || localStorage.getItem("accessToken");
    const staffStr = sessionStorage.getItem("staffData") || localStorage.getItem("staffData");
    
    if (token && staffStr) {
      try {
        set({ accessToken: token, staff: JSON.parse(staffStr), isAuthenticated: true });
      } catch (e) {
        // invalid JSON
      }
    }
  }
}));
