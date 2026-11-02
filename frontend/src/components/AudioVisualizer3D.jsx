import React, { useRef, useEffect } from "react";
import * as THREE from "three";

export default function AudioVisualizer3D({ analyserNode, isRecording, mode = "baseline" }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const animationFrameRef = useRef(null);
  const particlesRef = useRef(null);
  const linesRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 600;
    const height = mount.clientHeight || 180;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 75);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 2. 3D Wave Ribbon Mesh
    const segments = 64;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(segments * 3);
    const colors = new Float32Array(segments * 3);

    const color1 = new THREE.Color(mode === "baseline" ? 0x10b981 : 0xf59e0b);
    const color2 = new THREE.Color(mode === "baseline" ? 0x14b8a6 : 0xf43f5e);

    for (let i = 0; i < segments; i++) {
      const x = (i - segments / 2) * 1.5;
      positions[i * 3] = x;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      const alpha = i / segments;
      const c = color1.clone().lerp(color2, alpha);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      linewidth: 3,
      transparent: true,
      opacity: 0.9,
    });

    const line = new THREE.Line(geometry, lineMaterial);
    scene.add(line);
    linesRef.current = line;

    // 3. 3D Floating Particle Cloud
    const particleCount = 120;
    const particleGeo = new THREE.BufferGeometry();
    const particlePos = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      particlePos[i * 3] = (Math.random() - 0.5) * 80;
      particlePos[i * 3 + 1] = (Math.random() - 0.5) * 35;
      particlePos[i * 3 + 2] = (Math.random() - 0.5) * 30;

      const c = color1.clone().lerp(color2, Math.random());
      particleColors[i * 3] = c.r;
      particleColors[i * 3 + 1] = c.g;
      particleColors[i * 3 + 2] = c.b;
    }

    particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePos, 3));
    particleGeo.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));

    const particleMat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);
    particlesRef.current = particles;

    // 4. Animation Loop
    let time = 0;
    const frequencyData = new Uint8Array(analyserNode ? analyserNode.frequencyBinCount : 64);

    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      time += 0.025;

      if (analyserNode && isRecording) {
        analyserNode.getByteFrequencyData(frequencyData);
      }

      // Deform 3D Wave Line based on audio
      const posAttr = line.geometry.attributes.position;
      for (let i = 0; i < segments; i++) {
        let audioOffset = 0;
        if (analyserNode && isRecording) {
          const binIndex = Math.floor((i / segments) * frequencyData.length * 0.5);
          audioOffset = (frequencyData[binIndex] / 255) * 16;
        }

        const wave = Math.sin(time * 2 + i * 0.15) * (isRecording ? 4 : 2);
        const y = wave + (audioOffset * (Math.sin(i * 0.1) + 1));
        const z = Math.cos(time + i * 0.1) * (isRecording ? 6 : 2);

        posAttr.setY(i, y);
        posAttr.setZ(i, z);
      }
      posAttr.needsUpdate = true;

      // Rotate particle cloud gently
      particles.rotation.y = time * 0.08;
      particles.rotation.x = Math.sin(time * 0.05) * 0.1;

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [analyserNode, isRecording, mode]);

  return (
    <div
      ref={mountRef}
      className="w-full h-full relative overflow-hidden flex items-center justify-center select-none"
    />
  );
}
