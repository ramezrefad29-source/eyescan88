"use client";

import React, { useEffect, useState, useRef } from "react";

interface LogMessage {
  type: "log" | "warn" | "error" | "info";
  text: string;
  time: string;
}

export default function ConsoleDebug() {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const formatArgs = (args: any[]) => {
      return args
        .map((arg) => {
          if (typeof arg === "object") {
            try {
              return JSON.stringify(arg, null, 2);
            } catch (e) {
              return String(arg);
            }
          }
          return String(arg);
        })
        .join(" ");
    };

    const addLog = (type: LogMessage["type"], text: string) => {
      const time = new Date().toLocaleTimeString();
      setLogs((prev) => [...prev.slice(-99), { type, text, time }]);
    };

    // Store original methods
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
    const originalInfo = console.info;

    // Overwrite methods
    console.log = (...args: any[]) => {
      originalLog.apply(console, args);
      addLog("log", formatArgs(args));
    };

    console.warn = (...args: any[]) => {
      originalWarn.apply(console, args);
      addLog("warn", formatArgs(args));
    };

    console.error = (...args: any[]) => {
      originalError.apply(console, args);
      addLog("error", formatArgs(args));
    };

    console.info = (...args: any[]) => {
      originalInfo.apply(console, args);
      addLog("info", formatArgs(args));
    };

    // Global window errors
    const handleWindowError = (event: ErrorEvent) => {
      addLog("error", `Uncaught: ${event.message} at ${event.filename}:${event.lineno}`);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      addLog("error", `Promise Rejection: ${event.reason}`);
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleRejection);

    // Initial message
    addLog("info", "Debug Console Initialized. Monitoring logs...");

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      console.info = originalInfo;
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isOpen]);

  return (
    <div className="fixed bottom-4 right-4 z-50 font-mono text-xs text-left" dir="ltr">
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-2 bg-slate-900 border border-slate-700 hover:border-cyan-500 text-cyan-400 rounded-lg shadow-xl flex items-center gap-2 cursor-pointer font-bold"
      >
        <span>🛠️ Debug Logs</span>
        {logs.filter(l => l.type === "error").length > 0 && (
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
        )}
      </button>

      {/* Expanded panel */}
      {isOpen && (
        <div className="absolute bottom-12 right-0 w-[480px] max-w-[90vw] h-[350px] bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-md">
          {/* Header */}
          <div className="p-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center">
            <span className="text-slate-400 font-bold">Console Output Logs</span>
            <div className="flex gap-2">
              <button
                onClick={() => setLogs([])}
                className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Logs Body */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 select-text">
            {logs.length === 0 ? (
              <div className="text-slate-600 text-center py-10">No logs captured.</div>
            ) : (
              logs.map((log, idx) => {
                const colors = {
                  log: "text-slate-300",
                  info: "text-blue-400",
                  warn: "text-yellow-400 font-bold",
                  error: "text-red-400 font-bold bg-red-950/20 p-1 rounded",
                };

                return (
                  <div key={idx} className={`${colors[log.type]} whitespace-pre-wrap leading-relaxed`}>
                    <span className="text-[10px] text-slate-600 mr-2">[{log.time}]</span>
                    {log.text}
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
