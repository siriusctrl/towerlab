import { useEffect, useState } from "react";

export function useTerminalDimensions(stdout: NodeJS.WriteStream): { columns: number; rows: number } {
  const [dimensions, setDimensions] = useState(() => ({
    columns: stdout.columns ?? 80,
    rows: stdout.rows ?? 24,
  }));

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        columns: stdout.columns ?? 80,
        rows: stdout.rows ?? 24,
      });
    };

    updateDimensions();
    stdout.on("resize", updateDimensions);

    return () => {
      stdout.off("resize", updateDimensions);
    };
  }, [stdout]);

  return dimensions;
}
