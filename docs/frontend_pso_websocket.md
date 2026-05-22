# Plate Girder PSO – Frontend Data Contract (WebSocket)

This doc explains how the frontend should connect to the Plate Girder optimization WebSocket, what messages to expect, and how to parse them. It intentionally avoids UI/graph specifics and focuses only on the data stream and lifecycle.

## Endpoint
- URL (when served via Django Channels): `wss://<host>/ws/optimize/plate-girder/`
- Local dev (typical): `ws://localhost:8000/ws/optimize/plate-girder/`

## Connect
1) Open a WebSocket to `/ws/optimize/plate-girder/`.
2) On open, optionally send a heartbeat/ping if your client needs it (server already emits heartbeats).
3) To start an optimization, send a `start_optimization` message with input payload.

Example request to start:
```json
{
  "type": "start_optimization",
  "input_data": { "...plate girder input fields..." }
}
```
- `input_data` is the same shape as the backend expects for optimized plate girder design. The backend adapter handles bounds/symmetry flags/etc.

## Messages from server
All server messages carry a `type` and a `data` object. A monotonically increasing `sequence` is included for ordering; drop out-of-order frames if needed.

### Progress (graph-friendly)
`type: "pso_update"`
```json
{
  "type": "pso_update",
  "data": {
    "sequence": 12,
    "iteration": 5,
    "particle_index": 7,
    "depth": 1800.0,
    "ur": 0.82,
    "weight_kg": 950.3,
    "variables": [16.0, 12.0, 450.0, 1800.0],
    "variable_names": ["tf", "tw", "bf", "D"],
    "bounds": { "lb": [12, 8, 350, 1500], "ub": [28, 16, 600, 2200] }
  }
}
```
- Use for charts/indicators. Throttled to ~10 fps.

### Heartbeat (liveness)
`type: "pso_heartbeat"`
```json
{
  "type": "pso_heartbeat",
  "data": {
    "sequence": 24,
    "status": "alive",
    "timestamp": 1736222222.123
  }
}
```
- Emitted ~every 2s so clients can detect stale connections.

### Completion (final result)
`type: "pso_complete"`
```json
{
  "type": "pso_complete",
  "data": {
    "sequence": 101,
    "result": {
      "design": { "...parsed output_values..." },
      "raw": [ "...raw output_values..." ],
      "pso_result": null
    }
  }
}
```
- Use this to render final optimized design and stop spinners.

### Error (terminal)
`type: "pso_error"`
```json
{
  "type": "pso_error",
  "data": {
    "sequence": 33,
    "message": "Exception message",
    "traceback": "full traceback string"
  }
}
```
- Treat as terminal; show the error and stop polling for progress.

## Client lifecycle recommendation
- On open, wait for heartbeats or first `pso_update` to confirm liveness.
- When user clicks “Run optimization”, send `start_optimization` as above.
- While running:
  - Consume `pso_update` for progress visuals.
  - Monitor `pso_heartbeat` to detect stalled runs (e.g., no heartbeat for >6s).
- On `pso_complete`:
  - Stop showing in-flight status.
  - Render final design data.
- On `pso_error`:
  - Surface the error to the user; allow retry.
- Handle disconnects: attempt reconnect, and if needed, let the user restart the run.

## Ordering & de-dup
- Use `sequence` to order messages. If you receive out-of-order frames, discard older ones.
- Messages are already throttled; no need to aggressively de-bounce client-side.

## Serialization notes
- Payloads are sanitized to plain JSON-friendly types (no NumPy scalars). Standard JSON parse is sufficient.

## Minimal client pseudo-flow
```typescript
const ws = new WebSocket("ws://localhost:8000/ws/optimize/plate-girder/");

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: "start_optimization",
    input_data: /* your form data */
  }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  switch (msg.type) {
    case "pso_update":
      // update charts, progress, etc.
      break;
    case "pso_heartbeat":
      // update liveness indicator
      break;
    case "pso_complete":
      // show final design; stop loading
      break;
    case "pso_error":
      // show error; stop loading
      break;
  }
};

ws.onclose = () => {
  // notify user or attempt reconnect
};
```

