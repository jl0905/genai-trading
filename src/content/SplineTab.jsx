import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

export default function SplineTab({ isActive = true }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const staircaseRef = useRef(null); // Entire staircase group rotates as one unit
  const reqIdRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // 1. Scene Setup
    const scene = new THREE.Scene();

    sceneRef.current = scene;

    // 2. Camera Setup — pulled back to frame the full staircase
    const width = currentMount.clientWidth || window.innerWidth;
    const height = currentMount.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 6;

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;
    currentMount.appendChild(renderer.domElement);

    // CRITICAL: Implement RoomEnvironment so the premium glass has an environment to reflect and refract
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    // Initialize standard WebGL uniforms library for physically correct RectAreaLight rendering
    RectAreaLightUniformsLib.init();

    // 4. Geometry Upgrade: Ultra-smooth rounded box geometry with highly polished bevels
    const cubeSize = 0.58;
    const gap = 0.03;
    const step = cubeSize + gap; // Distance between cube centers
    // Utilizing 12 segments and a refined 0.08 radius to make the cubes slightly less rounded while keeping perfectly smooth bevels
    const geometry = new RoundedBoxGeometry(cubeSize, cubeSize, cubeSize, 12, 0.08);

    // Material Polish: Full physical weight, dense light absorption, clearcoat Fresnel shell, and intense edge fringing
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#eef4ff'), // Base light icy blue for light mode
      transmission: 0.85, // Set to 0.9 to achieve a solid frosted interior look
      opacity: 1.0, // Retain guaranteed 1.0 opacity to avoid looking like flat milky plastic
      transparent: true,
      roughness: 0.15, // Slightly frosted interior depth
      metalness: 0.0,
      ior: 1.5, // Standard glass index of refraction
      dispersion: 2.5, // Elevated chromatic dispersion driving rainbow edge fringing
      thickness: 1.5, // Scaled optimally to the upgraded geometry volume

      // The Fresnel Shell (Clearcoat): Wrapping the frosted interior in a razor-sharp, mirror-like varnish
      clearcoat: 1.0,
      clearcoatRoughness: 0.0,

      // Add Physical Volume (CRITICAL): Dense internal light absorption giving real optical weight
      attenuationColor: new THREE.Color('#e6f2ff'), // Subtle icy blue/cyan volumetric tint
      attenuationDistance: 2.0, // Thicker parts absorb light perfectly based on cube scale

      // High-end holographic effect parameters
      iridescence: 1.0,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [100, 400],
    });

    // Dynamic Light/Dark Theme Controller ensuring precise physical contrast and customized cube colors
    const updateThemeSettings = () => {
      const isDark = document.documentElement.classList.contains('dark');
      // Premium Slate-900 (#0f172a) for Dark Mode background, Cool Off-White (#f0f4f8) for Light Mode
      scene.background = new THREE.Color(isDark ? '#0f172a' : '#f0f4f8');

      // Bring back the cool darker colors of the dark mode cubes:
      // Uses a cool sophisticated slate/chrome-blue tint (#334155) in dark mode, light icy blue (#eef4ff) in light mode
      material.color.set(isDark ? '#334155' : '#eef4ff');
    };
    updateThemeSettings();

    // Live MutationObserver capturing instant header theme-toggle events
    const themeObserver = new MutationObserver(() => {
      updateThemeSettings();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // 5. Build staircase formation: 4 bottom → 3 → 2 → 1 top (10 cubes total)
    // All cubes share the single premium iridescent optical glass material
    const staircaseGroup = new THREE.Group();
    const staircaseLayout = [4, 3, 2, 1]; // cubes per row, bottom to top

    staircaseLayout.forEach((count, row) => {
      for (let col = 0; col < count; col++) {
        const cube = new THREE.Mesh(geometry, material);
        cube.position.set(
          (col + row) * step,
          row * step,
          0
        );
        staircaseGroup.add(cube);
      }
    });

    // Center the staircase group at origin
    const box = new THREE.Box3().setFromObject(staircaseGroup);
    const center = box.getCenter(new THREE.Vector3());
    staircaseGroup.children.forEach(child => child.position.sub(center));

    staircaseRef.current = staircaseGroup;
    scene.add(staircaseGroup);

    // 6. Lighting Setup: Using colorful pink and cyan RectAreaLights around the cubes
    // providing dynamic, luminous gradients for the RoomEnvironment glass to reflect and refract
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Front specular lighting angled from the top-left to define clear geometry planes
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0);
    directionalLight.position.set(-5, 5, 5);
    scene.add(directionalLight);

    // Bright white DirectionalLight pointing slightly towards the camera to force strong rim lighting on the clearcoat edges
    const rimLight = new THREE.DirectionalLight(0xffffff, 3.5);
    rimLight.position.set(2, 4, -5);
    scene.add(rimLight);

    // Vibrant Pink RectAreaLight illuminating from the left/top
    const pinkRectLight = new THREE.RectAreaLight(0xffb6c1, 6.0, 4, 4);
    pinkRectLight.position.set(-4, 2, 3);
    pinkRectLight.lookAt(0, 0, 0);
    scene.add(pinkRectLight);

    // Vibrant Cyan RectAreaLight illuminating from the right/bottom
    const cyanRectLight = new THREE.RectAreaLight(0x00ffff, 6.0, 4, 4);
    cyanRectLight.position.set(4, -2, 3);
    cyanRectLight.lookAt(0, 0, 0);
    scene.add(cyanRectLight);

    // 7. Animation Loop
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);

      // Rotate the entire staircase as one rigid body
      if (staircaseRef.current && !isDragging) {
        staircaseRef.current.rotation.x += 0.002;
        staircaseRef.current.rotation.y += 0.004;
      }

      renderer.render(scene, camera);
    };
    animate();

    // 8. Mouse Interaction Controls — drag rotates the whole staircase group
    const handleMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e) => {
      if (!isDragging || !staircaseRef.current) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      staircaseRef.current.rotation.y += deltaX * 0.008;
      staircaseRef.current.rotation.x += deltaY * 0.008;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    // Camera Zoom Controls via trackpad pinch-to-zoom or scroll wheel
    const handleWheel = (e) => {
      e.preventDefault(); // Prevents browser page zooming/scrolling while adjusting the 3D scene view
      
      // Adapt zoom sensitivity based on ctrlKey (active during trackpad pinch gestures) vs standard wheel
      const zoomSpeed = e.ctrlKey ? 0.02 : 0.005;
      camera.position.z += e.deltaY * zoomSpeed;
      
      // Clamp camera distance smoothly so objects remain perfectly visible and don't clip the near/far planes
      camera.position.z = Math.max(2.5, Math.min(12.0, camera.position.z));
    };

    const domElement = renderer.domElement;
    domElement.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    domElement.addEventListener('wheel', handleWheel, { passive: false });

    // 9. Responsive Window Resize Handler
    const handleResize = () => {
      if (!currentMount || !rendererRef.current) return;
      const newWidth = currentMount.clientWidth;
      const newHeight = currentMount.clientHeight;

      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(currentMount);

    // Cleanup Resources
    return () => {
      cancelAnimationFrame(reqIdRef.current);
      resizeObserver.disconnect();
      themeObserver.disconnect();

      domElement.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      domElement.removeEventListener('wheel', handleWheel);

      if (currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      className="flex flex-col md:flex-row items-center justify-center h-full w-full overflow-hidden relative select-none"
      style={{ backgroundColor: 'var(--bg-main)' }}
    >
      {/* Three.js canvas mount point */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing flex items-center justify-center" />
    </div>
  );
}
