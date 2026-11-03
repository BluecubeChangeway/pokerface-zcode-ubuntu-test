/**
 * Tooltip 组件故事
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';
import { Button } from '@/components/ui/Button';
import { Info, AlertCircle, CheckCircle, AlertTriangle, HelpCircle, ExternalLink, Copy, Settings, Trash2, Edit, Share2, Download, Star, Heart, Bell, MoreHorizontal } from 'lucide-react';

const meta: Meta<typeof Tooltip> = {
  title: 'UI/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '提示框组件，鼠标悬停或聚焦时显示提示信息。支持多种位置、变体和动画。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    content: { control: 'text', description: '提示内容' },
    side: { control: 'select', options: ['top', 'bottom', 'left', 'right'], description: '位置' },
    align: { control: 'select', options: ['start', 'center', 'end'], description: '对齐方式' },
    variant: { control: 'select', options: ['default', 'success', 'warning', 'danger', 'info'], description: '变体' },
    sideOffset: { control: 'number', description: '侧边偏移' },
    alignOffset: { control: 'number', description: '对齐偏移' },
    delayDuration: { control: 'number', description: '显示延迟(ms)' },
    skipDelayDuration: { control: 'number', description: '隐藏延迟(ms)' },
    disabled: { control: 'boolean', description: '禁用' },
    defaultOpen: { control: 'boolean', description: '默认打开' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// 简单的按钮包装器
const TriggerButton = ({ children, ...props }: { children: React.ReactNode }) => (
  <Button variant="ghost" size="sm" {...props}>
    {children}
  </Button>
);

export const Default: Story = {
  args: {
    content: '这是一个默认提示框',
    children: <TriggerButton>悬停查看</TriggerButton>,
  },
};

export const Top: Story = {
  args: {
    content: '顶部提示',
    side: 'top',
    children: <TriggerButton>顶部</TriggerButton>,
  },
};

export const Bottom: Story = {
  args: {
    content: '底部提示',
    side: 'bottom',
    children: <TriggerButton>底部</TriggerButton>,
  },
};

export const Left: Story = {
  args: {
    content: '左侧提示',
    side: 'left',
    children: <TriggerButton>左侧</TriggerButton>,
  },
};

export const Right: Story = {
  args: {
    content: '右侧提示',
    side: 'right',
    children: <TriggerButton>右侧</TriggerButton>,
  },
};

export const AllPositions: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Tooltip content="顶部居中" side="top" align="center">
        <TriggerButton>上</TriggerButton>
      </Tooltip>
      <Tooltip content="底部居中" side="bottom" align="center">
        <TriggerButton>下</TriggerButton>
      </Tooltip>
      <Tooltip content="左侧居中" side="left" align="center">
        <TriggerButton>左</TriggerButton>
      </Tooltip>
      <Tooltip content="右侧居中" side="right" align="center">
        <TriggerButton>右</TriggerButton>
      </Tooltip>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-4">
        <Tooltip content="默认提示" variant="default">
          <TriggerButton>默认</TriggerButton>
        </Tooltip>
        <Tooltip content="成功提示" variant="success">
          <TriggerButton className="text-success">成功</TriggerButton>
        </Tooltip>
        <Tooltip content="警告提示" variant="warning">
          <TriggerButton className="text-warning">警告</TriggerButton>
        </Tooltip>
        <Tooltip content="危险提示" variant="danger">
          <TriggerButton className="text-destructive">危险</TriggerButton>
        </Tooltip>
        <Tooltip content="信息提示" variant="info">
          <TriggerButton className="text-primary">信息</TriggerButton>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex flex-wrap items-center gap-4">
        <Tooltip content="编辑此项" side="top">
          <TriggerButton aria-label="编辑"><Edit className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="删除此项" side="top" variant="danger">
          <TriggerButton aria-label="删除"><Trash2 className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="复制链接" side="top">
          <TriggerButton aria-label="复制"><Copy className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="分享" side="top">
          <TriggerButton aria-label="分享"><Share2 className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="下载" side="top">
          <TriggerButton aria-label="下载"><Download className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="收藏" side="top">
          <TriggerButton aria-label="收藏"><Star className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="点赞" side="top">
          <TriggerButton aria-label="点赞"><Heart className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="通知" side="top">
          <TriggerButton aria-label="通知"><Bell className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="更多操作" side="top">
          <TriggerButton aria-label="更多"><MoreHorizontal className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="设置" side="top">
          <TriggerButton aria-label="设置"><Settings className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="外部链接" side="top">
          <TriggerButton aria-label="外部链接"><ExternalLink className="h-4 w-4" /></TriggerButton>
        </Tooltip>
        <Tooltip content="帮助信息" side="top" variant="info">
          <TriggerButton aria-label="帮助"><HelpCircle className="h-4 w-4" /></TriggerButton>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};

export const WithRichContent: Story = {
  args: {
    content: (
      <div className="space-y-1">
        <p className="font-medium">标题内容</p>
        <p className="text-xs text-muted-foreground">这是详细的描述信息，可以包含多行文本。</p>
        <div className="flex gap-1 pt-1">
          <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded">标签1</span>
          <span className="px-2 py-0.5 text-xs bg-success/10 text-success rounded">标签2</span>
        </div>
      </div>
    ),
    children: <TriggerButton>富文本提示</TriggerButton>,
  },
};

export const Delayed: Story = {
  args: {
    content: '延迟 500ms 显示',
    delayDuration: 500,
    skipDelayDuration: 200,
    children: <TriggerButton>延迟显示</TriggerButton>,
  },
};

export const Disabled: Story = {
  args: {
    content: '这个提示不会显示',
    disabled: true,
    children: <TriggerButton disabled>禁用的触发器</TriggerButton>,
  },
};

export const DefaultOpen: Story = {
  args: {
    content: '默认打开的提示框',
    defaultOpen: true,
    children: <TriggerButton>默认打开</TriggerButton>,
  },
};

export const AlignStart: Story = {
  args: {
    content: '左对齐',
    side: 'top',
    align: 'start',
    children: <TriggerButton className="w-32">左对齐 (start)</TriggerButton>,
  },
};

export const AlignEnd: Story = {
  args: {
    content: '右对齐',
    side: 'top',
    align: 'end',
    children: <TriggerButton className="w-32">右对齐 (end)</TriggerButton>,
  },
};

export const Offset: Story = {
  args: {
    content: '偏移 16px',
    sideOffset: 16,
    children: <TriggerButton>偏移距离</TriggerButton>,
  },
};

export const FormFieldExample: Story = {
  render: () => (
    <TooltipProvider>
      <form className="space-y-4 w-80">
        <div className="flex items-center gap-2">
          <label className="w-24 text-sm font-medium">用户名</label>
          <div className="flex-1">
            <input type="text" className="w-full px-3 py-2 border border-input-border rounded-lg text-sm" placeholder="请输入用户名" />
          </div>
          <Tooltip content="用户名长度 3-20 字符，仅支持字母数字下划线" variant="info">
            <TriggerButton aria-label="帮助"><HelpCircle className="h-4 w-4" /></TriggerButton>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <label className="w-24 text-sm font-medium">密码</label>
          <div className="flex-1">
            <input type="password" className="w-full px-3 py-2 border border-input-border rounded-lg text-sm" placeholder="请输入密码" />
          </div>
          <Tooltip content="密码需包含大小写字母、数字，长度 8-32 位" variant="info">
            <TriggerButton aria-label="帮助"><HelpCircle className="h-4 w-4" /></TriggerButton>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2">
          <label className="w-24 text-sm font-medium">邮箱</label>
          <div className="flex-1">
            <input type="email" className="w-full px-3 py-2 border border-input-border rounded-lg text-sm" placeholder="example@email.com" />
          </div>
          <Tooltip content="用于接收验证码和重要通知" variant="info">
            <TriggerButton aria-label="帮助"><HelpCircle className="h-4 w-4" /></TriggerButton>
          </Tooltip>
        </div>
      </form>
    </TooltipProvider>
  ),
};

export const ButtonToolbar: Story = {
  render: () => (
    <TooltipProvider>
      <div className="flex items-center gap-1 p-2 bg-muted rounded-lg">
        <Tooltip content="新建" side="top">
          <Button variant="ghost" size="sm" aria-label="新建"><Plus className="h-4 w-4" /></Button>
        </Tooltip>
        <Tooltip content="编辑" side="top">
          <Button variant="ghost" size="sm" aria-label="编辑"><Edit className="h-4 w-4" /></Button>
        </Tooltip>
        <Tooltip content="查看" side="top">
          <Button variant="ghost" size="sm" aria-label="查看"><Eye className="h-4 w-4" /></Button>
        </Tooltip>
        <Tooltip content="删除" side="top" variant="danger">
          <Button variant="ghost" size="sm" aria-label="删除"><Trash2 className="h-4 w-4" /></Button>
        </Tooltip>
        <Tooltip content="下载" side="top">
          <Button variant="ghost" size="sm" aria-label="下载"><Download className="h-4 w-4" /></Button>
        </Tooltip>
        <Tooltip content="上传" side="top">
          <Button variant="ghost" size="sm" aria-label="上传"><Upload className="h-4 w-4" /></Button>
        </Tooltip>
        <Tooltip content="搜索" side="top">
          <Button variant="ghost" size="sm" aria-label="搜索"><Search className="h-4 w-4" /></Button>
        </Tooltip>
        <Tooltip content="设置" side="top">
          <Button variant="ghost" size="sm" aria-label="设置"><Settings className="h-4 w-4" /></Button>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};