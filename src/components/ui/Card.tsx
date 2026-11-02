/**
 * Card - 卡片组件族
 * 
 * 组件：
 * - Card: 根容器
 * - CardHeader: 头部
 * - CardTitle: 标题
 * - CardDescription: 描述
 * - CardContent: 主体内容
 * - CardFooter: 底部
 * - CardAction: 操作区（右上角）
 * 
 * 特性：
 * - 语义化结构
 * - 主题感知（自动适配 light/dark）
 * - 可选边框、阴影、悬浮态
 * - 支持 asChild 多态
 */

'use client';

import React, { forwardRef, ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

// ============================================
// 类型定义
// ============================================

interface CardCompoundComponent extends React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>> {
  Header: typeof CardHeader;
  Title: typeof CardTitle;
  Description: typeof CardDescription;
  Content: typeof CardContent;
  Footer: typeof CardFooter;
  Action: typeof CardAction;
}

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 变体 */
  variant?: 'default' | 'bordered' | 'elevated' | 'outlined' | 'ghost';
  /** 是否可悬浮 */
  hoverable?: boolean;
  /** 是否可点击 */
  clickable?: boolean;
  /** 作为子元素渲染 */
  asChild?: boolean;
  /** 内边距大小 */
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  asChild?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  asChild?: boolean;
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

interface CardActionProps extends React.HTMLAttributes<HTMLDivElement> {
  asChild?: boolean;
}

// ============================================
// 样式变体
// ============================================

const cardVariants = {
  default: 'bg-card border border-card-border shadow-card',
  bordered: 'bg-card border border-card-border',
  elevated: 'bg-card border border-card-border shadow-card-hover',
  outlined: 'bg-transparent border-2 border-border',
  ghost: 'bg-transparent border-none',
};

const paddingVariants = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

// ============================================
// Card 根组件
// ============================================

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hoverable = false, clickable = false, asChild = false, padding = 'md', children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    
    return (
      <Comp
        ref={ref}
        className={cn(
          'rounded-xl transition-all duration-fast ease-standard',
          cardVariants[variant],
          paddingVariants[padding],
          hoverable && 'hover:shadow-card-hover hover:-translate-y-0.5',
          clickable && 'cursor-pointer active:scale-[0.99]',
          className
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
Card.displayName = 'Card';

// ============================================
// CardHeader
// ============================================

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    return (
      <Comp
        ref={ref}
        className={cn('flex flex-col space-y-1.5', className)}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
CardHeader.displayName = 'CardHeader';

// ============================================
// CardTitle
// ============================================

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, asChild = false, size = 'md', children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'h3';
    return (
      <Comp
        ref={ref}
        className={cn(
          'font-semibold leading-tight truncate',
          size === 'sm' && 'text-sm',
          size === 'md' && 'text-base',
          size === 'lg' && 'text-lg',
          className
        )}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
CardTitle.displayName = 'CardTitle';

// ============================================
// CardDescription
// ============================================

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'p';
    return (
      <Comp
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
CardDescription.displayName = 'CardDescription';

// ============================================
// CardContent
// ============================================

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    return (
      <Comp ref={ref} className={cn('pt-0', className)} {...props}>
        {children}
      </Comp>
    );
  }
);
CardContent.displayName = 'CardContent';

// ============================================
// CardFooter
// ============================================

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    return (
      <Comp
        ref={ref}
        className={cn('flex items-center gap-2 pt-4', className)}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
CardFooter.displayName = 'CardFooter';

// ============================================
// CardAction (右上角操作区)
// ============================================

export const CardAction = forwardRef<HTMLDivElement, CardActionProps>(
  ({ className, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'div';
    return (
      <Comp
        ref={ref}
        className={cn('flex items-center gap-1.5', className)}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);
CardAction.displayName = 'CardAction';

// ============================================
// 复合组件类型定义
// ============================================

interface CardCompoundComponent extends React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>> {
  Header: typeof CardHeader;
  Title: typeof CardTitle;
  Description: typeof CardDescription;
  Content: typeof CardContent;
  Footer: typeof CardFooter;
  Action: typeof CardAction;
}

// 将子组件挂载到 Card 上
const CardCompound = Card as typeof Card & {
  Header: typeof CardHeader;
  Title: typeof CardTitle;
  Description: typeof CardDescription;
  Content: typeof CardContent;
  Footer: typeof CardFooter;
  Action: typeof CardAction;
};

export { CardCompound as Card };