# Plate Girder Module - Architecture Diagram

## Complete System Architecture

```mermaid
graph TB
    subgraph "Frontend (React)"
        UI[PlateGirder.jsx<br/>EngineeringModule Component]
        Config[plateGirderConfig.js<br/>Input Configuration]
        OutputConfig[plateGirderOutputConfig.js<br/>Output Configuration]
        
        subgraph "Optimization UI (Future)"
            PSO_Dash[PSODashboard.jsx<br/>Main Dashboard]
            Parallel[ParallelCoordinates.jsx<br/>D3.js Visualization]
            PerfMap[PerformanceMap.jsx<br/>Weight vs UR Plot]
            CrossSec[CrossSectionPreview.jsx<br/>Section Drawing]
            DataProc[DataProcessor.js<br/>Frame Dropping & Throttling]
            WS_Hook[useWebSocket.js<br/>WebSocket Hook]
            DPI_Hook[useHighDPICanvas.js<br/>DPI-Aware Canvas]
        end
    end

    subgraph "Backend (Django)"
        subgraph "REST API Layer"
            ViewSet[FlexureMemberViewSet<br/>views.py]
            Registry[FlexureMemberRegistry<br/>Auto-Discovery]
        end
        
        subgraph "Plate Girder Service Layer"
            Service[PlateGirderService<br/>service.py]
            Adapter[Adapter<br/>adapter.py]
            PSO_Imports[pso_imports.py<br/>PSO Algorithms & Utilities]
        end
        
        subgraph "WebSocket Layer"
            WS_Consumer[PSOOptimizationConsumer<br/>consumers.py]
            WS_Routing[WebSocket Routing<br/>routing.py]
        end
        
        subgraph "Celery Tasks (Future)"
            Celery_Task[run_pso_optimization<br/>tasks.py]
        end
    end

    subgraph "Message Queue & Cache"
        Redis[(Redis<br/>Channel Layer & Celery Broker)]
    end

    subgraph "Celery Workers"
        Worker[Celery Worker<br/>PSO Optimization]
    end

    subgraph "osdag_core Library"
        PG_Class[PlateGirderWelded<br/>plate_girder.py]
        PSO_Global[GlobalBestPSO<br/>pso_optimizer.py]
        PSO_Intel[IntelligentPSO<br/>intelligent_pso.py]
        Section_Utils[Section Utilities<br/>calc_yj, classify_section, etc.]
        
        subgraph "Design Checks"
            Moment[moment.py]
            Shear[shear.py]
            WebBuck[web_buckling.py]
            WebCrip[web_crippling.py]
            Deflection[deflection.py]
            Welds[welds.py]
        end
    end

    %% Frontend to Backend - Normal Design Flow
    UI -->|POST /api/modules/flexure-member/plate-girder/design/| ViewSet
    Config --> UI
    OutputConfig --> UI
    
    %% REST API Flow
    ViewSet -->|Route by slug| Registry
    Registry -->|Get Service| Service
    Service -->|Validate & Process| Adapter
    Adapter -->|Create Module| PG_Class
    PG_Class -->|Design Checks| Moment
    PG_Class -->|Design Checks| Shear
    PG_Class -->|Design Checks| WebBuck
    PG_Class -->|Design Checks| WebCrip
    PG_Class -->|Design Checks| Deflection
    PG_Class -->|Design Checks| Welds
    Adapter -->|Format Output| Service
    Service -->|Return Results| ViewSet
    ViewSet -->|JSON Response| UI

    %% Optimization Flow - WebSocket
    PSO_Dash -->|Connect| WS_Hook
    WS_Hook -->|WebSocket| WS_Consumer
    WS_Consumer -->|Trigger Task| Celery_Task
    Celery_Task -->|Queue| Redis
    Redis -->|Consume| Worker
    Worker -->|Import| PSO_Imports
    PSO_Imports -->|Use| PSO_Global
    PSO_Imports -->|Use| PSO_Intel
    PSO_Imports -->|Use| Section_Utils
    Worker -->|Call| PG_Class
    PG_Class -->|optimized_method| PSO_Global
    PG_Class -->|optimized_method| PSO_Intel
    PG_Class -->|Design Checks| Moment
    PG_Class -->|Design Checks| Shear
    PG_Class -->|Design Checks| WebBuck
    PG_Class -->|Design Checks| WebCrip
    PG_Class -->|Design Checks| Deflection
    
    %% Progress Updates Flow
    Worker -->|Progress Callback| Redis
    Redis -->|Channel Layer| WS_Consumer
    WS_Consumer -->|WebSocket Message| WS_Hook
    WS_Hook -->|Update State| PSO_Dash
    PSO_Dash -->|Process Data| DataProc
    DataProc -->|Render| Parallel
    DataProc -->|Render| PerfMap
    DataProc -->|Render| CrossSec
    Parallel -->|DPI Scaling| DPI_Hook
    PerfMap -->|DPI Scaling| DPI_Hook
    CrossSec -->|DPI Scaling| DPI_Hook

    %% Styling
    classDef frontend fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef backend fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef osdag fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef queue fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef future fill:#fafafa,stroke:#616161,stroke-width:2px,stroke-dasharray: 5 5

    class UI,Config,OutputConfig frontend
    class PSO_Dash,Parallel,PerfMap,CrossSec,DataProc,WS_Hook,DPI_Hook future
    class ViewSet,Registry,Service,Adapter,PSO_Imports,WS_Consumer,WS_Routing backend
    class PG_Class,PSO_Global,PSO_Intel,Section_Utils,Moment,Shear,WebBuck,WebCrip,Deflection,Welds osdag
    class Redis,Worker,Celery_Task queue
```

## Detailed Flow Diagrams

### Flow 1: Normal (Non-Optimized) Design - REST API

```mermaid
sequenceDiagram
    participant User
    participant Frontend as PlateGirder.jsx
    participant API as REST API<br/>/design/
    participant Service as PlateGirderService
    participant Adapter as Adapter
    participant Core as PlateGirderWelded<br/>(osdag_core)
    participant Checks as Design Checks<br/>(moment, shear, etc.)

    User->>Frontend: Enter inputs & click "Design"
    Frontend->>API: POST /api/modules/flexure-member/plate-girder/design/<br/>{inputs: {...}}
    API->>Service: calculate(inputs)
    Service->>Adapter: validate_input(inputs)
    Adapter-->>Service: Validation OK
    Service->>Adapter: generate_output(inputs)
    Adapter->>Core: create_from_input(inputs)
    Core->>Core: set_input_values(design_dict)
    Core->>Core: design_check() [Normal design]
    Core->>Checks: moment.check()
    Core->>Checks: shear.check()
    Core->>Checks: web_buckling.check()
    Core->>Checks: deflection.check()
    Checks-->>Core: Results
    Core-->>Adapter: output_values()
    Adapter-->>Service: formatted_output, logs
    Service-->>API: {data: {...}, logs: [...], success: true}
    API-->>Frontend: JSON Response
    Frontend-->>User: Display Results
```

### Flow 2: Optimized Design - PSO with WebSocket

```mermaid
sequenceDiagram
    participant User
    participant Dashboard as PSODashboard.jsx
    participant WS_Hook as useWebSocket.js
    participant WS as WebSocket Consumer
    participant Task as Celery Task<br/>run_pso_optimization
    participant Worker as Celery Worker
    participant Core as PlateGirderWelded<br/>(osdag_core)
    participant PSO as PSO Optimizer<br/>(GlobalBestPSO/IntelligentPSO)
    participant Redis as Redis<br/>Channel Layer
    participant DataProc as DataProcessor.js

    User->>Dashboard: Select "Optimized" & click "Design"
    Dashboard->>WS_Hook: Connect to WebSocket
    WS_Hook->>WS: WebSocket Connection
    WS-->>WS_Hook: Connection Established
    Dashboard->>WS_Hook: Send start_optimization message
    WS_Hook->>WS: {type: 'start_optimization', data: {...}}
    WS->>Task: Trigger run_pso_optimization.delay()
    Task->>Redis: Queue Task
    Redis->>Worker: Consume Task
    Worker->>Core: optimized_method(design_dict, viz_callback)
    Core->>PSO: Initialize PSO (50 particles, 100 iterations)
    loop For each iteration
        loop For each particle
            PSO->>Core: objective_function(particle)
            Core->>Core: design_check_optimized_version()
            Core->>Core: evaluate_particle_cost()
            Core-->>PSO: cost (mass + penalties)
        end
        PSO->>Core: progress_callback(iteration, particle_idx, position, cost)
        Core->>Redis: Send update via Channel Layer
        Redis->>WS: pso.update message
        WS->>WS_Hook: WebSocket message
        WS_Hook->>Dashboard: onMessage callback
        Dashboard->>DataProc: Process data (frame dropping, throttling)
        DataProc->>Dashboard: Update visualizations
        Dashboard-->>User: Real-time updates
    end
    Worker->>Core: Get best solution
    Core-->>Worker: Best particle & cost
    Worker->>Redis: Send pso.complete message
    Redis->>WS: Completion message
    WS->>WS_Hook: WebSocket message
    WS_Hook->>Dashboard: Optimization complete
    Dashboard-->>User: Final optimized design
```

### Flow 3: Component Interaction - Optimization Dashboard

```mermaid
graph LR
    subgraph "PSODashboard.jsx"
        Main[Main Component<br/>State Management]
    end
    
    subgraph "Hooks"
        WS[useWebSocket.js<br/>Connection & Messages]
        DPI[useHighDPICanvas.js<br/>DPI Scaling]
    end
    
    subgraph "Data Processing"
        Proc[DataProcessor.js<br/>Frame Dropping<br/>Throttling<br/>Memory Management]
    end
    
    subgraph "Visualizations"
        PC[ParallelCoordinates.jsx<br/>D3.js Plot]
        PM[PerformanceMap.jsx<br/>Weight vs UR]
        CS[CrossSectionPreview.jsx<br/>Section Drawing]
    end
    
    Main -->|Connect| WS
    WS -->|Messages| Main
    Main -->|Raw Data| Proc
    Proc -->|Processed Data| PC
    Proc -->|Processed Data| PM
    Proc -->|Processed Data| CS
    PC -->|Get Canvas| DPI
    PM -->|Get Canvas| DPI
    CS -->|Get Canvas| DPI
    DPI -->|Scaled Context| PC
    DPI -->|Scaled Context| PM
    DPI -->|Scaled Context| CS
```

### Flow 4: Backend Service Architecture

```mermaid
graph TB
    subgraph "API Layer"
        REST[REST Endpoints<br/>/design/<br/>/options/<br/>/cad/]
        WS_Endpoint[WebSocket Endpoint<br/>/ws/optimize/plate-girder/]
    end
    
    subgraph "Service Layer"
        Service[PlateGirderService<br/>calculate()<br/>get_options()<br/>get_cad_model()]
    end
    
    subgraph "Adapter Layer"
        Adapter[Adapter<br/>validate_input()<br/>generate_output()<br/>create_design_dictionary()<br/>create_cad_model()]
    end
    
    subgraph "Task Layer (Future)"
        Task[Celery Task<br/>run_pso_optimization()<br/>Throttling<br/>Heartbeat<br/>Error Handling]
    end
    
    subgraph "osdag_core Integration"
        PG[PlateGirderWelded<br/>set_input_values()<br/>design_check()<br/>output_values()<br/>optimized_method()]
        PSO_Imports[pso_imports.py<br/>GlobalBestPSO<br/>IntelligentPSO<br/>Section Utils]
    end
    
    REST --> Service
    WS_Endpoint --> Task
    Service --> Adapter
    Task --> PSO_Imports
    Task --> PG
    Adapter --> PG
    PSO_Imports --> PG
```

## Data Flow: Normal vs Optimized

### Normal Design Data Flow

```mermaid
flowchart LR
    A[Frontend Inputs] -->|HTTP POST| B[Backend Service]
    B -->|Validate| C[Adapter]
    C -->|Create Design Dict| D[PlateGirderWelded]
    D -->|Run Design Checks| E[Design Results]
    E -->|Format Output| F[Adapter]
    F -->|Return JSON| G[Frontend Display]
```

### Optimized Design Data Flow

```mermaid
flowchart LR
    A[Frontend Inputs] -->|WebSocket| B[WebSocket Consumer]
    B -->|Queue Task| C[Celery Task]
    C -->|Initialize PSO| D[PSO Optimizer]
    D -->|Iterate Particles| E[PlateGirderWelded]
    E -->|Evaluate Cost| F[Design Checks]
    F -->|Progress Callback| G[Channel Layer]
    G -->|WebSocket Update| H[Frontend Dashboard]
    H -->|Process Data| I[Visualizations]
    D -->|Best Solution| J[Final Results]
    J -->|WebSocket Complete| H
```

## Technology Stack

```mermaid
graph TB
    subgraph "Frontend"
        React[React.js]
        D3[D3.js]
        WS_Native[WebSocket API]
    end
    
    subgraph "Backend"
        Django[Django REST Framework]
        Channels[Django Channels]
        Celery[Celery]
    end
    
    subgraph "Infrastructure"
        Redis_Infra[Redis<br/>Channel Layer & Broker]
        ASGI[ASGI Server<br/>Daphne/Uvicorn]
    end
    
    subgraph "Core Library"
        Osdag[osdag_core<br/>Engineering Calculations]
    end
    
    React --> Django
    React --> WS_Native
    WS_Native --> Channels
    Channels --> Redis_Infra
    Django --> Celery
    Celery --> Redis_Infra
    Celery --> Osdag
    Django --> Osdag
    Channels --> ASGI
```

## Status Legend

- ✅ **Green/Completed**: Implemented and working
- 🟡 **Yellow/In Progress**: Partially implemented
- ❌ **Red/Not Started**: Not yet implemented
- ⚪ **Gray/Future**: Planned but not started

## Current Implementation Status

- ✅ **Phase 1**: Normal REST API Design - COMPLETE
- ✅ **Phase 2**: PSO Algorithms Import - COMPLETE
- ❌ **Phase 3**: Design Checks Import - NOT STARTED
- ❌ **Phase 4**: Plate Girder Core Optimization - NOT STARTED
- ❌ **Phase 5**: Celery Task - NOT STARTED
- ❌ **Phase 6**: Frontend WebSocket Infrastructure - NOT STARTED
- ❌ **Phase 7**: Frontend Visualization Components - NOT STARTED
- ❌ **Phase 8**: Integration - NOT STARTED
- ❌ **Phase 9**: Testing - NOT STARTED

