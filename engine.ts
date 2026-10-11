type Bounds = [number, number, number, number];
type Glyph = { advance: number; d: string; bounds: Bounds };
type StrokeFont = { id: string; name: string; em: number; capHeight: number; capTop: number; glyphs: Record<string, Glyph>; license?: string; credits?: string };
type RenderOptions = { capPx: number; tracking: number; lineHeight: number; width: number; wrap: boolean; align: string; uppercase: boolean; penPx: number };
type RenderResult = { path: string; width: number; height: number; inkBounds: Bounds; lines: string[]; warnings: string[] };
type Matrix = [[number, number, number], [number, number, number]];
const PX_PER_MM = 96 / 25.4;
const NUMBER_PATTERN = /[MLCQZ]|[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g;
const COMMAND_ARITY: Record<string, number> = { M: 2, L: 2, C: 6, Q: 4, Z: 0 };
function numberText(n: number): string { if (!Number.isFinite(n)) throw new Error('Invalid coordinate.'); return String(Math.round(n * 100000) / 100000); }
function escapeXml(s: string): string { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function validNumber(n: unknown, min: number, max: number, name: string): number { const x = Number(n); if (!Number.isFinite(x) || x < min || x > max) throw new Error(name + ' must be between ' + min + ' and ' + max + '.'); return x; }
function transformPath(d: string, t: Matrix): string {
  if (!d) return '';
  const remainder = d.replace(NUMBER_PATTERN, '').replace(/[\s,]/g, '');
  if (remainder) throw new Error('Unsupported path commands. Use absolute M, L, C, Q and Z commands.');
  const tokens = d.match(NUMBER_PATTERN) || []; const out: string[] = []; let i = 0; let command = '';
  while (i < tokens.length) {
    if (Object.prototype.hasOwnProperty.call(COMMAND_ARITY, tokens[i])) command = tokens[i++];
    if (!command) throw new Error('A glyph path must start with a command.');
    if (command === 'Z') { out.push('Z'); command = ''; continue; }
    const count = COMMAND_ARITY[command];
    if (i + count > tokens.length) throw new Error('Incomplete glyph path.');
    out.push(command);
    for (let j = 0; j < count; j += 2) {
      const x = Number(tokens[i++]); const y = Number(tokens[i++]);
      out.push(numberText(t[0][0]*x+t[0][1]*y+t[0][2]),numberText(t[1][0]*x+t[1][1]*y+t[1][2]));
    }
    if (command === 'M') command = 'L';
    if (out.length > 240000) throw new Error('The glyph path is too complex.');
  }
  return out.join(' ');
}
function multiply(a: Matrix, b: Matrix): Matrix {
  return [[a[0][0]*b[0][0]+a[0][1]*b[1][0],a[0][0]*b[0][1]+a[0][1]*b[1][1],a[0][0]*b[0][2]+a[0][1]*b[1][2]+a[0][2]],
          [a[1][0]*b[0][0]+a[1][1]*b[1][0],a[1][0]*b[0][1]+a[1][1]*b[1][1],a[1][0]*b[0][2]+a[1][1]*b[1][2]+a[1][2]]];
}
function inverse(a: Matrix): Matrix {
  const det=a[0][0]*a[1][1]-a[0][1]*a[1][0]; if (Math.abs(det)<1e-10) throw new Error('Cannot export a layer with a collapsed transform.');
  const b: Matrix=[[a[1][1]/det,-a[0][1]/det,0],[-a[1][0]/det,a[0][0]/det,0]];
  b[0][2]=-b[0][0]*a[0][2]-b[0][1]*a[1][2]; b[1][2]=-b[1][0]*a[0][2]-b[1][1]*a[1][2]; return b;
}
function normalizeText(text: string, uppercase: boolean): string {
  const result=text.normalize('NFC').replace(/\r\n?|[\u2028\u2029]/g,'\n').replace(/\t/g,'    ').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/[\u2013\u2014\u2212]/g,'-').replace(/\u2026/g,'...').replace(/\u00a0/g,' ');
  return uppercase ? result.toUpperCase() : result;
}
function renderStrokeText(input: string, font: StrokeFont, opt: RenderOptions): RenderResult {
  const text = normalizeText(input,opt.uppercase);
  if (!text.trim()) throw new Error('Select a text layer containing letters.');
  if (Array.from(text).length>10000) throw new Error('Use at most 10,000 characters per text layer.');
  const missing=Array.from(new Set(Array.from(text).filter(c=>c!=='\n'&&!font.glyphs[c])));
  if (missing.length) throw new Error(font.name+' has no glyph for: '+missing.slice(0,12).join(' ')+' . Change these characters or choose another font.');
  if (!(opt.capPx>0&&Number.isFinite(opt.capPx))) throw new Error('Letter height must be positive.');
  const scale=opt.capPx/font.capHeight; const pad=opt.penPx/2+0.01;
  const measure=(s: string): {width:number;left:number;advance:number}=>{
    let cursor=0,min=0,max=0; const chars=Array.from(s);
    chars.forEach((ch,index)=>{const g=font.glyphs[ch];if(g.d){min=Math.min(min,cursor+g.bounds[0]*scale);max=Math.max(max,cursor+g.bounds[2]*scale);}cursor+=g.advance*scale+(index<chars.length-1?opt.tracking:0);});
    return {width:Math.max(max,cursor)-min,left:min,advance:cursor};
  };
  const available=Math.max(0.01,opt.width-pad*2);
  const lines: string[]=[];
  for(const paragraph of text.split('\n')) {
    if(!opt.wrap){lines.push(paragraph);continue;}
    let line='';
    const tokens=paragraph.match(/\S+|[^\S\n]+/g)||[];
    for(const word of tokens) {
      if(/^\s+$/.test(word)){if(line)line+=word;continue;}
      if(measure(line+word).width<=available){line+=word;continue;}
      if(line.trim()){lines.push(line.trimEnd());line='';}
      if(measure(word).width<=available){line=word;continue;}
      for(const char of Array.from(word)) {
        if(measure(char).width>available)throw new Error('The text box is narrower than one letter. Increase its width or reduce letter height.');
        if(line&&measure(line+char).width>available){lines.push(line);line='';}line+=char;
      }
    }
    lines.push(line.trimEnd());
  }
  if(lines.length>500)throw new Error('Too many lines. Increase the text box width.');
  const measured=lines.map(measure); const width=Math.max(opt.width,...measured.map(l=>l.width+pad*2),1);
  let ymin=Infinity,ymax=-Infinity,xmin=Infinity,xmax=-Infinity; const paths:string[]=[];
  lines.forEach((line,index)=>{
    const lineWidth=measured[index].width;const align=opt.align==='CENTER'?(width-2*pad-lineWidth)/2:opt.align==='RIGHT'?width-2*pad-lineWidth:0;
    let cursor=pad+align-measured[index].left;const baseline=pad+font.capTop*scale+index*opt.lineHeight;
    Array.from(line).forEach(ch=>{const g=font.glyphs[ch];if(g.d){paths.push(transformPath(g.d,[[scale,0,cursor],[0,-scale,baseline]]));xmin=Math.min(xmin,cursor+g.bounds[0]*scale);xmax=Math.max(xmax,cursor+g.bounds[2]*scale);ymin=Math.min(ymin,baseline-g.bounds[3]*scale);ymax=Math.max(ymax,baseline-g.bounds[1]*scale);}cursor+=g.advance*scale+opt.tracking;});
  });
  if(!paths.length)throw new Error('There are no drawable letters in this text.');
  const shift=pad-Math.min(pad,ymin);let path=paths.join(' ');if(shift>0)path=transformPath(path,[[1,0,0],[0,1,shift]]);
  const height=Math.max(1,ymax+shift+pad); const warnings:string[]=[];
  if(width>opt.width+0.1)warnings.push('Lettering is wider than the source text box.');
  return {path,width,height,inkBounds:[xmin,ymin+shift,xmax,ymax+shift],lines,warnings};
}
function letteringSvg(path:string,width:number,height:number,pen:number,color:string,physical=true):string {
  if(!/^#[0-9a-fA-F]{6}$/.test(color))throw new Error('Choose a valid color.');
  const w=physical?numberText(width/PX_PER_MM)+'mm':numberText(width);const h=physical?numberText(height/PX_PER_MM)+'mm':numberText(height);
  return '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+numberText(width)+' '+numberText(height)+'"><path d="'+escapeXml(path)+'" fill="none" stroke="'+color+'" stroke-width="'+numberText(pen)+'" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
