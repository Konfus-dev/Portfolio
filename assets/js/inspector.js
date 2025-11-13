import * as THREE from 'https://unpkg.com/three@0.161.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.161.0/examples/jsm/controls/OrbitControls.js?module';

const bootScreen = document.querySelector('.boot-screen');
const bootLog = document.querySelector('.boot-screen__log');
const bootHint = document.querySelector('.boot-screen__hint');
const terminalStatus = document.getElementById('terminal-status');
const inspector = document.querySelector('.inspector');
const inspectorOverlay = document.querySelector('.inspector__overlay p');
const readoutTitle = document.querySelector('.signal-readout__title');
const readoutSubtitle = document.querySelector('.signal-readout__subtitle');
const readoutSummary = document.querySelector('.signal-readout__summary');
const readoutChannel = document.querySelector('.signal-readout__channel');
const readoutStack = document.querySelector('.signal-readout__stack');
const readoutCoords = document.querySelector('.signal-readout__coords');

const bootLines = [
  { text: ':: JH-OS v4.2 // INTERSTELLAR OPS ::', className: 'boot-screen__line--heading' },
  { text: 'MEMORY CHECK ............... OK' },
  { text: 'CRT PHOSPHOR CALIBRATION ... COMPLETE' },
  { text: 'INPUT DEVICES .............. ONLINE' },
  { text: 'NETWORK LINK ............... STABLE' },
  { text: 'SIGNAL ARRAY ............... STANDING BY' },
  { text: 'LOADING PILOT PROFILE ...... JEREMY HUMMEL' },
  { text: 'MISSION: DEPLOY TOOLING THAT FEELS LIKE MAGIC' },
  { text: '---' },
  { text: 'Orbital dataset ready. Rotate planet, target signal, decrypt packet.' },
];

let bootComplete = false;
let inspectorInitialized = false;
let animationId;

const signals = [
  {
    id: 'SIG-01',
    name: 'LiveOps Control Center',
    tagline: 'Operator console for calm launches',
    summary: 'Unified build deployment, monitoring, and alerting into a single screen, slicing release prep time by 40%.',
    stack: 'C# · WPF · Jira · Confluence',
    lat: 34.05,
    lon: -118.25,
  },
  {
    id: 'SIG-02',
    name: 'Blueprint Scripting Toolkit',
    tagline: 'Design faster without engineering queues',
    summary: 'Extended Unreal Engine with custom nodes, diagnostics, and UX polish so designers could iterate features on demand.',
    stack: 'Unreal Engine · C++ · UX Research',
    lat: 47.61,
    lon: -122.33,
  },
  {
    id: 'SIG-03',
    name: 'Creative Analytics HUD',
    tagline: 'Data overlays for instant insight',
    summary: 'Delivered an in-editor telemetry HUD surfacing player feedback and live metrics to accelerate decision loops.',
    stack: 'Python · GraphQL · Data Viz',
    lat: 37.77,
    lon: -122.42,
  },
];

let renderer;
let scene;
let camera;
let controls;
let planetGroup;
const signalMeshes = [];
const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let hoveredMarker = null;
let activeMarker = null;
let pointerDown = null;

function appendBootLine({ text, className }) {
  const line = document.createElement('p');
  line.textContent = text;
  if (className) {
    line.classList.add(className);
  }
  bootLog.appendChild(line);
  bootLog.scrollTop = bootLog.scrollHeight;
}

async function runBootSequence() {
  for (const line of bootLines) {
    appendBootLine(line);
    await new Promise((resolve) => setTimeout(resolve, 420));
  }
  bootComplete = true;
  bootHint.classList.add('boot-screen__hint--visible');
  bootHint.setAttribute('aria-hidden', 'false');
  terminalStatus.textContent = 'AWAITING INPUT';
}

function latLonToVector3(lat, lon, radius) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

function highlightMarker(marker) {
  if (activeMarker && activeMarker !== marker) {
    const { material, baseColor, baseEmissive } = activeMarker.userData;
    material.color.copy(baseColor);
    material.emissive.copy(baseEmissive);
    material.emissiveIntensity = 1.4;
  }

  if (marker) {
    const { material } = marker.userData;
    material.color.set(0xd9ffe8);
    material.emissive.set(0x6bffd1);
    material.emissiveIntensity = 2.2;
    if (controls) {
      controls.autoRotate = false;
    }
  }

  activeMarker = marker || null;

  if (!activeMarker && controls) {
    controls.autoRotate = true;
  }
}

function updateReadout(signal) {
  if (!signal) {
    readoutTitle.textContent = 'Awaiting input…';
    readoutSubtitle.textContent = 'Engage a signal marker to review the project dossier.';
    readoutChannel.textContent = '—';
    readoutStack.textContent = '—';
    readoutCoords.textContent = '—';
    readoutSummary.textContent = 'The archive is ready. Rotate the orb and select a glowing node to decrypt its contents.';
    inspectorOverlay.textContent = 'TRACKING SIGNALS...';
    return;
  }

  readoutTitle.textContent = signal.name;
  readoutSubtitle.textContent = signal.tagline;
  readoutChannel.textContent = signal.id;
  readoutStack.textContent = signal.stack;
  readoutCoords.textContent = `${signal.lat.toFixed(2)}° / ${signal.lon.toFixed(2)}°`;
  readoutSummary.textContent = signal.summary;
  inspectorOverlay.textContent = `${signal.id} LOCKED`;
}

function updatePointerFromEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
}

function onPointerMove(event) {
  if (!renderer) return;
  updatePointerFromEvent(event);
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(signalMeshes, false);
  hoveredMarker = intersects.length ? intersects[0].object : null;
  renderer.domElement.style.cursor = hoveredMarker ? 'pointer' : 'grab';
}

function onPointerDown(event) {
  pointerDown = { x: event.clientX, y: event.clientY };
}

function onPointerUp(event) {
  if (!pointerDown) return;
  const dx = Math.abs(event.clientX - pointerDown.x);
  const dy = Math.abs(event.clientY - pointerDown.y);
  const moved = Math.sqrt(dx * dx + dy * dy) > 6;
  pointerDown = null;
  if (moved) {
    return;
  }
  if (hoveredMarker) {
    highlightMarker(hoveredMarker);
    updateReadout(hoveredMarker.userData.signal);
  }
}

function buildScene() {
  const display = document.querySelector('.inspector__display');
  const canvas = document.getElementById('planet-canvas');
  scene = new THREE.Scene();
  scene.background = null;

  camera = new THREE.PerspectiveCamera(45, display.clientWidth / display.clientHeight, 0.1, 100);
  camera.position.set(0, 0, 5.75);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(display.clientWidth, display.clientHeight, false);

  planetGroup = new THREE.Group();
  scene.add(planetGroup);

  const coreGeometry = new THREE.SphereGeometry(1.8, 64, 64);
  const coreMaterial = new THREE.MeshStandardMaterial({
    color: 0x083024,
    roughness: 0,
    metalness: 0.25,
    emissive: 0x06281d,
    emissiveIntensity: 0.85,
  });
  const planetCore = new THREE.Mesh(coreGeometry, coreMaterial);
  planetGroup.add(planetCore);

  const overlayGeometry = new THREE.SphereGeometry(1.805, 64, 64);
  const overlayMaterial = new THREE.MeshStandardMaterial({
    color: 0x11ff96,
    transparent: true,
    opacity: 0.08,
    emissive: 0x11ff96,
    emissiveIntensity: 0.5,
    blending: THREE.AdditiveBlending,
  });
  const planetOverlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
  planetOverlay.material.side = THREE.BackSide;
  planetGroup.add(planetOverlay);

  const gridGeometry = new THREE.SphereGeometry(1.81, 48, 48, 0, Math.PI * 2, 0, Math.PI);
  const gridMaterial = new THREE.MeshBasicMaterial({
    wireframe: true,
    color: 0x20ffad,
    transparent: true,
    opacity: 0.18,
  });
  const gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
  planetGroup.add(gridMesh);

  const ambient = new THREE.AmbientLight(0x83ffd4, 0.35);
  scene.add(ambient);

  // const keyLight = new THREE.DirectionalLight(0xb4ffe6, 0.85);
  // keyLight.position.set(5, 3, 6);
  // scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(0x46f7c0, 0.75);
  rimLight.position.set(-6, -4, -3);
  scene.add(rimLight);

  const markerGeometry = new THREE.SphereGeometry(0.085, 20, 20);

  signals.forEach((signal) => {
    const markerMaterial = new THREE.MeshStandardMaterial({
      color: 0x92ffcf,
      emissive: 0x2bff95,
      emissiveIntensity: 1.4,
      roughness: 0.35,
      metalness: 0.15,
    });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(latLonToVector3(signal.lat, signal.lon, 1.88));
    marker.lookAt(new THREE.Vector3(0, 0, 0));
    marker.userData = {
      signal,
      material: markerMaterial,
      baseColor: markerMaterial.color.clone(),
      baseEmissive: markerMaterial.emissive.clone(),
    };
    planetGroup.add(marker);
    signalMeshes.push(marker);
  });

  const particlesGeometry = new THREE.BufferGeometry();
  const particleCount = 600;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const distance = 3.5 + Math.random() * 6;
    const y = (Math.random() - 0.5) * 6;
    positions[i * 3] = Math.cos(angle) * distance;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * distance;
  }
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particlesMaterial = new THREE.PointsMaterial({
    size: 0.035,
    color: 0x2aff96,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const particles = new THREE.Points(particlesGeometry, particlesMaterial);
  scene.add(particles);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 3.6;
  controls.maxDistance = 7;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.45;
  controls.target.set(0, 0, 0);
  controls.update();

  controls.addEventListener('start', () => {
    controls.autoRotate = false;
  });
  controls.addEventListener('end', () => {
    if (!activeMarker) {
      controls.autoRotate = true;
    }
  });

  renderer.domElement.style.cursor = 'grab';
  renderer.domElement.addEventListener('pointermove', onPointerMove);
  renderer.domElement.addEventListener('pointerdown', onPointerDown);
  renderer.domElement.addEventListener('pointerup', onPointerUp);
  renderer.domElement.addEventListener('pointerleave', () => {
    hoveredMarker = null;
    renderer.domElement.style.cursor = 'grab';
  });

  window.addEventListener('resize', onResize);
}

function onResize() {
  if (!renderer || !camera) return;
  const display = document.querySelector('.inspector__display');
  const width = display.clientWidth;
  const height = display.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function animate() {
  animationId = requestAnimationFrame(animate);
  if (planetGroup) {
    planetGroup.rotation.y += 0.0006;
  }
  if (controls) {
    controls.update();
  }
  renderer.render(scene, camera);
}

function initInspector() {
  if (inspectorInitialized) return;
  inspectorInitialized = true;
  terminalStatus.textContent = 'INSPECTOR ONLINE';
  buildScene();
  updateReadout(null);
  animate();
}

function startInspector() {
  if (!bootComplete) return;
  bootScreen.classList.add('boot-screen--hidden');
  bootScreen.setAttribute('aria-hidden', 'true');
  inspector.classList.add('inspector--active');
  inspector.setAttribute('aria-hidden', 'false');
  initInspector();
}

runBootSequence();

bootScreen.addEventListener('click', startInspector);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    startInspector();
  }
  if (event.key === 'Escape' && inspectorInitialized) {
    highlightMarker(null);
    updateReadout(null);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  } else if (!document.hidden && inspectorInitialized && !animationId) {
    animate();
  }
});

export {}; // Keeps module scope isolated
