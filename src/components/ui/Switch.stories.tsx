/**
 * Switch 组件故事
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Switch } from '@/components/ui/Switch';

const meta: Meta<typeof Switch> = {
  title: 'UI/Switch',
  component: Switch,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '开关组件，用于切换开/关状态。支持标签、描述、错误状态等。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    checked: { control: 'boolean', description: '选中状态（受控）' },
    defaultChecked: { control: 'boolean', description: '默认选中（非受控）' },
    disabled: { control: 'boolean', description: '是否禁用' },
    required: { control: 'boolean', description: '是否必填' },
    size: { control: 'select', options: ['sm', 'md', 'lg'], description: '尺寸' },
    label: { control: 'text', description: '标签文本' },
    description: { control: 'text', description: '描述文本' },
    error: { control: 'text', description: '错误提示' },
    labelPosition: { control: 'select', options: ['left', 'right'], description: '标签位置' },
    storageKey: { control: 'text', description: '持久化存储键名' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: '开启通知',
  },
};

export const Checked: Story = {
  args: {
    label: '开启通知',
    defaultChecked: true,
  },
};

export const Disabled: Story = {
  args: {
    label: '开启通知（禁用）',
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    label: '开启通知（禁用-开启）',
    disabled: true,
    defaultChecked: true,
  },
};

export const WithDescription: Story = {
  args: {
    label: '邮件通知',
    description: '接收重要邮件和系统通知',
  },
};

export const WithError: Story = {
  args: {
    label: '必须同意条款',
    error: '请先阅读并同意服务条款',
    required: true,
  },
};

export const LabelOnLeft: Story = {
  args: {
    label: '开启通知',
    labelPosition: 'left',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <Switch size="sm" label="Small 开关" />
      <Switch size="md" label="Medium 开关" />
      <Switch size="lg" label="Large 开关" />
    </div>
  ),
};

export const AllSizesChecked: Story = {
  render: () => (
    <div className="space-y-4">
      <Switch size="sm" label="Small 开启" defaultChecked />
      <Switch size="md" label="Medium 开启" defaultChecked />
      <Switch size="lg" label="Large 开启" defaultChecked />
    </div>
  ),
};

export const MultipleSwitches: Story = {
  render: () => (
    <div className="space-y-4 w-64">
      <Switch label="邮件通知" description="接收产品更新和优惠信息" defaultChecked />
      <Switch label="推送通知" description="在浏览器中接收实时推送" />
      <Switch label="短信通知" description="通过短信接收重要提醒" disabled />
      <Switch label="周报" description="每周发送一次活动摘要" defaultChecked />
    </div>
  ),
};

export const Required: Story = {
  args: {
    label: '我同意服务条款',
    required: true,
    description: '请阅读并同意我们的服务条款和隐私政策',
  },
};

export const Controlled: Story = {
  render: () => {
    const [checked, setChecked] = React.useState(true);
    return (
      <div className="space-y-4">
        <Switch
          label="受控模式开关"
          checked={checked}
          onCheckedChange={setChecked}
        />
        <p className="text-sm text-muted-foreground">
          当前状态: {checked ? '开启' : '关闭'}
        </p>
        <button
          onClick={() => setChecked(!checked)}
          className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          切换状态
        </button>
      </div>
    );
  },
};