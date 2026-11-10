"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { createLoginCat } from "@/lib/login-cat-controller";
import type { CatMood } from "@/lib/login-cat-behavior";

export default function AdminCat({ mood }: { mood: CatMood }) {
  const stage = useRef<HTMLDivElement>(null);
  const sprite = useRef<HTMLDivElement>(null);
  const facing = useRef<HTMLDivElement>(null);
  const controller = useRef<ReturnType<typeof createLoginCat> | null>(null);
  useEffect(() => {
    if (!stage.current || !sprite.current || !facing.current) return;
    const cat = createLoginCat(stage.current, sprite.current, facing.current, Array.from(facing.current.querySelectorAll("video")));
    controller.current = cat;
    return () => { controller.current = null; cat.destroy(); };
  }, []);
  useEffect(() => { controller.current?.setMood(mood); }, [mood]);
  return <div className="hal-cat-scene" data-mood={mood}>
    <div className="hal-cat-stage" ref={stage} aria-hidden="true">
      <div className="hal-cat-halo" />
      <div className="hal-cat-sprite" ref={sprite}>
        <div className="hal-cat-facing" ref={facing}>
          <Image className="hal-cat-poster" src="/images/UI/login/cat-actions/poster.png" alt="" width={768} height={432} unoptimized priority />
          <video className="hal-cat-video" muted playsInline preload="auto" disablePictureInPicture tabIndex={-1} />
          <video className="hal-cat-video" muted playsInline preload="auto" disablePictureInPicture tabIndex={-1} />
        </div>
        {mood === "success" && <div className="hal-cat-sparkles"><span>✦</span><span>✧</span><span>✦</span></div>}
      </div>
      <div className="hal-cat-floor" />
    </div>
  </div>;
}
