import { AlfredoMark } from "./AlfredoMark";
import { AlfredoWordmark } from "./AlfredoWordmark";

type AlfredoLogoProps = {
  orientation?: "horizontal" | "stacked";
  inverse?: boolean;
  symbolSize?: number;
  withPeriod?: boolean;
  className?: string;
};

/**
 * Lockup completo: monograma + wordmark.
 * `inverse` para uso sobre fundo escuro (azul-noturno).
 */
export function AlfredoLogo({
  orientation = "horizontal",
  inverse = false,
  symbolSize = 40,
  withPeriod = true,
  className,
}: AlfredoLogoProps) {
  return (
    <div
      className={[
        "alfredo-logo",
        `alfredo-logo--${orientation}`,
        inverse ? "alfredo-logo--inverse" : "",
        className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <AlfredoMark size={symbolSize} variant={inverse ? "light" : "gradient"} />
      <AlfredoWordmark withPeriod={withPeriod} />
    </div>
  );
}

export default AlfredoLogo;
