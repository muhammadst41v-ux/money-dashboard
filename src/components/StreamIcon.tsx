import React from 'react';
import {
  Briefcase,
  Megaphone,
  ShoppingBag,
  Sparkles,
  Laptop,
  Code,
  DollarSign,
  TrendingUp,
  CreditCard,
  Video,
  PenTool,
  BookOpen,
  Users,
  Layers,
  CircleDollarSign,
  LucideIcon,
} from 'lucide-react';

export const AVAILABLE_ICONS: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'Briefcase', label: 'Briefcase (Client)', icon: Briefcase },
  { id: 'Megaphone', label: 'Megaphone (Sponsor)', icon: Megaphone },
  { id: 'ShoppingBag', label: 'Shopping Bag (Products)', icon: ShoppingBag },
  { id: 'Sparkles', label: 'Sparkles (Other)', icon: Sparkles },
  { id: 'Laptop', label: 'Laptop (Consulting)', icon: Laptop },
  { id: 'Code', label: 'Code (Development)', icon: Code },
  { id: 'DollarSign', label: 'Dollar (Royalties)', icon: DollarSign },
  { id: 'TrendingUp', label: 'Growth (Investments)', icon: TrendingUp },
  { id: 'CreditCard', label: 'Subscription', icon: CreditCard },
  { id: 'Video', label: 'Video (Content)', icon: Video },
  { id: 'PenTool', label: 'Design (Creative)', icon: PenTool },
  { id: 'BookOpen', label: 'Course / Book', icon: BookOpen },
  { id: 'Users', label: 'Community / Coaching', icon: Users },
  { id: 'Layers', label: 'Assets & Bundles', icon: Layers },
];

export const STREAM_COLORS = [
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#6366F1', // Indigo
];

interface StreamIconProps {
  iconName: string;
  className?: string;
  size?: number;
}

export const StreamIcon: React.FC<StreamIconProps> = ({ iconName, className = 'w-5 h-5', size }) => {
  const match = AVAILABLE_ICONS.find((i) => i.id.toLowerCase() === (iconName || '').toLowerCase());
  const IconComponent = match ? match.icon : CircleDollarSign;
  return <IconComponent className={className} size={size} />;
};
