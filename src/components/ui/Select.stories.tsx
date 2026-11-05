/**
 * Select 组件故事
 */

import type { Meta, StoryObj } from '@storybook/react';
import Select from '@/components/ui/Select';

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '下拉选择组件，支持单选、多选、搜索、分组等功能。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    placeholder: { control: 'text', description: '占位符文本' },
    disabled: { control: 'boolean', description: '是否禁用' },
    multiple: { control: 'boolean', description: '多选模式' },
    size: { control: 'select', options: ['sm', 'md', 'lg'], description: '尺寸' },
    label: { control: 'text', description: '标签' },
    hint: { control: 'text', description: '帮助文本' },
    error: { control: 'text', description: '错误提示' },
    required: { control: 'boolean', description: '是否必填' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const basicOptions = [
  { value: 'apple', label: '苹果' },
  { value: 'banana', label: '香蕉' },
  { value: 'orange', label: '橙子' },
  { value: 'grape', label: '葡萄' },
  { value: 'mango', label: '芒果' },
];

export const Default: Story = {
  args: {
    placeholder: '请选择水果',
    options: basicOptions,
  },
};

export const WithLabel: Story = {
  args: {
    label: '选择水果',
    placeholder: '请选择',
    options: basicOptions,
  },
};

export const WithDefaultValue: Story = {
  args: {
    placeholder: '请选择',
    options: basicOptions,
    defaultValue: 'apple',
  },
};

export const Disabled: Story = {
  args: {
    placeholder: '请选择',
    options: basicOptions,
    disabled: true,
  },
};

export const Multiple: Story = {
  args: {
    placeholder: '请选择（可多选）',
    options: basicOptions,
    multiple: true,
    defaultValue: ['apple', 'banana'],
  },
};

export const WithGroups: Story = {
  args: {
    placeholder: '请选择',
    options: [
      { label: '水果', options: [
        { value: 'apple', label: '苹果' },
        { value: 'banana', label: '香蕉' },
        { value: 'orange', label: '橙子' },
      ]},
      { label: '蔬菜', options: [
        { value: 'carrot', label: '胡萝卜' },
        { value: 'broccoli', label: '西兰花' },
      ]},
    ],
  },
};

export const WithSearch: Story = {
  args: {
    placeholder: '搜索选择',
    options: basicOptions,
    filter: (query: string, option: { label: string; value: string }) => option.label.includes(query) || option.value.includes(query),
    searchPlaceholder: '搜索水果...',
  },
};

export const WithError: Story = {
  args: {
    label: '选择水果',
    placeholder: '请选择',
    options: basicOptions,
    error: '请选择一个水果',
    required: true,
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="space-y-4 w-64">
      <Select size="sm" placeholder="Small" options={basicOptions} />
      <Select size="md" placeholder="Medium" options={basicOptions} />
      <Select size="lg" placeholder="Large" options={basicOptions} />
    </div>
  ),
};

export const WithHint: Story = {
  args: {
    label: '选择水果',
    hint: '请选择您最喜欢的水果',
    placeholder: '请选择',
    options: basicOptions,
  },
};