import * as THREE from 'three'
// Data and visualization
import { CompositionShader} from './CompositionShader.js'
import { BASE_LAYER, BLOOM_LAYER, BLOOM_PARAMS, OVERLAY_LAYER } from "./config/renderConfig.js";

// Rendering
import { MapControls } from 'three/addons/controls/OrbitControls.js'

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

import { Star } from './star.js';
import { Galaxy } from './galaxy.js';
import { CORE_X_DIST, CORE_Y_DIST, GALAXY_THICKNESS } from './config/galaxyConfig.js';

import {gaussianRandom} from './utils.js';



let canvas, renderer, camera, scene, orbit, baseComposer, bloomComposer, overlayComposer

let raycaster = new THREE.Raycaster();
raycaster.layers.set(1);
let mouse = new THREE.Vector2();
let spheres = []
function onClick(event) {
    // camera.layers.set(1);
    // Calculate mouse position in normalized device coordinates
    // (-1 to +1) for both components
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the picking ray
    const intersects = raycaster.intersectObjects(spheres);

    if (intersects.length > 0) {
        window.alert("hi");
        console.log('Sphere clicked!');
    } else {
        console.log('Clicked on empty space.');
    }
}

function initThree() {
    
    // grab canvas
    canvas = document.querySelector('#canvas');
    window.addEventListener('click', onClick, false);
    // scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xEBE2DB, 0.00003);

    // camera
    camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 5000000 );
    camera.position.set(0, 50, 50);
    camera.up.set(0, 0, 1);
    camera.lookAt(0, 0, 0);

    // map orbit
    orbit = new MapControls(camera, canvas)
    orbit.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    orbit.dampingFactor = 0.05;
    orbit.screenSpacePanning = false;
    orbit.minDistance = 1;
    orbit.maxDistance = 16384;
    orbit.maxPolarAngle = (Math.PI / 2) - (Math.PI / 360)

    //Plane Geometry
    // const planeGeometry = new THREE.PlaneGeometry(1000, 1000); // Adjust dimensions as needed
    // const planeMaterial = new THREE.MeshBasicMaterial({ opacity: 1, transparent: true });
    // const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    // scene.add(plane);
   
     
    const geometry = new THREE.SphereGeometry(0.3, 8, 8); // 1 is radius, 8 segments for width and height (low-poly)
    const material = new THREE.MeshBasicMaterial({ 
        color: 0xffffff, // White color for the sphere (or any color you want)
        opacity: 1,      // Fully opaque
        transparent: false // Ensure transparency is disabled
    }); // Yellow color for the star
    
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(5, 5, 5);
    scene.add(sphere)

    for (let i = 0; i < 2000; i++) {
            // let pos = new THREE.Vector3(gaussianRandom(0, CORE_X_DIST), gaussianRandom(0, CORE_Y_DIST), gaussianRandom(0, GALAXY_THICKNESS));
            let x = gaussianRandom(0, CORE_X_DIST)
            let y = gaussianRandom(0, CORE_Y_DIST)
            let z = gaussianRandom(0, GALAXY_THICKNESS)
            // console.log(x,y,z)
            const sphere = new THREE.Mesh(geometry, material);
            sphere.layers.set(BLOOM_LAYER)
            sphere.position.set(x,y,z);
            // sphere.scale.multiplyScalar(0.5)
            scene.add(sphere)
            spheres.push(sphere);
    }

    initRenderPipeline()
    

}

function initRenderPipeline() {

    // Assign Renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        canvas,
        logarithmicDepthBuffer: true,
    })
    renderer.setPixelRatio( window.devicePixelRatio )
    renderer.setSize( window.innerWidth, window.innerHeight )
    renderer.outputEncoding = THREE.sRGBEncoding
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.5

    // General-use rendering pass for chaining
    const renderScene = new RenderPass( scene, camera )

    // Rendering pass for bloom
    const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 )
    bloomPass.threshold = BLOOM_PARAMS.bloomThreshold
    bloomPass.strength = BLOOM_PARAMS.bloomStrength
    bloomPass.radius = BLOOM_PARAMS.bloomRadius

    // bloom composer
    bloomComposer = new EffectComposer(renderer)
    bloomComposer.renderToScreen = false
    bloomComposer.addPass(renderScene)
    bloomComposer.addPass(bloomPass)

    // overlay composer
    overlayComposer = new EffectComposer(renderer)
    overlayComposer.renderToScreen = false
    overlayComposer.addPass(renderScene)

    // Shader pass to combine base layer, bloom, and overlay layers
    const finalPass = new ShaderPass(
        new THREE.ShaderMaterial( {
            uniforms: {
                baseTexture: { value: null },
                bloomTexture: { value: bloomComposer.renderTarget2.texture },
                overlayTexture: { value: overlayComposer.renderTarget2.texture }
            },
            vertexShader: CompositionShader.vertex,
            fragmentShader: CompositionShader.fragment,
            defines: {}
        } ), 'baseTexture'
    );
    finalPass.needsSwap = true;

    // base layer composer
    baseComposer = new EffectComposer( renderer )
    baseComposer.addPass( renderScene )
    baseComposer.addPass(finalPass)
}

function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
}

async function render() {

    orbit.update()

    // fix buffer size
    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }


    // fix aspect ratio
    const canvas = renderer.domElement;
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    camera.updateProjectionMatrix();
    
    
    galaxy.stars.forEach((star) => {
        star.updateScale(camera);
    });

    // galaxy.hazeArray.forEach((haze) => {
    //     haze.updateScale(camera);
    // });

    
    

    // Run each pass of the render pipeline
    renderPipeline()

   
    requestAnimationFrame(render)

    
    

}

function renderPipeline() {

    // Render bloom
    camera.layers.set(BLOOM_LAYER)
    bloomComposer.render()

    // Render overlays
    camera.layers.set(OVERLAY_LAYER)
    overlayComposer.render()

    // Render normal
    camera.layers.set(BASE_LAYER)
    baseComposer.render()

}


initThree()

let axes = new THREE.AxesHelper(100.0)
scene.add(axes)
let galaxy = new Galaxy(scene)

requestAnimationFrame(render)

