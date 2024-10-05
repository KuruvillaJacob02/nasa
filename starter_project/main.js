import * as THREE from 'three'

// Data and visualization
import { CompositionShader} from './shaders/CompositionShader.js'
import { BASE_LAYER, BLOOM_LAYER, BLOOM_PARAMS, OVERLAY_LAYER } from "./config/renderConfig.js";

// Rendering
import { MapControls } from 'three/addons/controls/OrbitControls.js'

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

import { Star } from './star.js';
import { CORE_X_DIST, CORE_Y_DIST, GALAXY_THICKNESS } from './config/galaxyConfig.js';

let canvas, renderer, camera, scene, orbit, baseComposer, bloomComposer, overlayComposer

function initThree() {

    // grab canvas
    canvas = document.querySelector('#canvas');

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
    
    
    // stars.forEach((star) => {
    //     star.updateScale(camera)
    // })

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

async function loadGaiaData() {
    const response = await fetch('./gaia2.json'); // Load gaia.json file
    const data = await response.json(); // Parse the data as JSON
    console.log('Gaia Data:', data);
    return data;
}

function normalizeStars(data) {
    const maxX = Math.max(...data.map(d => Math.abs(d.X)));
    const maxY = Math.max(...data.map(d => Math.abs(d.Y)));
    const maxZ = Math.max(...data.map(d => Math.abs(d.Z)));
    const maxVal = Math.max(maxX, maxY, maxZ); // Get the overall max value for uniform scaling

    return data.map(d => ({
        X: d.X / maxVal, 
        Y: d.Y / maxVal, 
        Z: d.Z / maxVal
    }));
}

async function plotStars(scene) {
    // Load data from gaia.json
    const starData = await loadGaiaData();
    
    // Normalize the data
    const normalizedData = normalizeStars(starData);

    // Plot each star in the scene
    normalizedData.forEach(starCoords => {
        const position = new THREE.Vector3(starCoords.X * 1000, starCoords.Y * 1000, starCoords.Z * 1000); // Scaled for visualization
        let star = new Star(position);
        star.toThreeObject(scene);
    });
}


initThree()
let axes = new THREE.AxesHelper(100.0)
scene.add(axes)

// const gridHelper = new THREE.GridHelper( 100, 50 );

// gridHelper.rotateX(Math.PI / 2)
// scene.add( gridHelper );

plotStars(scene)  //PLOTTING FROM JSON FILES
// let position = new THREE.Vector3(5,-5.0,0)
// let star = new Star(position)
// star.toThreeObject(scene)


function gaussianRandom(mean=0, stdev=1){
    let u = 1 - Math.random()
    let v = Math.random()
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI* v)

    return z * stdev + mean
}


let stars = []

// for ( let i = 0; i < 2000; i++){
//     let pos = new THREE.Vector3(gaussianRandom(0, CORE_X_DIST), gaussianRandom(0,CORE_Y_DIST), gaussianRandom(0, GALAXY_THICKNESS))
//     let star = new Star(pos)
//     star.toThreeObject(scene)
//     stars.push(star)
// }
requestAnimationFrame(render)

