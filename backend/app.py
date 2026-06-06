# backend/app.py

import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

# Load environment variables
load_dotenv(override=True)

# Import routers
from backend.routes.match import router as match_router
from backend.routes.outreach import router as outreach_router
from backend.routes.stats import router as stats_router
from backend.routes.donors import router as donors_router
from backend.routes.requests import router as requests_router

app = FastAPI(
    title="BloodBridge AI API",
    description="Backend service for Blood Warriors Thalassemia Donor Matching Hackathon",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production if necessary
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

# Routers
app.include_router(match_router, prefix="/api", tags=["Donor Matching"])
app.include_router(outreach_router, prefix="/api", tags=["AI Outreach"])
app.include_router(stats_router, prefix="/api", tags=["Dashboard Statistics"])
app.include_router(donors_router, prefix="/api", tags=["Donor Registration"])
app.include_router(requests_router, prefix="/api", tags=["Blood Requests"])

# Health check route
@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "BloodBridge AI API",
        "aws_region": os.getenv("AWS_DEFAULT_REGION", "us-east-1")
    }

if __name__ == "__main__":
    import uvicorn
    # Allow running directly from script
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
