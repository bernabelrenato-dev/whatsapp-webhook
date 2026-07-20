/**
 * Clase para cachés en memoria con expiración por tiempo (TTL) y límite de elementos (LRU Eviction)
 * Evita fugas de memoria por acumulación indefinida de claves.
 */
class TTLCache {
  /**
   * @param {number} defaultTTLMs Tiempo de vida por defecto en ms. (Default: 1 hora)
   * @param {number} maxItems Límite de elementos antes de remover los más antiguos. (Default: 1000)
   */
  constructor(defaultTTLMs = 3600000, maxItems = 1000) {
    this.defaultTTLMs = defaultTTLMs;
    this.maxItems = maxItems;
    this.cache = new Map();
  }

  set(key, value, ttlMs = this.defaultTTLMs) {
    // Evicción si se alcanza el tamaño máximo
    if (this.cache.size >= this.maxItems && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, { value, expiresAt });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return undefined;
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return item.value;
  }

  has(key) {
    return this.get(key) !== undefined;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

/**
 * Conjunto (Set) acotado que elimina automáticamente los elementos más antiguos
 * cuando excede su capacidad máxima.
 */
class CappedSet {
  /**
   * @param {number} maxSize Tamaño máximo del conjunto. (Default: 2000)
   */
  constructor(maxSize = 2000) {
    this.maxSize = maxSize;
    this.set = new Set();
  }

  add(value) {
    if (this.set.size >= this.maxSize && !this.set.has(value)) {
      const firstVal = this.set.values().next().value;
      if (firstVal !== undefined) {
        this.set.delete(firstVal);
      }
    }
    this.set.add(value);
  }

  has(value) {
    return this.set.has(value);
  }

  delete(value) {
    return this.set.delete(value);
  }

  clear() {
    this.set.clear();
  }
}

module.exports = {
  TTLCache,
  CappedSet,
};
