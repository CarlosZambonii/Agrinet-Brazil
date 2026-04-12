'use client';
import { useEffect, useState, useRef } from 'react';
import { useInView } from 'framer-motion';

export default function AnimatedStat({ target, prefix = '', suffix = '', decimals = 0 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / 50;
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setVal(parseFloat(start.toFixed(decimals)));
      if (start >= target) clearInterval(timer);
    }, 25);
    return () => clearInterval(timer);
  }, [inView, target, decimals]);

  return (
    <span ref={ref}>
      {prefix}{decimals > 0 ? val.toFixed(decimals) : Math.floor(val).toLocaleString('pt-BR')}{suffix}
    </span>
  );
}
