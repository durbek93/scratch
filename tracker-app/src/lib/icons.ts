import {
  ShoppingCart, Coffee, Car, Home, Zap, Wifi, Globe, Heart, Briefcase, Activity, CreditCard,
  Fuel, Shirt, TrendingUp, PiggyBank, BookOpen, HelpCircle, Banknote, Utensils, Monitor,
  Music, Camera, Gift, Wrench, Smile, Phone, Scissors, Sun, Moon, Star
} from 'lucide-react';
import { LucideIcon } from 'lucide-react';

export const ICONS: Record<string, LucideIcon> = {
  ShoppingCart, Coffee, Car, Home, Zap, Wifi, Globe, Heart, Briefcase, Activity, CreditCard,
  Fuel, Shirt, TrendingUp, PiggyBank, BookOpen, HelpCircle, Banknote, Utensils, Monitor,
  Music, Camera, Gift, Wrench, Smile, Phone, Scissors, Sun, Moon, Star
};

export const getIcon = (name: string): LucideIcon => {
  return ICONS[name] || HelpCircle;
};

export const AVAILABLE_ICON_NAMES = Object.keys(ICONS);
