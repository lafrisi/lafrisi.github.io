import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { createSoftwareRenderer } from './software-renderer.js';

export function createAssembly(host) {
  const scene = new THREE.Scene();
  const probe=document.createElement('canvas');
  const context=probe.getContext('webgl2',{failIfMajorPerformanceCaveat:true});
  const renderer=context?new THREE.WebGLRenderer({canvas:probe,context,antialias:true,alpha:false,powerPreference:'low-power'}):createSoftwareRenderer();
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.25;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const canvas=renderer.domElement;
  canvas.setAttribute('aria-label','Interactive 3D peel-test assembly. Drag to rotate. Use the component buttons to highlight parts and the explode slider to separate them.');
  canvas.setAttribute('role','img');
  canvas.tabIndex=0;
  host.prepend(canvas);
  const camera=new THREE.OrthographicCamera(-400,400,280,-280,1,2500);
  const defaultPosition=new THREE.Vector3(480,340,560);
  camera.position.copy(defaultPosition);
  const controls=new OrbitControls(camera,canvas);
  controls.target.set(0,105,5);controls.enableDamping=true;controls.dampingFactor=.09;
  controls.enablePan=false;controls.enableZoom=false;controls.minPolarAngle=.25;controls.maxPolarAngle=Math.PI*.49;
  controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};
  // One-finger vertical gestures scroll the story; two fingers rotate on touch devices.
  controls.touches={ONE:undefined,TWO:THREE.TOUCH.DOLLY_ROTATE};
  canvas.style.touchAction='pan-y';
  controls.update();
  scene.add(new THREE.HemisphereLight(0xf8fff2,0x6a7779,2.7));
  const key=new THREE.DirectionalLight(0xffffff,3.4);key.position.set(160,500,250);key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-500;key.shadow.camera.right=500;key.shadow.camera.top=500;key.shadow.camera.bottom=-500;key.shadow.normalBias=2;scene.add(key);
  const fill=new THREE.DirectionalLight(0xe4f2ff,2.2);fill.position.set(-300,170,-200);scene.add(fill);
  const rim=new THREE.DirectionalLight(0xffe8cb,2.5);rim.position.set(300,200,-250);scene.add(rim);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(2200,2200),new THREE.ShadowMaterial({color:0x28352c,opacity:.16}));floor.rotation.x=-Math.PI/2;floor.position.y=-13;floor.receiveShadow=true;scene.add(floor);
  const grid=new THREE.GridHelper(950,24,0xa0ad9c,0xb5bfb0);grid.position.y=-12;grid.material.transparent=true;grid.material.opacity=.32;scene.add(grid);
  const root=new THREE.Group();scene.add(root);
  const parts={};const meshes=[];const selectable=[];let selected=null;
  const descriptions={
    drum:['Hollow drum','Steel shell that rolls as the specimen peels.'],
    caps:['End-cap wheels ×2','Two fitted end caps connect the hollow drum to the square shaft.'],
    shaft:['Square aluminum rod','A square section passes through both end caps and connects to the spring supports.'],
    springs:['Aluminum leaf springs ×2','A pair of thin aluminum sheets supports the rod and provides a deflection path.'],
    blocks:['Wooden support blocks ×2','Two blocks provide the mounting points for the leaf springs.'],
    stage:['Plexiglass stage','Transparent specimen stage, coupled to the linear actuator.'],
    actuator:['Linear actuator','Controlled feed drives the stage beneath the drum.'],
    base:['Base & mounting hardware','A simplified reference base and fasteners locate the assembly.']
  };
  function material(color,metalness=0,roughness=.55,extra={}) {return new THREE.MeshStandardMaterial({color,metalness,roughness,...extra});}
  const metal=material(0xa6b5bd,.62,.28);
  const darkMetal=material(0x54636b,.55,.38);
  const springMat=material(0xc8d5d9,.65,.24);
  const capMat=material(0x7d9ca4,.35,.38);
  const woodMat=material(0xc49761,0,.85);
  const baseMat=material(0xa5ae9f,.1,.85);
  const glassMat=material(0xa1d3c7,.12,.2,{transparent:true,opacity:.38,depthWrite:false,side:THREE.DoubleSide});
  const blackMat=material(0x344447,.2,.48);
  const brassMat=material(0xb6a06c,.5,.4);
  function group(id,name,offset) {const g=new THREE.Group();g.name=name;g.userData.part=id;root.add(g);(parts[id]??=[]).push({group:g,offset:new THREE.Vector3(...offset)});return g;}
  function mesh(geometry,mat,parent,pos=[0,0,0],rot=[0,0,0],edges=true) {const m=new THREE.Mesh(geometry,mat.clone());m.position.set(...pos);m.rotation.set(...rot);m.castShadow=!mat.transparent;m.receiveShadow=true;parent.add(m);m.userData.part=parent.userData.part;m.userData.baseColor=m.material.color.clone();meshes.push(m);selectable.push(m);if(edges){const e=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,28),new THREE.LineBasicMaterial({color:0x3b5054,transparent:true,opacity:.28}));m.add(e);}return m;}
  const box=(w,h,d,mat,parent,pos,rot)=>mesh(new THREE.BoxGeometry(w,h,d),mat,parent,pos,rot);
  function cylinder(radius,length,mat,parent,pos,axis='x') {const rot=axis==='x'?[0,0,Math.PI/2]:axis==='z'?[Math.PI/2,0,0]:[0,0,0];return mesh(new THREE.CylinderGeometry(radius,radius,length,radius>15?32:12),mat,parent,pos,rot);}
  function ring(outer,inner,length,square=false) {const shape=new THREE.Shape();shape.absarc(0,0,outer,0,Math.PI*2,false);const hole=new THREE.Path();if(square){hole.moveTo(-inner,-inner);hole.lineTo(-inner,inner);hole.lineTo(inner,inner);hole.lineTo(inner,-inner);hole.closePath();}else hole.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(hole);const geo=new THREE.ExtrudeGeometry(shape,{depth:length,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.7,bevelThickness:.7,curveSegments:32});geo.translate(0,0,-length/2);geo.rotateY(Math.PI/2);return geo;}
  function bolt(parent,x,y,z){cylinder(3.7,11,darkMetal,parent,[x,y,z],'y');cylinder(6.2,3,metal,parent,[x,y+6,z],'y');}
  // Base and actuator support: illustrative dimensions, in millimetre-like scene units.
  const base=group('base','Reference base',[0,0,0]);box(400,13,440,baseMat,base,[0,-4,25]);
  for(const x of [-170,170])for(const z of [-160,210]){box(27,9,27,blackMat,base,[x,-10,z]);bolt(base,x,6,z);}
  // Two wooden mounting blocks, each carrying one thin leaf spring.
  for(const side of [-1,1]){
    const g=group('blocks',side<0?'Left wooden support block':'Right wooden support block',[side*90,0,30]);
    box(60,32,85,woodMat,g,[side*155,18,-35]);
    for(const z of [-60,-10])bolt(g,side*155,37,z);
    for(let line=0;line<4;line++){box(58,.65,.6,material(0xa57b4c,0,1),g,[side*155,12+line*6,8]);}
    const spring=group('springs',side<0?'Left aluminum leaf spring':'Right aluminum leaf spring',[side*135,38,-30]);
    box(28,126,2.8,springMat,spring,[side*155,98,-35]);
    box(38,16,10,darkMetal,spring,[side*155,45,-35]);
    cylinder(7,8,metal,spring,[side*155,157,-35],'z');
    box(16,10,7,darkMetal,spring,[side*155,157,-31]);
    for(const x of [-10,10])bolt(spring,side*155+x,53,-35);
  }
  // Shaft, drum shell, and two square-bore end-cap wheels are separate exploded parts.
  const shaft=group('shaft','Square aluminum rod',[0,112,115]);box(352,10,10,springMat,shaft,[0,157,-35]);
  const drum=group('drum','Hollow cylindrical drum',[0,220,-35]);mesh(ring(53,47,195),metal,drum,[0,157,-35]);
  // A small specimen catch is included as a conceptual nut/bolt feature.
  box(17,7,14,brassMat,drum,[35,106,-18]);cylinder(4,11,darkMetal,drum,[35,101,-18],'y');
  for(const side of [-1,1]){
    const cap=group('caps',side<0?'Left end-cap wheel':'Right end-cap wheel',[side*112,154,40]);
    mesh(ring(48,5.4,12,true),capMat,cap,[side*94,157,-35]);
    mesh(ring(16,5.4,16,true),darkMetal,cap,[side*99,157,-35]);
    for(let i=0;i<6;i++){const a=i*Math.PI/3;cylinder(2.8,2.5,metal,cap,[side*101,157+34*Math.sin(a),-35+34*Math.cos(a)]);}
  }
  // Specimen stage and simple guides, with the actuator clevis passing into its bracket.
  const stage=group('stage','Plexiglass specimen stage',[0,55,-180]);box(270,7,235,glassMat,stage,[0,82,-32]);
  box(266,15,6,glassMat,stage,[0,92,-146]);
  box(20,23,18,capMat,stage,[0,66,76]);
  for(const x of [-115,115]){box(13,14,180,darkMetal,base,[x,25,-26]);box(30,9,45,capMat,stage,[x,74,-35]);}
  const actuator=group('actuator','Linear actuator',[0,14,185]);
  cylinder(17,104,darkMetal,actuator,[0,55,158],'z');cylinder(11,68,metal,actuator,[0,55,86],'z');cylinder(5,45,springMat,actuator,[0,55,42],'z');
  box(42,33,53,blackMat,actuator,[23,48,180]);box(50,12,33,darkMetal,actuator,[0,22,198]);box(12,17,13,capMat,actuator,[0,55,17]);
  for(const x of [-18,18])bolt(actuator,x,30,198);
  // Dashed guides appear only as the components separate.
  const guides=new THREE.Group();root.add(guides);
  const guideLines=[];
  Object.entries(parts).forEach(([id,entries])=>entries.forEach(entry=>{if(id==='base')return;const bounds=new THREE.Box3().setFromObject(entry.group);const c=bounds.getCenter(new THREE.Vector3());const geometry=new THREE.BufferGeometry().setFromPoints([c,c.clone()]);const line=new THREE.Line(geometry,new THREE.LineDashedMaterial({color:0x577461,dashSize:5,gapSize:5,transparent:true,opacity:0}));guides.add(line);guideLines.push({line,origin:c,offset:entry.offset});}));
  let value=0,target=0,active=true,frame=0,warm=false,lastT=0,viewAspect=1,baseHalf=267;
  const label=document.getElementById('model-label');
  function highlight(id){selected=selected===id?null:id;for(const m of meshes){const on=m.userData.part===selected;m.material.color.copy(m.userData.baseColor);m.material.emissive.set(on?(warm?0x8d3314:0x456b1b):0);m.material.emissiveIntensity=on?.45:0;m.material.opacity=m.userData.part==='stage'?(selected==='stage'?.65:.38):1;}if(selected){label.hidden=false;label.innerHTML=`<strong>${descriptions[selected][0]}</strong>${descriptions[selected][1]}`;}else label.hidden=true;host.dispatchEvent(new CustomEvent('parthighlight',{detail:selected}));requestFrame();}
  function setTheme(theme){warm=theme==='warm';scene.background=new THREE.Color(warm?0xe8d7c4:0xd9ded8);grid.material.color?.set(warm?0xa08c76:0xa4b2a1);requestFrame();}
  function resize(){const width=host.clientWidth,height=host.clientHeight;if(!width||!height)return;renderer.setSize(width,height,false);baseHalf=width<450?286:267;viewAspect=width/height;const half=baseHalf+value*65;camera.left=-half*viewAspect;camera.right=half*viewAspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();requestFrame();}
  function render(t){frame=0;if(!active)return;if(renderer.isSoftwareRenderer&&lastT&&t-lastT<30){requestFrame();return;}const dt=lastT?Math.min((t-lastT)/1000,.06):.016;lastT=t;const diff=target-value;value+=diff*(1-Math.exp(-dt*7));if(Math.abs(diff)<.0002)value=target;
    Object.values(parts).flat().forEach(({group,offset})=>group.position.copy(offset).multiplyScalar(value));
    guideLines.forEach(({line,origin,offset})=>{const a=line.geometry.attributes.position;a.setXYZ(0,origin.x,origin.y,origin.z);a.setXYZ(1,origin.x+offset.x*value,origin.y+offset.y*value,origin.z+offset.z*value);a.needsUpdate=true;line.computeLineDistances();line.material.opacity=value*.35;});
    const half=baseHalf+value*65;camera.left=-half*viewAspect;camera.right=half*viewAspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();
    controls.target.y=105+value*70;controls.update();renderer.render(scene,camera);
    if(Math.abs(target-value)>.0002)requestFrame();
  }
  function requestFrame(){if(active&&!frame)frame=requestAnimationFrame(render);}
  controls.addEventListener('change',requestFrame);
  controls.addEventListener('start',()=>canvas.classList.add('orbiting'));
  controls.addEventListener('end',()=>canvas.classList.remove('orbiting'));
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerStart;
  canvas.addEventListener('pointerdown',e=>{pointerStart={x:e.clientX,y:e.clientY};});
  canvas.addEventListener('pointerup',e=>{if(!pointerStart||Math.hypot(e.clientX-pointerStart.x,e.clientY-pointerStart.y)>6)return;const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(selectable,false)[0];if(hit)highlight(hit.object.userData.part);});
  canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const v=camera.position.clone().sub(controls.target);const s=new THREE.Spherical().setFromVector3(v);if(e.key==='ArrowLeft')s.theta-=.12;if(e.key==='ArrowRight')s.theta+=.12;if(e.key==='ArrowUp')s.phi=Math.max(.25,s.phi-.1);if(e.key==='ArrowDown')s.phi=Math.min(Math.PI*.49,s.phi+.1);camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));controls.update();requestFrame();}});
  new ResizeObserver(resize).observe(host);
  setTheme(document.documentElement.dataset.theme);resize();
  document.getElementById('model-fallback').hidden=true;
  document.getElementById('model-hint').textContent=matchMedia('(pointer:coarse)').matches?'Two fingers to rotate · Tap a part to inspect':'Drag to rotate · Click a part to inspect';
  host.classList.add('model-loaded');
  return {setExplosion(v,instant=false){target=Math.max(0,Math.min(1,v));if(instant)value=target;requestFrame();},setTheme,highlight,reset(){camera.position.copy(defaultPosition);controls.target.set(0,105+value*70,5);controls.update();requestFrame();},setActive(v){active=v;if(active){lastT=0;requestFrame();}},dispose(){cancelAnimationFrame(frame);controls.dispose();renderer.dispose();}};
}
