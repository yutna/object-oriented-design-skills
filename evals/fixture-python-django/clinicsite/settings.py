SECRET_KEY = "fixture-only"
DEBUG = True
INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.messages",
    "clinic",
]
DATABASES = {
    "default": {"ENGINE": "django.db.backends.sqlite3", "NAME": "clinic.db"}
}
ROOT_URLCONF = "clinicsite.urls"
USE_TZ = True
