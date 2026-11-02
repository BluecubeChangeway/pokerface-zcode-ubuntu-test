/**
 * Label - 标签组件
 * 基于原生 label 元素封装
 */

'use client';

import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  /** 是否必填 */
  required?: boolean;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        'block text-sm font-medium text-foreground mb-1.5',
        'peer-disabled:opacity-50',
        'peer-disabled:cursor-not-allowed'
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="text-danger ml-0.5" aria-hidden="true">
          *
        </span>
      )}
    </label>
  )
);

Label.displayName = 'Label';