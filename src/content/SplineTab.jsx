import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import TvInteractiveChart from './tvInteractiveChart.jsx';
import Reader from './Reader.jsx';
import { useTheme } from '../ThemeContext.jsx';

// ---------------------------------------------------------------------------
// Workspace layout: a binary split tree (tmux-style).
// leaf  = { type: 'leaf', id, content: null | 'chart' | 'reader' }
// split = { type: 'split', id, dir: 'row' | 'column', children: [node, node] }
// ---------------------------------------------------------------------------

let paneCounter = 0;
const createLeaf = () => ({ type: 'leaf', id: `pane-${++paneCounter}`, content: null });

function mapTree(node, id, fn) {
  if (node.id === id) return fn(node);
  if (node.type !== 'split') return node;
  return { ...node, children: node.children.map((c) => mapTree(c, id, fn)) };
}

// Removing a pane promotes its sibling into the parent's slot.
function removeLeaf(node, id) {
  if (node.type !== 'split') return node;
  const idx = node.children.findIndex((c) => c.id === id && c.type === 'leaf');
  if (idx !== -1) return node.children[1 - idx];
  return { ...node, children: node.children.map((c) => removeLeaf(c, id)) };
}

function treeHasContent(node) {
  if (node.type === 'leaf') return node.content !== null;
  return node.children.some(treeHasContent);
}

// Memoized so splitting/undoing elsewhere in the tree never re-renders a
// mounted chart — chart instances are expensive to reconcile.
const PaneBody = React.memo(function PaneBody({ content, isActive, compact }) {
  if (content === 'chart') return <TvInteractiveChart isActive={isActive} isCompact={compact} />;
  if (content === 'reader') {
    return (
      <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
        <Reader isActive={isActive} />
      </div>
    );
  }
  return null;
});

const paneBtnStyle = {
  fontSize: '11px',
  fontWeight: 600,
  fontFamily: 'var(--font-display)',
  padding: '6px 14px',
  borderRadius: '999px',
  border: '1px solid var(--border-main)',
  background: 'var(--bg-panel)',
  color: 'var(--text-main)',
  cursor: 'pointer',
  boxShadow: 'var(--shadow-soft)',
};

const toolbarBtnStyle = {
  width: '24px',
  height: '24px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '12px',
  lineHeight: 1,
  borderRadius: '6px',
  border: '1px solid var(--border-main)',
  background: 'var(--bg-panel)',
  color: 'var(--text-muted)',
  cursor: 'pointer',
};

function PaneView({ node, depth, isActive, onSplit, onSetContent, onClose, isRoot }) {
  if (node.type === 'split') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: node.dir,
          width: '100%',
          height: '100%',
          gap: '6px',
        }}
      >
        {node.children.map((child) => (
          <div key={child.id} style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
            <PaneView
              node={child}
              depth={depth + 1}
              isActive={isActive}
              onSplit={onSplit}
              onSetContent={onSetContent}
              onClose={onClose}
              isRoot={false}
            />
          </div>
        ))}
      </div>
    );
  }

  const filled = node.content !== null;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        borderRadius: '10px',
        overflow: 'hidden',
        border: filled ? '1px solid var(--border-main)' : '1px dashed var(--border-main)',
        backgroundColor: filled ? 'var(--bg-main)' : 'transparent',
        pointerEvents: filled ? 'auto' : 'none',
      }}
    >
      {filled ? (
        <>
          <PaneBody content={node.content} isActive={isActive} compact={depth > 0} />
          {/* Bottom-right so it never covers the chart's own header controls */}
          <div
            style={{
              position: 'absolute',
              bottom: '6px',
              right: '6px',
              zIndex: 50,
              display: 'flex',
              gap: '4px',
              opacity: 0.75,
            }}
          >
            <button style={toolbarBtnStyle} title="Split right" onClick={() => onSplit(node.id, 'row')}>◫</button>
            <button style={toolbarBtnStyle} title="Split down" onClick={() => onSplit(node.id, 'column')}>⬓</button>
            <button
              style={{ ...toolbarBtnStyle, color: 'var(--theme-secondary)' }}
              title="Close panel"
              onClick={() => onClose(node.id)}
            >
              ×
            </button>
          </div>
        </>
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
            <button style={paneBtnStyle} onClick={() => onSetContent(node.id, 'chart')}>+ Chart</button>
            <button style={paneBtnStyle} onClick={() => onSetContent(node.id, 'reader')}>+ Reader</button>
          </div>
          <div style={{ display: 'flex', gap: '8px', pointerEvents: 'auto' }}>
            <button style={paneBtnStyle} title="Split right" onClick={() => onSplit(node.id, 'row')}>Split ◫</button>
            <button style={paneBtnStyle} title="Split down" onClick={() => onSplit(node.id, 'column')}>Split ⬓</button>
            {!isRoot && (
              <button style={paneBtnStyle} onClick={() => onClose(node.id)}>Close</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SplineTab({ isActive = true }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const staircaseRef = useRef(null); // Entire staircase group rotates as one unit
  const reqIdRef = useRef(null);
  const isActiveRef = useRef(isActive);
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [root, setRoot] = useState(createLeaf);
  const historyRef = useRef([]);

  // The 3D backdrop freezes (skips rendering) while any panel holds content —
  // the graphic is ambience for the empty workspace, not competition for the
  // GPU while charts are on screen.
  const hasContentRef = useRef(false);
  useEffect(() => { hasContentRef.current = treeHasContent(root); }, [root]);

  const commit = useCallback((updater) => {
    setRoot((prev) => {
      const next = updater(prev);
      if (next !== prev) historyRef.current.push(prev);
      return next;
    });
  }, []);

  const handleSplit = useCallback((id, dir) => {
    commit((prev) => mapTree(prev, id, (leaf) => ({
      type: 'split',
      id: `split-${++paneCounter}`,
      dir,
      children: [leaf, createLeaf()],
    })));
  }, [commit]);

  const handleSetContent = useCallback((id, content) => {
    commit((prev) => mapTree(prev, id, (leaf) => ({ ...leaf, content })));
  }, [commit]);

  const handleClose = useCallback((id) => {
    commit((prev) => {
      if (prev.type === 'leaf' && prev.id === id) {
        return prev.content === null ? prev : { ...prev, content: null };
      }
      return removeLeaf(prev, id);
    });
  }, [commit]);

  const handleUndo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (prev) setRoot(prev);
  }, []);

  const handleReset = useCallback(() => {
    commit((prev) => (prev.type === 'leaf' && prev.content === null ? prev : createLeaf()));
  }, [commit]);

  // Keyboard shortcuts: Z undo, R reset
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      const key = e.key.toLowerCase();
      if (key === 'z') handleUndo();
      if (key === 'r' || key === 'escape') handleReset();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handleUndo, handleReset]);

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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // The transmissive glass renders the scene into an internal buffer each
    // frame so it can refract it; at close zoom that buffer dominates GPU
    // cost. Half resolution is visually indistinguishable here because the
    // frosted interior (roughness 0.15) blurs the refraction anyway.
    renderer.transmissionResolutionScale = 0.5;
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
      const dark = document.documentElement.classList.contains('dark');
      scene.background = new THREE.Color(dark ? '#0C1122' : '#F7FBF8');
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

    // 7. Animation Loop — uncapped; renders every display frame while visible.
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    const animate = () => {
      reqIdRef.current = requestAnimationFrame(animate);

      // Skip all work while this tab is hidden.
      if (!isActiveRef.current) return;

      // Freeze while panels hold content (last rendered frame stays on the
      // canvas). Dragging the backdrop still renders so it feels alive.
      if (hasContentRef.current && !isDragging) return;

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

      // Render immediately — the loop may be frozen (panels placed) or capped
      // at 30fps, and zoom must track the wheel without stutter.
      renderer.render(scene, camera);
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
      // Resizing clears the canvas; redraw once even when the loop is frozen.
      renderer.render(scene, camera);
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

  const canUndo = historyRef.current.length > 0;
  const workspaceEmpty = root.type === 'leaf' && root.content === null;

  return (
    <div
      className="h-full w-full overflow-hidden relative select-none"
      style={{ backgroundColor: 'var(--bg-main)' }}
    >
      {/* Three.js canvas mount point */}
      <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Split-pane workspace overlay */}
      <div
        className="absolute inset-0 z-10"
        style={{ padding: '10px', pointerEvents: 'none' }}
      >
        <PaneView
          node={root}
          depth={0}
          isActive={isActive}
          onSplit={handleSplit}
          onSetContent={handleSetContent}
          onClose={handleClose}
          isRoot
        />
      </div>

      {/* Workspace controls */}
      <div
        className="absolute z-20"
        style={{
          bottom: '18px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderRadius: '999px',
          border: '1px solid var(--border-main)',
          background: isDark ? 'rgba(20, 27, 54, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          boxShadow: 'var(--shadow-soft)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            fontFamily: 'var(--font-display)',
            color: 'var(--text-muted)',
            paddingRight: '4px',
            borderRight: '1px solid var(--border-main)',
          }}
        >
          Workspace
        </span>
        <button
          style={{ ...paneBtnStyle, boxShadow: 'none', opacity: canUndo ? 1 : 0.45 }}
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo last layout change (Z)"
        >
          Undo
        </button>
        <button
          style={{ ...paneBtnStyle, boxShadow: 'none', opacity: workspaceEmpty ? 0.45 : 1 }}
          onClick={handleReset}
          disabled={workspaceEmpty}
          title="Clear all panels (R)"
        >
          Clear all
        </button>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', paddingLeft: '4px' }}>
          Z undo · R clear
        </span>
      </div>
    </div>
  );
}
