// alias-loader.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";

// 你的编译产物根目录
const DIST_ROOT = "/app/dist";

/**
 * 把 import "src/..." 重写为 "/app/dist/..."
 * 关键点：
 *  - 使用 nextResolve 去完成后续解析（避免 ERR_LOADER_CHAIN_INCOMPLETE）
 *  - 映射到 /app/dist，而不是 /app/dist/src
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "src" || specifier.startsWith("src/")) {
    const rest = specifier === "src" ? "" : specifier.slice("src/".length);
    const rewrittenPath = path.join(DIST_ROOT, rest);
    // 交给 Node 的默认解析继续处理（扩展名、目录下的 index 等）
    return nextResolve(pathToFileURL(rewrittenPath).href, context);
  }
  return nextResolve(specifier, context);
}
