"""The one error shape from docs/API.md: {"error": {"code", "message"}}."""
from __future__ import annotations


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


def bad_request(msg: str) -> ApiError:
    return ApiError(400, "bad_request", msg)


def not_allowed(msg: str) -> ApiError:
    return ApiError(403, "not_allowed", msg)


def not_found(msg: str) -> ApiError:
    return ApiError(404, "not_found", msg)


def wrong_state(msg: str) -> ApiError:
    return ApiError(409, "wrong_state", msg)


def chain_error(msg: str) -> ApiError:
    return ApiError(502, "chain_error", msg)


def vision_error(msg: str) -> ApiError:
    return ApiError(502, "vision_error", msg)
