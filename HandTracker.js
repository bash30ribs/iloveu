export class HandTracker {
    constructor(videoElement, onGesture, onSmile) {
        this.videoElement = videoElement;
        this.onGesture = onGesture;
        this.onSmile = onSmile;

        this.skeletonCanvas = document.getElementById('skeleton-canvas');
        this.skeletonCtx = this.skeletonCanvas ? this.skeletonCanvas.getContext('2d') : null;
        
        this.lastHandPos = null;
        this.lastTwoHandDist = null;
        this.smoothedPos = null;
        this.smoothedPos1 = null;
        this.smoothedPos2 = null;

        // Heart image for landmark dots
        this.heartImg = new Image();
        this.heartImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23FFD1DC' d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/%3E%3C/svg%3E";

        this.hands = null;
        this.faceMesh = null;
        this._faceFrameCount = 0;
        this._isActive = false;
        this._isProcessing = false;
        this._animFrameId = null;
        this._lastVideoTime = -1;
        this.stream = null;

        this._initHands();
        this._initFaceMesh();
    }

    _initHands() {
        if (window.Hands && !this.hands) {
            this.hands = new window.Hands({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`
            });

            this.hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            this.hands.onResults(this.onResults.bind(this));
        }
    }

    _initFaceMesh() {
        if (window.FaceMesh && !this.faceMesh) {
            try {
                this.faceMesh = new window.FaceMesh({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`
                });
                this.faceMesh.setOptions({
                    maxNumFaces: 1,
                    refineLandmarks: false,
                    minDetectionConfidence: 0.5,
                    minTrackingConfidence: 0.5
                });
                this.faceMesh.onResults(this.onFaceResults.bind(this));
            } catch (err) {
                console.warn("FaceMesh init notice:", err);
            }
        }
    }

    async start() {
        if (this._isActive) return Promise.resolve();
        this._isActive = true;

        // If MediaPipe script hasn't finished loading yet, wait briefly
        if (!this.hands) {
            let retries = 0;
            while (!window.Hands && retries < 25) {
                await new Promise(r => setTimeout(r, 120));
                retries++;
            }
            this._initHands();
            if (!this.hands) {
                this._isActive = false;
                throw new Error("MediaPipe Hands library could not be loaded from CDN.");
            }
        }

        if (!this.faceMesh) {
            let faceRetries = 0;
            while (!window.FaceMesh && faceRetries < 25) {
                await new Promise(r => setTimeout(r, 100));
                faceRetries++;
            }
            this._initFaceMesh();
        }

        const constraints = {
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            },
            audio: false
        };

        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
            console.warn("Retrying camera with generic constraints...", err);
            stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        }

        this.videoElement.srcObject = stream;
        this.videoElement.setAttribute('playsinline', 'true');
        this.videoElement.setAttribute('muted', 'true');
        this.videoElement.muted = true;
        this.videoElement.playsInline = true;

        await this.videoElement.play();
        this.stream = stream;
        this._processFrame();
    }

    async _processFrame() {
        if (!this._isActive) return;

        // Skip frame if camera has not delivered a new frame yet (throttles to actual camera FPS)
        if (this.videoElement && this.videoElement.currentTime === this._lastVideoTime) {
            this._animFrameId = requestAnimationFrame(() => this._processFrame());
            return;
        }

        // Ensure we don't spam MediaPipe with new frames while a frame is still being processed
        if (!this._isProcessing && this.videoElement && this.videoElement.readyState >= 2) {
            this._lastVideoTime = this.videoElement.currentTime;
            this._isProcessing = true;
            try {
                if (this.hands) {
                    await this.hands.send({ image: this.videoElement });
                }

                this._faceFrameCount++;
                if (!this.faceMesh && window.FaceMesh) {
                    this._initFaceMesh();
                }
                if (this.faceMesh && this._faceFrameCount % 6 === 0) {
                    await this.faceMesh.send({ image: this.videoElement });
                }
            } catch (err) {
                console.warn("Tracking frame send error:", err);
            } finally {
                this._isProcessing = false;
            }
        }

        this._animFrameId = requestAnimationFrame(() => this._processFrame());
    }

    isActive() {
        return this._isActive;
    }

    stop() {
        this._isActive = false;
        this._isProcessing = false;
        this._lastVideoTime = -1;
        if (this._animFrameId) {
            cancelAnimationFrame(this._animFrameId);
            this._animFrameId = null;
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
    }

    drawSkeleton(results) {
        if (!this.skeletonCtx || !this.skeletonCanvas) return;

        const ctx = this.skeletonCtx;
        const cw = this.skeletonCanvas.width;
        const ch = this.skeletonCanvas.height;

        ctx.clearRect(0, 0, cw, ch);

        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) return;

        // Fallback connections in case window.HAND_CONNECTIONS is not globally loaded
        const connections = window.HAND_CONNECTIONS || [
            [0, 1], [1, 2], [2, 3], [3, 4],       // thumb
            [0, 5], [5, 6], [6, 7], [7, 8],       // index
            [5, 9], [9, 10], [10, 11], [11, 12],   // middle
            [9, 13], [13, 14], [14, 15], [15, 16], // ring
            [13, 17], [0, 17], [17, 18], [18, 19], [19, 20] // pinky
        ];

        for (const landmarks of results.multiHandLandmarks) {
            // Scale normalized landmarks to canvas pixels (mirror X to match selfie preview)
            const pts = landmarks.map(p => ({
                x: (1 - p.x) * cw,
                y: p.y * ch
            }));

            // Draw connections (bone lines)
            ctx.strokeStyle = '#FFD1DC';
            ctx.lineWidth = 2.5;
            ctx.shadowBlur = 6;
            ctx.shadowColor = '#FFB6C1';
            ctx.beginPath();
            for (const [a, b] of connections) {
                if (pts[a] && pts[b]) {
                    ctx.moveTo(pts[a].x, pts[a].y);
                    ctx.lineTo(pts[b].x, pts[b].y);
                }
            }
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Draw baby pink heart at every joint
            const hSize = 10;
            for (const pt of pts) {
                if (this.heartImg.complete) {
                    ctx.drawImage(this.heartImg, pt.x - hSize / 2, pt.y - hSize / 2, hSize, hSize);
                } else {
                    ctx.fillStyle = '#FFD1DC';
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    }

    onResults(results) {
        this.drawSkeleton(results);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            // TWO HANDS — zoom or magic wand mode
            if (results.multiHandLandmarks.length >= 2) {
                const landmarks0 = results.multiHandLandmarks[0];
                const landmarks1 = results.multiHandLandmarks[1];
                let hand1Pos = landmarks0[9];
                let hand2Pos = landmarks1[9];

                const palm0 = this.getDist(landmarks0[0], landmarks0[9]) || 0.1;
                const palm1 = this.getDist(landmarks1[0], landmarks1[9]) || 0.1;
                const pinchDist0 = this.getDist(landmarks0[4], landmarks0[8]);
                const pinchDist1 = this.getDist(landmarks1[4], landmarks1[8]);
                const bothPinching = (pinchDist0 / palm0 < 0.42) && (pinchDist1 / palm1 < 0.42);

                if (bothPinching) {
                    const centerX = (hand1Pos.x + hand2Pos.x) / 2;
                    const centerY = (hand1Pos.y + hand2Pos.y) / 2;

                    let deltaX = 0, deltaY = 0;
                    if (this.lastHandPos) {
                        deltaX = centerX - this.lastHandPos.x;
                        deltaY = centerY - this.lastHandPos.y;
                    }
                    this.lastHandPos = { x: centerX, y: centerY };

                    if (this.onGesture) {
                        this.onGesture({
                            type: 'magic_wand',
                            position: hand1Pos,
                            position2: hand2Pos,
                            centerX,
                            centerY,
                            confidence: 96
                        });
                    }
                    return;
                }

                // Standard two-hand zoom
                const rawHand1Pos = landmarks0[9];
                const rawHand2Pos = landmarks1[9];

                if (!this.smoothedPos1 || !this.smoothedPos2) {
                    this.smoothedPos1 = { x: rawHand1Pos.x, y: rawHand1Pos.y, z: rawHand1Pos.z };
                    this.smoothedPos2 = { x: rawHand2Pos.x, y: rawHand2Pos.y, z: rawHand2Pos.z };
                } else {
                    const alpha = 0.35;
                    this.smoothedPos1.x += (rawHand1Pos.x - this.smoothedPos1.x) * alpha;
                    this.smoothedPos1.y += (rawHand1Pos.y - this.smoothedPos1.y) * alpha;
                    this.smoothedPos2.x += (rawHand2Pos.x - this.smoothedPos2.x) * alpha;
                    this.smoothedPos2.y += (rawHand2Pos.y - this.smoothedPos2.y) * alpha;
                }
                hand1Pos = this.smoothedPos1;
                hand2Pos = this.smoothedPos2;

                const dist = this.getDist(hand1Pos, hand2Pos);
                let zoomDelta = 0;
                if (this.lastTwoHandDist !== null) {
                    zoomDelta = dist - this.lastTwoHandDist;
                }
                this.lastTwoHandDist = dist;

                if (this.onGesture) {
                    this.onGesture({
                        type: 'two_hands_zoom',
                        zoomDelta,
                        position: hand1Pos,
                        position2: hand2Pos,
                        confidence: 94
                    });
                }
                return;
            }

            // SINGLE HAND
            this.lastTwoHandDist = null;
            this.smoothedPos1 = null;
            this.smoothedPos2 = null;

            const landmarks = results.multiHandLandmarks[0];
            const handedness = (results.multiHandedness && results.multiHandedness[0]) ? results.multiHandedness[0].label : 'Right';
            const confidenceScore = (results.multiHandedness && results.multiHandedness[0] && results.multiHandedness[0].score)
                ? Math.round(results.multiHandedness[0].score * 100)
                : 95;

            const gesture = this.detectGesture(landmarks, handedness);
            const rawPos = landmarks[9];

            if (!this.smoothedPos) {
                this.smoothedPos = { x: rawPos.x, y: rawPos.y, z: rawPos.z || 0 };
            } else {
                const distMoved = Math.hypot(rawPos.x - this.smoothedPos.x, rawPos.y - this.smoothedPos.y);
                // Dynamic 1-Euro adaptive filter: heavy smoothing when slow (zero jitter), fast response when moving (zero lag)
                const dynamicAlpha = Math.min(0.65, Math.max(0.18, distMoved * 10.0));
                this.smoothedPos.x += (rawPos.x - this.smoothedPos.x) * dynamicAlpha;
                this.smoothedPos.y += (rawPos.y - this.smoothedPos.y) * dynamicAlpha;
                this.smoothedPos.z += ((rawPos.z || 0) - this.smoothedPos.z) * dynamicAlpha;
            }
            
            const currentPos = this.smoothedPos;

            let deltaX = 0, deltaY = 0;
            if (this.lastHandPos) {
                deltaX = currentPos.x - this.lastHandPos.x;
                deltaY = currentPos.y - this.lastHandPos.y;
                
                // Deadzone to prevent micro-jitter
                if (Math.abs(deltaX) < 0.001) deltaX = 0;
                if (Math.abs(deltaY) < 0.001) deltaY = 0;
            }
            this.lastHandPos = { x: currentPos.x, y: currentPos.y, z: currentPos.z };

            if (this.onGesture) {
                this.onGesture({
                    type: gesture,
                    landmarks,
                    position: currentPos,
                    deltaX,
                    deltaY,
                    confidence: confidenceScore
                });
            }
        } else {
            this.lastHandPos = null;
            this.smoothedPos = null;
            this.smoothedPos1 = null;
            this.smoothedPos2 = null;
            this.lastTwoHandDist = null;
            if (this.onGesture) {
                this.onGesture({ type: 'none', landmarks: null, confidence: 0 });
            }
        }
    }

    onFaceResults(results) {
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const face = results.multiFaceLandmarks[0];
            
            // 61: left mouth corner, 291: right mouth corner
            // 234: left cheek edge, 454: right cheek edge
            // 33: left eye outer corner, 263: right eye outer corner
            // 13: upper lip center
            const mouthWidth = this.getDist(face[61], face[291]);
            const faceWidth  = this.getDist(face[234], face[454]);
            const eyeDist    = this.getDist(face[33], face[263]);
            
            let isSmiling = false;
            let ratio = 0;

            if (faceWidth > 0.001) {
                ratio = mouthWidth / faceWidth;
                // Ratio test: neutral is ~0.33-0.37. When smiling, ratio reaches >= 0.385
                if (ratio >= 0.385) {
                    isSmiling = true;
                }
            }

            // Eye distance check (less affected by head tilt/yaw rotation)
            if (eyeDist > 0.001) {
                const eyeRatio = mouthWidth / eyeDist;
                // Neutral is ~0.66-0.73, smiling is >= 0.76
                if (eyeRatio >= 0.76) {
                    isSmiling = true;
                }
            }

            // Corner lift check: smiling lifts lip corners up towards eyes
            const avgCornerY = (face[61].y + face[291].y) * 0.5;
            const lipCenterY = face[13].y;
            if (faceWidth > 0.001 && (lipCenterY - avgCornerY) > -0.012 && ratio >= 0.375) {
                isSmiling = true;
            }

            if (isSmiling && this.onSmile) {
                this.onSmile(ratio || 0.42);
            }
        }
    }

    getDist(p1, p2) {
        return Math.hypot(p1.x - p2.x, p1.y - p2.y);
    }

    detectGesture(landmarks, handedness) {
        const wrist     = landmarks[0];
        const thumbMcp  = landmarks[2];
        const thumbIp   = landmarks[3];
        const thumbTip  = landmarks[4];

        const indexMcp  = landmarks[5];
        const indexPip  = landmarks[6];
        const indexTip  = landmarks[8];

        const middleMcp = landmarks[9];
        const middlePip = landmarks[10];
        const middleTip = landmarks[12];

        const ringMcp   = landmarks[13];
        const ringPip   = landmarks[14];
        const ringTip   = landmarks[16];

        const pinkyMcp  = landmarks[17];
        const pinkyPip  = landmarks[18];
        const pinkyTip  = landmarks[20];

        // Scale-invariant palm measurement (wrist to middle MCP knuckle)
        const palmSize = this.getDist(wrist, middleMcp) || 0.1;

        // Check whether a finger is extended:
        // Tip must be further from wrist than PIP joint, AND tip must be extended away from knuckle (MCP)
        const isFingerExt = (tip, pip, mcp) => {
            const tipToWrist = this.getDist(wrist, tip);
            const pipToWrist = this.getDist(wrist, pip);
            const tipToMcp   = this.getDist(mcp, tip);
            const pipToMcp   = this.getDist(mcp, pip);
            return (tipToWrist > pipToWrist) && (tipToMcp > pipToMcp * 1.1 || tipToMcp > palmSize * 0.55);
        };

        const isIndexExt  = isFingerExt(indexTip, indexPip, indexMcp);
        const isMiddleExt = isFingerExt(middleTip, middlePip, middleMcp);
        const isRingExt   = isFingerExt(ringTip, ringPip, ringMcp);
        const isPinkyExt  = isFingerExt(pinkyTip, pinkyPip, pinkyMcp);

        // Robust rotation- and handedness-invariant thumb extension:
        // Thumb tip is pushed out away from thumb base joint and away from palm knuckles
        const thumbExtDist = this.getDist(thumbTip, thumbMcp);
        const thumbIpDist  = this.getDist(thumbIp, thumbMcp);
        const thumbToPinky = this.getDist(thumbTip, pinkyMcp);
        const thumbToIndex = this.getDist(thumbTip, indexMcp);

        const isThumbExt = (thumbExtDist > thumbIpDist * 1.15) &&
                           (thumbToPinky > palmSize * 0.75 || thumbToIndex > palmSize * 0.5);

        // Scale-invariant distance between thumb tip and index tip
        const pinchDist = this.getDist(thumbTip, indexTip);
        const isPinchClose = pinchDist < palmSize * 0.38;

        // 1. OK Sign (Thumb & index touching, while middle, ring, pinky are extended)
        if (isPinchClose && isMiddleExt && isRingExt && isPinkyExt) {
            return 'ok_sign';
        }

        // 2. Pinch (Thumb & index touching/pinching to select a photo)
        if (isPinchClose) {
            return 'pinch';
        }

        // 3. Love Gesture 🤟 (Thumb, Index, Pinky extended; Middle & Ring curled)
        if (isThumbExt && isIndexExt && !isMiddleExt && !isRingExt && isPinkyExt) {
            return 'love';
        }

        // 4. Call Me / Shaka 🤙 (Thumb and Pinky extended; Index, Middle, Ring curled)
        if (isThumbExt && !isIndexExt && !isMiddleExt && !isRingExt && isPinkyExt) {
            return 'call_me';
        }

        // 5. Peace Sign ✌️ (Index and Middle extended, Ring and Pinky curled)
        if (isIndexExt && isMiddleExt && !isRingExt && !isPinkyExt) {
            return 'peace';
        }

        // 6. Point Up / Down ☝️ / 👇 (Only Index extended)
        if (isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt) {
            if (indexTip.y < indexMcp.y) return 'point_up';
            return 'point_down';
        }

        // 7. Thumbs Up / Down 👍 / 👎 (Only Thumb extended)
        if (isThumbExt && !isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt) {
            if (thumbTip.y < thumbMcp.y) return 'thumbs_up';
            return 'thumbs_down';
        }

        // 8. Open Palm ✋ (All 4 fingers extended; thumb may be open or neutral)
        if (isIndexExt && isMiddleExt && isRingExt && isPinkyExt) {
            return 'open_palm';
        }

        // 9. Fist ✊ (All fingers curled)
        if (!isThumbExt && !isIndexExt && !isMiddleExt && !isRingExt && !isPinkyExt) {
            return 'fist';
        }

        return 'none';
    }
}
