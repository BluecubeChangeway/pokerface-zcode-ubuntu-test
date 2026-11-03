import{j as e}from"./jsx-runtime-D_zvdyIk.js";import{r}from"./index-Dkd5gcU3.js";import{P as G,c as ze,a as Ue,b as Fe}from"./index-B4_j5Fla.js";import{u as Me,c as q}from"./utils-CRy61Qm3.js";import{u as Ae}from"./index-imM4MU5P.js";import"./index-Bg5RRhoj.js";var Oe=Object.defineProperty,y=(a,n)=>Oe(a,"name",{value:n,configurable:!0}),X="Switch",[Ve,ct]=Ue(X),[He,$]=Ve(X);function Le(a){const{__scopeSwitch:n,checked:g,children:c,defaultChecked:d,disabled:s,form:t,name:o,onCheckedChange:f,required:h,value:S="on",internal_do_not_use_render:w}=a,[i,x]=Fe({prop:g,defaultProp:d??!1,onChange:f,caller:X}),[b,j]=r.useState(null),[R,N]=r.useState(null),[u,l]=r.useState(null),C=b?!!t||!!b.closest("form"):!0,v={checked:i,setChecked:x,disabled:s,control:b,setControl:j,name:o,form:t,value:S,userClick:u,onUserClick:l,required:h,defaultChecked:d,isFormControl:C,bubbleInput:R,setBubbleInput:N};return e.jsx(He,{scope:n,...v,children:Be(w)?w(v):c})}y(Le,"SwitchProvider");var We="SwitchTrigger",Ge=r.forwardRef(y(function({__scopeSwitch:n,onClick:g,...c},d){const{control:s,form:t,value:o,disabled:f,checked:h,required:S,setControl:w,setChecked:i,onUserClick:x,isFormControl:b,bubbleInput:j}=$(We,n),R=Me(d,w),N=r.useRef(h);return r.useEffect(()=>{const u=t?s==null?void 0:s.ownerDocument.getElementById(t):s==null?void 0:s.form;if(u instanceof HTMLFormElement){const l=y(()=>i(N.current),"reset");return u.addEventListener("reset",l),()=>u.removeEventListener("reset",l)}},[s,t,i]),e.jsx(G.button,{type:"button",role:"switch","aria-checked":h,"aria-required":S,"data-state":J(h),"data-disabled":f?"":void 0,disabled:f,value:o,...c,ref:R,onClick:ze(g,u=>{const l=u.isPropagationStopped();x({requestedChecked:!h,hasConsumerStoppedPropagation:l}),i(C=>!C),j&&b&&(l||u.stopPropagation())})})},"SwitchTrigger")),Y=r.forwardRef(y(function(n,g){const{__scopeSwitch:c,name:d,checked:s,defaultChecked:t,required:o,disabled:f,value:h,onCheckedChange:S,form:w,...i}=n;return e.jsx(Le,{__scopeSwitch:c,checked:s,defaultChecked:t,disabled:f,required:o,onCheckedChange:S,name:d,form:w,value:h,internal_do_not_use_render:({isFormControl:x})=>e.jsxs(e.Fragment,{children:[e.jsx(Ge,{...i,ref:g,__scopeSwitch:c}),x&&e.jsx(Qe,{__scopeSwitch:c})]})})},"Switch")),Xe="SwitchThumb",$e=r.forwardRef(y(function(n,g){const{__scopeSwitch:c,...d}=n,s=$(Xe,c);return e.jsx(G.span,{"data-state":J(s.checked),"data-disabled":s.disabled?"":void 0,...d,ref:g})},"SwitchThumb")),Je="SwitchBubbleInput",Qe=r.forwardRef(y(function({__scopeSwitch:n,onClick:g,...c},d){const{control:s,userClick:t,checked:o,defaultChecked:f,required:h,disabled:S,name:w,value:i,form:x,bubbleInput:b,setBubbleInput:j}=$(Je,n),R=Me(d,j),N=Ae(s),u=r.useRef(!1),l=r.useRef(o),C=r.useRef(t),v=r.useRef(null);r.useEffect(()=>{const k=b;if(!k)return;const I=window.HTMLInputElement.prototype,_=Object.getOwnPropertyDescriptor(I,"checked").set;if(!_)return;const T=l.current!==o;l.current=o;const m=t!==null&&t!==C.current;if(C.current=t,m)v.current=T?null:t,T&&_.call(k,o),k.dispatchEvent(new Event("click",{bubbles:!t.hasConsumerStoppedPropagation}));else if(T){const P=v.current;v.current=null;const De=(P==null?void 0:P.requestedChecked)===o;u.current=!0,_.call(k,o),k.dispatchEvent(new Event("click",{bubbles:!(De&&P.hasConsumerStoppedPropagation)})),u.current=!1}},[b,o,t]);const W=r.useRef(o);return e.jsx(G.input,{type:"checkbox","aria-hidden":!0,defaultChecked:f??W.current,required:h,disabled:S,name:w,value:i,form:x,...c,tabIndex:-1,ref:R,onClick:ze(g,k=>{u.current&&k.stopPropagation()}),style:{...c.style,...N,position:"absolute",pointerEvents:"none",opacity:0,margin:0,transform:"translateX(-100%)"}})},"SwitchBubbleInput"));function Be(a){return typeof a=="function"}y(Be,"isFunction");function J(a){return a?"checked":"unchecked"}y(J,"getState");const Ye=q("block rounded-full bg-background shadow-sm ring-0 transition-transform duration-fast ease-standard","data-[state=checked]:translate-x-full data-[state=unchecked]:translate-x-0","focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"),Ze=q("relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full","border-2 border-border transition-colors duration-fast ease-standard","focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2","data-[state=checked]:bg-primary data-[state=checked]:border-primary","data-[state=unchecked]:bg-input-bg data-[state=unchecked]:border-input-border","disabled:opacity-50 disabled:cursor-not-allowed"),Ke={sm:{track:"h-5 w-9",thumb:"h-4 w-4"},md:{track:"h-6 w-11",thumb:"h-5 w-5"},lg:{track:"h-7 w-13",thumb:"h-6 w-6"}},p=r.forwardRef(({className:a,checked:n,defaultChecked:g=!1,onCheckedChange:c,label:d,description:s,error:t,disabled:o=!1,required:f=!1,size:h="md",labelPosition:S="right",asChild:w=!1,storageKey:i,id:x,children:b,...j},R)=>{const[N,u]=r.useState(g),l=n!==void 0,C=l?n:N,v=r.useId(),W=x||v,k=r.useId(),I=r.useId(),Q=r.useMemo(()=>{const m=[];return s&&m.push(k),t&&m.push(I),m.length>0?m.join(" "):void 0},[s,t,k,I]),_=r.useCallback(m=>{l||u(m),c==null||c(m),i&&typeof window<"u"&&localStorage.setItem(i,String(m))},[l,c,i]);r.useEffect(()=>{if(!l&&i&&typeof window<"u"){const m=localStorage.getItem(i);m!==null&&u(m==="true")}},[l,i]);const T=Ke[h];return e.jsxs(Y,{checked:C,onCheckedChange:_,disabled:o,required:f,id:W,"aria-describedby":Q,"aria-invalid":t?"true":"false","aria-required":f,className:q("flex items-center gap-3 cursor-pointer",S==="left"&&"flex-row-reverse",a),...j,children:[e.jsx($e,{className:q(Ye,T.thumb)}),e.jsx(Y,{className:q(Ze,T.track),"aria-label":d,children:e.jsx("input",{type:"checkbox",className:"peer h-4 w-4"})}),(d||s||t||b)&&e.jsxs("div",{className:"flex flex-col gap-0.5 text-sm",children:[d&&e.jsxs("span",{className:q("font-medium text-foreground",o&&"opacity-50"),children:[d,f&&e.jsx("span",{className:"text-danger ml-0.5","aria-hidden":"true",children:"*"})]}),s&&!t&&e.jsx("p",{id:k,className:"text-muted-foreground",children:s}),t&&e.jsx("p",{id:I,className:"text-sm text-danger",role:"alert",children:t}),b&&e.jsx("span",{className:"text-muted-foreground",children:b})]})]})});p.displayName="Switch";p.__docgenInfo={description:"",methods:[],displayName:"Switch",props:{checked:{required:!1,tsType:{name:"boolean"},description:"是否选中（受控）"},defaultChecked:{required:!1,tsType:{name:"boolean"},description:"默认选中（非受控）",defaultValue:{value:"false",computed:!1}},onCheckedChange:{required:!1,tsType:{name:"signature",type:"function",raw:"(checked: boolean) => void",signature:{arguments:[{type:{name:"boolean"},name:"checked"}],return:{name:"void"}}},description:"变化回调"},label:{required:!1,tsType:{name:"string"},description:"标签文本"},description:{required:!1,tsType:{name:"string"},description:"描述文本"},error:{required:!1,tsType:{name:"string"},description:"错误提示"},disabled:{required:!1,tsType:{name:"boolean"},description:"是否禁用",defaultValue:{value:"false",computed:!1}},required:{required:!1,tsType:{name:"boolean"},description:"是否必填",defaultValue:{value:"false",computed:!1}},size:{required:!1,tsType:{name:"union",raw:"'sm' | 'md' | 'lg'",elements:[{name:"literal",value:"'sm'"},{name:"literal",value:"'md'"},{name:"literal",value:"'lg'"}]},description:"尺寸",defaultValue:{value:"'md'",computed:!1}},labelPosition:{required:!1,tsType:{name:"union",raw:"'left' | 'right'",elements:[{name:"literal",value:"'left'"},{name:"literal",value:"'right'"}]},description:"标签位置",defaultValue:{value:"'right'",computed:!1}},asChild:{required:!1,tsType:{name:"boolean"},description:"作为子元素渲染",defaultValue:{value:"false",computed:!1}},storageKey:{required:!1,tsType:{name:"string"},description:"存储键名（用于持久化）"},id:{required:!1,tsType:{name:"string"},description:"ID"},className:{required:!1,tsType:{name:"string"},description:"类名"},children:{required:!1,tsType:{name:"ReactReactNode",raw:"React.ReactNode"},description:"标签/描述/错误/子内容"}}};const ot={title:"UI/Switch",component:p,parameters:{layout:"centered",docs:{description:{component:"开关组件，用于切换开/关状态。支持标签、描述、错误状态等。"}}},tags:["autodocs"],argTypes:{checked:{control:"boolean",description:"选中状态（受控）"},defaultChecked:{control:"boolean",description:"默认选中（非受控）"},disabled:{control:"boolean",description:"是否禁用"},required:{control:"boolean",description:"是否必填"},size:{control:"select",options:["sm","md","lg"],description:"尺寸"},label:{control:"text",description:"标签文本"},description:{control:"text",description:"描述文本"},error:{control:"text",description:"错误提示"},labelPosition:{control:"select",options:["left","right"],description:"标签位置"},storageKey:{control:"text",description:"持久化存储键名"}}},E={args:{label:"开启通知"}},z={args:{label:"开启通知",defaultChecked:!0}},M={args:{label:"开启通知（禁用）",disabled:!0}},L={args:{label:"开启通知（禁用-开启）",disabled:!0,defaultChecked:!0}},B={args:{label:"邮件通知",description:"接收重要邮件和系统通知"}},D={args:{label:"必须同意条款",error:"请先阅读并同意服务条款",required:!0}},U={args:{label:"开启通知",labelPosition:"left"}},F={render:()=>e.jsxs("div",{className:"space-y-4",children:[e.jsx(p,{size:"sm",label:"Small 开关"}),e.jsx(p,{size:"md",label:"Medium 开关"}),e.jsx(p,{size:"lg",label:"Large 开关"})]})},A={render:()=>e.jsxs("div",{className:"space-y-4",children:[e.jsx(p,{size:"sm",label:"Small 开启",defaultChecked:!0}),e.jsx(p,{size:"md",label:"Medium 开启",defaultChecked:!0}),e.jsx(p,{size:"lg",label:"Large 开启",defaultChecked:!0})]})},O={render:()=>e.jsxs("div",{className:"space-y-4 w-64",children:[e.jsx(p,{label:"邮件通知",description:"接收产品更新和优惠信息",defaultChecked:!0}),e.jsx(p,{label:"推送通知",description:"在浏览器中接收实时推送"}),e.jsx(p,{label:"短信通知",description:"通过短信接收重要提醒",disabled:!0}),e.jsx(p,{label:"周报",description:"每周发送一次活动摘要",defaultChecked:!0})]})},V={args:{label:"我同意服务条款",required:!0,description:"请阅读并同意我们的服务条款和隐私政策"}},H={render:()=>{const[a,n]=React.useState(!0);return e.jsxs("div",{className:"space-y-4",children:[e.jsx(p,{label:"受控模式开关",checked:a,onCheckedChange:n}),e.jsxs("p",{className:"text-sm text-muted-foreground",children:["当前状态: ",a?"开启":"关闭"]}),e.jsx("button",{onClick:()=>n(!a),className:"px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90",children:"切换状态"})]})}};var Z,K,ee;E.parameters={...E.parameters,docs:{...(Z=E.parameters)==null?void 0:Z.docs,source:{originalSource:`{
  args: {
    label: '开启通知'
  }
}`,...(ee=(K=E.parameters)==null?void 0:K.docs)==null?void 0:ee.source}}};var te,re,se;z.parameters={...z.parameters,docs:{...(te=z.parameters)==null?void 0:te.docs,source:{originalSource:`{
  args: {
    label: '开启通知',
    defaultChecked: true
  }
}`,...(se=(re=z.parameters)==null?void 0:re.docs)==null?void 0:se.source}}};var ae,ne,ce;M.parameters={...M.parameters,docs:{...(ae=M.parameters)==null?void 0:ae.docs,source:{originalSource:`{
  args: {
    label: '开启通知（禁用）',
    disabled: true
  }
}`,...(ce=(ne=M.parameters)==null?void 0:ne.docs)==null?void 0:ce.source}}};var oe,ie,le;L.parameters={...L.parameters,docs:{...(oe=L.parameters)==null?void 0:oe.docs,source:{originalSource:`{
  args: {
    label: '开启通知（禁用-开启）',
    disabled: true,
    defaultChecked: true
  }
}`,...(le=(ie=L.parameters)==null?void 0:ie.docs)==null?void 0:le.source}}};var de,ue,pe;B.parameters={...B.parameters,docs:{...(de=B.parameters)==null?void 0:de.docs,source:{originalSource:`{
  args: {
    label: '邮件通知',
    description: '接收重要邮件和系统通知'
  }
}`,...(pe=(ue=B.parameters)==null?void 0:ue.docs)==null?void 0:pe.source}}};var me,fe,he;D.parameters={...D.parameters,docs:{...(me=D.parameters)==null?void 0:me.docs,source:{originalSource:`{
  args: {
    label: '必须同意条款',
    error: '请先阅读并同意服务条款',
    required: true
  }
}`,...(he=(fe=D.parameters)==null?void 0:fe.docs)==null?void 0:he.source}}};var be,ge,ke;U.parameters={...U.parameters,docs:{...(be=U.parameters)==null?void 0:be.docs,source:{originalSource:`{
  args: {
    label: '开启通知',
    labelPosition: 'left'
  }
}`,...(ke=(ge=U.parameters)==null?void 0:ge.docs)==null?void 0:ke.source}}};var Se,we,xe;F.parameters={...F.parameters,docs:{...(Se=F.parameters)==null?void 0:Se.docs,source:{originalSource:`{
  render: () => <div className="space-y-4">
      <Switch size="sm" label="Small 开关" />
      <Switch size="md" label="Medium 开关" />
      <Switch size="lg" label="Large 开关" />
    </div>
}`,...(xe=(we=F.parameters)==null?void 0:we.docs)==null?void 0:xe.source}}};var Ce,ve,ye;A.parameters={...A.parameters,docs:{...(Ce=A.parameters)==null?void 0:Ce.docs,source:{originalSource:`{
  render: () => <div className="space-y-4">
      <Switch size="sm" label="Small 开启" defaultChecked />
      <Switch size="md" label="Medium 开启" defaultChecked />
      <Switch size="lg" label="Large 开启" defaultChecked />
    </div>
}`,...(ye=(ve=A.parameters)==null?void 0:ve.docs)==null?void 0:ye.source}}};var je,Ne,Re;O.parameters={...O.parameters,docs:{...(je=O.parameters)==null?void 0:je.docs,source:{originalSource:`{
  render: () => <div className="space-y-4 w-64">
      <Switch label="邮件通知" description="接收产品更新和优惠信息" defaultChecked />
      <Switch label="推送通知" description="在浏览器中接收实时推送" />
      <Switch label="短信通知" description="通过短信接收重要提醒" disabled />
      <Switch label="周报" description="每周发送一次活动摘要" defaultChecked />
    </div>
}`,...(Re=(Ne=O.parameters)==null?void 0:Ne.docs)==null?void 0:Re.source}}};var Te,qe,Ie;V.parameters={...V.parameters,docs:{...(Te=V.parameters)==null?void 0:Te.docs,source:{originalSource:`{
  args: {
    label: '我同意服务条款',
    required: true,
    description: '请阅读并同意我们的服务条款和隐私政策'
  }
}`,...(Ie=(qe=V.parameters)==null?void 0:qe.docs)==null?void 0:Ie.source}}};var _e,Pe,Ee;H.parameters={...H.parameters,docs:{...(_e=H.parameters)==null?void 0:_e.docs,source:{originalSource:`{
  render: () => {
    const [checked, setChecked] = React.useState(true);
    return <div className="space-y-4">
        <Switch label="受控模式开关" checked={checked} onCheckedChange={setChecked} />
        <p className="text-sm text-muted-foreground">
          当前状态: {checked ? '开启' : '关闭'}
        </p>
        <button onClick={() => setChecked(!checked)} className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90">
          切换状态
        </button>
      </div>;
  }
}`,...(Ee=(Pe=H.parameters)==null?void 0:Pe.docs)==null?void 0:Ee.source}}};const it=["Default","Checked","Disabled","DisabledChecked","WithDescription","WithError","LabelOnLeft","Sizes","AllSizesChecked","MultipleSwitches","Required","Controlled"];export{A as AllSizesChecked,z as Checked,H as Controlled,E as Default,M as Disabled,L as DisabledChecked,U as LabelOnLeft,O as MultipleSwitches,V as Required,F as Sizes,B as WithDescription,D as WithError,it as __namedExportsOrder,ot as default};
