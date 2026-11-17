"""Deposit Keeper API (docs/API.md, frozen D-005). Run from the repo root:
    uv run --project server uvicorn server.app.main:app --reload
"""
from __future__ import annotations

import asyncio
import hmac
import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, File, Header, Request, UploadFile
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import MAX_PHOTO_BYTES, PERSONAS, Settings, load_settings
from .errors import ApiError, bad_request, not_allowed
from .leases import Service
from .quota import DailyQuota
from .store import Store

log = logging.getLogger("dk")


def create_app(settings: Settings | None = None, chain=None, analyze_fn=None, price_table=None) -> FastAPI:
    s = settings or load_settings()
    if chain is None:
        from .chain import Chain
        chain = Chain(s)
    store = Store(s.data_dir)
    svc = Service(store, chain, s, analyze_fn=analyze_fn, price_table=price_table)
    quota = DailyQuota(s.data_dir, {"leases": s.max_leases_per_day, "reports": s.max_reports_per_day})

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        task = None
        if s.autosend:
            async def loop():
                while True:
                    await asyncio.sleep(60)
                    try:
                        await asyncio.to_thread(svc.autosend_due)
                    except Exception:
                        log.exception("auto-send loop error")
            task = asyncio.create_task(loop())
        yield
        if task:
            task.cancel()

    app = FastAPI(title="Deposit Keeper API", lifespan=lifespan)
    app.state.svc = svc
    app.add_middleware(CORSMiddleware, allow_origins=s.cors_origins, allow_methods=["*"],
                       allow_headers=["Content-Type", "X-User-Id", "X-Demo-Token"])
    app.mount("/files", StaticFiles(directory=store.files_dir), name="files")

    @app.middleware("http")
    async def body_limit(request: Request, call_next):
        # Reject oversized bodies before multipart parsing spools them to disk.
        size = request.headers.get("content-length")
        if request.method == "PUT" and size is None:
            return err(411, "bad_request", "Photo upload needs a Content-Length header")
        if size is not None and (not size.isdigit() or int(size) > MAX_PHOTO_BYTES + 1024 * 1024):
            return err(413, "bad_request", "Request body must be under 25 MB")
        return await call_next(request)

    def err(status: int, code: str, message: str) -> JSONResponse:
        return JSONResponse(status_code=status, content={"error": {"code": code, "message": message}})

    @app.exception_handler(ApiError)
    async def _api_error(_: Request, e: ApiError):
        return err(e.status, e.code, e.message)

    @app.exception_handler(RequestValidationError)
    async def _validation(_: Request, e: RequestValidationError):
        first = e.errors()[0] if e.errors() else {}
        where = ".".join(str(p) for p in first.get("loc", []) if p != "body")
        return err(400, "bad_request", f"{where}: {first.get('msg', 'invalid request')}".strip(": "))

    @app.exception_handler(StarletteHTTPException)
    async def _http(_: Request, e: StarletteHTTPException):
        code = {404: "not_found", 405: "bad_request"}.get(e.status_code, "bad_request")
        return err(e.status_code, code, str(e.detail))

    @app.exception_handler(Exception)
    async def _crash(_: Request, e: Exception):
        log.exception("unhandled error")
        return err(500, "internal", "Something went wrong on the server")

    def user(x_user_id: str | None = Header(default=None), x_demo_token: str | None = Header(default=None)) -> str:
        # Every write goes through here. The token keeps strangers from spending the hosted testnet wallets.
        if s.demo_token and not hmac.compare_digest((x_demo_token or "").encode(), s.demo_token.encode()):
            raise ApiError(401, "unauthorized", "Missing or wrong X-Demo-Token")
        if x_user_id not in PERSONAS:
            raise not_allowed("Set X-User-Id to tenant_demo or landlord_demo")
        return x_user_id

    async def json_body(request: Request) -> dict:
        raw = await request.body()
        if not raw.strip():
            return {}
        try:
            body = await request.json()
        except ValueError:
            raise bad_request("Body must be JSON") from None
        if not isinstance(body, dict):
            raise bad_request("Body must be a JSON object")
        return body

    @app.get("/health")
    def health():
        return {"ok": True, "chain_id": s.chain_id, "network": "arc_testnet", "explorer": s.explorer,
                "escrow": s.escrow_address, "onchain_leases": chain.lease_count(),
                "demo_token_required": bool(s.demo_token)}

    @app.post("/leases", status_code=201)
    def create(u: str = Depends(user), body: dict = Depends(json_body)):
        quota.take("leases")
        return svc.create(u, body)

    @app.get("/leases/{lease_id}")
    def get(lease_id: str):
        return svc.get(lease_id)

    @app.post("/leases/{lease_id}/deposit")
    def deposit(lease_id: str, u: str = Depends(user)):
        return svc.deposit(u, lease_id)

    @app.put("/leases/{lease_id}/photos/{phase}/{shot_id}")
    async def upload(lease_id: str, phase: str, shot_id: str, file: UploadFile = File(...), u: str = Depends(user)):
        data = await file.read(MAX_PHOTO_BYTES + 1)
        return await asyncio.to_thread(svc.upload, u, lease_id, phase, shot_id, data)

    @app.post("/leases/{lease_id}/photos/{phase}/commit")
    def commit(lease_id: str, phase: str, u: str = Depends(user)):
        return svc.commit(u, lease_id, phase)

    @app.post("/leases/{lease_id}/report", status_code=202)
    def report(lease_id: str, u: str = Depends(user)):
        quota.take("reports")
        return svc.start_report(u, lease_id)

    @app.post("/leases/{lease_id}/report/send")
    def send(lease_id: str, u: str = Depends(user), body: dict = Depends(json_body)):
        return svc.send_report(u, lease_id, body)

    @app.post("/leases/{lease_id}/accept")
    def accept(lease_id: str, u: str = Depends(user)):
        return svc.accept(u, lease_id)

    @app.post("/leases/{lease_id}/appeal")
    def appeal(lease_id: str, u: str = Depends(user), body: dict = Depends(json_body)):
        return svc.appeal(u, lease_id, body)

    return app


def __getattr__(name: str):
    # `uvicorn server.app.main:app` builds the real app lazily, so tests can import create_app without a chain.
    if name == "app":
        globals()["app"] = create_app()
        return globals()["app"]
    raise AttributeError(name)
