import { useState, useEffect } from 'react';

export default function EntryVisual() {
        const [frame, setFrame] = useState(0);
        const [donut, setDonut] = useState('');

        useEffect(() => {
                const interval = setInterval(() => {
                        setFrame(prev => (prev + 0.07) % (Math.PI * 2));
                }, 50);

                return () => clearInterval(interval);
        }, []);

        useEffect(() => {
                // Multi-angle rotation - shows vase from all perspectives
                const horizontalAngle = frame; // Horizontal rotation
                const verticalAngle = frame * 0.7; // Vertical rotation at different speed
                const verticalTilt = Math.sin(frame * 0.3) * 0.15; // Additional slight movement
                
                let output = [];
                const gridSize = 4000; 
                const z = new Array(gridSize).fill(0);
                const b = new Array(gridSize).fill(' ');
                const width = 100; 
                const height = 40; 
                
                for (let j = 0; j < 6.28; j += 0.03) { 
                        for (let i = 0; i < 6.28; i += 0.01) { 
                                // Vase shape function - narrow top, wide middle, closed bottom
                                const vaseHeight = 4.0; 
                                const y = (j / 6.28 - 0.5) * vaseHeight;
                                // Closed bottom: radius goes to 0 at bottom, wider at middle, narrow at top
                                const normalizedY = (y + vaseHeight/2) / vaseHeight; // 0 at bottom, 1 at top
                                const radius = 0.8 + 0.3 * Math.sin(y * Math.PI * 0.8) * Math.exp(-Math.abs(y) * 0.2) * (1 - normalizedY * 0.7); 
                                
                                const c = Math.cos(i) * radius;
                                const s = Math.sin(i) * radius;
                                
                                // 3D rotation - viewer orbits around vase
                                const x1 = c;
                                const y1 = y;
                                const z1 = s;
                                
                                // Multi-axis rotation for full 3D viewing
                                // Rotate around Y axis (horizontal)
                                const x2 = x1 * Math.cos(horizontalAngle) - z1 * Math.sin(horizontalAngle);
                                const z2 = x1 * Math.sin(horizontalAngle) + z1 * Math.cos(horizontalAngle);
                                
                                // Rotate around X axis (vertical)
                                const y2 = y1 * Math.cos(verticalAngle) - z2 * Math.sin(verticalAngle);
                                const z3 = y1 * Math.sin(verticalAngle) + z2 * Math.cos(verticalAngle);
                                
                                // Additional slight tilt for dynamic perspective
                                const y3 = y2 * Math.cos(verticalTilt) - z3 * Math.sin(verticalTilt);
                                const z4 = y2 * Math.sin(verticalTilt) + z3 * Math.cos(verticalTilt);
                                
                                // Perspective projection - viewer at fixed distance
                                const D = 1 / (z4 + 3); 
                                const screenX = Math.floor(width/2 + 40 * D * x2); 
                                const screenY = Math.floor(height/2 + 25 * D * y3); 
                                const o = screenX + width * screenY;
                                
                                // Lighting calculation
                                const normal = Math.sqrt(x2 * x2 + y2 * y2 + z3 * z3);
                                const brightness = Math.floor(8 * (z3 / normal + 1) / 2);
                                
                                if (screenY > 0 && screenY < height && screenX > 0 && screenX < width && D > z[o]) {
                                        z[o] = D;
                                        b[o] = '.,-~:;=!*#$@'[brightness > 0 ? brightness : 0];
                                }
                        }
                }
                
                for (let k = 0; k < gridSize; k++) {
                        output.push(k % width === 0 ? '\n' : b[k]);
                }
                
                setDonut(output.join(''));
        }, [frame]);

        return (
                <div className="flex items-center justify-center min-h-screen bg-black">
                        <pre className="text-green-400 text-xs leading-none font-mono whitespace-pre">
                                {donut}
                        </pre>
                </div>
        )
}