declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    DATA_ENCRYPTION_KEY: string;
    DASHBOARD_ORIGIN?: string;
    GOOGLE_LOGIN_CLIENT_ID?: string;
    GOOGLE_LOGIN_CLIENT_SECRET?: string;
    DASHBOARD_ALLOWED_EMAILS?: string;
  }
}
