type Settings = { fontId: string; uppercase: boolean; useSourceSize: boolean; capMm: number; penMm: number; trackingMm: number; lineHeightPercent: number; wrap: boolean; hideSource: boolean; color: string };
type Metadata = { version: 1; sourceId: string; settings: Settings; sourceWasVisible: boolean };
type SelectionState = { sources: TextNode[]; outputs: FrameNode[] };
const DEFAULT_SETTINGS: Settings = { fontId:'EMSTech',uppercase:true,useSourceSize:true,capMm:3,penMm:0.3,trackingMm:0,lineHeightPercent:145,wrap:true,hideSource:true,color:'#222222' };
const OWN_KEY = 'stroke-type-v1';
const SOURCE_LINK = 'stroke-type-output-v1';
const RELAUNCH_COMMAND = '__SCAFFOLD_RELAUNCH__';
let busy = false;
let selectionRevision=0;
let settings: Settings = {...DEFAULT_SETTINGS};
function relaunch(node: BaseNode): void { if(RELAUNCH_COMMAND) node.setRelaunchData({[RELAUNCH_COMMAND]:'Edit and regenerate stroke lettering'}); }
function readMetadata(node: BaseNode): Metadata | null { try { const data=JSON.parse(node.getPluginData(OWN_KEY)||'null');return data&&data.version===1&&typeof data.sourceId==='string'?data:null; } catch { return null; } }
function ownFrame(node: SceneNode): FrameNode | null { let current:BaseNode|null=node; while(current&&current.type!=='PAGE'&&current.type!=='DOCUMENT'){if(current.type==='FRAME'&&readMetadata(current))return current;current=current.parent;}return null; }
function validateSettings(raw: Partial<Settings>): Settings {
  const s={...DEFAULT_SETTINGS,...raw}; if(!BUILTIN_FONTS[s.fontId])throw new Error('Choose one of the available stroke fonts.');
  s.capMm=validNumber(s.capMm,0.5,60,'Capital height');s.penMm=validNumber(s.penMm,0.05,3,'Pen width');s.trackingMm=validNumber(s.trackingMm,0,10,'Letter spacing');s.lineHeightPercent=validNumber(s.lineHeightPercent,100,400,'Line height');
  if(!/^#[0-9a-fA-F]{6}$/.test(s.color))throw new Error('Choose a valid color.');
  for(const key of ['uppercase','useSourceSize','wrap','hideSource'] as const)if(typeof s[key]!=='boolean')throw new Error('Invalid '+key+' option.');
  return s;
}
async function selectedSources(): Promise<SelectionState> {
  const sources=new Map<string,TextNode>();const outputs=new Map<string,FrameNode>();const stack:SceneNode[]=[...figma.currentPage.selection];let visited=0;
  while(stack.length){const node=stack.pop()!;if(node.removed)continue;if(++visited>3000)throw new Error('Select a smaller part of the poster (at most 3,000 layers).');
    const owned=ownFrame(node);
    if(owned){outputs.set(owned.id,owned);const meta=readMetadata(owned)!;const source=await figma.getNodeByIdAsync(meta.sourceId);if(source&&source.type==='TEXT'&&!source.removed&&source.getPluginData(SOURCE_LINK)===owned.id)sources.set(source.id,source);continue;}
    if(node.type==='TEXT'){if(visibleInTree(node)||figma.currentPage.selection.some(n=>n.id===node.id))sources.set(node.id,node);continue;}
    if('children'in node)for(const child of node.children)stack.push(child);
  }
  if(sources.size>50)throw new Error('Convert at most 50 text layers at a time.');
  return {sources:[...sources.values()],outputs:[...outputs.values()]};
}
function sourceOptions(source:TextNode,s:Settings): RenderOptions {
  const font=BUILTIN_FONTS[s.fontId];
  if(s.useSourceSize&&typeof source.fontSize!=='number')throw new Error('The layer "'+source.name+'" uses mixed text sizes. Turn off "Use selected text size" and set a capital height.');
  const cap=s.useSourceSize?(source.fontSize as number)*font.capHeight/font.em:s.capMm*PX_PER_MM;
  let originalTracking=0;if(typeof source.letterSpacing==='object'){originalTracking=source.letterSpacing.unit==='PIXELS'?source.letterSpacing.value:typeof source.fontSize==='number'?source.letterSpacing.value*source.fontSize/100:0;}
  return {capPx:cap,tracking:originalTracking+s.trackingMm*PX_PER_MM,lineHeight:cap*s.lineHeightPercent/100,width:Math.max(1,source.width),wrap:s.wrap,align:source.textAlignHorizontal,uppercase:s.uppercase,penPx:s.penMm*PX_PER_MM};
}
function validateSource(source:TextNode): void {
  let p:BaseNode|null=source;
  while(p&&p.type!=='PAGE'&&p.type!=='DOCUMENT'){if(p.type==='INSTANCE')throw new Error('Detach the instance before converting its text.');if('locked'in p&&p.locked)throw new Error('Unlock the selected text and its containing layers.');p=p.parent;}
  if(!source.parent)throw new Error('This text layer has no parent.');
  if(source.parent.type==='FRAME'&&source.parent.layoutMode!=='NONE'&&source.layoutPositioning!=='ABSOLUTE')throw new Error('Move the text into a free-positioned frame, or make it absolute in auto layout, before converting.');
  if(source.textAlignHorizontal==='JUSTIFIED')throw new Error('Use left, center, or right alignment before converting.');
}
async function currentOutput(source:TextNode): Promise<FrameNode|null> {
  const id=source.getPluginData(SOURCE_LINK);if(!id)return null;const node=await figma.getNodeByIdAsync(id);if(node&&node.type==='FRAME'&&!node.removed&&readMetadata(node)?.sourceId===source.id)return node;return null;
}
function status(text:string,kind='info'):void {figma.ui.postMessage({type:'status',text,kind});}
async function refreshSelection(restoreSettings=true):Promise<void> {
  const revision=++selectionRevision;
  try{const state=await selectedSources();if(revision!==selectionRevision||busy)return;
    const owned=state.outputs.length===1?readMetadata(state.outputs[0]):null;
    const previewSource=state.sources[0];let preview='';let previewError='';
    const active=restoreSettings&&owned?owned.settings:settings;if(restoreSettings&&owned)settings=owned.settings;
    if(previewSource){try{const opt=sourceOptions(previewSource,active);const render=renderStrokeText(previewSource.characters,BUILTIN_FONTS[active.fontId],opt);preview=letteringSvg(render.path,render.width,render.height,opt.penPx,active.color,false);}catch(e){previewError=e instanceof Error?e.message:String(e);}}
    figma.ui.postMessage({type:'selection',count:state.sources.length,outputCount:state.outputs.length,name:state.sources.length===1?previewSource.name:'',characters:previewSource?.characters.slice(0,500)||'',preview,previewError,settings:restoreSettings&&owned?owned.settings:null});
  }catch(e){figma.ui.postMessage({type:'selection',count:0,outputCount:0,preview:'',previewError:e instanceof Error?e.message:String(e)});}
}
async function convert(s:Settings):Promise<void> {
  const state=await selectedSources();if(!state.sources.length)throw new Error('Select a text layer or a frame containing text.');
  if(state.sources.reduce((sum,n)=>sum+Array.from(n.characters).length,0)>20000)throw new Error('Convert at most 20,000 characters in one batch.');
  const plans: {source:TextNode;render:RenderResult;old:FrameNode|null}[]=[];
  for(const source of state.sources){validateSource(source);plans.push({source,render:renderStrokeText(source.characters,BUILTIN_FONTS[s.fontId],sourceOptions(source,s)),old:await currentOutput(source)});}
  const staged:{source:TextNode;frame:FrameNode;old:FrameNode|null;wasVisible:boolean}[]=[];
  try{
    for(const plan of plans){const source=plan.source;const frame=figma.createFrame();staged.push({source,frame,old:plan.old,wasVisible:source.visible});
      frame.name='Stroke Type · '+BUILTIN_FONTS[s.fontId].name+' · '+source.name;frame.fills=[];frame.clipsContent=false;frame.resize(plan.render.width,Math.max(plan.render.height,source.height,1));
      const parent=source.parent!;parent.insertChild(parent.children.indexOf(source)+1,frame);if('layoutMode'in parent&&parent.layoutMode!=='NONE')frame.layoutPositioning='ABSOLUTE';frame.relativeTransform=source.relativeTransform;frame.opacity=source.opacity;
      const vector=figma.createVector();frame.appendChild(vector);vector.name='Single-stroke lettering';vector.x=0;vector.y=0;vector.fills=[];vector.vectorPaths=[{windingRule:'NONZERO',data:plan.render.path}];vector.strokes=[{type:'SOLID',color:{r:parseInt(s.color.slice(1,3),16)/255,g:parseInt(s.color.slice(3,5),16)/255,b:parseInt(s.color.slice(5,7),16)/255}}];vector.strokeWeight=s.penMm*PX_PER_MM;vector.strokeAlign='CENTER';vector.strokeCap='ROUND';vector.strokeJoin='ROUND';
      const oldMeta=plan.old?readMetadata(plan.old):null;
      frame.setPluginData(OWN_KEY,JSON.stringify({version:1,sourceId:source.id,settings:s,sourceWasVisible:oldMeta?.sourceWasVisible??source.visible} satisfies Metadata));relaunch(frame);
    }
  }catch(e){for(const item of staged)if(!item.frame.removed)item.frame.remove();throw e;}
  for(const item of staged){item.source.setPluginData(SOURCE_LINK,item.frame.id);item.source.visible=!s.hideSource;relaunch(item.source);if(item.old&&!item.old.removed)item.old.remove();}
  figma.currentPage.selection=staged.map(item=>item.frame);figma.commitUndo();
  const warnings=plans.flatMap(p=>p.render.warnings);const tall=plans.filter(p=>p.render.height>p.source.height+0.5).length;
  let message='Converted '+plans.length+' text layer'+(plans.length===1?'':'s')+'. Originals kept for editing.';
  if(tall)message+=' '+tall+' output'+(tall===1?' is':'s are')+' taller than the original text box; check the layout.';
  if(warnings.length)message+=' '+warnings[0];status(message,tall||warnings.length?'warning':'success');
}
async function showSource():Promise<void> {
  const state=await selectedSources();if(state.sources.length!==1)throw new Error('Select one converted layer to edit its original text.');
  const source=state.sources[0];source.visible=true;const output=await currentOutput(source);if(output)output.visible=false;figma.currentPage.selection=[source];status('Edit this text in Figma, then click Convert / update.','success');
}
function visibleInTree(node:SceneNode):boolean {let p:BaseNode|null=node;while(p&&p.type!=='PAGE'&&p.type!=='DOCUMENT'){if('visible'in p&&!p.visible)return false;p=p.parent;}return true;}
async function exportSvg(pageSize:string):Promise<void> {
  const selected=figma.currentPage.selection;if(!selected.length)throw new Error('Select converted lettering or its containing poster frame.');
  const frames=new Map<string,FrameNode>();const stack=[...selected];let visited=0;
  while(stack.length){const node=stack.pop()!;if(++visited>4000)throw new Error('Select a smaller part of the poster.');const own=ownFrame(node);if(own){if(visibleInTree(own))frames.set(own.id,own);continue;}if('children'in node)for(const child of node.children)stack.push(child);}
  if(!frames.size)throw new Error('No visible Stroke Type lettering found in the selection. Convert the text first.');
  let origin:Matrix;let width:number;let height:number;
  const outer=selected.length===1&&selected[0].type==='FRAME'&&!readMetadata(selected[0])?selected[0]:null;
  if(outer){origin=inverse(outer.absoluteTransform);width=outer.width;height=outer.height;}else{
    const boxes=[...frames.values()].map(f=>f.absoluteBoundingBox).filter((b):b is Rect=>!!b);if(!boxes.length)throw new Error('The selected lettering has no bounds.');
    const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));width=Math.max(...boxes.map(b=>b.x+b.width))-x;height=Math.max(...boxes.map(b=>b.y+b.height))-y;origin=[[1,0,-x],[0,1,-y]];
  }
  if(pageSize==='a3p'){width=297*PX_PER_MM;height=420*PX_PER_MM;}else if(pageSize==='a3l'){width=420*PX_PER_MM;height=297*PX_PER_MM;}else if(pageSize!=='selection')throw new Error('Choose a valid export size.');
  const paths:string[]=[];let count=0;
  for(const frame of frames.values()){
    const vectorStack:SceneNode[]=[...frame.children];
    while(vectorStack.length){const node=vectorStack.pop()!;if(node.type==='VECTOR'&&visibleInTree(node)){
      const t=multiply(origin,node.absoluteTransform);const strokes=node.strokes;const paint=strokes.find(p=>p.type==='SOLID');if(!paint||paint.type!=='SOLID')continue;
      const color='#'+[paint.color.r,paint.color.g,paint.color.b].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('');
      const weight=typeof node.strokeWeight==='number'?node.strokeWeight:settings.penMm*PX_PER_MM;
      for(const path of node.vectorPaths){const data=transformPath(path.data,t);const coords=(data.match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g)||[]).map(Number);for(let i=0;i<coords.length;i+=2)if(coords[i]<-0.02||coords[i+1]<-0.02||coords[i]>width+0.02||coords[i+1]>height+0.02)throw new Error('Lettering falls outside the export page. Move it inside the selected frame or choose a larger export size.');paths.push('<path d="'+escapeXml(data)+'" fill="none" stroke="'+color+'" stroke-width="'+numberText(weight)+'" stroke-linecap="round" stroke-linejoin="round"/>');count++;}
    }else if('children'in node)for(const child of node.children)vectorStack.push(child);}
  }
  if(!count)throw new Error('The selected output no longer contains stroke vectors. Regenerate it first.');
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+numberText(width/PX_PER_MM)+'mm" height="'+numberText(height/PX_PER_MM)+'mm" viewBox="0 0 '+numberText(width)+' '+numberText(height)+'"><title>Stroke Type lettering</title><desc>Stroke-only lettering. Other poster artwork is not included. 96 Figma units per inch.</desc>'+paths.join('')+'</svg>';
  figma.ui.postMessage({type:'download',svg,filename:pageSize==='selection'?'stroke-type-lettering.svg':pageSize==='a3p'?'stroke-type-a3-portrait.svg':'stroke-type-a3-landscape.svg'});
  status('SVG ready. It includes the stroke lettering only.','success');
}
figma.showUI(__html__,{width:360,height:700,themeColors:true});relaunch(figma.root);
figma.on('selectionchange',()=>{void refreshSelection();});
figma.ui.onmessage=async (message:{type:string;settings?:Partial<Settings>;pageSize?:string;height?:number})=>{
  if(message.type==='ready'){await refreshSelection();return;}
  if(message.type==='resize'){figma.ui.resize(360,Math.max(350,Math.min(850,Math.round(message.height||700))));return;}
  if(busy)return;
  if(message.type==='preview'){try{settings=validateSettings(message.settings||{});await refreshSelection(false);}catch(e){status(e instanceof Error?e.message:String(e),'error');}return;}
  busy=true;figma.ui.postMessage({type:'busy',value:true});
  try{if(message.type==='convert'){settings=validateSettings(message.settings||{});await convert(settings);}else if(message.type==='source'){await showSource();}else if(message.type==='export'){await exportSvg(message.pageSize||'selection');}else throw new Error('Unknown action.');}
  catch(e){status(e instanceof Error?e.message:String(e),'error');}
  finally{busy=false;figma.ui.postMessage({type:'busy',value:false});await refreshSelection(false);}
};
