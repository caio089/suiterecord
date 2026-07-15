type AlfredoWordmarkProps = {
  withPeriod?: boolean;
  className?: string;
};

/**
 * Wordmark "Alfredo." — serif editorial (SangBleu Republic / fallback Cormorant).
 * O ponto final teal representa conclusão, registro e decisão.
 */
export function AlfredoWordmark({
  withPeriod = true,
  className,
}: AlfredoWordmarkProps) {
  return (
    <span className={`alfredo-wordmark ${className ?? ""}`.trim()}>
      Alfredo
      {withPeriod && (
        <span className="alfredo-wordmark__dot" aria-hidden="true">
          .
        </span>
      )}
    </span>
  );
}

export default AlfredoWordmark;
