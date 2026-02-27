import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { forwardRef, InputHTMLAttributes } from 'react';

export interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className="flex items-center space-x-2">
        <div className="relative">
          <input
            type="checkbox"
            ref={ref}
            className={cn(
              'peer h-4 w-4 appearance-none rounded border border-gray-300',
              'checked:border-[#E72C63] checked:bg-[#E72C63]',
              'focus:outline-none focus:ring-2 focus:ring-[#E72C63] focus:ring-offset-2',
              className
            )}
            {...props}
          />
          <Check
            className="absolute left-0 top-0 h-4 w-4 text-white opacity-0 peer-checked:opacity-100"
            strokeWidth={3}
          />
        </div>
        {label && <span className="text-sm text-[#29235C]">{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export { Checkbox };