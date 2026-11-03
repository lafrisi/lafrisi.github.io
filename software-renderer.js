import * as THREE from 'three';

// Canvas rasterization of the same 3D meshes. Keeps the assembly interactive when
// a browser has no WebGL context, without substituting a flat picture.
export function createSoftwareRenderer(){
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)throw new Error('Canvas rendering is unavailable');
  let width=1,height=1,ratio=1;
  const cache=new WeakMap();
  const world=new THREE.Vector3(),v1=new THREE.Vector3(),v2=new THREE.Vector3(),v3=new THREE.Vector3();
  const eye=new THREE.Vector3(),center=new THREE.Vector3(),normal=new THREE.Vector3();
  const viewProjection=new THREE.Matrix4();
  const light=new THREE.Vector3(.3,.85,.45).normalize(),fill=new THREE.Vector3(-.6,.5,-.45).normalize();
  function project(v){const p=v.clone().applyMatrix4(viewProjection);return {x:(p.x*.5+.5)*width,y:(-.5*p.y+.5)*height,z:p.z};}
  function prepared(geometry){if(cache.has(geometry))return cache.get(geometry);const pos=geometry.attributes.position.array;const idx=geometry.index?.array;const count=idx?idx.length:pos.length/3;const result=[];for(let i=0;i<count;i+=3){const a=idx?idx[i]:i,b=idx?idx[i+1]:i+1,c=idx?idx[i+2]:i+2;result.push([new THREE.Vector3(pos[a*3],pos[a*3+1],pos[a*3+2]),new THREE.Vector3(pos[b*3],pos[b*3+1],pos[b*3+2]),new THREE.Vector3(pos[c*3],pos[c*3+1],pos[c*3+2])]);}cache.set(geometry,result);return result;}
  function render(scene,camera){
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);camera.matrixWorldInverse.copy(camera.matrixWorld).invert();viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);eye.setFromMatrixPosition(camera.matrixWorld);
    ctx.setTransform(ratio,0,0,ratio,0,0);ctx.fillStyle=scene.background?.getStyle()||'#d9ded8';ctx.fillRect(0,0,width,height);
    // Ground grid and a soft contact shadow anchor the assembly spatially.
    ctx.strokeStyle='rgba(78,99,79,.13)';ctx.lineWidth=.6;
    for(let i=-600;i<=600;i+=40){for(const axis of [0,1]){const a=project(new THREE.Vector3(axis?i:-600,-12,axis?-600:i));const b=project(new THREE.Vector3(axis?i:600,-12,axis?600:i));ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}}
    const ground=project(new THREE.Vector3(0,-8,30));ctx.save();ctx.translate(ground.x,ground.y);ctx.scale(1,.35);const shadow=ctx.createRadialGradient(0,0,5,0,0,width*.3);shadow.addColorStop(0,'rgba(42,60,43,.18)');shadow.addColorStop(1,'rgba(42,60,43,0)');ctx.fillStyle=shadow;ctx.beginPath();ctx.arc(0,0,width*.3,0,Math.PI*2);ctx.fill();ctx.restore();
    const draw=[];
    scene.traverse(object=>{
      if(!object.visible)return;
      if(object.isMesh&&!object.material.isShadowMaterial){
        const mat=object.material;if(Array.isArray(mat))return;
        const color=mat.color.clone().convertLinearToSRGB();const emissive=mat.emissive?.clone().convertLinearToSRGB();
        for(const tri of prepared(object.geometry)){
          v1.copy(tri[0]).applyMatrix4(object.matrixWorld);v2.copy(tri[1]).applyMatrix4(object.matrixWorld);v3.copy(tri[2]).applyMatrix4(object.matrixWorld);
          normal.subVectors(v2,v1).cross(world.subVectors(v3,v1)).normalize();center.copy(v1).add(v2).add(v3).multiplyScalar(1/3);
          const facing=normal.dot(world.subVectors(eye,center));
          if(facing<=0&&mat.side!==THREE.DoubleSide)continue;
          if(facing<0)normal.negate();
          const pa=project(v1),pb=project(v2),pc=project(v3);if([pa,pb,pc].every(p=>p.x<0)||[pa,pb,pc].every(p=>p.x>width)||[pa,pb,pc].every(p=>p.y<0)||[pa,pb,pc].every(p=>p.y>height))continue;
          let shade=.64+.32*Math.max(0,normal.dot(light))+.12*Math.max(0,normal.dot(fill));
          const spec=mat.metalness?Math.pow(Math.max(0,normal.dot(world.subVectors(eye,center).normalize().add(light).normalize())),25)*mat.metalness*.2:0;
          const intensity=mat.emissiveIntensity||0;
          const rgb=['r','g','b'].map(k=>Math.min(255,Math.max(0,Math.round((color[k]*shade+spec+(emissive?.[k]||0)*intensity)*255))));
          draw.push({type:'face',p:[pa,pb,pc],z:(pa.z+pb.z+pc.z)/3,color:`rgb(${rgb.join(',')})`,opacity:mat.opacity});
        }
      }else if(object.isLineSegments&&!object.isGridHelper&&object.parent.isMesh){
        const pos=object.geometry.attributes.position.array;
        for(let i=0;i<pos.length;i+=6){v1.set(pos[i],pos[i+1],pos[i+2]).applyMatrix4(object.matrixWorld);v2.set(pos[i+3],pos[i+4],pos[i+5]).applyMatrix4(object.matrixWorld);const a=project(v1),b=project(v2);draw.push({type:'line',p:[a,b],z:(a.z+b.z)/2-.00015,color:'rgba(45,63,64,.28)'});}
      }else if(object.isLine&&object.material.isLineDashedMaterial&&object.material.opacity>.02){
        const pos=object.geometry.attributes.position.array;v1.set(pos[0],pos[1],pos[2]).applyMatrix4(object.matrixWorld);v2.set(pos[3],pos[4],pos[5]).applyMatrix4(object.matrixWorld);const a=project(v1),b=project(v2);draw.push({type:'guide',p:[a,b],z:(a.z+b.z)/2,color:`rgba(58,88,62,${object.material.opacity})`});
      }
    });
    draw.sort((a,b)=>b.z-a.z);
    for(const item of draw){ctx.beginPath();ctx.moveTo(item.p[0].x,item.p[0].y);ctx.lineTo(item.p[1].x,item.p[1].y);if(item.type==='face'){ctx.lineTo(item.p[2].x,item.p[2].y);ctx.closePath();ctx.globalAlpha=item.opacity;ctx.fillStyle=item.color;ctx.fill();if(item.opacity===1){ctx.strokeStyle=item.color;ctx.lineWidth=.45;ctx.stroke();}ctx.globalAlpha=1;}else{ctx.strokeStyle=item.color;ctx.lineWidth=item.type==='guide'?.8:.65;if(item.type==='guide')ctx.setLineDash([4,5]);ctx.stroke();ctx.setLineDash([]);}}
  }
  return {isSoftwareRenderer:true,domElement:canvas,shadowMap:{},setPixelRatio(v){ratio=Math.min(v,1.5)},setSize(w,h){width=w;height=h;canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);canvas.style.width='100%';canvas.style.height='100%'},render,dispose(){canvas.remove()}};
}
