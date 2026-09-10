(() => {
  const status = document.getElementById('garden-connection-status');
  const wall = document.getElementById('garden-wall');
  if (!status || !wall) return;

  const config = window.GARDEN_SUPABASE;
  if (!config || !window.supabase) {
    status.textContent = 'Garden connection could not be loaded.';
    status.dataset.state = 'error';
    return;
  }

  const client = window.supabase.createClient(config.url, config.publishableKey);

  const savedCanvas = document.getElementById('garden-saved-canvas');
  const draftCanvas = document.getElementById('garden-draft-canvas');
  const savedCtx = savedCanvas.getContext('2d');
  const draftCtx = draftCanvas.getContext('2d');
  const toolButtons = [...document.querySelectorAll('[data-garden-tool]')];
  const colorButtons = [...document.querySelectorAll('[data-garden-color]')];
  const customColor = document.getElementById('garden-custom-color');
  const sizeInput = document.getElementById('garden-size');
  const sizeOutput = document.getElementById('garden-size-output');
  const nameInput = document.getElementById('garden-name');
  const undoButton = document.getElementById('garden-undo');
  const clearButton = document.getElementById('garden-clear');
  const saveButton = document.getElementById('garden-save');
  const saveStatus = document.getElementById('garden-save-status');
  const markCount = document.getElementById('garden-mark-count');

  const TOOL_DEFAULTS = {
    pencil: { width: 2.2, opacity: 0.68 },
    pen:    { width: 4.5, opacity: 1 },
    marker: { width: 16, opacity: 0.34 },
    brush:  { width: 10, opacity: 0.9 },
    eraser: { width: 24, opacity: 1 }
  };

  let activeTool = 'pen';
  let activeColor = '#315b3f';
  let activeWidth = TOOL_DEFAULTS.pen.width;
  let isDrawing = false;
  let currentStroke = null;
  let draftStrokes = [];
  let savedContributions = [];
  let realtimeChannel = null;
  let resizeTimer = null;

  function setConnection(message, state) {
    status.textContent = message;
    status.dataset.state = state;
  }

  function setSaveStatus(message, state = '') {
    saveStatus.textContent = message;
    saveStatus.dataset.state = state;
  }

  function canvasCssSize() {
    const rect = draftCanvas.getBoundingClientRect();
    return { width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
  }

  function configureCanvas(canvas, ctx) {
    const { width, height } = canvasCssSize();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);

    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  function resizeCanvases() {
    configureCanvas(savedCanvas, savedCtx);
    configureCanvas(draftCanvas, draftCtx);
    redrawAll();
  }

  function normalizedPoint(event) {
    const rect = draftCanvas.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
      pressure: event.pointerType === 'mouse'
        ? 0.5
        : Math.min(1, Math.max(0.05, event.pressure || 0.5))
    };
  }

  function pointToPixels(point, width, height) {
    return { x: point.x * width, y: point.y * height, pressure: point.pressure ?? 0.5 };
  }

  function strokeStyle(stroke, ctx) {
    const preset = TOOL_DEFAULTS[stroke.tool] || TOOL_DEFAULTS.pen;
    ctx.globalCompositeOperation = stroke.tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = stroke.color || '#315b3f';
    ctx.fillStyle = stroke.color || '#315b3f';
    ctx.globalAlpha = stroke.opacity ?? preset.opacity;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }

  function segmentWidth(stroke, point) {
    const base = Number(stroke.width) || TOOL_DEFAULTS[stroke.tool]?.width || 4;
    if (stroke.tool === 'brush') {
      const pressure = point?.pressure ?? 0.5;
      return Math.max(1.5, base * (0.52 + pressure * 0.92));
    }
    if (stroke.tool === 'pencil') {
      const pressure = point?.pressure ?? 0.5;
      return Math.max(1, base * (0.75 + pressure * 0.45));
    }
    return base;
  }

  function drawStroke(ctx, stroke, width, height) {
    if (!stroke?.points?.length) return;
    strokeStyle(stroke, ctx);

    const pts = stroke.points.map(point => pointToPixels(point, width, height));

    if (pts.length === 1) {
      const p = pts[0];
      const radius = segmentWidth(stroke, p) / 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      return;
    }

    for (let i = 1; i < pts.length; i += 1) {
      const a = pts[i - 1];
      const b = pts[i];
      ctx.lineWidth = segmentWidth(stroke, b);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function renderContribution(contribution, targetCtx, width, height) {
    const strokes = contribution?.stroke_data?.strokes;
    if (!Array.isArray(strokes)) return;

    // Erasing belongs only to the contribution that created it. Render each
    // contribution on an offscreen layer, then composite it onto the shared wall.
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const layer = document.createElement('canvas');
    layer.width = Math.round(width * dpr);
    layer.height = Math.round(height * dpr);
    const layerCtx = layer.getContext('2d');
    layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (const stroke of strokes) drawStroke(layerCtx, stroke, width, height);

    targetCtx.save();
    targetCtx.globalAlpha = 1;
    targetCtx.globalCompositeOperation = 'source-over';
    targetCtx.drawImage(layer, 0, 0, width, height);
    targetCtx.restore();
  }

  function redrawSaved() {
    const { width, height } = canvasCssSize();
    savedCtx.clearRect(0, 0, width, height);
    for (const contribution of savedContributions) {
      renderContribution(contribution, savedCtx, width, height);
    }
  }

  function redrawDraft() {
    const { width, height } = canvasCssSize();
    draftCtx.clearRect(0, 0, width, height);
    for (const stroke of draftStrokes) drawStroke(draftCtx, stroke, width, height);
    if (currentStroke) drawStroke(draftCtx, currentStroke, width, height);
  }

  function redrawAll() {
    redrawSaved();
    redrawDraft();
    updateActionState();
  }

  function updateActionState() {
    const hasDraft = draftStrokes.length > 0 || Boolean(currentStroke?.points?.length);
    undoButton.disabled = draftStrokes.length === 0;
    clearButton.disabled = !hasDraft;
    saveButton.disabled = draftStrokes.length === 0;
  }

  function setTool(tool) {
    if (!TOOL_DEFAULTS[tool]) return;
    activeTool = tool;
    activeWidth = TOOL_DEFAULTS[tool].width;
    sizeInput.value = String(activeWidth);
    sizeOutput.value = `${Math.round(activeWidth)} px`;

    toolButtons.forEach(button => {
      const selected = button.dataset.gardenTool === tool;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    draftCanvas.dataset.tool = tool;
  }

  function setColor(color) {
    activeColor = color;
    colorButtons.forEach(button => {
      const selected = button.dataset.gardenColor.toLowerCase() === color.toLowerCase();
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    customColor.value = color;
  }

  function beginStroke(event) {
    if (event.button !== undefined && event.button !== 0 && event.pointerType === 'mouse') return;
    event.preventDefault();
    draftCanvas.setPointerCapture?.(event.pointerId);
    isDrawing = true;
    currentStroke = {
      tool: activeTool,
      color: activeColor,
      width: activeWidth,
      opacity: TOOL_DEFAULTS[activeTool].opacity,
      points: [normalizedPoint(event)]
    };
    redrawDraft();
    updateActionState();
  }

  function continueStroke(event) {
    if (!isDrawing || !currentStroke) return;
    event.preventDefault();

    const point = normalizedPoint(event);
    const last = currentStroke.points[currentStroke.points.length - 1];
    const dx = point.x - last.x;
    const dy = point.y - last.y;
    // Avoid bloating JSON with hundreds of effectively identical samples.
    if ((dx * dx + dy * dy) < 0.0000025) return;

    currentStroke.points.push(point);
    redrawDraft();
  }

  function endStroke(event) {
    if (!isDrawing || !currentStroke) return;
    event.preventDefault();
    isDrawing = false;
    if (currentStroke.points.length) draftStrokes.push(currentStroke);
    currentStroke = null;
    redrawDraft();
    updateActionState();
  }

  async function loadGardenMarks({ announce = true } = {}) {
    if (announce) setConnection('Checking the garden…', 'loading');

    const { data, error } = await client
      .from('garden_marks')
      .select('id, created_at, visitor_name, stroke_data')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Garden Wall load failed:', error);
      setConnection('The shared garden could not be loaded.', 'error');
      return false;
    }

    savedContributions = Array.isArray(data) ? data : [];
    markCount.textContent = `${savedContributions.length} ${savedContributions.length === 1 ? 'mark' : 'marks'} in the garden`;
    setConnection('Shared garden connected.', 'success');
    redrawSaved();
    return true;
  }

  async function saveContribution() {
    if (!draftStrokes.length) return;

    const name = nameInput.value.trim().slice(0, 60);
    const { width, height } = canvasCssSize();

    const payload = {
      visitor_name: name || null,
      stroke_data: {
        format_version: 1,
        canvas: { width: Math.round(width), height: Math.round(height) },
        strokes: draftStrokes
      }
    };

    saveButton.disabled = true;
    setSaveStatus('Planting your mark…', 'loading');

    const { data, error } = await client
      .from('garden_marks')
      .insert(payload)
      .select('id, created_at, visitor_name, stroke_data')
      .single();

    if (error) {
      console.error('Garden Wall save failed:', error);
      setSaveStatus('Your mark could not be saved. Please try again.', 'error');
      updateActionState();
      return;
    }

    // Add immediately; realtime may send the same row a moment later, so dedupe by id.
    if (!savedContributions.some(mark => mark.id === data.id)) savedContributions.push(data);
    draftStrokes = [];
    currentStroke = null;
    setSaveStatus(name ? `Your mark is in the garden, ${name}.` : 'Your mark is in the garden.', 'success');
    markCount.textContent = `${savedContributions.length} ${savedContributions.length === 1 ? 'mark' : 'marks'} in the garden`;
    redrawAll();
  }

  function startRealtime() {
    if (realtimeChannel) client.removeChannel(realtimeChannel);

    realtimeChannel = client
      .channel('garden-wall-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'garden_marks' },
        payload => {
          const incoming = payload.new;
          if (!incoming || savedContributions.some(mark => mark.id === incoming.id)) return;
          savedContributions.push(incoming);
          markCount.textContent = `${savedContributions.length} ${savedContributions.length === 1 ? 'mark' : 'marks'} in the garden`;
          redrawSaved();
          setSaveStatus('A new mark just appeared in the garden.', 'live');
        }
      )
      .subscribe(statusValue => {
        if (statusValue === 'CHANNEL_ERROR') {
          console.warn('Garden Wall realtime channel could not connect.');
        }
      });
  }

  toolButtons.forEach(button => {
    button.addEventListener('click', () => setTool(button.dataset.gardenTool));
  });

  colorButtons.forEach(button => {
    button.addEventListener('click', () => setColor(button.dataset.gardenColor));
  });

  customColor.addEventListener('input', () => setColor(customColor.value));

  sizeInput.addEventListener('input', () => {
    activeWidth = Number(sizeInput.value);
    sizeOutput.value = `${Math.round(activeWidth)} px`;
  });

  undoButton.addEventListener('click', () => {
    draftStrokes.pop();
    setSaveStatus('Undid your last stroke.');
    redrawDraft();
    updateActionState();
  });

  clearButton.addEventListener('click', () => {
    draftStrokes = [];
    currentStroke = null;
    setSaveStatus('Your unsaved marks were cleared.');
    redrawDraft();
    updateActionState();
  });

  saveButton.addEventListener('click', saveContribution);

  draftCanvas.addEventListener('pointerdown', beginStroke);
  draftCanvas.addEventListener('pointermove', continueStroke);
  draftCanvas.addEventListener('pointerup', endStroke);
  draftCanvas.addEventListener('pointercancel', endStroke);
  draftCanvas.addEventListener('contextmenu', event => event.preventDefault());

  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resizeCanvases, 120);
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) redrawAll();
  });

  async function initGardenWall() {
    setTool('pen');
    setColor(activeColor);
    resizeCanvases();
    updateActionState();
    const connected = await loadGardenMarks();
    if (connected) startRealtime();
  }

  initGardenWall();
})();
