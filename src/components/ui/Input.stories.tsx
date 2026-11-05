/**
 * Input 组件故事
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Input, Textarea, Label } from '@/components/ui/Input';
import { Search, Mail, Lock, User, Calendar, DollarSign } from 'lucide-react';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '输入框组件，支持多种变体、尺寸、前后缀图标、标签、错误提示等。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['default', 'filled', 'outlined', 'ghost'], description: '变体' },
    size: { control: 'select', options: ['sm', 'md', 'lg'], description: '尺寸' },
    type: { control: 'text', description: '输入类型' },
    placeholder: { control: 'text', description: '占位符' },
    disabled: { control: 'boolean', description: '是否禁用' },
    readonly: { control: 'boolean', description: '只读' },
    required: { control: 'boolean', description: '是否必填' },
    label: { control: 'text', description: '标签' },
    hint: { control: 'text', description: '帮助文本' },
    error: { control: 'text', description: '错误提示' },
    prefix: { control: false, description: '前置元素' },
    suffix: { control: false, description: '后置元素' },
    leftIcon: { control: false, description: '前置图标' },
    rightIcon: { control: false, description: '后置图标' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: '请输入内容...',
  },
};

export const WithLabel: Story = {
  args: {
    label: '用户名',
    placeholder: '请输入用户名',
  },
};

export const WithHint: Story = {
  args: {
    label: '邮箱地址',
    placeholder: 'example@email.com',
    hint: '我们将发送验证邮件到此地址',
  },
};

export const WithError: Story = {
  args: {
    label: '邮箱地址',
    placeholder: 'example@email.com',
    value: 'invalid-email',
    error: '请输入有效的邮箱地址',
    required: true,
  },
};

export const WithLeftIcon: Story = {
  args: {
    label: '搜索',
    placeholder: '搜索...',
    leftIcon: <Search className="h-4 w-4" />,
  },
};

export const WithRightIcon: Story = {
  args: {
    label: '密码',
    type: 'password',
    placeholder: '请输入密码',
    rightIcon: <Lock className="h-4 w-4" />,
  },
};

export const WithPrefix: Story = {
  args: {
    label: '金额',
    placeholder: '0.00',
    prefix: <DollarSign className="h-4 w-4" />,
  },
};

export const WithSuffix: Story = {
  args: {
    label: '用户名',
    placeholder: 'username',
    suffix: '@company.com',
  },
};

export const Disabled: Story = {
  args: {
    label: '禁用输入框',
    placeholder: '不可编辑',
    disabled: true,
    value: '预设值',
  },
};

export const Readonly: Story = {
  args: {
    label: '只读输入框',
    value: '只读内容',
    readonly: true,
  },
};

export const Required: Story = {
  args: {
    label: '必填字段 *',
    placeholder: '请输入',
    required: true,
  },
};

export const Variants: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <Input variant="default" label="Default" placeholder="默认变体" />
      <Input variant="filled" label="Filled" placeholder="填充变体" />
      <Input variant="outlined" label="Outlined" placeholder="轮廓变体" />
      <Input variant="ghost" label="Ghost" placeholder="幽灵变体" />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4 w-80">
      <Input size="sm" label="Small" placeholder="小尺寸" />
      <Input size="md" label="Medium" placeholder="中尺寸" />
      <Input size="lg" label="Large" placeholder="大尺寸" />
    </div>
  ),
};

export const FormExample: Story = {
  render: () => (
    <form className="space-y-4 w-80">
      <Input
        label="用户名"
        placeholder="请输入用户名"
        leftIcon={<User className="h-4 w-4" />}
        required
      />
      <Input
        label="邮箱"
        type="email"
        placeholder="example@email.com"
        leftIcon={<Mail className="h-4 w-4" />}
        required
      />
      <Input
        label="密码"
        type="password"
        placeholder="请输入密码"
        leftIcon={<Lock className="h-4 w-4" />}
        required
      />
      <div className="flex gap-2 pt-2">
        <button type="submit" className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
          注册
        </button>
        <button type="button" className="flex-1 px-4 py-2 border border-input-border rounded hover:bg-accent">
          取消
        </button>
      </div>
    </form>
  ),
};

export const TextareaDefault: Story = {
  args: {
    label: '备注',
    placeholder: '请输入备注信息...',
    rows: 4,
  },
};

export const TextareaWithHint: Story = {
  args: {
    label: '个人简介',
    placeholder: '介绍一下自己...',
    hint: '最多 500 字符',
    rows: 5,
  },
};

export const TextareaWithError: Story = {
  args: {
    label: '反馈内容',
    placeholder: '请输入反馈内容',
    value: '短',
    error: '反馈内容至少需要 10 个字符',
    rows: 4,
  },
};