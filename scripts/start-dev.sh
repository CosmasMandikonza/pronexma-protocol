#!/bin/bash
# =============================================================================
# PRONEXMA PROTOCOL - DEVELOPMENT STARTUP SCRIPT
# =============================================================================
# This script starts the Pronexma development environment.
# It handles both Docker-based and local development setups.
#
# Usage:
#   ./scripts/start-dev.sh         # Auto-detect mode
#   ./scripts/start-dev.sh docker  # Force Docker mode
#   ./scripts/start-dev.sh local   # Force local mode (npm)
#   ./scripts/start-dev.sh demo    # Force demo mode (no RPC)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Default configuration
RPC_URL="${RPC_URL:-http://localhost:8080}"
BACKEND_PORT="${PORT:-4000}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

check_rpc_health() {
    local url="$1/status"
    log_info "Checking RPC health at $url..."
    
    if curl -sf --max-time 5 "$url" > /dev/null 2>&1; then
        log_success "RPC is healthy and responding"
        return 0
    else
        log_warn "RPC is not responding"
        return 1
    fi
}

# =============================================================================
# ENVIRONMENT SETUP
# =============================================================================

setup_env() {
    log_info "Setting up environment..."
    
    # Check for .env file
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        if [ -f "$PROJECT_ROOT/.env.example" ]; then
            log_warn ".env file not found, copying from .env.example"
            cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
        else
            log_error ".env.example not found!"
            exit 1
        fi
    fi
    
    # Source the .env file
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
    
    log_success "Environment loaded"
}

# =============================================================================
# DOCKER MODE
# =============================================================================

start_docker() {
    log_info "Starting Pronexma in Docker mode..."
    
    if ! check_command docker; then
        log_error "Docker is not installed. Please install Docker or use local mode."
        exit 1
    fi
    
    if ! check_command docker-compose && ! docker compose version &> /dev/null; then
        log_error "Docker Compose is not installed."
        exit 1
    fi
    
    cd "$PROJECT_ROOT"
    
    # Determine docker compose command
    if docker compose version &> /dev/null 2>&1; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
    
    log_info "Building and starting containers..."
    $COMPOSE_CMD up --build -d
    
    log_info "Waiting for services to be ready..."
    sleep 10
    
    # Check RPC health
    if check_rpc_health "http://localhost:8080"; then
        log_success "Full stack is running with Qubic RPC"
    else
        log_warn "RPC not available - backend will run in DEMO mode"
    fi
    
    echo ""
    log_success "═══════════════════════════════════════════════════════════"
    log_success " PRONEXMA PROTOCOL IS RUNNING"
    log_success "═══════════════════════════════════════════════════════════"
    echo ""
    echo -e "  Frontend:  ${GREEN}http://localhost:${FRONTEND_PORT}${NC}"
    echo -e "  Backend:   ${GREEN}http://localhost:${BACKEND_PORT}${NC}"
    echo -e "  API Docs:  ${GREEN}http://localhost:${BACKEND_PORT}/api/health${NC}"
    echo ""
    echo -e "  View logs: ${BLUE}docker compose logs -f${NC}"
    echo -e "  Stop:      ${BLUE}docker compose down${NC}"
    echo ""
}

# =============================================================================
# LOCAL MODE (NPM)
# =============================================================================

start_local() {
    log_info "Starting Pronexma in local mode..."
    
    if ! check_command node; then
        log_error "Node.js is not installed. Please install Node.js 18+."
        exit 1
    fi
    
    if ! check_command npm; then
        log_error "npm is not installed."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        log_error "Node.js version 18+ is required. Current: $(node -v)"
        exit 1
    fi
    
    # Check RPC availability and set demo mode if needed
    if check_rpc_health "$RPC_URL"; then
        export DEMO_MODE=false
        log_success "RPC available - running in live mode"
    else
        export DEMO_MODE=true
        log_warn "RPC unreachable – running Pronexma in DEMO_OFFCHAIN mode (off-chain simulation)."
    fi
    
    # Install backend dependencies
    log_info "Installing backend dependencies..."
    cd "$PROJECT_ROOT/backend"
    npm install
    
    # Generate Prisma client
    log_info "Generating Prisma client..."
    npx prisma generate
    npx prisma db push
    
    # Install frontend dependencies
    log_info "Installing frontend dependencies..."
    cd "$PROJECT_ROOT/frontend"
    npm install
    
    # Start services
    cd "$PROJECT_ROOT"
    
    log_info "Starting backend..."
    (cd backend && npm run dev) &
    BACKEND_PID=$!
    
    sleep 3
    
    log_info "Starting frontend..."
    (cd frontend && npm run dev) &
    FRONTEND_PID=$!
    
    echo ""
    log_success "═══════════════════════════════════════════════════════════"
    log_success " PRONEXMA PROTOCOL IS RUNNING"
    log_success "═══════════════════════════════════════════════════════════"
    echo ""
    echo -e "  Frontend:  ${GREEN}http://localhost:${FRONTEND_PORT}${NC}"
    echo -e "  Backend:   ${GREEN}http://localhost:${BACKEND_PORT}${NC}"
    
    if [ "$DEMO_MODE" = "true" ]; then
        echo ""
        echo -e "  ${YELLOW}⚠ Running in DEMO MODE - on-chain calls are simulated${NC}"
    fi
    
    echo ""
    echo -e "  Press ${RED}Ctrl+C${NC} to stop all services"
    echo ""
    
    # Trap Ctrl+C to cleanup
    trap cleanup SIGINT SIGTERM
    
    # Wait for processes
    wait
}

cleanup() {
    log_info "Shutting down services..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    log_success "Services stopped"
    exit 0
}

# =============================================================================
# DEMO MODE
# =============================================================================

start_demo() {
    log_info "Starting Pronexma in DEMO mode (no Qubic infrastructure)..."
    
    export DEMO_MODE=true
    export NETWORK_MODE=DEMO_OFFCHAIN
    
    start_local
}

# =============================================================================
# MAIN
# =============================================================================

main() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║          PRONEXMA PROTOCOL - DEVELOPMENT SERVER           ║${NC}"
    echo -e "${BLUE}║     Milestone-Based Settlement Layer for Qubic/Nostromo   ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    setup_env
    
    MODE="${1:-auto}"
    
    case "$MODE" in
        docker)
            start_docker
            ;;
        local)
            start_local
            ;;
        demo)
            start_demo
            ;;
        auto)
            # Auto-detect best mode
            if check_command docker && docker info &> /dev/null 2>&1; then
                log_info "Docker detected, checking for running containers..."
                if docker ps --format '{{.Names}}' | grep -q "pronexma"; then
                    log_info "Pronexma containers already running"
                    start_docker
                else
                    log_info "Starting in local mode (use './scripts/start-dev.sh docker' for Docker)"
                    start_local
                fi
            else
                start_local
            fi
            ;;
        *)
            echo "Usage: $0 [docker|local|demo|auto]"
            echo ""
            echo "  docker  - Start with Docker Compose (includes Qubic node)"
            echo "  local   - Start with npm (Node.js required)"
            echo "  demo    - Start in demo mode (no Qubic infrastructure)"
            echo "  auto    - Auto-detect best mode (default)"
            exit 1
            ;;
    esac
}

main "$@"
