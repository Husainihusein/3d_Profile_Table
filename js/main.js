import * as THREE from 'three';

import TWEEN from 'three/addons/libs/tween.module.js';
import { TrackballControls } from 'three/addons/controls/TrackballControls.js';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

export function initThreeJSScene() {

    async function fetchSheetData() {
        const sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRGV1PQS1bTbqfIMxDX25GXFSiInBajR0-X39r0aMCi4SbAv3QTXNXrkbaVigG6QRArnjCUUXY01vtT/pub?output=csv';
        const response = await fetch(sheetURL);
        const csvText = await response.text();

        // Proper CSV parsing that handles quoted values
        function parseCSVLine(line) {
            const result = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];

                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        }

        const lines = csvText.trim().split('\n');
        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/ /g, '_'));

        const data = lines.slice(1).map(line => {
            const values = parseCSVLine(line);
            const obj = {};
            headers.forEach((h, i) => {
                obj[h] = values[i]?.trim();
            });
            return obj;
        });

        return data;
    }
    let camera, scene, renderer;
    let controls;

    const objects = [];
    const targets = { table: [], sphere: [], helix: [], grid: [] };

    init();
    animate();


    async function init() {

        camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
        camera.position.z = 3000;

        scene = new THREE.Scene();

        const data = await fetchSheetData();

        // Loop through data
        data.forEach((person, i) => {

            const element = document.createElement('div');
            element.className = 'element';
            element.style.position = 'relative';
            element.style.width = '120px';
            element.style.height = '160px';
            element.style.fontFamily = 'Helvetica, sans-serif';
            element.style.textAlign = 'center';
            element.style.borderRadius = '10px';
            element.style.paddingTop = '5px';
            element.style.boxSizing = 'border-box';
            element.style.padding = '8px';

            let netWorth = 0;
            const netWorthField = person.net_worth || person['Net Worth'];
            if (netWorthField) {
                // remove $ and commas
                netWorth = parseFloat(netWorthField.replace(/[\$,]/g, '')) || 0;
            }

            // Determine color based on net worth ranges
            let r, g, b;
            if (netWorth < 100000) {
                // Red for < $100K (#EF3022)
                r = 239;
                g = 48;
                b = 34;
            } else if (netWorth < 200000) {
                // Yellow for $100K - $200K (#FDCA35)
                r = 253;
                g = 202;
                b = 53;
            } else {
                // Green for >= $200K (#3A9F48)
                r = 58;
                g = 159;
                b = 72;
            }

            element.style.backgroundColor = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},0.2)`;
            element.style.border = `2px solid rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},0.8)`;
            element.style.boxShadow = `0 0 12px rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},0.8)`;

            // Country
            const countryDiv = document.createElement('div');
            countryDiv.style.position = 'absolute';
            countryDiv.style.top = '8px';
            countryDiv.style.left = '8px';
            countryDiv.style.fontSize = '11px';
            countryDiv.style.color = '#fff';
            countryDiv.style.fontWeight = '500';
            countryDiv.textContent = person.country || '';
            element.appendChild(countryDiv);

            // Age
            const ageDiv = document.createElement('div');
            ageDiv.style.position = 'absolute';
            ageDiv.style.top = '8px';
            ageDiv.style.right = '8px';
            ageDiv.style.fontSize = '11px';
            ageDiv.style.zIndex = '10';
            ageDiv.style.color = '#fff';
            ageDiv.style.fontWeight = '500';
            ageDiv.textContent = person.age || '';
            element.appendChild(ageDiv);

            // Photo
            if (person.photo) {
                const img = document.createElement('img');
                img.src = person.photo;
                img.style.width = '100px';
                img.style.height = '85px';
                img.style.marginTop = '22px';
                img.style.objectFit = 'cover';
                img.style.borderRadius = '6px';
                img.style.display = 'block';
                img.style.marginLeft = 'auto';
                img.style.marginRight = 'auto';
                element.appendChild(img);
            }

            // Name
            const nameDiv = document.createElement('div');
            nameDiv.style.fontWeight = 'bold';
            nameDiv.style.marginTop = '5px';
            nameDiv.style.color = '#fff';
            nameDiv.style.fontSize = '12px';
            nameDiv.style.textAlign = 'center';
            nameDiv.style.whiteSpace = 'nowrap';
            nameDiv.style.overflow = 'hidden';
            nameDiv.style.textOverflow = 'ellipsis';
            nameDiv.textContent = person.name || '';
            element.appendChild(nameDiv);

            // Interest
            const interestDiv = document.createElement('div');
            interestDiv.style.fontWeight = 'normal';
            interestDiv.style.fontSize = '10px';
            interestDiv.style.color = '#fff';
            interestDiv.style.width = '100%';
            interestDiv.style.textAlign = 'center';
            interestDiv.style.whiteSpace = 'nowrap';
            interestDiv.style.overflow = 'hidden';
            interestDiv.style.textOverflow = 'ellipsis';
            interestDiv.textContent = person.interest || '';
            element.appendChild(interestDiv);

            // CSS3D object
            const objectCSS = new CSS3DObject(element);
            objectCSS.position.x = Math.random() * 4000 - 2000;
            objectCSS.position.y = Math.random() * 4000 - 2000;
            objectCSS.position.z = Math.random() * 4000 - 2000;
            scene.add(objectCSS);
            objects.push(objectCSS);

            // Table layout: 20 columns x 10 rows
            const tableObj = new THREE.Object3D();
            const col = i % 20;
            const row = Math.floor(i / 20);
            tableObj.position.x = (col * 140) - 1330;
            tableObj.position.y = -(row * 180) + 990;
            targets.table.push(tableObj);
        });

        // Sphere
        const vector = new THREE.Vector3();

        for (let i = 0, l = objects.length; i < l; i++) {

            const phi = Math.acos(- 1 + (2 * i) / l);
            const theta = Math.sqrt(l * Math.PI) * phi;

            const object = new THREE.Object3D();

            object.position.setFromSphericalCoords(800, phi, theta);

            vector.copy(object.position).multiplyScalar(2);

            object.lookAt(vector);

            targets.sphere.push(object);

        }

        // DOUBLE HELIX
        for (let i = 0, l = objects.length; i < l; i++) {

            // Determine which strand of the double helix (0 or 1)
            const helixStrand = i % 2;

            // Each strand rotates in the same direction but offset by PI radians (180 degrees)
            const theta = (i * 0.175) + Math.PI + (helixStrand * Math.PI);
            const y = - (i * 8) + 450;

            const object = new THREE.Object3D();

            object.position.setFromCylindricalCoords(900, theta, y);

            vector.x = object.position.x * 2;
            vector.y = object.position.y;
            vector.z = object.position.z * 2;

            object.lookAt(vector);

            targets.helix.push(object);

        }

        // GRID: 5 columns x 4 rows x 10 layers (5x4x10)
        for (let i = 0; i < objects.length; i++) {

            const object = new THREE.Object3D();

            // 5 columns (0-4)
            const col = i % 5;

            // 4 rows (0-3)
            const row = Math.floor(i / 5) % 4;

            // 10 layers deep (each layer has 5x4 = 20 items)
            const layer = Math.floor(i / 20);

            object.position.x = (col * 400) - 800;
            object.position.y = -(row * 400) + 600;
            object.position.z = (layer * 1000) - 4500;

            targets.grid.push(object);

        }

        //

        renderer = new CSS3DRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('container').appendChild(renderer.domElement);

        //

        controls = new TrackballControls(camera, renderer.domElement);
        controls.minDistance = 500;
        controls.maxDistance = 6000;
        controls.addEventListener('change', render);

        const buttonTable = document.getElementById('table');
        buttonTable.addEventListener('click', function () {

            transform(targets.table, 2000);

        });

        const buttonSphere = document.getElementById('sphere');
        buttonSphere.addEventListener('click', function () {

            transform(targets.sphere, 2000);

        });

        const buttonHelix = document.getElementById('helix');
        buttonHelix.addEventListener('click', function () {

            transform(targets.helix, 2000);

        });

        const buttonGrid = document.getElementById('grid');
        buttonGrid.addEventListener('click', function () {

            transform(targets.grid, 2000);

        });

        transform(targets.table, 2000);



        window.addEventListener('resize', onWindowResize);

    }

    function transform(targets, duration) {

        TWEEN.removeAll();

        for (let i = 0; i < objects.length; i++) {

            const object = objects[i];
            const target = targets[i];

            new TWEEN.Tween(object.position)
                .to({ x: target.position.x, y: target.position.y, z: target.position.z }, Math.random() * duration + duration)
                .easing(TWEEN.Easing.Exponential.InOut)
                .start();

            new TWEEN.Tween(object.rotation)
                .to({ x: target.rotation.x, y: target.rotation.y, z: target.rotation.z }, Math.random() * duration + duration)
                .easing(TWEEN.Easing.Exponential.InOut)
                .start();

        }

        new TWEEN.Tween(this)
            .to({}, duration * 2)
            .onUpdate(render)
            .start();

    }

    function onWindowResize() {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);

        render();

    }

    function animate() {

        requestAnimationFrame(animate);

        TWEEN.update();

        controls.update();

    }

    function render() {

        renderer.render(scene, camera);

    }
}
initThreeJSScene();