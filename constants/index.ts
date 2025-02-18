export const cacheIdKey: string = "__cyf_blog_id__";
export const cacheTokenKey: string = "__cyf_blog_token__";
export const cacheLngKey: string = "__cyf_blog_lng__";
export const cacheThemeKey: string = "__cyf_blog_theme__";
export const basePath =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ? "" : "";
export const domain =
  process.env.NODE_ENV === "production"
    ? `https://chenyifaer.com${basePath}`
    : `http://localhost:3000${basePath}`;
export const pageSize: number = 15;
export const sitemapUrls = ["login", "signup"];
