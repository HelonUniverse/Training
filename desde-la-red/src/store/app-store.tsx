import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Booking } from '@/data/types';

const STORAGE_KEY = 'desde-la-red:state:v1';

export interface DemoUser {
  name: string;
  email: string;
  initials: string;
  joinedOn: string;
}

export interface AppState {
  user: DemoUser | null;
  savedTeachings: string[];
  readTeachings: string[];
  joinedCircles: string[];
  resonatedPosts: string[];
  pathAnswers: Record<string, string[]>;
  pathSavedAt: string | null;
  bookings: Booking[];
  practiceDays: number;
}

const initialState: AppState = {
  user: null,
  savedTeachings: [],
  readTeachings: [],
  joinedCircles: ['c-raiz'],
  resonatedPosts: [],
  pathAnswers: {},
  pathSavedAt: null,
  bookings: [],
  practiceDays: 7,
};

interface AppActions {
  signIn: (email: string, name?: string) => void;
  signOut: () => void;
  toggleSaved: (teachingId: string) => void;
  isSaved: (teachingId: string) => boolean;
  markAsRead: (teachingId: string) => void;
  toggleCircle: (circleId: string) => void;
  isInCircle: (circleId: string) => boolean;
  toggleResonance: (postId: string) => void;
  hasResonated: (postId: string) => boolean;
  setPathAnswer: (questionId: string, optionId: string, multiple: boolean) => void;
  savePath: () => void;
  resetPath: () => void;
  addBooking: (booking: Omit<Booking, 'id' | 'createdAt'>) => Booking;
  cancelBooking: (bookingId: string) => void;
  resetDemo: () => void;
}

interface AppContextValue extends AppActions {
  state: AppState;
  hydrated: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

const initialsFrom = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || 'DR';

const toggleIn = (list: string[], value: string) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const hydratedRef = useRef(false);

  // Carga inicial desde AsyncStorage.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (active && raw) {
          const parsed = JSON.parse(raw) as Partial<AppState>;
          setState({ ...initialState, ...parsed });
        }
      } catch {
        // Modo demo: si el almacenamiento falla seguimos con el estado inicial.
      } finally {
        if (active) {
          hydratedRef.current = true;
          setHydrated(true);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Persistencia (solo después de hidratar, para no pisar lo guardado).
  useEffect(() => {
    if (!hydratedRef.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  const signIn = useCallback((email: string, name?: string) => {
    const displayName = name?.trim() || 'Carla';
    setState((prev) => ({
      ...prev,
      user: {
        name: displayName,
        email: email.trim(),
        initials: initialsFrom(displayName),
        joinedOn: new Date().toISOString(),
      },
    }));
  }, []);

  const signOut = useCallback(() => {
    setState((prev) => ({ ...prev, user: null }));
  }, []);

  const toggleSaved = useCallback((teachingId: string) => {
    setState((prev) => ({ ...prev, savedTeachings: toggleIn(prev.savedTeachings, teachingId) }));
  }, []);

  const markAsRead = useCallback((teachingId: string) => {
    setState((prev) =>
      prev.readTeachings.includes(teachingId)
        ? prev
        : { ...prev, readTeachings: [...prev.readTeachings, teachingId] },
    );
  }, []);

  const toggleCircle = useCallback((circleId: string) => {
    setState((prev) => ({ ...prev, joinedCircles: toggleIn(prev.joinedCircles, circleId) }));
  }, []);

  const toggleResonance = useCallback((postId: string) => {
    setState((prev) => ({ ...prev, resonatedPosts: toggleIn(prev.resonatedPosts, postId) }));
  }, []);

  const setPathAnswer = useCallback((questionId: string, optionId: string, multiple: boolean) => {
    setState((prev) => {
      const current = prev.pathAnswers[questionId] ?? [];
      const next = multiple
        ? current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId]
        : current.includes(optionId)
          ? []
          : [optionId];
      return { ...prev, pathAnswers: { ...prev.pathAnswers, [questionId]: next } };
    });
  }, []);

  const savePath = useCallback(() => {
    setState((prev) => ({ ...prev, pathSavedAt: new Date().toISOString() }));
  }, []);

  const resetPath = useCallback(() => {
    setState((prev) => ({ ...prev, pathAnswers: {}, pathSavedAt: null }));
  }, []);

  const addBooking = useCallback((booking: Omit<Booking, 'id' | 'createdAt'>) => {
    const created: Booking = {
      ...booking,
      id: `b-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, bookings: [created, ...prev.bookings] }));
    return created;
  }, []);

  const cancelBooking = useCallback((bookingId: string) => {
    setState((prev) => ({ ...prev, bookings: prev.bookings.filter((b) => b.id !== bookingId) }));
  }, []);

  const resetDemo = useCallback(() => {
    setState(initialState);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      state,
      hydrated,
      signIn,
      signOut,
      toggleSaved,
      isSaved: (id: string) => state.savedTeachings.includes(id),
      markAsRead,
      toggleCircle,
      isInCircle: (id: string) => state.joinedCircles.includes(id),
      toggleResonance,
      hasResonated: (id: string) => state.resonatedPosts.includes(id),
      setPathAnswer,
      savePath,
      resetPath,
      addBooking,
      cancelBooking,
      resetDemo,
    }),
    [
      state,
      hydrated,
      signIn,
      signOut,
      toggleSaved,
      markAsRead,
      toggleCircle,
      toggleResonance,
      setPathAnswer,
      savePath,
      resetPath,
      addBooking,
      cancelBooking,
      resetDemo,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>');
  return ctx;
}
