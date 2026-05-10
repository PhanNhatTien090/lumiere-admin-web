import { create } from "zustand";
export const useAdminStore = create((set) => ({
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
            }
            catch (e) {
                // invalid JSON
            }
        }
    }
}));
