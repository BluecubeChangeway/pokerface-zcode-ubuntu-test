/**
 * Card 组件故事
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, Edit, Trash2, Eye, MoreHorizontal, ChevronDown } from 'lucide-react';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '卡片组件族，包含 Header、Title、Description、Content、Footer、Action 等子组件。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'bordered', 'elevated', 'outlined', 'ghost'],
      description: '卡片变体',
      table: { category: 'Appearance' },
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
      description: '内边距大小',
      table: { category: 'Layout' },
    },
    hoverable: {
      control: 'boolean',
      description: '悬浮效果',
      table: { category: 'Interaction' },
    },
    clickable: {
      control: 'boolean',
      description: '可点击样式',
      table: { category: 'Interaction' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>卡片标题</CardTitle>
        <CardDescription>这是一段卡片描述文本，用于补充说明卡片的主要内容。</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          卡片主体内容区域。可以放置任何内容，如表单、列表、图表等。
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="secondary" size="sm">取消</Button>
        <Button variant="primary" size="sm">确认</Button>
      </CardFooter>
    </Card>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-full max-w-4xl">
      <Card variant="default" className="h-48">
        <CardContent className="flex items-center justify-center">
          <span className="font-medium">Default</span>
        </CardContent>
      </Card>
      <Card variant="bordered" className="h-48">
        <CardContent className="flex items-center justify-center">
          <span className="font-medium">Bordered</span>
        </CardContent>
      </Card>
      <Card variant="elevated" className="h-48">
        <CardContent className="flex items-center justify-center">
          <span className="font-medium">Elevated</span>
        </CardContent>
      </Card>
      <Card variant="outlined" className="h-48">
        <CardContent className="flex items-center justify-center">
          <span className="font-medium">Outlined</span>
        </CardContent>
      </Card>
      <Card variant="ghost" className="h-48">
        <CardContent className="flex items-center justify-center">
          <span className="font-medium">Ghost</span>
        </CardContent>
      </Card>
    </div>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>带操作按钮的卡片</CardTitle>
        <CardDescription>右上角可放置操作按钮</CardDescription>
        <CardAction>
          <Button variant="ghost" size="sm" aria-label="更多操作">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          卡片内容区域。Action 组件会自动定位到头部右侧。
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="ghost" size="sm">查看详情</Button>
        <Button variant="primary" size="sm">编辑</Button>
      </CardFooter>
    </Card>
  ),
};

export const Hoverable: Story = {
  args: {
    variant: 'elevated',
    hoverable: true,
  },
  render: () => (
    <Card variant="elevated" hoverable className="w-80">
      <CardHeader>
        <CardTitle>可悬浮卡片</CardTitle>
        <CardDescription>鼠标悬停时有上浮阴影效果</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          尝试将鼠标悬停在卡片上，观察阴影和位移动画。
        </p>
      </CardContent>
    </Card>
  ),
};

export const Clickable: Story = {
  args: {
    variant: 'elevated',
    clickable: true,
  },
  render: () => (
    <Card variant="elevated" clickable className="w-80">
      <CardHeader>
        <CardTitle>可点击卡片</CardTitle>
        <CardDescription>点击时有轻微缩放反馈</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          点击卡片时会有 0.99 倍缩放动画反馈。
        </p>
      </CardContent>
    </Card>
  ),
};

export const PaddingVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <Card padding="none" className="border border-border">
        <CardContent className="bg-muted p-4 rounded">
          <code>padding="none"</code> - 无内边距
        </CardContent>
      </Card>
      <Card padding="sm">
        <CardContent><code>padding="sm"</code> - 12px 内边距</CardContent>
      </Card>
      <Card padding="md">
        <CardContent><code>padding="md"</code> - 16px 内边距（默认）</CardContent>
      </Card>
      <Card padding="lg">
        <CardContent><code>padding="lg"</code> - 24px 内边距</CardContent>
      </Card>
    </div>
  ),
};

export const ComplexCard: Story = {
  render: () => (
    <Card variant="elevated" className="w-96">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>工作量卡：神经外科门诊</CardTitle>
            <CardDescription>单元：神经外科一病区 · 预算：¥1,200,000</CardDescription>
          </div>
          <CardAction>
            <Button variant="ghost" size="sm" aria-label="更多操作">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardAction>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">工作量值</span>
            <div className="font-semibold text-lg">1,250</div>
          </div>
          <div>
            <span className="text-muted-foreground">完成进度</span>
            <div className="font-semibold text-lg">85%</div>
          </div>
          <div>
            <span className="text-muted-foreground">预算执行</span>
            <div className="font-semibold text-lg">¥980,000</div>
          </div>
          <div>
            <span className="text-muted-foreground">剩余预算</span>
            <div className="font-semibold text-lg text-success">¥220,000</div>
          </div>
        </div>
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">关联推荐</span>
            <Badge variant="success">2 条待处理</Badge>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="ghost" size="sm" leftIcon={<Eye className="h-3.5 w-3.5" />}>查看详情</Button>
        <Button variant="secondary" size="sm" leftIcon={<Edit className="h-3.5 w-3.5" />}>编辑</Button>
        <Button variant="primary" size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>新建推荐</Button>
      </CardFooter>
    </Card>
  ),
};

// Badge 组件临时定义（用于故事演示）
function Badge({ children, variant = 'default', className }: { children: React.ReactNode; variant?: 'default' | 'success' | 'warning' | 'danger'; className?: string }) {
  const variants = {
    default: 'bg-secondary text-secondary-foreground',
    success: 'bg-success text-success-foreground',
    warning: 'bg-warning text-warning-foreground',
    danger: 'bg-danger text-danger-foreground',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export const EmptyState: Story = {
  render: () => (
    <Card variant="bordered" className="w-80">
      <CardContent className="py-12 text-center">
        <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
          <Plus className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium">暂无数据</h3>
        <p className="text-sm text-muted-foreground mt-1">点击上方按钮创建第一张卡片</p>
        <div className="mt-4">
          <Button variant="primary" leftIcon={<Plus className="h-4 w-4" />}>新建卡片</Button>
        </div>
      </CardContent>
    </Card>
  ),
};