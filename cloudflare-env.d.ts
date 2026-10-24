declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    DATA_ENCRYPTION_KEY: string;
    DASHBOARD_ORIGIN?: string;
  }
}
