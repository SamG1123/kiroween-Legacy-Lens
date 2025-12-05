import { cn } from '../../utils/cn';

interface ShimmerEffectProps {
  className?: string;
  children?: React.ReactNode;
}

export function ShimmerEffect({ className, children }: ShimmerEffectProps) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      {children}
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

// Add shimmer animation to tailwind config if not already present
// In tailwind.config.js, add to theme.extend.keyframes:
// shimmer: {
//   '100%': { transform: 'translateX(100%)' },
// }
