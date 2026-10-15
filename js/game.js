
'use strict';
(()=>{
const canvas=document.getElementById('game'),gl=canvas.getContext('webgl',{antialias:true,preserveDrawingBuffer:false,alpha:false})||canvas.getContext('experimental-webgl',{antialias:true});if(!gl){document.querySelector('#menuDesc').innerText='3D graphics are unavailable in this browser. Enable hardware acceleration/WebGL or open this game in Chrome, Safari or Firefox.';document.querySelector('#startBtn').disabled=true;return;}
const VSH=`attribute vec3 aPos; attribute vec3 aN; attribute vec3 aCol; uniform mat4 uVP; varying vec3 vCol; varying float vFog; uniform vec3 uCamera; void main(){ gl_Position=uVP*vec4(aPos,1.0); float l=max(0.12,dot(normalize(aN),normalize(vec3(-0.38,0.85,0.32)))); vCol=aCol*(0.58+0.46*l);float d=distance(aPos,uCamera);vFog=clamp((d-150.0)/240.0,0.0,0.82);}`;
const FSH=`precision mediump float; varying vec3 vCol; varying float vFog; void main(){gl_FragColor=vec4(mix(vCol,vec3(0.62,0.79,0.89),vFog),1.0);}`;
function shader(type,src){let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
let program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,VSH));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,FSH));gl.linkProgram(program);gl.useProgram(program);
const aPos=gl.getAttribLocation(program,'aPos'),aN=gl.getAttribLocation(program,'aN'),aCol=gl.getAttribLocation(program,'aCol'),uVP=gl.getUniformLocation(program,'uVP'),uCamera=gl.getUniformLocation(program,'uCamera');gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.CULL_FACE);gl.cullFace(gl.BACK);gl.clearColor(.62,.79,.9,1);
const staticBuffer=gl.createBuffer(),dynamicBuffer=gl.createBuffer();
const C={sand:[.94,.82,.61],road:[.25,.3,.34],side:[.73,.73,.68],sea:[.06,.66,.71],white:[.95,.97,.97],blue:[.16,.68,.9],red:[.92,.3,.27],yellow:[1,.77,.22],ink:[.11,.2,.3],palm:[.23,.54,.31],wood:[.58,.36,.21],shade:[.75,.82,.84],pink:[.94,.51,.56],purple:[.49,.38,.75],roof:[.53,.7,.71]};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)],dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z),sq=x=>x*x;
function matIdentity(){return [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]}
function matMul(a,b){let o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
function moveM(x,y,z){let m=matIdentity();m[12]=x;m[13]=y;m[14]=z;return m;}
function rotation(yaw=0,pitch=0,roll=0){let cy=Math.cos(yaw),sy=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch),cr=Math.cos(roll),sr=Math.sin(roll);return matMul(matMul([cy,0,-sy,0,0,1,0,0,sy,0,cy,0,0,0,0,1],[1,0,0,0,0,cp,sp,0,0,-sp,cp,0,0,0,0,1]),[cr,sr,0,0,-sr,cr,0,0,0,0,1,0,0,0,0,1]);}
function mv(m,p){return [m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];}
const norm=(a,b,c)=>{let x=(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]),y=(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]),z=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);let l=Math.hypot(x,y,z)||1;return [x/l,y/l,z/l]};
class Mesh{constructor(){this.d=[];this.stack=[matIdentity()];}push(x=0,y=0,z=0,ry=0,rx=0,rz=0){this.stack.push(matMul(this.stack.at(-1),matMul(moveM(x,y,z),rotation(ry,rx,rz))));}pop(){this.stack.pop()}
 scale(s){let matrix=matIdentity();matrix[0]=matrix[5]=matrix[10]=s;this.stack.push(matMul(this.stack.at(-1),matrix));}
 tri(a,b,c,col){let m=this.stack.at(-1);a=mv(m,a);b=mv(m,b);c=mv(m,c);let n=norm(a,b,c);for(let p of [a,b,c])this.d.push(...p,...n,...col);}
 quad(a,b,c,d,col){this.tri(a,b,c,col);this.tri(a,c,d,col)}
 box(x,y,z,w,h,d,col){this.push(x,y,z);let X=w/2,Y=h/2,Z=d/2,p=[[-X,-Y,-Z],[X,-Y,-Z],[X,Y,-Z],[-X,Y,-Z],[-X,-Y,Z],[X,-Y,Z],[X,Y,Z],[-X,Y,Z]];for(let face of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]])this.quad(...face.map(i=>p[i]),col);this.pop()}
 cylinder(x,y,z,r,h,col,seg=8){this.push(x,y,z);for(let i=0;i<seg;i++){let t=i*2*Math.PI/seg,t2=(i+1)*2*Math.PI/seg,a=[r*Math.cos(t),-h/2,r*Math.sin(t)],b=[r*Math.cos(t2),-h/2,r*Math.sin(t2)],c=[r*Math.cos(t2),h/2,r*Math.sin(t2)],d=[r*Math.cos(t),h/2,r*Math.sin(t)];this.quad(a,b,c,d,col);this.tri([0,h/2,0],d,c,col);this.tri([0,-h/2,0],b,a,col)}this.pop()}
 cone(x,y,z,r,h,col,seg=8){this.push(x,y,z);for(let i=0;i<seg;i++){let t=i*2*Math.PI/seg,s=(i+1)*2*Math.PI/seg,a=[r*Math.cos(t),-h/2,r*Math.sin(t)],b=[r*Math.cos(s),-h/2,r*Math.sin(s)];this.tri(a,b,[0,h/2,0],col);this.tri([0,-h/2,0],b,a,col);}this.pop()}
 ball(x,y,z,r,col,seg=8,rings=5){this.push(x,y,z);for(let j=0;j<rings;j++){let f=-Math.PI/2+j*Math.PI/rings,g=-Math.PI/2+(j+1)*Math.PI/rings;for(let i=0;i<seg;i++){let t=i*2*Math.PI/seg,s=(i+1)*2*Math.PI/seg;let a=[r*Math.cos(f)*Math.cos(t),r*Math.sin(f),r*Math.cos(f)*Math.sin(t)],b=[r*Math.cos(f)*Math.cos(s),r*Math.sin(f),r*Math.cos(f)*Math.sin(s)],c=[r*Math.cos(g)*Math.cos(s),r*Math.sin(g),r*Math.cos(g)*Math.sin(s)],d=[r*Math.cos(g)*Math.cos(t),r*Math.sin(g),r*Math.cos(g)*Math.sin(t)];this.quad(a,d,c,b,col)}}this.pop()}
 beam(ax,ay,az,bx,by,bz,r,col){let dx=bx-ax,dy=by-ay,dz=bz-az,len=Math.hypot(dx,dy,dz),yaw=Math.atan2(dx,dz),pitch=Math.acos(clamp(dy/len,-1,1));this.push((ax+bx)/2,(ay+by)/2,(az+bz)/2,yaw,pitch);this.cylinder(0,0,0,r,len,col,6);this.pop()}
 torus(x,y,z,rad,tube,col,segments=35){this.push(x,y,z);for(let i=0;i<segments;i++){let a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;this.beam(rad*Math.cos(a),rad*Math.sin(a),0,rad*Math.cos(b),rad*Math.sin(b),0,tube,col)}this.pop()}
}
// A stylized 3D setting, inspired by the actual beachfront shopping district.
let staticMesh=new Mesh(),m=staticMesh,buildings=[],props=[],tourists=[],foods=[],poops=[],splats=[],popups=[],flags=[],landmarkEls=[],carObjects=[],petals=[];
function randColor(){return pick([[.9,.52,.4],[.5,.76,.83],[.95,.82,.42],[.71,.62,.83],[.75,.85,.67],[.92,.73,.65]])}
const facadeVertices=[],textureBuffer=gl.createBuffer();
const texturedVS=`attribute vec3 aPosition;attribute vec2 aUV;uniform mat4 uTransform;varying vec2 vUV;void main(){gl_Position=uTransform*vec4(aPosition,1.0);vUV=aUV;}`;
const texturedFS=`precision mediump float;varying vec2 vUV;uniform sampler2D uTexture;void main(){gl_FragColor=vec4(texture2D(uTexture,vUV).rgb,1.0);}`;
const texProgram=gl.createProgram();gl.attachShader(texProgram,shader(gl.VERTEX_SHADER,texturedVS));gl.attachShader(texProgram,shader(gl.FRAGMENT_SHADER,texturedFS));gl.linkProgram(texProgram);
const texPos=gl.getAttribLocation(texProgram,'aPosition'),texUV=gl.getAttribLocation(texProgram,'aUV'),texVP=gl.getUniformLocation(texProgram,'uTransform'),texSampler=gl.getUniformLocation(texProgram,'uTexture');
const stuccoTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,stuccoTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([210,188,160,255]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
const stuccoImage=new Image();stuccoImage.onload=()=>{gl.bindTexture(gl.TEXTURE_2D,stuccoTexture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,stuccoImage);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.REPEAT);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);};stuccoImage.src='assets/textures/stucco.svg';
function texturedFacade(x,z,w,d,h){let front=z+(z<12?d/2+.026:-d/2-.026),u=w/4,v=h/4;function vert(px,py,uu,vv){facadeVertices.push(px,py,front,uu,vv)}vert(x-w/2,.16,0,0);vert(x+w/2,.16,u,0);vert(x+w/2,h-.16,u,v);vert(x-w/2,.16,0,0);vert(x+w/2,h-.16,u,v);vert(x-w/2,h-.16,0,v)}
function drawFacades(vp){if(!facadeVertices.length)return;gl.useProgram(texProgram);gl.uniformMatrix4fv(texVP,false,new Float32Array(vp));gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,stuccoTexture);gl.uniform1i(texSampler,0);gl.bindBuffer(gl.ARRAY_BUFFER,textureBuffer);gl.vertexAttribPointer(texPos,3,gl.FLOAT,false,20,0);gl.vertexAttribPointer(texUV,2,gl.FLOAT,false,20,12);gl.enableVertexAttribArray(texPos);gl.enableVertexAttribArray(texUV);gl.disable(gl.CULL_FACE);gl.drawArrays(gl.TRIANGLES,0,facadeVertices.length/5);gl.enable(gl.CULL_FACE);gl.disableVertexAttribArray(texPos);gl.disableVertexAttribArray(texUV);gl.useProgram(program);gl.uniformMatrix4fv(uVP,false,new Float32Array(vp))}
function addBuilding(x,z,w,d,h,col,name){h*=1.75;buildings.push({x,z,w,d,h,name});m.box(x,h/2,z,w,h,d,col);texturedFacade(x,z,w,d,h);facadeDetails(x,z,w,d,h,col);m.box(x,h+.55,z,w+1,1.1,d+1,C.white);m.box(x,h+1.2,z,w+1.5,.32,d+1.5,C.roof);for(let k=-1;k<=1;k++){let wy=h*.58;if(w>8){m.box(x+k*w*.26,wy,z+(z<12? d/2+.07 : -d/2-.07),w*.18,h*.29,.15,[.26,.48,.59]);m.box(x+k*w*.26,wy,z+(z<12? d/2+.18 : -d/2-.18),w*.18,.26,.2,C.white);}}return {x,y:h+2,z,name};}
function facadeDetails(x,z,w,d,h,col){
 const front=z+(z<12?d/2+.18:-d/2-.18),direction=z<12?1:-1;
 const grout=[Math.max(.1,col[0]*.79),Math.max(.1,col[1]*.79),Math.max(.1,col[2]*.79)];
 const stone=[Math.min(1,col[0]*1.12),Math.min(1,col[1]*1.12),Math.min(1,col[2]*1.12)];
 for(let level=1;level<h/3.0;level++){let y=level*3.0; m.box(x,y,front,w,.065,.075,grout);}
 for(let j=0;j<Math.floor(w/3);j++){let xx=x-w/2+1.5+j*3;for(let level=0;level<h/3.0;level++){let y=level*3+1.35;if(j%3===1)m.box(xx,y,front+direction*.06,.055,2.0,.09,stone);}}
 for(let k of [-1,1])m.box(x+k*(w/2-.3),h/2,front+direction*.09,.25,h,.27,stone);
 m.box(x,3.4,front+direction*.35,w*.86,.17,.7,[.88,.82,.68]);
}
function palm(x,z,s=1){let h=7*s;m.cylinder(x,h/2,z,.26*s,h,[.55,.39,.26],7);m.ball(x,h+.1,z,.75*s,[.36,.57,.25],7);for(let i=0;i<7;i++){let a=i*6.28/7,dx=Math.cos(a)*3.7*s,dz=Math.sin(a)*3.7*s;m.beam(x,h+.25,z,x+dx,h-1.15*s,z+dz,.20*s,[.16,.51,.29]);m.cone(x+dx,h-.85*s,z+dz,.6*s,1.5*s,[.25,.62,.32],5)} }
// environment planes
m.box(0,-.65,-48,320,1.2,340,[.58,.75,.57]);m.box(0,-.10,105,360,.5,85,C.sand);m.box(0,-.30,264,600,.5,300,C.sea);m.box(0,.14,62,350,.1,18,C.road);m.box(0,.16,46.6,350,.16,7,C.side);m.box(0,.16,77.6,350,.16,6,C.side);m.box(0,.12,-49,23,.2,197,[.75,.69,.56]);m.box(0,.26,-49,17,.08,197,[.78,.76,.66]);
for(let x=-160;x<160;x+=16){m.box(x+.5,.21,62,8,.06,.26,[.96,.87,.64]);m.box(x,.28,46,1.2,.08,1.2,C.white);m.box(x,.28,78,1.2,.08,1.2,C.white);}
// shopping block rows
let shopNames=['ICE CREAM','SURF CO.','PIZZA JOINT','SOUVENIRS','BURGERS','ARCADE','SEASIDE CAFE','SUGAR SHOP','BEACH GRILL','TACO SHACK','BOARDWALK','DESSERTS'];let shopLabels=[];
for(let row of [-1,1])for(let i=0;i<9;i++){let z=27-i*19,x=row*(24+rnd(0,3)),col=randColor(),h=rnd(7.6,12.2),name=shopNames[(i+(row===1?0:5))%shopNames.length];let p=addBuilding(x,z,14,15,h,col,name);shopLabels.push({x:row*24,y:4.5,z,name});m.box(x,4.8,z+(z<12?7.65:-7.65),11,1.0,.22,pick([C.yellow,C.blue,C.pink,C.red]));for(let floor of [8.9,13.4])for(let k of [-1,0,1]){m.box(x+k*3.9,floor,z+(z<12?7.69:-7.69),2.3,2.6,.14,[.25,.46,.57]);m.box(x+k*3.9,floor+1.35,z+(z<12?7.78:-7.78),2.7,.17,.19,C.white);}for(let j=0;j<2;j++){m.box(x+(-1+j*2)*4,1.8,z+(z<12?7.7:-7.7),1.7,3.5,.25,[.24,.4,.48]);}}
// extended malls and plazas
addBuilding(-94,-110,42,39,18,[.84,.72,.60],'THE GRAND');addBuilding(88,-125,40,39,16,[.78,.76,.82],'SHOPS');addBuilding(77,-67,38,34,14,[.67,.77,.83],'DINING');addBuilding(-88,-57,37,32,17,[.91,.65,.59],'ENTERTAINMENT');
// pier park arch between streets
for(let x of [-11,11])m.box(x,5,-143,1.15,10,1.4,C.white);m.beam(-11,9,-143,11,9,-143,.50,C.white);m.beam(-11,10,-143,11,10,-143,.27,C.white);m.ball(0,9.1,-143,1.5,C.yellow);
// parking lots around shops
for(let s of [-1,1]){m.box(s*119,.13,-72,57,.1,145,[.37,.43,.46]);for(let i=0;i<7;i++)for(let j=0;j<4;j++){let x=s*(99+j*12),z=-129+i*20;m.box(x,.22,z,6,.05,.11,[.85,.84,.70]);}}
// pier and supports
m.box(8,.90,177,9,1.6,155,[.56,.41,.28]);m.box(8,1.02,177,8.3,.22,155,[.76,.61,.44]);for(let z=110;z<253;z+=10){for(let x of [3.4,12.6])m.cylinder(x,-1.4,z,.34,5,[.47,.32,.20],7);for(let x of [3.2,12.8]){m.beam(x,1.9,z,x,3,z,.16,C.white)}m.beam(3.2,2.6,z,12.8,2.6,z,.14,C.white);}m.box(8,.96,250,21,1.6,13,[.70,.54,.34]);m.box(8,1.8,250,19,.14,12,[.75,.58,.39]);
// ferris wheel (actual 3D geometry)
const wheel={x:-61,y:28,z:3,r:24};for(let side of [-1,1]){let wz=wheel.z+side*2.3;m.torus(wheel.x,wheel.y,wz,wheel.r,.37,C.white,40);for(let i=0;i<12;i++){let a=i*Math.PI/6;m.beam(wheel.x,wheel.y,wz,wheel.x+Math.cos(a)*wheel.r,wheel.y+Math.sin(a)*wheel.r,wz,.17,C.white);}m.beam(wheel.x-14,.5,wz,wheel.x,28,wz,.56,[.83,.86,.89]);m.beam(wheel.x+14,.5,wz,wheel.x,28,wz,.56,[.83,.86,.89]);}m.beam(wheel.x,wheel.y,wheel.z-4,wheel.x,wheel.y,wheel.z+4,.7,C.ink);m.box(wheel.x,1,wheel.z,34,1.5,15,C.road);
// gondolas dynamic
const gondolas=Array.from({length:16},(_,i)=>({a:i*Math.PI/8,color:pick([C.blue,C.pink,C.yellow,[.54,.87,.78]])}));
// trees and streetlights
for(let z=-139;z<43;z+=22)for(let x of [-13,13]){palm(x,z,rnd(.82,1.1));m.cylinder(x>0?x+2:x-2,3,z+6,.10,6,C.ink,6);m.ball(x>0?x+2:x-2,6,z+6,.55,C.yellow,8,4)}
for(let x=-139;x<140;x+=30)for(let z of [42,83])palm(x,z,1.0);
// pavilion, signs, flags
m.box(-25,2,90,21,4,9,[.75,.54,.4]);m.box(-25,4.4,90,23,.8,10,[.93,.4,.3]);m.box(-25,6.8,90,1.4,5,1.5,C.white);
for(let x of [-125,100]){m.box(x,3.3,93,2.5,6.6,.4,C.white);m.box(x,6.4,93,8,1.7,.5,C.blue);}
// nest atop east mall (accessible)
const nestRoof=buildings.find(b=>b.x>0&&Math.abs(b.z+87)<1);
const nest={x:nestRoof?nestRoof.x:25,y:nestRoof?nestRoof.h+1.9:22,z:-87};m.cylinder(nest.x,nest.y-.6,nest.z,4.0,.45,[.36,.23,.12],12);m.torus(nest.x,nest.y-.6,nest.z,3.2,.35,[.51,.34,.16],18);for(let i=0;i<14;i++){let a=i/14*Math.PI*2;m.beam(nest.x+Math.cos(a)*2.6,nest.y-.3,nest.z+Math.sin(a)*2.6,nest.x+Math.cos(a+1)*3.3,nest.y-.1,nest.z+Math.sin(a+1)*3.3,.14,[.54,.36,.20]);}
// beach props & food zones
function addProp(x,z,type){let p={x,y:0,z,type,vx:0,vy:0,vz:0,tip:0,spin:0,active:true,hit:false,cooldown:0,col:pick([C.yellow,C.blue,C.red,[.35,.85,.71]])};props.push(p);return p;}
for(let i=0;i<21;i++){let x=rnd(-135,140),z=rnd(88,116);addProp(x,z,i%3===0?'umbrella':i%3===1?'chair':'ball');}
for(let i=0;i<17;i++)addProp(rnd(-6,6),rnd(-124,29),i%3===0?'trash':i%3===1?'table':'chair');
for(let i=0;i<11;i++)addProp(rnd(-40,-12),rnd(-110,35),'table');
for(let i=0;i<7;i++)addProp(rnd(13,41),rnd(-100,30),'trash');
for(let i=0;i<34;i++){let f={x: i<15? rnd(-6,6):rnd(-130,135), z:i<15?rnd(-115,28):rnd(89,118),y:1.2,type:pick(['FRIES','PIZZA','BURGER','ICE CREAM','HOT DOG']),available:true,timer:0,rot:rnd(0,6.2)};foods.push(f);}
// people wandering
const outfits=[[.15,.61,.91],[.95,.31,.31],[.35,.79,.57],[.99,.72,.28],[.65,.47,.91],[.95,.59,.40]];
for(let i=0;i<65;i++){let beach=i>37;let x=beach?rnd(-125,128):rnd(-10,10),z=beach?rnd(88,117):rnd(-135,29);tourists.push({x,z,baseX:x,baseZ:z,dir:rnd(0,6.28),speed:rnd(.5,1.6),phase:rnd(0,6.28),shirt:pick(outfits),skin:pick([[.92,.70,.5],[.63,.43,.30],[.93,.79,.63],[.36,.25,.19]]),scared:0,hit:0,timer:rnd(.5,5),onPier:false});}
for(let i=0;i<9;i++){let z=rnd(126,250);tourists.push({x:rnd(5,10),z,baseX:8,baseZ:z,dir:rnd(0,6.28),speed:rnd(.3,1),phase:rnd(0,6.28),shirt:pick(outfits),skin:[.85,.65,.48],scared:0,hit:0,timer:rnd(1,4),onPier:true});}
// Some snacks belong to actual wandering tourists rather than floating on the pavement.
for(let i=0;i<20;i++){foods[i].holder=tourists[(i*3)%tourists.length];foods[i].type=['FRIES','BURGER','PIZZA','ICE CREAM','HOT DOG'][i%5];}
// stationary colored cars and a few moving
for(let i=0;i<24;i++){let side=i%2?1:-1,x=side*rnd(106,137),z=rnd(-128,-13),col=pick([C.red,C.blue,C.white,C.yellow,[.39,.41,.49]]);carObjects.push({x,z,v:0,col});}
for(let i=0;i<8;i++)carObjects.push({x:-150+i*32,z:57.9,v:(i%2?-1:1)*rnd(4,8),col:pick([C.white,C.red,C.blue,[.2,.3,.36]])});
// always present detailed road furniture
for(let x=-145;x<150;x+=26){m.box(x,2.2,41,.25,4.4,.25,C.ink);m.ball(x,4.5,41,.5,C.white,7);}
const staticData=new Float32Array(m.d);m.d=[];gl.bindBuffer(gl.ARRAY_BUFFER,staticBuffer);gl.bufferData(gl.ARRAY_BUFFER,staticData,gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,textureBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(facadeVertices),gl.STATIC_DRAW);let staticCount=staticData.length/9;
function bindAndDraw(buf,count){gl.bindBuffer(gl.ARRAY_BUFFER,buf);let stride=9*4;gl.vertexAttribPointer(aPos,3,gl.FLOAT,false,stride,0);gl.vertexAttribPointer(aN,3,gl.FLOAT,false,stride,12);gl.vertexAttribPointer(aCol,3,gl.FLOAT,false,stride,24);gl.enableVertexAttribArray(aPos);gl.enableVertexAttribArray(aN);gl.enableVertexAttribArray(aCol);gl.drawArrays(gl.TRIANGLES,0,count);}
// gameplay
let player={x:0,y:13,z:34,yaw:0,pitch:0,roll:0,speed:12,vy:0,grounded:false,landing:false,stamina:100,carrying:null,poopAmmo:2,maxPoop:10,poopCooldown:0,screechCooldown:0,stealCooldown:0,flapPhase:0,wingPhase:0},state='menu',keys={},joy={x:0,y:0},touchButtons={},camera={x:0,y:20,z:54},countTime=0,score=0,wanted=0,combo=0,comboTimer=0,missionIndex=0,missionProgress=0,lastTime=performance.now(),time=0,nextHud=0,toastTimer=0,markerPulse=0,soundCtx=null,record=(()=>{try{return +(localStorage.getItem('gull3d_record')||0)}catch(e){return 0}})();
const missions=[
{title:'THE GREAT SNACK HEIST',desc:'Steal 2 snacks near the Pier Park shops. Look for food on the minimap or in tourists’ hands; press E or F nearby.',goal:2,type:'steal'},
{title:'FUEL THE WEAPON',desc:'Press E again while carrying food to EAT it. Eat twice to load up your poop ammo.',goal:2,type:'eat'},
{title:'SPECIAL DELIVERY',desc:'Fly OVER tourists, line up the projected landing reticle and poop on 2 people with Q.',goal:2,type:'hit'},
{title:'BEACH FURNITURE IS OPTIONAL',desc:'Go to the sandy beach. Dive or smash 3 chairs, umbrellas, coolers or balls.',goal:3,type:'prop'},
{title:'SCREAM AND SCATTER',desc:'Get low near tourists and press R to SCREECH. Frighten 5 people.',goal:5,type:'screech'},
{title:'UNLIMITED BUFFET',desc:'Eat 3 more snacks to refill your bombs. Food respawns after 16 seconds.',goal:3,type:'eat'},
{title:'PARKING LOT JUSTICE',desc:'Bomb 2 cars in Pier Park parking lots. Aim carefully and fly over roofs.',goal:2,type:'car'},
{title:'NEST EGG',desc:'Steal 2 snacks and deliver them to your rooftop nest instead of eating.',goal:2,type:'deliver'},
{title:'PIER PRESSURE',desc:'Poop on 2 tourists standing on Russell-Fields Pier.',goal:2,type:'pier'},
{title:'WHEEL OF MISFORTUNE',desc:'Fly through the CENTER of the huge SkyWheel without hitting a gondola.',goal:1,type:'wheel'},
{title:'THE GULL RUN',desc:'Fly through all 5 glowing checkpoints in order, starting over the main shopping street.',goal:5,type:'rings'},
{title:'SHOPPING DISTRICT DISASTER',desc:'Knock over 4 trash cans, chairs, or tables INSIDE the shopping district.',goal:4,type:'mallprop'},
{title:'ICE CREAM EMERGENCY',desc:'Steal an ICE CREAM near the beach or shopping promenade.',goal:1,type:'icecream'},
{title:'APEX MENACE',desc:'Earn 1,800 EXTRA havoc points any way you want. Food, bombing, or rampaging through furniture.',goal:1800,type:'chaos'}];let endGame=false,chaosAt=0,missionNotice=0,ringProgress=0;const flightRings=[{x:0,y:13,z:-28},{x:0,y:16,z:-69},{x:0,y:21,z:-118},{x:-33,y:19,z:-76},{x:-52,y:28,z:-15}];
const el=id=>document.getElementById(id),$toast=el('toast'),$menu=el('menu'),$overlay=el('overlay');
const locationLabels=[{x:-61,y:56,z:3,name:'🎡 SKYWHEEL',kind:'landmark'}, {x:8,y:7,z:112,name:'RUSSELL-FIELDS PIER',kind:'landmark'},{x:0,y:14,z:-143,name:'PIER PARK',kind:'landmark'},{x:nest.x,y:nest.y+3,z:nest.z,name:'🥨 YOUR NEST',kind:'target'}];
locationLabels.forEach(o=>{let e=document.createElement('div');e.className='worldlabel '+o.kind;e.textContent=o.name;el('labels').append(e);o.el=e});
function audio(freq=420,duration=.13,type='sine',slide=0){try{if(!soundCtx)soundCtx=new (window.AudioContext||window.webkitAudioContext)();let t=soundCtx.currentTime,o=soundCtx.createOscillator(),g=soundCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(40,freq+slide),t+duration);g.gain.setValueAtTime(.075,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(soundCtx.destination);o.start(t);o.stop(t+duration+.005);}catch(e){}}
function squawk(){audio(760,.18,'sawtooth',-490);setTimeout(()=>audio(560,.1,'square',-240),90)}
function toast(title,subtitle=''){ $toast.innerHTML=title+(subtitle?`<small>${subtitle}</small>`:'');$toast.classList.add('show');toastTimer=2.0; }
function getMission(){return missions[Math.min(missionIndex,missions.length-1)]}
function advance(type,n=1){if(endGame)return;let mis=getMission();if(type==='chaos'&&mis.type==='chaos')missionProgress=score-chaosAt;else if(mis.type===type)missionProgress+=n;if(missionProgress>=mis.goal){score+=300;audio(520,.23,'triangle',450);setTimeout(()=>audio(660,.25,'triangle',480),160);toast('MISSION COMPLETE! +300','NEXT OBJECTIVE UNLOCKED');missionIndex++;missionProgress=0;ringProgress=0;if(missionIndex>=missions.length){endGame=true;toast('👑 KING OF THE GULLS!','ALL MISSIONS DONE · FREE FLIGHT UNLOCKED');}else if(getMission().type==='chaos')chaosAt=score;}}
function award(points,text='',kind=''){let gained=Math.floor(points*(comboTimer>0?1+Math.min(combo*.13,1.5):1));score+=gained;combo++;comboTimer=6;wanted=clamp(wanted+points/250,0,5);if(text)toast(text,`+${gained} CHAOS POINTS${combo>2?' · '+combo+'x COMBO!':''}`);if(missionIndex<missions.length&&getMission().type==='chaos')advance('chaos');if(score>record){record=score;try{localStorage.setItem('gull3d_record',record)}catch(e){}} }
function nearestFood(){let a=null,d=999;for(let f of foods){if(!f.available)continue;let dd=Math.hypot(player.x-f.x,player.y-(f.y+1),player.z-f.z);if(dd<d){d=dd;a=f}}return {a,d}}
function steal(){if(player.stealCooldown>0)return;player.stealCooldown=.33;if(player.carrying){let f=player.carrying;f.timer=16;player.carrying=null;let n=f.type==='ICE CREAM'?4:3,was=player.poopAmmo;player.poopAmmo=Math.min(player.maxPoop,player.poopAmmo+n);award(95,'NOM NOM! +'+(player.poopAmmo-was)+' POOP 💩');advance('eat');audio(330,.15,'triangle',260);return;}
let {a:f,d}=nearestFood();if(f&&d<8){player.carrying=f;f.available=false;f.timer=17;if(f.holder){f.holder.scared=2.4;f.holder.dir=Math.atan2(f.holder.x-player.x,f.holder.z-player.z);}award(85,pick(['SNACK JACKED!','LUNCH IS MINE!','FRENCH FRY FELONY!','PETTY LARCENY!']));advance('steal');if(f.type==='ICE CREAM')advance('icecream');squawk();}else toast('GET CLOSER TO FOOD','Look for snacks carried by tourists or the yellow food dots on your minimap · E to grab');}
function poop(){if(player.poopCooldown>0)return;if(player.poopAmmo<=0){player.poopCooldown=.45;toast('💩 OUT OF AMMO','Steal food and press E AGAIN to eat and reload!');audio(120,.2,'square',-50);return;}player.poopAmmo--;player.poopCooldown=.46;let fx=-Math.sin(player.yaw),fz=-Math.cos(player.yaw);poops.push({x:player.x+fx*.35,y:player.y-.34,z:player.z+fz*.35,vx:fx*player.speed*.4,vy:player.vy-5,vz:fz*player.speed*.4,ttl:7});audio(160,.13,'sine',-100);}
function spawnSplat(x,y,z){splats.push({x,y,z,r:.4+rnd(0,.6),ttl:12});audio(215,.14,'triangle',-165);}
function scare(p,reason){if(p.scared>0)return;p.scared=2.5;p.dir=Math.atan2(p.x-player.x,p.z-player.z);award(18,reason==='dive'?'TERROR FROM ABOVE!':'TOURIST PANIC!');advance('scare');}
function screech(){if(state!=='play'||player.screechCooldown>0)return;player.screechCooldown=2.2;squawk();let n=0;for(let t of tourists){if(Math.hypot(t.x-player.x,t.z-player.z)<13&&player.y<14&&t.scared<=0){scare(t,'screech');n++;}}if(n)advance('screech',n);else toast('SCREEEECH!','Get lower and nearer to a crowd for maximum panic');}
function respawn(){player.x=0;player.y=13;player.z=34;player.yaw=0;player.vy=0;player.speed=13;player.stamina=100;player.grounded=false;player.landing=false;player.carrying=null;toast('BACK IN THE SKY','THE MENACE RETURNS');}
function flipState(){if(state==='menu'){state='play';$overlay.classList.add('hidden');el('hud').classList.remove('hidden');el('mobile').classList.remove('hidden');soundCtx=null;toast('WELCOME TO PIER PARK','THE SKIES BELONG TO YOU');return;}if(state==='play'){state='paused';$overlay.classList.remove('hidden');el('startBtn').textContent='RESUME THE CHAOS →';el('menuDesc').textContent='Your reign of airborne terror is on pause. Ready to harass more tourists?';document.exitPointerLock?.();}else if(state==='paused'){state='play';$overlay.classList.add('hidden');}}
el('startBtn').onclick=flipState;el('pauseBtn').onclick=flipState;
window.addEventListener('keydown',e=>{if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();keys[e.code]=true;if(!e.repeat&&state==='play'){if(e.code==='KeyE'||e.code==='KeyF')steal();if(e.code==='KeyQ'||e.code==='KeyG')poop();if(e.code==='KeyR')screech();if(e.code==='KeyL')toggleLand();if(e.code==='Space'&&player.grounded)takeoff();if(e.code==='KeyT')respawn();}if(!e.repeat&&e.code==='Escape')flipState();});window.addEventListener('keyup',e=>{keys[e.code]=false});window.addEventListener('blur',()=>{keys={};touchButtons={}});
canvas.addEventListener('click',()=>{if(state==='play'&&matchMedia('(pointer:fine)').matches)canvas.requestPointerLock?.()});document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&state==='play'){player.yaw+=e.movementX*.0022;player.pitch=clamp(player.pitch-e.movementY*.0016,-.65,.55);}});
const joybase=el('joystick'),knob=el('knob');let activeId=null;const updateJoy=e=>{let b=joybase.getBoundingClientRect(),range=(b.width-knob.offsetWidth)/2,x=(e.clientX-b.left-b.width/2)/range,y=(e.clientY-b.top-b.height/2)/range,l=Math.max(1,Math.hypot(x,y));joy.x=Math.abs(x/l)<.10?0:x/l;joy.y=Math.abs(y/l)<.10?0:y/l;knob.style.transform=`translate(${joy.x*range}px,${joy.y*range}px)`};joybase.addEventListener('pointerdown',e=>{activeId=e.pointerId;joybase.setPointerCapture(activeId);updateJoy(e)});joybase.addEventListener('pointermove',e=>{if(e.pointerId===activeId)updateJoy(e)});function releaseJoy(){activeId=null;joy.x=joy.y=0;knob.style.transform='translate(0,0)'}joybase.addEventListener('pointerup',releaseJoy);joybase.addEventListener('pointercancel',releaseJoy);
for(let b of document.querySelectorAll('#actions button')){let t=b.dataset.control;b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touchButtons[t]=true;if(state==='play'){if(t==='steal')steal();if(t==='poop')poop();if(t==='screech')screech();if(t==='land')toggleLand();}});b.addEventListener('pointerup',()=>touchButtons[t]=false);b.addEventListener('pointercancel',()=>touchButtons[t]=false);}
let view=matIdentity(),worldTarget={x:0,y:9,z:0},onTop=false;
function standingSurface(x,z){
 // Deck and rooftop heights are sourced from the actual city geometry.
 if(x>=-3&&x<=19&&z>=244&&z<=256)return 1.89;
 if(x>=3.2&&x<=12.8&&z>=99.5&&z<=255)return 1.14;
 for(let b of buildings){if(Math.abs(x-b.x)<b.w*.5&&Math.abs(z-b.z)<b.d*.5)return b.h+1.38;}
 // No hovering in place on the open ocean.
 if(z>147.5)return null;
 return z>82?.18:.32;
}
function takeoff(){if(!player.grounded&&!player.landing)return;player.grounded=false;player.landing=false;player.y+=.25;player.vy=8.5;player.speed=Math.max(8,player.speed);player.pitch=-.1;toast('WINGS UP!','SPACE to climb · L to land again');}
function toggleLand(){if(player.grounded){takeoff();return;}if(player.landing){player.landing=false;toast('LANDING ABORTED','You are airborne');return;}
 if(standingSurface(player.x,player.z)===null){toast('NO LANDING ON OPEN WATER','Aim for sand, sidewalks, a rooftop, or the pier');return;}
 player.landing=true;player.vy=Math.min(player.vy,-2);toast('COMING IN TO LAND','Slowing down · press SPACE or L to cancel');}

function movement(dt){
 player.stealCooldown=Math.max(0,player.stealCooldown-dt);player.screechCooldown=Math.max(0,player.screechCooldown-dt);player.poopCooldown=Math.max(0,player.poopCooldown-dt);
 let rawSteer=(keys.KeyD||keys.ArrowRight?1:0)-(keys.KeyA||keys.ArrowLeft?1:0)-joy.x;
 let steer=Math.sign(rawSteer)*Math.pow(Math.min(1,Math.abs(rawSteer)),1.45);
 let rawThrottle=(keys.KeyW||keys.ArrowUp?1:0)-(keys.KeyS||keys.ArrowDown?1:0)-joy.y;
 let throttle=Math.sign(rawThrottle)*Math.pow(Math.min(1,Math.abs(rawThrottle)),1.25);
 let flap=keys.Space||touchButtons.flap,dive=keys.ShiftLeft||keys.ShiftRight||touchButtons.dive,braking=keys.KeyZ||keys.ControlLeft||keys.ControlRight||touchButtons.brake;
 if(player.grounded){
  if(flap){takeoff();}
  else {
   player.yaw+=steer*dt*2.65;player.roll+=(0-player.roll)*Math.min(1,dt*6);player.pitch+=(0-player.pitch)*Math.min(1,dt*6);player.vy=0;
   player.speed=Math.abs(throttle)*4.5;let dx=-Math.sin(player.yaw)*throttle*4.5*dt,dz=-Math.cos(player.yaw)*throttle*4.5*dt;
   let next=standingSurface(player.x+dx,player.z+dz),here=standingSurface(player.x,player.z);
   if(next!==null&&here!==null&&next-here<.65){player.x+=dx;player.z+=dz;player.y=next+.40;}
   else if(next!==null&&here!==null&&here-next>1.2){player.grounded=false;player.vy=-1;player.x+=dx;player.z+=dz;}
   player.stamina=clamp(player.stamina+24*dt,0,100);
  }
 }
 if(!player.grounded){
  player.yaw+=steer*dt*(player.speed<11?2.25:1.9);player.roll+=(clamp(-steer*.4,-.52,.52)-player.roll)*Math.min(1,dt*5);
  player.pitch+=(0-player.pitch)*Math.min(1,dt*.7);
  if(player.landing){
   // A deliberately slow, steerable approach; no forced forward zooming on touchdown.
   player.speed+=(2.0-player.speed)*Math.min(1,dt*3.2);player.vy+=( -6.3-player.vy)*Math.min(1,dt*2.7);
   if(flap){player.landing=false;player.vy=Math.max(player.vy,4);}
  }else{
   player.speed=clamp(player.speed+throttle*dt*11-(Math.abs(throttle)<.08?(player.speed-8)*1.9*dt:0),3,25);
   if(braking)player.speed+=(5-player.speed)*Math.min(1,dt*3.5);
   if(flap&&player.stamina>3){player.vy+=27*dt;player.stamina-=32*dt;player.wingPhase+=dt*19;audioFlapTimer-=dt;
    if(audioFlapTimer<0){audioFlapTimer=.5;audio(175,.12,'triangle',-60);}}
   else{player.stamina=clamp(player.stamina+14*dt,0,100);audioFlapTimer=0;}
   if(dive){player.vy-=34*dt;player.speed=Math.min(41,player.speed+14*dt);player.pitch+=(-.48-player.pitch)*dt*3;}
   if(!dive){const sink=flap?-0.4:-2.7;player.vy+=(sink-player.vy)*Math.min(1,dt*(flap?.35:1.9));}else player.vy-=8*dt;
  }
  player.vy=clamp(player.vy,-22,14);
  let fx=-Math.sin(player.yaw),fz=-Math.cos(player.yaw);player.x+=fx*player.speed*dt;player.z+=fz*player.speed*dt;player.y+=player.vy*dt;
  let surface=standingSurface(player.x,player.z);
  if(player.landing){
   if(surface===null){player.landing=false;toast('WATER AHEAD','Landing cancelled — steer back over solid ground');}
   else if(player.y<=surface+.40){player.y=surface+.40;player.grounded=true;player.landing=false;player.vy=0;player.speed=0;player.roll=0;player.pitch=0;toast('TOUCHDOWN!','W/S walk · A/D turn · E steal/eat · SPACE or L take off');audio(225,.11,'sine',-55);}
  }
  if(!player.grounded){let floor=surface===null?1.6:Math.max(1.6,surface+1.40);
   if(player.y<floor&&!player.landing){player.y=floor;player.vy=Math.max(0,player.vy);player.speed=Math.max(3,player.speed*.98);}
   if(player.y>104){player.y=104;player.vy=Math.min(0,player.vy);}}
 }
 if(Math.abs(player.x)>172||player.z>290||player.z< -173){player.x=clamp(player.x,-166,166);player.z=clamp(player.z,-167,282);player.y=Math.max(player.y,6);player.yaw+=Math.PI*.75;player.grounded=false;player.landing=false;}
// physical wall collision below rooftops
for(let b of buildings){if(player.y>b.h+.85)continue;let dx=player.x-b.x,dz=player.z-b.z,ox=b.w/2+1.0-Math.abs(dx),oz=b.d/2+1.0-Math.abs(dz);if(ox>0&&oz>0){if(ox<oz)player.x+=(dx<0?-1:1)*ox;else player.z+=(dz<0?-1:1)*oz;player.speed*=.76;player.vy=Math.max(2,player.vy);}}
if(player.carrying){let dst=Math.hypot(player.x-nest.x,player.y-nest.y,player.z-nest.z);if(dst<6.0){player.carrying.timer=25;player.carrying=null;award(240,'DELIVERY TO THE NEST!','deliver');advance('deliver');}}
// flyby interactions
for(let p of tourists){if(p.scared>0)continue;let horizontal=Math.hypot(player.x-p.x,player.z-p.z);if(horizontal<1.72&&player.y<5.25&&player.speed>12){scare(p,!!dive?'dive':'');player.speed=Math.max(7,player.speed*.85);}}
for(let p of props){if(p.cooldown>0)continue;let d=Math.hypot(player.x-p.x,player.z-p.z);if(d<1.8&&player.y<4.1&&player.speed>8){let fx=-Math.sin(player.yaw),fz=-Math.cos(player.yaw);p.vx=fx*(player.speed*.48)+rnd(-4,4);p.vz=fz*(player.speed*.48)+rnd(-4,4);p.vy=5+rnd(0,3);p.tip+=1.1;p.spin=rnd(-2,2);p.active=true;p.cooldown=1.0;if(!p.hit){p.hit=true;award(95,pick(['CHAIR-SMASHING GULL!','UMBRELLA ASSAULT!','PROPERTY DAMAGE!','TOTAL MAYHEM!']));if(p.z>85)advance('prop');else advance('mallprop');}audio(190,.18,'square',-130);player.vy=Math.max(player.vy,2);}}
// fly through wheel for mission
if(missionIndex<missions.length&&getMission().type==='wheel'){let dx=player.x-wheel.x,dy=player.y-wheel.y;if(Math.abs(player.z-wheel.z)<3.2&&dx*dx+dy*dy<sq(12)){award(400,'WHEEL-Y AMAZING!');advance('wheel');}}if(missionIndex<missions.length&&getMission().type==='rings'){let ring=flightRings[ringProgress];if(ring&&Math.hypot(player.x-ring.x,player.y-ring.y,player.z-ring.z)<5.6){ringProgress++;award(90,'RING '+ringProgress+' / 5');advance('rings');}}
}
let audioFlapTimer=0;
function updateActors(dt){time+=dt;countTime+=dt;markerPulse+=dt*3.0;wanted=Math.max(0,wanted-dt*.025);if(comboTimer>0){comboTimer-=dt;if(comboTimer<=0)combo=0;}
for(let p of tourists){p.phase+=dt*5;p.hit=Math.max(0,p.hit-dt);if(p.scared>0){p.scared-=dt;p.x+=Math.sin(p.dir)*dt*2.5;p.z+=Math.cos(p.dir)*dt*2.5;}else{p.timer-=dt;if(p.timer<=0){p.timer=rnd(1.5,6);p.dir=rnd(-Math.PI,Math.PI)}p.x+=Math.sin(p.dir)*p.speed*dt;p.z+=Math.cos(p.dir)*p.speed*dt;}if(p.onPier){p.x=clamp(p.x,4.7,11.2);p.z=clamp(p.z,113,252);}else if(p.baseZ>80){p.x=clamp(p.x,-133,135);p.z=clamp(p.z,86,119);}else{p.x=clamp(p.x,-10,10);p.z=clamp(p.z,-139,37);}}
for(let f of foods)if(f.holder&&f.available){let t=f.holder;f.x=t.x+Math.cos(t.dir)*.55;f.z=t.z+Math.sin(t.dir)*.55;f.y=(t.onPier?1.14:0)+1.60;}for(let p of props){p.cooldown=Math.max(0,p.cooldown-dt);if(!p.active)continue;if(Math.abs(p.vx)+Math.abs(p.vz)+Math.abs(p.vy)<.08)continue;p.x+=p.vx*dt;p.z+=p.vz*dt;p.y+=p.vy*dt;p.vy-=18*dt;p.vx*=Math.pow(.77,dt*6);p.vz*=Math.pow(.77,dt*6);p.tip+=p.spin*dt;if(p.y<0){p.y=0;p.vy=p.vy<-1?-p.vy*.26:0;p.spin*=.72;}}
for(let f of foods)if(!f.available&&f!==player.carrying){f.timer-=dt;if(f.timer<=0){f.available=true;f.y=1.2;}}
for(let p of poops){p.ttl-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=29*dt;let hit=false;for(let t of tourists){if(p.ttl<=0||hit)break;if(Math.hypot(p.x-t.x,p.z-t.z)<1.5&&p.y<(t.onPier?4.95:3.80)&&p.y>(t.onPier?1.05:-.3)){t.hit=4;t.scared=4;t.dir=rnd(-3,3);spawnSplat(p.x,(t.onPier?1.14:0)+3.05,p.z);award(t.onPier?230:170,pick(['DIRECT HIT! 💩','POOP STRIKE!','YOU ABSOLUTE MENACE!','BIRD BOMB!']));advance('hit');if(t.onPier)advance('pier');p.ttl=0;hit=true;}}if(!hit){for(let c of carObjects){if(Math.abs(p.x-c.x)<2.4&&Math.abs(p.z-c.z)<1.65&&p.y<2.2&&p.y>0){spawnSplat(p.x,1.75,p.z);award(140,'WINDSHIELD WASH REQUIRED!');advance('car');p.ttl=0;hit=true;break;}}}if(!hit&&p.y<=(standingSurface(p.x,p.z)??0)){spawnSplat(p.x,(standingSurface(p.x,p.z)??0)+.05,p.z);p.ttl=0;award(3);}}
poops=poops.filter(p=>p.ttl>0);for(let s of splats)s.ttl-=dt;splats=splats.filter(s=>s.ttl>0);for(let c of carObjects){if(!c.v)continue;c.x+=c.v*dt;if(Math.abs(c.x)>156)c.v*=-1;}
}
function makeNPC(mesh,p){let bob=p.hit>0?-.55:Math.abs(Math.sin(p.phase))*.08,tip=p.hit>0?-.7:0;mesh.push(p.x,p.onPier?1.14:0,p.z,p.dir||0,0,tip);mesh.scale(1.95);mesh.cylinder(0,.68+bob,0,.26,1.0,p.shirt,7);mesh.ball(0,1.47+bob,0,.31,p.skin,7,5);mesh.box(0,1.73+bob,.08,.35,.11,.4,[.26,.22,.18]);let step=p.scared>0?Math.sin(p.phase)*.45:Math.sin(p.phase)*.23;for(let s of [-1,1]){mesh.push(s*.15,.26,0,0,step*s,0);mesh.cylinder(0,0,0,.095,.54,[.24,.3,.38],6);mesh.pop();mesh.push(s*.37,1.02+bob,0,0,p.scared>0?-1.1:step*s*.5,0);mesh.cylinder(0,-.12,0,.10,.6,p.skin,5);mesh.pop()}if(p.hit>0){mesh.ball(0,1.88,-.15,.24,[.94,.95,.89],7,4);}mesh.pop();mesh.pop()}
function renderProp(mesh,p){mesh.push(p.x,p.y,p.z,0,0,clamp(p.tip,-1.35,1.35));if(p.type==='umbrella'){mesh.cylinder(0,1.6,0,.085,3.2,[.83,.82,.76],6);for(let i=0;i<8;i++){let a=i*Math.PI/4,b=(i+1)*Math.PI/4;mesh.tri([0,3.6,0],[Math.cos(a)*2.0,2.7,Math.sin(a)*2.0],[Math.cos(b)*2.0,2.7,Math.sin(b)*2.0],i%2?p.col:C.white)}}
if(p.type==='chair'){mesh.push(0,.35,0,0,0,-.14);mesh.box(0,.4,0,1.7,.2,1.15,p.col);mesh.box(0,1,-.47,1.7,1.1,.22,p.col);for(let s of [-1,1])for(let t of [-1,1])mesh.cylinder(s*.68,.15,t*.43,.08,.3,C.wood,5);mesh.pop()}
if(p.type==='ball'){mesh.ball(0,.8,0,1,p.col,10,7);mesh.torus(0,.8,0,.7,.09,C.white,14)}
if(p.type==='trash'){mesh.cylinder(0,.75,0,.75,1.5,[.26,.48,.45],9);mesh.cylinder(0,1.5,0,.87,.18,C.ink,9)}
if(p.type==='table'){mesh.cylinder(0,.8,0,.09,1.6,C.wood);mesh.cylinder(0,1.7,0,1.3,.19,[.8,.54,.34],9)}mesh.pop();}
function renderFood(mesh,f){let x=f.x,y=f.y,z=f.z,t=f.type,c=f.available?C.yellow:[.6,.6,.6];mesh.push(x,y,z, f.rot);if(t==='FRIES'){mesh.box(0,0,0,.65,.62,.45,C.red);for(let i=0;i<5;i++)mesh.box((i-2)*.1,.42,0,.075,.44,.075,C.yellow)}if(t==='PIZZA'){mesh.cone(0,0,0,.6,.22,[.91,.6,.27],3);mesh.ball(0,.15,0,.17,C.red,6,4)}if(t==='BURGER'){mesh.cylinder(0,0,0,.6,.23,[.53,.29,.15]);mesh.cylinder(0,.22,0,.61,.16,C.palm);mesh.ball(0,.43,0,.62,C.yellow,8,4)}if(t==='ICE CREAM'){mesh.cone(0,-.04,0,.33,.7,[.67,.44,.25]);mesh.ball(0,.46,0,.36,C.pink,8,5)}if(t==='HOT DOG'){mesh.box(0,0,0,1.0,.3,.4,[.84,.58,.31]);mesh.cylinder(0,.23,0,.19,.82,C.red,7)}mesh.pop();}
function renderBird(mesh){let p=player,active=keys.Space||touchButtons.flap,flap=p.grounded?-.55:Math.sin(time*(active?16:6.5))*(active?.66:.13);mesh.push(p.x,p.y,p.z,p.yaw,p.pitch,p.roll);mesh.scale(.28);
// Gull from behind: gray dorsal body, white head and breast, gold beak, dark wingtips.
mesh.ball(0,0,.15,.99,[.82,.87,.90],12,8);mesh.ball(0,-.25,-.45,.79,C.white,11,7);mesh.ball(0,.28,-.89,.60,C.white,11,8);mesh.ball(0,.25,-1.38,.42,C.white,9,6);
mesh.push(0,.07,-1.73,0,-Math.PI/2);mesh.cone(0,0,0,.31,.79,C.yellow,7);mesh.pop();
mesh.ball(-.33,.44,-1.58,.13,[.10,.14,.15],9,6);mesh.ball(.33,.44,-1.58,.13,[.10,.14,.15],9,6);
mesh.ball(-.35,.47,-1.59,.042,C.white,7,5);mesh.ball(.35,.47,-1.59,.042,C.white,7,5);
// Double-sided geometry prevents back-face culling from hiding the mirrored wing.
function feather(a,b,c,col){mesh.tri(a,b,c,col);mesh.tri(c,b,a,col)}
for(let side of [-1,1]){
 mesh.push(side*.61,.19,-.19,0,0,side*(flap+Math.sin(time*2)*.03));
 // Tapered wing planform: shoulder -> elbow -> wrist -> four separate primaries.
 let S=q=>side*q;
 let q0=[0,0,-.5],q1=[S(1.10),.13,-.66],q2=[S(2.20),.19,-.44],q3=[S(3.62),.18,-.30],q4=[S(3.00),.12,.08],q5=[S(1.72),-.02,.54],q6=[S(.25),-.03,.50];
 feather(q0,q1,q6,C.white);feather(q1,q5,q6,[.86,.91,.95]);feather(q1,q2,q5,[.81,.86,.91]);feather(q2,q4,q5,[.80,.85,.9]);feather(q2,q3,q4,[.28,.33,.39]);
 for(let i=0;i<5;i++){let from=2.12+i*.27,back=.13+i*.06;feather([S(from),.1,-.28],[S(from+.45),.10,-.45+back],[S(from+.20),.09,.21+back],[.21,.27,.33]);}
 for(let i=0;i<5;i++)feather([S(1.25+i*.29),-.01,.25],[S(1.34+i*.27),-.02,.50],[S(1.62+i*.25),-.01,.37],[.77,.82,.87]);
 mesh.pop();
}
for(let s of [-1,1]){mesh.beam(s*.38,-.66,.29,s*.38,-1.05,.40,.075,C.yellow);for(let i=-1;i<=1;i++)mesh.beam(s*.38,-1.05,.4,s*.38+i*.17,-1.08,.18,.047,C.yellow)}
for(let i=-2;i<=2;i++)feather([i*.14,.09,.53],[i*.21,.06,1.88],[i*.21+.24,.06,.62],i%2?[.82,.86,.88]:C.white);
if(p.carrying)renderFood(mesh,{x:0,y:-.35,z:-1.72,type:p.carrying.type,rot:0,available:true});
mesh.pop();mesh.pop()}
function landingPoint(){
 if(player.grounded)return null;
 let fx=-Math.sin(player.yaw),fz=-Math.cos(player.yaw),vy=player.vy-5,y=player.y-.34,surface=0,tt=0;
 for(let k=0;k<3;k++){
  tt=(vy+Math.sqrt(Math.max(0,vy*vy+58*Math.max(.02,y-surface))))/29;
  let x=player.x+fx*(.35+player.speed*.4*tt),z=player.z+fz*(.35+player.speed*.4*tt);
  surface=standingSurface(x,z)??0;
 }
 return {x:player.x+fx*(.35+player.speed*.4*tt),z:player.z+fz*(.35+player.speed*.4*tt),y:surface};
}
function renderEffects(mesh){let t=time;for(let o of poops){mesh.ball(o.x,o.y,o.z,.23,[.96,.97,.92],9,6);mesh.ball(o.x,o.y+.26,o.z,.15,[.99,.99,.96],8,5)}for(let s of splats){mesh.push(s.x,s.y+.025,s.z);mesh.cylinder(0,0,0,s.r,.045,[.94,.95,.88],9);for(let k=0;k<3;k++){let a=k*2.09;mesh.ball(Math.cos(a)*s.r,0,Math.sin(a)*s.r,.12,[.97,.98,.94],6,4)}mesh.pop()}
for(let f of foods){if(!f.available||Math.hypot(f.x-player.x,f.z-player.z)>85)continue;renderFood(mesh,f)}
// nest highlight and objective target
let s=.85+.14*Math.sin(t*3);if(!endGame&&getMission().type==='deliver')mesh.torus(nest.x,nest.y+.2,nest.z,3.3*s,.18,C.yellow,20);
if(!endGame&&getMission().type==='wheel')mesh.torus(wheel.x,wheel.y,wheel.z,11.5,.38,C.yellow,32);
if(!endGame&&getMission().type==='rings'){let r=flightRings[ringProgress];if(r){mesh.torus(r.x,r.y,r.z,4.7,.24,C.yellow,20);mesh.ball(r.x,r.y,r.z,.6,C.yellow,8,5);}}
// Removed duplicate 3D targeting torus: aim is drawn only in the HUD, avoiding the solid ring artifact.
}
function buildDynamics(){let b=new Mesh();for(let p of tourists)if(Math.abs(p.x-player.x)<100&&Math.abs(p.z-player.z)<100)makeNPC(b,p);for(let p of props)if(Math.abs(p.x-player.x)<100&&Math.abs(p.z-player.z)<100)renderProp(b,p);for(let c of carObjects){if(Math.hypot(c.x-player.x,c.z-player.z)>115)continue;b.push(c.x,.55,c.z,0,0,0);b.box(0,.25,0,4,1.1,2.1,c.col);b.box(0,1,0,2.1,.6,1.75,[.28,.49,.57]);for(let x of [-1.25,1.25])for(let z of [-1,1])b.cylinder(x,-.20,z*.94,.35,.33,C.ink,7);b.pop();}
for(let g of gondolas){if(Math.hypot(wheel.x-player.x,wheel.z-player.z)>125)continue;let a=g.a+time*.06,x=wheel.x+Math.cos(a)*24,y=wheel.y+Math.sin(a)*24;for(let z of [wheel.z-2.3,wheel.z+2.3]){b.box(x,y-.3,z,2.9,2.2,2.4,g.color);b.box(x,y+.15,z+1.24,1.8,.92,.14,[.23,.55,.72]);}}
renderEffects(b);renderBird(b);
// subtle small waves line strips on the water
for(let i=0;i<55;i++){let x=Math.sin(i*21.13)*158,z=132+(i%11)*13+((time*2.2+i*7)%12);if(Math.hypot(x-player.x,z-player.z)>115)continue;b.box(x,0.015,z,2.2+(i%5),.02,.12,[.50,.88,.86]);}
return new Float32Array(b.d);
}
// camera math
function perspective(fovy,aspect,near,far){let f=1/Math.tan(fovy/2),m=new Array(16).fill(0);m[0]=f/aspect;m[5]=f;m[10]=(far+near)/(near-far);m[11]=-1;m[14]=2*far*near/(near-far);return m;}
function lookAt(eye,target){let z=[eye.x-target.x,eye.y-target.y,eye.z-target.z],zl=Math.hypot(...z)||1;z=z.map(a=>a/zl);let x=[z[2],0,-z[0]],xl=Math.hypot(...x)||1;x=x.map(a=>a/xl);let y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];return [x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-(x[0]*eye.x+x[1]*eye.y+x[2]*eye.z),-(y[0]*eye.x+y[1]*eye.y+y[2]*eye.z),-(z[0]*eye.x+z[1]*eye.y+z[2]*eye.z),1];}
function project(pos,vp){let x=pos.x,y=pos.y,z=pos.z,cw=vp[3]*x+vp[7]*y+vp[11]*z+vp[15];if(cw<0.1)return null;let nx=(vp[0]*x+vp[4]*y+vp[8]*z+vp[12])/cw,ny=(vp[1]*x+vp[5]*y+vp[9]*z+vp[13])/cw;return {x:(nx*.5+.5)*canvas.width,y:(.5-ny*.5)*canvas.height,w:cw}};
let activeVP=matIdentity();
function render(dt){let width=innerWidth,height=innerHeight,dpr=Math.min(1.6,devicePixelRatio||1),w=Math.floor(width*dpr),h=Math.floor(height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);}
let yaw=player.yaw,fx=-Math.sin(yaw),fz=-Math.cos(yaw),behind=player.grounded?6.9:9.3;
let desired={x:player.x-fx*behind,y:player.y+(player.grounded?2.5:4.0)+player.speed*.035,z:player.z-fz*behind};let smooth=1-Math.exp(-dt*6);camera.x+=(desired.x-camera.x)*smooth;camera.y+=(desired.y-camera.y)*smooth;camera.z+=(desired.z-camera.z)*smooth;let focus={x:player.x+fx*11,y:player.y+player.pitch*4+(player.grounded?.6:.8),z:player.z+fz*11};activeVP=matMul(perspective(65*Math.PI/180,canvas.width/canvas.height,.1,500),lookAt(camera,focus));gl.uniformMatrix4fv(uVP,false,new Float32Array(activeVP));gl.uniform3f(uCamera,camera.x,camera.y,camera.z);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);bindAndDraw(staticBuffer,staticCount);drawFacades(activeVP);let dynamicData=buildDynamics();gl.bindBuffer(gl.ARRAY_BUFFER,dynamicBuffer);gl.bufferData(gl.ARRAY_BUFFER,dynamicData,gl.DYNAMIC_DRAW);bindAndDraw(dynamicBuffer,dynamicData.length/9);
if(state==='play'){for(let l of locationLabels){let s=project(l,activeVP),visible=s&&s.w<180&&s.x>0&&s.x<w&&s.y>0&&s.y<h;l.el.style.display=visible?'block':'none';if(visible){l.el.style.left=(s.x/dpr)+'px';l.el.style.top=(s.y/dpr)+'px';}}}else for(let l of locationLabels)l.el.style.display='none';
}
function findTarget(){let t=getMission().type;if(t==='deliver'&&player.carrying)return {x:nest.x,z:nest.z,y:nest.y};if(t==='wheel')return wheel;
if(t==='pier'){let a=tourists.filter(p=>p.onPier).sort((a,b)=>dist(player,a)-dist(player,b))[0];return a||{x:8,z:160,y:0};}
if(t==='prop'||t==='mallprop'){let a=props.filter(p=>(t==='prop'?p.z>85:p.z<85)&&!p.hit).sort((a,b)=>dist(player,a)-dist(player,b))[0];return a||{x:0,z:t==='prop'?98:-30,y:0};}
if(['steal','deliver','eat','icecream'].includes(t)){let f=foods.filter(f=>f.available&&(t!=='icecream'||f.type==='ICE CREAM')).sort((a,b)=>dist(player,a)-dist(player,b))[0];return (t==='deliver'&&player.carrying)?nest:f||nest;}
if(t==='scare'||t==='screech'||t==='hit'){let a=tourists.filter(p=>p.scared<=0).sort((a,b)=>dist(player,a)-dist(player,b))[0];return a||{x:0,z:-40,y:0};}if(t==='car'){let a=carObjects.slice().sort((a,b)=>dist(player,a)-dist(player,b))[0];return a;}if(t==='rings')return flightRings[ringProgress]||flightRings.at(-1);
return {x:0,z:0,y:0};}
function drawMap(){
 let c=el('minimap'),ctx=c.getContext('2d'),s=220;
 if(c.width!==s||c.height!==s){c.width=s;c.height=s;}
 let sc=.61,ox=110,oz=110;
 const X=x=>ox+(x-player.x)*sc,Z=z=>oz+(z-player.z)*sc;
 ctx.clearRect(0,0,s,s);
 ctx.fillStyle='#567e70';ctx.fillRect(0,0,s,s);
 // All scenery and icons rotate WITH the world. The gull always points to screen top.
 ctx.save();ctx.translate(ox,oz);ctx.rotate(player.yaw);ctx.translate(-ox,-oz);
 ctx.fillStyle='#5f9872';ctx.fillRect(-s*5,-s*5,s*11,s*11);
 ctx.fillStyle='#f1d09a';ctx.fillRect(-s*5,Z(84),s*11,130*sc);
 ctx.fillStyle='#207ca0';ctx.fillRect(-s*5,Z(121),s*11,s*10);
 ctx.fillStyle='#384954';ctx.fillRect(-s*5,Z(55),s*11,16*sc);
 ctx.fillStyle='#d7bf9e';ctx.fillRect(X(-10),-s*5,20*sc,s*11);
 ctx.strokeStyle='#e6dcc8';ctx.lineWidth=1.1;
 for(let z of [-139,-100,-62,-24,14,50,79]){ctx.beginPath();ctx.moveTo(-s*5,Z(z));ctx.lineTo(s*6,Z(z));ctx.stroke();}
 for(let b of buildings){let x=X(b.x),z=Z(b.z);if(Math.hypot(x-ox,z-oz)>210)continue;ctx.fillStyle='#dfac85';ctx.fillRect(x-b.w*sc*.5,z-b.d*sc*.5,b.w*sc,b.d*sc);ctx.strokeStyle='#304453';ctx.lineWidth=1;ctx.strokeRect(x-b.w*sc*.5,z-b.d*sc*.5,b.w*sc,b.d*sc);}
 ctx.lineWidth=4;ctx.strokeStyle='#e1c398';ctx.beginPath();ctx.moveTo(X(8),Z(107));ctx.lineTo(X(8),Z(255));ctx.stroke();
 function dot(x,z,col,r){let a=X(x),b=Z(z);if(Math.hypot(a-ox,b-oz)>170)return;ctx.fillStyle=col;ctx.beginPath();ctx.arc(a,b,r,0,Math.PI*2);ctx.fill();}
 dot(wheel.x,wheel.z,'#dff8ff',7);ctx.strokeStyle='#b2f7fe';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(X(wheel.x),Z(wheel.z),9,0,Math.PI*2);ctx.stroke();dot(nest.x,nest.z,'#bf8bec',5);
 for(let f of foods)if(f.available)dot(f.x,f.z,'#ffdb4f',3.1);
 for(let t of tourists)if(t.scared<=0&&Math.abs(t.x-player.x)<90&&Math.abs(t.z-player.z)<90)dot(t.x,t.z,'#f2efcd',1.25);
 let target=findTarget();if(target&&!endGame){let x=X(target.x),z=Z(target.z),dx=x-ox,dz=z-oz,mag=Math.max(1,Math.hypot(dx,dz)),lim=Math.min(90,mag);x=ox+dx/mag*lim;z=oz+dz/mag*lim;ctx.strokeStyle='#fce357';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ox,oz);ctx.lineTo(x,z);ctx.stroke();ctx.fillStyle='#fce357';ctx.beginPath();ctx.arc(x,z,6+1.8*Math.sin(time*5),0,Math.PI*2);ctx.fill();}
 ctx.restore();
 // Fixed arrow, so the direction you fly is always up on the map.
 ctx.save();ctx.translate(ox,oz);ctx.fillStyle='#fff';ctx.strokeStyle='#163141';ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(0,-13);ctx.lineTo(-8,8);ctx.lineTo(0,4);ctx.lineTo(8,8);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
 // Real north is a rotating compass needle, not an incorrect fixed 'N'.
 ctx.save();ctx.translate(20,19);ctx.rotate(player.yaw);ctx.fillStyle='#dafaff';ctx.beginPath();ctx.moveTo(0,-11);ctx.lineTo(-4,0);ctx.lineTo(4,0);ctx.closePath();ctx.fill();ctx.restore();
 ctx.fillStyle='#defaff';ctx.font='900 10px system-ui';ctx.textAlign='center';ctx.fillText('N',20,34);ctx.textAlign='start';
 ctx.strokeStyle='#ffffff83';ctx.lineWidth=2;ctx.strokeRect(1,1,s-2,s-2);
}

function updateHUD(dt){if(state!=='play')return;nextHud-=dt;if(nextHud>0)return;nextHud=.1;let mis=getMission();el('missionTitle').textContent=endGame?'👑 FREE ROAM · GULL KING':mis.title;el('missionDescription').textContent=endGame?'You conquered Pier Park. Keep causing ridiculous mayhem!':mis.desc;el('counter').textContent=endGame?missions.length+' / '+missions.length:`${Math.min(missionProgress,mis.goal)|0} / ${mis.goal}`;el('progressFill').style.width=(endGame?100:clamp(missionProgress/mis.goal*100,0,100))+'%';el('score').textContent=String(score).padStart(6,'0');el('wanted').textContent='★'.repeat(Math.round(wanted))+'☆'.repeat(5-Math.round(wanted));el('staminaFill').style.width=player.stamina+'%';el('staminaText').textContent=Math.round(player.stamina)+'%';el('poopText').textContent=player.poopAmmo+' / '+player.maxPoop;el('poopFill').style.width=(player.poopAmmo/player.maxPoop*100)+'%';el('flightmode').textContent=player.grounded?'LANDED · W/S WALK · SPACE TAKE OFF':player.landing?'LANDING IN PROGRESS · L / SPACE ABORT':player.poopAmmo===0?'OUT OF POOP — EAT FOOD':(keys.KeyZ||keys.ControlLeft||touchButtons.brake?'BRAKING · ':'')+'FOOD → POOP → CHAOS';el('landBtn').textContent=player.grounded?'🪽 TAKE OFF':player.landing?'↗ ABORT':'⬇ LAND';el('altitude').textContent=Math.round(player.y);el('speed').textContent=Math.round(player.speed*3.6);el('held').textContent=player.carrying?'🍟 '+player.carrying.type+' HELD · E TO EAT (+💩), OR FLY TO ROOFTOP NEST':player.poopAmmo<3?'💩 LOW AMMO · E STEAL, E EAT':'';
let area=player.z>115?'🌊 GULF OF MEXICO · RUSSELL-FIELDS PIER':player.z>80?'🏖️ PANAMA CITY BEACH':player.z>49?'🚗 FRONT BEACH ROAD':Math.abs(player.x+61)<30&&player.z<38&&player.z>-38?'🎡 SKYWHEEL': '🛍️ PIER PARK SHOPPING DISTRICT';el('area').textContent=area;
let target=findTarget(),direction=target?Math.atan2(-(target.x-player.x),-(target.z-player.z)):player.yaw,angle=Math.atan2(Math.sin(direction-player.yaw),Math.cos(direction-player.y));el('indicator').textContent=endGame?'FREE ROAM UNLOCKED':`${Math.round(Math.hypot(target.x-player.x,target.z-player.z))}m · OBJECTIVE ${Math.abs(angle)<.35?'↑':angle>.35?'↖':'↗'}`;
const p=landingPoint(),proj=p?project({x:p.x,y:p.y+.12,z:p.z},activeVP):null,bs=el('bombSight');if(proj&&player.poopAmmo>0&&proj.x>8&&proj.x<canvas.width-8&&proj.y>8&&proj.y<canvas.height-8){bs.style.display='block';bs.style.left=proj.x/(canvas.width/innerWidth)+'px';bs.style.top=proj.y/(canvas.height/innerHeight)+'px';}else bs.style.display='none';}
function main(t){requestAnimationFrame(main);let dt=Math.min(.04,(t-lastTime)/1000||.016);lastTime=t;if(state==='play'){movement(dt);updateActors(dt);updateHUD(dt);drawMap();if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$toast.classList.remove('show');}}else time+=dt*.18;render(dt);}
requestAnimationFrame(main);window.__gullDebug={get state(){return state},get player(){return {...player}},get score(){return score},get mission(){return getMission().title},get people(){return tourists.length},get webgl(){return !!gl},steal,poop,screech,respawn,award,get ammo(){return player.poopAmmo},get city(){return {buildings:buildings.length,wheel,shopHeights:buildings.slice(0,18).map(b=>b.h),nest:{...nest}}},get modelScale(){return .28},get pedestrianScale(){return 1.95},get groundY(){return standingSurface(player.x,player.z)},land:toggleLand,takeoff,get goals(){return missions.length},get foods(){return foods.map(f=>({x:f.x,y:f.y,z:f.z,type:f.type,available:f.available}))},teleport(x,y,z){player.x=x;player.y=y;player.z=z;player.vy=0;player.grounded=false;player.landing=false},forceMission(i){missionIndex=i;missionProgress=0;ringProgress=0}};
})();
