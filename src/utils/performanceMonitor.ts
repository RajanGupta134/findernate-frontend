// Performance monitoring utility for tracking optimization improvements

interface RequestMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  averageResponseTime: number;
  requestTimes: number[];
}

class PerformanceMonitor {
  private metrics: RequestMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageResponseTime: 0,
    requestTimes: []
  };

  private startTime: number = 0;

  // Start timing a request
  startRequest(): void {
    this.startTime = performance.now();
  }

  // End timing and record cache hit
  recordCacheHit(): void {
    const duration = this.startTime ? performance.now() - this.startTime : 0;
    this.metrics.cacheHits++;
    this.metrics.totalRequests++;
    this.recordResponseTime(duration);
  }

  // End timing and record cache miss (actual API call)
  recordCacheMiss(): void {
    const duration = this.startTime ? performance.now() - this.startTime : 0;
    this.metrics.cacheMisses++;
    this.metrics.totalRequests++;
    this.recordResponseTime(duration);
  }

  // Record response time
  private recordResponseTime(duration: number): void {
    this.metrics.requestTimes.push(duration);

    // Keep only last 100 requests to prevent memory bloat
    if (this.metrics.requestTimes.length > 100) {
      this.metrics.requestTimes = this.metrics.requestTimes.slice(-100);
    }

    // Calculate average
    this.metrics.averageResponseTime =
      this.metrics.requestTimes.reduce((sum, time) => sum + time, 0) /
      this.metrics.requestTimes.length;
  }

  // Get current metrics
  getMetrics(): RequestMetrics & { cacheHitRate: number } {
    const cacheHitRate = this.metrics.totalRequests > 0
      ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100
      : 0;

    return {
      ...this.metrics,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100 // Round to 2 decimal places
    };
  }

  // Reset metrics
  reset(): void {
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      requestTimes: []
    };
  }

  // Log performance summary
  logSummary(): void {
    const metrics = this.getMetrics();
    console.group('🚀 Reels Performance Metrics');
    console.log(`📊 Total Requests: ${metrics.totalRequests}`);
    console.log(`⚡ Cache Hits: ${metrics.cacheHits} (${metrics.cacheHitRate}%)`);
    console.log(`🌐 Cache Misses: ${metrics.cacheMisses}`);
    console.log(`⏱️ Average Response Time: ${Math.round(metrics.averageResponseTime)}ms`);

    if (metrics.cacheHitRate > 70) {
      console.log('✅ Excellent cache performance!');
    } else if (metrics.cacheHitRate > 50) {
      console.log('🟡 Good cache performance');
    } else {
      console.log('🔴 Cache performance could be improved');
    }
    console.groupEnd();
  }

  // Calculate optimization savings
  getOptimizationSavings(): {
    requestsAvoided: number;
    timeSaved: number;
    bandwidth: string;
  } {
    const avgApiTime = 500; // Assume 500ms average API response time
    const requestsAvoided = this.metrics.cacheHits;
    const timeSaved = requestsAvoided * avgApiTime;

    // Rough estimate: each comment request ~1KB, each reel has 4 comments
    const bandwidthSaved = (requestsAvoided * 4) / 1024; // KB to MB

    return {
      requestsAvoided,
      timeSaved,
      bandwidth: `${Math.round(bandwidthSaved * 100) / 100}KB`
    };
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-log summary every 5 minutes in development
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    const metrics = performanceMonitor.getMetrics();
    if (metrics.totalRequests > 0) {
      performanceMonitor.logSummary();

      const savings = performanceMonitor.getOptimizationSavings();
      console.log(`💰 Optimization Savings: ${savings.requestsAvoided} requests avoided, ${savings.timeSaved}ms saved, ${savings.bandwidth} bandwidth saved`);
    }
  }, 5 * 60 * 1000); // 5 minutes
}