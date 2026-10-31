/**
 * @vben/utils 等价小实现（packages 内自带，不引 @vben/utils）。
 * 行为与 vben 的 @core/base/shared 对齐，以移植其单测为准。
 */

// ── inference（对齐 @core/base/shared/src/utils/inference.ts） ──

/**
 * 检查传入的值是否为undefined。
 *
 * @param {unknown} value 要检查的值。
 * @returns {boolean} 如果值是undefined，返回true，否则返回false。
 */
export function isUndefined(value?: unknown): value is undefined {
  return value === undefined;
}

/**
 * 检查传入的值是否为字符串。
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * 检查传入的值是否为函数。
 */
export function isFunction(value: unknown): value is (...args: any[]) => any {
  return typeof value === 'function';
}

// ── merge（defu 等价：前参优先、后参补缺；数组与非纯对象直接取前参） ──

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * defu 语义的深合并：`merge(userConfig, defaultConfig)` = 用户配置优先、
 * 默认配置补缺。数组与非纯对象（Date/FormData 等）整体取前参，不展开合并。
 * 返回新对象，不修改入参。
 */
export function merge(
  source: unknown,
  ...defaults: unknown[]
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...(source as object) };
  for (const def of defaults) {
    if (!isPlainObject(def)) continue;
    for (const [key, value] of Object.entries(def)) {
      if (!(key in result) || result[key] === undefined) {
        result[key] = value;
      } else if (isPlainObject(result[key]) && isPlainObject(value)) {
        result[key] = merge(result[key], value);
      }
      // 其余情况保留前参（含数组、null、显式覆盖的基本类型）
    }
  }
  return result;
}

// ── bindMethods（对齐 @core/base/shared/src/utils/util.ts） ──

/**
 * 批量绑定原型方法到实例（跳过 constructor 与 getter/setter）。
 * 使 `const { get } = client` 解构后 `this` 仍指向实例。
 */
export function bindMethods<T extends object>(instance: T): void {
  const prototype = Object.getPrototypeOf(instance);
  const propertyNames = Object.getOwnPropertyNames(prototype);

  propertyNames.forEach((propertyName) => {
    const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyName);
    const propertyValue = (instance as Record<string, unknown>)[propertyName];

    if (
      typeof propertyValue === 'function' &&
      propertyName !== 'constructor' &&
      descriptor &&
      !descriptor.get &&
      !descriptor.set
    ) {
      (instance as Record<string, unknown>)[propertyName] =
        propertyValue.bind(instance);
    }
  });
}
