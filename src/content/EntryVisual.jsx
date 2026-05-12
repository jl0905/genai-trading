import { useState, useEffect, useRef } from 'react';

export default function EntryVisual() {
        const [donut, setDonut] = useState('');
        const [isDragging, setIsDragging] = useState(false);
        const [rotation, setRotation] = useState({ x: 0, y: 0 });
        const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
        const [autoRotation, setAutoRotation] = useState({ x: 0, y: 0 });
        const containerRef = useRef(null);

        useEffect(() => {
                const interval = setInterval(() => {
                        if (!isDragging) {
                                setAutoRotation(prev => ({
                                        x: prev.x + 0.021, // Vertical rotation
                                        y: prev.y + 0.03  // Horizontal rotation
                                }));
                        }
                }, 50);

                return () => clearInterval(interval);
        }, [isDragging]);

        const handleMouseDown = (e) => {
                setIsDragging(true);
                setDragStart({ x: e.clientX, y: e.clientY });
                // Start from current auto-rotation position
                setRotation({ x: autoRotation.x, y: autoRotation.y });
        };

        const handleMouseMove = (e) => {
                if (!isDragging) return;
                
                const deltaX = (e.clientX - dragStart.x) * 0.01;
                const deltaY = (e.clientY - dragStart.y) * 0.01;
                
                setRotation(prev => ({
                        x: prev.x + deltaY,
                        y: prev.y + deltaX
                }));
                
                setDragStart({ x: e.clientX, y: e.clientY });
        };

        const handleMouseUp = () => {
                if (isDragging) {
                        // Transfer manual rotation to auto-rotation
                        setAutoRotation(rotation);
                }
                setIsDragging(false);
        };

        useEffect(() => {
                // Use manual rotation when dragging, auto-rotation when not
                const currentRotation = isDragging ? rotation : autoRotation;
                const horizontalAngle = currentRotation.y;
                const verticalAngle = currentRotation.x;
                const verticalTilt = Math.sin(autoRotation.y * 0.3) * 0.15; // Use auto-rotation for subtle tilt
                
                let output = [];
                const gridSize = 6000; 
                const z = new Array(gridSize).fill(0);
                const b = new Array(gridSize).fill(' ');
                const width = 100; 
                const height = 50; 

                // Shared lighting constants
                const worldLightX = 1;
                const worldLightY = -1;
                const worldLightZ = 0.5;
                const lightMagnitude = Math.sqrt(worldLightX * worldLightX + worldLightY * worldLightY + worldLightZ * worldLightZ);
                const normalizedLightX = worldLightX / lightMagnitude;
                const normalizedLightY = worldLightY / lightMagnitude;
                const normalizedLightZ = worldLightZ / lightMagnitude;

                // Helper: project a 3D point through the shared rotation + perspective pipeline
                const projectPoint = (x1, y1, zOriginal, fixedChar) => {
                        // Calculate lighting on unrotated object (fixed light source)
                        const normalUnrotated = Math.sqrt(x1 * x1 + y1 * y1 + zOriginal * zOriginal);
                        const dotProduct = (x1 * normalizedLightX + y1 * normalizedLightY + zOriginal * normalizedLightZ) / normalUnrotated;
                        const brightness = Math.min(8, Math.floor(11 * Math.max(0, dotProduct)));

                        // Multi-axis rotation for full 3D viewing
                        // Rotate around Y axis (horizontal)
                        const x2 = x1 * Math.cos(horizontalAngle) - zOriginal * Math.sin(horizontalAngle);
                        const zRotated = x1 * Math.sin(horizontalAngle) + zOriginal * Math.cos(horizontalAngle);

                        // Rotate around X axis (vertical)
                        const y2 = y1 * Math.cos(verticalAngle) - zRotated * Math.sin(verticalAngle);
                        const z3 = y1 * Math.sin(verticalAngle) + zRotated * Math.cos(verticalAngle);

                        // Additional slight tilt for dynamic perspective
                        const y3 = y2 * Math.cos(verticalTilt) - z3 * Math.sin(verticalTilt);
                        const z4 = y2 * Math.sin(verticalTilt) + z3 * Math.cos(verticalTilt);

                        // Perspective projection - viewer at fixed distance
                        const D = 1 / (z4 + 3); 
                        const screenX = Math.floor(width/2 + 40 * D * x2); 
                        const screenY = Math.floor(height/2 + 25 * D * y3); 
                        const o = screenX + width * screenY;

                        if (screenY > 0 && screenY < height && screenX > 0 && screenX < width && D > z[o]) {
                                z[o] = D;
                                b[o] = fixedChar || '.:-=+*#%@'[brightness > 0 ? brightness : 0];
                        }
                };

                // --- Pass 1: Sphere ---
                const sphereRadius = 1.5;
                for (let j = 0; j < 6.28; j += 0.03) { 
                        for (let i = 0; i < 6.28; i += 0.01) { 
                                const x1 = sphereRadius * Math.sin(j) * Math.cos(i);
                                const y1 = sphereRadius * Math.sin(j) * Math.sin(i);
                                const zOriginal = sphereRadius * Math.cos(j);
                                projectPoint(x1, y1, zOriginal);
                        }
                }

                // --- Pass 2: Ring (flat annulus in the XZ plane, y=0) ---
                const ringInner = 2.0;
                const ringOuter = 3.0;
                for (let theta = 0; theta < 6.28; theta += 0.01) {
                        for (let r = ringInner; r <= ringOuter; r += 0.04) {
                                const x1 = r * Math.cos(theta);
                                const y1 = 0;
                                const zOriginal = r * Math.sin(theta);
                                projectPoint(x1, y1, zOriginal, '#');
                        }
                }
                
                for (let k = 0; k < gridSize; k++) {
                        output.push(k % width === 0 ? '\n' : b[k]);
                }
                
                setDonut(output.join(''));
        }, [autoRotation, isDragging, rotation]);

        return (
                <div 
                        ref={containerRef}
                        className="flex items-center justify-center h-full w-full overflow-hidden cursor-move select-none"
                        style={{ backgroundColor: 'var(--bg-main)' }}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                >
                        <pre className="text-xs leading-none font-mono whitespace-pre" style={{ color: 'var(--accent)' }}>
                                {donut}
                        </pre>
                </div>
        )
}