import { useTranslation } from "@lua/i18n";
import "./BrandMark.css";

/**
 * The stacked "lua / pastry studio" wordmark used at the top of Home.
 * Rendered as one real text node (with a literal space) rather than two
 * separately-labelled elements, so the existing "Lua Pastry Studio"
 * copy — and the presentation-final.spec.ts screenshot step that waits
 * on it — keeps matching without a duplicate, screen-reader-only string.
 */
export function BrandMark() {
  const { t } = useTranslation();
  const eyebrow = t("guest.home.heroEyebrow");
  const [mark, ...rest] = eyebrow.split(" ");
  const caption = rest.join(" ");
  return (
    <p className="lua-brand-mark">
      <span className="lua-brand-mark__logo">{mark}</span>{" "}
      <span className="lua-brand-mark__caption">{caption}</span>
    </p>
  );
}
