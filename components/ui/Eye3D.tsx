"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ANATOMY_DESCRIPTIONS } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";

interface Eye3DProps {
  stage?: number;
  severity?: "Normal" | "Mild" | "Moderate" | "Severe" | "Proliferative" | string;
  renderMode?: "realistic" | "wireframe" | "heatmap";
  highlightPart?: "all" | "sclera" | "iris" | "body" | "cornea" | "retina";
  interactive?: boolean;
}

export default function Eye3D({
  stage = 0,
  severity,
  renderMode: propRenderMode,
  highlightPart: propHighlightPart,
  interactive = true,
}: Eye3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Controls state
  const [renderMode, setRenderMode] = useState<"realistic" | "wireframe" | "heatmap">("realistic");
  const [highlightPart, setHighlightPart] = useState<"all" | "sclera" | "iris" | "body" | "cornea" | "retina">("all");

  // Keep references to modify materials dynamically
  const eyeModelRef = useRef<THREE.Group | null>(null);
  const corneaGuideRef = useRef<THREE.Mesh | null>(null);
  const pupilGuideRef = useRef<THREE.Mesh | null>(null);

  // Map severity string to stage index (0 to 4)
  const severityToStage = (sev?: string): number => {
    if (!sev) return 0;
    const s = sev.toLowerCase();
    if (s.includes("normal") || s.includes("healthy")) return 0;
    if (s.includes("mild")) return 1;
    if (s.includes("moderate")) return 2;
    if (s.includes("severe")) return 3;
    if (s.includes("proliferative") || s.includes("critical") || s.includes("urgent")) return 4;
    return 0;
  };

  const currentStage = severity !== undefined ? severityToStage(severity) : stage;

  // Use refs to avoid stale closures in the Three.js loop
  const stageRef = useRef(currentStage);
  const highlightPartRef = useRef(highlightPart);
  const renderModeRef = useRef(renderMode);

  useEffect(() => {
    stageRef.current = currentStage;
  }, [currentStage]);

  useEffect(() => {
    highlightPartRef.current = highlightPart;
  }, [highlightPart]);

  useEffect(() => {
    renderModeRef.current = renderMode;
  }, [renderMode]);

  // Sync props to state
  useEffect(() => {
    if (propRenderMode) {
      setRenderMode(propRenderMode);
    }
  }, [propRenderMode]);

  useEffect(() => {
    if (propHighlightPart) {
      setHighlightPart(propHighlightPart);
    }
  }, [propHighlightPart]);

  // Update materials when states change
  useEffect(() => {
    const eyeModel = eyeModelRef.current;
    if (!eyeModel) return;

    // Sync virtual guides visibility/opacity
    if (corneaGuideRef.current) {
      const mat = corneaGuideRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = highlightPart === "cornea" ? 0.6 : 0.0;
    }
    if (pupilGuideRef.current) {
      const mat = pupilGuideRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = highlightPart === "body" ? 0.75 : 0.0;
    }

    eyeModel.traverse((node: any) => {
      if (!node.isMesh) return;

      const materials = Array.isArray(node.material)
        ? node.material
        : [node.material];

      materials.forEach((mat: any) => {
        if (!mat) return;

        const matName = (mat.name || "").toLowerCase();
        const nodeName = (node.name || "").toLowerCase();

        // 1. Wireframe mode override
        mat.wireframe = renderMode === "wireframe";

        // 2. Part Highlighting
        let isTarget = false;
        const isOptimizedModel = matName.includes("aistandard") || matName.includes("eyes") || nodeName.includes("eye_1_r") || nodeName.includes("eye_2_r");

        if (highlightPart === "all") {
          isTarget = true;
        } else if (isOptimizedModel) {
          // Optimized model support: outer shell vs inner eyeball
          const isOuterShell = matName.includes("aistandard") || nodeName.includes("eye_1_r");
          const isInnerBall = matName.includes("eyes") || nodeName.includes("eye_2_r");
          if (highlightPart === "sclera" || highlightPart === "cornea") {
            isTarget = isOuterShell;
          } else if (highlightPart === "iris" || highlightPart === "body" || highlightPart === "retina") {
            isTarget = isInnerBall;
          }
        } else {
          // Original model support
          if (highlightPart === "sclera" && (matName.includes("sclera") || nodeName.includes("sclera"))) {
            isTarget = true;
          } else if (highlightPart === "iris" && (matName.includes("iris") || nodeName.includes("iris"))) {
            isTarget = true;
          } else if (highlightPart === "body" && (matName.includes("pupil") || matName.includes("body") || nodeName.includes("pupil") || nodeName.includes("body"))) {
            isTarget = true;
          } else if (highlightPart === "cornea" && (matName.includes("cornea") || matName.includes("lens") || matName.includes("glass") || nodeName.includes("cornea") || nodeName.includes("lens") || nodeName.includes("glass"))) {
            isTarget = true;
          } else if (highlightPart === "retina" && (matName.includes("retina") || matName.includes("nerve") || matName.includes("optic") || nodeName.includes("retina") || nodeName.includes("nerve") || nodeName.includes("optic") || matName.includes("material") || nodeName.includes("eye"))) {
            isTarget = true;
          }
        }

        // Transparency overrides for parts that are not focused
        if (highlightPart !== "all" && !isTarget) {
          mat.transparent = true;
          mat.opacity = 0.05;
          mat.depthWrite = false;
        } else {
          // Restore opacity rules
          const isScleraOrOuter = matName.includes("sclera") || nodeName.includes("sclera") || matName.includes("aistandard") || nodeName.includes("eye_1_r");
          if (isScleraOrOuter) {
            mat.transparent = true;
            // Base opacity decreases as stage increases to reveal interior
            const baseOpacity = [0.35, 0.25, 0.18, 0.10, 0.05][currentStage];
            mat.opacity = renderMode === "heatmap" ? 0.08 : baseOpacity;
            mat.depthWrite = false;
          } else {
            mat.transparent = highlightPart !== "all";
            mat.opacity = 1.0;
            mat.depthWrite = true;
          }
        }

        // 3. Emissive & Color overlays based on renderMode & highlight active
        if (renderMode === "heatmap") {
          if (!mat._originalColor) {
            mat._originalColor = mat.color.clone();
          }
          const isScleraOrOuter = matName.includes("sclera") || nodeName.includes("sclera") || matName.includes("aistandard") || nodeName.includes("eye_1_r");
          const isIris = matName.includes("iris") || nodeName.includes("iris") || (matName.includes("eyes") && !isScleraOrOuter);

          if (isScleraOrOuter) {
            mat.color.setHex(0x0055ff); // Cyan outer
          } else if (isIris) {
            mat.color.setHex(0xff1100); // Red high risk central
          } else {
            mat.color.setHex(0xffaa00); // Yellow-orange body
          }
          if (mat.emissive && typeof mat.emissive.setHex === "function") {
            mat.emissive.setHex(0x330800);
          }
        } else if (renderMode === "wireframe") {
          if (!mat._originalColor) {
            mat._originalColor = mat.color.clone();
          }
          mat.color.setHex(0x00d4ff); // Glowing cyber cyan
          if (mat.emissive && typeof mat.emissive.setHex === "function") {
            mat.emissive.setHex(0x003344);
          }
        } else {
          // Realistic Mode
          if (mat._originalColor) {
            mat.color.copy(mat._originalColor);
          }

          // Special highlight emissive glow for active HUD selection
          if (highlightPart !== "all" && isTarget) {
            if (mat.emissive && typeof mat.emissive.setHex === "function") {
              if (highlightPart === "retina") mat.emissive.setHex(0x00c9a7); // Green glow
              else if (highlightPart === "cornea") mat.emissive.setHex(0x00d4ff); // Cyan glow
              else if (highlightPart === "iris") mat.emissive.setHex(0x7c3aed); // Violet glow
              else mat.emissive.setHex(0x00f5d4); // Default teal glow
            }
          } else {
            if (mat.emissive && typeof mat.emissive.setHex === "function") {
              mat.emissive.setHex(0x001122);
            }
          }
        }

        mat.needsUpdate = true;
      });
    });
  }, [renderMode, highlightPart, currentStage]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    // Small delay to ensure layout is computed
    const initTimeout = setTimeout(() => {
      initScene();
    }, 50);

    let animationFrameId: number;
    let renderer: THREE.WebGLRenderer | null = null;
    let canvas: HTMLCanvasElement | null = null;
    let scene: THREE.Scene | null = null;

    function initScene() {
      if (!container) return;

      try {
        // Get width/height - use fallbacks if collapsed
      let width = container.clientWidth;
      let height = container.clientHeight;

      if (width < 10 || height < 10) {
        const parent = container.parentElement;
        if (parent) {
          width = parent.clientWidth || 240;
          height = parent.clientHeight || 240;
        } else {
          width = 240;
          height = 240;
        }
      }

      console.log("[Eye3D] Container size:", width, "x", height);

      // Scene
      scene = new THREE.Scene();

      // Camera
      const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
      camera.position.set(0, 0, 5);
      camera.lookAt(0, 0, 0);

      // Renderer
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        precision: "mediump"
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;

      // Style the canvas to fill the container perfectly
      canvas = renderer.domElement;
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      container.appendChild(canvas);

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
      scene.add(ambientLight);

      // Cyan key light
      const keyLight = new THREE.DirectionalLight(0x00d4ff, 3.0);
      keyLight.position.set(5, 4, 5);
      scene.add(keyLight);

      // Violet fill light
      const fillLight = new THREE.DirectionalLight(0x7c3aed, 2.0);
      fillLight.position.set(-5, -2, 3);
      scene.add(fillLight);

      // Top white rim light for highlights
      const rimLight = new THREE.DirectionalLight(0xffffff, 2.0);
      rimLight.position.set(0, 6, -3);
      scene.add(rimLight);

      // Front soft light to ensure front visibility
      const frontLight = new THREE.DirectionalLight(0xffffff, 1.5);
      frontLight.position.set(0, 0, 6);
      scene.add(frontLight);

      // Model group for rotations/animations
      const modelGroup = new THREE.Group();
      scene.add(modelGroup);

      // 📡 Glowing Anatomy Virtual Guides
      // 1. Cornea Guide (Hemispherical dome)
      const corneaGeo = new THREE.SphereGeometry(0.58, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42);
      const corneaMat = new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const corneaGuide = new THREE.Mesh(corneaGeo, corneaMat);
      corneaGuide.rotation.x = Math.PI / 2;
      modelGroup.add(corneaGuide);
      corneaGuideRef.current = corneaGuide;

      // 2. Pupil Guide (Flat glowing ring)
      const pupilGeo = new THREE.RingGeometry(0, 0.22, 32);
      const pupilMat = new THREE.MeshBasicMaterial({
        color: 0x00f5d4,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const pupilGuide = new THREE.Mesh(pupilGeo, pupilMat);
      modelGroup.add(pupilGuide);
      pupilGuideRef.current = pupilGuide;

      // Interactive controls state
      let isDragging = false;
      let previousPointerX = 0;
      let previousPointerY = 0;
      
      let dragRotationY = 0;
      let dragRotationX = 0;
      let targetDragRotationY = 0;
      let targetDragRotationX = 0;

      let hoverRotationY = 0;
      let hoverRotationX = 0;
      let targetHoverRotationY = 0;
      let targetHoverRotationX = 0;

      let autoSpinAngle = 0;
      const baseRotationY = Math.PI; // Offset by 180deg so it starts facing forward

      const handlePointerDown = (event: PointerEvent) => {
        if (!interactive) return;
        isDragging = true;
        previousPointerX = event.clientX;
        previousPointerY = event.clientY;
        container.setPointerCapture(event.pointerId);
      };

      const handlePointerMove = (event: PointerEvent) => {
        if (!interactive) return;
        const rect = container.getBoundingClientRect();
        const hX = event.clientX - rect.left - width / 2;
        const hY = event.clientY - rect.top - height / 2;
        targetHoverRotationY = (hX / width) * 0.35;
        targetHoverRotationX = (hY / height) * 0.35;

        if (!isDragging) return;

        const deltaX = event.clientX - previousPointerX;
        const deltaY = event.clientY - previousPointerY;
        previousPointerX = event.clientX;
        previousPointerY = event.clientY;

        // Very high sensitivity for easy turning
        targetDragRotationY += deltaX * 0.025;
        targetDragRotationX += deltaY * 0.025;

        // Limit vertical rotation to prevent flipping
        targetDragRotationX = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, targetDragRotationX));
      };

      const handlePointerUp = (event: PointerEvent) => {
        isDragging = false;
        if (container.hasPointerCapture(event.pointerId)) {
          container.releasePointerCapture(event.pointerId);
        }
      };

      container.addEventListener("pointerdown", handlePointerDown);
      container.addEventListener("pointermove", handlePointerMove);
      container.addEventListener("pointerup", handlePointerUp);
      container.addEventListener("pointercancel", handlePointerUp);

      // Loader
      const loader = new GLTFLoader();

      console.log("[Eye3D] Loading model...");

      const processLoadedModel = (eyeModel: THREE.Group) => {
        // Force update matrices
        eyeModel.updateMatrixWorld(true);

        // Auto scale to fit inside viewport first
        const box = new THREE.Box3().setFromObject(eyeModel);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = maxDim > 0 && isFinite(maxDim) ? 3.7 / maxDim : 1.0;
        eyeModel.scale.set(scale, scale, scale);

        // Force update matrices so bounding box calculation takes scale into account
        eyeModel.updateMatrixWorld(true);

        // Get the center of the already scaled model
        const scaledBox = new THREE.Box3().setFromObject(eyeModel);
        const scaledCenter = new THREE.Vector3();
        scaledBox.getCenter(scaledCenter);

        // Center the scaled model
        eyeModel.position.sub(scaledCenter);

        // Save original colors for restore operations
        eyeModel.traverse((node: any) => {
          if (node.isMesh) {
            const materials = Array.isArray(node.material) ? node.material : [node.material];
            materials.forEach((mat: any) => {
              if (mat) {
                mat._originalColor = mat.color.clone();
              }
            });
          }
        });

        // Save reference to enable state overrides
        eyeModelRef.current = eyeModel;

        // Align the virtual guides relative to the loaded iris mesh
        let irisX = 0, irisY = 0, irisZ = 1.35;
        const irisMesh = eyeModel.getObjectByName("iris_Iris_0") || 
                         eyeModel.getObjectByName("iris") || 
                         eyeModel.getObjectByName("Eye_2_R_Eyes_0") || 
                         eyeModel.getObjectByName("Eye_2_R");
        if (irisMesh) {
          const irisBox = new THREE.Box3().setFromObject(irisMesh);
          const irisCenter = new THREE.Vector3();
          irisBox.getCenter(irisCenter);
          irisX = irisCenter.x;
          irisY = irisCenter.y;
          irisZ = irisCenter.z;
        }
        if (corneaGuide) corneaGuide.position.set(irisX, irisY, irisZ + 0.05);
        if (pupilGuide) pupilGuide.position.set(irisX, irisY, irisZ + 0.015);

        // Process materials - keep originals mostly intact, just fine-tune
        eyeModel.traverse((node: any) => {
          node.visible = true;

          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;

            const materials = Array.isArray(node.material)
              ? node.material
              : [node.material];

            materials.forEach((mat: any) => {
              if (!mat) return;

              mat.side = THREE.DoubleSide;
              mat.depthTest = true;
              mat.needsUpdate = true;

              const matName = (mat.name || "").toLowerCase();
              const nodeName = (node.name || "").toLowerCase();

              // Sclera / Outer Cornea (outer shell with transmission) -> make it a subtle transparent shell
              const isScleraOrOuter = 
                matName.includes("sclera") || 
                nodeName.includes("sclera") ||
                matName.includes("aistandard") ||
                nodeName.includes("eye_1_r");

              if (isScleraOrOuter) {
                mat.transparent = true;
                mat.opacity = 0.3;
                mat.depthWrite = false;
                mat.transmission = 0;
                mat.roughness = 0.1;
                mat.metalness = 0.0;
              } else {
                // Eye body and Iris - keep opaque with original textures
                mat.transparent = false;
                mat.opacity = 1.0;
                mat.depthWrite = true;
                mat.metalness = 0.0;

                // Subtle sci-fi emissive glow
                if (mat.emissive && typeof mat.emissive.setHex === "function") {
                  mat.emissive.setHex(0x001122);
                }
              }
            });
          }
        });

        modelGroup.add(eyeModel);
        setLoading(false);
        setError(null);
      };

      const modelPath = "/my_model_of_eye.glb";
      const fallbackPath = "/realistic_human_eye.glb";

      loader.load(
        modelPath,
        (gltf) => {
          console.log("[Eye3D] Primary model loaded successfully!", gltf);
          processLoadedModel(gltf.scene);
        },
        (progress) => {
          if (progress.total > 0) {
            console.log("[Eye3D] Loading progress:", Math.round((progress.loaded / progress.total) * 100) + "%");
          }
        },
        (err) => {
          console.warn("[Eye3D] Primary model load failed, trying fallback...", err);
          loader.load(
            fallbackPath,
            (gltfFallback) => {
              console.log("[Eye3D] Fallback model loaded successfully!", gltfFallback);
              processLoadedModel(gltfFallback.scene);
            },
            (progress) => {
              if (progress.total > 0) {
                console.log("[Eye3D] Fallback loading progress:", Math.round((progress.loaded / progress.total) * 100) + "%");
              }
            },
            (fallbackErr) => {
              console.error("[Eye3D] Both models failed to load:", fallbackErr);
              setError("فشل تحميل النموذج ثلاثي الأبعاد");
              setLoading(false);
            }
          );
        }
      );

      // Animation loop
      let elapsedTime = 0;
      let lastTime = performance.now();

      const localScene = scene;
      const localRenderer = renderer;

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);

        const now = performance.now();
        elapsedTime += (now - lastTime) / 1000;
        lastTime = now;

        // Smoothly interpolate drag and hover values
        dragRotationY += (targetDragRotationY - dragRotationY) * 0.15;
        dragRotationX += (targetDragRotationX - dragRotationX) * 0.15;
        
        hoverRotationY += (targetHoverRotationY - hoverRotationY) * 0.1;
        hoverRotationX += (targetHoverRotationX - hoverRotationX) * 0.1;

        // Dynamic parameters from refs
        const activeStage = stageRef.current;
        const activeHighlightPart = highlightPartRef.current;
        const activeRenderMode = renderModeRef.current;

        // Rotation speed based on stage:
        // Stage 0: 0.003, Stage 1: 0.006, Stage 2: 0.010, Stage 3: 0.016, Stage 4: 0.025
        const spinSpeeds = [0.003, 0.006, 0.010, 0.016, 0.025];
        const currentSpeed = spinSpeeds[activeStage];

        // Slowly auto-rotate when not dragging
        if (!isDragging) {
          autoSpinAngle += currentSpeed;
        }

        if (modelGroup) {
          // Floating motion
          modelGroup.position.y = Math.sin(elapsedTime * 1.2) * 0.06;

          // Jitter/shaking effect for Proliferative DR (Stage 4)
          if (activeStage === 4) {
            modelGroup.position.x = Math.sin(elapsedTime * 32) * 0.012;
            modelGroup.position.z = Math.cos(elapsedTime * 28) * 0.012;
          } else {
            modelGroup.position.x = 0;
            modelGroup.position.z = 0;
          }

          // Combine rotations (base offset + auto-spin + drag + hover tilt)
          modelGroup.rotation.y = baseRotationY + autoSpinAngle + dragRotationY + hoverRotationY;
          modelGroup.rotation.x = dragRotationX + hoverRotationX;
        }

        // Pulse the glowing guides when active
        if (corneaGuideRef.current && activeHighlightPart === "cornea") {
          const s = 1 + Math.sin(elapsedTime * 4.5) * 0.025;
          corneaGuideRef.current.scale.set(s, s, s);
          const mat = corneaGuideRef.current.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.45 + Math.sin(elapsedTime * 4.5) * 0.15;
        }
        if (pupilGuideRef.current && activeHighlightPart === "body") {
          const s = 1 + Math.sin(elapsedTime * 5.2) * 0.015;
          pupilGuideRef.current.scale.set(s, s, s);
          const mat = pupilGuideRef.current.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.55 + Math.sin(elapsedTime * 5.2) * 0.2;
        }

        // Blinking red pathology glow for critical stages
        if (eyeModelRef.current) {
          const pulse = (Math.sin(elapsedTime * (activeStage === 4 ? 8 : 4)) + 1) / 2; // pulse speed increases with severity
          eyeModelRef.current.traverse((node: any) => {
            if (node.isMesh) {
              const materials = Array.isArray(node.material) ? node.material : [node.material];
              materials.forEach((mat: any) => {
                if (!mat) return;
                const matName = (mat.name || "").toLowerCase();
                const nodeName = (node.name || "").toLowerCase();
                
                // Modulate emissive in realistic mode for eye/iris meshes
                if (activeRenderMode === "realistic" && (matName.includes("eye") || nodeName.includes("eye") || matName.includes("iris") || nodeName.includes("iris"))) {
                  if (activeStage === 1) {
                    mat.emissive.setHex(0xffaa00);
                    mat.emissiveIntensity = 0.15 + pulse * 0.1;
                  } else if (activeStage === 2) {
                    mat.emissive.setHex(0xff6600);
                    mat.emissiveIntensity = 0.35 + pulse * 0.25;
                  } else if (activeStage === 3) {
                    mat.emissive.setHex(0xff0000);
                    mat.emissiveIntensity = 0.5 + pulse * 0.4;
                  } else if (activeStage === 4) {
                    mat.emissive.setHex(0xff0033);
                    mat.emissiveIntensity = 0.65 + pulse * 0.75; // Rapid blinking red
                  } else {
                    // Stage 0 (Healthy) - restore normal sci-fi hud highlighted colors or low ambient glow
                    if (activeHighlightPart !== "all") {
                      const isScleraOrOuter = matName.includes("sclera") || nodeName.includes("sclera") || matName.includes("aistandard") || nodeName.includes("eye_1_r");
                      const isInnerBall = matName.includes("eyes") || nodeName.includes("eye_2_r") || matName.includes("iris") || nodeName.includes("iris") || matName.includes("material");

                      if (activeHighlightPart === "retina" && (isInnerBall || matName.includes("retina") || nodeName.includes("retina"))) {
                        mat.emissive.setHex(0x00c9a7);
                        mat.emissiveIntensity = 0.5;
                      } else if (activeHighlightPart === "iris" && (isInnerBall || matName.includes("iris") || nodeName.includes("iris"))) {
                        mat.emissive.setHex(0x7c3aed);
                        mat.emissiveIntensity = 0.5;
                      } else if (activeHighlightPart === "cornea" && isScleraOrOuter) {
                        mat.emissive.setHex(0x00d4ff);
                        mat.emissiveIntensity = 0.5;
                      } else if (activeHighlightPart === "sclera" && isScleraOrOuter) {
                        mat.emissive.setHex(0x00f5d4);
                        mat.emissiveIntensity = 0.5;
                      } else {
                        mat.emissive.setHex(0x001122);
                        mat.emissiveIntensity = 1.0;
                      }
                    } else {
                      mat.emissive.setHex(0x001122);
                      mat.emissiveIntensity = 1.0;
                    }
                  }
                }
              });
            }
          });
        }

        localRenderer.render(localScene, camera);
      };

      animate();

      // Resize handler
      const handleResize = () => {
        if (!container) return;
        width = container.clientWidth || 240;
        height = container.clientHeight || 240;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        if (localRenderer) {
          localRenderer.setSize(width, height);
        }
      };

      const resizeObserver = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserver.observe(container);

      // Initial resize trigger after DOM stabilizes
      const resizeTimer = setTimeout(handleResize, 100);

      // Store cleanup references
      (container as any).__eye3d_cleanup = () => {
        clearTimeout(resizeTimer);
        container.removeEventListener("pointerdown", handlePointerDown);
        container.removeEventListener("pointermove", handlePointerMove);
        container.removeEventListener("pointerup", handlePointerUp);
        container.removeEventListener("pointercancel", handlePointerUp);
        resizeObserver.disconnect();
      };
      } catch (err) {
        console.error("[Eye3D] WebGL / ThreeJS initialization error:", err);
        setError("فشل تشغيل محرك 3D. قد تكون ذاكرة الرسوميات ممتلئة أو الـ WebGL غير مفعل.");
        setLoading(false);
      }
    }

    // Cleanup
    return () => {
      clearTimeout(initTimeout);

      if ((container as any).__eye3d_cleanup) {
        (container as any).__eye3d_cleanup();
        delete (container as any).__eye3d_cleanup;
      }

      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      if (renderer) {
        renderer.dispose();
        if (canvas && container.contains(canvas)) {
          container.removeChild(canvas);
        }
      }

      if (scene) {
        scene.traverse((object: any) => {
          if (!object.isMesh) return;
          object.geometry?.dispose();
          if (object.material) {
            if (object.material.isMaterial) {
              cleanMaterial(object.material);
            } else if (Array.isArray(object.material)) {
              for (const material of object.material) {
                cleanMaterial(material);
              }
            }
          }
        });
      }
    };

    function cleanMaterial(material: any) {
      material.dispose();
      for (const key of Object.keys(material)) {
        const value = material[key];
        if (value && typeof value.dispose === "function") {
          value.dispose();
        }
      }
    }
  }, [interactive]);

  const desc = ANATOMY_DESCRIPTIONS[highlightPart] || ANATOMY_DESCRIPTIONS.all;

  return (
    <div
      className="relative overflow-hidden group/eye"
      style={{ width: "100%", height: "100%", minWidth: "240px", minHeight: "240px", touchAction: "none" }}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-transparent">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-mono text-cyan-400/80 tracking-wider">تحميل النموذج ثلاثي الأبعاد...</span>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-10 text-center px-4 bg-transparent">
          <span className="text-xs font-mono text-red-400">{error}</span>
        </div>
      )}
      
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
        }}
      />

      {/* 📡 HIGH-TECH MEDICAL HUD OVERLAY */}
      {!loading && !error && (
        <AnimatePresence mode="wait">
          <motion.div
            key={highlightPart}
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="absolute top-3 right-3 left-3 md:left-3 md:right-auto md:w-64 z-20 pointer-events-none"
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div 
              className="glass-strong rounded-xl p-3.5 text-right space-y-1.5 border border-cyan-500/20 shadow-2xl relative overflow-hidden" 
              style={{ background: "rgba(3, 13, 26, 0.88)" }}
            >
              {/* Corner tech details */}
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/50" />
              <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/50" />
              
              <div className="flex justify-between items-center flex-row-reverse border-b border-white/10 pb-1.5">
                <span className="text-[9px] font-mono tracking-wider font-bold text-cyan-400 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  تشريح ثلاثي الأبعاد
                </span>
                <span className="text-[8px] font-mono text-slate-400 font-bold bg-white/5 px-1.5 py-0.5 rounded">{desc.metric}</span>
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-white font-display leading-tight">{desc.title}</h4>
                <h5 className="text-[7.5px] font-mono text-cyan-500/70 font-semibold tracking-widest uppercase leading-none">{desc.titleEn}</h5>
                <p className="text-[9.5px] text-slate-300 leading-relaxed font-body mt-1">
                  {desc.description}
                </p>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Dynamic control panel overlays */}
      {!loading && !error && (
        <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex flex-col gap-1.5 items-center z-20 pointer-events-auto w-[90%]">
          {/* Render modes */}
          <div className="flex gap-1 bg-slate-950/85 backdrop-blur-md border border-cyan-500/20 p-0.5 rounded-lg w-full justify-center shadow-lg">
            <button
              onClick={() => setRenderMode("realistic")}
              className={`px-1.5 py-0.5 text-[8px] font-mono rounded cursor-pointer transition ${renderMode === "realistic" ? "bg-cyan-500 text-slate-950 font-bold" : "text-cyan-400/70 hover:text-cyan-300"}`}
              title="الوضع الواقعي"
            >
              REAL
            </button>
            <button
              onClick={() => setRenderMode("wireframe")}
              className={`px-1.5 py-0.5 text-[8px] font-mono rounded cursor-pointer transition ${renderMode === "wireframe" ? "bg-cyan-500 text-slate-950 font-bold" : "text-cyan-400/70 hover:text-cyan-300"}`}
              title="وضع الهيكل الشبكي"
            >
              WIRE
            </button>
            <button
              onClick={() => setRenderMode("heatmap")}
              className={`px-1.5 py-0.5 text-[8px] font-mono rounded cursor-pointer transition ${renderMode === "heatmap" ? "bg-cyan-500 text-slate-950 font-bold" : "text-cyan-400/70 hover:text-cyan-300"}`}
              title="خريطة الحرارة"
            >
              HEAT
            </button>
          </div>

          {/* Parts Highlight */}
          <div className="flex flex-wrap gap-1 bg-slate-950/85 backdrop-blur-md border border-cyan-500/20 p-0.5 rounded-lg w-full justify-center shadow-lg">
            <button
              onClick={() => setHighlightPart("all")}
              className={`px-1.5 py-0.5 text-[7.5px] font-bold rounded cursor-pointer transition ${highlightPart === "all" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
            >
              الكل
            </button>
            <button
              onClick={() => setHighlightPart("sclera")}
              className={`px-1.5 py-0.5 text-[7.5px] font-bold rounded cursor-pointer transition ${highlightPart === "sclera" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
            >
              الصلبة
            </button>
            <button
              onClick={() => setHighlightPart("iris")}
              className={`px-1.5 py-0.5 text-[7.5px] font-bold rounded cursor-pointer transition ${highlightPart === "iris" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
            >
              القزحية
            </button>
            <button
              onClick={() => setHighlightPart("body")}
              className={`px-1.5 py-0.5 text-[7.5px] font-bold rounded cursor-pointer transition ${highlightPart === "body" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
            >
              البؤبؤ
            </button>
            <button
              onClick={() => setHighlightPart("cornea")}
              className={`px-1.5 py-0.5 text-[7.5px] font-bold rounded cursor-pointer transition ${highlightPart === "cornea" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
            >
              القرنية
            </button>
            <button
              onClick={() => setHighlightPart("retina")}
              className={`px-1.5 py-0.5 text-[7.5px] font-bold rounded cursor-pointer transition ${highlightPart === "retina" ? "bg-cyan-500 text-slate-950" : "text-slate-400 hover:text-slate-200"}`}
            >
              الشبكية
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
