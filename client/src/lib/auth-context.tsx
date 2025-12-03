import {
    ReactNode,
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import axios from 'axios';
import { getDeviceInfo } from "./device";

const API_BASE_URL = "https://ids-dev.rudowealth.in";
const ACCESS_TOKEN_KEY = "rudo_access_token";
const REFRESH_TOKEN_KEY = "rudo_refresh_token";

interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

interface AuthUser {
    email?: string;
    [key: string]: unknown;
}

type AuthStatus =
    | "idle"
    | "requestingOtp"
    | "verifyingOtp"
    | "settingMpin"
    | "refreshing"
    | "loggingOut";

interface VerifyOtpResult {
    sessionToken?: string;
    [key: string]: unknown;
}

interface SetMpinParams {
    email: string;
    mpin: string;
    sessionToken?: string;
}

interface AuthContextValue {
    isAuthenticated: boolean;
    isInitializing: boolean;
    status: AuthStatus;
    user: AuthUser | null;
    requestOtp: (email: string) => Promise<void>;
    verifyOtp: (email: string, otp: string, mpin: string) => Promise<VerifyOtpResult>;
    verifyEmailOtp: (email: string, otp: string) => Promise<any>;
    setMpin: (params: SetMpinParams) => Promise<void>;
    verifyMpin: (params: SetMpinParams) => Promise<void>;
    logout: () => Promise<void>;
    authFetch: typeof fetch;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Use localStorage instead of cookies for better persistence
function setToken(key: string, value: string) {
    try {
        if (!value) {
            console.error(`❌ Cannot store empty token: ${key}`);
            return;
        }
        localStorage.setItem(key, value);
        // Verify it was actually stored
        const stored = localStorage.getItem(key);
        if (stored === value) {
            console.log(`✅ Token stored in localStorage: ${key}`, { length: value.length });
        } else {
            console.error(`❌ Token storage verification failed: ${key}`);
        }
    } catch (error) {
        console.error(`❌ Failed to store token: ${key}`, error);
    }
}

function getToken(key: string): string | null {
    try {
        const value = localStorage.getItem(key);
        if (value) {
            console.log(`📖 Token retrieved from localStorage: ${key}`, { length: value.length });
        }
        return value;
    } catch (error) {
        console.error(`❌ Failed to get token: ${key}`, error);
        return null;
    }
}

function removeToken(key: string) {
    try {
        localStorage.removeItem(key);
        console.log(`🗑️ Token removed from localStorage: ${key}`);
    } catch (error) {
        console.error(`❌ Failed to remove token: ${key}`, error);
    }
}

async function parseError(res: Response) {
    try {
        const data = await res.json();
        if (data?.message) {
            return data.message as string;
        }
    } catch (error) {
        // ignore
    }
    return `${res.status} ${res.statusText}`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [status, setStatus] = useState<AuthStatus>("idle");
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
        Boolean(getToken(ACCESS_TOKEN_KEY))
    );
    const [isInitializing, setIsInitializing] = useState(true);
    const [user, setUser] = useState<AuthUser | null>(null);
    const refreshPromiseRef = useRef<Promise<boolean> | null>(null);

    const clearTokens = useCallback(() => {
        removeToken(ACCESS_TOKEN_KEY);
        removeToken(REFRESH_TOKEN_KEY);
        setIsAuthenticated(false);
    }, []);

    const setTokens = useCallback((tokens: TokenPair) => {
        console.log("🔐 Setting tokens...", {
            accessTokenLength: tokens.accessToken?.length,
            refreshTokenLength: tokens.refreshToken?.length,
        });

        setToken(ACCESS_TOKEN_KEY, tokens.accessToken);
        setToken(REFRESH_TOKEN_KEY, tokens.refreshToken);

        // Verify tokens were set
        const verifyAccess = getToken(ACCESS_TOKEN_KEY);
        const verifyRefresh = getToken(REFRESH_TOKEN_KEY);

        console.log("✅ Tokens verification:", {
            accessTokenSet: !!verifyAccess,
            refreshTokenSet: !!verifyRefresh,
        });

        setIsAuthenticated(true);
    }, []);

    const refreshTokens = useCallback(async (): Promise<boolean> => {
        const refreshToken = getToken(REFRESH_TOKEN_KEY);
        if (!refreshToken) {
            return false;
        }

        if (refreshPromiseRef.current) {
            return refreshPromiseRef.current;
        }

        const refreshPromise = (async () => {
            try {
                setStatus("refreshing");
                const res = await fetch(`${API_BASE_URL}/auth/token/refresh`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    // credentials: "include",
                    body: JSON.stringify({ refreshToken }),
                });

                if (!res.ok) {
                    clearTokens();
                    return false;
                }

                const data = (await res.json()) as Partial<TokenPair & { user: AuthUser }>;
                if (!data.accessToken || !data.refreshToken) {
                    clearTokens();
                    return false;
                }

                setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
                if (data.user) {
                    setUser(data.user);
                }
                return true;
            } catch (error) {
                clearTokens();
                return false;
            } finally {
                setStatus("idle");
                refreshPromiseRef.current = null;
            }
        })();

        refreshPromiseRef.current = refreshPromise;
        return refreshPromise;
    }, [clearTokens, setTokens]);

    const authFetch = useCallback<typeof fetch>(
        async (input, init = {}) => {
            const accessToken = getToken(ACCESS_TOKEN_KEY);
            const headers = new Headers(init.headers || {});

            if (accessToken) {
                headers.set("Authorization", `Bearer ${accessToken}`);
            }

            const response = await fetch(input, {
                ...init,
                headers,
                // credentials: "include",
            });

            if (response.status !== 401) {
                return response;
            }

            const refreshed = await refreshTokens();
            if (!refreshed) {
                clearTokens();
                setUser(null);
                return response;
            }

            const newAccessToken = getToken(ACCESS_TOKEN_KEY);
            const retryHeaders = new Headers(init.headers || {});
            if (newAccessToken) {
                retryHeaders.set("Authorization", `Bearer ${newAccessToken}`);
            }

            return fetch(input, {
                ...init,
                headers: retryHeaders,
                // credentials: "include",
            });
        },
        [clearTokens, refreshTokens]
    );

    const registerDevice = useCallback(async () => {
        try {
            const deviceInfo = getDeviceInfo();
            const res = await fetch(`${API_BASE_URL}/api/v1/customer/device`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-platform-device-id": deviceInfo.deviceId,
                    "x-device-registration-token": "DEVICE_REGISTRATION_TOKEN",
                },
                // credentials: "include",
                body: JSON.stringify(deviceInfo),
            });

            if (!res.ok) {
                const errorText = await parseError(res);
                console.error("Device registration failed with status:", res.status);
                console.error("Device registration error details:", errorText);

                if (errorText.toLowerCase().includes("duplicate")) {
                    console.log("Device already registered, continuing...");
                    return;
                }
            } else {
                console.log("Device registration successful!");
            }
        } catch (error) {
            console.error("Device registration error:", error);
        }
    }, []);

    const requestOtp = useCallback(async (email: string) => {
        setStatus("requestingOtp");
        try {
            const deviceInfo = getDeviceInfo();
            // const res = await fetch(`${API_BASE_URL}/api/v1/customer/auth/login/email/request`, {
            //     method: "POST",
            //     headers: {
            //         "Content-Type": "application/json",
            //     },
            //     // credentials: "include",
            //     body: JSON.stringify({ email }),
            // });

            // if (!res.ok) {
            //     throw new Error(await parseError(res));
            // }

            const res = await axios.post(`${API_BASE_URL}/api/v1/customer/auth/login/email/request`, { email });
            console.log("res", res)
            // return res.data;
            // Try to register device after requesting OTP
            await registerDevice();
            return res.data;
        } catch (error) {
            console.error("something went wrong", error);
        } finally {
            setStatus("idle");
        }
    }, [registerDevice]);

    const verifyOtp = useCallback(async (email: string, otp: string, mpin: string) => {
        setStatus("verifyingOtp");
        try {
            const deviceInfo = getDeviceInfo();
            const payload = { email, otp, mpin };
            console.log("verifyOtp payload:", payload);

            const res = await fetch(`${API_BASE_URL}/api/v1/customer/auth/login/email/verify`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-platform-device-id": deviceInfo.deviceId,
                },
                // credentials: "include",
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                throw new Error(await parseError(res));
            }

            const data = (await res.json()) as any;

            // Map backend 'token' to 'accessToken'
            const accessToken = data.accessToken || data.token;
            const refreshToken = data.refreshToken;

            if (!accessToken || !refreshToken) {
                throw new Error("Login failed: missing tokens in response");
            }

            setTokens({
                accessToken,
                refreshToken,
            });

            if (data.user) {
                setUser(data.user);
            } else {
                setUser({ email });
            }

            return data;
        } finally {
            setStatus("idle");
        }
    }, [registerDevice, setTokens]);

    const verifyEmailOtp = useCallback(async (email: string, otp: string) => {
        setStatus("verifyingOtp");
        try {
            const deviceInfo = getDeviceInfo();
            const payload = { email, otp };
            console.log("verifyEmailOtp payload:", payload);

            const res = await fetch(`${API_BASE_URL}/api/v1/customer/auth/login/email/verify`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-platform-device-id": deviceInfo.deviceId,
                },
                body: JSON.stringify(payload),
            });

            const data = await res.json();
            console.log("verifyEmailOtp response:", { status: res.status, data });

            // Check if this is a challenge response (valid flow, not an error)
            if (data.challenge === "MPIN_NOT_SET" || data.challenge === "MPIN_REQUIRED") {
                // These are valid challenge responses, not errors
                return data;
            }

            // Handle actual error responses
            if (!res.ok) {
                throw new Error(data.message || `${res.status} ${res.statusText}`);
            }

            // Handle success responses with tokens
            return data;
        } finally {
            setStatus("idle");
        }
    }, []);

    const setMpin = useCallback(
        async ({ email, mpin, sessionToken }: SetMpinParams) => {
            setStatus("settingMpin");
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/customer/auth/mpin/set`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-session-id": sessionToken || "",
                    },
                    body: JSON.stringify({ mpin }),
                });

                if (!res.ok) {
                    throw new Error(await parseError(res));
                }

                const data = (await res.json()) as any;

                // Map backend 'token' to 'accessToken'
                const accessToken = data.accessToken || data.token;
                const refreshToken = data.refreshToken;

                if (!accessToken || !refreshToken) {
                    throw new Error("Login failed: missing tokens in response");
                }

                setTokens({
                    accessToken,
                    refreshToken,
                });

                if (data.user) {
                    setUser(data.user);
                } else {
                    setUser({ email });
                }
            } finally {
                setStatus("idle");
            }
        },
        [setTokens]
    );

    const verifyMpin = useCallback(
        async ({ email, mpin, sessionToken }: SetMpinParams) => {
            setStatus("settingMpin");
            try {
                const res = await fetch(`${API_BASE_URL}/api/v1/customer/auth/login/mpin`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "x-session-id": sessionToken || "",
                    },
                    body: JSON.stringify({ mpin }),
                });

                if (!res.ok) {
                    throw new Error(await parseError(res));
                }

                const data = (await res.json()) as any;

                // Map backend 'token' to 'accessToken'
                const accessToken = data.accessToken || data.token;
                const refreshToken = data.refreshToken;

                if (!accessToken || !refreshToken) {
                    throw new Error("Login failed: missing tokens in response");
                }

                setTokens({
                    accessToken,
                    refreshToken,
                });

                if (data.user) {
                    setUser(data.user);
                } else {
                    setUser({ email });
                }
            } finally {
                setStatus("idle");
            }
        },
        [setTokens]
    );

    const logout = useCallback(async () => {
        setStatus("loggingOut");
        try {
            await authFetch(`${API_BASE_URL}/logout`, {
                method: "POST",
            });
        } finally {
            clearTokens();
            setUser(null);
            setStatus("idle");
        }
    }, [authFetch, clearTokens]);

    useEffect(() => {
        const hasAccess = Boolean(getToken(ACCESS_TOKEN_KEY));
        const hasRefresh = Boolean(getToken(REFRESH_TOKEN_KEY));

        console.log("🔄 Initializing auth...", { hasAccess, hasRefresh });

        if (!hasAccess && !hasRefresh) {
            console.log("❌ No tokens found, user not authenticated");
            setIsAuthenticated(false);
            setIsInitializing(false);
            return;
        }

        if (hasAccess) {
            console.log("✅ Access token found, user is authenticated");
            setIsAuthenticated(true);
            setIsInitializing(false);
            return;
        }

        // Only try to refresh if we have refresh token but no access token
        if (hasRefresh && !hasAccess) {
            console.log("🔄 Attempting to refresh tokens...");
            refreshTokens().finally(() => {
                setIsInitializing(false);
            });
        }
    }, [refreshTokens]);

    const value = useMemo<AuthContextValue>(
        () => ({
            isAuthenticated,
            isInitializing,
            status,
            user,
            requestOtp,
            verifyOtp,
            verifyEmailOtp,
            setMpin,
            verifyMpin,
            logout,
            authFetch,
        }),
        [authFetch, isAuthenticated, isInitializing, logout, requestOtp, setMpin, verifyMpin, status, user, verifyOtp, verifyEmailOtp]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
