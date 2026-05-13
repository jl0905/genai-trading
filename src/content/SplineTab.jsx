import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import TvInteractiveChart from './tvInteractiveChart.jsx';
import { useTheme } from '../ThemeContext.jsx';

export default function SplineTab({ isActive = true }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const staircaseRef = useRef(null); // Entire staircase group rotates as one unit
  const reqIdRef = useRef(null);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Novel tileable interface state tracking the currently selected recursive tile (in percentage of full content area)
  const [selectedTile, setSelectedTile] = useState({
    left: 0,
    top: 0,
    width: 100,
    height: 100
  });

  // History state for undo functionality
  const [tileHistory, setTileHistory] = useState([]);

  // State to manage placed components and component selection menu
  const [placedComponents, setPlacedComponents] = useState([]);
  const [showComponentMenu, setShowComponentMenu] = useState(false);

  // Keyboard navigation listener for recursive tile subdivision
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      // Ignore key presses if modifier keys are pressed or if focus is inside an input element
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      const key = e.key.toLowerCase();
      
      if (key === 'z') {
        setTileHistory((history) => {
          if (history.length === 0) return history;
          const newHistory = [...history];
          const previousTile = newHistory.pop();
          setSelectedTile(previousTile);
          return newHistory;
        });
        return;
      }

      if (['w', 'a', 's', 'd', 'r', 'escape'].includes(key)) {
        setSelectedTile((prev) => {
          let nextTile = prev;

          if (key === 'r' || key === 'escape') {
            nextTile = { left: 0, top: 0, width: 100, height: 100 };
          } else if (key === 'd') {
            if (prev.width > 1.5) nextTile = { ...prev, left: prev.left + prev.width / 2, width: prev.width / 2 };
          } else if (key === 'a') {
            if (prev.width > 1.5) nextTile = { ...prev, width: prev.width / 2 };
          } else if (key === 'w') {
            if (prev.height > 1.5) nextTile = { ...prev, height: prev.height / 2 };
          } else if (key === 's') {
            if (prev.height > 1.5) nextTile = { ...prev, top: prev.top + prev.height / 2, height: prev.height / 2 };
          }

          // Push to history only if the tile actually changed
          if (nextTile !== prev) {
            setTileHistory(history => [...history, prev]);
          }
          
          return nextTile;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive]);

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

    // Define the Colors: Deep red and a rich, vibrant green base hue ensuring a stunning diagonal sheen
    const colorRed = new THREE.Color('#550000');
    const colorGreen = new THREE.Color('#008833'); // Darker but highly vibrant emerald green specifically for the sheen
    const clock = new THREE.Clock();

    // Group/Track the Cubes: Tracking all individual mesh instances to animate independent waves
    const cubes = [];

    // Material Polish: Full physical weight, dense light absorption, clearcoat Fresnel shell, and intense edge fringing
    const baseMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#eef4ff'),
      transmission: 0.85, // Set to achieve a solid frosted interior look
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

    // Dynamic Light/Dark Theme Controller ensuring precise physical contrast
    const updateThemeSettings = () => {
      const isDark = document.documentElement.classList.contains('dark');
      // Premium Slate-900 (#0f172a) for Dark Mode background, Cool Off-White (#f0f4f8) for Light Mode
      scene.background = new THREE.Color(isDark ? '#0f172a' : '#f0f4f8');
    };
    updateThemeSettings();

    // Live MutationObserver capturing instant header theme-toggle events
    const themeObserver = new MutationObserver(() => {
      updateThemeSettings();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    // 5. Build staircase formation: 4 bottom → 3 → 2 → 1 top (10 cubes total)
    // Material Independence (CRITICAL): Each cube clones baseMaterial so waves pass across independent instances
    const staircaseGroup = new THREE.Group();
    const staircaseLayout = [4, 3, 2, 1]; // cubes per row, bottom to top

    staircaseLayout.forEach((count, row) => {
      for (let col = 0; col < count; col++) {
        const clonedMaterial = baseMaterial.clone();
        const cube = new THREE.Mesh(geometry, clonedMaterial);
        cube.position.set(
          (col + row) * step,
          row * step,
          0
        );
        staircaseGroup.add(cube);
        cubes.push(cube);
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

      // The Wave Math: Calculate diagonal offsets passing dynamically from cube to cube
      const time = clock.getElapsedTime();
      cubes.forEach(cube => {
        const wave = Math.sin(time * 2.0 + cube.position.x * 1.5 + cube.position.y * 1.5);
        // Normalize the wave value from [-1, 1] to [0, 1]
        const normalizedWave = (wave + 1.0) * 0.5;
        // Smoothly lerp material color between the custom theme red and green shades
        cube.material.color.lerpColors(colorRed, colorGreen, normalizedWave);
      });

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
      // Dispose of independent cloned materials to ensure clean WebGL memory release
      cubes.forEach(cube => {
        if (cube.material) cube.material.dispose();
      });
      baseMaterial.dispose();
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

      {/* Novel Tileable Interface Overlay sitting on top of the visuals */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {/* Selection Border enveloping the currently selected tile area */}
        <div
          className="absolute border-[3px] border-dotted transition-all duration-300 ease-in-out box-border rounded-sm"
          style={{
            left: `${selectedTile.left}%`,
            top: `${selectedTile.top}%`,
            width: `${selectedTile.width}%`,
            height: `${selectedTile.height}%`,
            borderColor: isDark ? '#ffffff' : '#000000',
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
            boxShadow: isDark
              ? '0 0 20px rgba(255, 255, 255, 0.15), inset 0 0 20px rgba(255, 255, 255, 0.15)'
              : '0 0 20px rgba(0, 0, 0, 0.1), inset 0 0 20px rgba(0, 0, 0, 0.05)'
          }}
        >
          {/* Placeholder reminder for future content component placement as specified by user */}
          <div 
            className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-sm pointer-events-auto cursor-pointer p-1 overflow-hidden"
            onClick={() => setShowComponentMenu(true)}
          >
            {showComponentMenu ? (
              <div className="flex flex-col gap-2 items-center">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setPlacedComponents([...placedComponents, { ...selectedTile, type: 'chart', id: Date.now() }]);
                    setShowComponentMenu(false);
                  }}
                  className="bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs px-4 py-2 rounded shadow-lg transition-colors cursor-pointer"
                >
                  Place Interactive Chart
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowComponentMenu(false);
                  }}
                  className="bg-gray-600/80 hover:bg-gray-500 text-white text-xs px-4 py-2 rounded shadow-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="text-white/90 text-[10px] sm:text-xs font-mono border border-white/20 px-1 sm:px-3 py-0.5 sm:py-1.5 rounded bg-white/5 max-w-full truncate text-center">
                + Place Component Here
              </div>
            )}
          </div>
        </div>

        {/* Render Placed Components */}
        {placedComponents.map((comp) => (
          <div 
            key={comp.id} 
            className="absolute pointer-events-auto z-20 border border-white/10 shadow-2xl"
            style={{
              left: `${comp.left}%`,
              top: `${comp.top}%`,
              width: `${comp.width}%`,
              height: `${comp.height}%`,
              backgroundColor: 'var(--bg-main)'
            }}
          >
            <button
              className="absolute top-2 right-2 z-50 bg-red-500/80 hover:bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center cursor-pointer shadow-lg text-sm transition-colors"
              onClick={() => setPlacedComponents(placedComponents.filter(c => c.id !== comp.id))}
              title="Remove Component"
            >
              &times;
            </button>
            {comp.type === 'chart' && <TvInteractiveChart isActive={isActive} isCompact={comp.width < 100 || comp.height < 100} />}
          </div>
        ))}

        {/* Helpful User Instructions Drawer/Panel */}
        <div className="absolute bottom-6 right-6 pointer-events-auto" style={{ bottom: '24px', right: '24px' }}>
          <div
            className="bg-slate-900/95 backdrop-blur-xl border border-white/20 shadow-2xl text-white/90"
            style={{
              boxSizing: 'border-box',
              width: '280px',
              padding: '16px',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {/* Header section with Title and Reset */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.1em', color: '#34d399', fontFamily: 'monospace' }}>
                SUBDIVISION CONTROLS
              </span>
              <button
                onClick={() => setSelectedTile({ left: 0, top: 0, width: 100, height: 100 })}
                className="bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                style={{
                  fontSize: '9px',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: '#ffffff',
                  fontFamily: 'monospace',
                  background: 'rgba(255,255,255,0.08)'
                }}
              >
                Reset (R)
              </button>
            </div>

            {/* Shortcuts Grid */}
            <div
              className="bg-black/40 border border-white/10"
              style={{
                boxSizing: 'border-box',
                padding: '12px',
                borderRadius: '8px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                background: 'rgba(0,0,0,0.35)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <kbd style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', fontFamily: 'monospace' }}>W</kbd>
                <span style={{ fontSize: '9px', fontFamily: 'monospace', opacity: 0.8 }}>Top Half</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <kbd style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', fontFamily: 'monospace' }}>S</kbd>
                <span style={{ fontSize: '9px', fontFamily: 'monospace', opacity: 0.8 }}>Bottom Half</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <kbd style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', fontFamily: 'monospace' }}>A</kbd>
                <span style={{ fontSize: '9px', fontFamily: 'monospace', opacity: 0.8 }}>Left Half</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <kbd style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', fontFamily: 'monospace' }}>D</kbd>
                <span style={{ fontSize: '9px', fontFamily: 'monospace', opacity: 0.8 }}>Right Half</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <kbd style={{ width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', fontFamily: 'monospace' }}>Z</kbd>
                <span style={{ fontSize: '9px', fontFamily: 'monospace', opacity: 0.8 }}>Undo</span>
              </div>
            </div>

            {/* Footer Text */}
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', fontStyle: 'italic', textAlign: 'center', marginTop: '0px' }}>
              Recursive subdivisions. Placement ready.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
