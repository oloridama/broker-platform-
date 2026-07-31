import { useEffect, useState, useRef } from "react";

interface CounterProps {
  end: number;
  suffix?: string;
  prefix?: string;
  label: string;
  duration?: number;
}

function Counter({ end, suffix = "", prefix = "", label, duration = 2000 }: CounterProps) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = Date.now();
          const tick = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            setCount(Math.floor(progress * end));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [end, duration]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-2xl sm:text-3xl font-bold text-white font-mono">
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-broker-400 mt-1">{label}</div>
    </div>
  );
}

export function StatsSection() {
  return (
    <section className="border-y border-broker-700/50 bg-broker-800/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          <Counter end={150} suffix="+" label="Countries" />
          <Counter end={10} prefix="$" suffix="B+" label="Trading Volume" />
          <Counter end={12482} suffix="+" label="Bots Active Today" />
          <Counter end={5000} suffix="+" label="Assets Tracked" />
        </div>
      </div>
    </section>
  );
}
