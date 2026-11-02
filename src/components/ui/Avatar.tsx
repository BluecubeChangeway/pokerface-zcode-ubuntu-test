/**
 * Avatar - 头像组件
 * 基于 @radix-ui/react-avatar 封装
 * 
 * 特性：
 * - 图片头像、首字母回退、图标回退
 * - 多尺寸：xs / sm / md / lg / xl
 * - 状态指示器（在线、离线、忙碌等）
 * - 组合组件：AvatarImage、AvatarFallback
 */

'use client';

import React, { forwardRef } from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/lib/utils';
import { User, Image, Mail, AlertCircle, CheckCircle, Clock, MinusCircle } from 'lucide-react';

// ============================================
// 类型定义
// ============================================

export interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  /** 图片来源 */
  src?: string;
  /** 备选文本 */
  alt?: string;
  /** 回退内容（首字母或图标） */
  fallback?: React.ReactNode;
  /** 尺寸 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** 形状 */
  shape?: 'circle' | 'square';
  /** 状态指示器 */
  status?: 'online' | 'offline' | 'busy' | 'away' | 'idle';
  /** 状态位置 */
  statusPosition?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export interface AvatarImageProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image> {
  src: string;
  alt?: string;
}

export interface AvatarFallbackProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback> {
  children?: React.ReactNode;
}

// ============================================
// 尺寸样式
// ============================================

const sizeStyles = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-16 w-16 text-xl',
};

const statusSizeStyles = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
  xl: 'h-4 w-4',
};

const statusPositionStyles = {
  'bottom-right': 'bottom-0 right-0',
  'bottom-left': 'bottom-0 left-0',
  'top-right': 'top-0 right-0',
  'top-left': 'top-0 left-0',
};

const statusColorStyles = {
  online: 'bg-green-500 border-white dark:border-gray-900',
  offline: 'bg-gray-400 border-white dark:border-gray-900',
  busy: 'bg-red-500 border-white dark:border-gray-900',
  away: 'bg-yellow-500 border-white dark:border-gray-900',
  idle: 'bg-blue-500 border-white dark:border-gray-900',
};

// ============================================
// Avatar 根组件
// ============================================

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      className,
      src,
      alt,
      fallback,
      size = 'md',
      shape = 'circle',
      status,
      statusPosition = 'bottom-right',
      ...props
    },
    ref
  ) => {
    const statusIndicator = status && (
      <span
        className={cn(
          'absolute rounded-full border-2',
          statusSizeStyles[size],
          statusPositionStyles[statusPosition],
          statusColorStyles[status]
        )}
        aria-label={`状态：${status}`}
      />
    );

    return (
      <AvatarPrimitive.Root
        ref={ref}
        className={cn(
          'relative inline-flex shrink-0 overflow-hidden',
          sizeStyles[size],
          shape === 'square' && 'rounded-lg',
          shape === 'circle' && 'rounded-full',
          className
        )}
        {...props}
      >
        <AvatarPrimitive.Image src={src} alt={alt} className="aspect-square h-full w-full" />
        {fallback && (
          <AvatarPrimitive.Fallback className={cn('flex h-full w-full items-center justify-center rounded-full bg-muted')}>
            {fallback}
          </AvatarPrimitive.Fallback>
        )}
        {statusIndicator}
      </AvatarPrimitive.Root>
    );
  }
);
Avatar.displayName = 'Avatar';

// ============================================
// 便捷子组件
// ============================================

export const AvatarImage = forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, src, alt, ...props }, ref) => (
    <AvatarPrimitive.Image
      ref={ref}
      src={src}
      alt={alt}
      className={cn('aspect-square h-full w-full', className)}
      {...props}
    />
  )
);
AvatarImage.displayName = 'AvatarImage';

export const AvatarFallback = forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, children, ...props }, ref) => (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn('flex h-full w-full items-center justify-center rounded-full bg-muted', className)}
      {...props}
    >
      {children}
    </AvatarPrimitive.Fallback>
  )
);
AvatarFallback.displayName = 'AvatarFallback';

// ============================================
// 头像组合示例组件
// ============================================

export interface AvatarGroupProps {
  /** 头像列表 */
  avatars: Array<{
    src?: string;
    alt?: string;
    fallback?: React.ReactNode;
    status?: 'online' | 'offline' | 'busy' | 'away' | 'idle';
  }>;
  /** 最大显示数量 */
  max?: number;
  /** 尺寸 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /** 重叠方向 */
  overlapDirection?: 'left' | 'right';
  /** 类名 */
  className?: string;
}

export function AvatarGroup({
  avatars,
  max = 5,
  size = 'md',
  overlapDirection = 'left',
  className,
}: AvatarGroupProps) {
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  return (
    <div className={cn('flex', overlapDirection === 'right' && '-space-x-2', overlapDirection === 'left' && 'space-x-2', className)}>
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={index}
          src={avatar.src}
          alt={avatar.alt}
          fallback={avatar.fallback}
          size={size}
          status={avatar.status}
          className={cn('ring-2 ring-background', index > 0 && '-ml-2')}
        />
      ))}
      {remainingCount > 0 && (
        <Avatar
          size={size}
          fallback={(
            <span className="font-medium">+{remainingCount}</span>
          )}
          className="ring-2 ring-background -ml-2"
        />
      )}
    </div>
  );
}

// ============================================
// 便捷状态图标
// ============================================

export function StatusIndicator({
  status,
  size = 'md',
  className,
}: {
  status: 'online' | 'offline' | 'busy' | 'away' | 'idle';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const icons = {
    online: <CheckCircle className="h-full w-full text-green-500" />,
    offline: <MinusCircle className="h-full w-full text-gray-400" />,
    busy: <AlertCircle className="h-full w-full text-red-500" />,
    away: <Clock className="h-full w-full text-yellow-500" />,
    idle: <Mail className="h-full w-full text-blue-500" />,
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full',
        statusSizeStyles[size],
        statusColorStyles[status],
        className
      )}
      aria-label={`状态：${status}`}
    >
      {icons[status]}
    </span>
  );
}

// 类型已在声明处导出，此处不再重复导出