from fastapi import HTTPException, status


def error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=status_code,
        detail={"code": code, "message": message},
    )


INVALID_CREDENTIALS = error(
    status.HTTP_401_UNAUTHORIZED,
    "invalid_credentials",
    "Invalid email or password.",
)

UNAUTHORIZED = error(
    status.HTTP_401_UNAUTHORIZED,
    "unauthorized",
    "Please sign in again.",
)

FORBIDDEN = error(
    status.HTTP_403_FORBIDDEN,
    "forbidden",
    "You do not have access to this resource.",
)

RATE_LIMITED = error(
    status.HTTP_429_TOO_MANY_REQUESTS,
    "rate_limited",
    "Too many requests. Please wait and try again.",
)
