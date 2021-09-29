'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
class TestOutputCache {
    constructor() {
        this.cache = new Map();
    }
    appendLine(fn, line) {
        let lineWithReturn = line + "\n";
        if (this.cache.has(fn)) {
            this.cache.set(fn, this.cache.get(fn) + lineWithReturn);
        }
        else {
            this.cache.set(fn, lineWithReturn);
        }
    }
    get(fn) {
        return this.cache.get(fn);
    }
}
exports.TestOutputCache = TestOutputCache;
//# sourceMappingURL=goTestOutputCache.js.map