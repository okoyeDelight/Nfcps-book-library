"use client";

import { useEffect, useState } from "react";

export default function SplashIntro() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let leave = 0;
    let hide = 0;
    try {
      if (sessionStorage.getItem("nfcps-intro-seen")) {
        setVisible(false);
        return;
      }
      leave = window.setTimeout(() => {
        setLeaving(true);
        sessionStorage.setItem("nfcps-intro-seen", "1");
      }, 2550);
      hide = window.setTimeout(() => setVisible(false), 3200);
    } catch {
      hide = window.setTimeout(() => setVisible(false), 3000);
    }
    return () => {
      if (leave) window.clearTimeout(leave);
      if (hide) window.clearTimeout(hide);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={leaving ? "nfcps-splash leaving" : "nfcps-splash"} aria-label="NFCPS Book Library opening intro">
      <div className="splash-noise" />
      <div className="splash-halo halo-one" />
      <div className="splash-halo halo-two" />
      <div className="splash-orbit orbit-one" />
      <div className="splash-orbit orbit-two" />
      <div className="splash-core">
        <div className="splash-logo-shell">
          <span className="splash-light-sweep" />
          <img src="/nfcps-logo.png" alt="National Fellowship of Christian Pharmacy Students logo" />
        </div>
        <div className="splash-copy">
          <small>NATIONAL FELLOWSHIP OF CHRISTIAN PHARMACY STUDENTS · UNIZIK</small>
          <h1>NFCPS <span>BOOK LIBRARY</span></h1>
          <p>Christ the Therapy for All</p>
        </div>
        <div className="splash-loader"><span /></div>
      </div>
    </div>
  );
}
