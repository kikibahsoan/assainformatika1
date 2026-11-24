import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Minimize2,
  Maximize2,
  Mic,
  AlertTriangle,
} from 'lucide-react';

export type ProctorMood = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'LOCKED' | 'SUCCESS';

export interface ProctorAvatarProps {
  message: string;
  mood: ProctorMood;
  violationCount?: number;
  maxViolations?: number;
  variant?: 'hero' | 'exam';
  title?: string;
}

const REFERENCE_IMAGE_URL =
  './assets/aistudio/file_00000000ad2c8207ab460ceba18022a1_8a190914.png';

export const ProctorAvatar3D: React.FC<ProctorAvatarProps> = ({
  message,
  mood,
  violationCount = 0,
  maxViolations = 3,
  variant = 'exam',
  title = 'Pemandu & Proktor 3D',
}) => {
  // Default muted = true so classroom isn't noisy unless student turns voice on
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [use2DMode, setUse2DMode] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.innerWidth < 640 && variant === 'exam';
  });
  const [autoDowngradedReason, setAutoDowngradedReason] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const moodRef = useRef<ProctorMood>(mood);
  const isSpeakingRef = useRef<boolean>(false);
  const lastSpokenMsgRef = useRef<string>('');

  useEffect(() => {
    moodRef.current = mood;
  }, [mood]);

  // Trigger mouth talking animation whenever message updates
  useEffect(() => {
    if (!message) return;
    setIsSpeaking(true);
    isSpeakingRef.current = true;
    const talkTimeout = window.setTimeout(() => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }, 3200);

    if (message !== lastSpokenMsgRef.current) {
      lastSpokenMsgRef.current = message;
      if (!isMuted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(message);
          utterance.lang = 'id-ID';
          utterance.rate = 1.03;
          utterance.pitch = 1.02;
          const voices = window.speechSynthesis.getVoices();
          const idVoice = voices.find((v) => v.lang.toLowerCase().includes('id'));
          if (idVoice) utterance.voice = idVoice;
          utterance.onend = () => {
            setIsSpeaking(false);
            isSpeakingRef.current = false;
          };
          window.speechSynthesis.speak(utterance);
        } catch {
          // Ignore browser TTS error
        }
      }
    }

    return () => clearTimeout(talkTimeout);
  }, [message, isMuted]);

  // Full-Body 3D Chibi Character matching Reference Image:
  // - Undercut black hair with subtle crimson highlight & shaved fade sides
  // - Big expressive dark-brown eyes with white sclera & glossy catchlights
  // - Signature black goatee beard on chin + small "o" speaking mouth
  // - Cozy oversized black turtleneck sweater
  // - Black smartwatch with orange accent button on left wrist
  // - Holding black handheld wireless microphone with both hands near chin
  // - Full body: dark slim trousers + modern black/white sneakers standing on stage
  useEffect(() => {
    if (use2DMode || isMinimized) return;
    const container = canvasMountRef.current;
    if (!container) return;

    const width = variant === 'hero' ? 300 : 230;
    const height = variant === 'hero' ? 350 : 255;

    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setUse2DMode(true);
      setAutoDowngradedReason('Mode 2D Aktif');
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Camera framed for FULL BODY view (head to sneakers)
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 50);
    camera.position.set(0, 1.38, 4.75);
    camera.lookAt(0, 1.26, 0);

    // Studio Lighting (Warm key + Sage/Cool fill + Rim light)
    const hemiLight = new THREE.HemisphereLight(0xf0fdf4, 0x334155, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 1.45);
    keyLight.position.set(2.6, 4.5, 3.5);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x86efac, 0.75);
    rimLight.position.set(-2.6, 3.0, -2.2);
    scene.add(rimLight);

    // ===================== MATERIALS =====================
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xfad2b8,
      roughness: 0.58,
      metalness: 0.04,
    });
    const noseCheekMat = new THREE.MeshStandardMaterial({
      color: 0xf4b393,
      roughness: 0.55,
      metalness: 0.04,
    });
    const hairTopMat = new THREE.MeshStandardMaterial({
      color: 0x141418,
      roughness: 0.35,
      metalness: 0.18,
    });
    const hairHighlightMat = new THREE.MeshStandardMaterial({
      color: 0x5c1922, // Subtle dark crimson highlight from reference image
      roughness: 0.35,
      metalness: 0.2,
    });
    const fadeHairMat = new THREE.MeshStandardMaterial({
      color: 0x524c48, // Shaved undercut fade sides
      roughness: 0.75,
      metalness: 0.05,
    });
    const sweaterMat = new THREE.MeshStandardMaterial({
      color: 0x1c1d21, // Cozy matte black turtleneck fleece
      roughness: 0.88,
      metalness: 0.04,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x272a30, // Dark charcoal slim trousers
      roughness: 0.8,
      metalness: 0.06,
    });
    const shoeBlackMat = new THREE.MeshStandardMaterial({
      color: 0x111317,
      roughness: 0.5,
      metalness: 0.1,
    });
    const shoeSoleMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.4,
      metalness: 0.05,
    });
    const eyeWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.05,
    });
    const irisMat = new THREE.MeshStandardMaterial({
      color: 0x291711, // Deep expressive dark brown eyes
      roughness: 0.1,
      metalness: 0.1,
    });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x050505 });
    const catchlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mouthMat = new THREE.MeshStandardMaterial({
      color: 0x9e4747,
      roughness: 0.5,
    });
    const micBodyMat = new THREE.MeshStandardMaterial({
      color: 0x141619,
      roughness: 0.28,
      metalness: 0.82,
    });
    const micMeshMat = new THREE.MeshStandardMaterial({
      color: 0x22252a,
      roughness: 0.45,
      metalness: 0.75,
    });
    const watchCaseMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.25,
      metalness: 0.8,
    });
    const watchScreenMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.1,
      metalness: 0.9,
    });
    const watchOrangeMat = new THREE.MeshStandardMaterial({
      color: 0xf97316, // Signature orange accent on smartwatch!
      roughness: 0.3,
      metalness: 0.3,
    });

    // ===================== ROOT CHARACTER GROUP =====================
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // 1. Circular Stage Platform & Contact Shadow
    const podiumGeo = new THREE.CylinderGeometry(0.88, 0.96, 0.1, 32);
    const podiumMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.25,
    });
    const podium = new THREE.Mesh(podiumGeo, podiumMat);
    podium.position.y = 0.05;
    rootGroup.add(podium);

    const ringGeo = new THREE.TorusGeometry(0.9, 0.025, 12, 40);
    ringGeo.rotateX(Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 0.4,
      roughness: 0.3,
    });
    const podiumRing = new THREE.Mesh(ringGeo, ringMat);
    podiumRing.position.y = 0.1;
    rootGroup.add(podiumRing);

    // 2. Full-Body Lower Body: Sneakers & Legs
    const legsGroup = new THREE.Group();
    legsGroup.position.y = 0.1;
    rootGroup.add(legsGroup);

    // Left & Right Shoes (Black sneakers with white soles)
    [-0.21, 0.21].forEach((xOffset) => {
      const shoeGroup = new THREE.Group();
      shoeGroup.position.set(xOffset, 0, 0.05);
      legsGroup.add(shoeGroup);

      const soleGeo = new THREE.BoxGeometry(0.24, 0.06, 0.38);
      const sole = new THREE.Mesh(soleGeo, shoeSoleMat);
      sole.position.y = 0.03;
      shoeGroup.add(sole);

      const upperShoeGeo = new THREE.CapsuleGeometry(0.11, 0.16, 8, 12);
      upperShoeGeo.rotateX(Math.PI / 2);
      const upperShoe = new THREE.Mesh(upperShoeGeo, shoeBlackMat);
      upperShoe.position.set(0, 0.1, -0.01);
      shoeGroup.add(upperShoe);

      // Trouser leg
      const legGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.56, 16);
      const leg = new THREE.Mesh(legGeo, pantsMat);
      leg.position.set(xOffset, 0.42, 0);
      legsGroup.add(leg);
    });

    // Pelvis / Hips
    const hipGeo = new THREE.CylinderGeometry(0.35, 0.32, 0.22, 18);
    const hips = new THREE.Mesh(hipGeo, pantsMat);
    hips.position.set(0, 0.72, 0);
    legsGroup.add(hips);

    // 3. Upper Body Group (Breathing & Swaying)
    const upperBodyGroup = new THREE.Group();
    upperBodyGroup.position.set(0, 0.82, 0);
    rootGroup.add(upperBodyGroup);

    // Cozy Oversized Black Turtleneck Sweater Torso
    const sweaterGeo = new THREE.CylinderGeometry(0.38, 0.44, 0.74, 24);
    const sweater = new THREE.Mesh(sweaterGeo, sweaterMat);
    sweater.position.y = 0.36;
    upperBodyGroup.add(sweater);

    // Rounded shoulder blend
    const shoulderBlendGeo = new THREE.SphereGeometry(0.41, 24, 16);
    shoulderBlendGeo.scale(1.06, 0.45, 0.88);
    const shoulderBlend = new THREE.Mesh(shoulderBlendGeo, sweaterMat);
    shoulderBlend.position.y = 0.68;
    upperBodyGroup.add(shoulderBlend);

    // Thick Ribbed Black Turtleneck Collar
    const collarGeo = new THREE.CylinderGeometry(0.25, 0.27, 0.2, 24);
    const collar = new THREE.Mesh(collarGeo, sweaterMat);
    collar.position.set(0, 0.82, 0.02);
    upperBodyGroup.add(collar);

    const collarRollGeo = new THREE.TorusGeometry(0.24, 0.045, 12, 28);
    collarRollGeo.rotateX(Math.PI / 2);
    const collarRoll = new THREE.Mesh(collarRollGeo, sweaterMat);
    collarRoll.position.set(0, 0.9, 0.02);
    upperBodyGroup.add(collarRoll);

    // 4. Arms, Hands, Smartwatch & Wireless Microphone Group
    const armsMicGroup = new THREE.Group();
    armsMicGroup.position.set(0, 0.48, 0.34);
    upperBodyGroup.add(armsMicGroup);

    // Left & Right Sweater Sleeves angled toward the microphone in front of chest
    const sleeveGeo = new THREE.CapsuleGeometry(0.145, 0.42, 8, 16);
    const leftSleeve = new THREE.Mesh(sleeveGeo, sweaterMat);
    leftSleeve.position.set(-0.34, 0.06, -0.14);
    leftSleeve.rotation.set(0.78, 0.25, -0.52);
    armsMicGroup.add(leftSleeve);

    const rightSleeve = new THREE.Mesh(sleeveGeo, sweaterMat);
    rightSleeve.position.set(0.32, 0.03, -0.14);
    rightSleeve.rotation.set(0.75, -0.25, 0.52);
    armsMicGroup.add(rightSleeve);

    // Chubby Chibi Hands holding the microphone
    const handGeo = new THREE.SphereGeometry(0.115, 18, 18);
    handGeo.scale(1.1, 0.92, 1.15);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(-0.04, 0.08, 0.16);
    armsMicGroup.add(leftHand);

    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.set(0.04, -0.04, 0.15);
    armsMicGroup.add(rightHand);

    // Cute fingers wrapped around mic handle
    for (let f = 0; f < 3; f++) {
      const fingerGeo = new THREE.CapsuleGeometry(0.028, 0.07, 4, 8);
      fingerGeo.rotateZ(Math.PI / 2);
      const lf = new THREE.Mesh(fingerGeo, skinMat);
      lf.position.set(0.03, 0.11 - f * 0.04, 0.24);
      armsMicGroup.add(lf);

      const rf = new THREE.Mesh(fingerGeo, skinMat);
      rf.position.set(-0.03, -0.01 - f * 0.04, 0.23);
      armsMicGroup.add(rf);
    }

    // Black Smartwatch with Orange Accent on Left Wrist (Exact match to reference image!)
    const watchGroup = new THREE.Group();
    watchGroup.position.set(-0.15, 0.01, 0.11);
    watchGroup.rotation.set(0.3, 0.4, -0.5);
    armsMicGroup.add(watchGroup);

    const strapGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.07, 16);
    const strap = new THREE.Mesh(strapGeo, watchCaseMat);
    watchGroup.add(strap);

    const watchBodyGeo = new THREE.BoxGeometry(0.13, 0.15, 0.04);
    const watchBody = new THREE.Mesh(watchBodyGeo, watchCaseMat);
    watchBody.position.set(0, 0.02, 0.1);
    watchGroup.add(watchBody);

    const watchFaceGeo = new THREE.BoxGeometry(0.105, 0.125, 0.045);
    const watchFace = new THREE.Mesh(watchFaceGeo, watchScreenMat);
    watchFace.position.set(0, 0.02, 0.102);
    watchGroup.add(watchFace);

    // Orange Crown/Button on Smartwatch
    const orangeBtnGeo = new THREE.BoxGeometry(0.03, 0.045, 0.03);
    const orangeBtn = new THREE.Mesh(orangeBtnGeo, watchOrangeMat);
    orangeBtn.position.set(0.065, 0.04, 0.1);
    watchGroup.add(orangeBtn);

    // Handheld Black Wireless Microphone
    const micGroup = new THREE.Group();
    micGroup.position.set(0, 0.16, 0.19);
    micGroup.rotation.x = -0.14;
    armsMicGroup.add(micGroup);

    const micHandleGeo = new THREE.CylinderGeometry(0.055, 0.042, 0.46, 20);
    const micHandle = new THREE.Mesh(micHandleGeo, micBodyMat);
    micGroup.add(micHandle);

    const micCollarGeo = new THREE.CylinderGeometry(0.068, 0.056, 0.04, 20);
    const micCollar = new THREE.Mesh(micCollarGeo, micBodyMat);
    micCollar.position.y = 0.24;
    micGroup.add(micCollar);

    const micGrilleGeo = new THREE.SphereGeometry(0.095, 24, 20);
    micGrilleGeo.scale(1, 1.18, 1);
    const micGrille = new THREE.Mesh(micGrilleGeo, micMeshMat);
    micGrille.position.y = 0.34;
    micGroup.add(micGrille);

    const micBandGeo = new THREE.TorusGeometry(0.094, 0.012, 8, 24);
    micBandGeo.rotateX(Math.PI / 2);
    const micBand = new THREE.Mesh(micBandGeo, micBodyMat);
    micBand.position.y = 0.33;
    micGroup.add(micBand);

    // 5. Big Expressive Chibi Head Group (Matches Reference Proportions!)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.48, 0.05);
    upperBodyGroup.add(headGroup);

    // Main Chibi Head with soft cheeks
    const headGeo = new THREE.SphereGeometry(0.54, 32, 32);
    headGeo.scale(0.96, 1.05, 0.95);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    headGroup.add(headMesh);

    // Soft Chubby Lower Cheeks / Jawline
    const cheekGeo = new THREE.SphereGeometry(0.44, 24, 24);
    cheekGeo.scale(1.14, 0.72, 0.96);
    const cheekMesh = new THREE.Mesh(cheekGeo, skinMat);
    cheekMesh.position.set(0, -0.14, 0.05);
    headGroup.add(cheekMesh);

    // Shaved Undercut Fade Sides
    const fadeGeo = new THREE.SphereGeometry(0.545, 28, 24);
    fadeGeo.scale(0.97, 0.95, 0.96);
    const fadeMesh = new THREE.Mesh(fadeGeo, fadeHairMat);
    fadeMesh.position.set(0, 0.05, -0.05);
    headGroup.add(fadeMesh);

    // Ears
    const earGeo = new THREE.SphereGeometry(0.13, 16, 16);
    earGeo.scale(0.55, 1.05, 0.8);
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.position.set(-0.52, -0.04, -0.02);
    leftEar.rotation.y = -0.25;
    headGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, skinMat);
    rightEar.position.set(0.52, -0.04, -0.02);
    rightEar.rotation.y = 0.25;
    headGroup.add(rightEar);

    // Sleek Swept Black Undercut Top Hair (Multiple sculpted strands + crimson accent strand)
    const hairTopGroup = new THREE.Group();
    hairTopGroup.position.set(0, 0.42, 0);
    headGroup.add(hairTopGroup);

    const hairBaseGeo = new THREE.SphereGeometry(0.45, 24, 20);
    hairBaseGeo.scale(0.95, 0.55, 1.05);
    const hairBase = new THREE.Mesh(hairBaseGeo, hairTopMat);
    hairBase.position.set(0, 0.04, -0.04);
    hairTopGroup.add(hairBase);

    // Sculpted swept hair locks on top
    const strandConfigs = [
      { x: -0.14, y: 0.16, z: 0.14, rx: 0.25, ry: 0.3, rz: -0.35, s: 1.0, highlight: false },
      { x: 0.02, y: 0.2, z: 0.16, rx: 0.2, ry: 0.15, rz: -0.2, s: 1.1, highlight: false },
      { x: 0.18, y: 0.17, z: 0.12, rx: 0.18, ry: -0.2, rz: -0.15, s: 0.95, highlight: false },
      { x: -0.24, y: 0.11, z: 0.18, rx: 0.35, ry: 0.4, rz: -0.45, s: 0.85, highlight: true }, // Crimson highlight!
      { x: 0.08, y: 0.22, z: -0.05, rx: -0.1, ry: 0.2, rz: -0.25, s: 1.05, highlight: false },
    ];
    strandConfigs.forEach((cfg) => {
      const lockGeo = new THREE.CapsuleGeometry(0.085 * cfg.s, 0.32 * cfg.s, 8, 14);
      lockGeo.rotateZ(Math.PI / 2);
      const lock = new THREE.Mesh(
        lockGeo,
        cfg.highlight ? hairHighlightMat : hairTopMat
      );
      lock.position.set(cfg.x, cfg.y, cfg.z);
      lock.rotation.set(cfg.rx, cfg.ry, cfg.rz);
      hairTopGroup.add(lock);
    });

    // Big Expressive Eyes (White sclera + Huge dark brown iris + Dual white catchlights)
    [-0.19, 0.19].forEach((xEye, idx) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(xEye, 0.04, 0.45);
      eyeGroup.rotation.y = idx === 0 ? -0.16 : 0.16;
      headGroup.add(eyeGroup);

      // White Sclera
      const scleraGeo = new THREE.SphereGeometry(0.145, 24, 24);
      scleraGeo.scale(1.02, 1.12, 0.62);
      const sclera = new THREE.Mesh(scleraGeo, eyeWhiteMat);
      eyeGroup.add(sclera);

      // Large Dark-Brown Iris looking slightly toward viewer/center
      const irisGeo = new THREE.SphereGeometry(0.102, 20, 20);
      irisGeo.scale(0.95, 1.05, 0.45);
      const iris = new THREE.Mesh(irisGeo, irisMat);
      iris.position.set(idx === 0 ? 0.015 : -0.015, 0, 0.058);
      eyeGroup.add(iris);

      // Deep Black Pupil
      const pupilGeo = new THREE.SphereGeometry(0.058, 16, 16);
      pupilGeo.scale(0.95, 1.05, 0.35);
      const pupil = new THREE.Mesh(pupilGeo, pupilMat);
      pupil.position.set(idx === 0 ? 0.016 : -0.016, 0, 0.085);
      eyeGroup.add(pupil);

      // Glossy White Specular Catchlight
      const shineGeo = new THREE.SphereGeometry(0.024, 12, 12);
      const shine = new THREE.Mesh(shineGeo, catchlightMat);
      shine.position.set(idx === 0 ? -0.022 : -0.038, 0.042, 0.098);
      eyeGroup.add(shine);

      // Arched Eyebrow
      const browGeo = new THREE.CapsuleGeometry(0.022, 0.18, 6, 12);
      browGeo.rotateZ(Math.PI / 2);
      const brow = new THREE.Mesh(browGeo, hairTopMat);
      brow.position.set(0, 0.21, 0.02);
      brow.rotation.z = idx === 0 ? 0.14 : -0.14;
      eyeGroup.add(brow);
    });

    // Cute Rounded Nose with warm blush tip
    const noseGeo = new THREE.SphereGeometry(0.068, 18, 18);
    noseGeo.scale(1.18, 0.88, 0.95);
    const nose = new THREE.Mesh(noseGeo, noseCheekMat);
    nose.position.set(0, -0.07, 0.53);
    headGroup.add(nose);

    // Expressive Small "O" Speaking Mouth (Animated!)
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.21, 0.5);
    headGroup.add(mouthGroup);

    const lipGeo = new THREE.TorusGeometry(0.048, 0.02, 12, 24);
    const lips = new THREE.Mesh(lipGeo, mouthMat);
    mouthGroup.add(lips);

    const innerMouthGeo = new THREE.CircleGeometry(0.045, 18);
    const innerMouth = new THREE.Mesh(
      innerMouthGeo,
      new THREE.MeshBasicMaterial({ color: 0x3b0d0d })
    );
    innerMouth.position.z = -0.005;
    mouthGroup.add(innerMouth);

    // Signature Black Goatee Beard on Chin (Exact match to reference image!)
    const goateeGroup = new THREE.Group();
    goateeGroup.position.set(0, -0.37, 0.44);
    headGroup.add(goateeGroup);

    const goateeCenterGeo = new THREE.SphereGeometry(0.095, 16, 16);
    goateeCenterGeo.scale(1.35, 0.68, 0.75);
    const goateeCenter = new THREE.Mesh(goateeCenterGeo, hairTopMat);
    goateeGroup.add(goateeCenter);

    [-0.07, -0.035, 0, 0.035, 0.07].forEach((gx, gi) => {
      const tuftGeo = new THREE.ConeGeometry(0.028, 0.09, 6);
      tuftGeo.rotateX(Math.PI);
      const tuft = new THREE.Mesh(tuftGeo, hairTopMat);
      tuft.position.set(gx, -0.04 - (gi % 2) * 0.015, 0.02);
      tuft.rotation.z = gx * 1.8;
      goateeGroup.add(tuft);
    });

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const clock = new THREE.Clock();
    let frameId = 0;
    let isDisposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (isDisposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (isDisposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const currentMood = moodRef.current;

      // Stage Ring Color by Mood
      if (currentMood === 'LOCKED' || currentMood === 'CRITICAL') {
        ringMat.color.setHex(0xef4444);
        ringMat.emissive.setHex(0xef4444);
      } else if (currentMood === 'WARNING') {
        ringMat.color.setHex(0xf59e0b);
        ringMat.emissive.setHex(0xf59e0b);
      } else {
        ringMat.color.setHex(0x10b981);
        ringMat.emissive.setHex(0x10b981);
      }

      // Full-Body Idle Breathing & Gentle Knee Bounce
      const breathBounce = Math.sin(elapsed * 2.4) * 0.025;
      upperBodyGroup.position.y = THREE.MathUtils.damp(
        upperBodyGroup.position.y,
        0.82 + breathBounce,
        8,
        delta
      );
      upperBodyGroup.rotation.y = Math.sin(elapsed * 0.8) * 0.08;

      // Microphone Hand Gesture
      const micBob = isSpeakingRef.current
        ? Math.sin(elapsed * 8) * 0.025
        : Math.sin(elapsed * 2.4) * 0.01;
      armsMicGroup.position.y = THREE.MathUtils.damp(
        armsMicGroup.position.y,
        0.48 + micBob,
        10,
        delta
      );

      // Expressive Talking "O" Mouth Animation
      const mouthScaleY = isSpeakingRef.current
        ? 0.85 + Math.abs(Math.sin(elapsed * 14)) * 0.75
        : 0.75 + Math.sin(elapsed * 2.4) * 0.1;
      const mouthScaleX = isSpeakingRef.current
        ? 0.9 + Math.cos(elapsed * 12) * 0.2
        : 0.95;
      mouthGroup.scale.set(mouthScaleX, mouthScaleY, 1);

      // Head Turning / Nodding
      let targetHeadY = Math.sin(elapsed * 1.1) * 0.22;
      let targetHeadX = Math.sin(elapsed * 1.7) * 0.05;
      let targetHeadZ = Math.cos(elapsed * 0.9) * 0.04;

      if (currentMood === 'WARNING' || currentMood === 'CRITICAL') {
        targetHeadY = Math.sin(elapsed * 9) * 0.26;
        targetHeadX = 0.06;
      } else if (currentMood === 'LOCKED') {
        targetHeadY = 0;
        targetHeadX = 0.14;
      }

      headGroup.rotation.y = THREE.MathUtils.damp(headGroup.rotation.y, targetHeadY, 6, delta);
      headGroup.rotation.x = THREE.MathUtils.damp(headGroup.rotation.x, targetHeadX, 6, delta);
      headGroup.rotation.z = THREE.MathUtils.damp(headGroup.rotation.z, targetHeadZ, 6, delta);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      isDisposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
      renderer.dispose();
    };
  }, [use2DMode, isMinimized, variant]);

  const cardThemeClass =
    mood === 'LOCKED' || mood === 'CRITICAL'
      ? 'border-red-300 bg-gradient-to-b from-red-50/95 to-white'
      : mood === 'WARNING'
      ? 'border-amber-300 bg-gradient-to-b from-amber-50/95 to-white'
      : 'border-emerald-200/90 bg-gradient-to-b from-[#E8F0E8] via-[#F3F7F2] to-white';

  return (
    <div
      className={`rounded-2xl border transition-all shadow-sm overflow-hidden ${cardThemeClass}`}
    >
      {/* Top Header Strip */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-emerald-900/10 bg-white/80">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={REFERENCE_IMAGE_URL}
            alt="Avatar Proktor"
            className="w-6 h-6 rounded-full object-cover border border-emerald-600/30 shrink-0"
          />
          <span className="text-xs font-bold text-slate-900 truncate">{title}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => {
              setUse2DMode((prev) => !prev);
              setAutoDowngradedReason(null);
            }}
            className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap"
            title="Alihkan tampilan 3D Full-Body atau Foto Referensi"
          >
            {use2DMode ? 'Mode 3D Full-Body' : 'Foto Referensi'}
          </button>

          <button
            type="button"
            onClick={() => setIsMuted((m) => !m)}
            className={`p-1.5 rounded-md border transition-colors ${
              isMuted
                ? 'bg-white text-slate-500 border-slate-200 hover:text-slate-900'
                : 'bg-emerald-700 text-white border-emerald-700'
            }`}
            title={
              isMuted
                ? 'Suara Pemandu Nonaktif (Klik untuk aktifkan suara Bahasa Indonesia)'
                : 'Suara Pemandu Aktif (Klik untuk bisukan)'
            }
            aria-label="Tombol Suara Pemandu"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {variant === 'exam' && (
            <button
              type="button"
              onClick={() => setIsMinimized((v) => !v)}
              className="p-1.5 rounded-md bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors"
              aria-label="Kecilkan Avatar"
            >
              {isMinimized ? (
                <Maximize2 className="w-3.5 h-3.5" />
              ) : (
                <Minimize2 className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Full-Body 3D Stage or Reference Full-Body Composite */}
      {!isMinimized && (
        <div className="relative flex flex-col items-center justify-center pt-2 px-3">
          {use2DMode ? (
            <div
              className={`flex flex-col items-center justify-center py-3 ${
                variant === 'hero' ? 'h-[320px]' : 'h-[235px]'
              }`}
            >
              {/* Full-Body Styled Character Composite using the Reference Portrait + Full Body Silhouette */}
              <div className="relative flex flex-col items-center">
                <div className="relative w-36 h-36 sm:w-40 sm:h-40 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-[#8BA888]">
                  <img
                    src={REFERENCE_IMAGE_URL}
                    alt="Avatar Pemandu TKA Informatika"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Full-body lower sweater, trousers & sneakers illustration beneath portrait */}
                <svg
                  viewBox="0 0 120 74"
                  className="w-28 h-16 -mt-2 select-none"
                  aria-hidden="true"
                >
                  {/* Black turtleneck lower hem */}
                  <rect x="30" y="0" width="60" height="16" rx="6" fill="#1C1D21" />
                  {/* Dark charcoal slim trousers */}
                  <rect x="35" y="14" width="21" height="38" rx="4" fill="#272A30" />
                  <rect x="64" y="14" width="21" height="38" rx="4" fill="#272A30" />
                  {/* Black sneakers with white soles */}
                  <rect x="29" y="48" width="28" height="12" rx="5" fill="#111317" />
                  <rect x="28" y="57" width="30" height="5" rx="2" fill="#F8FAFC" />
                  <rect x="63" y="48" width="28" height="12" rx="5" fill="#111317" />
                  <rect x="62" y="57" width="30" height="5" rx="2" fill="#F8FAFC" />
                </svg>
              </div>
              {autoDowngradedReason && (
                <span className="mt-1 text-[10px] text-slate-600 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-700" />
                  {autoDowngradedReason}
                </span>
              )}
            </div>
          ) : (
            <div className="relative flex items-center justify-center">
              <div
                ref={canvasMountRef}
                className={
                  variant === 'hero'
                    ? 'w-[300px] h-[350px] flex items-center justify-center'
                    : 'w-[230px] h-[255px] flex items-center justify-center'
                }
              />
              {/* Floating Reference Portrait Badge in Bottom-Right of 3D Stage */}
              <button
                type="button"
                onClick={() => setUse2DMode(true)}
                className="absolute bottom-3 right-2 w-11 h-11 rounded-xl overflow-hidden border-2 border-white shadow-md hover:scale-105 transition-transform bg-[#8BA888]"
                title="Referensi Karakter Asli (Klik untuk perbesar)"
              >
                <img
                  src={REFERENCE_IMAGE_URL}
                  alt="Referensi Avatar"
                  className="w-full h-full object-cover"
                />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Dialogue Speech Bubble */}
      <div className="px-4 pb-4 pt-1">
        <div className="relative p-3.5 rounded-xl bg-white border border-emerald-900/15 shadow-xs text-xs sm:text-[13px] text-slate-800 leading-relaxed">
          <div className="flex items-start gap-2.5">
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                mood === 'LOCKED' || mood === 'CRITICAL'
                  ? 'bg-red-100 text-red-700'
                  : mood === 'WARNING'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {mood === 'WARNING' || mood === 'CRITICAL' || mood === 'LOCKED' ? (
                <AlertTriangle className="w-3.5 h-3.5" />
              ) : (
                <Mic className={`w-3.5 h-3.5 ${isSpeaking ? 'animate-bounce' : ''}`} />
              )}
            </div>
            <p className="font-medium text-slate-800">&ldquo;{message}&rdquo;</p>
          </div>
        </div>

        {variant === 'exam' && (
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600 px-1">
            <span>Privasi Aman · Tanpa Kamera</span>
            <span className="font-mono tabular-nums font-bold text-slate-800">
              Pelanggaran: {violationCount}/{maxViolations}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
