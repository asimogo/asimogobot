// alias-loader.mjs
import path from "node:path";
import { pathToFileURL } from "node:url";

/**
 * 将裸导入 "src/..." 重写为 "/app/dist/src/..."
 * - 你的 Docker 镜像里，工作目录是 /app
 * - 构建产物在 /app/dist
 * - 如果你的 dist 结构不同，把下方目标目录改掉即可
 */
const ALIASES = [
  { prefix: "src/", targetDir: "/app/dist/src/" },
  { prefix: "src", targetDir: "/app/dist/src/" },
];

export async function resolve(specifier, context, nextResolve) {
  for (const { prefix, targetDir } of ALIASES) {
    if (specifier === prefix || specifier.startsWith(prefix)) {
      const rest = specifier === prefix ? "" : specifier.slice(prefix.length);
      const absPath = path.join(targetDir, rest);
      return { url: pathToFileURL(absPath).href };
    }
  }
  return nextResolve(specifier, context);
}
