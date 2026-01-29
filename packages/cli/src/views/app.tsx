// Bun native JSX (no React) - renders to HTML string
export function AppPage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>moicad - CAD Editor</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: system-ui, -apple-system, sans-serif;
            background: #0f172a;
            color: #f1f5f9;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            height: 100vh;
          }
          .top-bar {
            height: 48px;
            background: #1e293b;
            border-bottom: 1px solid #334155;
            display: flex;
            align-items: center;
            padding: 0 1rem;
            gap: 1rem;
          }
          .main-content { flex: 1; display: flex; overflow: hidden; }
          .editor-panel { flex: 1; border-right: 1px solid #334155; }
          .viewport-panel { flex: 1; display: flex; flex-direction: column; }
          #editor { width: 100%; height: 100%; }
          #viewport { flex: 1; }
          .stats {
            padding: 0.5rem;
            background: #1e293b;
            border-top: 1px solid #334155;
            font-size: 0.875rem;
          }
          .error {
            padding: 0.5rem;
            background: #991b1b;
            color: #fecaca;
            border-top: 1px solid #7f1d1d;
          }
          button {
            padding: 0.5rem 1rem;
            border-radius: 0.25rem;
            border: none;
            cursor: pointer;
            font-weight: 600;
          }
          .btn-primary { background: #3b82f6; color: #fff; }
          .btn-primary:hover { background: #2563eb; }
          .btn-primary:disabled { background: #475569; cursor: not-allowed; }
        `}</style>
      </head>
      <body>
        <div className="top-bar">
          <h1 style="font-size: 1.25rem; font-weight: bold;">moicad</h1>

          <select id="language" style="background: #334155; color: #f1f5f9; padding: 0.25rem 0.5rem; border-radius: 0.25rem; border: none;">
            <option value="openscad">OpenSCAD</option>
            <option value="javascript">JavaScript</option>
          </select>

          <div style="flex: 1;"></div>

          <button id="run-btn" className="btn-primary">Run</button>
        </div>

        <div className="main-content">
          <div className="editor-panel">
            <div id="editor"></div>
            <div id="error" className="error" style="display: none;"></div>
          </div>

          <div className="viewport-panel">
            <div id="viewport"></div>
            <div id="stats" className="stats" style="display: none;"></div>
          </div>
        </div>

        {/* Monaco Editor */}
        <script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs/loader.js"></script>

        {/* Three.js */}
        <script type="importmap">{`{
          "imports": {
            "three": "https://esm.sh/three@0.182.0",
            "three/addons/": "https://esm.sh/three@0.182.0/examples/jsm/"
          }
        }`}</script>

        {/* App Logic */}
        <script type="module" dangerouslySetInnerHTML={{__html: `
          import * as THREE from 'three';
          import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

          // Initialize Monaco
          let editor;
          require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs' }});
          require(['vs/editor/editor.main'], function() {
            editor = monaco.editor.create(document.getElementById('editor'), {
              value: 'cube(20);',
              language: 'cpp',
              theme: 'vs-dark',
              minimap: { enabled: false },
              fontSize: 14,
              automaticLayout: true
            });
          });

          // Initialize Three.js viewport
          const scene = new THREE.Scene();
          const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
          const renderer = new THREE.WebGLRenderer({ antialias: true });
          const container = document.getElementById('viewport');

          renderer.setSize(container.clientWidth, container.clientHeight);
          renderer.setClearColor(0x0f172a);
          container.appendChild(renderer.domElement);

          camera.position.set(30, 30, 30);
          camera.lookAt(0, 0, 0);

          const controls = new OrbitControls(camera, renderer.domElement);

          // Grid
          const gridHelper = new THREE.GridHelper(100, 10);
          scene.add(gridHelper);
          const axesHelper = new THREE.AxesHelper(20);
          scene.add(axesHelper);

          // Lighting
          const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
          scene.add(ambientLight);
          const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
          directionalLight.position.set(10, 10, 10);
          scene.add(directionalLight);

          let currentMesh = null;

          // Animation loop
          function animate() {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
          }
          animate();

          // Handle resize
          window.addEventListener('resize', () => {
            const width = container.clientWidth;
            const height = container.clientHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
          });

          // Handle Run button
          document.getElementById('run-btn').addEventListener('click', async () => {
            const code = editor.getValue();
            const language = document.getElementById('language').value;
            const btn = document.getElementById('run-btn');
            const errorDiv = document.getElementById('error');
            const statsDiv = document.getElementById('stats');

            btn.disabled = true;
            btn.textContent = 'Running...';
            errorDiv.style.display = 'none';

            try {
              const response = await fetch('/api/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language })
              });

              const result = await response.json();

              if (result.success && result.geometry) {
                // Remove old mesh
                if (currentMesh) {
                  scene.remove(currentMesh);
                  currentMesh.geometry.dispose();
                  currentMesh.material.dispose();
                }

                // Create new geometry
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(result.geometry.vertices, 3));
                geometry.setAttribute('normal', new THREE.Float32BufferAttribute(result.geometry.normals, 3));
                geometry.setIndex(result.geometry.indices);

                const material = new THREE.MeshStandardMaterial({
                  color: 0x4772B3,
                  metalness: 0.3,
                  roughness: 0.6
                });

                currentMesh = new THREE.Mesh(geometry, material);
                scene.add(currentMesh);

                // Show stats
                statsDiv.style.display = 'block';
                statsDiv.textContent = \`Vertices: \${result.geometry.stats.vertexCount} | Faces: \${result.geometry.stats.faceCount}\${result.geometry.stats.volume ? \` | Volume: \${result.geometry.stats.volume.toFixed(2)} mm³\` : ''}\`;
              } else {
                errorDiv.textContent = result.errors.map(e => e.message).join('\\n');
                errorDiv.style.display = 'block';
                statsDiv.style.display = 'none';
              }
            } catch (error) {
              errorDiv.textContent = 'Error: ' + error.message;
              errorDiv.style.display = 'block';
            } finally {
              btn.disabled = false;
              btn.textContent = 'Run';
            }
          });
        `}}></script>
      </body>
    </html>
  );
}
