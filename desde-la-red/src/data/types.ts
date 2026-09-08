import { ImageKey } from './images';

export type TeachingTheme =
  | 'Silencio'
  | 'Luz'
  | 'Sombra'
  | 'Umbral'
  | 'Raíz'
  | 'Respiración'
  | 'Fuego'
  | 'Retorno';

export interface TeachingBlock {
  /** `verse` se compone en serif itálica y centrada. */
  kind: 'paragraph' | 'verse' | 'subtitle';
  text: string;
}

export interface Teaching {
  id: string;
  title: string;
  subtitle: string;
  theme: TeachingTheme;
  image: ImageKey;
  authorId: string;
  readMinutes: number;
  listenMinutes: number;
  publishedOn: string;
  excerpt: string;
  body: TeachingBlock[];
  tags: string[];
  featured?: boolean;
}

export interface Guide {
  id: string;
  name: string;
  title: string;
  location: string;
  initials: string;
  accent: 'cyan' | 'gold' | 'violet';
  years: number;
  circleCount: number;
  rating: number;
  bio: string;
  approach: string[];
  languages: string[];
  serviceIds: string[];
  verified: boolean;
}

export interface Service {
  id: string;
  guideId: string;
  name: string;
  format: 'Individual' | 'Círculo' | 'Intensivo';
  modality: 'En línea' | 'Presencial';
  durationMinutes: number;
  price: number;
  currency: 'USD';
  description: string;
  includes: string[];
}

export interface LiveEvent {
  id: string;
  title: string;
  guideId: string;
  image: ImageKey;
  startsAt: string;
  durationMinutes: number;
  attendees: number;
  status: 'live' | 'soon' | 'scheduled';
  description: string;
}

export interface Circle {
  id: string;
  name: string;
  image: ImageKey;
  guideId: string;
  members: number;
  cadence: string;
  intention: string;
  topics: string[];
}

export interface NetworkPost {
  id: string;
  authorName: string;
  authorInitials: string;
  accent: 'cyan' | 'gold' | 'violet';
  role: string;
  timeAgo: string;
  text: string;
  resonances: number;
  replies: number;
  circleName?: string;
}

export interface PathQuestion {
  id: string;
  prompt: string;
  helper: string;
  multiple: boolean;
  options: { id: string; label: string; description: string }[];
}

export interface Booking {
  id: string;
  serviceId: string;
  guideId: string;
  date: string;
  time: string;
  createdAt: string;
  note?: string;
}
