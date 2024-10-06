import * as THREE from 'three';
import { Star } from './star.js';
import { Haze } from './haze.js';
import { CORE_X_DIST, CORE_Y_DIST, GALAXY_THICKNESS } from './config/galaxyConfig.js';
import { gaussianRandom } from './utils.js';

export class Galaxy {

    constructor(scene) {
        this.scene = scene;
        
        // Await for stars to be generated before adding to the scene
        this.generateStars().then(stars => {
            stars.forEach(star => star.toThreeObject(scene));
            this.stars = stars;  // Store the stars array
        });

        // this.generateHaze(scene).then(hazeArray => {
        //     hazeArray.forEach(haze => haze.toThreeObject(scene));  // Add haze objects to the scene
        //     this.hazeArray = hazeArray;  // Store the haze array
        // });
        
       
    }

    async generateStars() {  // Make this function async to handle async plotStars
        let stars = [];

        async function loadGaiaData() {
            const response = await fetch('./exo.json'); // Load gaia.json file
            const data = await response.json(); // Parse the data as JSON
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

        async function plotStars() {
            // Load data from exo.json
            const starData = await loadGaiaData();
            
            // Normalize the data
            const normalizedData = normalizeStars(starData);

            // Plot each star in the scene
            normalizedData.forEach(starCoords => {
                const position = new THREE.Vector3(starCoords.X * 1000, starCoords.Y * 1000, starCoords.Z * 1000); // Scaled for visualization
                let star = new Star(position);
                stars.push(star);
            });
        }

        // Call plotStars() to load stars from JSON and wait for completion
        await plotStars(); 

        // Generate random stars after plotting stars from JSON
        // for (let i = 0; i < 2000; i++) {
        //     let pos = new THREE.Vector3(gaussianRandom(0, CORE_X_DIST), gaussianRandom(0, CORE_Y_DIST), gaussianRandom(0, GALAXY_THICKNESS));
        //     let star = new Star(pos);
        //     stars.push(star);
        // }

        return stars;  // Return the stars array once all stars are generated
    }

    // async generateHaze() {  // Make this function async to handle async plotStars
    //     let stars = [];

    //     async function loadGaiaData() {
    //         const response = await fetch('./exo.json'); // Load gaia.json file
    //         const data = await response.json(); // Parse the data as JSON
    //         return data;
    //     }

    //     function normalizeStars(data) {
    //         const maxX = Math.max(...data.map(d => Math.abs(d.X)));
    //         const maxY = Math.max(...data.map(d => Math.abs(d.Y)));
    //         const maxZ = Math.max(...data.map(d => Math.abs(d.Z)));
    //         const maxVal = Math.max(maxX, maxY, maxZ); // Get the overall max value for uniform scaling

    //         return data.map(d => ({
    //             X: d.X / maxVal, 
    //             Y: d.Y / maxVal, 
    //             Z: d.Z / maxVal
    //         }));
    //     }

    //     async function plotStars() {
    //         // Load data from exo.json
    //         const starData = await loadGaiaData();
            
    //         // Normalize the data
    //         const normalizedData = normalizeStars(starData);

    //         // Plot each star in the scene
    //         normalizedData.forEach(starCoords => {
    //             const position = new THREE.Vector3(starCoords.X * 1000, starCoords.Y * 1000, starCoords.Z * 1000); // Scaled for visualization
    //             let haze = new Haze(position);
    //             stars.push(haze);
    //         });
    //     }

    //     // Call plotStars() to load stars from JSON and wait for completion
    //     // await plotStars(); 

    //     // Generate random stars after plotting stars from JSON
    //     // for (let i = 0; i < 2000; i++) {
    //     //     let pos = new THREE.Vector3(gaussianRandom(0, CORE_X_DIST), gaussianRandom(0, CORE_Y_DIST), gaussianRandom(0, GALAXY_THICKNESS));
    //     //     let haze = new Haze(pos);
    //     //     stars.push(haze);
    //     // }

    //     return stars;  // Return the stars array once all stars are generated
    // }
}
