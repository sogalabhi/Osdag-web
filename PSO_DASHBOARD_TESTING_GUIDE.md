# PSO Dashboard Testing Guide

## Overview

This guide covers testing the Plate Girder PSO Dashboard with replay controls and save plot functionality. The implementation provides desktop-level parity with real-time WebSocket updates, frame-by-frame replay, and plot export capabilities.

---

## Prerequisites

### 1. System Requirements

- **Redis Server**: For Celery message broker
- **Python 3.8+**: Backend environment
- **Node.js 16+**: Frontend environment
- **FreeCAD**: For CAD model generation (optional for testing)

### 2. Environment Setup

#### Install Redis
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server

# macOS (with Homebrew)
brew install redis
brew services start redis

# Windows (with WSL or Docker)
# Use Docker: docker run -d -p 6379:6379 redis:alpine
```

#### Verify Redis
```bash
redis-cli ping  # Should return "PONG"
```

---

## Backend Setup

### 1. Install Dependencies
```bash
cd /home/sogalabhi/Osdag-web
pip install -r requirements.txt
```

### 2. Database Setup
```bash
cd backend
python manage.py migrate
```

### 3. Start Backend Services

#### Terminal 1: Django ASGI Server (Uvicorn)
```bash
cd backend
uvicorn config.asgi:application --host 0.0.0.0 --port 8000 --reload
```

**⚠️ IMPORTANT**: Use **uvicorn** (not `python manage.py runserver`) for WebSocket support. Django's development server doesn't properly handle ASGI/WebSockets.

**Note**: Docker deployment also uses uvicorn for production consistency.

#### Terminal 2: Celery Worker
```bash
cd backend
celery -A config worker --loglevel=info --concurrency=2
```

#### Terminal 3: Celery Beat (Optional)
```bash
cd backend
celery -A config beat --loglevel=info
```

---

## Frontend Setup

### 1. Install Dependencies
```bash
cd osdagclient
npm install
```

### 2. Start Development Server
```bash
npm start
# or
npm run dev
```

---

## Testing Procedure

### Phase 1: Environment Verification

#### 1.1 Check Service Health
```bash
# Backend API
curl http://localhost:8000/api/health/

# Frontend
curl http://localhost:3000  # Should return HTML

# Redis
redis-cli ping  # Should return PONG
```

#### 1.2 Verify WebSocket Connection
```javascript
// In browser console (localhost:3000)
const ws = new WebSocket('ws://localhost:8000/ws/optimize/plate-girder/');
ws.onopen = () => console.log('WebSocket connected');
ws.onmessage = (e) => console.log('Message:', e.data);
```

#### 1.3 Verify Responsive Layout
- Open PSO Dashboard on different screen sizes
- **Desktop**: Should show all panels clearly (45vh height each)
- **Header**: Should truncate text on smaller screens, hide secondary info
- **Footer**: Should be scrollable if replay controls overflow
- **Plots**: Should resize automatically within their containers

---

### Phase 2: Basic PSO Functionality

#### 2.1 Navigate to Plate Girder Module
1. Open browser to `http://localhost:3000`
2. Login or use guest mode
3. Navigate to **Design → Flexural Member → Plate Girder**
4. Select **Design Type: Optimized**

#### 2.2 Configure Optimization Inputs
- **Material**: E 250 (Fe 410 W)A
- **Span Length**: 20000 mm
- **Bending Moment**: 4275 kNm
- **Shear Force**: 877.5 kN
- **Support Type**: Major Laterally Supported
- **Web Philosophy**: Thick Web without ITS

#### 2.3 Start Optimization
1. Click **"Design"** button
2. **PSO Dashboard should appear** with:
   - Header: "PSO OPTIMIZATION SPACE"
   - 3-panel layout: Parallel Coordinates (top), Performance Map (bottom-left), Cross-Section (bottom-right)
   - Footer: "Optimizing..." status

#### 2.4 Monitor Real-Time Updates
- **Parallel Coordinates**: Lines should appear and move as particles converge
- **Performance Map**: Scatter points accumulate, red line at UR=1.0
- **Cross-Section**: Shows best feasible solution (when available)
- **Header**: Iteration counter updates
- **Footer**: Shows live updates via WebSocket

---

### Phase 3: Replay Controls Testing

#### 3.1 Wait for Completion
- Wait until optimization completes (100 iterations, ~30-60 seconds)
- Status changes to "✓ Optimization Complete"
- **Replay controls appear in footer**

#### 3.2 Test Step Controls
```
Expected Layout: [⏮] [◀] [▶] [▶] [⏭] [========slider========] Frame: X/Y [Loop: Once ▼]
```

**Test each button:**
1. **⏮ First**: Should go to frame 1
2. **◀ Previous**: Should decrement frame (disabled at frame 1)
3. **▶ Play**: Should start playback animation (changes to ⏸)
4. **▶ Next**: Should increment frame (disabled at last frame)
5. **⏭ Last**: Should go to final frame

#### 3.3 Test Frame Slider
- Drag slider left/right
- Frame counter should update: "Frame: X/Y"
- Visualization should update instantly
- Slider should show visual progress

#### 3.4 Test Playback Modes
- **Once Mode**: Play should stop at last frame
- **Loop Mode**: Play should restart from first frame
- Playback speed: **5 FPS (200ms per frame)** - matches desktop

#### 3.5 Test Frame Navigation
- Each frame should show:
  - Progressively more history points (fade effect)
  - Current swarm at that iteration
  - Global best up to that point
  - Correct iteration number in header

---

### Phase 4: Save Plot Functionality

#### 4.1 Test Save Button
1. Click **"💾 Save Plot"** button
2. Should trigger downloads:
   - `parallel_coordinates.png` (1200x400)
   - `performance_map.png` (1200x400)

#### 4.2 Verify Downloads
- Check browser downloads folder
- PNG files should be high quality
- Parallel coordinates show variable convergence
- Performance map shows weight vs UR scatter plot

---

### Phase 5: Advanced Scenarios

#### 5.1 Test Multiple Optimizations
1. Close dashboard
2. Change input parameters
3. Run another optimization
4. Verify replay controls work for different scenarios

#### 5.2 Test Error Handling
1. Kill Celery worker during optimization
2. Verify WebSocket error handling
3. Test with invalid inputs

#### 5.3 Test Browser Refresh
1. Start optimization
2. Refresh browser during optimization
3. Verify state recovery (if implemented)

---

## Expected Behavior Matrix

| Feature | Live Mode | Replay Mode | Expected Behavior |
|---------|-----------|-------------|-------------------|
| **Parallel Coordinates** | ✅ Updates in real-time | ✅ Shows frame data | Lines move/converge |
| **Performance Map** | ✅ Scatter accumulates | ✅ Shows frame data | Red line at UR=1.0 |
| **Cross-Section** | ✅ Shows best feasible | ✅ Shows frame best | Dimensions labeled |
| **Header Counter** | ✅ Live iteration | ✅ Frame iteration | "ITER: X" |
| **Footer Status** | "Optimizing..." | "✓ Optimization Complete" | Status changes |
| **Replay Controls** | ❌ Hidden | ✅ Visible | Step/play/slider |
| **Save Plot** | ✅ Works | ✅ Works | Downloads PNGs |

---

## Troubleshooting

### Issue: WebSocket Not Connecting
```bash
# Check Django channels
cd backend
python manage.py shell -c "from channels.layers import get_channel_layer; print('Channel layer:', get_channel_layer())"

# Check Redis connection
redis-cli ping

# Check Celery worker
celery -A config inspect active
```

### Issue: No Real-Time Updates
```bash
# Check Celery logs
tail -f /var/log/celery/worker.log

# Check Django logs
tail -f backend/logs/*.log
```

### Issue: Replay Controls Not Appearing
- Ensure optimization actually completed (100 iterations)
- Check browser console for JavaScript errors
- Verify `frameCache.length > 0` in React DevTools

### Issue: Save Plot Not Working
```javascript
// Check browser console
// Should see: "Found X plots to export"
// Should see: "Saved: parallel_coordinates.png"
```

### Issue: Slow Performance
- Check Redis memory usage: `redis-cli info memory`
- Check Celery worker count: `celery -A config inspect stats`
- Reduce optimization iterations in code for testing

---

## Performance Benchmarks

### Expected Timings
- **WebSocket Connection**: < 100ms
- **First Update**: < 2 seconds after start
- **Update Frequency**: 10 FPS (100ms intervals)
- **Optimization Duration**: 30-60 seconds (100 iterations)
- **Frame Cache Build**: < 500ms
- **Replay Playback**: 5 FPS (200ms intervals)
- **Save Plot**: < 2 seconds per plot

### Memory Usage
- **Redis**: < 50MB for typical optimization
- **Browser**: < 200MB during optimization
- **Frame Cache**: ~10-20MB for 100 iterations

---

## Success Criteria

✅ **All tests pass:**
- [ ] WebSocket connects successfully
- [ ] PSO dashboard appears on optimization start
- [ ] **Layout is responsive and fits desktop screens** (45vh panels, scrollable footer)
- [ ] Real-time updates visible (moving lines/points)
- [ ] Optimization completes with "✓ Optimization Complete"
- [ ] Replay controls appear in footer (scrollable if needed)
- [ ] All step buttons work (First/Prev/Play/Next/Last)
- [ ] Frame slider updates visualization instantly
- [ ] Playback works in both "Once" and "Loop" modes
- [ ] Save Plot downloads PNG files
- [ ] No console errors during testing
- [ ] Performance meets benchmarks

---

## Quick Test Script

```bash
#!/bin/bash
# Quick verification script

echo "🔍 PSO Dashboard Quick Test"

# Check services
echo "📡 Checking services..."
curl -s http://localhost:8000/api/health/ && echo "✅ Backend OK" || echo "❌ Backend FAIL"
curl -s http://localhost:3000 > /dev/null && echo "✅ Frontend OK" || echo "❌ Frontend FAIL"
redis-cli ping > /dev/null && echo "✅ Redis OK" || echo "❌ Redis FAIL"

# Check Celery
echo "⚙️ Checking Celery..."
celery -A config inspect ping > /dev/null 2>&1 && echo "✅ Celery OK" || echo "❌ Celery FAIL"

echo "🎯 Ready for manual testing!"
echo "1. Open http://localhost:3000"
echo "2. Navigate to Plate Girder → Optimized design"
echo "3. Click Design and watch real-time updates"
echo "4. Wait for completion and test replay controls"
echo "5. Test Save Plot functionality"
```

---

## Support

For issues:
1. Check browser console (F12 → Console)
2. Check backend logs: `tail -f backend/logs/*.log`
3. Check Celery logs: `tail -f /var/log/celery/worker.log`
4. Verify Redis: `redis-cli monitor`

---

*Last Updated: January 21, 2025*
