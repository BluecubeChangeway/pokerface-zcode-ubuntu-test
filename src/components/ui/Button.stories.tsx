/**
 * Button 组件故事
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Button, PrimaryButton, SecondaryButton, DangerButton, GhostButton, SubtleButton, OutlineButton } from '@/components/ui/Button';
import { Loader2, Download, Upload, Plus, Trash2, Edit, Eye, Search, Settings } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '基础按钮组件，支持多变体、多尺寸、加载状态、图标等。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'ghost', 'subtle', 'outline'],
      description: '按钮变体',
      table: { category: 'Appearance' },
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
      description: '按钮尺寸',
      table: { category: 'Appearance' },
    },
    disabled: {
      control: 'boolean',
      description: '是否禁用',
      table: { category: 'State' },
    },
    loading: {
      control: 'boolean',
      description: '加载状态',
      table: { category: 'State' },
    },
    fullWidth: {
      control: 'boolean',
      description: '全宽显示',
      table: { category: 'Layout' },
    },
    asChild: {
      control: 'boolean',
      description: '作为子元素渲染（用于 Link 等）',
      table: { category: 'Advanced' },
    },
    leftIcon: {
      control: false,
      description: '前置图标',
      table: { category: 'Content' },
    },
    rightIcon: {
      control: false,
      description: '后置图标',
      table: { category: 'Content' },
    },
    loadingText: {
      control: 'text',
      description: '加载时文本',
      table: { category: 'Content' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================
// 基础变体
// ============================================

export const Primary: Story = {
  args: {
    children: '主要按钮',
    variant: 'primary',
  },
};

export const Secondary: Story = {
  args: {
    children: '次要按钮',
    variant: 'secondary',
  },
};

export const Success: Story = {
  args: {
    children: '成功按钮',
    variant: 'success',
  },
};

export const Warning: Story = {
  args: {
    children: '警告按钮',
    variant: 'warning',
  },
};

export const Danger: Story = {
  args: {
    children: '危险按钮',
    variant: 'danger',
  },
};

export const Ghost: Story = {
  args: {
    children: '幽灵按钮',
    variant: 'ghost',
  },
};

export const Subtle: Story = {
  args: {
    children: '微弱按钮',
    variant: 'subtle',
  },
};

export const Outline: Story = {
  args: {
    children: '轮廓按钮',
    variant: 'outline',
  },
};

// ============================================
// 所有变体展示
// ============================================

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="success">Success</Button>
      <Button variant="warning">Warning</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="subtle">Subtle</Button>
      <Button variant="outline">Outline</Button>
    </div>
  ),
};

// ============================================
// 尺寸展示
// ============================================

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </div>
  ),
};

// ============================================
// 状态展示
// ============================================

export const Disabled: Story = {
  args: {
    children: '禁用状态',
    disabled: true,
  },
};

export const Loading: Story = {
  args: {
    children: '加载中...',
    loading: true,
  },
};

export const LoadingWithText: Story = {
  args: {
    children: '提交中',
    loading: true,
    loadingText: '正在提交...',
  },
};

// ============================================
// 图标展示
// ============================================

export const WithLeftIcon: Story = {
  args: {
    children: '下载',
    leftIcon: <Download className="h-4 w-4" />,
  },
};

export const WithRightIcon: Story = {
  args: {
    children: '搜索',
    rightIcon: <Search className="h-4 w-4" />,
  },
};

export const WithBothIcons: Story = {
  args: {
    children: '编辑保存',
    leftIcon: <Edit className="h-4 w-4" />,
    rightIcon: <Settings className="h-4 w-4" />,
  },
};

export const IconOnly: Story = {
  args: {
    children: <Plus className="h-4 w-4" />,
    'aria-label': '新建',
    size: 'sm',
  },
};

// ============================================
// 预设变体组件
// ============================================

export const PresetComponents: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <PrimaryButton>PrimaryButton</PrimaryButton>
      <SecondaryButton>SecondaryButton</SecondaryButton>
      <DangerButton>DangerButton</DangerButton>
      <GhostButton>GhostButton</GhostButton>
      <SubtleButton>SubtleButton</SubtleButton>
      <OutlineButton>OutlineButton</OutlineButton>
    </div>
  ),
};

// ============================================
// 实际使用场景
// ============================================

export const FormActions: Story = {
  render: () => (
    <div className="flex gap-3">
      <Button variant="secondary">取消</Button>
      <Button variant="primary" leftIcon={<Download className="h-4 w-4" />}>
        保存并下载
      </Button>
    </div>
  ),
};

export const DangerActions: Story = {
  render: () => (
    <div className="flex gap-3">
      <Button variant="ghost">取消</Button>
      <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />}>
        删除
      </Button>
    </div>
  ),
};

export const ToolbarActions: Story = {
  render: () => (
    <div className="flex gap-1 p-2 bg-muted rounded-lg">
      <Button variant="ghost" size="sm" leftIcon={<Plus className="h-4 w-4" />} aria-label="新建" />
      <Button variant="ghost" size="sm" leftIcon={<Edit className="h-4 w-4" />} aria-label="编辑" />
      <Button variant="ghost" size="sm" leftIcon={<Eye className="h-4 w-4" />} aria-label="查看" />
      <Button variant="ghost" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} aria-label="删除" />
      <Button variant="ghost" size="sm" leftIcon={<Download className="h-4 w-4" />} aria-label="下载" />
      <Button variant="ghost" size="sm" leftIcon={<Upload className="h-4 w-4" />} aria-label="上传" />
      <Button variant="ghost" size="sm" leftIcon={<Search className="h-4 w-4" />} aria-label="搜索" />
      <Button variant="ghost" size="sm" leftIcon={<Settings className="h-4 w-4" />} aria-label="设置" />
    </div>
  ),
};

// ============================================
// 全宽按钮
// ============================================

export const FullWidthButtons: Story = {
  render: () => (
    <div className="w-64 space-y-2">
      <Button variant="primary" fullWidth>全宽主要按钮</Button>
      <Button variant="secondary" fullWidth>全宽次要按钮</Button>
      <Button variant="outline" fullWidth>全宽轮廓按钮</Button>
    </div>
  ),
};

// ============================================
// 交互状态
// ============================================

export const InteractiveStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button variant="primary">默认</Button>
      <Button variant="primary" disabled>禁用</Button>
      <Button variant="primary" loading>加载中</Button>
      <Button variant="primary" loading loadingText="处理中...">加载中（自定义文本）</Button>
    </div>
  ),
};