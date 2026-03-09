from celery import Celery

from app.core.config import settings

celery = Celery(
    "competitor_intel",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

# Default routing for tasks

# Use the default Celery queue name so workers will consume tasks without
# requiring custom queue configuration on the worker side.
celery.conf.task_default_queue = "celery"
celery.conf.task_routes = {
    "app.tasks.*": {"queue": "celery"},
}

# Periodic task schedule (can be customized)
celery.conf.beat_schedule = {
    "schedule-scraping-every-hour": {
        "task": "app.tasks.schedule_scraping",
        "schedule": 3600.0,
    },
}

celery.conf.timezone = "UTC"

# Import tasks so Celery can register them when the worker starts.
# Without importing, the worker won't know about any `app.tasks.*` tasks.
import app.tasks  # noqa: F401
