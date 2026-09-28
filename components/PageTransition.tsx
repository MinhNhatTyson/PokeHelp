"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { usePathname, useRouter } from "next/navigation";

const SWIPE_ROUTES = ["/", "/items", "/team", "/optimizer", "/history"];
const SWIPE_DISTANCE_THRESHOLD = 90;
const SWIPE_VELOCITY_THRESHOLD = 500;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isMobile = useIsMobile();
  const swipeIndex = SWIPE_ROUTES.indexOf(pathname);
  const isSwipeable = isMobile && swipeIndex !== -1;

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (!isSwipeable) return;
    const { offset, velocity } = info;
    const wentLeft = offset.x < -SWIPE_DISTANCE_THRESHOLD || velocity.x < -SWIPE_VELOCITY_THRESHOLD;
    const wentRight = offset.x > SWIPE_DISTANCE_THRESHOLD || velocity.x > SWIPE_VELOCITY_THRESHOLD;

    if (wentLeft && swipeIndex < SWIPE_ROUTES.length - 1) {
      router.push(SWIPE_ROUTES[swipeIndex + 1]);
    } else if (wentRight && swipeIndex > 0) {
      router.push(SWIPE_ROUTES[swipeIndex - 1]);
    }
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -14 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        drag={isSwipeable ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.18}
        onDragEnd={handleDragEnd}
        className="flex w-full flex-1 flex-col"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}