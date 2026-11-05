/**
 * Tabs 组件故事
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Tabs } from '@/components/ui/Tabs';
import { Home, Users, Settings, Mail, Bell, HelpCircle } from 'lucide-react';

const meta: Meta<typeof Tabs> = {
  title: 'UI/Tabs',
  component: Tabs,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '标签页组件，支持多种变体、尺寸、方向和图标。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['line', 'enclosed', 'soft', 'pills'], description: '变体' },
    size: { control: 'select', options: ['sm', 'md', 'lg'], description: '尺寸' },
    orientation: { control: 'select', options: ['horizontal', 'vertical'], description: '方向' },
    lazy: { control: 'boolean', description: '懒加载内容' },
    fullWidth: { control: 'boolean', description: '全宽' },
    defaultValue: { control: 'text', description: '默认激活标签' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const basicItems = [
  { value: 'home', label: '首页', icon: <Home className="w-4 h-4" /> },
  { value: 'users', label: '用户', icon: <Users className="w-4 h-4" /> },
  { value: 'settings', label: '设置', icon: <Settings className="w-4 h-4" /> },
];

export const Default: Story = {
  args: {
    items: basicItems,
    defaultValue: 'home',
    children: (
      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          当前激活: home
        </p>
      </div>
    ),
  },
};

export const WithContent: Story = {
  args: {
    items: basicItems,
    defaultValue: 'home',
    children: (
      <div className="space-y-2 p-4 bg-muted rounded-lg">
        <h4 className="font-medium">首页内容</h4>
        <p className="text-sm text-muted-foreground">
          欢迎来到首页！这里展示系统概览和重要信息。
        </p>
      </div>
    ),
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-8 w-96">
      <div>
        <p className="text-xs text-muted-foreground mb-2">Line (默认)</p>
        <Tabs items={basicItems} variant="line" defaultValue="home">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Line variant content</p>
          </div>
        </Tabs>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">Enclosed</p>
        <Tabs items={basicItems} variant="enclosed" defaultValue="home">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Enclosed variant content</p>
          </div>
        </Tabs>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">Soft</p>
        <Tabs items={basicItems} variant="soft" defaultValue="home">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Soft variant content</p>
          </div>
        </Tabs>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">Pills</p>
        <Tabs items={basicItems} variant="pills" defaultValue="home">
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Pills variant content</p>
          </div>
        </Tabs>
      </div>
    </div>
  ),
};

export const WithBadges: Story = {
  args: {
    items: [
      { value: 'inbox', label: '收件箱', icon: Mail, badge: 5 },
      { value: 'notifications', label: '通知', icon: Bell, badge: 3 },
      { value: 'settings', label: '设置', icon: Settings },
    ],
    defaultValue: 'inbox',
  },
};

export const WithDisabled: Story = {
  args: {
    items: [
      { value: 'home', label: '首页', icon: Home },
      { value: 'users', label: '用户', icon: Users, disabled: true },
      { value: 'settings', label: '设置', icon: Settings },
    ],
    defaultValue: 'home',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-6 w-96">
      <div>
        <p className="text-xs text-muted-foreground mb-2">Small</p>
        <Tabs items={basicItems} size="sm" defaultValue="home" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">Medium</p>
        <Tabs items={basicItems} size="md" defaultValue="home" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-2">Large</p>
        <Tabs items={basicItems} size="lg" defaultValue="home" />
      </div>
    </div>
  ),
};

export const Vertical: Story = {
  args: {
    items: [
      { value: 'overview', label: '概览', icon: <Home className="w-4 h-4" /> },
      { value: 'analytics', label: '分析', icon: <Users className="w-4 h-4" /> },
      { value: 'reports', label: '报表', icon: <Settings className="w-4 h-4" /> },
      { value: 'help', label: '帮助', icon: <HelpCircle className="w-4 h-4" /> },
    ],
    orientation: 'vertical',
    defaultValue: 'overview',
  },
  render: (args) => (
    <div className="w-96">
      <Tabs items={args.items} orientation={args.orientation} defaultValue={args.defaultValue} children={<div className="p-4 bg-muted rounded-lg"><p className="text-sm text-muted-foreground">垂直标签页内容</p></div>} />
    </div>
  ),
};

export const FullWidth: Story = {
  args: {
    items: basicItems,
    fullWidth: true,
    defaultValue: 'home',
  },
};

export const WithTooltips: Story = {
  args: {
    items: [
      { value: 'home', label: '首页', icon: Home, tooltip: '返回首页' },
      { value: 'users', label: '用户管理', icon: Users, tooltip: '查看用户列表' },
      { value: 'settings', label: '系统设置', icon: Settings, tooltip: '配置系统参数' },
    ],
    defaultValue: 'home',
  },
};