import { encodeAndCompress, findTextureMinMax } from '@monogrid/gainmap-js/encode';
import './style.css'

import * as THREE from "three";
import { encodeJPEGMetadata } from '@monogrid/gainmap-js/libultrahdr';

const appElement=document.querySelector<HTMLDivElement>('#app')!;
appElement.innerHTML = `
  <canvas id="view"></canvas>
  <img id="output" alt="">
`;

const BOOST_FACTOR=10;


async function mainAsync(){
  const canvas = document.querySelector<HTMLCanvasElement>("#view")!;
  const output = document.querySelector<HTMLImageElement>("#output")!;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    preserveDrawingBuffer:true,
    // alpha: true,
  });
  renderer.setPixelRatio(0.25);
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();

  const ambientLight= new THREE.AmbientLight(0xffffff,0.6);
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff,1);
  directionalLight.position.set(10,10,10);
  scene.add(directionalLight);

  {
    const geometry = new THREE.BoxGeometry( 1, 1, 1 );
    const material = new THREE.MeshStandardMaterial( { color: 0x00ff00 } );
    const cube = new THREE.Mesh( geometry, material );
    cube.name="cube";
    scene.add( cube );
    cube.lookAt(new THREE.Vector3(1,1,1));
  }

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
  camera.position.z=5;

  const c=document.createElement("canvas");
  c.width=canvas.width;
  c.height=canvas.height;
  const ctx = c.getContext("2d")!;
  let count=0;
  function render(time: DOMHighResTimeStamp, _frame: XRFrame){
    count+=1;
    // if(2<count){
    //   return;
    // }
    const cube=scene.getObjectByName("cube");
    if(cube){
      cube.rotation.x=time;
      cube.rotation.y=time;
    }

    renderer.render(scene,camera);

    const dataUrl=canvas.toDataURL();
    const image=new Image();
    image.onload=()=>{
      ctx.drawImage(image,0,0);
      const imageData=ctx.getImageData(0,0,c.width,c.height);
      // console.log(imageData.data);
      const hdrData=new Float32Array(imageData.data.length);
      for(let i=0;i<imageData.data.length;i+=4){
        hdrData[i+0]=imageData.data[i+0]/255*BOOST_FACTOR;
        hdrData[i+1]=imageData.data[i+1]/255*BOOST_FACTOR;
        hdrData[i+2]=imageData.data[i+2]/255*BOOST_FACTOR;
        hdrData[i+3]=imageData.data[i+3]/255;
      }
      // console.log(hdrData);

      const dataTexture=new THREE.DataTexture(hdrData,c.width,c.height,THREE.RGBAFormat,THREE.FloatType);
      // console.log(dataTexture);

      const textureMax = findTextureMinMax(dataTexture,"max",renderer);
      // console.log(textureMax);
      encodeAndCompress({
        renderer,
        image:dataTexture,
        // this will encode the full HDR range
        maxContentBoost: Math.max.apply(null,textureMax),
        mimeType: 'image/jpeg',
      }).then((encodingResult)=>{
        encodeJPEGMetadata({
          ...encodingResult,
          sdr: encodingResult.sdr,
          gainMap: encodingResult.gainMap,
        }).then((jpeg)=>{
          dataTexture.dispose();
          var binary = "";
          for (var i = 0; i < jpeg.length; i++){
            binary += String.fromCharCode(jpeg[i]);
          }
          var base64 = window.btoa(binary);
          const mime="image/jpeg";
          const imageUrl = 'data:' + mime + ';base64,' + base64;
          output.src=imageUrl;
  
        });
  
      })

  
    }
    image.src=dataUrl;

    

    // const image=ctx.getImageData(0,0,canvas.width,canvas.height);
    // output.src=dataUrl;
  }
  renderer.setAnimationLoop(render);

  function onWindowResize() {
  
    // camera.aspect = window.innerWidth / window.innerHeight;
    // camera.updateProjectionMatrix();
  
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect=window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  
  }
  window.addEventListener("resize",onWindowResize);

}

mainAsync().catch((error)=>{
  console.error(error);
});
