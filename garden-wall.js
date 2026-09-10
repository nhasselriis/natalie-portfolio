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

  const board = document.getElementById('garden-board-viewport');
  const savedCanvas = document.getElementById('garden-saved-canvas');
  const draftCanvas = document.getElementById('garden-draft-canvas');
  const placementFrame = document.getElementById('garden-placement-frame');
  const savedCtx = savedCanvas.getContext('2d');
  const draftCtx = draftCanvas.getContext('2d');
  const toolButtons = [...document.querySelectorAll('[data-garden-tool]')];
  const colorButtons = [...document.querySelectorAll('[data-garden-color]')];
  const customColor = document.getElementById('garden-custom-color');
  const sizeInput = document.getElementById('garden-size');
  const sizeOutput = document.getElementById('garden-size-output');
  const nameInput = document.getElementById('garden-name');
  const undoButton = document.getElementById('garden-undo');
  const redoButton = document.getElementById('garden-redo');
  const clearButton = document.getElementById('garden-clear');
  const saveButton = document.getElementById('garden-save');
  const saveStatus = document.getElementById('garden-save-status');
  const markCount = document.getElementById('garden-mark-count');
  const boardHint = document.getElementById('garden-board-hint');
  const positionLabel = document.getElementById('garden-position');
  const zoomInButton = document.getElementById('garden-zoom-in');
  const zoomOutButton = document.getElementById('garden-zoom-out');
  const zoomResetButton = document.getElementById('garden-zoom-reset');

  const WORLD = { width: 5000, height: 2200 };
  const CONTRIBUTION = { width: 650, height: 500 };
  const MIN_ZOOM = 0.45;
  const MAX_ZOOM = 1.8;
  const MAX_STROKES = 300;
  const MAX_POINTS = 12000;

  const TOOL_DEFAULTS = {
    pencil: { width: 2.2, opacity: 0.68 },
    pen:    { width: 4.5, opacity: 1 },
    marker: { width: 16, opacity: 0.34 },
    brush:  { width: 10, opacity: 0.9 },
    eraser: { width: 24, opacity: 1 },
    hand:   { width: 1, opacity: 1 }
  };

  let activeTool = 'pen';
  let activeColor = '#315b3f';
  let activeWidth = TOOL_DEFAULTS.pen.width;
  let isDrawing = false;
  let isPanning = false;
  let currentStroke = null;
  let draftStrokes = [];
  let redoStrokes = [];
  let savedContributions = [];
  let draftPlacement = null;
  let panStart = null;
  let realtimeChannel = null;
  let resizeTimer = null;
  let camera = { x: (WORLD.width - 1100) / 2, y: (WORLD.height - 760) / 2, zoom: 1 };

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

  function visibleWorldSize() {
    const { width, height } = canvasCssSize();
    return { width: width / camera.zoom, height: height / camera.zoom };
  }

  function clampCamera() {
    const view = visibleWorldSize();
    camera.x = Math.max(0, Math.min(WORLD.width - view.width, camera.x));
    camera.y = Math.max(0, Math.min(WORLD.height - view.height, camera.y));
  }

  function currentPlacementPreview() {
    const view = visibleWorldSize();
    return {
      x: Math.max(0, Math.min(WORLD.width - CONTRIBUTION.width, camera.x + (view.width - CONTRIBUTION.width) / 2)),
      y: Math.max(0, Math.min(WORLD.height - CONTRIBUTION.height, camera.y + (view.height - CONTRIBUTION.height) / 2)),
      width: CONTRIBUTION.width,
      height: CONTRIBUTION.height
    };
  }

  function activePlacement() {
    return draftPlacement || currentPlacementPreview();
  }

  function worldToScreen(point) {
    return {
      x: (point.x - camera.x) * camera.zoom,
      y: (point.y - camera.y) * camera.zoom
    };
  }

  function screenToWorld(clientX, clientY) {
    const rect = draftCanvas.getBoundingClientRect();
    return {
      x: camera.x + (clientX - rect.left) / camera.zoom,
      y: camera.y + (clientY - rect.top) / camera.zoom
    };
  }

  function normalizeToPlacement(worldPoint, placement) {
    return {
      x: Math.min(1, Math.max(0, (worldPoint.x - placement.x) / placement.width)),
      y: Math.min(1, Math.max(0, (worldPoint.y - placement.y) / placement.height))
    };
  }

  function pointInsidePlacement(worldPoint, placement) {
    return worldPoint.x >= placement.x && worldPoint.x <= placement.x + placement.width &&
           worldPoint.y >= placement.y && worldPoint.y <= placement.y + placement.height;
  }

  function contributionPlacement(contribution) {
    const data = contribution?.stroke_data || {};
    if (data.placement && Number.isFinite(data.placement.x)) return data.placement;
    // Version 1 compatibility. Old marks lived on one viewport, so place them at the garden center.
    return {
      x: (WORLD.width - CONTRIBUTION.width) / 2,
      y: (WORLD.height - CONTRIBUTION.height) / 2,
      width: CONTRIBUTION.width,
      height: CONTRIBUTION.height
    };
  }

  function placementPointToWorld(point, placement) {
    return {
      x: placement.x + point.x * placement.width,
      y: placement.y + point.y * placement.height,
      pressure: point.pressure ?? 0.5
    };
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

  function drawStrokeWorld(ctx, stroke, placement) {
    if (!stroke?.points?.length) return;
    strokeStyle(stroke, ctx);

    const pts = stroke.points.map(point => {
      const worldPoint = placementPointToWorld(point, placement);
      const screenPoint = worldToScreen(worldPoint);
      return { ...screenPoint, pressure: worldPoint.pressure };
    });

    if (pts.length === 1) {
      const p = pts[0];
      const radius = (segmentWidth(stroke, p) * camera.zoom) / 2;
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
      ctx.lineWidth = segmentWidth(stroke, b) * camera.zoom;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  function renderContribution(contribution, targetCtx) {
    const strokes = contribution?.stroke_data?.strokes;
    if (!Array.isArray(strokes)) return;
    const placement = contributionPlacement(contribution);

    // Each contribution gets an isolated layer so its eraser cannot erase other visitors' marks.
    const { width, height } = canvasCssSize();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const layer = document.createElement('canvas');
    layer.width = Math.round(width * dpr);
    layer.height = Math.round(height * dpr);
    const layerCtx = layer.getContext('2d');
    layerCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (const stroke of strokes) drawStrokeWorld(layerCtx, stroke, placement);

    targetCtx.save();
    targetCtx.globalAlpha = 1;
    targetCtx.globalCompositeOperation = 'source-over';
    targetCtx.drawImage(layer, 0, 0, width, height);
    targetCtx.restore();
  }

  function redrawSaved() {
    const { width, height } = canvasCssSize();
    savedCtx.clearRect(0, 0, width, height);
    for (const contribution of savedContributions) renderContribution(contribution, savedCtx);
  }

  function redrawDraft() {
    const { width, height } = canvasCssSize();
    draftCtx.clearRect(0, 0, width, height);
    const placement = draftPlacement;
    if (placement) {
      for (const stroke of draftStrokes) drawStrokeWorld(draftCtx, stroke, placement);
      if (currentStroke) drawStrokeWorld(draftCtx, currentStroke, placement);
    }
  }

  function updatePlacementFrame() {
    const placement = activePlacement();
    const topLeft = worldToScreen({ x: placement.x, y: placement.y });
    const bottomRight = worldToScreen({ x: placement.x + placement.width, y: placement.y + placement.height });
    placementFrame.style.left = `${topLeft.x}px`;
    placementFrame.style.top = `${topLeft.y}px`;
    placementFrame.style.width = `${bottomRight.x - topLeft.x}px`;
    placementFrame.style.height = `${bottomRight.y - topLeft.y}px`;
    placementFrame.classList.toggle('is-locked', Boolean(draftPlacement));

    const centerX = Math.round(placement.x + placement.width / 2);
    const centerY = Math.round(placement.y + placement.height / 2);
    positionLabel.textContent = `Garden position ${centerX}, ${centerY}`;
    zoomResetButton.textContent = `${Math.round(camera.zoom * 100)}%`;
  }

  function redrawAll() {
    redrawSaved();
    redrawDraft();
    updatePlacementFrame();
    updateActionState();
  }

  function resizeCanvases() {
    configureCanvas(savedCanvas, savedCtx);
    configureCanvas(draftCanvas, draftCtx);
    clampCamera();
    redrawAll();
  }

  function updateActionState() {
    const hasDraft = draftStrokes.length > 0 || Boolean(currentStroke?.points?.length);
    undoButton.disabled = draftStrokes.length === 0;
    redoButton.disabled = redoStrokes.length === 0;
    clearButton.disabled = !hasDraft;
    saveButton.disabled = draftStrokes.length === 0;
  }

  function setTool(tool) {
    if (!TOOL_DEFAULTS[tool]) return;
    activeTool = tool;
    if (tool !== 'hand') {
      activeWidth = TOOL_DEFAULTS[tool].width;
      sizeInput.value = String(activeWidth);
      sizeOutput.value = `${Math.round(activeWidth)} px`;
    }

    toolButtons.forEach(button => {
      const selected = button.dataset.gardenTool === tool;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });

    draftCanvas.dataset.tool = tool;
    boardHint.textContent = tool === 'hand'
      ? 'Drag to explore the Garden Wall. Switch back to a drawing tool to leave a mark.'
      : draftPlacement
        ? 'Your contribution is anchored here. Use Hand to explore without moving your drawing.'
        : 'Your first stroke anchors one contribution-sized area here.';
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

  function pointCount() {
    return draftStrokes.reduce((sum, stroke) => sum + (stroke.points?.length || 0), 0) + (currentStroke?.points?.length || 0);
  }

  function beginInteraction(event) {
    if (event.button !== undefined && event.button !== 0 && event.pointerType === 'mouse') return;
    event.preventDefault();
    draftCanvas.setPointerCapture?.(event.pointerId);

    if (activeTool === 'hand') {
      isPanning = true;
      panStart = { clientX: event.clientX, clientY: event.clientY, cameraX: camera.x, cameraY: camera.y };
      return;
    }

    if (draftStrokes.length >= MAX_STROKES || pointCount() >= MAX_POINTS) {
      setSaveStatus('This contribution has reached its drawing limit. You can undo, clear, or submit it.', 'error');
      return;
    }

    const worldPoint = screenToWorld(event.clientX, event.clientY);
    const placement = draftPlacement || currentPlacementPreview();
    if (!pointInsidePlacement(worldPoint, placement)) {
      setSaveStatus('Draw inside the outlined contribution area, or use Hand to move somewhere else.');
      return;
    }

    if (!draftPlacement) draftPlacement = placement;

    isDrawing = true;
    const normalized = normalizeToPlacement(worldPoint, draftPlacement);
    currentStroke = {
      tool: activeTool,
      color: activeColor,
      width: activeWidth,
      opacity: TOOL_DEFAULTS[activeTool].opacity,
      points: [{ ...normalized, pressure: event.pointerType === 'mouse' ? 0.5 : Math.min(1, Math.max(0.05, event.pressure || 0.5)) }]
    };
    setTool(activeTool);
    redrawAll();
  }

  function continueInteraction(event) {
    if (isPanning && panStart) {
      event.preventDefault();
      camera.x = panStart.cameraX - (event.clientX - panStart.clientX) / camera.zoom;
      camera.y = panStart.cameraY - (event.clientY - panStart.clientY) / camera.zoom;
      clampCamera();
      redrawAll();
      return;
    }

    if (!isDrawing || !currentStroke || !draftPlacement) return;
    event.preventDefault();
    if (pointCount() >= MAX_POINTS) {
      endInteraction(event);
      setSaveStatus('This contribution has reached its point limit. You can undo, clear, or submit it.', 'error');
      return;
    }

    const worldPoint = screenToWorld(event.clientX, event.clientY);
    if (!pointInsidePlacement(worldPoint, draftPlacement)) return;

    const normalized = normalizeToPlacement(worldPoint, draftPlacement);
    const point = {
      ...normalized,
      pressure: event.pointerType === 'mouse' ? 0.5 : Math.min(1, Math.max(0.05, event.pressure || 0.5))
    };
    const last = currentStroke.points[currentStroke.points.length - 1];
    const dx = point.x - last.x;
    const dy = point.y - last.y;
    if ((dx * dx + dy * dy) < 0.0000025) return;

    currentStroke.points.push(point);
    redrawDraft();
  }

  function endInteraction(event) {
    if (isPanning) {
      isPanning = false;
      panStart = null;
      return;
    }
    if (!isDrawing || !currentStroke) return;
    event.preventDefault();
    isDrawing = false;
    if (currentStroke.points.length) {
      draftStrokes.push(currentStroke);
      redoStrokes = [];
    }
    currentStroke = null;
    redrawAll();
  }

  function setZoom(nextZoom, anchorClientX = null, anchorClientY = null) {
    const oldZoom = camera.zoom;
    const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    if (Math.abs(zoom - oldZoom) < 0.001) return;

    const rect = draftCanvas.getBoundingClientRect();
    const sx = anchorClientX == null ? rect.width / 2 : anchorClientX - rect.left;
    const sy = anchorClientY == null ? rect.height / 2 : anchorClientY - rect.top;
    const worldAnchor = { x: camera.x + sx / oldZoom, y: camera.y + sy / oldZoom };

    camera.zoom = zoom;
    camera.x = worldAnchor.x - sx / zoom;
    camera.y = worldAnchor.y - sy / zoom;
    clampCamera();
    redrawAll();
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
    if (!draftStrokes.length || !draftPlacement) return;

    const name = nameInput.value.trim().slice(0, 60);
    const payload = {
      visitor_name: name || null,
      stroke_data: {
        format_version: 3,
        world: WORLD,
        placement: {
          x: Math.round(draftPlacement.x * 100) / 100,
          y: Math.round(draftPlacement.y * 100) / 100,
          width: draftPlacement.width,
          height: draftPlacement.height
        },
        strokes: draftStrokes
      }
    };

    const jsonSize = new Blob([JSON.stringify(payload.stroke_data)]).size;
    if (jsonSize > 900000) {
      setSaveStatus('This drawing is too complex to submit. Undo a few strokes or simplify it.', 'error');
      return;
    }

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

    if (!savedContributions.some(mark => mark.id === data.id)) savedContributions.push(data);
    draftStrokes = [];
    redoStrokes = [];
    currentStroke = null;
    draftPlacement = null;
    setSaveStatus(name ? `Your mark is in the garden, ${name}.` : 'Your mark is in the garden.', 'success');
    markCount.textContent = `${savedContributions.length} ${savedContributions.length === 1 ? 'mark' : 'marks'} in the garden`;
    redrawAll();
  }

  function startRealtime() {
    if (realtimeChannel) client.removeChannel(realtimeChannel);

    realtimeChannel = client
      .channel('garden-wall-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'garden_marks' }, payload => {
        const incoming = payload.new;
        if (!incoming || savedContributions.some(mark => mark.id === incoming.id)) return;
        savedContributions.push(incoming);
        markCount.textContent = `${savedContributions.length} ${savedContributions.length === 1 ? 'mark' : 'marks'} in the garden`;
        redrawSaved();
        setSaveStatus('A new mark just appeared in the garden.', 'live');
      })
      .subscribe(statusValue => {
        if (statusValue === 'CHANNEL_ERROR') console.warn('Garden Wall realtime channel could not connect.');
      });
  }

  toolButtons.forEach(button => button.addEventListener('click', () => setTool(button.dataset.gardenTool)));
  colorButtons.forEach(button => button.addEventListener('click', () => setColor(button.dataset.gardenColor)));
  customColor.addEventListener('input', () => setColor(customColor.value));

  sizeInput.addEventListener('input', () => {
    activeWidth = Number(sizeInput.value);
    sizeOutput.value = `${Math.round(activeWidth)} px`;
  });

  function undoStroke() {
    if (!draftStrokes.length) return;
    redoStrokes.push(draftStrokes.pop());
    if (!draftStrokes.length) draftPlacement = null;
    setSaveStatus('Undid your last stroke.');
    redrawAll();
  }

  function redoStroke() {
    if (!redoStrokes.length) return;
    const stroke = redoStrokes.pop();
    if (!draftPlacement) draftPlacement = currentPlacementPreview();
    draftStrokes.push(stroke);
    setSaveStatus('Restored your last undone stroke.');
    redrawAll();
  }

  undoButton.addEventListener('click', undoStroke);
  redoButton.addEventListener('click', redoStroke);

  clearButton.addEventListener('click', () => {
    if (draftStrokes.length) redoStrokes = [...draftStrokes].reverse();
    draftStrokes = [];
    currentStroke = null;
    draftPlacement = null;
    setSaveStatus('Your unsaved marks were cleared. You can move your contribution somewhere else now.');
    redrawAll();
  });

  saveButton.addEventListener('click', saveContribution);

  draftCanvas.addEventListener('pointerdown', event => {
    draftCanvas.focus({ preventScroll: true });
    beginInteraction(event);
  });
  draftCanvas.addEventListener('pointermove', continueInteraction);
  draftCanvas.addEventListener('pointerup', endInteraction);
  draftCanvas.addEventListener('pointercancel', endInteraction);
  draftCanvas.addEventListener('contextmenu', event => event.preventDefault());

  draftCanvas.addEventListener('keydown', event => {
    const commandKey = event.ctrlKey || event.metaKey;
    if (!commandKey) return;

    const key = event.key.toLowerCase();
    if (key === 'z' && event.shiftKey) {
      event.preventDefault();
      redoStroke();
      return;
    }

    if (key === 'y') {
      event.preventDefault();
      redoStroke();
      return;
    }

    if (key === 'z') {
      event.preventDefault();
      undoStroke();
    }
  });

  draftCanvas.addEventListener('wheel', event => {
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.1 : 0.9;
    setZoom(camera.zoom * factor, event.clientX, event.clientY);
  }, { passive: false });

  zoomInButton.addEventListener('click', () => setZoom(camera.zoom * 1.15));
  zoomOutButton.addEventListener('click', () => setZoom(camera.zoom / 1.15));
  zoomResetButton.addEventListener('click', () => setZoom(1));

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
