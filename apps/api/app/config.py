from pathlib import Path

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str
    app_env: str = "development"
    web_origin: str = "http://localhost:3000"
    cookie_secure: bool = False
    data_dir: Path = Path("data")
    session_hours: int = 12
    smtp_host: str = ""
    smtp_port: int = 1025
    smtp_from: str = "JOJOBUILDS <noreply@localhost>"
    google_client_id: str = ""
    google_client_secret: SecretStr = SecretStr("")

    @model_validator(mode="after")
    def production_settings(self):
        if bool(self.google_client_id) != bool(self.google_client_secret.get_secret_value()):
            raise ValueError("Configure both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, or neither")
        if self.app_env == "production":
            if not self.cookie_secure or not self.web_origin.startswith("https://"):
                raise ValueError("Production requires HTTPS and secure cookies")
            if not self.database_url.startswith("postgresql"):
                raise ValueError("Production requires PostgreSQL")
        return self


settings = Settings()
