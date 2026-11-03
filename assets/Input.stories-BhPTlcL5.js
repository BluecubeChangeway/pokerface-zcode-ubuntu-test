import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r as s}from"./index-Dkd5gcU3.js";import{S as K,c as N}from"./utils-CRy61Qm3.js";import{c as Q}from"./createLucideIcon-21GO6skE.js";import{M as Ze}from"./mail-DD-zgKBt.js";import{S as Be}from"./search-Cp6CSaxh.js";/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const er=[["line",{x1:"12",x2:"12",y1:"2",y2:"22",key:"7eqyqh"}],["path",{d:"M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",key:"1b0p4s"}]],rr=Q("dollar-sign",er);/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ar=[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]],Ke=Q("lock",ar);/**
 * @license lucide-react v0.542.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const sr=[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]],or=Q("user",sr),Qe={default:["bg-input-bg border border-input-border","placeholder:text-input-placeholder","focus:border-input-focus-border focus:ring-2 focus:ring-input-focus-ring","disabled:bg-disabled-bg disabled:text-disabled-text disabled:border-disabled-border disabled:cursor-not-allowed"],filled:["bg-accent border-none","placeholder:text-input-placeholder","focus:ring-2 focus:ring-input-focus-ring","disabled:bg-disabled-bg disabled:text-disabled-text disabled:cursor-not-allowed"],outlined:["bg-transparent border-2 border-input-border","placeholder:text-input-placeholder","focus:border-input-focus-border focus:ring-2 focus:ring-input-focus-ring","disabled:border-disabled-border disabled:text-disabled-text disabled:cursor-not-allowed"],ghost:["bg-transparent border-none border-b border-input-border rounded-none","placeholder:text-input-placeholder","focus:border-input-focus-border focus:ring-0","disabled:border-disabled-border disabled:text-disabled-text disabled:cursor-not-allowed"]},tr={sm:"h-8 px-3 text-xs gap-1.5",md:"h-10 px-3 text-sm gap-2",lg:"h-12 px-4 text-base gap-2.5"},X=s.forwardRef(({className:n,required:l=!1,asChild:a=!1,children:r,...t},c)=>{const i=a?K:"label";return e.jsxs(i,{ref:c,className:N("block text-sm font-medium text-foreground mb-1.5",n),...t,children:[r,l&&e.jsx("span",{className:"text-danger ml-0.5","aria-hidden":"true",children:"*"})]})});X.displayName="Label";const o=s.forwardRef(({className:n,type:l="text",label:a,hint:r,error:t,variant:c="default",size:i="md",prefix:u,suffix:m,leftIcon:p,rightIcon:b,required:h=!1,asChild:x=!1,id:C,disabled:U,readonly:A,"aria-describedby":f,"aria-invalid":P,"aria-required":w,...g},y)=>{const $=s.useId(),j=C||$,d=s.useId(),J=s.useId(),Xe=s.useMemo(()=>{const v=[];return t&&v.push(d),r&&!t&&v.push(J),f&&v.push(f),v.length>0?v.join(" "):void 0},[t,r,d,J,f]),Ye=x?K:"input";return e.jsxs("div",{className:"w-full",children:[a&&e.jsx(X,{htmlFor:j,required:h,className:"mb-1.5",children:a}),e.jsxs("div",{className:"relative flex items-center",children:[u&&e.jsx("span",{className:"absolute left-3 text-muted-foreground pointer-events-none flex items-center",children:u}),p&&e.jsx("span",{className:"absolute left-3 text-muted-foreground pointer-events-none flex items-center",children:p}),e.jsx(Ye,{ref:y,id:j,type:l,className:N("w-full outline-none transition-all duration-fast ease-standard","rounded-lg",Qe[c],tr[i],(u||p)&&"pl-10",(m||b)&&"pr-10",n),disabled:U,readOnly:A,required:h,"aria-invalid":t?"true":P,"aria-required":h?"true":w,"aria-describedby":Xe,...g}),m&&e.jsx("span",{className:"absolute right-3 text-muted-foreground pointer-events-none flex items-center",children:m}),b&&e.jsx("span",{className:"absolute right-3 text-muted-foreground pointer-events-none flex items-center",children:b})]}),t&&e.jsx("p",{id:d,className:"mt-1.5 text-sm text-danger",role:"alert",children:t}),r&&!t&&e.jsx("p",{id:J,className:"mt-1.5 text-sm text-muted-foreground",children:r})]})});o.displayName="Input";const V=s.forwardRef(({className:n,label:l,hint:a,error:r,variant:t="default",size:c="md",required:i=!1,asChild:u=!1,id:m,disabled:p,readonly:b,rows:h=3,"aria-describedby":x,"aria-invalid":C,"aria-required":U,...A},f)=>{const P=s.useId(),w=m||P,g=s.useId(),y=s.useId(),$=s.useMemo(()=>{const d=[];return r&&d.push(g),a&&!r&&d.push(y),x&&d.push(x),d.length>0?d.join(" "):void 0},[r,a,g,y,x]),j=u?K:"textarea";return e.jsxs("div",{className:"w-full",children:[l&&e.jsx(X,{htmlFor:w,required:i,className:"mb-1.5",children:l}),e.jsx(j,{ref:f,id:w,className:N("w-full outline-none transition-all duration-fast ease-standard resize-none","rounded-lg p-3",Qe[t],c==="sm"&&"text-xs",c==="md"&&"text-sm",c==="lg"&&"text-base",p&&"disabled:bg-disabled-bg disabled:text-disabled-text disabled:border-disabled-border disabled:cursor-not-allowed",n),disabled:p,readOnly:b,required:i,rows:h,"aria-invalid":r?"true":C,"aria-required":i?"true":U,"aria-describedby":$,...A}),r&&e.jsx("p",{id:g,className:"mt-1.5 text-sm text-danger",role:"alert",children:r}),a&&!r&&e.jsx("p",{id:y,className:"mt-1.5 text-sm text-muted-foreground",children:a})]})});V.displayName="Textarea";const lr=s.forwardRef(({className:n,children:l,...a},r)=>e.jsx("div",{ref:r,className:N("flex w-full items-center",n),...a,children:l}));lr.displayName="InputGroup";const nr=s.forwardRef(({className:n,children:l,...a},r)=>e.jsx("div",{ref:r,className:N("flex items-center px-3 text-sm text-muted-foreground bg-accent border border-border","first:rounded-r-none last:rounded-l-none",n),...a,children:l}));nr.displayName="InputGroupAddon";const br={title:"UI/Input",component:o,parameters:{layout:"centered",docs:{description:{component:"输入框组件，支持多种变体、尺寸、前后缀图标、标签、错误提示等。"}}},tags:["autodocs"],argTypes:{variant:{control:"select",options:["default","filled","outlined","ghost"],description:"变体"},size:{control:"select",options:["sm","md","lg"],description:"尺寸"},type:{control:"text",description:"输入类型"},placeholder:{control:"text",description:"占位符"},disabled:{control:"boolean",description:"是否禁用"},readonly:{control:"boolean",description:"只读"},required:{control:"boolean",description:"是否必填"},label:{control:"text",description:"标签"},hint:{control:"text",description:"帮助文本"},error:{control:"text",description:"错误提示"},prefix:{control:!1,description:"前置元素"},suffix:{control:!1,description:"后置元素"},leftIcon:{control:!1,description:"前置图标"},rightIcon:{control:!1,description:"后置图标"}}},I={args:{placeholder:"请输入内容..."}},S={args:{label:"用户名",placeholder:"请输入用户名"}},W={args:{label:"邮箱地址",placeholder:"example@email.com",hint:"我们将发送验证邮件到此地址"}},q={args:{label:"邮箱地址",placeholder:"example@email.com",value:"invalid-email",error:"请输入有效的邮箱地址",required:!0}},k={args:{label:"搜索",placeholder:"搜索...",leftIcon:e.jsx(Be,{className:"h-4 w-4"})}},L={args:{label:"密码",type:"password",placeholder:"请输入密码",rightIcon:e.jsx(Ke,{className:"h-4 w-4"})}},R={args:{label:"金额",placeholder:"0.00",prefix:e.jsx(rr,{className:"h-4 w-4"})}},T={args:{label:"用户名",placeholder:"username",suffix:"@company.com"}},z={args:{label:"禁用输入框",placeholder:"不可编辑",disabled:!0,value:"预设值"}},M={args:{label:"只读输入框",value:"只读内容",readonly:!0}},E={args:{label:"必填字段 *",placeholder:"请输入",required:!0}},_={render:()=>e.jsxs("div",{className:"space-y-4 w-80",children:[e.jsx(o,{variant:"default",label:"Default",placeholder:"默认变体"}),e.jsx(o,{variant:"filled",label:"Filled",placeholder:"填充变体"}),e.jsx(o,{variant:"outlined",label:"Outlined",placeholder:"轮廓变体"}),e.jsx(o,{variant:"ghost",label:"Ghost",placeholder:"幽灵变体"})]})},H={render:()=>e.jsxs("div",{className:"space-y-4 w-80",children:[e.jsx(o,{size:"sm",label:"Small",placeholder:"小尺寸"}),e.jsx(o,{size:"md",label:"Medium",placeholder:"中尺寸"}),e.jsx(o,{size:"lg",label:"Large",placeholder:"大尺寸"})]})},D={render:()=>e.jsxs("form",{className:"space-y-4 w-80",children:[e.jsx(o,{label:"用户名",placeholder:"请输入用户名",leftIcon:e.jsx(or,{className:"h-4 w-4"}),required:!0}),e.jsx(o,{label:"邮箱",type:"email",placeholder:"example@email.com",leftIcon:e.jsx(Ze,{className:"h-4 w-4"}),required:!0}),e.jsx(o,{label:"密码",type:"password",placeholder:"请输入密码",leftIcon:e.jsx(Ke,{className:"h-4 w-4"}),required:!0}),e.jsxs("div",{className:"flex gap-2 pt-2",children:[e.jsx("button",{type:"submit",className:"flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90",children:"注册"}),e.jsx("button",{type:"button",className:"flex-1 px-4 py-2 border border-input-border rounded hover:bg-accent",children:"取消"})]})]})},F={args:{label:"备注",placeholder:"请输入备注信息...",rows:4},component:V},G={args:{label:"个人简介",placeholder:"介绍一下自己...",hint:"最多 500 字符",rows:5},component:V},O={args:{label:"反馈内容",placeholder:"请输入反馈内容",value:"短",error:"反馈内容至少需要 10 个字符",rows:4},component:V};var Y,Z,B;I.parameters={...I.parameters,docs:{...(Y=I.parameters)==null?void 0:Y.docs,source:{originalSource:`{
  args: {
    placeholder: '请输入内容...'
  }
}`,...(B=(Z=I.parameters)==null?void 0:Z.docs)==null?void 0:B.source}}};var ee,re,ae;S.parameters={...S.parameters,docs:{...(ee=S.parameters)==null?void 0:ee.docs,source:{originalSource:`{
  args: {
    label: '用户名',
    placeholder: '请输入用户名'
  }
}`,...(ae=(re=S.parameters)==null?void 0:re.docs)==null?void 0:ae.source}}};var se,oe,te;W.parameters={...W.parameters,docs:{...(se=W.parameters)==null?void 0:se.docs,source:{originalSource:`{
  args: {
    label: '邮箱地址',
    placeholder: 'example@email.com',
    hint: '我们将发送验证邮件到此地址'
  }
}`,...(te=(oe=W.parameters)==null?void 0:oe.docs)==null?void 0:te.source}}};var le,ne,de;q.parameters={...q.parameters,docs:{...(le=q.parameters)==null?void 0:le.docs,source:{originalSource:`{
  args: {
    label: '邮箱地址',
    placeholder: 'example@email.com',
    value: 'invalid-email',
    error: '请输入有效的邮箱地址',
    required: true
  }
}`,...(de=(ne=q.parameters)==null?void 0:ne.docs)==null?void 0:de.source}}};var ce,ie,pe;k.parameters={...k.parameters,docs:{...(ce=k.parameters)==null?void 0:ce.docs,source:{originalSource:`{
  args: {
    label: '搜索',
    placeholder: '搜索...',
    leftIcon: <Search className="h-4 w-4" />
  }
}`,...(pe=(ie=k.parameters)==null?void 0:ie.docs)==null?void 0:pe.source}}};var ue,me,be;L.parameters={...L.parameters,docs:{...(ue=L.parameters)==null?void 0:ue.docs,source:{originalSource:`{
  args: {
    label: '密码',
    type: 'password',
    placeholder: '请输入密码',
    rightIcon: <Lock className="h-4 w-4" />
  }
}`,...(be=(me=L.parameters)==null?void 0:me.docs)==null?void 0:be.source}}};var he,xe,fe;R.parameters={...R.parameters,docs:{...(he=R.parameters)==null?void 0:he.docs,source:{originalSource:`{
  args: {
    label: '金额',
    placeholder: '0.00',
    prefix: <DollarSign className="h-4 w-4" />
  }
}`,...(fe=(xe=R.parameters)==null?void 0:xe.docs)==null?void 0:fe.source}}};var ge,ye,ve;T.parameters={...T.parameters,docs:{...(ge=T.parameters)==null?void 0:ge.docs,source:{originalSource:`{
  args: {
    label: '用户名',
    placeholder: 'username',
    suffix: '@company.com'
  }
}`,...(ve=(ye=T.parameters)==null?void 0:ye.docs)==null?void 0:ve.source}}};var Ne,we,je;z.parameters={...z.parameters,docs:{...(Ne=z.parameters)==null?void 0:Ne.docs,source:{originalSource:`{
  args: {
    label: '禁用输入框',
    placeholder: '不可编辑',
    disabled: true,
    value: '预设值'
  }
}`,...(je=(we=z.parameters)==null?void 0:we.docs)==null?void 0:je.source}}};var Ie,Se,We;M.parameters={...M.parameters,docs:{...(Ie=M.parameters)==null?void 0:Ie.docs,source:{originalSource:`{
  args: {
    label: '只读输入框',
    value: '只读内容',
    readonly: true
  }
}`,...(We=(Se=M.parameters)==null?void 0:Se.docs)==null?void 0:We.source}}};var qe,ke,Le;E.parameters={...E.parameters,docs:{...(qe=E.parameters)==null?void 0:qe.docs,source:{originalSource:`{
  args: {
    label: '必填字段 *',
    placeholder: '请输入',
    required: true
  }
}`,...(Le=(ke=E.parameters)==null?void 0:ke.docs)==null?void 0:Le.source}}};var Re,Te,ze;_.parameters={..._.parameters,docs:{...(Re=_.parameters)==null?void 0:Re.docs,source:{originalSource:`{
  render: () => <div className="space-y-4 w-80">
      <Input variant="default" label="Default" placeholder="默认变体" />
      <Input variant="filled" label="Filled" placeholder="填充变体" />
      <Input variant="outlined" label="Outlined" placeholder="轮廓变体" />
      <Input variant="ghost" label="Ghost" placeholder="幽灵变体" />
    </div>
}`,...(ze=(Te=_.parameters)==null?void 0:Te.docs)==null?void 0:ze.source}}};var Me,Ee,_e;H.parameters={...H.parameters,docs:{...(Me=H.parameters)==null?void 0:Me.docs,source:{originalSource:`{
  render: () => <div className="space-y-4 w-80">
      <Input size="sm" label="Small" placeholder="小尺寸" />
      <Input size="md" label="Medium" placeholder="中尺寸" />
      <Input size="lg" label="Large" placeholder="大尺寸" />
    </div>
}`,...(_e=(Ee=H.parameters)==null?void 0:Ee.docs)==null?void 0:_e.source}}};var He,De,Fe;D.parameters={...D.parameters,docs:{...(He=D.parameters)==null?void 0:He.docs,source:{originalSource:`{
  render: () => <form className="space-y-4 w-80">
      <Input label="用户名" placeholder="请输入用户名" leftIcon={<User className="h-4 w-4" />} required />
      <Input label="邮箱" type="email" placeholder="example@email.com" leftIcon={<Mail className="h-4 w-4" />} required />
      <Input label="密码" type="password" placeholder="请输入密码" leftIcon={<Lock className="h-4 w-4" />} required />
      <div className="flex gap-2 pt-2">
        <button type="submit" className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
          注册
        </button>
        <button type="button" className="flex-1 px-4 py-2 border border-input-border rounded hover:bg-accent">
          取消
        </button>
      </div>
    </form>
}`,...(Fe=(De=D.parameters)==null?void 0:De.docs)==null?void 0:Fe.source}}};var Ge,Oe,Ve;F.parameters={...F.parameters,docs:{...(Ge=F.parameters)==null?void 0:Ge.docs,source:{originalSource:`{
  args: {
    label: '备注',
    placeholder: '请输入备注信息...',
    rows: 4
  },
  component: Textarea
}`,...(Ve=(Oe=F.parameters)==null?void 0:Oe.docs)==null?void 0:Ve.source}}};var Ce,Ue,Ae;G.parameters={...G.parameters,docs:{...(Ce=G.parameters)==null?void 0:Ce.docs,source:{originalSource:`{
  args: {
    label: '个人简介',
    placeholder: '介绍一下自己...',
    hint: '最多 500 字符',
    rows: 5
  },
  component: Textarea
}`,...(Ae=(Ue=G.parameters)==null?void 0:Ue.docs)==null?void 0:Ae.source}}};var Pe,$e,Je;O.parameters={...O.parameters,docs:{...(Pe=O.parameters)==null?void 0:Pe.docs,source:{originalSource:`{
  args: {
    label: '反馈内容',
    placeholder: '请输入反馈内容',
    value: '短',
    error: '反馈内容至少需要 10 个字符',
    rows: 4
  },
  component: Textarea
}`,...(Je=($e=O.parameters)==null?void 0:$e.docs)==null?void 0:Je.source}}};const hr=["Default","WithLabel","WithHint","WithError","WithLeftIcon","WithRightIcon","WithPrefix","WithSuffix","Disabled","Readonly","Required","Variants","Sizes","FormExample","TextareaDefault","TextareaWithHint","TextareaWithError"];export{I as Default,z as Disabled,D as FormExample,M as Readonly,E as Required,H as Sizes,F as TextareaDefault,O as TextareaWithError,G as TextareaWithHint,_ as Variants,q as WithError,W as WithHint,S as WithLabel,k as WithLeftIcon,R as WithPrefix,L as WithRightIcon,T as WithSuffix,hr as __namedExportsOrder,br as default};
