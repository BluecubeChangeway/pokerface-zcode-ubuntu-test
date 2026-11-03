import{j as a}from"./jsx-runtime-D_zvdyIk.js";import{B as e,P as Ha,S as Ja,D as Ka,G as Qa,a as Xa,O as Ya,b as _a}from"./Button-BW0SOSmN.js";import{T as Ra,D as N}from"./trash-2-kxIYYWi0.js";import{P as Ua,E as Za}from"./plus-DJjrY6ID.js";import{c as $a}from"./createLucideIcon-21GO6skE.js";import{S as qa}from"./search-Cp6CSaxh.js";import{S as Va}from"./settings-5Rtugbx0.js";import"./index-Dkd5gcU3.js";import"./utils-CRy61Qm3.js";/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ae=[["path",{d:"M12 3v12",key:"1x0j5s"}],["path",{d:"m17 8-5-5-5 5",key:"7q97r8"}],["path",{d:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4",key:"ih7n3h"}]],ee=$a("upload",ae),ue={title:"UI/Button",component:e,parameters:{layout:"centered",docs:{description:{component:"基础按钮组件，支持多变体、多尺寸、加载状态、图标等。"}}},tags:["autodocs"],argTypes:{variant:{control:"select",options:["primary","secondary","success","warning","danger","ghost","subtle","outline"],description:"按钮变体",table:{category:"Appearance"}},size:{control:"select",options:["sm","md","lg","xl"],description:"按钮尺寸",table:{category:"Appearance"}},disabled:{control:"boolean",description:"是否禁用",table:{category:"State"}},loading:{control:"boolean",description:"加载状态",table:{category:"State"}},fullWidth:{control:"boolean",description:"全宽显示",table:{category:"Layout"}},asChild:{control:"boolean",description:"作为子元素渲染（用于 Link 等）",table:{category:"Advanced"}},leftIcon:{control:!1,description:"前置图标",table:{category:"Content"}},rightIcon:{control:!1,description:"后置图标",table:{category:"Content"}},loadingText:{control:"text",description:"加载时文本",table:{category:"Content"}}}},r={args:{children:"主要按钮",variant:"primary"}},s={args:{children:"次要按钮",variant:"secondary"}},t={args:{children:"成功按钮",variant:"success"}},n={args:{children:"警告按钮",variant:"warning"}},o={args:{children:"危险按钮",variant:"danger"}},i={args:{children:"幽灵按钮",variant:"ghost"}},c={args:{children:"微弱按钮",variant:"subtle"}},l={args:{children:"轮廓按钮",variant:"outline"}},d={render:()=>a.jsxs("div",{className:"flex flex-wrap gap-3",children:[a.jsx(e,{variant:"primary",children:"Primary"}),a.jsx(e,{variant:"secondary",children:"Secondary"}),a.jsx(e,{variant:"success",children:"Success"}),a.jsx(e,{variant:"warning",children:"Warning"}),a.jsx(e,{variant:"danger",children:"Danger"}),a.jsx(e,{variant:"ghost",children:"Ghost"}),a.jsx(e,{variant:"subtle",children:"Subtle"}),a.jsx(e,{variant:"outline",children:"Outline"})]})},u={render:()=>a.jsxs("div",{className:"flex items-center gap-3",children:[a.jsx(e,{size:"sm",children:"Small"}),a.jsx(e,{size:"md",children:"Medium"}),a.jsx(e,{size:"lg",children:"Large"}),a.jsx(e,{size:"xl",children:"Extra Large"})]})},m={args:{children:"禁用状态",disabled:!0}},p={args:{children:"加载中...",loading:!0}},g={args:{children:"提交中",loading:!0,loadingText:"正在提交..."}},h={args:{children:"下载",leftIcon:a.jsx(N,{className:"h-4 w-4"})}},v={args:{children:"搜索",rightIcon:a.jsx(qa,{className:"h-4 w-4"})}},x={args:{children:"编辑保存",leftIcon:a.jsx(_a,{className:"h-4 w-4"}),rightIcon:a.jsx(Va,{className:"h-4 w-4"})}},B={args:{children:a.jsx(Ua,{className:"h-4 w-4"}),"aria-label":"新建",size:"sm"}},y={render:()=>a.jsxs("div",{className:"flex flex-wrap gap-3",children:[a.jsx(Ha,{children:"PrimaryButton"}),a.jsx(Ja,{children:"SecondaryButton"}),a.jsx(Ka,{children:"DangerButton"}),a.jsx(Qa,{children:"GhostButton"}),a.jsx(Xa,{children:"SubtleButton"}),a.jsx(Ya,{children:"OutlineButton"})]})},f={render:()=>a.jsxs("div",{className:"flex gap-3",children:[a.jsx(e,{variant:"secondary",children:"取消"}),a.jsx(e,{variant:"primary",leftIcon:a.jsx(N,{className:"h-4 w-4"}),children:"保存并下载"})]})},j={render:()=>a.jsxs("div",{className:"flex gap-3",children:[a.jsx(e,{variant:"ghost",children:"取消"}),a.jsx(e,{variant:"danger",leftIcon:a.jsx(Ra,{className:"h-4 w-4"}),children:"删除"})]})},S={render:()=>a.jsxs("div",{className:"flex gap-1 p-2 bg-muted rounded-lg",children:[a.jsx(e,{variant:"ghost",size:"sm",leftIcon:a.jsx(Ua,{className:"h-4 w-4"}),"aria-label":"新建"}),a.jsx(e,{variant:"ghost",size:"sm",leftIcon:a.jsx(_a,{className:"h-4 w-4"}),"aria-label":"编辑"}),a.jsx(e,{variant:"ghost",size:"sm",leftIcon:a.jsx(Za,{className:"h-4 w-4"}),"aria-label":"查看"}),a.jsx(e,{variant:"ghost",size:"sm",leftIcon:a.jsx(Ra,{className:"h-4 w-4"}),"aria-label":"删除"}),a.jsx(e,{variant:"ghost",size:"sm",leftIcon:a.jsx(N,{className:"h-4 w-4"}),"aria-label":"下载"}),a.jsx(e,{variant:"ghost",size:"sm",leftIcon:a.jsx(ee,{className:"h-4 w-4"}),"aria-label":"上传"}),a.jsx(e,{variant:"ghost",size:"sm",leftIcon:a.jsx(qa,{className:"h-4 w-4"}),"aria-label":"搜索"}),a.jsx(e,{variant:"ghost",size:"sm",leftIcon:a.jsx(Va,{className:"h-4 w-4"}),"aria-label":"设置"})]})},b={render:()=>a.jsxs("div",{className:"w-64 space-y-2",children:[a.jsx(e,{variant:"primary",fullWidth:!0,children:"全宽主要按钮"}),a.jsx(e,{variant:"secondary",fullWidth:!0,children:"全宽次要按钮"}),a.jsx(e,{variant:"outline",fullWidth:!0,children:"全宽轮廓按钮"})]})},w={render:()=>a.jsxs("div",{className:"flex flex-wrap gap-3",children:[a.jsx(e,{variant:"primary",children:"默认"}),a.jsx(e,{variant:"primary",disabled:!0,children:"禁用"}),a.jsx(e,{variant:"primary",loading:!0,children:"加载中"}),a.jsx(e,{variant:"primary",loading:!0,loadingText:"处理中...",children:"加载中（自定义文本）"})]})};var I,z,W;r.parameters={...r.parameters,docs:{...(I=r.parameters)==null?void 0:I.docs,source:{originalSource:`{
  args: {
    children: '主要按钮',
    variant: 'primary'
  }
}`,...(W=(z=r.parameters)==null?void 0:z.docs)==null?void 0:W.source}}};var D,P,T;s.parameters={...s.parameters,docs:{...(D=s.parameters)==null?void 0:D.docs,source:{originalSource:`{
  args: {
    children: '次要按钮',
    variant: 'secondary'
  }
}`,...(T=(P=s.parameters)==null?void 0:P.docs)==null?void 0:T.source}}};var A,L,O;t.parameters={...t.parameters,docs:{...(A=t.parameters)==null?void 0:A.docs,source:{originalSource:`{
  args: {
    children: '成功按钮',
    variant: 'success'
  }
}`,...(O=(L=t.parameters)==null?void 0:L.docs)==null?void 0:O.source}}};var G,E,C;n.parameters={...n.parameters,docs:{...(G=n.parameters)==null?void 0:G.docs,source:{originalSource:`{
  args: {
    children: '警告按钮',
    variant: 'warning'
  }
}`,...(C=(E=n.parameters)==null?void 0:E.docs)==null?void 0:C.source}}};var k,F,M;o.parameters={...o.parameters,docs:{...(k=o.parameters)==null?void 0:k.docs,source:{originalSource:`{
  args: {
    children: '危险按钮',
    variant: 'danger'
  }
}`,...(M=(F=o.parameters)==null?void 0:F.docs)==null?void 0:M.source}}};var _,R,U;i.parameters={...i.parameters,docs:{...(_=i.parameters)==null?void 0:_.docs,source:{originalSource:`{
  args: {
    children: '幽灵按钮',
    variant: 'ghost'
  }
}`,...(U=(R=i.parameters)==null?void 0:R.docs)==null?void 0:U.source}}};var q,V,H;c.parameters={...c.parameters,docs:{...(q=c.parameters)==null?void 0:q.docs,source:{originalSource:`{
  args: {
    children: '微弱按钮',
    variant: 'subtle'
  }
}`,...(H=(V=c.parameters)==null?void 0:V.docs)==null?void 0:H.source}}};var J,K,Q;l.parameters={...l.parameters,docs:{...(J=l.parameters)==null?void 0:J.docs,source:{originalSource:`{
  args: {
    children: '轮廓按钮',
    variant: 'outline'
  }
}`,...(Q=(K=l.parameters)==null?void 0:K.docs)==null?void 0:Q.source}}};var X,Y,Z;d.parameters={...d.parameters,docs:{...(X=d.parameters)==null?void 0:X.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="success">Success</Button>
      <Button variant="warning">Warning</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="subtle">Subtle</Button>
      <Button variant="outline">Outline</Button>
    </div>
}`,...(Z=(Y=d.parameters)==null?void 0:Y.docs)==null?void 0:Z.source}}};var $,aa,ea;u.parameters={...u.parameters,docs:{...($=u.parameters)==null?void 0:$.docs,source:{originalSource:`{
  render: () => <div className="flex items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </div>
}`,...(ea=(aa=u.parameters)==null?void 0:aa.docs)==null?void 0:ea.source}}};var ra,sa,ta;m.parameters={...m.parameters,docs:{...(ra=m.parameters)==null?void 0:ra.docs,source:{originalSource:`{
  args: {
    children: '禁用状态',
    disabled: true
  }
}`,...(ta=(sa=m.parameters)==null?void 0:sa.docs)==null?void 0:ta.source}}};var na,oa,ia;p.parameters={...p.parameters,docs:{...(na=p.parameters)==null?void 0:na.docs,source:{originalSource:`{
  args: {
    children: '加载中...',
    loading: true
  }
}`,...(ia=(oa=p.parameters)==null?void 0:oa.docs)==null?void 0:ia.source}}};var ca,la,da;g.parameters={...g.parameters,docs:{...(ca=g.parameters)==null?void 0:ca.docs,source:{originalSource:`{
  args: {
    children: '提交中',
    loading: true,
    loadingText: '正在提交...'
  }
}`,...(da=(la=g.parameters)==null?void 0:la.docs)==null?void 0:da.source}}};var ua,ma,pa;h.parameters={...h.parameters,docs:{...(ua=h.parameters)==null?void 0:ua.docs,source:{originalSource:`{
  args: {
    children: '下载',
    leftIcon: <Download className="h-4 w-4" />
  }
}`,...(pa=(ma=h.parameters)==null?void 0:ma.docs)==null?void 0:pa.source}}};var ga,ha,va;v.parameters={...v.parameters,docs:{...(ga=v.parameters)==null?void 0:ga.docs,source:{originalSource:`{
  args: {
    children: '搜索',
    rightIcon: <Search className="h-4 w-4" />
  }
}`,...(va=(ha=v.parameters)==null?void 0:ha.docs)==null?void 0:va.source}}};var xa,Ba,ya;x.parameters={...x.parameters,docs:{...(xa=x.parameters)==null?void 0:xa.docs,source:{originalSource:`{
  args: {
    children: '编辑保存',
    leftIcon: <Edit className="h-4 w-4" />,
    rightIcon: <Settings className="h-4 w-4" />
  }
}`,...(ya=(Ba=x.parameters)==null?void 0:Ba.docs)==null?void 0:ya.source}}};var fa,ja,Sa;B.parameters={...B.parameters,docs:{...(fa=B.parameters)==null?void 0:fa.docs,source:{originalSource:`{
  args: {
    children: <Plus className="h-4 w-4" />,
    'aria-label': '新建',
    size: 'sm'
  }
}`,...(Sa=(ja=B.parameters)==null?void 0:ja.docs)==null?void 0:Sa.source}}};var ba,wa,Na;y.parameters={...y.parameters,docs:{...(ba=y.parameters)==null?void 0:ba.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-3">
      <PrimaryButton>PrimaryButton</PrimaryButton>
      <SecondaryButton>SecondaryButton</SecondaryButton>
      <DangerButton>DangerButton</DangerButton>
      <GhostButton>GhostButton</GhostButton>
      <SubtleButton>SubtleButton</SubtleButton>
      <OutlineButton>OutlineButton</OutlineButton>
    </div>
}`,...(Na=(wa=y.parameters)==null?void 0:wa.docs)==null?void 0:Na.source}}};var Ia,za,Wa;f.parameters={...f.parameters,docs:{...(Ia=f.parameters)==null?void 0:Ia.docs,source:{originalSource:`{
  render: () => <div className="flex gap-3">
      <Button variant="secondary">取消</Button>
      <Button variant="primary" leftIcon={<Download className="h-4 w-4" />}>
        保存并下载
      </Button>
    </div>
}`,...(Wa=(za=f.parameters)==null?void 0:za.docs)==null?void 0:Wa.source}}};var Da,Pa,Ta;j.parameters={...j.parameters,docs:{...(Da=j.parameters)==null?void 0:Da.docs,source:{originalSource:`{
  render: () => <div className="flex gap-3">
      <Button variant="ghost">取消</Button>
      <Button variant="danger" leftIcon={<Trash2 className="h-4 w-4" />}>
        删除
      </Button>
    </div>
}`,...(Ta=(Pa=j.parameters)==null?void 0:Pa.docs)==null?void 0:Ta.source}}};var Aa,La,Oa;S.parameters={...S.parameters,docs:{...(Aa=S.parameters)==null?void 0:Aa.docs,source:{originalSource:`{
  render: () => <div className="flex gap-1 p-2 bg-muted rounded-lg">
      <Button variant="ghost" size="sm" leftIcon={<Plus className="h-4 w-4" />} aria-label="新建" />
      <Button variant="ghost" size="sm" leftIcon={<Edit className="h-4 w-4" />} aria-label="编辑" />
      <Button variant="ghost" size="sm" leftIcon={<Eye className="h-4 w-4" />} aria-label="查看" />
      <Button variant="ghost" size="sm" leftIcon={<Trash2 className="h-4 w-4" />} aria-label="删除" />
      <Button variant="ghost" size="sm" leftIcon={<Download className="h-4 w-4" />} aria-label="下载" />
      <Button variant="ghost" size="sm" leftIcon={<Upload className="h-4 w-4" />} aria-label="上传" />
      <Button variant="ghost" size="sm" leftIcon={<Search className="h-4 w-4" />} aria-label="搜索" />
      <Button variant="ghost" size="sm" leftIcon={<Settings className="h-4 w-4" />} aria-label="设置" />
    </div>
}`,...(Oa=(La=S.parameters)==null?void 0:La.docs)==null?void 0:Oa.source}}};var Ga,Ea,Ca;b.parameters={...b.parameters,docs:{...(Ga=b.parameters)==null?void 0:Ga.docs,source:{originalSource:`{
  render: () => <div className="w-64 space-y-2">
      <Button variant="primary" fullWidth>全宽主要按钮</Button>
      <Button variant="secondary" fullWidth>全宽次要按钮</Button>
      <Button variant="outline" fullWidth>全宽轮廓按钮</Button>
    </div>
}`,...(Ca=(Ea=b.parameters)==null?void 0:Ea.docs)==null?void 0:Ca.source}}};var ka,Fa,Ma;w.parameters={...w.parameters,docs:{...(ka=w.parameters)==null?void 0:ka.docs,source:{originalSource:`{
  render: () => <div className="flex flex-wrap gap-3">
      <Button variant="primary">默认</Button>
      <Button variant="primary" disabled>禁用</Button>
      <Button variant="primary" loading>加载中</Button>
      <Button variant="primary" loading loadingText="处理中...">加载中（自定义文本）</Button>
    </div>
}`,...(Ma=(Fa=w.parameters)==null?void 0:Fa.docs)==null?void 0:Ma.source}}};const me=["Primary","Secondary","Success","Warning","Danger","Ghost","Subtle","Outline","AllVariants","AllSizes","Disabled","Loading","LoadingWithText","WithLeftIcon","WithRightIcon","WithBothIcons","IconOnly","PresetComponents","FormActions","DangerActions","ToolbarActions","FullWidthButtons","InteractiveStates"];export{u as AllSizes,d as AllVariants,o as Danger,j as DangerActions,m as Disabled,f as FormActions,b as FullWidthButtons,i as Ghost,B as IconOnly,w as InteractiveStates,p as Loading,g as LoadingWithText,l as Outline,y as PresetComponents,r as Primary,s as Secondary,c as Subtle,t as Success,S as ToolbarActions,n as Warning,x as WithBothIcons,h as WithLeftIcon,v as WithRightIcon,me as __namedExportsOrder,ue as default};
