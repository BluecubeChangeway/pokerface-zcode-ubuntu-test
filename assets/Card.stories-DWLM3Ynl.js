import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r as c}from"./index-Dkd5gcU3.js";import{S as m,c as u}from"./utils-CRy61Qm3.js";import{B as i,b as re}from"./Button-BW0SOSmN.js";import{E as Z}from"./ellipsis-DYbXsnve.js";import{E as ne,P as z}from"./plus-DJjrY6ID.js";import"./createLucideIcon-21GO6skE.js";const te={default:"bg-card border border-card-border shadow-card",bordered:"bg-card border border-card-border",elevated:"bg-card border border-card-border shadow-card-hover",outlined:"bg-transparent border-2 border-border",ghost:"bg-transparent border-none"},de={none:"",sm:"p-3",md:"p-4",lg:"p-6"},D=c.forwardRef(({className:n,variant:t="default",hoverable:a=!1,clickable:d=!1,asChild:l=!1,padding:o="md",children:T,...ee},ae)=>{const se=l?m:"div";return e.jsx(se,{ref:ae,className:u("rounded-xl transition-all duration-fast ease-standard",te[t],de[o],a&&"hover:shadow-card-hover hover:-translate-y-0.5",d&&"cursor-pointer active:scale-[0.99]",n),...ee,children:T})});D.displayName="Card";const p=c.forwardRef(({className:n,asChild:t=!1,children:a,...d},l)=>{const o=t?m:"div";return e.jsx(o,{ref:l,className:u("flex flex-col space-y-1.5",n),...d,children:a})});p.displayName="CardHeader";const x=c.forwardRef(({className:n,asChild:t=!1,size:a="md",children:d,...l},o)=>{const T=t?m:"h3";return e.jsx(T,{ref:o,className:u("font-semibold leading-tight truncate",a==="sm"&&"text-sm",a==="md"&&"text-base",a==="lg"&&"text-lg",n),...l,children:d})});x.displayName="CardTitle";const f=c.forwardRef(({className:n,asChild:t=!1,children:a,...d},l)=>{const o=t?m:"p";return e.jsx(o,{ref:l,className:u("text-sm text-muted-foreground",n),...d,children:a})});f.displayName="CardDescription";const s=c.forwardRef(({className:n,asChild:t=!1,children:a,...d},l)=>{const o=t?m:"div";return e.jsx(o,{ref:l,className:u("pt-0",n),...d,children:a})});s.displayName="CardContent";const C=c.forwardRef(({className:n,asChild:t=!1,children:a,...d},l)=>{const o=t?m:"div";return e.jsx(o,{ref:l,className:u("flex items-center gap-2 pt-4",n),...d,children:a})});C.displayName="CardFooter";const B=c.forwardRef(({className:n,asChild:t=!1,children:a,...d},l)=>{const o=t?m:"div";return e.jsx(o,{ref:l,className:u("flex items-center gap-1.5",n),...d,children:a})});B.displayName="CardAction";const r=D;p.__docgenInfo={description:"",methods:[],displayName:"CardHeader",props:{asChild:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}}}};x.__docgenInfo={description:"",methods:[],displayName:"CardTitle",props:{asChild:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}},size:{required:!1,tsType:{name:"union",raw:"'sm' | 'md' | 'lg'",elements:[{name:"literal",value:"'sm'"},{name:"literal",value:"'md'"},{name:"literal",value:"'lg'"}]},description:"",defaultValue:{value:"'md'",computed:!1}}}};f.__docgenInfo={description:"",methods:[],displayName:"CardDescription",props:{asChild:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}}}};s.__docgenInfo={description:"",methods:[],displayName:"CardContent",props:{asChild:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}}}};C.__docgenInfo={description:"",methods:[],displayName:"CardFooter",props:{asChild:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}}}};B.__docgenInfo={description:"",methods:[],displayName:"CardAction",props:{asChild:{required:!1,tsType:{name:"boolean"},description:"",defaultValue:{value:"false",computed:!1}}}};D.__docgenInfo={description:"",methods:[],displayName:"Card",props:{variant:{required:!1,tsType:{name:"union",raw:"'default' | 'bordered' | 'elevated' | 'outlined' | 'ghost'",elements:[{name:"literal",value:"'default'"},{name:"literal",value:"'bordered'"},{name:"literal",value:"'elevated'"},{name:"literal",value:"'outlined'"},{name:"literal",value:"'ghost'"}]},description:"变体",defaultValue:{value:"'default'",computed:!1}},hoverable:{required:!1,tsType:{name:"boolean"},description:"是否可悬浮",defaultValue:{value:"false",computed:!1}},clickable:{required:!1,tsType:{name:"boolean"},description:"是否可点击",defaultValue:{value:"false",computed:!1}},asChild:{required:!1,tsType:{name:"boolean"},description:"作为子元素渲染",defaultValue:{value:"false",computed:!1}},padding:{required:!1,tsType:{name:"union",raw:"'none' | 'sm' | 'md' | 'lg'",elements:[{name:"literal",value:"'none'"},{name:"literal",value:"'sm'"},{name:"literal",value:"'md'"},{name:"literal",value:"'lg'"}]},description:"内边距大小",defaultValue:{value:"'md'",computed:!1}}}};const fe={title:"UI/Card",component:r,parameters:{layout:"centered",docs:{description:{component:"卡片组件族，包含 Header、Title、Description、Content、Footer、Action 等子组件。"}}},tags:["autodocs"],argTypes:{variant:{control:"select",options:["default","bordered","elevated","outlined","ghost"],description:"卡片变体",table:{category:"Appearance"}},padding:{control:"select",options:["none","sm","md","lg"],description:"内边距大小",table:{category:"Layout"}},hoverable:{control:"boolean",description:"悬浮效果",table:{category:"Interaction"}},clickable:{control:"boolean",description:"可点击样式",table:{category:"Interaction"}}}},h={render:()=>e.jsxs(r,{className:"w-80",children:[e.jsxs(p,{children:[e.jsx(x,{children:"卡片标题"}),e.jsx(f,{children:"这是一段卡片描述文本，用于补充说明卡片的主要内容。"})]}),e.jsx(s,{children:e.jsx("p",{className:"text-sm text-muted-foreground",children:"卡片主体内容区域。可以放置任何内容，如表单、列表、图表等。"})}),e.jsxs(C,{children:[e.jsx(i,{variant:"secondary",size:"sm",children:"取消"}),e.jsx(i,{variant:"primary",size:"sm",children:"确认"})]})]})},v={render:()=>e.jsxs("div",{className:"grid grid-cols-2 gap-4 w-full max-w-4xl",children:[e.jsx(r,{variant:"default",className:"h-48",children:e.jsx(s,{className:"flex items-center justify-center",children:e.jsx("span",{className:"font-medium",children:"Default"})})}),e.jsx(r,{variant:"bordered",className:"h-48",children:e.jsx(s,{className:"flex items-center justify-center",children:e.jsx("span",{className:"font-medium",children:"Bordered"})})}),e.jsx(r,{variant:"elevated",className:"h-48",children:e.jsx(s,{className:"flex items-center justify-center",children:e.jsx("span",{className:"font-medium",children:"Elevated"})})}),e.jsx(r,{variant:"outlined",className:"h-48",children:e.jsx(s,{className:"flex items-center justify-center",children:e.jsx("span",{className:"font-medium",children:"Outlined"})})}),e.jsx(r,{variant:"ghost",className:"h-48",children:e.jsx(s,{className:"flex items-center justify-center",children:e.jsx("span",{className:"font-medium",children:"Ghost"})})})]})},g={render:()=>e.jsxs(r,{className:"w-80",children:[e.jsxs(p,{children:[e.jsx(x,{children:"带操作按钮的卡片"}),e.jsx(f,{children:"右上角可放置操作按钮"}),e.jsx(B,{children:e.jsx(i,{variant:"ghost",size:"sm","aria-label":"更多操作",children:e.jsx(Z,{className:"h-4 w-4"})})})]}),e.jsx(s,{children:e.jsx("p",{className:"text-sm text-muted-foreground",children:"卡片内容区域。Action 组件会自动定位到头部右侧。"})}),e.jsxs(C,{children:[e.jsx(i,{variant:"ghost",size:"sm",children:"查看详情"}),e.jsx(i,{variant:"primary",size:"sm",children:"编辑"})]})]})},N={args:{variant:"elevated",hoverable:!0},render:()=>e.jsxs(r,{variant:"elevated",hoverable:!0,className:"w-80",children:[e.jsxs(p,{children:[e.jsx(x,{children:"可悬浮卡片"}),e.jsx(f,{children:"鼠标悬停时有上浮阴影效果"})]}),e.jsx(s,{children:e.jsx("p",{className:"text-sm text-muted-foreground",children:"尝试将鼠标悬停在卡片上，观察阴影和位移动画。"})})]})},j={args:{variant:"elevated",clickable:!0},render:()=>e.jsxs(r,{variant:"elevated",clickable:!0,className:"w-80",children:[e.jsxs(p,{children:[e.jsx(x,{children:"可点击卡片"}),e.jsx(f,{children:"点击时有轻微缩放反馈"})]}),e.jsx(s,{children:e.jsx("p",{className:"text-sm text-muted-foreground",children:"点击卡片时会有 0.99 倍缩放动画反馈。"})})]})},b={render:()=>e.jsxs("div",{className:"space-y-4",children:[e.jsx(r,{padding:"none",className:"border border-border",children:e.jsxs(s,{className:"bg-muted p-4 rounded",children:[e.jsx("code",{children:'padding="none"'})," - 无内边距"]})}),e.jsx(r,{padding:"sm",children:e.jsxs(s,{children:[e.jsx("code",{children:'padding="sm"'})," - 12px 内边距"]})}),e.jsx(r,{padding:"md",children:e.jsxs(s,{children:[e.jsx("code",{children:'padding="md"'})," - 16px 内边距（默认）"]})}),e.jsx(r,{padding:"lg",children:e.jsxs(s,{children:[e.jsx("code",{children:'padding="lg"'})," - 24px 内边距"]})})]})},y={render:()=>e.jsxs(r,{variant:"elevated",className:"w-96",children:[e.jsx(p,{children:e.jsxs("div",{className:"flex items-start justify-between",children:[e.jsxs("div",{children:[e.jsx(x,{children:"工作量卡：神经外科门诊"}),e.jsx(f,{children:"单元：神经外科一病区 · 预算：¥1,200,000"})]}),e.jsx(B,{children:e.jsx(i,{variant:"ghost",size:"sm","aria-label":"更多操作",children:e.jsx(Z,{className:"h-4 w-4"})})})]})}),e.jsxs(s,{className:"space-y-4",children:[e.jsxs("div",{className:"grid grid-cols-2 gap-4 text-sm",children:[e.jsxs("div",{children:[e.jsx("span",{className:"text-muted-foreground",children:"工作量值"}),e.jsx("div",{className:"font-semibold text-lg",children:"1,250"})]}),e.jsxs("div",{children:[e.jsx("span",{className:"text-muted-foreground",children:"完成进度"}),e.jsx("div",{className:"font-semibold text-lg",children:"85%"})]}),e.jsxs("div",{children:[e.jsx("span",{className:"text-muted-foreground",children:"预算执行"}),e.jsx("div",{className:"font-semibold text-lg",children:"¥980,000"})]}),e.jsxs("div",{children:[e.jsx("span",{className:"text-muted-foreground",children:"剩余预算"}),e.jsx("div",{className:"font-semibold text-lg text-success",children:"¥220,000"})]})]}),e.jsx("div",{className:"pt-2 border-t border-border",children:e.jsxs("div",{className:"flex items-center justify-between text-sm",children:[e.jsx("span",{className:"text-muted-foreground",children:"关联推荐"}),e.jsx(le,{variant:"success",children:"2 条待处理"})]})})]}),e.jsxs(C,{children:[e.jsx(i,{variant:"ghost",size:"sm",leftIcon:e.jsx(ne,{className:"h-3.5 w-3.5"}),children:"查看详情"}),e.jsx(i,{variant:"secondary",size:"sm",leftIcon:e.jsx(re,{className:"h-3.5 w-3.5"}),children:"编辑"}),e.jsx(i,{variant:"primary",size:"sm",leftIcon:e.jsx(z,{className:"h-3.5 w-3.5"}),children:"新建推荐"})]})]})};function le({children:n,variant:t="default",className:a}){const d={default:"bg-secondary text-secondary-foreground",success:"bg-success text-success-foreground",warning:"bg-warning text-warning-foreground",danger:"bg-danger text-danger-foreground"};return e.jsx("span",{className:`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${d[t]} ${a}`,children:n})}const w={render:()=>e.jsx(r,{variant:"bordered",className:"w-80",children:e.jsxs(s,{className:"py-12 text-center",children:[e.jsx("div",{className:"mx-auto mb-3 h-12 w-12 rounded-full bg-muted flex items-center justify-center",children:e.jsx(z,{className:"h-6 w-6 text-muted-foreground"})}),e.jsx("h3",{className:"text-lg font-medium",children:"暂无数据"}),e.jsx("p",{className:"text-sm text-muted-foreground mt-1",children:"点击上方按钮创建第一张卡片"}),e.jsx("div",{className:"mt-4",children:e.jsx(i,{variant:"primary",leftIcon:e.jsx(z,{className:"h-4 w-4"}),children:"新建卡片"})})]})})};var H,I,V;h.parameters={...h.parameters,docs:{...(H=h.parameters)==null?void 0:H.docs,source:{originalSource:`{
  render: () => <Card className="w-80">
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
}`,...(V=(I=h.parameters)==null?void 0:I.docs)==null?void 0:V.source}}};var _,A,q;v.parameters={...v.parameters,docs:{...(_=v.parameters)==null?void 0:_.docs,source:{originalSource:`{
  render: () => <div className="grid grid-cols-2 gap-4 w-full max-w-4xl">
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
}`,...(q=(A=v.parameters)==null?void 0:A.docs)==null?void 0:q.source}}};var E,S,F;g.parameters={...g.parameters,docs:{...(E=g.parameters)==null?void 0:E.docs,source:{originalSource:`{
  render: () => <Card className="w-80">
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
}`,...(F=(S=g.parameters)==null?void 0:S.docs)==null?void 0:F.source}}};var k,P,R;N.parameters={...N.parameters,docs:{...(k=N.parameters)==null?void 0:k.docs,source:{originalSource:`{
  args: {
    variant: 'elevated',
    hoverable: true
  },
  render: () => <Card variant="elevated" hoverable className="w-80">
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
}`,...(R=(P=N.parameters)==null?void 0:P.docs)==null?void 0:R.source}}};var O,G,M;j.parameters={...j.parameters,docs:{...(O=j.parameters)==null?void 0:O.docs,source:{originalSource:`{
  args: {
    variant: 'elevated',
    clickable: true
  },
  render: () => <Card variant="elevated" clickable className="w-80">
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
}`,...(M=(G=j.parameters)==null?void 0:G.docs)==null?void 0:M.source}}};var W,$,L;b.parameters={...b.parameters,docs:{...(W=b.parameters)==null?void 0:W.docs,source:{originalSource:`{
  render: () => <div className="space-y-4">
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
}`,...(L=($=b.parameters)==null?void 0:$.docs)==null?void 0:L.source}}};var U,J,K;y.parameters={...y.parameters,docs:{...(U=y.parameters)==null?void 0:U.docs,source:{originalSource:`{
  render: () => <Card variant="elevated" className="w-96">
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
}`,...(K=(J=y.parameters)==null?void 0:J.docs)==null?void 0:K.source}}};var Q,X,Y;w.parameters={...w.parameters,docs:{...(Q=w.parameters)==null?void 0:Q.docs,source:{originalSource:`{
  render: () => <Card variant="bordered" className="w-80">
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
}`,...(Y=(X=w.parameters)==null?void 0:X.docs)==null?void 0:Y.source}}};const Ce=["Default","AllVariants","WithAction","Hoverable","Clickable","PaddingVariants","ComplexCard","EmptyState"];export{v as AllVariants,j as Clickable,y as ComplexCard,h as Default,w as EmptyState,N as Hoverable,b as PaddingVariants,g as WithAction,Ce as __namedExportsOrder,fe as default};
